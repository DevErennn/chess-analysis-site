/**
 * analyzeGame.js
 * 
 * Stockfish ve chess.js Tabanlı Ana Satranç Analiz Motoru Döngüsü
 * - openings.json ile Açılış Teorisi / Kitap Hamlesi (Book Move) kontrolü.
 * - Dinamik Beyaz/Siyah Perspektif eşitlemesi.
 * - accuracy.js üzerinden Kazanma Olasılığı ve Asimptotik Doğruluk hesabı.
 * - Materyal Sayımı ve Taktik Feda Tespiti ile "Brilliant (!!)" rozeti algılama.
 */

import { Chess } from 'chess.js';
import openings from '../data/openings.json';
import { calculateMoveAccuracy, calculateGameAccuracy } from './accuracy.js';

/**
 * Satranç taşlarının materyal puan tablosu:
 * P=1, N=3, B=3, R=5, Q=9, K=0
 */
const PIECE_VALUES = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

/**
 * Belirli bir renkteki taşların tahtadaki toplam materyal değerini sayar.
 * @param {Chess} chess - chess.js nesnesi
 * @param {'w' | 'b'} color - 'w' (Beyaz) veya 'b' (Siyah)
 * @returns {number} Toplam piyon birimi cinsinden materyal
 */
export function countMaterial(chess, color) {
  let total = 0;
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        total += PIECE_VALUES[piece.type] || 0;
      }
    }
  }
  return total;
}

const PIECE_NAMES_TR = {
  p: 'Piyon',
  n: 'At',
  b: 'Fil',
  r: 'Kale',
  q: 'Vezir',
};

/**
 * hasHangingPiece
 * 
 * Pasif ve Aktif Feda Tespiti (Hanging Piece Check):
 * Hamle tahtada oynandıktan sonra rakibin tüm yasal hamlelerini tarayarak,
 * oyuncunun değerli bir taşını (Vezir, Kale, Fil/At) kasten boşta (hanging) bırakıp bırakmadığını
 * veya daha düşük değerli bir taşa feda edip etmediğini kontrol eder.
 * 
 * Örnek: Donald Byrne vs Bobby Fischer (17... Be6!!):
 * Fil e6'ya oynandığında b6'daki Vezir boşta bırakılmıştır (Pasif Feda).
 * 
 * @param {string} fenBefore - Hamle öncesi FEN
 * @param {string} from - Oynanan taşın başlangıç karesi
 * @param {string} to - Oynanan taşın varış karesi
 * @returns {{
 *   hasHanging: boolean,
 *   hangingPieceType?: string,
 *   hangingPieceName?: string,
 *   hangingSquare?: string,
 *   materialDeficit?: number,
 *   isPassive?: boolean
 * }}
 */
export function hasHangingPiece(fenBefore, from, to) {
  try {
    const chess = new Chess(fenBefore);
    const movingPiece = chess.get(from);
    if (!movingPiece) return { hasHanging: false };

    // 1. Hamleyi tahtada oynat
    const moveRes = chess.move({ from, to, promotion: 'q' });
    if (!moveRes) return { hasHanging: false };

    // 2. Rakibin yasal hamlelerini çıkar
    const opponentMoves = chess.moves({ verbose: true });

    let bestHanging = { hasHanging: false };
    let maxDeficit = 0;

    for (const oppMove of opponentMoves) {
      if (!oppMove.captured) continue;

      const capturedType = oppMove.captured;
      const capturedVal = PIECE_VALUES[capturedType] || 0;
      const attackerVal = PIECE_VALUES[oppMove.piece] || 0;

      // Sadece değerli taşlar (At, Fil, Kale, Vezir)
      if (capturedVal < 3) continue;

      // Rakibin bu taşı almasını simüle et
      const sim = new Chess(chess.fen());
      sim.move(oppMove);

      // Bizim bu kareyi geri alma (recapture) imkanımız var mı?
      const ourResponses = sim.moves({ verbose: true });
      const canRecapture = ourResponses.some(
        (r) => r.to === oppMove.to && r.captured
      );

      let netDeficit = 0;

      if (!canRecapture) {
        // Taş tamamen bedavaya (hanging / undefended) bırakılmış
        netDeficit = capturedVal;
      } else {
        // Geri alınabiliyor ama rakip daha düşük değerli bir taşla aldı (örn: Fil Veziri aldı -> 9 - 3 = 6)
        if (capturedVal > attackerVal) {
          netDeficit = capturedVal - attackerVal;
        }
      }

      // En az 2 piyon değerinde kayıp varsa (feda eşiği)
      if (netDeficit >= 2 && netDeficit > maxDeficit) {
        maxDeficit = netDeficit;
        const isPassive = oppMove.to !== to;
        bestHanging = {
          hasHanging: true,
          hangingPieceType: capturedType,
          hangingPieceName: PIECE_NAMES_TR[capturedType] || 'Taş',
          hangingSquare: oppMove.to,
          materialDeficit: netDeficit,
          isPassive,
        };
      }
    }

    return bestHanging;
  } catch {
    return { hasHanging: false };
  }
}

