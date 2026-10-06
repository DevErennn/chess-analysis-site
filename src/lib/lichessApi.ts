import type { ChessComGameSummary } from '../types/chess';

export class LichessApiError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'LichessApiError';
    this.statusCode = statusCode;
  }
}

/**
 * Parses Lichess NDJSON format stream (Newline Delimited JSON).
 */
function parseNdjson<T>(text: string): T[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      try {
        return JSON.parse(line) as T;
      } catch {
        return null;
      }
    })
    .filter((item): item is T => item !== null);
}

/**
 * Formats Lichess clock/speed to readable string (e.g. "180+0" -> "3 min", "blitz" -> "Blitz")
 */
export function formatLichessSpeed(speed: string, clock?: { initial: number; increment: number }): string {
  if (clock && clock.initial !== undefined) {
    const mins = Math.floor(clock.initial / 60);
    const inc = clock.increment || 0;
    return inc > 0 ? `${mins}+${inc}` : `${mins} dk`;
  }
  return speed ? speed.charAt(0).toUpperCase() + speed.slice(1) : 'Standart';
}

/**
 * Fetches recent games for a Lichess player.
 * Endpoint: https://lichess.org/api/games/user/{username}?max=10&pgnInJson=true&clocks=true
 */
export async function fetchLichessRecentGames(
  username: string,
  limit: number = 10
): Promise<ChessComGameSummary[]> {
  const cleanUsername = username.trim().toLowerCase();

  if (!cleanUsername) {
    throw new LichessApiError('Lütfen geçerli bir Lichess kullanıcı adı girin.');
  }

  const url = `https://lichess.org/api/games/user/${encodeURIComponent(
    cleanUsername
  )}?max=${limit}&pgnInJson=true&clocks=false&evals=false&opening=true`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/x-ndjson',
      },
    });
  } catch {
    throw new LichessApiError(
      'Lichess API sunucusuna bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.'
    );
  }

  if (response.status === 404) {
    throw new LichessApiError(
      `"${username}" kullanıcı adına sahip bir Lichess oyuncusu bulunamadı.`,
      404
    );
  }

  if (!response.ok) {
    throw new LichessApiError(
      `Lichess API hatası (${response.status}). Lütfen daha sonra tekrar deneyin.`,
      response.status
    );
  }

  const rawText = await response.text();
  const rawGames = parseNdjson<any>(rawText);

  if (rawGames.length === 0) {
    throw new LichessApiError(
      `"${username}" oyuncusunun son oynanmış maçı bulunamadı.`
    );
  }

  // Map to unified ChessComGameSummary structure
  const summaries: ChessComGameSummary[] = rawGames.map((g) => {
    const whitePlayer = g.players?.white?.user?.name || g.players?.white?.name || 'Anonim';
    const blackPlayer = g.players?.black?.user?.name || g.players?.black?.name || 'Anonim';

    const whiteRating = g.players?.white?.rating || 1500;
    const blackRating = g.players?.black?.rating || 1500;

    // Determine winner/result
    let whiteResult = 'draw';
    let blackResult = 'draw';
    let resultHeader = '*';
    if (g.winner === 'white') {
      whiteResult = 'win';
      blackResult = 'loss';
      resultHeader = '1-0';
    } else if (g.winner === 'black') {
      whiteResult = 'loss';
      blackResult = 'win';
      resultHeader = '0-1';
    } else if (g.status === 'draw' || g.status === 'stalemate') {
      resultHeader = '1/2-1/2';
    }

    const timeControlStr = formatLichessSpeed(g.speed, g.clock);

    // Fallback if pgn field is absent but moves string is present
    let gamePgn = g.pgn || '';
    if (!gamePgn && g.moves) {
      gamePgn = `[Event "Lichess Game"]\n[Site "https://lichess.org/${g.id}"]\n[White "${whitePlayer}"]\n[Black "${blackPlayer}"]\n[WhiteElo "${whiteRating}"]\n[BlackElo "${blackRating}"]\n[Result "${resultHeader}"]\n\n${g.moves} ${resultHeader}`;
    }

    return {
      url: `https://lichess.org/${g.id}`,
      pgn: gamePgn,
      timeControl: timeControlStr,
      timeClass: g.speed || 'blitz',
      endTime: Math.floor((g.createdAt || Date.now()) / 1000),
      rated: Boolean(g.rated),
      white: {
        username: whitePlayer,
        rating: whiteRating,
        result: whiteResult,
      },
      black: {
        username: blackPlayer,
        rating: blackRating,
        result: blackResult,
      },
    };
  });

  return summaries;
}
