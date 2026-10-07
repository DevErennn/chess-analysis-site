import { Chess } from 'chess.js';
import type {
  MoveAnalysis,
  MoveClassification,
  ClassificationCount,
  GameAccuracy,
  EngineEvaluation,
  EngineScore,
  TurningPoint,
  MissedWin,
  PhaseAdvice,
} from '../types/chess';
import { isBookMove } from './openingExplorer';

/**
 * Centralized thresholds for move classification and accuracy calculation.
 */
export const CLASSIFICATION_THRESHOLDS = {
  EXCELLENT_MAX_LOSS: 2.0,   // Loss <= 2.0% -> Mükemmel (Excellent)
  GOOD_MAX_LOSS: 5.0,        // Loss <= 5.0% -> İyi (Good)
  INACCURACY_MAX_LOSS: 10.0, // Loss 5.0% - 10.0% -> Yanılgı (Inaccuracy)
  MISTAKE_MAX_LOSS: 20.0,    // Loss 10.0% - 20.0% -> Hata (Mistake)
  // Loss > 20.0% -> Gaf (Blunder)

  // MultiPV gap thresholds
  GREAT_MIN_GAP_CP: 80,      // Line 1 is at least 80cp better than Line 2
  BRILLIANT_MIN_GAP_CP: 100, // Line 1 is at least 100cp better than Line 2
  BRILLIANT_MAX_LOSS: 2.0,
  BRILLIANT_MAX_WIN_BEFORE: 92.0,
  BRILLIANT_MIN_WIN_AFTER: 40.0,
  BRILLIANT_MIN_MATERIAL_SACRIFICE: 2,
};

/**
 * Clamps centipawn evaluation into standard logistic curve range [-1000, 1000]
 */
export const clampCp = (cp: number): number => {
  return Math.max(-1000, Math.min(1000, cp));
};

/**
 * Pure logistic Win Percentage formula (0 - 100%):
 * winPct(cp) = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
 */
export const winPct = (cp: number): number => {
  const clamped = clampCp(cp);
  const val = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
  return Math.max(0, Math.min(100, val));
};

/**
 * Universal evaluation-to-win-probability function handling CP, Mate, White POV, and Mover POV.
 * @param evalData Centipawn or discrete mate evaluation from White perspective (+ = White, - = Black)
 * @param mover Color of the active player ('w' | 'b')
 */
export function evaluationToWinProbability(
  evalData: { cp?: number; mate?: number | null; score?: EngineScore },
  mover: 'w' | 'b'
): number {
  const mate = evalData.score?.type === 'mate'
    ? evalData.score.mateIn
    : evalData.mate;

  // Discrete mate evaluation
  if (mate !== null && mate !== undefined) {
    if (mover === 'w') {
      return mate > 0 ? 100 : 0;
    } else {
      return mate < 0 ? 100 : 0;
    }
  }

  // Centipawn evaluation
  const cpWhite = evalData.score?.type === 'cp'
    ? evalData.score.cp
    : (evalData.cp ?? 0);

  const whiteChance = winPct(cpWhite);
  return mover === 'w' ? whiteChance : 100 - whiteChance;
}

/**
 * Legacy compatibility alias for mover win%
 */
export const moverWinPct = (cpWhite: number, mover: 'w' | 'b'): number => {
  return evaluationToWinProbability({ cp: cpWhite }, mover);
};

/**
 * Legacy compatibility alias for win chance from White perspective
 */
export function calculateWinChance(cp?: number, mate?: number | null): number {
  return evaluationToWinProbability({ cp, mate }, 'w');
}

/**
 * Calculates raw centipawn loss from player's POV.
 */
export function calculateCpl(
  evalBefore: EngineEvaluation,
  evalAfter: EngineEvaluation,
  mover: 'w' | 'b',
  isBestMove: boolean
): number {
  if (isBestMove) return 0;

  const cpBefore = evalBefore.cp ?? 0;
  const cpAfter = evalAfter.cp ?? 0;

  const moverCpBefore = mover === 'w' ? cpBefore : -cpBefore;
  const moverCpAfter = mover === 'w' ? cpAfter : -cpAfter;

  return Math.max(0, moverCpBefore - moverCpAfter);
}

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

