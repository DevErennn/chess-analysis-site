import { Chess } from 'chess.js';
import type { GameMetadata } from '../types/chess';

/**
 * Garry Kasparov vs Veselin Topalov, Wijk aan Zee (1999) - "Kasparov's Immortal"
 * One of the most famous games in chess history featuring 24.Rxd4!! and 25.Re7+!!
 */
export const SAMPLE_PGN = `[Event "Hoogovens Group A"]
[Site "Wijk aan Zee NED"]
[Date "1999.01.20"]
[Round "4"]
[White "Garry Kasparov"]
[Black "Veselin Topalov"]
[Result "1-0"]
[WhiteElo "2812"]
[BlackElo "2700"]
[ECO "B07"]
[Opening "Pirc Defense: 1.e4 d6"]

1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6
Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4
15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1
d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+
Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+
Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8
Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0`;

/**
 * Validates a PGN string using chess.js.
 * Returns true if the PGN can be parsed and contains at least one valid move.
 */
export function validatePgn(pgn: string): boolean {
  if (!pgn || typeof pgn !== 'string' || !pgn.trim()) {
    return false;
  }

  try {
    const chess = new Chess();
    chess.loadPgn(pgn.trim());
    return chess.history().length > 0;
  } catch {
    return false;
  }
}

/**
 * Extracts metadata headers and game details from a PGN string.
 * Parses standard PGN tags (White, Black, Result, Date, Event, Elo, etc.)
 */
export function parsePgnMetadata(pgn: string): GameMetadata {
  const cleanPgn = pgn ? pgn.trim() : '';
  const headers: Record<string, string> = {};

  // Extract all [Key "Value"] pairs
  const tagRegex = /\[([A-Za-z0-9_]+)\s+"([^"]*)"\]/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(cleanPgn)) !== null) {
    const key = match[1];
    const value = match[2];
    headers[key] = value;
  }

  // Also try chess.js headers if available
  try {
    const chess = new Chess();
    chess.loadPgn(cleanPgn);
    const chessHeaders = chess.header();
    for (const [k, v] of Object.entries(chessHeaders)) {
      if (!headers[k] && v) {
        headers[k] = String(v);
      }
    }
  } catch {
    // If chess.js parsing fails, continue with regex headers
  }

  // Determine result from headers or end of PGN
  let result = headers['Result'] || '*';
  if (result === '*' || !result) {
    if (/\b1-0\b/.test(cleanPgn)) result = '1-0';
    else if (/\b0-1\b/.test(cleanPgn)) result = '0-1';
    else if (/\b1\/2-1\/2\b/.test(cleanPgn)) result = '1/2-1/2';
  }

  const whiteName = headers['White'] || 'Beyaz Oyuncu';
  const blackName = headers['Black'] || 'Siyah Oyuncu';
  const whiteRating = headers['WhiteElo'] || undefined;
  const blackRating = headers['BlackElo'] || undefined;

  return {
    white: {
      name: whiteName,
      rating: whiteRating,
    },
    black: {
      name: blackName,
      rating: blackRating,
    },
    result,
    date: headers['Date'] !== '????.??.??' ? headers['Date'] : undefined,
    event: headers['Event'] !== '?' ? headers['Event'] : undefined,
    timeControl: headers['TimeControl'] || undefined,
    eco: headers['ECO'] || undefined,
    opening: headers['Opening'] || undefined,
    pgn: cleanPgn,
  };
}

/**
 * Formats a result string into human-friendly Turkish description
 */
export function formatGameResult(
  result: string,
  whiteName: string,
  blackName: string
): { winner: 'white' | 'black' | 'draw' | 'unknown'; label: string } {
  if (result === '1-0') {
    return { winner: 'white', label: `${whiteName} kazandı (1-0)` };
  }
  if (result === '0-1') {
    return { winner: 'black', label: `${blackName} kazandı (0-1)` };
  }
  if (result === '1/2-1/2') {
    return { winner: 'draw', label: 'Berabere (½ - ½)' };
  }
  return { winner: 'unknown', label: 'Sonuç Belirsiz' };
}
