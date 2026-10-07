import { Chess } from 'chess.js';
import type { EngineEvaluation, MultiPvCandidate, EngineScore } from '../types/chess';

export interface AnalysisOptions {
  depth?: number;
  multiPv?: number;
  profileId?: import('../types/chess').EngineProfileId;
  onProgress?: (progress: {
    current: number;
    total: number;
    percent: number;
    fen: string;
    eval: EngineEvaluation;
  }) => void;
  signal?: AbortSignal;
}

/**
 * Normalizes FEN to its core position state:
 * [pieces, turn, castling, en-passant]
 * Discards halfmove clock and fullmove number so transpositions match.
 */
export function normalizeFen(fen: string): string {
  const parts = fen.trim().split(/\s+/);
  return parts.slice(0, 4).join(' ');
}

/**
 * Normalizes raw engine UCI cp and mate output to universal White perspective:
 * Positive = White advantage, Negative = Black advantage.
 * Distinguishes pure centipawns vs discrete mate distance.
 */
export function normalizeScoreToWhite(
  fen: string,
  rawCp?: number,
  rawMate?: number | null
): { cp: number; mate: number | null; score: EngineScore } {
  const turn = fen.split(' ')[1] || 'w';
  const isWhite = turn === 'w';

  const mateWhite = rawMate !== null && rawMate !== undefined
    ? (isWhite ? rawMate : -rawMate)
    : null;

  let cpWhite = rawCp !== undefined
    ? (isWhite ? rawCp : -rawCp)
    : 0;

  // Convert mate distance into continuous centipawn equivalent for sorting/charts:
  // e.g. Mate in 1 for White = +9990, Mate in 2 = +9980
  // Mate in 1 for Black = -9990, Mate in 2 = -9980
  if (mateWhite !== null) {
    const absDist = Math.min(Math.abs(mateWhite), 100);
    const mateCpValue = 10000 - absDist * 10;
    cpWhite = mateWhite > 0 ? mateCpValue : -mateCpValue;
  }

  const score: EngineScore = mateWhite !== null
    ? { type: 'mate', mateIn: mateWhite }
    : { type: 'cp', cp: cpWhite };

  return { cp: cpWhite, mate: mateWhite, score };
}

interface WorkerClient {
  worker: Worker | null;
  isReady: boolean;
  readyPromise: Promise<void> | null;
  activeRequestId: number;
  isSearching: boolean;
  currentFen?: string;
  currentDepth?: number;
  startedAt?: number;
}

export class StockfishService {
  // Two dedicated workers: one for full game review, one for interactive on-board actions (Sandbox/MultiPV)
  private analysisClient: WorkerClient;
  private interactiveClient: WorkerClient;

  // In-memory cache for evaluated FENs in the current session
  private positionCache = new Map<string, EngineEvaluation>();

  constructor() {
    this.analysisClient = this.createWorkerClient('analysis');
    this.interactiveClient = this.createWorkerClient('interactive');
  }

  public getEngineMetadata() {
    return {
      name: 'Stockfish 16 NNUE WASM',
      version: '16.0.0',
      runtime: 'WebAssembly (Web Worker)',
      defaultDepth: 16,
      defaultMultiPv: 3,
    };
  }

  private createWorkerClient(label: string): WorkerClient {
    const client: WorkerClient = {
      worker: null,
      isReady: false,
      readyPromise: null,
      activeRequestId: 0,
      isSearching: false,
    };

    try {
      const wasmSupported =
        typeof WebAssembly === 'object' &&
        typeof WebAssembly.validate === 'function';
      const workerUrl = wasmSupported
        ? '/stockfish/stockfish-nnue-16.js'
        : '/stockfish/stockfish.js';

      client.worker = new Worker(workerUrl);
    } catch {
      try {
        client.worker = new Worker('/stockfish/stockfish.js');
      } catch (err) {
        console.error(`Failed to initialize Stockfish worker (${label}):`, err);
      }
    }

    if (client.worker) {
      let resolveReady: (() => void) | null = null;
      client.readyPromise = new Promise((res) => {
        resolveReady = res;
      });

      client.worker.onerror = (err) => {
        console.error(`Stockfish worker error (${label}):`, err);
      };

      const initHandler = (e: MessageEvent) => {
        const raw = typeof e.data === 'string' ? e.data : '';
        if (raw.includes('uciok') || raw.includes('readyok')) {
          client.isReady = true;
          if (resolveReady) {
            resolveReady();
            resolveReady = null;
          }
          client.worker?.removeEventListener('message', initHandler);
        }
      };

      client.worker.addEventListener('message', initHandler);
      client.worker.postMessage('uci');
      client.worker.postMessage('isready');
    }

    return client;
  }