/**
 * Verifies if a move is a genuine material sacrifice by rolling forward the engine's PV.
 */
export function verifyMaterialSacrifice(
  fenBefore: string,
  from: string,
  to: string,
  pvStr?: string
): {
  isSacrifice: boolean;
  sacrificedPieceName?: string;
  sacrificedSquare?: string;
  materialDiff?: number;
} {
  try {
    const chess = new Chess(fenBefore);
    const piece = chess.get(from as any);
    if (!piece) return { isSacrifice: false };

    // Moving a pawn is not considered a major piece sacrifice
    if (piece.type === 'p') return { isSacrifice: false };

    const moverColor = piece.color;
    const opponentColor = moverColor === 'w' ? 'b' : 'w';

    const initialMoverMat = countMaterial(chess, moverColor);
    const initialOppMat = countMaterial(chess, opponentColor);
    const initialBalance = initialMoverMat - initialOppMat;

    // Execute the played move
    const moveRes = chess.move({ from, to, promotion: 'q' });
    if (!moveRes) return { isSacrifice: false };

    // Simulate following PV moves (up to 4 half-moves)
    if (pvStr) {
      const pvTokens = pvStr.trim().split(/\s+/);
      const startIndex = pvTokens[0]?.toLowerCase() === `${from}${to}`.toLowerCase() ? 1 : 0;
      const simSteps = Math.min(pvTokens.length, startIndex + 4);

      for (let i = startIndex; i < simSteps; i++) {
        const pvUci = pvTokens[i];
        if (pvUci && pvUci.length >= 4) {
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
 * Calculates MultiPV gap between best move and 2nd best move from mover's POV.
 */
export function getMultiPvGap(evalBefore: EngineEvaluation, color: 'w' | 'b'): number {
  if (!evalBefore.lines || evalBefore.lines.length < 2) return 0;
  const line1 = evalBefore.lines[0];
  const line2 = evalBefore.lines[1];

  const cp1 = line1.cp ?? 0;
  const cp2 = line2.cp ?? 0;

  const moverCp1 = color === 'w' ? cp1 : -cp1;
  const moverCp2 = color === 'w' ? cp2 : -cp2;

  return Math.max(0, moverCp1 - moverCp2);
}

/**
 * Classifies a move using comprehensive chess engine logic:
 * - POV-aware Win Probability Loss
 * - Strict loss=0 guarantee for best moves
 * - MultiPV context (only move / alternative gap)
 * - True material sacrifice detection
 * - Opening book integration
 * - Critical phase transitions (winning to losing, missed mates)
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
  cpl: number;
  accuracy: number;
  isBook: boolean;
  comment: string;
} {
  const winBefore = evaluationToWinProbability(evalBefore, color);
  const winAfter = evaluationToWinProbability(evalAfter, color);

  // Check if played move matches engine's top recommendation
  const playedUci = `${from}${to}`.toLowerCase();
  const engineBestUci = (evalBefore.bestMoveUci || '').toLowerCase();
  const isBestMove = playedUci === engineBestUci.slice(0, 4) ||
    (evalBefore.bestMoveSan !== undefined && evalBefore.bestMoveSan === moveSan);

  // Core Rule: If the player played the engine's best move, loss is STRICTLY 0
  let winLoss = isBestMove ? 0 : Math.max(0, winBefore - winAfter);
  const cpl = calculateCpl(evalBefore, evalAfter, color, isBestMove);

  const isBook = isBookMove(allSans, moveIndex);
  const multiPvGap = getMultiPvGap(evalBefore, color);

  let classification: MoveClassification = 'good';
  let comment = '';

  // 1. Opening Book Moves Check
  if (isBook && winLoss <= 3.0) {
    return {
      classification: 'book',
      winChanceBefore: winBefore,
      winChanceAfter: winAfter,
      winChanceLoss: 0,
      cpl: 0,
      accuracy: 100,
      isBook: true,
      comment: 'Kitap hamlesi (Açılış teorisi devam yolu).',
    };
  }

  // 2. Brilliant Move (!!) Check
  // Requirements:
  // - Best move (or <= 2% loss)
  // - Position was not already trivial winning
  // - Player remains strong after the move
  // - Genuine material sacrifice verified via PV rollout
  // - MultiPV confirms this is a standout idea (alternatives are clearly inferior or gap >= 80cp)
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
        cpl: 0,
        accuracy: 100,
        isBook: false,
        comment,
      };
    }
  }

  // 3. Great Move (!) Check
  // Game-turning or standout move where:
  // - Best move was played
  // - Position was turned around (deficit -> lead) OR only-move tactical save (MultiPV gap >= 80cp)
  if (isBestMove) {
    const turnedPosition = winBefore < 48.0 && winAfter >= 50.0;
    const onlyWinningMove = multiPvGap >= CLASSIFICATION_THRESHOLDS.GREAT_MIN_GAP_CP && winAfter >= 55.0;

    if (turnedPosition || onlyWinningMove) {
      classification = 'great';
      comment = turnedPosition
        ? '! Pozisyonu tersine çeviren harika ve kritik hamle!'
        : '! Taktiksel üstünlüğü koruyan tek ve kusursuz hamle!';
      return {
        classification,
        winChanceBefore: winBefore,
        winChanceAfter: winAfter,
        winChanceLoss: 0,
        cpl: 0,
        accuracy: 100,
        isBook: false,
        comment,
      };
    }
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
      cpl: 0,
      accuracy: 100,
      isBook: false,
      comment,
    };
  }

  // 5. Categorization when NOT best move
  // Check for critical game-state collapses (winning -> losing or throwing forced mate)
  const mateBefore = evalBefore.score?.type === 'mate' ? evalBefore.score.mateIn : evalBefore.mate;
  const isWinningMateBefore = mateBefore !== null && mateBefore !== undefined && (color === 'w' ? mateBefore > 0 : mateBefore < 0);
  const threwAwayMate = isWinningMateBefore && winAfter < 80.0;
  const leadCollapsing = winBefore >= 70.0 && winAfter <= 35.0;

  if (winLoss > CLASSIFICATION_THRESHOLDS.MISTAKE_MAX_LOSS || threwAwayMate || leadCollapsing) {
    classification = 'blunder';
    comment = threwAwayMate
      ? 'Büyük hata! Zorunlu mat kazancı kaçırıldı.'
      : leadCollapsing
      ? 'Büyük hata! Belirgin kazanç pozisyonu kaybedilen konuma düştü.'
      : 'Büyük hata (Gaf)! Rakibe ciddi bir üstünlük veya taktiksel fırsat verdi.';
  } else if (winLoss > CLASSIFICATION_THRESHOLDS.INACCURACY_MAX_LOSS) {
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
    cpl,
    accuracy: calculateMoveAccuracy(winLoss),
    isBook: false,
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
 * Computes game accuracy using Lichess-style volatility-weighted & harmonic mean.
 */
export function calculateAccuracy(moves: MoveAnalysis[]): GameAccuracy {
  const whiteMoves = moves.filter((m) => m.color === 'w');
  const blackMoves = moves.filter((m) => m.color === 'b');

  const computePlayerAccuracy = (list: MoveAnalysis[]): number => {
    if (list.length === 0) return 100;

    const accList: number[] = [];
    const losses: number[] = [];

    for (const m of list) {
      if (m.classification === 'book' || m.isBook) {
        accList.push(100);
        losses.push(0);
      } else {
        const loss = m.winChanceLoss ?? 0;
        losses.push(loss);
        accList.push(calculateMoveAccuracy(loss));
      }
    }

    const n = list.length;
    const meanLoss = losses.reduce((a, b) => a + b, 0) / n;
    const variance = losses.reduce((a, b) => a + Math.pow(b - meanLoss, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    const arithMean = accList.reduce((a, b) => a + b, 0) / n;
    const harmonicSum = accList.reduce((acc, score) => acc + 1 / Math.max(score, 1), 0);
    const harmonicMean = n / harmonicSum;

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
 * Counts move classifications for white and black.
 */
export function countClassifications(moves: MoveAnalysis[]): {
  white: ClassificationCount;
  black: ClassificationCount;
} {
  const emptyCounts = (): ClassificationCount => ({
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
    white: emptyCounts(),
    black: emptyCounts(),
  };

  for (const m of moves) {
    const cl = m.classification || 'good';
    if (m.color === 'w') {
      counts.white[cl] = (counts.white[cl] || 0) + 1;
    } else {
      counts.black[cl] = (counts.black[cl] || 0) + 1;
    }
  }

  return counts;
}

/**
 * Detects the pivotal turning point based on Win Probability swing and lead change.
 */
export function detectTurningPoint(moves: MoveAnalysis[]): TurningPoint | null {
  if (moves.length === 0) return null;

  let bestCandidate: MoveAnalysis | null = null;
  let maxImpactScore = 0;

  for (const m of moves) {
    const winBefore = m.winChanceBefore ?? 50;
    const winAfter = m.winChanceAfter ?? 50;
    const loss = m.winChanceLoss ?? 0;

    // A lead change or major swing is heavily weighted
    const leadChange = (winBefore >= 55 && winAfter <= 45) || (winBefore <= 45 && winAfter >= 55);
    const impactScore = loss + (leadChange ? 25 : 0);

    if (impactScore > maxImpactScore && loss >= 15) {
      maxImpactScore = impactScore;
      bestCandidate = m;
    }
  }

  if (!bestCandidate) return null;

  const moverColor = bestCandidate.color === 'w' ? 'Beyaz' : 'Siyah';
  const opponentColor = bestCandidate.color === 'w' ? 'Siyah' : 'Beyaz';
  const moveLabel = `${bestCandidate.moveNumber}${bestCandidate.color === 'w' ? '.' : '...'} ${bestCandidate.san}`;

  return {
    moveIndex: bestCandidate.moveIndex,
    moveNumber: bestCandidate.moveNumber,
    color: bestCandidate.color,
    san: bestCandidate.san,
    from: bestCandidate.from,
    to: bestCandidate.to,
    evalBefore: bestCandidate.evalBefore ?? 0,
    evalAfter: bestCandidate.evalAfter ?? 0,
    winChanceLoss: bestCandidate.winChanceLoss ?? 0,
    description: `${moveLabel} hamlesi oyunun kırılma anı oldu. ${moverColor} bu hamleyle %${(bestCandidate.winChanceLoss ?? 0).toFixed(0)} galibiyet şansı kaybederek inisiyatifi ${opponentColor} taşlara devretti.`,
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
 * Dynamic Phase Analysis based on real piece count, material weight, and queens.
 */
export function calculatePhaseAdvice(moves: MoveAnalysis[]): PhaseAdvice {
  if (moves.length === 0) {
    return {
      opening: { score: 100, comment: 'Açılış aşaması.' },
      middlegame: { score: 100, comment: 'Oyun ortası.' },
      endgame: { score: 100, comment: 'Oyun sonu.' },
      weakestPhase: 'opening',
    };
  }

  const openingMoves: MoveAnalysis[] = [];
  const middlegameMoves: MoveAnalysis[] = [];
  const endgameMoves: MoveAnalysis[] = [];

  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    const fen = m.fenBefore;

    // Piece census from FEN
    const piecePart = fen.split(' ')[0] || '';
    const hasWhiteQueen = piecePart.includes('Q');
    const hasBlackQueen = piecePart.includes('q');
    const queensCount = (hasWhiteQueen ? 1 : 0) + (hasBlackQueen ? 1 : 0);

    // Minor & major piece count (excluding pawns and kings)
    const majorMinors = (piecePart.match(/[rnbqRNBQ]/g) || []).length;

    // Opening: First 12 moves, or theoretical/development phase
    if (i < 16 && majorMinors >= 10) {
      openingMoves.push(m);
    } else if (queensCount === 0 || majorMinors <= 6) {
      // Endgame: Queens traded off OR very few pieces remaining
      endgameMoves.push(m);
    } else {
      // Middlegame: Active queens, coordinated pieces
      middlegameMoves.push(m);
    }
  }

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
