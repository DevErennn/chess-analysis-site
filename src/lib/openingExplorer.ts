import type { GameMetadata } from '../types/chess';

export interface OpeningInfo {
  eco: string;
  name: string;
  turkishName: string;
  moves?: string[];
}

/**
 * Common opening database mapped by move sequence (SAN strings)
 */
interface OpeningDefinition {
  eco: string;
  name: string;
  turkishName: string;
  moves: string[]; // Sequential SAN moves
}

const POPULAR_OPENINGS: OpeningDefinition[] = [
  // Sicilian Lines
  {
    eco: 'B90',
    name: 'Sicilian Defense: Najdorf Variation',
    turkishName: 'Sicilya Savunması: Najdorf Varyantı',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
  },
  {
    eco: 'B70',
    name: 'Sicilian Defense: Dragon Variation',
    turkishName: 'Sicilya Savunması: Ejder Varyantı',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'],
  },
  {
    eco: 'B33',
    name: 'Sicilian Defense: Sveshnikov Variation',
    turkishName: 'Sicilya Savunması: Sveşnikov Varyantı',
    moves: ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5'],
  },
  {
    eco: 'B22',
    name: 'Sicilian Defense: Alapin Variation',
    turkishName: 'Sicilya Savunması: Alapin Varyantı',
    moves: ['e4', 'c5', 'c3'],
  },
  {
    eco: 'B23',
    name: 'Sicilian Defense: Closed',
    turkishName: 'Kapalı Sicilya Savunması',
    moves: ['e4', 'c5', 'Nc3'],
  },
  {
    eco: 'B30',
    name: 'Sicilian Defense: Rossolimo Variation',
    turkishName: 'Sicilya Savunması: Rossolimo Varyantı',
    moves: ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5'],
  },
  {
    eco: 'B27',
    name: 'Sicilian Defense: Open',
    turkishName: 'Açık Sicilya Savunması',
    moves: ['e4', 'c5', 'Nf3'],
  },
  {
    eco: 'B20',
    name: 'Sicilian Defense',
    turkishName: 'Sicilya Savunması',
    moves: ['e4', 'c5'],
  },

  // Italian Game & Giuoco Piano
  {
    eco: 'C54',
    name: 'Italian Game: Giuoco Piano (Main Line)',
    turkishName: 'İtalyan Açılışı: Giuoco Piano',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6'],
  },
  {
    eco: 'C51',
    name: 'Italian Game: Evans Gambit',
    turkishName: 'İtalyan Açılışı: Evans Gambiti',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4'],
  },
  {
    eco: 'C53',
    name: 'Italian Game: Giuoco Piano',
    turkishName: 'İtalyan Açılışı: Giuoco Piano',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'],
  },
  {
    eco: 'C55',
    name: 'Italian Game: Two Knights Defense',
    turkishName: 'İki At Savunması',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'],
  },
  {
    eco: 'C50',
    name: 'Italian Game',
    turkishName: 'İtalyan Açılışı',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
  },

  // Ruy Lopez (Spanish Opening)
  {
    eco: 'C88',
    name: 'Ruy Lopez: Closed',
    turkishName: 'İspanyol Açılışı: Kapalı Ruy Lopez',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6'],
  },
  {
    eco: 'C65',
    name: 'Ruy Lopez: Berlin Defense',
    turkishName: 'İspanyol Açılışı: Berlin Savunması',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'],
  },
  {
    eco: 'C68',
    name: 'Ruy Lopez: Exchange Variation',
    turkishName: 'İspanyol Açılışı: Değişim Varyantı',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6'],
  },
  {
    eco: 'C60',
    name: 'Ruy Lopez',
    turkishName: 'İspanyol Açılışı (Ruy Lopez)',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
  },

  // Scotch Game
  {
    eco: 'C45',
    name: 'Scotch Game',
    turkishName: 'İskoç Açılışı',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'],
  },

  // French Defense
  {
    eco: 'C02',
    name: 'French Defense: Advance Variation',
    turkishName: 'Fransız Savunması: İlerleme Varyantı',
    moves: ['e4', 'e6', 'd4', 'd5', 'e5'],
  },
  {
    eco: 'C10',
    name: 'French Defense: Rubinstein Variation',
    turkishName: 'Fransız Savunması: Rubinstein Varyantı',
    moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'dxe4'],
  },
  {
    eco: 'C00',
    name: 'French Defense',
    turkishName: 'Fransız Savunması',
    moves: ['e4', 'e6'],
  },

  // Caro-Kann Defense
  {
    eco: 'B12',
    name: 'Caro-Kann Defense: Advance Variation',
    turkishName: 'Caro-Kann Savunması: İlerleme Varyantı',
    moves: ['e4', 'c6', 'd4', 'd5', 'e5'],
  },
  {
    eco: 'B15',
    name: 'Caro-Kann Defense: Main Line',
    turkishName: 'Caro-Kann Savunması',
    moves: ['e4', 'c6', 'd4', 'd5', 'Nc3'],
  },
  {
    eco: 'B10',
    name: 'Caro-Kann Defense',
    turkishName: 'Caro-Kann Savunması',
    moves: ['e4', 'c6'],
  },

  // Scandinavian Defense
  {
    eco: 'B01',
    name: 'Scandinavian Defense',
    turkishName: 'İskandinav Savunması',
    moves: ['e4', 'd5'],
  },

  // Pirc Defense
  {
    eco: 'B07',
    name: 'Pirc Defense',
    turkishName: 'Pirc Savunması',
    moves: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6'],
  },
  {
    eco: 'B07',
    name: 'Pirc Defense',
    turkishName: 'Pirc Savunması',
    moves: ['e4', 'd6'],
  },

  // Alekhine's Defense
  {
    eco: 'B02',
    name: "Alekhine's Defense",
    turkishName: 'Alekhine Savunması',
    moves: ['e4', 'Nf6'],
  },

  // Vienna Game & King's Gambit
  {
    eco: 'C25',
    name: 'Vienna Game',
    turkishName: 'Viyana Oyunu',
    moves: ['e4', 'e5', 'Nc3'],
  },
  {
    eco: 'C30',
    name: "King's Gambit",
    turkishName: 'Şah Gambiti',
    moves: ['e4', 'e5', 'f4'],
  },

  // Russian / Petrov Defense
  {
    eco: 'C42',
    name: "Petrov's Defense",
    turkishName: 'Petrov Savunması (Rus Oyunu)',
    moves: ['e4', 'e5', 'Nf3', 'Nf6'],
  },

  // Queen's Gambit & 1.d4
  {
    eco: 'D35',
    name: "Queen's Gambit Declined: Exchange",
    turkishName: 'Kabul Edilmemiş Vezir Gambiti: Değişim',
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5'],
  },
  {
    eco: 'D30',
    name: "Queen's Gambit Declined",
    turkishName: 'Kabul Edilmemiş Vezir Gambiti',
    moves: ['d4', 'd5', 'c4', 'e6'],
  },
  {
    eco: 'D20',
    name: "Queen's Gambit Accepted",
    turkishName: 'Kabul Edilmiş Vezir Gambiti',
    moves: ['d4', 'd5', 'c4', 'dxc4'],
  },
  {
    eco: 'D10',
    name: 'Slav Defense',
    turkishName: 'Slav Savunması',
    moves: ['d4', 'd5', 'c4', 'c6'],
  },
  {
    eco: 'D06',
    name: "Queen's Gambit",
    turkishName: 'Vezir Gambiti',
    moves: ['d4', 'd5', 'c4'],
  },
  {
    eco: 'D02',
    name: "Queen's Pawn Game: London System",
    turkishName: 'Vezir Piyonu: Londra Sistemi',
    moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4'],
  },
  {
    eco: 'D00',
    name: "Queen's Pawn Game",
    turkishName: 'Vezir Piyonu Açılışı',
    moves: ['d4', 'd5'],
  },

  // Indian Defenses
  {
    eco: 'E60',
    name: "King's Indian Defense",
    turkishName: 'Şah-Hint Savunması',
    moves: ['d4', 'Nf6', 'c4', 'g6'],
  },
  {
    eco: 'D80',
    name: 'Grünfeld Defense',
    turkishName: 'Grünfeld Savunması',
    moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'],
  },
  {
    eco: 'E20',
    name: 'Nimzo-Indian Defense',
    turkishName: 'Nimzo-Hint Savunması',
    moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'],
  },
  {
    eco: 'E12',
    name: "Queen's Indian Defense",
    turkishName: 'Vezir-Hint Savunması',
    moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'],
  },
  {
    eco: 'A56',
    name: 'Benoni Defense',
    turkishName: 'Benoni Savunması',
    moves: ['d4', 'Nf6', 'c4', 'c5'],
  },

  // Flank Openings
  {
    eco: 'A10',
    name: 'English Opening',
    turkishName: 'İngiliz Açılışı',
    moves: ['c4'],
  },
  {
    eco: 'A04',
    name: 'Réti Opening',
    turkishName: 'Réti Açılışı',
    moves: ['Nf3'],
  },
  {
    eco: 'A02',
    name: "Bird's Opening",
    turkishName: 'Bird Açılışı',
    moves: ['f4'],
  },
  {
    eco: 'A00',
    name: 'Uncommon Opening',
    turkishName: 'Nadir Açılış',
    moves: [],
  },
];