/**
 * Bir hamlenin klasik PV hattı üzerinden materyal fedası olup olmadığını test eder.
 */
export function detectMaterialSacrifice(fenBefore, from, to, color, pvString = '') {
  try {
    const sim = new Chess(fenBefore);
    const pieceBeforeMove = sim.get(from);
    if (!pieceBeforeMove) return { isSacrifice: false, materialLost: 0 };

    const opponentColor = color === 'w' ? 'b' : 'w';
    const moverMaterialBefore = countMaterial(sim, color);
    const opponentMaterialBefore = countMaterial(sim, opponentColor);

    const move = sim.move({ from, to, promotion: 'q' });
    if (!move) return { isSacrifice: false, materialLost: 0 };

    const pvMoves = pvString ? pvString.trim().split(/\s+/) : [];
    if (pvMoves.length > 1) {
      try {
        const nextMoveUci = pvMoves[1];
        if (nextMoveUci && nextMoveUci.length >= 4) {
          sim.move({
            from: nextMoveUci.slice(0, 2),
            to: nextMoveUci.slice(2, 4),
            promotion: nextMoveUci[4] || 'q',
          });
        }
      } catch {
        // PV simülasyonu başarısız olursa tahtadaki net farkı kullan
      }
    }

    const moverMaterialAfter = countMaterial(sim, color);
    const opponentMaterialAfter = countMaterial(sim, opponentColor);

    const balanceBefore = moverMaterialBefore - opponentMaterialBefore;
    const balanceAfter = moverMaterialAfter - opponentMaterialAfter;
    const netMaterialLoss = balanceBefore - balanceAfter;

    const isSacrifice = netMaterialLoss >= 2;

    return {
      isSacrifice,
      materialLost: netMaterialLoss,
    };
  } catch {
    return { isSacrifice: false, materialLost: 0 };
  }
}

/**
 * Oynanan hamlenin openings.json veritabanında bilinen bir açılış/kitap hamlesi olup olmadığını denetler.
 * @param {string[]} playedSansList - Baştan bu hamleye kadar oynanan SAN listesi (örn: ["e4", "c5", "Nf3"])
 * @param {string} fenAfter - Hamle sonrası oluşan FEN pozisyonu
 * @returns {{ isBook: boolean, openingName?: string, eco?: string }}
 */
export function checkBookMove(playedSansList, fenAfter) {
  if (!playedSansList || playedSansList.length === 0) return { isBook: false };

  // FEN pozisyon normalizasyonu (en-passant ve hamle sayısını hariç tutarak ilk 3 alanı karşılaştır)
  const normFen = (fen) => fen.split(' ').slice(0, 3).join(' ');
  const targetFen = normFen(fenAfter);

  for (const op of openings) {
    // 1. FEN eşleşmesi
    if (op.fen && normFen(op.fen) === targetFen) {
      return { isBook: true, openingName: op.name, eco: op.eco };
    }

    // 2. Hamle dizisi ön-ek eşleşmesi
    if (op.moves && op.moves.length >= playedSansList.length) {
      let match = true;
      for (let i = 0; i < playedSansList.length; i++) {
        if (op.moves[i] !== playedSansList[i]) {
          match = false;
          break;
        }
      }
      if (match) {
        return { isBook: true, openingName: op.name, eco: op.eco };
      }
    }
  }

  return { isBook: false };
}

