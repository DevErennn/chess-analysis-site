import { Chess } from 'chess.js';
import type {
  MoveAnalysis,
  MoveClassification,
  ClassificationCount,
  GameAccuracy,
  EngineEvaluation,
  TurningPoint,
  MissedWin,
  PhaseAdvice,
} from '../types/chess';
import { isBookMove } from './openingExplorer';

/**
 * Configuration constants for move classification and accuracy calculation.
 * Centralized for transparency and testing.
 */
export const CLASSIFICATION_THRESHOLDS = {
  // Win% loss thresholds for classification (when not best move)
  EXCELLENT_MAX_LOSS: 2.0,   // Loss <= 2.0% -> Mükemmel (Excellent)
  GOOD_MAX_LOSS: 5.0,        // Loss <= 5.0% -> İyi (Good)
  INACCURACY_MAX_LOSS: 10.0, // Loss 5.0% - 10.0% -> Yanılgı (Inaccuracy)
  MISTAKE_MAX_LOSS: 20.0,    // Loss 10.0% - 20.0% -> Hata (Mistake)
  // Loss > 20.0% -> Gaf (Blunder)

  // Extreme position material loss fallback thresholds (e.g. +8.00 down to +4.00)
  EXTREME_MISTAKE_CP_LOSS: 300, // Losing >= 300 cp (minor piece) even when still winning
  EXTREME_BLUNDER_CP_LOSS: 500, // Losing >= 500 cp (rook/queen) even when still winning

  // Brilliant criteria
  BRILLIANT_MAX_LOSS: 2.0,
  BRILLIANT_MAX_WIN_BEFORE: 92.0, // Not already completely won (+9)
  BRILLIANT_MIN_WIN_AFTER: 40.0,  // Mover is not dead lost after the move
  BRILLIANT_MIN_MATERIAL_SACRIFICE: 2, // Down at least 2 points (e.g. exchange or minor piece)
};

/**
 * Clamps centipawn evaluation into standard logistic curve range [-1000, 1000]
 * (10 pawns max for win% calculations, as beyond +-10 pawns win chance is effectively 100%/0%).
 */
export const clampCp = (cp: number): number => {
  return Math.max(-1000, Math.min(1000, cp));
};

/**
 * Lichess / Chess.com standard logistic Win Percentage formula (0 - 100%):
 * winPct(cp) = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
 */
export const winPct = (cp: number): number => {
  const clamped = clampCp(cp);
  const val = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
  return Math.max(0, Math.min(100, val));
};

/**
 * Calculates win chance from White perspective taking mate into account.
 */
export function calculateWinChance(cp?: number, mate?: number | null): number {
  if (mate !== null && mate !== undefined) {
    return mate > 0 ? 100 : 0;
  }
  return winPct(cp ?? 0);
}

/**
 * Returns win percentage from the perspective of the moving player.
 * @param cpWhite Centipawn score from White's perspective (+ = White advantage)
 * @param mover Color of the player making the move ('w' or 'b')
 */
export const moverWinPct = (cpWhite: number, mover: 'w' | 'b'): number => {
  const whiteChance = winPct(cpWhite);
  return mover === 'w' ? whiteChance : 100 - whiteChance;
};

/**
 * Counts material on board in pawn units: P=1, N=3, B=3, R=5, Q=9.
 */
export function countMaterial(chess: Chess, color: 'w' | 'b'): number {
  const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let sum = 0;
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        sum += values[piece.type] || 0;
      }
    }
  }
  return sum;
}

export interface SacrificeAnalysisResult {
  isSacrifice: boolean;
  sacrificedPieceName?: string;
  sacrificedSquare?: string;
  materialDiff?: number;
}

/**
 * Verifies whether a move represents a genuine material sacrifice by:
 * 1. Playing the move on chess.js
 * 2. Simulating opponent's top PV moves or recaptures for 2-4 plies
 * 3. Checking if the mover is genuinely down >= 2 points of material without immediate recapture
 */
