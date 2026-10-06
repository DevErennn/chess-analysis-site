import { Chess } from 'chess.js';
import type { EngineEvaluation, MultiPvCandidate } from '../types/chess';
import { fetchLichessCloudEval } from './cloudEvalService';

export interface AnalysisOptions {
  depth?: number;
  profileId?: import('../types/chess').EngineProfileId;
  tacticalBoost?: boolean;
  onProgress?: (progress: {
    current: number;
    total: number;
    percent: number;
    fen: string;
    eval: EngineEvaluation;
  }) => void;
  signal?: AbortSignal;
}

export class StockfishService {
  private worker: Worker | null = null;
  private isReady = false;
  private readyPromise: Promise<void> | null = null;
  private readyResolver: (() => void) | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      const wasmSupported =
        typeof WebAssembly === 'object' &&
        typeof WebAssembly.validate === 'function';
      // Use WebAssembly worker when supported for 10x performance and accuracy
      const workerUrl = wasmSupported
        ? '/stockfish/stockfish.wasm.js'
        : '/stockfish/stockfish.js';
      this.worker = new Worker(workerUrl);
    } catch {
      try {
        this.worker = new Worker('/stockfish/stockfish.js');
      } catch {
        try {
          const blob = new Blob(
            [
              `importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');`,
            ],
            { type: 'application/javascript' }
          );
          this.worker = new Worker(URL.createObjectURL(blob));
        } catch (err2) {
          console.error('Failed to initialize Stockfish worker:', err2);
        }
      }
    }

    if (this.worker) {
      this.readyPromise = new Promise((resolve) => {
        this.readyResolver = resolve;
      });

      this.worker.onerror = (err) => {
        console.error('Stockfish worker error:', err);
      };

      this.worker.onmessage = (e: MessageEvent) => {
        const raw = typeof e.data === 'string' ? e.data : '';
        const lines = raw.split(/\r?\n/);
        for (const singleLine of lines) {
          const line = singleLine.trim();
          if (!line) continue;

          if (line === 'uciok' || line === 'readyok') {
            this.isReady = true;
            if (this.readyResolver) {
              this.readyResolver();
              this.readyResolver = null;
            }
          }
        }
      };

      this.worker.postMessage('uci');
      this.worker.postMessage('isready');
    }
  }

  public async waitReady(): Promise<void> {
    if (this.isReady) return;
    if (this.readyPromise) {
      await Promise.race([
        this.readyPromise,
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
      this.isReady = true;
    }
  }

  public stop(): void {
    if (this.worker) {
      this.worker.postMessage('stop');
    }
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
    }
  }

  /**
   * Analyzes a single FEN position using Lichess Cloud Eval or Stockfish UCI commands.
   * Returns evaluation from White's perspective (+ = White advantage).
   */
  public async evaluatePosition(
    fen: string,
    depth = 12,
    useCloud = true,
    tacticalBoost = false
  ): Promise<EngineEvaluation> {
    // 1. Pre-check for terminal game positions (checkmate or draw)
    try {
      const testChess = new Chess(fen);
      if (testChess.isCheckmate()) {
        const turn = fen.split(' ')[1] || 'w';
        const mateScore = turn === 'w' ? -1 : 1; // if it's White's turn, White is checkmated
        return {
          cp: mateScore > 0 ? 10000 : -10000,
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
      // Proceed with engine
    }

    // 2. Check Lichess Cloud Evaluation first (depth 40-75+, instant)
    if (useCloud) {
      try {
        const cloudEval = await fetchLichessCloudEval(fen, 1200);
        if (cloudEval) {
          return cloudEval;
        }
      } catch {
        // Fallback to local Stockfish
      }
    }

    // 3. Dynamic Tactical Quiescence depth adjustment:
    let effectiveDepth = depth;
    try {
      const testChess = new Chess(fen);
      if (testChess.inCheck()) {
        effectiveDepth = depth + (tacticalBoost ? 4 : 2); // deeper tactical verification in checks
      } else {
        const legal = testChess.moves({ verbose: true });
        const captureCount = legal.filter((m) => m.captured).length;
        if (captureCount >= 2) {
          effectiveDepth = depth + (tacticalBoost ? 3 : 1); // tactical tension
        } else if (tacticalBoost) {
          effectiveDepth = depth + 1;
        }
      }
    } catch {
      // ignore
    }

    return new Promise((resolve) => {
      if (!this.worker) {
        resolve({
          cp: 0,
          depth: effectiveDepth,
          bestMoveUci: '',
          bestMoveSan: '',
        });
        return;
      }

      const turn = fen.split(' ')[1] || 'w';
      let lastCp: number | undefined = undefined;
      let lastMate: number | null | undefined = undefined;
      let lastPv: string | undefined = undefined;
      let bestMoveUci = '';
      let isResolved = false;

      const finish = (result: EngineEvaluation) => {
        if (isResolved) return;
        isResolved = true;
        if (timeoutId) clearTimeout(timeoutId);
        this.worker?.removeEventListener('message', messageHandler);
        resolve(result);
      };

      // Safety timeout: 4.5s max per move
      const timeoutId = setTimeout(() => {
        finish({
          cp: lastCp ?? 0,
          mate: lastMate ?? null,
          bestMoveUci: bestMoveUci || '',
          bestMoveSan: '',
          depth: effectiveDepth,
          pv: lastPv,
        });
      }, 4500);

      const messageHandler = (e: MessageEvent) => {
        const raw = typeof e.data === 'string' ? e.data : '';
        const lines = raw.split(/\r?\n/);

        for (const singleLine of lines) {
          const line = singleLine.trim();
          if (!line) continue;

          // Parse info score
          if (line.startsWith('info') && line.includes('score')) {
            const cpMatch = line.match(/score cp (-?\d+)/);
            const mateMatch = line.match(/score mate (-?\d+)/);
            const pvMatch = line.match(/ pv (.*)$/);

            if (cpMatch) {
              const rawCp = parseInt(cpMatch[1], 10);
              // Stockfish reports score from the moving side's perspective
              lastCp = turn === 'w' ? rawCp : -rawCp;
              lastMate = null;
            } else if (mateMatch) {
              const rawMate = parseInt(mateMatch[1], 10);
              lastMate = turn === 'w' ? rawMate : -rawMate;
              lastCp = lastMate > 0 ? 10000 : -10000;
            }

            if (pvMatch) {
              lastPv = pvMatch[1];
            }
          }

          // Parse bestmove
          if (line.startsWith('bestmove')) {
            const parts = line.split(' ');
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
              // fallback
            }

            finish({
              cp: lastCp ?? 0,
              mate: lastMate ?? null,
              bestMoveUci,
              bestMoveSan,
              depth: effectiveDepth,
              pv: lastPv,
            });
            return;
          }
        }
      };

      this.worker.addEventListener('message', messageHandler);
      this.worker.postMessage('setoption name MultiPV value 1');
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${effectiveDepth}`);
    });
  }

  /**
   * Evaluates top N candidate engine lines (MultiPV) for the given FEN.
   * Returns up to `count` candidate moves with evaluation and continuation.
   */
  public async evaluatePositionMultiPv(
    fen: string,
    depth = 11,
    count = 3
  ): Promise<MultiPvCandidate[]> {
    await this.waitReady();

    if (!this.worker) {
      return [];
    }

    // Terminal position check
    try {
      const test = new Chess(fen);
      if (test.isGameOver()) {
        return [];
      }
    } catch {
      // proceed
    }

    return new Promise((resolve) => {
      const turn = fen.split(' ')[1] || 'w';
      const linesMap = new Map<number, {
        multipv: number;
        cp?: number;
        mate?: number | null;
        depth: number;
        pv: string;
      }>();
      let isResolved = false;

      const finish = () => {
        if (isResolved) return;
        isResolved = true;
        if (timeoutId) clearTimeout(timeoutId);
        this.worker?.removeEventListener('message', messageHandler);
        this.worker?.postMessage('setoption name MultiPV value 1');

        const rawCandidates = Array.from(linesMap.values()).sort(
          (a, b) => a.multipv - b.multipv
        );

        // Convert UCI moves to SAN
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

          return {
            multipv: c.multipv,
            cp: c.cp,
            mate: c.mate,
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

      const messageHandler = (e: MessageEvent) => {
        const raw = typeof e.data === 'string' ? e.data : '';
        const lines = raw.split(/\r?\n/);

        for (const singleLine of lines) {
          const line = singleLine.trim();
          if (!line) continue;

          if (line.startsWith('info') && line.includes('multipv') && line.includes('score')) {
            const mpvMatch = line.match(/multipv (\d+)/);
            const depthMatch = line.match(/depth (\d+)/);
            const cpMatch = line.match(/score cp (-?\d+)/);
            const mateMatch = line.match(/score mate (-?\d+)/);
            const pvMatch = line.match(/ pv (.*)$/);

            if (mpvMatch) {
              const mpvNum = parseInt(mpvMatch[1], 10);
              const curDepth = depthMatch ? parseInt(depthMatch[1], 10) : depth;
              let cp: number | undefined = undefined;
              let mate: number | null | undefined = undefined;

              if (cpMatch) {
                const rawCp = parseInt(cpMatch[1], 10);
                cp = turn === 'w' ? rawCp : -rawCp;
                mate = null;
              } else if (mateMatch) {
                const rawMate = parseInt(mateMatch[1], 10);
                mate = turn === 'w' ? rawMate : -rawMate;
                cp = mate > 0 ? 10000 : -10000;
              }

              const pv = pvMatch ? pvMatch[1] : '';

              linesMap.set(mpvNum, {
                multipv: mpvNum,
                cp,
                mate,
                depth: curDepth,
                pv,
              });
            }
          }

          if (line.startsWith('bestmove')) {
            finish();
            return;
          }
        }
      };

      this.worker?.addEventListener('message', messageHandler);
      this.worker?.postMessage(`setoption name MultiPV value ${count}`);
      this.worker?.postMessage(`position fen ${fen}`);
      this.worker?.postMessage(`go depth ${depth}`);
    });
  }

  /**
   * Analyzes an array of FENs sequentially.
   */
  public async analyzePositions(
    fens: string[],
    options: AnalysisOptions = {}
  ): Promise<EngineEvaluation[]> {
    await this.waitReady();
    const results: EngineEvaluation[] = [];
    const total = fens.length;
    const depth = options.depth || 12;

    if (this.worker) {
      this.worker.postMessage('ucinewgame');
      this.worker.postMessage('isready');
      await new Promise((r) => setTimeout(r, 40));
    }

    for (let i = 0; i < total; i++) {
      if (options.signal?.aborted) {
        this.stop();
        break;
      }

      const fen = fens[i];
      const evaluation = await this.evaluatePosition(fen, depth, true, options.tacticalBoost ?? false);
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
}

// Singleton helper
let singletonService: StockfishService | null = null;
export function getStockfishService(): StockfishService {
  if (!singletonService) {
    singletonService = new StockfishService();
  }
  return singletonService;
}
