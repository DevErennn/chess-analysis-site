import type { ChessComGameSummary } from '../types/chess';

interface ChessComRawPlayer {
  username: string;
  rating: number;
  result: string;
  uuid?: string;
}

interface ChessComRawGame {
  url: string;
  pgn?: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  time_class: string;
  rules: string;
  white: ChessComRawPlayer;
  black: ChessComRawPlayer;
}

interface ChessComArchivesResponse {
  archives: string[];
}

interface ChessComMonthGamesResponse {
  games: ChessComRawGame[];
}

export class ChessComApiError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'ChessComApiError';
    this.statusCode = statusCode;
  }
}

/**
 * Formats timeControl and timeClass to a nice readable label
 * e.g. "180" -> "3 min", "180+2" -> "3+2", "600" -> "10 min"
 */
export function formatTimeControl(timeControl: string, timeClass: string): string {
  if (!timeControl) {
    return timeClass ? timeClass.toUpperCase() : 'Bilinmeyen';
  }

  // Daily or non-seconds
  if (timeControl.includes('/')) {
    return `${timeControl} Günlük`;
  }

  const parts = timeControl.split('+');
  const baseSeconds = parseInt(parts[0], 10);
  const increment = parts[1] ? parseInt(parts[1], 10) : 0;

  if (isNaN(baseSeconds)) {
    return timeControl;
  }

  const minutes = Math.floor(baseSeconds / 60);
  const seconds = baseSeconds % 60;

  let baseStr = '';
  if (minutes > 0 && seconds === 0) {
    baseStr = `${minutes}`;
  } else if (minutes > 0) {
    baseStr = `${minutes}m ${seconds}s`;
  } else {
    baseStr = `${seconds}s`;
  }

  if (increment > 0) {
    return `${baseStr}+${increment}`;
  }
  return baseStr;
}

/**
 * Returns an icon label and color hint for timeClass
 */
export function getTimeClassInfo(timeClass: string): { label: string; icon: string; badgeColor: string } {
  switch (timeClass?.toLowerCase()) {
    case 'bullet':
      return { label: 'Bullet', icon: '⚡', badgeColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
    case 'blitz':
      return { label: 'Blitz', icon: '🔥', badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
    case 'rapid':
      return { label: 'Rapid', icon: '⏱️', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    case 'daily':
      return { label: 'Daily', icon: '📅', badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    default:
      return { label: timeClass || 'Custom', icon: '♟️', badgeColor: 'bg-gray-500/20 text-gray-300 border-gray-500/30' };
  }
}

/**
 * Fetches the last 10 games of a Chess.com player.
 * Checks latest month archives and walks backwards if fewer than 10 games exist.
 */
export async function fetchPlayerRecentGames(
  username: string,
  limit: number = 10
): Promise<ChessComGameSummary[]> {
  const cleanUsername = username.trim().toLowerCase();

  if (!cleanUsername) {
    throw new ChessComApiError('Lütfen geçerli bir Chess.com kullanıcı adı girin.');
  }

  const archivesUrl = `https://api.chess.com/pub/player/${encodeURIComponent(cleanUsername)}/games/archives`;

  let archivesResponse: Response;
  try {
    archivesResponse = await fetch(archivesUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });
  } catch {
    throw new ChessComApiError(
      'Chess.com API sunucularına bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.'
    );
  }

  if (archivesResponse.status === 404) {
    throw new ChessComApiError(
      `"${username}" kullanıcı adına sahip bir Chess.com oyuncusu bulunamadı.`,
      404
    );
  }

  if (archivesResponse.status === 429) {
    throw new ChessComApiError(
      'Chess.com istek limiti aşıldı. Lütfen birkaç saniye bekleyip tekrar deneyin.',
      429
    );
  }

  if (!archivesResponse.ok) {
    throw new ChessComApiError(
      `Chess.com API hatası (HTTP ${archivesResponse.status}). Lütfen daha sonra tekrar deneyin.`,
      archivesResponse.status
    );
  }

  const archivesData: ChessComArchivesResponse = await archivesResponse.json();

  if (!archivesData.archives || archivesData.archives.length === 0) {
    throw new ChessComApiError(
      `"${username}" adlı oyuncuya ait herhangi bir arşivlenmiş maç bulunamadı.`
    );
  }

  // Iterate backwards through archives until we collect at least `limit` games
  const allGames: ChessComRawGame[] = [];
  const archiveUrls = [...archivesData.archives].reverse();

  for (const archiveUrl of archiveUrls) {
    try {
      const monthResponse = await fetch(archiveUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!monthResponse.ok) continue;

      const monthData: ChessComMonthGamesResponse = await monthResponse.json();
      if (monthData.games && Array.isArray(monthData.games)) {
        // Filter standard chess games with PGN
        const validGames = monthData.games.filter(
          (g) => g.rules === 'chess' && g.pgn && g.pgn.trim().length > 0
        );
        allGames.push(...validGames);
      }

      if (allGames.length >= limit) {
        break;
      }
    } catch {
      // Continue trying next archive if one fails
      continue;
    }
  }

  if (allGames.length === 0) {
    throw new ChessComApiError(
      `"${username}" kullanıcısının oynanmış standart satranç maçı bulunamadı.`
    );
  }

  // Sort by end_time descending (newest first)
  allGames.sort((a, b) => b.end_time - a.end_time);

  // Take the most recent `limit` games
  const recentGames = allGames.slice(0, limit);

  return recentGames.map((game): ChessComGameSummary => {
    return {
      url: game.url,
      pgn: game.pgn || '',
      timeControl: game.time_control,
      timeClass: game.time_class,
      endTime: game.end_time,
      rated: Boolean(game.rated),
      white: {
        username: game.white.username,
        rating: game.white.rating || 0,
        result: game.white.result || 'unknown',
      },
      black: {
        username: game.black.username,
        rating: game.black.rating || 0,
        result: game.black.result || 'unknown',
      },
    };
  });
}