export function verifyMaterialSacrifice(
  fenBefore: string,
  from: string,
  to: string,
  pvStr?: string
): SacrificeAnalysisResult {
  try {
    const chess = new Chess(fenBefore);
    const piece = chess.get(from as any);
    if (!piece || piece.type === 'p' || piece.type === 'k') {
      return { isSacrifice: false };
    }

    const moverColor = piece.color;
    const opponentColor = moverColor === 'w' ? 'b' : 'w';

    const moverMatBefore = countMaterial(chess, moverColor);
    const oppMatBefore = countMaterial(chess, opponentColor);
    const initialBalance = moverMatBefore - oppMatBefore;

    // Make the candidate move
    const move = chess.move({ from, to, promotion: 'q' });
    if (!move) return { isSacrifice: false };

    // Play out up to 3 PV continuation half-moves if available
    if (pvStr) {
      const pvMoves = pvStr.trim().split(/\s+/).slice(1, 4); // next 2-3 plies
      for (const pvUci of pvMoves) {
        if (pvUci.length >= 4) {
          const uFrom = pvUci.slice(0, 2);
          const uTo = pvUci.slice(2, 4);
          const uProm = pvUci.length > 4 ? pvUci.slice(4, 5) : undefined;
          const played = chess.move({ from: uFrom, to: uTo, promotion: uProm });
          if (!played) break;
        }
      }
    }

    const moverMatAfter = countMaterial(chess, moverColor);
    const oppMatAfter = countMaterial(chess, opponentColor);
    const balanceAfter = moverMatAfter - oppMatAfter;

    // True sacrifice: mover's relative material balance worsened by at least 2 points (e.g. exchange or minor piece)
    const materialLost = initialBalance - balanceAfter;

    if (materialLost >= CLASSIFICATION_THRESHOLDS.BRILLIANT_MIN_MATERIAL_SACRIFICE) {
      const names: Record<string, string> = {
        n: 'At',
        b: 'Fil',
        r: 'Kale',
        q: 'Vezir',
      };
      return {
        isSacrifice: true,
        sacrificedPieceName: names[piece.type] || 'Taş',
        sacrificedSquare: to,
        materialDiff: materialLost,
      };
    }

    return { isSacrifice: false };
  } catch {
    return { isSacrifice: false };
  }
}

/**
 * Classifies a move using pure, mathematically sound logic:
 * - `loss = moverWin(before) - moverWin(after)`
 * - If `isBestMove`: `loss = 0` (strictly guaranteed)
 * - True material sacrifice verified via PV rollout
 * - Opening book verified against openingExplorer database
 */
