/**
 * accuracy.js
 * 
 * Win Probability ve Asimptotik Doğruluk (Accuracy) Hesaplama Modülü
 * - Stockfish mutlak değerlendirmesini aktif oyuncunun perspektifine normalize eder.
 * - Sigmoid formülü ile Centipawn değerini Kazanma Olasılığına (%0-100) çevirir.
 * - Lichess/Chess.com standardı asimptotik formülle hamle doğruluğunu hesaplar.
 */

/**
 * Centipawn değerini [-4000, 4000] aralığında sınırlar.
 * @param {number} cp 
 * @returns {number}
 */
export function clampCp(cp) {
  return Math.max(-4000, Math.min(4000, cp));
}

/**
 * Oyuncu avantajı (CP) üzerinden Sigmoid Kazanma Olasılığı (%0-100) hesaplar.
 * Formül: 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clampedCp)) - 1)
 * 
 * @param {number} cp - Aktif oyuncu perspektifindeki centipawn değeri (+: oyuncu üstün, -: rakip üstün)
 * @returns {number} 0 - 100 arası kazanma olasılığı yüzdesi
 */
export function winProbability(cp) {
  if (typeof cp !== 'number' || isNaN(cp)) return 50.0;
  const clamped = clampCp(cp);
  const prob = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
  return Math.max(0, Math.min(100, prob));
}

/**
 * Stockfish'in mutlak beyaz merkezli CP veya Mate değerini hamleyi yapan oyuncunun
 * perspektifine (turn: 'w' | 'b') çevirir.
 * 
 * @param {number} stockfishCp - Beyaz lehine mutlak centipawn (+: Beyaz, -: Siyah)
 * @param {'w' | 'b' | 'white' | 'black'} turn - Hamleyi yapan aktif oyuncu
 * @param {number | null | undefined} mateIn - Zorunlu mat varsa hamle sayısı
 * @returns {number} Aktif oyuncu perspektifindeki normalize edilmiş CP
 */
export function normalizeScoreToPlayerPOV(stockfishCp, turn, mateIn = null) {
  const isWhite = turn === 'w' || turn === 'white';

  // Mat durumları: +4000 / -4000 kelepçesi
  if (mateIn !== null && mateIn !== undefined) {
    if (isWhite) {
      return mateIn > 0 ? 4000 : -4000;
    } else {
      return mateIn < 0 ? 4000 : -4000;
    }
  }

  const cp = stockfishCp ?? 0;
  return isWhite ? cp : -cp;
}

/**
 * Hamle öncesi ve sonrası CP ve aktif renk üzerinden doğruluk ve olasılık kaybını hesaplar.
 * 
 * @param {number} cpBefore - Hamle öncesi Stockfish mutlak CP
 * @param {number} cpAfter - Hamle sonrası Stockfish mutlak CP
 * @param {'w' | 'b' | 'white' | 'black'} turn - Hamleyi yapan aktif oyuncu
 * @param {boolean} isBestMove - Motorun 1. tercihi (en iyi hamle) mi?
 * @param {number | null} mateBefore - Hamle öncesi zorunlu mat
 * @param {number | null} mateAfter - Hamle sonrası zorunlu mat
 * @returns {{
 *   winProbBefore: number,
 *   winProbAfter: number,
 *   probLoss: number,
 *   cpLoss: number,
 *   accuracy: number
 * }}
 */
export function calculateMoveAccuracy(
  cpBefore,
  cpAfter,
  turn,
  isBestMove = false,
  mateBefore = null,
  mateAfter = null
) {
  // 1. Dinamik Perspektif Normalizasyonu
  const moverAdvantageBefore = normalizeScoreToPlayerPOV(cpBefore, turn, mateBefore);
  const moverAdvantageAfter = normalizeScoreToPlayerPOV(cpAfter, turn, mateAfter);

  // 2. Kazanma Olasılıkları (%0-100)
  const winProbBefore = winProbability(moverAdvantageBefore);
  const winProbAfter = winProbability(moverAdvantageAfter);

  // 3. Olasılık ve CP Kaybı (En iyi hamle ise kayıp daima 0'dır)
  let probLoss = 0;
  let cpLoss = 0;

  if (isBestMove) {
    probLoss = 0;
    cpLoss = 0;
  } else {
    probLoss = Math.max(0, winProbBefore - winProbAfter);
    cpLoss = Math.max(0, moverAdvantageBefore - moverAdvantageAfter);
  }

  // 4. Asimptotik Hamle Doğruluk Formülü
  // acc = 103.1668 * Math.exp(-0.04354 * probLoss) - 3.1669 (Kelepçele [0, 100])
  let accuracy = 100;
  if (probLoss > 0) {
    const rawAcc = 103.1668 * Math.exp(-0.04354 * probLoss) - 3.1669;
    accuracy = Math.max(0, Math.min(100, Math.round(rawAcc * 10) / 10));
  }

  return {
    winProbBefore: Math.round(winProbBefore * 10) / 10,
    winProbAfter: Math.round(winProbAfter * 10) / 10,
    probLoss: Math.round(probLoss * 10) / 10,
    cpLoss: Math.round(cpLoss),
    accuracy,
  };
}

/**
 * Oyuncu hamlelerinin doğruluk dizisinden toplam maç doğruluk yüzdesini hesaplar.
 * @param {number[]} accuracyList - Bireysel hamle doğruluk yüzdeleri (0-100)
 * @returns {number} Ortalama maç doğruluğu
 */
export function calculateGameAccuracy(accuracyList) {
  if (!accuracyList || accuracyList.length === 0) return 100;
  const sum = accuracyList.reduce((acc, curr) => acc + curr, 0);
  return Math.round((sum / accuracyList.length) * 10) / 10;
}