/**
 * ECO Code descriptions dictionary for direct ECO lookups
 */
const ECO_DICTIONARY: Record<string, { name: string; turkishName: string }> = {
  B07: { name: 'Pirc Defense', turkishName: 'Pirc Savunması' },
  B90: { name: 'Sicilian Defense: Najdorf Variation', turkishName: 'Sicilya Savunması: Najdorf Varyantı' },
  B70: { name: 'Sicilian Defense: Dragon Variation', turkishName: 'Sicilya Savunması: Ejder Varyantı' },
  B20: { name: 'Sicilian Defense', turkishName: 'Sicilya Savunması' },
  C50: { name: 'Italian Game', turkishName: 'İtalyan Açılışı' },
  C53: { name: 'Italian Game: Giuoco Piano', turkishName: 'İtalyan Açılışı: Giuoco Piano' },
  C60: { name: 'Ruy Lopez', turkishName: 'İspanyol Açılışı (Ruy Lopez)' },
  C00: { name: 'French Defense', turkishName: 'Fransız Savunması' },
  B10: { name: 'Caro-Kann Defense', turkishName: 'Caro-Kann Savunması' },
  B01: { name: 'Scandinavian Defense', turkishName: 'İskandinav Savunması' },
  D00: { name: "Queen's Pawn Game", turkishName: 'Vezir Piyonu Açılışı' },
  D06: { name: "Queen's Gambit", turkishName: 'Vezir Gambiti' },
  D30: { name: "Queen's Gambit Declined", turkishName: 'Kabul Edilmemiş Vezir Gambiti' },
  D20: { name: "Queen's Gambit Accepted", turkishName: 'Kabul Edilmiş Vezir Gambiti' },
  D10: { name: 'Slav Defense', turkishName: 'Slav Savunması' },
  E60: { name: "King's Indian Defense", turkishName: 'Şah-Hint Savunması' },
  E20: { name: 'Nimzo-Indian Defense', turkishName: 'Nimzo-Hint Savunması' },
  A10: { name: 'English Opening', turkishName: 'İngiliz Açılışı' },
  A04: { name: 'Réti Opening', turkishName: 'Réti Açılışı' },
};

