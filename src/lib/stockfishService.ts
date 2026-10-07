import { Chess } from 'chess.js';
import type { EngineEvaluation, MultiPvCandidate } from '../types/chess';

export interface AnalysisOptions {
  depth?: number;
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
 */
export function normalizeScoreToWhite(
  fen: string,
  rawCp?: number,
  rawMate?: number | null
): { cp: number; mate: number | null } {
  const turn = fen.split(' ')[1] || 'w';
  const isWhite = turn === 'w';

  const mateWhite = rawMate !== null && rawMate !== undefined
    ? (isWhite ? rawMate : -rawMate)
    : null;

  let cpWhite = rawCp !== undefined
    ? (isWhite ? rawCp : -rawCp)
    : 0;

  // Convert mate distance into high centipawn equivalent:
  // e.g. Mate in 1 for White = +9990, Mate in 2 = +9980
  // Mate in 1 for Black = -9990, Mate in 2 = -9980
  if (mateWhite !== null) {
    const absDist = Math.min(Math.abs(mateWhite), 100);
    const mateCpValue = 10000 - absDist * 10;
    cpWhite = mateWhite > 0 ? mateCpValue : -mateCpValue;
  }

  return { cp: cpWhite, mate: mateWhite };
}

interface WorkerClient {
  worker: Worker | null;
  isReady: boolean;
  readyPromise: Promise<void> | null;
  activeRequestId: number;
  isSearching: boolean;
}

export class StockfishService {
  // Two dedicated workers: one for full game review, one for interactive on-board actions
  private analysisClient: WorkerClient;
  private interactiveClient: WorkerClient;

  // In-memory cache for evaluated FENs in the current session
  private positionCache = new Map<string, EngineEvaluation>();

