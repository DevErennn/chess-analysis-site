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
interface SacrificeDetail {
  isSacrifice: boolean;
  pieceName: string;
  pieceType: string;
  targetSquare: string;
  reason: string;
}

/**
 * Analyzes whether a move represents a genuine material sacrifice and generates a tactical explanation.
 */
function analyzeMaterialSacrifice(
  fenBefore: string,
  fenAfter: string,
  color: 'w' | 'b',
  from: string,
  to: string
): SacrificeDetail {
  const PIECE_NAMES: Record<string, string> = {
    p: 'piyon',
    n: 'at',
    b: 'fil',
    r: 'kale',
    q: 'vezir',
    k: 'şah',
  };
  const PIECE_NAMES_CAP: Record<string, string> = {
    p: 'Piyon',
    n: 'At',
    b: 'Fil',
    r: 'Kale',
    q: 'Vezir',
    k: 'Şah',
  };

  try {
    const chessBefore = new Chess(fenBefore);
    const piece = chessBefore.get(from as any);
    if (!piece || piece.type === 'k') {
      return { isSacrifice: false, pieceName: '', pieceType: '', targetSquare: to, reason: '' };
    }

    const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    const myPieceVal = pieceValues[piece.type] || 0;
    const pieceCap = PIECE_NAMES_CAP[piece.type] || 'Taş';

    const chessAfter = new Chess(fenAfter);
    const opponentMoves = chessAfter.moves({ verbose: true });
    const capturingMoves = opponentMoves.filter((m) => m.to === to);

    // 1. Captured by enemy pawn
    const pawnCap = capturingMoves.find((m) => m.piece === 'p');
    if (pawnCap && myPieceVal >= 3) {
      return {
        isSacrifice: true,
        pieceName: pieceCap,
        pieceType: piece.type,
        targetSquare: to,
        reason: `${pieceCap} fedası ile rakip şah kanadındaki savunma kalkanı sarsıldı ve belirleyici bir hücum başlatıldı!`,
      };
    }

    // 2. Captured by a lesser piece (e.g. Queen/Rook attacked by Bishop/Knight)
    const lesserCap = capturingMoves.find((m) => {
      const capturerVal = pieceValues[m.piece] || 1;
      return capturerVal < myPieceVal;
    });
    if (lesserCap) {
      const enemyPieceName = PIECE_NAMES[lesserCap.piece] || 'taş';
      return {
        isSacrifice: true,
        pieceName: pieceCap,
        pieceType: piece.type,
        targetSquare: to,
        reason: `${pieceCap} ${to} karesinde rakip ${enemyPieceName}ın önüne feda edilerek savunma taşları saptırıldı ve taktiksel üstünlük sağlandı!`,
      };
    }

    // 3. Hanging piece / more attackers than defenders
    const myDefenders = chessBefore.moves({ verbose: true }).filter((m) => m.to === to);
    if (capturingMoves.length > myDefenders.length && myPieceVal >= 3) {
      return {
        isSacrifice: true,
        pieceName: pieceCap,
        pieceType: piece.type,
        targetSquare: to,
        reason: `${pieceCap} korunmasız ${to} karesine cesurca yerleştirilerek rakibin şah mat ağı veya taş kaybı yaşaması sağlandı!`,
      };
    }

    // 4. Exchange sacrifice: Rook captures minor piece, or Queen captures minor/rook
    const captured = chessBefore.get(to as any);
    if (captured && piece.type === 'r' && (captured.type === 'n' || captured.type === 'b')) {
      return {
        isSacrifice: true,
        pieceName: 'Kalite',
        pieceType: 'r',
        targetSquare: to,
        reason: `Konumsal kalite fedası (${to} karesinde hafif taşa karşı kale verilerek) ile rakibin en aktif savunma taşı yok edildi ve ezici bir baskı kuruldu!`,
      };
    }

    if (captured && piece.type === 'q' && captured.type !== 'q') {
      return {
        isSacrifice: true,
        pieceName: 'Vezir',
        pieceType: 'q',
        targetSquare: to,
        reason: `Dâhiyane vezir fedası (${to} karesinde)! Rakip veziri alsa dahi arkasından gelen kaçınılmaz mat tehdidi oyunu bitiriyor!`,
      };
    }

    // 5. Leaving another major/minor piece hanging (Zwischenzug / Counter-sacrifice)
    const piecesBefore = chessBefore.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const otherPiece = piecesBefore[r][c];
        if (otherPiece && otherPiece.color === color && otherPiece.type !== 'p' && otherPiece.type !== 'k') {
          const square = `${String.fromCharCode(97 + c)}${8 - r}`;
          if (square !== from && square !== to) {
            const attackers = opponentMoves.filter((m) => m.to === square);
            if (attackers.length > 0 && pieceValues[otherPiece.type] >= 3) {
              const otherCap = PIECE_NAMES_CAP[otherPiece.type];
              return {
                isSacrifice: true,
                pieceName: otherCap,
                pieceType: otherPiece.type,
                targetSquare: square,
                reason: `Tehdit altındaki ${otherCap} geri çekilmek yerine ${to} karesine öldürücü bir karşı saldırı hamlesi yapılarak inisiyatif ele geçirildi!`,
              };
            }
          }
        }
      }
    }

    return { isSacrifice: false, pieceName: '', pieceType: '', targetSquare: to, reason: '' };
  } catch {
    return { isSacrifice: false, pieceName: '', pieceType: '', targetSquare: to, reason: '' };
  }
}