  private async waitClientReady(client: WorkerClient): Promise<void> {
    if (client.isReady) return;
    if (client.readyPromise) {
      await Promise.race([
        client.readyPromise,
        new Promise((r) => setTimeout(r, 4000)),
      ]);
      client.isReady = true;
    }
  }

  public waitForReady(client: WorkerClient): Promise<void> {
    return new Promise((resolve) => {
      if (!client.worker) {
        resolve();
        return;
      }
      const readyHandler = (e: MessageEvent) => {
        const raw = typeof e.data === 'string' ? e.data : '';
        if (raw.includes('readyok')) {
          client.worker?.removeEventListener('message', readyHandler);
          resolve();
        }
      };
      client.worker.addEventListener('message', readyHandler);
      client.worker.postMessage('isready');
      setTimeout(() => {
        client.worker?.removeEventListener('message', readyHandler);
        resolve();
      }, 500);
    });
  }

  public async waitReady(): Promise<void> {
    await Promise.all([
      this.waitClientReady(this.analysisClient),
      this.waitClientReady(this.interactiveClient),
    ]);
  }

  public clearCache(): void {
    this.positionCache.clear();
  }

  /**
   * Pre-checks terminal game states (checkmate, draw).
   */
  private checkTerminalState(fen: string): EngineEvaluation | null {
    try {
      const testChess = new Chess(fen);
      if (testChess.isCheckmate()) {
        const turn = fen.split(' ')[1] || 'w';
        const mateScore = turn === 'w' ? -1 : 1; // if White to move, White is checkmated
        const cp = mateScore > 0 ? 9990 : -9990;
        return {
          cp,
          mate: mateScore,
          score: { type: 'mate', mateIn: mateScore },
          depth: 99,
          bestMoveUci: '',
          bestMoveSan: '',
          lines: [],
        };
      }
      if (testChess.isDraw()) {
        return {
          cp: 0,
          mate: null,
          score: { type: 'cp', cp: 0 },
          depth: 99,
          bestMoveUci: '',
          bestMoveSan: '',
          lines: [],
        };
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Executes a search on a specific worker client with MultiPV and dynamic timeout.
   */
  private runSearch(
    client: WorkerClient,
    fen: string,
    depth: number,
    multiPv = 3
  ): Promise<EngineEvaluation> {
    return new Promise((resolve) => {
      if (!client.worker) {
        resolve({
          cp: 0,
          mate: null,
          score: { type: 'cp', cp: 0 },
          depth,
          bestMoveUci: '',
          bestMoveSan: '',
          lines: [],
        });
        return;
      }

      const requestId = ++client.activeRequestId;
      client.isSearching = true;
      client.currentFen = fen;
      client.currentDepth = depth;
      client.startedAt = Date.now();

      const candidateLines = new Map<number, {
        multipv: number;
        rawCp?: number;
        rawMate?: number | null;
        depth: number;
        pv: string;
      }>();

      let lastRawCp: number | undefined = undefined;
      let lastRawMate: number | null | undefined = undefined;
      let lastPv: string | undefined = undefined;
      let bestMoveUci = '';
      let isDone = false;

      const cleanupAndResolve = (result: EngineEvaluation) => {
        if (isDone) return;
        isDone = true;
        client.isSearching = false;
        if (timeoutId) clearTimeout(timeoutId);
        client.worker?.removeEventListener('message', onMessage);
        resolve(result);
      };

      // Adaptive timeout: ensures deep searches don't freeze indefinitely, but gives ample time (min 8s, up to depth * 1.5s)
      const timeoutMs = Math.max(8000, depth * 1500);
      const timeoutId = setTimeout(() => {
        if (requestId === client.activeRequestId) {
          client.worker?.postMessage('stop');
          const normalized = normalizeScoreToWhite(fen, lastRawCp, lastRawMate);
          const lines = this.buildMultiPvLines(fen, candidateLines, depth);
          cleanupAndResolve({
            cp: normalized.cp,
            mate: normalized.mate,
            score: normalized.score,
            bestMoveUci: bestMoveUci || (lines[0]?.bestMoveUci ?? ''),
            bestMoveSan: lines[0]?.bestMoveSan ?? '',
            depth,
            pv: lastPv,
            lines,
          });
        }
      }, timeoutMs);

      const onMessage = (e: MessageEvent) => {
        if (client.activeRequestId !== requestId) return;

        const raw = typeof e.data === 'string' ? e.data : '';
        const lines = raw.split(/\r?\n/);

        for (const singleLine of lines) {
          const line = singleLine.trim();
          if (!line) continue;

          // Parse info line
          if (line.startsWith('info') && line.includes('score')) {
            const isBound = line.includes('lowerbound') || line.includes('upperbound');
            const cpMatch = line.match(/score cp (-?\d+)/);
            const mateMatch = line.match(/score mate (-?\d+)/);
            const mpvMatch = line.match(/multipv (\d+)/);
            const depthMatch = line.match(/depth (\d+)/);
            const pvMatch = line.match(/ pv (.*)$/);

            const mpvIndex = mpvMatch ? parseInt(mpvMatch[1], 10) : 1;
            const parsedDepth = depthMatch ? parseInt(depthMatch[1], 10) : depth;

            let curCp: number | undefined = undefined;
            let curMate: number | null | undefined = undefined;

            if (cpMatch) {
              curCp = parseInt(cpMatch[1], 10);
              curMate = null;
            } else if (mateMatch) {
              curMate = parseInt(mateMatch[1], 10);
            }

            const pv = pvMatch ? pvMatch[1] : '';

            // Store candidate line
            if (!isBound || !candidateLines.has(mpvIndex)) {
              candidateLines.set(mpvIndex, {
                multipv: mpvIndex,
                rawCp: curCp,
                rawMate: curMate,
                depth: parsedDepth,
                pv,
              });
            }

            // Top line updates primary score
            if (mpvIndex === 1 && (!isBound || lastRawCp === undefined)) {
              if (curCp !== undefined) {
                lastRawCp = curCp;
                lastRawMate = null;
              } else if (curMate !== undefined) {
                lastRawMate = curMate;
              }
              if (pv) {
                lastPv = pv;
              }
            }
          }

          // Parse bestmove
          if (line.startsWith('bestmove')) {
            const parts = line.split(/\s+/);
            const parsedMove = parts[1] || '';
            const pvFirstMove = lastPv ? lastPv.trim().split(/\s+/)[0] : '';
            bestMoveUci = (parsedMove && parsedMove !== '(none)') ? parsedMove : pvFirstMove;

            const normalized = normalizeScoreToWhite(fen, lastRawCp, lastRawMate);
            const linesList = this.buildMultiPvLines(fen, candidateLines, depth);

            // SAN for top move
            let bestMoveSan = bestMoveUci;
            if (linesList[0]?.bestMoveSan) {
              bestMoveSan = linesList[0].bestMoveSan;
            } else {
              try {
                if (bestMoveUci && bestMoveUci !== '(none)') {
                  const chess = new Chess(fen);
                  const from = bestMoveUci.slice(0, 2);
                  const to = bestMoveUci.slice(2, 4);
                  const promotion = bestMoveUci.length > 4 ? bestMoveUci.slice(4, 5) : undefined;
                  const moveRes = chess.move({ from, to, promotion });
                  if (moveRes) bestMoveSan = moveRes.san;
                }
              } catch {
                // ignore
              }
            }

            cleanupAndResolve({
              cp: normalized.cp,
              mate: normalized.mate,
              score: normalized.score,
              bestMoveUci,
              bestMoveSan,
              depth,
              pv: lastPv,
              lines: linesList,
            });
            return;
          }
        }
      };

      client.worker.addEventListener('message', onMessage);
      client.worker.postMessage(`setoption name MultiPV value ${multiPv}`);
      client.worker.postMessage(`position fen ${fen}`);
      client.worker.postMessage(`go depth ${depth}`);
    });
  }

  private buildMultiPvLines(
    fen: string,
    candidateMap: Map<number, { multipv: number; rawCp?: number; rawMate?: number | null; depth: number; pv: string }>,
    targetDepth: number
  ): MultiPvCandidate[] {
    const rawList = Array.from(candidateMap.values()).sort((a, b) => a.multipv - b.multipv);

    return rawList.map((item) => {
      const uciMoves = item.pv ? item.pv.trim().split(/\s+/) : [];
      const bestMoveUci = uciMoves[0] || '';
      let bestMoveSan = bestMoveUci;
      const pvSanList: string[] = [];

      try {
        const chess = new Chess(fen);
        for (let i = 0; i < Math.min(uciMoves.length, 5); i++) {
          const u = uciMoves[i];
          const from = u.slice(0, 2);
          const to = u.slice(2, 4);
          const promotion = u.length > 4 ? u.slice(4, 5) : undefined;
          const res = chess.move({ from, to, promotion });
          if (res) {
            if (i === 0) bestMoveSan = res.san;
            pvSanList.push(res.san);
          } else {
            break;
          }
        }
      } catch {
        // fallback
      }

      const normalized = normalizeScoreToWhite(fen, item.rawCp, item.rawMate);

      return {
        multipv: item.multipv,
        cp: normalized.cp,
        mate: normalized.mate,
        score: normalized.score,
        bestMoveUci,
        bestMoveSan,
        depth: item.depth || targetDepth,
        pv: item.pv,
        pvSanList,
      };
    });
  }

  /**
   * Evaluates a single FEN position using the interactive worker (on-board / sandbox).
   * Fully isolated from full game review.
   */
  public async evaluatePosition(
    fen: string,
    depth = 14,
    _interactive?: boolean
  ): Promise<EngineEvaluation> {
    const terminal = this.checkTerminalState(fen);
    if (terminal) return terminal;

    const cacheKey = `${normalizeFen(fen)}_${depth}_1`;
    if (this.positionCache.has(cacheKey)) {
      return this.positionCache.get(cacheKey)!;
    }

    await this.waitClientReady(this.interactiveClient);

    if (this.interactiveClient.isSearching) {
      this.interactiveClient.worker?.postMessage('stop');
      await new Promise((r) => setTimeout(r, 20));
    }

    const evaluation = await this.runSearch(this.interactiveClient, fen, depth, 1);
    this.positionCache.set(cacheKey, evaluation);
    return evaluation;
  }

  /**
   * Evaluates top candidate engine lines (MultiPV) on interactiveClient.
   */
  public async evaluatePositionMultiPv(
    fen: string,
    depth = 14,
    count = 3
  ): Promise<MultiPvCandidate[]> {
    const terminal = this.checkTerminalState(fen);
    if (terminal) return [];

    await this.waitClientReady(this.interactiveClient);

    if (this.interactiveClient.isSearching) {
      this.interactiveClient.worker?.postMessage('stop');
      await new Promise((r) => setTimeout(r, 20));
    }

    const evaluation = await this.runSearch(this.interactiveClient, fen, depth, count);
    return evaluation.lines || [];
  }

  /**
   * Analyzes all positions in a game with single-source, uniform-depth consistency.
   * Runs exclusively on analysisClient.
   * MultiPV = 3 allows deep differentiation between Best, Great, Brilliant, and only moves.
   */
  public async analyzePositions(
    fens: string[],
    options: AnalysisOptions = {}
  ): Promise<EngineEvaluation[]> {
    await this.waitClientReady(this.analysisClient);

    const client = this.analysisClient;
    const results: EngineEvaluation[] = [];
    const total = fens.length;
    const targetDepth = options.depth || 16;
    const targetMultiPv = options.multiPv || 3;

    if (client.worker) {
      client.worker.postMessage('ucinewgame');
      client.worker.postMessage('isready');
      await new Promise((r) => setTimeout(r, 40));
    }

    for (let i = 0; i < total; i++) {
      if (options.signal?.aborted) {
        this.stop();
        break;
      }

      const fen = fens[i];
      const normKey = `${normalizeFen(fen)}_${targetDepth}_${targetMultiPv}`;

      let evaluation: EngineEvaluation;

      // 1. Check terminal position first
      const terminal = this.checkTerminalState(fen);
      if (terminal) {
        evaluation = terminal;
      } else if (this.positionCache.has(normKey)) {
        evaluation = this.positionCache.get(normKey)!;
      } else {
        // 2. Search on analysisClient at consistent uniform depth with MultiPV
        evaluation = await this.runSearch(client, fen, targetDepth, targetMultiPv);
        this.positionCache.set(normKey, evaluation);
        await this.waitForReady(client);
      }

      results.push(evaluation);

      if (options.onProgress) {
        options.onProgress({
          current: i + 1,
          total,
          percent: Math.round(((i + 1) / total) * 100),
          fen,
          eval: evaluation,
        });
      }
    }

    return results;
  }

  public stop(): void {
    if (this.analysisClient.worker && this.analysisClient.isSearching) {
      this.analysisClient.worker.postMessage('stop');
      this.analysisClient.isSearching = false;
    }
  }

  public terminate(): void {
    this.analysisClient.worker?.terminate();
    this.interactiveClient.worker?.terminate();
  }
}

// Singleton instance
let stockfishInstance: StockfishService | null = null;

export function getStockfishService(): StockfishService {
  if (!stockfishInstance) {
    stockfishInstance = new StockfishService();
  }
  return stockfishInstance;
}
