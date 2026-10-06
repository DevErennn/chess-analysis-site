import { Chess } from 'chess.js';
import type { EngineEvaluation } from '../types/chess';

export interface AnalysisOptions {
  depth?: number;
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
   * Analyzes a single FEN position using Stockfish UCI commands.
   * Returns evaluation from White's perspective (+ = White advantage).
   */
  public evaluatePosition(fen: string, depth = 12): Promise<EngineEvaluation> {
    return new Promise((resolve) => {
      if (!this.worker) {
        resolve({
          cp: 0,
          depth,
          bestMoveUci: '',
          bestMoveSan: '',
        });
        return;
      }

      // Pre-check for terminal game positions (checkmate or draw)
      try {
        const testChess = new Chess(fen);
        if (testChess.isCheckmate()) {
          const turn = fen.split(' ')[1] || 'w';
          const mateScore = turn === 'w' ? -1 : 1; // if it's White's turn, White is checkmated
          resolve({
            cp: mateScore > 0 ? 10000 : -10000,
            mate: mateScore,
            depth,
            bestMoveUci: '',
            bestMoveSan: '',
          });
          return;
        }
        if (testChess.isDraw()) {
          resolve({
            cp: 0,
            mate: null,
            depth,
            bestMoveUci: '',
            bestMoveSan: '',
          });
          return;
        }
      } catch {
        // Proceed with engine
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
          depth,
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
              depth,
              pv: lastPv,
            });
            return;
          }
        }
      };

      this.worker.addEventListener('message', messageHandler);
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);
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
      const evaluation = await this.evaluatePosition(fen, depth);
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