  constructor() {
    this.analysisClient = this.createWorkerClient('analysis');
    this.interactiveClient = this.createWorkerClient('interactive');
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
        ? '/stockfish/stockfish.wasm.js'
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

  public async waitReady(): Promise<void> {
    await Promise.all([
      this.waitClientReady(this.analysisClient),
      this.waitClientReady(this.interactiveClient),
    ]);
  }

  /**
   * Clears the evaluation cache.
   */
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
          depth: 99,
          bestMoveUci: '',
          bestMoveSan: '',
        };
      }
      if (testChess.isDraw()) {
        return {
          cp: 0,
          mate: null,
          depth: 99,
          bestMoveUci: '',
          bestMoveSan: '',
        };
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Executes a robust search on a specific worker client with a unique requestId.
   */
  private runSearch(
    client: WorkerClient,
    fen: string,
    depth: number,
    multiPv = 1
  ): Promise<EngineEvaluation> {
    return new Promise((resolve) => {
      if (!client.worker) {
        resolve({
          cp: 0,
          mate: null,
          depth,
          bestMoveUci: '',
          bestMoveSan: '',
        });
        return;
      }

      const requestId = ++client.activeRequestId;
      client.isSearching = true;

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

      // Safety timeout: 5s max per position
      const timeoutId = setTimeout(() => {
        if (requestId === client.activeRequestId) {
          client.worker?.postMessage('stop');
          const normalized = normalizeScoreToWhite(fen, lastRawCp, lastRawMate);
          cleanupAndResolve({
            cp: normalized.cp,
            mate: normalized.mate,
            bestMoveUci: bestMoveUci || '',
            bestMoveSan: '',
            depth,
            pv: lastPv,
          });
        }
      }, 5000);

      const onMessage = (e: MessageEvent) => {
        // Discard any output from outdated requests
        if (client.activeRequestId !== requestId) return;

        const raw = typeof e.data === 'string' ? e.data : '';
        const lines = raw.split(/\r?\n/);

        for (const singleLine of lines) {
          const line = singleLine.trim();
          if (!line) continue;

          // Parse info score - ONLY accept exact evaluations; discard lowerbound/upperbound search bounds
          if (line.startsWith('info') && line.includes('score')) {
            const isBound = line.includes('lowerbound') || line.includes('upperbound');
            if (!isBound) {
              const cpMatch = line.match(/score cp (-?\d+)/);
              const mateMatch = line.match(/score mate (-?\d+)/);
              const pvMatch = line.match(/ pv (.*)$/);

              if (cpMatch) {
                lastRawCp = parseInt(cpMatch[1], 10);
                lastRawMate = null;
              } else if (mateMatch) {
                lastRawMate = parseInt(mateMatch[1], 10);
              }

              if (pvMatch) {
                lastPv = pvMatch[1];
              }
            }
          }

          // Parse bestmove
          if (line.startsWith('bestmove')) {
            const parts = line.split(/\s+/);
            bestMoveUci = parts[1] || '';

            // Convert UCI to SAN
            let bestMoveSan = bestMoveUci;
            try {
              if (bestMoveUci && bestMoveUci !== '(none)') {
                const chess = new Chess(fen);
                const from = bestMoveUci.slice(0, 2);
                const to = bestMoveUci.slice(2, 4);
                const promotion = bestMoveUci.length > 4 ? bestMoveUci.slice(4, 5) : undefined;
                const moveRes = chess.move({ from, to, promotion });
                if (moveRes) {
                  bestMoveSan = moveRes.san;
                }
              }
            } catch {
              // fallback to UCI
            }

            const normalized = normalizeScoreToWhite(fen, lastRawCp, lastRawMate);
            cleanupAndResolve({
              cp: normalized.cp,
              mate: normalized.mate,
              bestMoveUci,
              bestMoveSan,
              depth,
              pv: lastPv,
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

  /**
   * Evaluates a single FEN position using the interactive worker (on-board / sandbox).
   * Fully isolated from full game analysis.
   */
  public async evaluatePosition(
    fen: string,
    depth = 12,
    _interactive?: boolean
  ): Promise<EngineEvaluation> {
    const terminal = this.checkTerminalState(fen);
    if (terminal) return terminal;

    const cacheKey = `${normalizeFen(fen)}_${depth}`;
    if (this.positionCache.has(cacheKey)) {
      return this.positionCache.get(cacheKey)!;
    }

    await this.waitClientReady(this.interactiveClient);

    // If interactive client is searching, stop it before issuing a new one
    if (this.interactiveClient.isSearching) {
      this.interactiveClient.worker?.postMessage('stop');
      await new Promise((r) => setTimeout(r, 20));
    }

    const evaluation = await this.runSearch(this.interactiveClient, fen, depth, 1);
    this.positionCache.set(cacheKey, evaluation);
    return evaluation;
  }

  /**
   * Evaluates top 3 candidate engine lines (MultiPV) for the given FEN on interactiveClient.
   */
  public async evaluatePositionMultiPv(
    fen: string,
    depth = 11,
    count = 3
  ): Promise<MultiPvCandidate[]> {
    const terminal = this.checkTerminalState(fen);
    if (terminal) return [];

    await this.waitClientReady(this.interactiveClient);

    if (this.interactiveClient.isSearching) {
      this.interactiveClient.worker?.postMessage('stop');
      await new Promise((r) => setTimeout(r, 20));
    }

    return new Promise((resolve) => {
      const client = this.interactiveClient;
      if (!client.worker) {
        resolve([]);
        return;
      }

      const requestId = ++client.activeRequestId;
      client.isSearching = true;

      const linesMap = new Map<number, {
        multipv: number;
        rawCp?: number;
        rawMate?: number | null;
        depth: number;
        pv: string;
      }>();
      let isResolved = false;

      const finish = () => {
        if (isResolved) return;
        isResolved = true;
        client.isSearching = false;
        if (timeoutId) clearTimeout(timeoutId);
        client.worker?.removeEventListener('message', onMessage);
        client.worker?.postMessage('setoption name MultiPV value 1');

        const rawCandidates = Array.from(linesMap.values()).sort(
          (a, b) => a.multipv - b.multipv
        );

        const candidates: MultiPvCandidate[] = rawCandidates.map((c) => {
          const uciMoves = c.pv ? c.pv.trim().split(/\s+/) : [];
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

          const normalized = normalizeScoreToWhite(fen, c.rawCp, c.rawMate);

          return {
            multipv: c.multipv,
            cp: normalized.cp,
            mate: normalized.mate,
            depth: c.depth,
            pv: c.pv,
            bestMoveUci,
            bestMoveSan,
            pvSanList,
          };
        });

        resolve(candidates);
      };

      const timeoutId = setTimeout(finish, 3800);

      const onMessage = (e: MessageEvent) => {
        if (client.activeRequestId !== requestId) return;

        const raw = typeof e.data === 'string' ? e.data : '';
        const lines = raw.split(/\r?\n/);

        for (const singleLine of lines) {
          const line = singleLine.trim();
          if (!line) continue;

          if (line.startsWith('info') && line.includes('multipv') && line.includes('score')) {
            const isBound = line.includes('lowerbound') || line.includes('upperbound');
            if (!isBound) {
              const mpvMatch = line.match(/multipv (\d+)/);
              const depthMatch = line.match(/depth (\d+)/);
              const cpMatch = line.match(/score cp (-?\d+)/);
              const mateMatch = line.match(/score mate (-?\d+)/);
              const pvMatch = line.match(/ pv (.*)$/);

              if (mpvMatch) {
                const mpvNum = parseInt(mpvMatch[1], 10);
                const curDepth = depthMatch ? parseInt(depthMatch[1], 10) : depth;
                let rawCp: number | undefined = undefined;
                let rawMate: number | null | undefined = undefined;

                if (cpMatch) {
                  rawCp = parseInt(cpMatch[1], 10);
                  rawMate = null;
                } else if (mateMatch) {
                  rawMate = parseInt(mateMatch[1], 10);
                }

                const pv = pvMatch ? pvMatch[1] : '';

                linesMap.set(mpvNum, {
                  multipv: mpvNum,
                  rawCp,
                  rawMate,
                  depth: curDepth,
                  pv,
                });
              }
            }
          }

          if (line.startsWith('bestmove')) {
            finish();
            return;
          }
        }
      };

      client.worker.addEventListener('message', onMessage);
      client.worker.postMessage(`setoption name MultiPV value ${count}`);
      client.worker.postMessage(`position fen ${fen}`);
      client.worker.postMessage(`go depth ${depth}`);
    });
  }

  /**
   * Analyzes all positions in a game with single-source, uniform-depth consistency.
   * Runs exclusively on analysisClient.
   * Guarantees FEN i's evalAfter === FEN i+1's evalBefore.
   */
  public async analyzePositions(
    fens: string[],
    options: AnalysisOptions = {}
  ): Promise<EngineEvaluation[]> {
    await this.waitClientReady(this.analysisClient);

    const client = this.analysisClient;
    const results: EngineEvaluation[] = [];
    const total = fens.length;
    const targetDepth = options.depth || 14;

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
      const normKey = `${normalizeFen(fen)}_${targetDepth}`;

      let evaluation: EngineEvaluation;

      // 1. Check terminal position first
      const terminal = this.checkTerminalState(fen);
      if (terminal) {
        evaluation = terminal;
      } else if (this.positionCache.has(normKey)) {
        // 2. Reuse consistent cached evaluation if this exact position occurred before (transposition/repetition)
        evaluation = this.positionCache.get(normKey)!;
      } else {
        // 3. Search on analysisClient at consistent uniform depth
        evaluation = await this.runSearch(client, fen, targetDepth, 1);
        this.positionCache.set(normKey, evaluation);
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
    if (this.interactiveClient.worker && this.interactiveClient.isSearching) {
      this.interactiveClient.worker.postMessage('stop');
      this.interactiveClient.isSearching = false;
    }
  }

  public terminate(): void {
    if (this.analysisClient.worker) {
      this.analysisClient.worker.terminate();
      this.analysisClient.worker = null;
    }
    if (this.interactiveClient.worker) {
      this.interactiveClient.worker.terminate();
      this.interactiveClient.worker = null;
    }
    this.positionCache.clear();
  }
}

// Singleton helper
let singletonService: StockfishService | null = null;
export function getStockfishService(): StockfishService {
  if (!singletonService) {
    singletonService = new StockfishService();
  }
  return singletonService;
}