/**
 * Identifies the chess opening based on move sequence and optional PGN metadata.
 * Matches the longest matching sequence of moves.
 */
export function detectOpening(
  moves: string[],
  metadata?: GameMetadata | null
): OpeningInfo | null {
  // 1. Try to find longest matching prefix in POPULAR_OPENINGS
  let bestMatch: OpeningDefinition | null = null;
  let maxMatchedLength = 0;

  if (moves && moves.length > 0) {
    for (const def of POPULAR_OPENINGS) {
      if (def.moves.length === 0) continue;
      if (def.moves.length <= moves.length) {
        let matches = true;
        for (let i = 0; i < def.moves.length; i++) {
          if (moves[i] !== def.moves[i]) {
            matches = false;
            break;
          }
        }
        if (matches && def.moves.length > maxMatchedLength) {
          maxMatchedLength = def.moves.length;
          bestMatch = def;
        }
      }
    }
  }

  if (bestMatch) {
    return {
      eco: bestMatch.eco,
      name: bestMatch.name,
      turkishName: bestMatch.turkishName,
      moves: bestMatch.moves,
    };
  }

  // 2. Fall back to metadata headers if available
  if (metadata?.eco) {
    const known = ECO_DICTIONARY[metadata.eco];
    const name = metadata.opening || known?.name || `ECO ${metadata.eco}`;
    const turkishName = known?.turkishName || name;

    return {
      eco: metadata.eco,
      name,
      turkishName,
    };
  }

  if (metadata?.opening) {
    return {
      eco: 'ECO',
      name: metadata.opening,
      turkishName: metadata.opening,
    };
  }

  return null;
}

/**
 * Checks whether the move at moveIndex is part of standard opening theory (Book move).
 */
export function isBookMove(playedSans: string[], moveIndex: number): boolean {
  if (moveIndex < 0 || moveIndex >= playedSans.length) return false;

  // 1. Check against POPULAR_OPENINGS database
  for (const def of POPULAR_OPENINGS) {
    if (def.moves.length > moveIndex) {
      let matches = true;
      for (let i = 0; i <= moveIndex; i++) {
        if (def.moves[i] !== playedSans[i]) {
          matches = false;
          break;
        }
      }
      if (matches) return true;
    }
  }

  // 2. Standard first plies theory fallback
  if (moveIndex === 0) {
    return ['e4', 'd4', 'c4', 'Nf3', 'g3', 'f4', 'b3', 'Nc3'].includes(playedSans[0]);
  }
  if (moveIndex === 1) {
    const w = playedSans[0];
    const b = playedSans[1];
    if (w === 'e4' && ['c5', 'e5', 'e6', 'c6', 'd6', 'd5', 'Nf6', 'g6', 'b6'].includes(b)) return true;
    if (w === 'd4' && ['d5', 'Nf6', 'e6', 'g6', 'c5', 'd6', 'f5'].includes(b)) return true;
    if (w === 'c4' && ['e5', 'c5', 'Nf6', 'e6', 'c6'].includes(b)) return true;
    if (w === 'Nf3' && ['d5', 'Nf6', 'c5', 'g6'].includes(b)) return true;
  }

  return false;
}

