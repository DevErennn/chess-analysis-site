import { Chess } from 'chess.js';
import type {
  MoveAnalysis,
  MoveClassification,
  ClassificationCount,
  GameAccuracy,
  EngineEvaluation,
} from '../types/chess';

/**
 * Calculates win chance (0 - 100) from centipawns / mate from White's perspective.
 * Standard Lichess / Chess.com logistic curve:
 * winChance(cp) = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
 */
export function calculateWinChance(cp?: number, mate?: number | null): number {
  if (mate !== undefined && mate !== null) {
    if (mate > 0) return 100;
    if (mate < 0) return 0;
  }

  const centipawns = cp ?? 0;
  // Clamp between -4000 and +4000
  const clamped = Math.max(-4000, Math.min(4000, centipawns));
  const chance = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
  return Math.max(0, Math.min(100, chance));
}

/**
 * Checks if a move sacrificed material (piece value placed on attacked square by lesser piece or hanging).
 */
function isMaterialSacrifice(
  fenBefore: string,
  fenAfter: string,
  _color: 'w' | 'b',
  from: string,
  to: string
): boolean {
  try {
    const chessBefore = new Chess(fenBefore);
    const piece = chessBefore.get(from as any);
    if (!piece) return false;

    // Pawns and Kings are not piece sacrifices
    if (piece.type === 'p' || piece.type === 'k') return false;

    const pieceValues: Record<string, number> = { n: 3, b: 3, r: 5, q: 9 };
    const myPieceVal = pieceValues[piece.type] || 0;

    const chessAfter = new Chess(fenAfter);
    const legalOpponentMoves = chessAfter.moves({ verbose: true });
    const capturingMoves = legalOpponentMoves.filter((m) => m.to === to);

    if (capturingMoves.length > 0) {
      // 1. Captured by pawn: true sacrifice
      const pawnCapture = capturingMoves.some((m) => m.piece === 'p');
      if (pawnCapture) return true;

      // 2. Captured by a lesser piece (e.g. Queen or Rook attacked by Bishop/Knight)
      const lesserPieceCapture = capturingMoves.some((m) => {
        const capturerVal = pieceValues[m.piece] || 1;
        return capturerVal < myPieceVal;
      });
      if (lesserPieceCapture) return true;

      // 3. Left en prise with more attackers than defenders
      const myDefenders = chessBefore.moves({ verbose: true }).filter((m) => m.to === to);
      if (capturingMoves.length > myDefenders.length) {
        return true;
      }
    }

    // 4. Exchange sacrifice: Rook captures minor piece, or Queen captures minor/rook
    const captured = chessBefore.get(to as any);
    if (captured && piece.type === 'r' && (captured.type === 'n' || captured.type === 'b' || captured.type === 'p')) {
      return true;
    }
    if (captured && piece.type === 'q' && captured.type !== 'q') {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Classifies a move according to Win Chance Loss, tactical context, and Chess.com standards.
 */
export function classifyMove(
  _moveSan: string,
  from: string,
  to: string,
  color: 'w' | 'b',
  fenBefore: string,
  fenAfter: string,
  evalBefore: EngineEvaluation,
  evalAfter: EngineEvaluation,
  moveIndex: number
): {
  classification: MoveClassification;
  winChanceBefore: number;
  winChanceAfter: number;
  winChanceLoss: number;
  comment: string;
} {
  const whiteWinBefore = calculateWinChance(evalBefore.cp, evalBefore.mate);
  const whiteWinAfter = calculateWinChance(evalAfter.cp, evalAfter.mate);

  // Perspective of the player who made the move
  const playerWinBefore = color === 'w' ? whiteWinBefore : 100 - whiteWinBefore;
  const playerWinAfter = color === 'w' ? whiteWinAfter : 100 - whiteWinAfter;

  const winLoss = Math.max(0, playerWinBefore - playerWinAfter);

  const playedUci = `${from}${to}`.toLowerCase();
  const bestUci = (evalBefore.bestMoveUci || '').toLowerCase();
  const isBestMove = playedUci === bestUci.slice(0, 4);

  let classification: MoveClassification = 'good';
  let comment = '';

  // Book moves (first 4-6 plies standard opening without blunders)
  if (moveIndex < 6 && winLoss <= 1.5) {
    classification = 'book';
    comment = 'Kitap hamlesi / Açılış teorisi';
    return {
      classification,
      winChanceBefore: playerWinBefore,
      winChanceAfter: playerWinAfter,
      winChanceLoss: winLoss,
      comment,
    };
  }

  // Brilliant (!!) check:
  // Must be best move, involves a genuine material sacrifice, and position remains winning or advantageous (>45% win chance)
  if (isBestMove && winLoss <= 1.0 && playerWinAfter >= 45) {
    if (isMaterialSacrifice(fenBefore, fenAfter, color, from, to)) {
      classification = 'brilliant';
      comment = '!! Göz alıcı bir feda ve taktiksel üstünlük!';
      return {
        classification,
        winChanceBefore: playerWinBefore,
        winChanceAfter: playerWinAfter,
        winChanceLoss: winLoss,
        comment,
      };
    }
  }

  // Great move (!) check:
  // Sole game-turning or position-saving best move
  if (isBestMove && winLoss <= 1.0 && playerWinBefore < 48 && playerWinAfter >= 50) {
    classification = 'great';
    comment = '! Pozisyonu tersine çeviren harika bir hamle!';
    return {
      classification,
      winChanceBefore: playerWinBefore,
      winChanceAfter: playerWinAfter,
      winChanceLoss: winLoss,
      comment,
    };
  }

  // Standard Chess.com categorization:
  // ONLY the engine's best move gets 'best' (⭐)
  if (isBestMove) {
    classification = 'best';
    comment = 'Motorun önerdiği en iyi hamle.';
  } else if (winLoss <= 2.5) {
    classification = 'excellent';
    comment = 'Çok güçlü bir alternatif hamle.';
  } else if (winLoss <= 6.5) {
    classification = 'good';
    comment = 'Sağlam ve güvenli hamle.';
  } else if (winLoss <= 14.0) {
    classification = 'inaccuracy';
    comment = 'Küçük bir avantaj kaybı (Şüpheli).';
  } else if (winLoss <= 24.0) {
    classification = 'mistake';
    comment = 'Pozisyonel veya taktiksel hata.';
  } else {
    classification = 'blunder';
    comment = 'Büyük hata! Rakibe ciddi üstünlük verdi.';
  }

  return {
    classification,
    winChanceBefore: playerWinBefore,
    winChanceAfter: playerWinAfter,
    winChanceLoss: winLoss,
    comment,
  };
}

/**
 * Calculates CAPS2 Accuracy percentage (0-100) for a series of moves.
 * Chess.com CAPS2 model converts each move's win chance loss to an accuracy score.
 */
export function calculateAccuracy(moves: MoveAnalysis[]): GameAccuracy {
  const whiteMoves = moves.filter((m) => m.color === 'w');
  const blackMoves = moves.filter((m) => m.color === 'b');

  const getScore = (list: MoveAnalysis[]): number => {
    if (list.length === 0) return 100;

    let total = 0;
    for (const m of list) {
      if (m.classification === 'book') {
        total += 100;
        continue;
      }
      if (m.classification === 'brilliant' || m.classification === 'great' || m.classification === 'best') {
        total += 100;
        continue;
      }

      const loss = m.winChanceLoss ?? 0;
      // Chess.com CAPS2 formula: 103.1668 * exp(-0.04354 * loss) - 3.1668
      const moveScore = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * loss) - 3.1668));
      total += moveScore;
    }

    return Math.round((total / list.length) * 10) / 10;
  };

  return {
    white: getScore(whiteMoves),
    black: getScore(blackMoves),
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
 * Detects the biggest Turning Point of the game (the move that swung the balance of power).
 */
export function detectTurningPoint(moves: MoveAnalysis[]): import('../types/chess').TurningPoint | null {
  let worstMove: MoveAnalysis | null = null;
  let maxSwing = 0;

  for (const m of moves) {
    if (m.classification === 'blunder' || m.classification === 'mistake') {
      const swing = m.winChanceLoss ?? 0;
      // Also consider whether the position was competitive before this move
      const wasCompetitive = (m.winChanceBefore ?? 50) >= 35 && (m.winChanceBefore ?? 50) <= 85;
      const effectiveScore = swing + (wasCompetitive ? 15 : 0);

      if (effectiveScore > maxSwing) {
        maxSwing = effectiveScore;
        worstMove = m;
      }
    }
  }

  if (!worstMove || (worstMove.winChanceLoss ?? 0) < 18) {
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
    description: `${moveLabel} (${moverColor}) hamlesi maçın kader anı oldu ve oyunun dengesini tamamen ${opponentColor} lehine çevirdi.`,
  };
}

/**
 * Detects missed wins (positions where player had a winning advantage but squandered it).
 */
export function detectMissedWins(moves: MoveAnalysis[]): import('../types/chess').MissedWin[] {
  const missed: import('../types/chess').MissedWin[] = [];

  for (const m of moves) {
    const winBefore = m.winChanceBefore ?? 0;
    const loss = m.winChanceLoss ?? 0;

    // Had >= 70% win chance, but lost >= 20% win chance on this move
    if (winBefore >= 70 && loss >= 20 && (m.classification === 'blunder' || m.classification === 'mistake')) {
      const moveLabel = `${m.moveNumber}${m.color === 'w' ? '.' : '...'} ${m.san}`;
      missed.push({
        moveIndex: m.moveIndex,
        moveNumber: m.moveNumber,
        color: m.color,
        san: m.san,
        bestMoveSan: m.bestMoveSan,
        description: `${moveLabel} hamlesiyle net kazanç konumu elden kaçtı.${m.bestMoveSan ? ` En iyi devam yolu ${m.bestMoveSan} idi.` : ''}`,
      });
    }
  }

  return missed;
}

/**
 * Calculates phase performance and dynamic coaching advice.
 */
export function calculatePhaseAdvice(moves: MoveAnalysis[]): import('../types/chess').PhaseAdvice {
  const openingMoves = moves.filter((m) => m.moveIndex < 16);
  const middleMoves = moves.filter((m) => m.moveIndex >= 16 && m.moveIndex < 40);
  const endMoves = moves.filter((m) => m.moveIndex >= 40);

  const getPhaseScore = (list: MoveAnalysis[]): number => {
    if (list.length === 0) return 85;
    const errors = list.filter((m) => m.classification === 'blunder' || m.classification === 'mistake').length;
    const inaccuracies = list.filter((m) => m.classification === 'inaccuracy').length;
    const base = 100 - (errors * 18 + inaccuracies * 7) / list.length * 10;
    return Math.max(30, Math.min(100, Math.round(base)));
  };

  const opScore = getPhaseScore(openingMoves);
  const midScore = getPhaseScore(middleMoves);
  const endScore = getPhaseScore(endMoves);

  let weakest: 'opening' | 'middlegame' | 'endgame' = 'middlegame';
  const minScore = Math.min(opScore, midScore, endScore);
  if (minScore === opScore) weakest = 'opening';
  else if (minScore === endScore && endMoves.length > 0) weakest = 'endgame';

  return {
    opening: {
      score: opScore,
      comment: opScore > 85 ? 'Kusursuz açılış teorisi ve sağlam gelişim.' : 'Açılışta taş gelişimine ve merkez güvenliğine dikkat edilmeli.',
    },
    middlegame: {
      score: midScore,
      comment: midScore > 80 ? 'Etkili taktik görüş ve parça koordinasyonu.' : 'Taktik hesaplamalar ve taş uyutma riskleri üzerinde durulmalı.',
    },
    endgame: {
      score: endScore,
      comment: endScore > 80 ? 'Temiz oyun sonu tekniği ve piyon sürüşleri.' : 'Şah aktivitesi ve kritik piyon yapılarına odaklanılmalı.',
    },
    weakestPhase: weakest,
  };
}

/**
 * Generates an automated coach commentary summary based on game stats.
 */
export function generateCoachSummary(
  accuracy: GameAccuracy,
  counts: { white: ClassificationCount; black: ClassificationCount },
  result: string,
  turningPoint?: import('../types/chess').TurningPoint | null,
  phaseAdvice?: import('../types/chess').PhaseAdvice
): string {
  const winner = result === '1-0' ? 'Beyaz' : result === '0-1' ? 'Siyah' : 'Beraberlik';

  let summary = '';
  if (winner === 'Beyaz') {
    summary += `Beyaz %${accuracy.white} doğruluk ile üstün bir galibiyet elde etti. `;
  } else if (winner === 'Siyah') {
    summary += `Siyah %${accuracy.black} doğruluk ile galibiyete uzandı. `;
  } else {
    summary += `İki taraf da başa baş bir mücadele sergiledi (Beyaz: %${accuracy.white}, Siyah: %${accuracy.black}). `;
  }

  const whiteBlunders = counts.white.blunder;
  const blackBlunders = counts.black.blunder;
  const whiteMistakes = counts.white.mistake;
  const blackMistakes = counts.black.mistake;

  if (whiteBlunders === 0 && blackBlunders === 0) {
    if (whiteMistakes > 0 || blackMistakes > 0) {
      summary += 'Oyuncular büyük gaflardan kaçındı ancak pozisyonel hatalar oyunun sonucunu belirledi.';
    } else {
      summary += 'Her iki oyuncu da usta seviyesinde temiz ve dikkatli bir oyun oynadı.';
    }
  } else if (blackBlunders > whiteBlunders) {
    summary += `Siyah'ın yaptığı ${blackBlunders} büyük hata Beyaz'a maçı kazandıran fırsatları verdi.`;
  } else if (whiteBlunders > blackBlunders) {
    summary += `Beyaz'ın yaptığı ${whiteBlunders} büyük hata Siyah'a maçı çevirme imkanı sundu.`;
  } else {
    summary += `Her iki tarafın yaptığı hatalar maçın dengesini defalarca değiştirdi.`;
  }

  if (counts.white.brilliant > 0 || counts.black.brilliant > 0) {
    summary += ' 💥 Maçta tahtayı alevlendiren göz alıcı (!!) fedalar vardı!';
  }

  if (turningPoint) {
    summary += ` ⚡ Oyunun kırılma anı: ${turningPoint.san} hamlesi oldu.`;
  }

  if (phaseAdvice) {
    const phaseNames = { opening: 'Açılış', middlegame: 'Orta Oyun', endgame: 'Oyun Sonu' };
    summary += ` Geliştirilmesi gereken öncelikli alan: ${phaseNames[phaseAdvice.weakestPhase]}.`;
  }

  return summary;
}