export function classifyMove(
  moveSan: string,
  from: string,
  to: string,
  color: 'w' | 'b',
  fenBefore: string,
  _fenAfter: string,
  evalBefore: EngineEvaluation,
  evalAfter: EngineEvaluation,
  moveIndex: number,
  allSans: string[] = []
): {
  classification: MoveClassification;
  winChanceBefore: number;
  winChanceAfter: number;
  winChanceLoss: number;
  comment: string;
} {
  const cpBefore = evalBefore.cp ?? 0;
  const cpAfter = evalAfter.cp ?? 0;

  const winBefore = moverWinPct(cpBefore, color);
  const winAfter = moverWinPct(cpAfter, color);

  // Check if played move matches engine's top recommendation
  const playedUci = `${from}${to}`.toLowerCase();
  const engineBestUci = (evalBefore.bestMoveUci || '').toLowerCase();
  const isBestMove = playedUci === engineBestUci.slice(0, 4) ||
    (evalBefore.bestMoveSan !== undefined && evalBefore.bestMoveSan === moveSan);

  // Core Rule: If the player played the engine's best move, loss is STRICTLY 0
  let winLoss = isBestMove ? 0 : Math.max(0, winBefore - winAfter);

  // Centipawn loss from mover's perspective
  const moverCpBefore = color === 'w' ? cpBefore : -cpBefore;
  const moverCpAfter = color === 'w' ? cpAfter : -cpAfter;
  const cpLoss = isBestMove ? 0 : Math.max(0, moverCpBefore - moverCpAfter);

  let classification: MoveClassification = 'good';
  let comment = '';

  // 1. Opening Book Moves Check
  if (isBookMove(allSans, moveIndex) && winLoss <= 3.0) {
    return {
      classification: 'book',
      winChanceBefore: winBefore,
      winChanceAfter: winAfter,
      winChanceLoss: 0,
      comment: 'Kitap hamlesi (Açılış teorisi devam yolu).',
    };
  }

  // 2. Brilliant Move (!!) Check
  // Conditions:
  // - Best move (or <= 2% loss)
  // - Mover was not already overwhelmingly winning (winBefore < 92)
  // - Mover remains strong/advantageous (winAfter >= 40)
  // - Genuine material sacrifice confirmed by PV rollout
  if ((isBestMove || winLoss <= CLASSIFICATION_THRESHOLDS.BRILLIANT_MAX_LOSS) &&
      winBefore < CLASSIFICATION_THRESHOLDS.BRILLIANT_MAX_WIN_BEFORE &&
      winAfter >= CLASSIFICATION_THRESHOLDS.BRILLIANT_MIN_WIN_AFTER) {
    const sac = verifyMaterialSacrifice(fenBefore, from, to, evalBefore.pv);
    if (sac.isSacrifice) {
      classification = 'brilliant';
      comment = `‼️ Göz Alıcı Hamle: ${sac.sacrificedPieceName || 'Taş'} fedası (${sac.sacrificedSquare || to} karesinde)! Taktiksel üstünlük sağlayan cesur devam yolu.`;
      return {
        classification,
        winChanceBefore: winBefore,
        winChanceAfter: winAfter,
        winChanceLoss: 0,
        comment,
      };
    }
  }

  // 3. Great Move (!) Check
  // Game-turning or critical single move that saves the game / secures the win
  if (isBestMove && winBefore < 48.0 && winAfter >= 50.0) {
    classification = 'great';
    comment = '! Pozisyonu tersine çeviren harika ve kritik hamle!';
    return {
      classification,
      winChanceBefore: winBefore,
      winChanceAfter: winAfter,
      winChanceLoss: 0,
      comment,
    };
  }

  // 4. Best Move (⭐)
  if (isBestMove) {
    classification = 'best';
    comment = 'Motorun önerdiği en güçlü hamle.';
    return {
      classification,
      winChanceBefore: winBefore,
      winChanceAfter: winAfter,
      winChanceLoss: 0,
      comment,
    };
  }

  // 5. Categorization when NOT best move (using winLoss as primary, cpLoss as secondary for extreme positions)
  // Check for extreme piece blunders even in lopsided winning positions:
  if (winLoss > CLASSIFICATION_THRESHOLDS.MISTAKE_MAX_LOSS || cpLoss >= CLASSIFICATION_THRESHOLDS.EXTREME_BLUNDER_CP_LOSS) {
    classification = 'blunder';
    comment = 'Büyük hata (Gaf)! Rakibe ciddi bir üstünlük veya taktiksel fırsat verdi.';
  } else if (winLoss > CLASSIFICATION_THRESHOLDS.INACCURACY_MAX_LOSS || cpLoss >= CLASSIFICATION_THRESHOLDS.EXTREME_MISTAKE_CP_LOSS) {
    classification = 'mistake';
    comment = 'Pozisyonel veya taktiksel hata, daha iyi bir devam yolu vardı.';
  } else if (winLoss > CLASSIFICATION_THRESHOLDS.GOOD_MAX_LOSS) {
    classification = 'inaccuracy';
    comment = 'Küçük bir avantaj kaybı (Şüpheli hamle).';
  } else if (winLoss > CLASSIFICATION_THRESHOLDS.EXCELLENT_MAX_LOSS) {
    classification = 'good';
    comment = 'Sağlam ve güvenli bir devam hamlesi.';
  } else {
    classification = 'excellent';
    comment = 'En iyi hamleye çok yakın güçlü bir alternatif.';
  }

  return {
    classification,
    winChanceBefore: winBefore,
    winChanceAfter: winAfter,
    winChanceLoss: winLoss,
    comment,
  };
}

/**
 * Calculates per-move accuracy using Lichess open-source formula:
 * acc = clamp(103.1668 * exp(-0.04354 * loss) - 3.1669, 0, 100)
 */
export function calculateMoveAccuracy(loss: number): number {
  if (loss <= 0) return 100;
  const raw = 103.1668 * Math.exp(-0.04354 * Math.max(0, loss)) - 3.1669;
  return Math.max(0, Math.min(100, Math.round(raw * 10) / 10));
}

/**
 * Computes game accuracy using Lichess-style volatility-weighted & harmonic mean:
 * Avoids flat arithmetic averages that overstate accuracy in blunder-heavy games.
 */