/**
 * Classifies a move using both Win Chance Loss and Centipawn Loss to accurately detect blunders and mistakes.
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

  // Centipawn loss from mover's perspective
  const moverCpBefore = color === 'w' ? (evalBefore.cp ?? 0) : -(evalBefore.cp ?? 0);
  const moverCpAfter = color === 'w' ? (evalAfter.cp ?? 0) : -(evalAfter.cp ?? 0);
  const cpLoss = Math.max(0, moverCpBefore - moverCpAfter);

  const playedUci = `${from}${to}`.toLowerCase();
  const bestUci = (evalBefore.bestMoveUci || '').toLowerCase();
  const isBestMove = playedUci === bestUci.slice(0, 4);

  let classification: MoveClassification = 'good';
  let comment = '';

  // 1. Book moves (first 8 plies standard opening without blunders)
  if (moveIndex < 8 && winLoss <= 1.5 && cpLoss <= 30) {
    classification = 'book';
    comment = 'Kitap hamlesi / Açılış teorisi devam yolu.';
    return {
      classification,
      winChanceBefore: playerWinBefore,
      winChanceAfter: playerWinAfter,
      winChanceLoss: winLoss,
      comment,
    };
  }

  // 2. Brilliant (!!) check:
  // Must be best move, involves a genuine sound material sacrifice, and position remains winning or advantageous
  if (isBestMove && winLoss <= 1.0 && playerWinAfter >= 40) {
    const sac = analyzeMaterialSacrifice(fenBefore, fenAfter, color, from, to);
    if (sac.isSacrifice) {
      classification = 'brilliant';
      comment = `‼️ Göz Alıcı Hamle: ${sac.reason}`;
      return {
        classification,
        winChanceBefore: playerWinBefore,
        winChanceAfter: playerWinAfter,
        winChanceLoss: winLoss,
        comment,
      };
    }
  }

  // 3. Great move (!) check:
  // Sole game-turning or position-saving best move
  if (isBestMove && winLoss <= 1.0 && playerWinBefore < 48 && playerWinAfter >= 50) {
    classification = 'great';
    comment = '! Pozisyonu tersine çeviren kritik ve tek kazandıran hamle!';
    return {
      classification,
      winChanceBefore: playerWinBefore,
      winChanceAfter: playerWinAfter,
      winChanceLoss: winLoss,
      comment,
    };
  }

  // 4. Best move (⭐)
  if (isBestMove) {
    classification = 'best';
    comment = 'Motorun pozisyondaki en güçlü önerisi.';
    return {
      classification,
      winChanceBefore: playerWinBefore,
      winChanceAfter: playerWinAfter,
      winChanceLoss: winLoss,
      comment,
    };
  }

  // 5. Standard move classification (incorporating BOTH winLoss AND cpLoss)
  // Even if winLoss is small in lopsided positions (+7 to +3), cpLoss > 280 represents a blunder!
  if (winLoss >= 20.0 || cpLoss >= 280) {
    classification = 'blunder';
    comment = 'Büyük hata (Gaf)! Rakibe ciddi bir üstünlük veya taktiksel fırsat verdi.';
  } else if (winLoss >= 10.0 || cpLoss >= 140) {
    classification = 'mistake';
    comment = 'Pozisyonel veya taktiksel hata, daha iyi bir devam yolu vardı.';
  } else if (winLoss >= 4.5 || cpLoss >= 65) {
    classification = 'inaccuracy';
    comment = 'Küçük bir avantaj kaybı (Şüpheli hamle).';
  } else if (winLoss >= 1.8 || cpLoss >= 25) {
    classification = 'good';
    comment = 'Sağlam ve güvenli bir devam hamlesi.';
  } else {
    classification = 'excellent';
    comment = 'Neredeyse en iyi hamle kadar güçlü bir alternatif.';
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
 * Calculates realistic CAPS2 Accuracy percentage (0-100) for White and Black.
 * Properly penalizes blunders and mistakes so club games reflect 60-80% rather than inflated 96%.
 */
export function calculateAccuracy(moves: MoveAnalysis[]): GameAccuracy {
  const whiteMoves = moves.filter((m) => m.color === 'w');
  const blackMoves = moves.filter((m) => m.color === 'b');

  const getScore = (list: MoveAnalysis[]): number => {
    if (list.length === 0) return 100;

    let total = 0;
    for (const m of list) {
      const cls = m.classification || 'good';
      const loss = m.winChanceLoss ?? 0;

      let moveScore = 100;
      switch (cls) {
        case 'brilliant':
        case 'great':
        case 'best':
        case 'book':
          moveScore = 100;
          break;
        case 'excellent':
          // 88 - 96%
          moveScore = Math.max(88, Math.min(96, 96 - loss * 4.0));
          break;
        case 'good':
          // 68 - 80%
          moveScore = Math.max(68, Math.min(80, 80 - loss * 3.0));
          break;
        case 'inaccuracy':
          // 40 - 58%
          moveScore = Math.max(40, Math.min(58, 58 - loss * 1.8));
          break;
        case 'mistake':
          // 15 - 32%
          moveScore = Math.max(15, Math.min(32, 32 - loss * 0.9));
          break;
        case 'blunder':
          // 0 - 8%
          moveScore = Math.max(0, Math.min(8, 8 - loss * 0.2));
          break;
        default:
          moveScore = 75;
      }

      total += moveScore;
    }

    const avg = total / list.length;
    return Math.round(avg * 10) / 10;
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
