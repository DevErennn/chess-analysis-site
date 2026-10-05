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
 * Checks if a move sacrificed material (piece value went down without immediate recapture).
 */
function isMaterialSacrifice(
  fenBefore: string,
  fenAfter: string,
  color: 'w' | 'b'
): boolean {
  const pieceValues: Record<string, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0,
  };

  const getMaterial = (fen: string, col: 'w' | 'b'): number => {
    const board = fen.split(' ')[0];
    let total = 0;
    for (const ch of board) {
      const isWhite = ch >= 'A' && ch <= 'Z';
      const pieceCol = isWhite ? 'w' : 'b';
      if (pieceCol === col) {
        total += pieceValues[ch.toLowerCase()] || 0;
      }
    }
    return total;
  };

  const matBefore = getMaterial(fenBefore, color);
  const matAfter = getMaterial(fenAfter, color);

  // If lost at least 2 points of material (e.g. piece or exchange)
  return matBefore - matAfter >= 2;
}

/**
 * Classifies a move according to Win Chance Loss and tactical context.
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

  // Book moves (first 4-6 plies standard opening)
  if (moveIndex < 6 && winLoss < 2.0) {
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
  // Must be best move or near best, involves material sacrifice, and position remains winning or solid (>45% win chance)
  if (isBestMove && winLoss < 1.0 && playerWinAfter >= 45) {
    if (isMaterialSacrifice(fenBefore, fenAfter, color)) {
      classification = 'brilliant';
      comment = 'Göz alıcı bir feda ve taktiksel üstünlük!';
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
  // Sole winning or drawing move in difficult situation
  if (isBestMove && winLoss < 1.0 && playerWinBefore < 50 && playerWinAfter >= 50) {
    classification = 'great';
    comment = 'Pozisyonu tersine çeviren harika bir hamle!';
    return {
      classification,
      winChanceBefore: playerWinBefore,
      winChanceAfter: playerWinAfter,
      winChanceLoss: winLoss,
      comment,
    };
  }

  // Standard thresholds
  if (isBestMove || winLoss < 1.2) {
    classification = 'best';
    comment = 'Motorun önerdiği en iyi hamle.';
  } else if (winLoss < 3.5) {
    classification = 'excellent';
    comment = 'Çok güçlü bir alternatif hamle.';
  } else if (winLoss < 7.5) {
    classification = 'good';
    comment = 'Sağlam ve güvenli hamle.';
  } else if (winLoss < 15.0) {
    classification = 'inaccuracy';
    comment = 'Küçük bir avantaj kaybı (Şüpheli).';
  } else if (winLoss < 26.0) {
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
      const loss = m.winChanceLoss ?? 0;
      // Formula: 103.1668 * exp(-0.04354 * loss) - 3.1668
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
 * Generates an automated coach commentary summary based on game stats.
 */
export function generateCoachSummary(
  accuracy: GameAccuracy,
  counts: { white: ClassificationCount; black: ClassificationCount },
  result: string
): string {
  const winner = result === '1-0' ? 'Beyaz' : result === '0-1' ? 'Siyah' : 'Beraberlik';

  let summary = '';
  if (winner === 'Beyaz') {
    summary += `Beyaz %${accuracy.white} doğruluk ile üstün bir oyun sergiledi. `;
  } else if (winner === 'Siyah') {
    summary += `Siyah %${accuracy.black} doğruluk ile rakibini etkisiz hale getirdi. `;
  } else {
    summary += `İki taraf da başa baş bir mücadele verdi (Beyaz: %${accuracy.white}, Siyah: %${accuracy.black}). `;
  }

  const whiteBlunders = counts.white.blunder;
  const blackBlunders = counts.black.blunder;

  if (whiteBlunders === 0 && blackBlunders === 0) {
    summary += 'Her iki oyuncu da büyük gaflardan kaçınarak temiz bir oyun oynadı.';
  } else if (whiteBlunders > blackBlunders) {
    summary += `Beyaz'ın yaptığı ${whiteBlunders} büyük hata oyunun kaderini belirledi.`;
  } else if (blackBlunders > whiteBlunders) {
    summary += `Siyah'ın yaptığı ${blackBlunders} büyük hata Beyaz'a kazanç fırsatları sundu.`;
  }

  if (counts.white.brilliant > 0 || counts.black.brilliant > 0) {
    summary += ' Maçta tahtayı alevlendiren göz alıcı (!!) fedalar vardı!';
  }

  return summary;
}
