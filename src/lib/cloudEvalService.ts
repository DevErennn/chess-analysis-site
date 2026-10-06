import { Chess } from 'chess.js';
import type { EngineEvaluation } from '../types/chess';

// In-memory cache for Lichess Cloud Evals to avoid duplicate network calls
const cloudEvalCache = new Map<string, EngineEvaluation | null>();

/**
 * Normalizes FEN for cloud cache key (first 4 fields: pieces, turn, castling, en passant)
 */
function getNormalizedFen(fen: string): string {
  const parts = fen.trim().split(/\s+/);
  return parts.slice(0, 4).join(' ');
}

/**
 * Fetches Stockfish evaluation from Lichess Cloud API.
 * Lichess evaluates positions up to depth 40-75 with multi-million nodes.
 * Lichess reports cp and mate from White's perspective (+ is white advantage).
 */
export async function fetchLichessCloudEval(
  fen: string,
  timeoutMs = 1500
): Promise<EngineEvaluation | null> {
  const cacheKey = getNormalizedFen(fen);
  if (cloudEvalCache.has(cacheKey)) {
    return cloudEvalCache.get(cacheKey) || null;
  }

  // Pre-check for terminal game positions (checkmate or draw)
  try {
    const testChess = new Chess(fen);
    if (testChess.isCheckmate()) {
      const turn = fen.split(' ')[1] || 'w';
      const mateScore = turn === 'w' ? -1 : 1;
      const res: EngineEvaluation = {
        cp: mateScore > 0 ? 10000 : -10000,
        mate: mateScore,
        depth: 99,
        bestMoveUci: '',
        bestMoveSan: '',
        isCloud: true,
      };
      cloudEvalCache.set(cacheKey, res);
      return res;
    }
    if (testChess.isDraw()) {
      const res: EngineEvaluation = {
        cp: 0,
        mate: null,
        depth: 99,
        bestMoveUci: '',
        bestMoveSan: '',
        isCloud: true,
      };
      cloudEvalCache.set(cacheKey, res);
      return res;
    }
  } catch {
    // Proceed
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const encodedFen = encodeURIComponent(fen.trim());
    const res = await fetch(`https://lichess.org/api/cloud-eval?fen=${encodedFen}&multiPv=1`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timer);

    if (!res.ok) {
      cloudEvalCache.set(cacheKey, null);
      return null;
    }

    const data = await res.json();
    if (!data || !data.pvs || data.pvs.length === 0) {
      cloudEvalCache.set(cacheKey, null);
      return null;
    }

    const topPv = data.pvs[0];
    const movesStr = topPv.moves || '';
    const movesList = movesStr.trim().split(/\s+/);
    const bestMoveUci = movesList[0] || '';

    // Convert UCI to SAN
    let bestMoveSan = bestMoveUci;
    if (bestMoveUci && bestMoveUci !== '(none)') {
      try {
        const chess = new Chess(fen);
        const from = bestMoveUci.slice(0, 2);
        const to = bestMoveUci.slice(2, 4);
        const promotion = bestMoveUci.length > 4 ? bestMoveUci.slice(4, 5) : undefined;
        const moveRes = chess.move({ from, to, promotion });
        if (moveRes) {
          bestMoveSan = moveRes.san;
        }
      } catch {
        // Fallback to UCI
      }
    }

    let cp = topPv.cp ?? 0;
    let mate: number | null = topPv.mate ?? null;

    if (mate !== null && mate !== undefined) {
      cp = mate > 0 ? 10000 : -10000;
    }

    const evaluation: EngineEvaluation = {
      cp,
      mate,
      depth: data.depth || 40,
      bestMoveUci,
      bestMoveSan,
      pv: movesStr,
      isCloud: true,
    };

    cloudEvalCache.set(cacheKey, evaluation);
    return evaluation;
  } catch {
    clearTimeout(timer);
    cloudEvalCache.set(cacheKey, null);
    return null;
  }
}
