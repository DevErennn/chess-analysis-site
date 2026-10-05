import React, { useState, useId } from 'react';
import { 
  User, 
  Search, 
  Loader2, 
  Clock, 
  Swords, 
  AlertCircle, 
  ExternalLink,
  RotateCcw,
  Sparkles,
  Trophy,
  Minus
} from 'lucide-react';
import { 
  fetchPlayerRecentGames, 
  formatTimeControl, 
  getTimeClassInfo, 
  ChessComApiError 
} from '../../lib/chessComApi';
import { parsePgnMetadata } from '../../lib/chessUtils';
import type { ChessComGameSummary, GameMetadata } from '../../types/chess';

interface ChessComImporterProps {
  onSelectGame: (pgn: string, metadata: GameMetadata) => void;
}

const POPULAR_PLAYERS = [
  { username: 'MagnusCarlsen', label: 'Magnus Carlsen' },
  { username: 'Hikaru', label: 'Hikaru Nakamura' },
  { username: 'GothamChess', label: 'GothamChess' },
  { username: 'DanielNaroditsky', label: 'Danya Naroditsky' },
];

export const ChessComImporter: React.FC<ChessComImporterProps> = ({ onSelectGame }) => {
  const [username, setUsername] = useState('');
  const [searchedUser, setSearchedUser] = useState('');
  const [games, setGames] = useState<ChessComGameSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  const handleFetchGames = async (targetUsername?: string) => {
    const userToFetch = (targetUsername || username).trim();
    if (!userToFetch) {
      setError('Lütfen bir Chess.com kullanıcı adı girin.');
      return;
    }

    if (targetUsername) {
      setUsername(targetUsername);
    }

    setIsLoading(true);
    setError(null);
    setGames([]);
    setSearchedUser(userToFetch);

    try {
      const recentGames = await fetchPlayerRecentGames(userToFetch, 10);
      setGames(recentGames);
    } catch (err) {
      if (err instanceof ChessComApiError) {
        setError(err.message);
      } else {
        setError('Maçlar alınırken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFetchGames();
  };

  const handleSelectGame = (game: ChessComGameSummary) => {
    const meta = parsePgnMetadata(game.pgn);
    onSelectGame(game.pgn, meta);
  };

  // Helper to determine game outcome for searched user
  const getOutcomeBadge = (game: ChessComGameSummary, targetUser: string) => {
    const normTarget = targetUser.toLowerCase();
    const isWhite = game.white.username.toLowerCase() === normTarget;
    const isBlack = game.black.username.toLowerCase() === normTarget;

    const whiteWon = game.white.result === 'win';
    const blackWon = game.black.result === 'win';

    if (whiteWon && blackWon) return null;

    if (isWhite || isBlack) {
      const userWon = (isWhite && whiteWon) || (isBlack && blackWon);
      const opponentWon = (isWhite && blackWon) || (isBlack && whiteWon);

      if (userWon) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Trophy className="w-3 h-3" />
            Galibiyet
          </span>
        );
      } else if (opponentWon) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
            Mağlubiyet
          </span>
        );
      } else {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-500/20 text-gray-300 border border-gray-500/30">
            <Minus className="w-3 h-3" />
            Berabere
          </span>
        );
      }
    }

    // Default generic result
    if (whiteWon) {
      return <span className="text-[11px] font-medium text-gray-300">1-0</span>;
    } else if (blackWon) {
      return <span className="text-[11px] font-medium text-gray-300">0-1</span>;
    }
    return <span className="text-[11px] font-medium text-gray-400">½ - ½</span>;
  };

  return (
    <div className="bg-chess-card border border-chess-border rounded-2xl p-6 sm:p-7 shadow-xl shadow-black/40 transition-all duration-200 hover:border-chess-border/80">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-chess-border/60">
        <div className="w-10 h-10 rounded-xl bg-chess-accent/15 border border-chess-accent/30 flex items-center justify-center text-chess-accent">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            Chess.com Maçlarını Getir
          </h2>
          <p className="text-xs text-gray-400">
            Kullanıcı adını yazarak oynadığın son 10 maçı otomatik listele ve incele
          </p>
        </div>
      </div>

      {/* Username search form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <label htmlFor={inputId} className="sr-only">
              Chess.com Kullanıcı Adı
            </label>
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <User className="w-4 h-4" />
            </div>
            <input
              id={inputId}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Örn: MagnusCarlsen, Hikaru..."
              className="w-full pl-10 pr-4 py-3 bg-chess-surface border border-chess-border focus:border-chess-accent focus:ring-1 focus:ring-chess-accent/50 rounded-xl text-sm text-gray-100 placeholder-gray-500 outline-none transition-colors duration-200"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-chess-accent hover:bg-chess-accentHover disabled:opacity-50 disabled:cursor-not-allowed text-chess-dark font-bold text-sm transition-all duration-200 hover:scale-[1.02] shadow-md shadow-chess-accent/20 cursor-pointer whitespace-nowrap active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-chess-dark" />
                <span>Aranıyor...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4 stroke-[2.5]" />
                <span>Maçları Getir</span>
              </>
            )}
          </button>
        </div>

        {/* Quick picks */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-gray-400 flex items-center gap-1 mr-1">
            <Sparkles className="w-3 h-3 text-chess-accent" />
            Hızlı Test:
          </span>
          {POPULAR_PLAYERS.map((p) => (
            <button
              key={p.username}
              type="button"
              onClick={() => handleFetchGames(p.username)}
              className="px-2.5 py-1 rounded-lg bg-chess-surface hover:bg-chess-cardHover border border-chess-border/80 text-gray-300 hover:text-white transition-colors cursor-pointer text-xs"
            >
              {p.label}
            </button>
          ))}
        </div>
      </form>

      {/* Error state */}
      {error && (
        <div className="mt-5 flex items-start gap-3 p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-red-300 mb-0.5">Maçlar Yüklenemedi</div>
            <div>{error}</div>
          </div>
          <button
            type="button"
            onClick={() => handleFetchGames()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 text-xs text-red-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Tekrar Dene
          </button>
        </div>
      )}

      {/* Loading Skeleton state */}
      {isLoading && (
        <div className="mt-6 space-y-3">
          <div className="text-xs text-gray-400 flex items-center gap-2 mb-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-chess-accent" />
            <span>Chess.com arşivi taranıyor ve son maçlar getiriliyor...</span>
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-chess-surface/60 border border-chess-border/60 animate-pulse flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-5 rounded bg-chess-card" />
                  <div className="w-20 h-4 rounded bg-chess-card" />
                </div>
                <div className="w-48 h-5 rounded bg-chess-card" />
              </div>
              <div className="w-24 h-9 rounded-xl bg-chess-card" />
            </div>
          ))}
        </div>
      )}

      {/* Games list */}
      {!isLoading && games.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-400 pb-1">
            <span className="font-medium text-gray-300">
              <strong className="text-chess-accent font-semibold">@{searchedUser}</strong> için son {games.length} maç
            </span>
            <span>Tarihe göre sıralı</span>
          </div>

          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {games.map((game, idx) => {
              const timeInfo = getTimeClassInfo(game.timeClass);
              const formattedTime = formatTimeControl(game.timeControl, game.timeClass);
              const dateStr = new Date(game.endTime * 1000).toLocaleDateString('tr-TR', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={game.url || idx}
                  className="group p-3.5 sm:p-4 rounded-xl bg-chess-surface hover:bg-chess-cardHover border border-chess-border hover:border-chess-accent/60 transition-all duration-200 hover:scale-[1.01] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex-1 space-y-2 min-w-0">
                    {/* Header line: time control badge, date, outcome */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium border text-[11px] ${timeInfo.badgeColor}`}
                      >
                        <span>{timeInfo.icon}</span>
                        <span>{formattedTime}</span>
                        <span className="opacity-80">({timeInfo.label})</span>
                      </span>

                      {getOutcomeBadge(game, searchedUser)}

                      <span className="text-[11px] text-gray-400 flex items-center gap-1 ml-auto sm:ml-0">
                        <Clock className="w-3 h-3 text-gray-500" />
                        {dateStr}
                      </span>
                    </div>

                    {/* Players info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-gray-200">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-full bg-white border border-gray-400 shrink-0" />
                        <span className="font-semibold truncate text-gray-100">
                          {game.white.username}
                        </span>
                        <span className="text-gray-400 font-mono text-[11px]">
                          ({game.white.rating})
                        </span>
                        {game.white.result === 'win' && (
                          <span className="text-emerald-400 font-bold text-[11px]">★</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-900 border border-gray-600 shrink-0" />
                        <span className="font-semibold truncate text-gray-100">
                          {game.black.username}
                        </span>
                        <span className="text-gray-400 font-mono text-[11px]">
                          ({game.black.rating})
                        </span>
                        {game.black.result === 'win' && (
                          <span className="text-emerald-400 font-bold text-[11px]">★</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-chess-border/50">
                    <a
                      href={game.url}
                      target="_blank"
                      rel="noreferrer"
                      title="Chess.com'da aç"
                      className="p-2 rounded-lg bg-chess-card hover:bg-chess-border/50 border border-chess-border text-gray-400 hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleSelectGame(game)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-chess-accent hover:bg-chess-accentHover text-chess-dark font-bold text-xs transition-all duration-200 hover:scale-[1.03] shadow-md shadow-chess-accent/20 cursor-pointer"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span>İncele</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && games.length === 0 && !searchedUser && (
        <div className="mt-6 p-8 rounded-xl bg-chess-surface/40 border border-dashed border-chess-border/80 text-center">
          <div className="w-12 h-12 rounded-full bg-chess-card border border-chess-border mx-auto flex items-center justify-center text-gray-400 mb-3">
            <User className="w-6 h-6 text-gray-500" />
          </div>
          <h3 className="text-sm font-semibold text-gray-200 mb-1">
            Kullanıcı Adı Girerek Başlayın
          </h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Herhangi bir genel (public) Chess.com hesabının son maçlarını doğrudan analiz etmek için yukarıdaki alana kullanıcı adını yazın.
          </p>
        </div>
      )}
    </div>
  );
};