export function calculateAccuracy(moves: MoveAnalysis[]): GameAccuracy {
  const whiteMoves = moves.filter((m) => m.color === 'w');
  const blackMoves = moves.filter((m) => m.color === 'b');

  const computePlayerAccuracy = (list: MoveAnalysis[]): number => {
    if (list.length === 0) return 100;

    // Per-move accuracies
    const accList: number[] = [];
    const losses: number[] = [];

    for (const m of list) {
      if (m.classification === 'book') {
        accList.push(100);
        losses.push(0);
      } else {
        const loss = m.winChanceLoss ?? 0;
        losses.push(loss);
        accList.push(calculateMoveAccuracy(loss));
      }
    }

    // 1. Mean loss and standard deviation
    const n = list.length;
    const meanLoss = losses.reduce((a, b) => a + b, 0) / n;
    const variance = losses.reduce((a, b) => a + Math.pow(b - meanLoss, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // 2. Arithmetic average of move accuracies
    const arithMean = accList.reduce((a, b) => a + b, 0) / n;

    // 3. Harmonic mean of move accuracies (punishes zero/low scores appropriately)
    const harmonicSum = accList.reduce((acc, score) => acc + 1 / (Math.max(score, 1)), 0);
    const harmonicMean = n / harmonicSum;

    // 4. Volatility weighting (Lichess AccuracyPercent model):
    // Blend harmonic mean and arithmetic mean based on game stability
    const blendWeight = Math.min(1, Math.max(0, stdDev / 15));
    const combined = (1 - blendWeight * 0.4) * arithMean + (blendWeight * 0.4) * harmonicMean;

    return Math.round(Math.max(0, Math.min(100, combined)) * 10) / 10;
  };

  return {
    white: computePlayerAccuracy(whiteMoves),
    black: computePlayerAccuracy(blackMoves),
  };
}

/**
 * Counts classifications for White and Black.
 */
export function countClassifications(moves: MoveAnalysis[]): {
  white: ClassificationCount;
  black: ClassificationCount;
} {
  const createEmpty = (): ClassificationCount => ({
    brilliant: 0,
    great: 0,
    best: 0,
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
    book: 0,
  });

  const counts = {
    white: createEmpty(),
    black: createEmpty(),
  };

  for (const m of moves) {
    const target = m.color === 'w' ? counts.white : counts.black;
    const cls = m.classification || 'good';
    if (cls in target) {
      target[cls]++;
    }
  }

  return counts;
}

/**
 * Detects the biggest Turning Point of the game based on win% loss.
 */
export function detectTurningPoint(moves: MoveAnalysis[]): TurningPoint | null {
  let worstMove: MoveAnalysis | null = null;
  let maxSwing = 0;

  for (const m of moves) {
    if (m.classification === 'blunder' || m.classification === 'mistake') {
      const swing = m.winChanceLoss ?? 0;
      const wasCompetitive = (m.winChanceBefore ?? 50) >= 30 && (m.winChanceBefore ?? 50) <= 85;
      const effectiveScore = swing + (wasCompetitive ? 15 : 0);

      if (effectiveScore > maxSwing) {
        maxSwing = effectiveScore;
        worstMove = m;
      }
    }
  }

  if (!worstMove || (worstMove.winChanceLoss ?? 0) < 15) {
    return null;
  }

  const moverColor = worstMove.color === 'w' ? 'Beyaz' : 'Siyah';
  const opponentColor = worstMove.color === 'w' ? 'Siyah' : 'Beyaz';
  const moveLabel = `${worstMove.moveNumber}${worstMove.color === 'w' ? '.' : '...'} ${worstMove.san}`;

  return {
    moveIndex: worstMove.moveIndex,
    moveNumber: worstMove.moveNumber,
    color: worstMove.color,
    san: worstMove.san,
    from: worstMove.from,
    to: worstMove.to,
    evalBefore: worstMove.evalBefore ?? 0,
    evalAfter: worstMove.evalAfter ?? 0,
    winChanceLoss: worstMove.winChanceLoss ?? 0,
    description: `${moveLabel} hamlesi oyunun kırılma anı oldu. ${moverColor} bu hamleyle %${(worstMove.winChanceLoss ?? 0).toFixed(0)} galibiyet şansı kaybederek inisiyatifi ${opponentColor} taşlara devretti.`,
  };
}

/**
 * Detects missed wins (positions where a decisive advantage was thrown away).
 */
export function detectMissedWins(moves: MoveAnalysis[]): MissedWin[] {
  const missed: MissedWin[] = [];

  for (const m of moves) {
    const winBefore = m.winChanceBefore ?? 50;
    const winAfter = m.winChanceAfter ?? 50;
    if (winBefore >= 80 && winAfter <= 55 && m.classification !== 'best') {
      missed.push({
        moveIndex: m.moveIndex,
        moveNumber: m.moveNumber,
        color: m.color,
        san: m.san,
        bestMoveSan: m.bestMoveSan,
        description: `Hamle ${m.moveNumber}: %${winBefore.toFixed(0)} kazanç şansı varken oynanan ${m.san} hamlesi kazancı kaçırdı. Motorun önerisi: ${m.bestMoveSan || 'en iyi hamle'}.`,
      });
    }
  }

  return missed.slice(0, 3);
}

/**
 * Calculates phase advice based on accuracy across Opening, Middlegame, and Endgame.
 */
export function calculatePhaseAdvice(moves: MoveAnalysis[]): PhaseAdvice {
  const openingMoves = moves.slice(0, 16);
  const middlegameMoves = moves.slice(16, 60);
  const endgameMoves = moves.slice(60);

  const getPhaseScore = (list: MoveAnalysis[]): number => {
    if (list.length === 0) return 85;
    const acc = calculateAccuracy(list);
    return Math.round((acc.white + acc.black) / 2);
  };

  const openingScore = getPhaseScore(openingMoves);
  const middlegameScore = getPhaseScore(middlegameMoves);
  const endgameScore = getPhaseScore(endgameMoves);

  let weakestPhase: 'opening' | 'middlegame' | 'endgame' = 'opening';
  let minScore = openingScore;

  if (middlegameMoves.length > 0 && middlegameScore < minScore) {
    minScore = middlegameScore;
    weakestPhase = 'middlegame';
  }
  if (endgameMoves.length > 0 && endgameScore < minScore) {
    weakestPhase = 'endgame';
  }

  const adviceMap = {
    opening: 'Açılış teorisinde daha erken taş geliştirip şah güvenliğini (rok) sağlamalısınız.',
    middlegame: 'Oyun ortasında taktiksel hesaplamalara ve taş koordinasyonuna daha fazla dikkat edin.',
    endgame: 'Oyun sonunda aktif şah kullanımı ve geçer piyon yaratma stratejileri üzerinde çalışın.',
  };

  return {
    opening: {
      score: openingScore,
      comment: adviceMap.opening,
    },
    middlegame: {
      score: middlegameScore,
      comment: adviceMap.middlegame,
    },
    endgame: {
      score: endgameScore,
      comment: adviceMap.endgame,
    },
    weakestPhase,
  };
}

/**
 * Generates insightful coach summary based on accuracy and key turning points.
 */
export function generateCoachSummary(
  accuracy: GameAccuracy,
  counts: { white: ClassificationCount; black: ClassificationCount },
  result: string,
  turningPoint: TurningPoint | null,
  phaseAdvice: PhaseAdvice
): string {
  const winner = result === '1-0' ? 'Beyaz' : result === '0-1' ? 'Siyah' : null;
  const whiteTotalErrors = counts.white.mistake + counts.white.blunder;
  const blackTotalErrors = counts.black.mistake + counts.black.blunder;

  let summary = '';

  if (winner) {
    summary += `${winner} tarafı %${winner === 'Beyaz' ? accuracy.white : accuracy.black} doğrulukla oynayarak zafere ulaştı. `;
  } else {
    summary += `Karşılaşma çekişmeli bir beraberlikle tamamlandı (Beyaz: %${accuracy.white}, Siyah: %${accuracy.black}). `;
  }

  if (turningPoint) {
    summary += turningPoint.description + ' ';
  } else if (whiteTotalErrors === 0 && blackTotalErrors === 0) {
    summary += 'Her iki taraf da kritik taktiksel hatalardan kaçınarak temiz bir oyun sergiledi. ';
  }

  summary += `Gelişim tavsiyesi: ${phaseAdvice[phaseAdvice.weakestPhase].comment} - ${phaseAdvice.weakestPhase === 'opening' ? 'Açılış' : phaseAdvice.weakestPhase === 'middlegame' ? 'Oyun ortası' : 'Oyun sonu'} evresine odaklanılmalı.`;

  return summary;
}
