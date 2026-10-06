import React, { useState, useId } from 'react';
import { 
  User, 
  Search, 
  Loader2, 
  Clock, 
  Swords, 
  AlertCircle, 
  ExternalLink,
  Sparkles,
  Trophy,
  Minus
} from 'lucide-react';
import { fetchLichessRecentGames, LichessApiError } from '../../lib/lichessApi';
import { getTimeClassInfo } from '../../lib/chessComApi';
import { parsePgnMetadata } from '../../lib/chessUtils';
import type { ChessComGameSummary, GameMetadata } from '../../types/chess';

interface LichessImporterProps {
  onSelectGame: (pgn: string, metadata: GameMetadata) => void;
}

const POPULAR_LICHESS_PLAYERS = [
  { username: 'DrNykterstein', label: 'DrNykterstein (Magnus)' },
  { username: 'nihalsarin2004', label: 'Nihal Sarin' },
  { username: 'DanielNaroditsky', label: 'Daniel Naroditsky' },
  { username: 'alireza2003', label: 'Alireza Firouzja' },
];

export const LichessImporter: React.FC<LichessImporterProps> = ({ onSelectGame }) => {
  const [username, setUsername] = useState('');
  const [searchedUser, setSearchedUser] = useState('');
  const [games, setGames] = useState<ChessComGameSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  const handleFetchGames = async (targetUsername?: string) => {
    const userToFetch = (targetUsername || username).trim();
    if (!userToFetch) {
      setError('Lütfen bir Lichess kullanıcı adı girin.');
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
      const recentGames = await fetchLichessRecentGames(userToFetch, 10);
      setGames(recentGames);
    } catch (err) {
      if (err instanceof LichessApiError) {
        setError(err.message);
      } else {
        setError('Maçlar alınırken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFetchGames();
  };

  const handleGameClick = (game: ChessComGameSummary) => {
    if (!game.pgn) return;
    try {
      const metadata = parsePgnMetadata(game.pgn);
      onSelectGame(game.pgn, metadata);
    } catch {
      setError('Bu maçın PGN verisi ayrıştırılamadı.');
    }
  };

  const formatDate = (timestamp: number) => {
    try {
      const d = new Date(timestamp * 1000);
      return d.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="bg-chess-card border border-chess-border rounded-2xl p-6 sm:p-7 shadow-xl shadow-black/40 transition-all duration-200 hover:border-chess-border/80">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-chess-border/60">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            Lichess Maçlarını Getir
          </h2>
          <p className="text-xs text-gray-400">
            Kullanıcı adını yazarak oynadığın son 10 maçı otomatik listele ve incele
          </p>
        </div>
      </div>

      {/* Search Form */}
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div>
          <label htmlFor={inputId} className="block text-xs font-medium text-gray-300 mb-1.5">
            Lichess Kullanıcı Adı
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id={inputId}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Örn: DrNykterstein, DanielNaroditsky..."
                className="w-full bg-chess-surface border border-chess-border focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none transition-colors"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !username.trim()}
              className="px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Getiriliyor...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Maçları Getir</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Popular Players Quick Select */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Hızlı Test:</span>
          </span>
          {POPULAR_LICHESS_PLAYERS.map((p) => (
            <button
              type="button"
              key={p.username}
              onClick={() => handleFetchGames(p.username)}
              className="text-xs px-2.5 py-1 rounded-lg bg-chess-surface hover:bg-chess-cardHover border border-chess-border text-gray-300 hover:text-white transition-all cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mt-5 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{error}</div>
        </div>
      )}

      {/* Games List */}
      {games.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-400 px-1">
            <span>
              <strong className="text-cyan-400">@{searchedUser}</strong> için son {games.length} maç
            </span>
            <span>Tarihe göre sıralı</span>
          </div>

          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {games.map((g, idx) => {
              const timeInfo = getTimeClassInfo(g.timeClass);
              const isUserWhite = g.white.username.toLowerCase() === searchedUser.toLowerCase();
              const userWon = isUserWhite ? g.white.result === 'win' : g.black.result === 'win';
              const isDraw = g.white.result === 'draw' || g.black.result === 'draw';

              return (
                <div
                  key={idx}
                  onClick={() => handleGameClick(g)}
                  className="p-3.5 rounded-xl bg-chess-surface/80 hover:bg-chess-surface border border-chess-border hover:border-cyan-400/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    {/* Time control & result badge */}
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className={`px-2 py-0.5 rounded-full border font-mono font-semibold flex items-center gap-1 ${timeInfo.badgeColor}`}>
                        <span>{timeInfo.icon}</span>
                        <span>{g.timeControl}</span>
                      </span>

                      {isDraw ? (
                        <span className="px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-300 border border-gray-500/30 font-medium flex items-center gap-1">
                          <Minus className="w-3 h-3" />
                          <span>Beraberlik</span>
                        </span>
                      ) : userWon ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          <span>Galibiyet</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-medium">
                          Mağlubiyet
                        </span>
                      )}

                      <span className="text-gray-500 flex items-center gap-1 ml-auto sm:ml-0 font-mono text-[10px]">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(g.endTime)}</span>
                      </span>
                    </div>

                    {/* Players Info */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* White Player */}
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2.5 h-2.5 rounded-full bg-white border border-gray-400 shrink-0" />
                        <span className={`truncate font-semibold ${isUserWhite ? 'text-white' : 'text-gray-300'}`}>
                          {g.white.username}
                        </span>
                        <span className="text-gray-500 font-mono text-[10px]">({g.white.rating})</span>
                      </div>

                      {/* Black Player */}
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2.5 h-2.5 rounded-full bg-black border border-gray-600 shrink-0" />
                        <span className={`truncate font-semibold ${!isUserWhite ? 'text-white' : 'text-gray-300'}`}>
                          {g.black.username}
                        </span>
                        <span className="text-gray-500 font-mono text-[10px]">({g.black.rating})</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <a
                      href={g.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-lg bg-chess-card hover:bg-chess-cardHover border border-chess-border text-gray-400 hover:text-white transition-colors"
                      title="Lichess'te Görüntüle"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-400 font-bold text-xs flex items-center gap-1.5 transition-all group-hover:scale-105"
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
    </div>
  );
};