/**
 * analyzeGame
 * 
 * Tüm oyunu hamle hamle analiz eden, dinamik perspektif normalizasyonunu uygulayan,
 * openings.json ve accuracy.js ile entegre ana analiz fonksiyonu.
 * 
 * @param {string} pgn - Oyunun PGN metni
 * @param {Function} engineEvaluator - Pozisyon FEN'ini alıp Stockfish değerlendirmesi dönen asenkron fonksiyon
 *                                     fn(fen: string) => Promise<{ cp?: number, mate?: number, bestMoveUci: string, pv?: string }>
 * @returns {Promise<{
 *   moves: Array<object>,
 *   accuracy: { white: number, black: number },
 *   counts: { white: object, black: object }
 * }>}
 */
export async function analyzeGame(pgn, engineEvaluator) {
  const chess = new Chess();
  chess.loadPgn(pgn);
  const history = chess.history({ verbose: true });

  const replay = new Chess();
  const analyzedMoves = [];
  const whiteAccuracies = [];
  const blackAccuracies = [];

  const emptyCounts = () => ({
    brilliant: 0,
    great: 0,
    best: 0,
    excellent: 0,
    good: 0,
    book: 0,
    inaccuracy: 0,
    mistake: 0,
    miss: 0,
    blunder: 0,
  });

  const counts = {
    white: emptyCounts(),
    black: emptyCounts(),
  };

  const cumulativeSans = [];

  for (let i = 0; i < history.length; i++) {
    const move = history[i];
    const fenBefore = replay.fen();
    const color = move.color; // 'w' veya 'b'

    // Hamleyi replay tahtasında uygula
    replay.move(move);
    const fenAfter = replay.fen();
    cumulativeSans.push(move.san);

    // 1. AÇILIŞ KİTABI (Book Move) Kontrolü
    const bookCheck = checkBookMove(cumulativeSans, fenAfter);

    if (bookCheck.isBook) {
      // Kitap hamlelerinde motor değerlendirmesini atla, %100 doğruluk ver
      const bookAnalysis = {
        moveNumber: Math.floor(i / 2) + 1,
        moveIndex: i,
        color,
        san: move.san,
        from: move.from,
        to: move.to,
        fenBefore,
        fenAfter,
        classification: 'book',
        accuracy: 100,
        cpLoss: 0,
        probLoss: 0,
        isBook: true,
        comment: `Kitap Hamlesi: ${bookCheck.openingName || 'Açılış teorisi'}.`,
      };

      analyzedMoves.push(bookAnalysis);
      if (color === 'w') {
        whiteAccuracies.push(100);
        counts.white.book++;
      } else {
        blackAccuracies.push(100);
        counts.black.book++;
      }
      continue;
    }

    // 2. STOCKFISH DEĞERLENDİRMELERİ
    // Hamle öncesi motor analizi (en iyi hamle ve pozisyon avantajı)
    const evalBefore = await engineEvaluator(fenBefore);
    // Hamle sonrası motor analizi
    const evalAfter = await engineEvaluator(fenAfter);

    // En İyi Hamle (Best Move) Tespiti
    const playedUci = `${move.from}${move.to}`.toLowerCase();
    const engineBestUci = (evalBefore.bestMoveUci || '').toLowerCase().slice(0, 4);
    const isBestMove = engineBestUci.length >= 4 && playedUci === engineBestUci;

    // 3. PERSPEKTİF NORMALİZASYONU VE ACCURACY HESABI (accuracy.js Modülü)
    const accResult = calculateMoveAccuracy(
      evalBefore.cp ?? 0,
      evalAfter.cp ?? 0,
      color,
      isBestMove,
      evalBefore.mate ?? null,
      evalAfter.mate ?? null
    );

    // 4. HAMLE SINIFLANDIRMASI (Classification & Brilliant Detection)
    let classification = 'good';
    let comment = '';

    // FEDA ALGILAMA (Sacrifice Detection): Pasif ve Aktif Brilliant (!!) Tespiti
    // Şart 1: Materyal kaybı (Aktif feda veya tahtada boşta bırakılan pasif feda)
    // Şart 2: Puanın korunması (probLoss <= 2.0% veya en iyi hamle, oyun kaybedilmiyor)
    const sacResult = detectMaterialSacrifice(fenBefore, move.from, move.to, color, evalBefore.pv);
    const hangingResult = hasHangingPiece(fenBefore, move.from, move.to);

    const isGoodSacrifice =
      (sacResult.isSacrifice || hangingResult.hasHanging) &&
      (isBestMove || accResult.probLoss <= 2.0) &&
      accResult.winProbAfter >= 50.0 &&
      accResult.winProbBefore < 90.0;

    if (isGoodSacrifice) {
      classification = 'brilliant';
      const pieceName = hangingResult.hangingPieceName || 'Taş';
      const typeLabel = hangingResult.isPassive ? 'Pasif Feda' : 'Feda';
      comment = `‼️ Göz Alıcı ${typeLabel} (Brilliant)! ${pieceName} fedası ile sağlanan taktiksel üstünlük.`;
    } else if (isBestMove) {
      // Great Move (!) Tespiti: Pozisyonu çeviren veya kritik taktik/vezir çıkma/şah çekiş hamlesi
      const turnedPosition =
        accResult.winProbBefore <= 50.0 &&
        accResult.winProbAfter >= 50.0 &&
        accResult.winProbAfter - accResult.winProbBefore >= 8.0;
      const isCriticalTactic =
        (move.san.includes('=') || move.san.includes('+')) &&
        accResult.winProbAfter >= 55.0;

      if (turnedPosition || isCriticalTactic) {
        classification = 'great';
        comment = turnedPosition
          ? '! Pozisyonu tersine çeviren harika ve kritik hamle (Harika)!'
          : '! Kritik taktik hamle ile üstünlüğü perçinleyen hamle (Harika)!';
      } else {
        classification = 'best';
        comment = 'Motorun önerdiği en güçlü hamle (En İyi).';
      }
    } else if (accResult.probLoss <= 2.0) {
      classification = 'excellent';
      comment = 'En iyi hamleye çok yakın güçlü bir devam yolu (Mükemmel).';
    } else if (accResult.probLoss <= 5.0) {
      classification = 'good';
      comment = 'Sağlam ve pozisyonel devam hamlesi (İyi).';
    } else if (accResult.probLoss <= 10.0) {
      classification = 'inaccuracy';
      comment = 'Küçük bir avantaj kaybı (Şüpheli hamle).';
    } else if (accResult.probLoss <= 20.0) {
      // Önemli bir kazanç fırsatı varken kaçırıldıysa "Kaçırma" (Miss)
      if (accResult.winProbBefore >= 75.0 && accResult.winProbAfter <= 65.0) {
        classification = 'miss';
        comment = 'Büyük bir kazanç veya taktik fırsat kaçırıldı (Kaçırma).';
      } else {
        classification = 'mistake';
        comment = 'Pozisyonel veya taktiksel hata, daha iyi bir alternatif vardı.';
      }
    } else {
      // probLoss > 20.0% -> Blunder (Büyük Hata)
      // Guardrail: Pozisyon hamle sonrasında hala belirgin üstünse (winProbAfter >= 65%), Blunder olarak etiketleme
      if (accResult.winProbAfter >= 65.0) {
        classification = 'mistake';
        comment = 'Hata: Daha hızlı kazandıran bir yol vardı, ancak pozisyon hala belirgin üstün.';
      } else {
        classification = 'blunder';
        comment = 'Büyük hata! Rakibe belirgin bir üstünlük verildi.';
      }
    }

    // 5. İSTATİSTİKLERE EKLE
    const moveAnalysis = {
      moveNumber: Math.floor(i / 2) + 1,
      moveIndex: i,
      color,
      san: move.san,
      from: move.from,
      to: move.to,
      fenBefore,
      fenAfter,
      evalBefore: evalBefore.cp,
      evalAfter: evalAfter.cp,
      classification,
      accuracy: accResult.accuracy,
      cpLoss: accResult.cpLoss,
      probLoss: accResult.probLoss,
      winProbBefore: accResult.winProbBefore,
      winProbAfter: accResult.winProbAfter,
      bestMoveUci: evalBefore.bestMoveUci,
      comment,
    };

    analyzedMoves.push(moveAnalysis);

    if (color === 'w') {
      whiteAccuracies.push(accResult.accuracy);
      counts.white[classification] = (counts.white[classification] || 0) + 1;
    } else {
      blackAccuracies.push(accResult.accuracy);
      counts.black[classification] = (counts.black[classification] || 0) + 1;
    }
  }

  // Maç Doğruluk Ortalamaları
  const gameAccuracy = {
    white: calculateGameAccuracy(whiteAccuracies),
    black: calculateGameAccuracy(blackAccuracies),
  };

  return {
    moves: analyzedMoves,
    accuracy: gameAccuracy,
    counts,
  };
}
