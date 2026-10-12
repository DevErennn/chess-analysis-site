import React, { useState } from 'react';
import { 
  FileText, 
  User, 
  Zap, 
  ShieldCheck, 
  Cpu, 
  Target, 
  Sparkles,
  Award,
  Swords,
  MessageSquareHeart
} from 'lucide-react';
import { GithubIcon } from '../common/GithubIcon';
import { PgnInputCard } from './PgnInputCard';
import { ChessComImporter } from './ChessComImporter';
import { LichessImporter } from './LichessImporter';
import { DevelopersSection } from '../common/DevelopersSection';
import type { GameMetadata } from '../../types/chess';

interface LandingPageProps {
  onSelectGame: (pgn: string, metadata: GameMetadata) => void;
  onOpenFeedback?: () => void;
  onOpenWelcome?: () => void;
  onOpenAdminFeedbacks?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onSelectGame, 
  onOpenFeedback,
  onOpenWelcome,
  onOpenAdminFeedbacks 
}) => {
  const [activeTab, setActiveTab] = useState<'pgn' | 'chesscom' | 'lichess'>('pgn');

  return (
    <div className="min-h-screen flex flex-col justify-between overflow-x-hidden">
      {/* Navigation / Header */}
      <header className="border-b border-chess-border/70 bg-chess-dark/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <img 
              src="/mini-logo.png" 
              alt="Chess Review" 
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-md border border-chess-border/60 object-contain bg-chess-surface shrink-0"
            />
            <div className="min-w-0">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white flex items-center gap-1.5">
                Chess<span className="text-chess-accent">Review</span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-chess-surface border border-chess-border text-chess-accent">
                  Açık Kaynak
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 text-xs shrink-0">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-chess-surface border border-chess-border text-gray-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Stockfish: v16 WASM</span>
            </div>

            {onOpenWelcome && (
              <button
                type="button"
                onClick={onOpenWelcome}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-chess-surface hover:bg-chess-card border border-chess-border text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 font-medium cursor-pointer text-xs"
                title="Sitenin Kullanımı ve Özellikleri"
              >
                <Sparkles className="w-3.5 h-3.5 text-chess-accent" />
                <span className="hidden sm:inline">Nasıl Kullanılır?</span>
              </button>
            )}

            {onOpenFeedback && (
              <button
                type="button"
                onClick={onOpenFeedback}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-chess-surface hover:bg-chess-card border border-chess-border text-chess-accent hover:text-white transition-colors flex items-center gap-1.5 font-medium cursor-pointer text-xs"
                title="Görüş ve Önerileriniz"
              >
                <MessageSquareHeart className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Görüş & Öneri</span>
              </button>
            )}

            <a
              href="https://github.com/DevErennn/chess-analysis-site"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-chess-surface hover:bg-chess-card border border-chess-border text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 font-medium text-xs"
            >
              <GithubIcon className="w-3.5 h-3.5 text-gray-400" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full">
        {/* Hero Section */}
        <section className="text-center mb-10 sm:mb-12">
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-chess-accent/10 border border-chess-accent/30 text-chess-accent text-xs font-semibold shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tamamen Ücretsiz • Sınırsız Oyun Analizi</span>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/15 border border-red-500/35 text-red-100 text-xs font-bold shadow-sm">
              <img 
                src="/turkish.png" 
                alt="Türk Bayrağı" 
                className="w-4 h-4 object-contain rounded-full shadow-sm" 
              />
              <span>%100 Türk Geliştiriciler Tarafından Geliştirildi</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4 leading-tight sm:leading-snug">
            Ücretsiz & Sınırsız <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-chess-accent via-emerald-400 to-chess-brilliant">
              Satranç Oyun Analizi
            </span>
          </h1>

          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Chess.com Game Review kalitesinde, tamamen tarayıcınızda çalışan, 
            Stockfish destekli ücretsiz analiz aracı. Üyelik veya kredi kartı gerektirmez.
          </p>

          {/* Quick Feature Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto mt-8">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-chess-card/60 border border-chess-border/70 text-left">
              <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-gray-200">%100 Ücretsiz</div>
                <div className="text-[11px] text-gray-400 truncate">Sınırsız İnceleme</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-chess-card/60 border border-chess-border/70 text-left">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-gray-200">Sıfır Sunucu Kaydı</div>
                <div className="text-[11px] text-gray-400 truncate">Gizli & İstemci Tabanlı</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-chess-card/60 border border-chess-border/70 text-left">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-gray-200">Stockfish Motoru</div>
                <div className="text-[11px] text-gray-400 truncate">WebAssembly Gücü</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-chess-card/60 border border-chess-border/70 text-left">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-gray-200">Hamle Rozetleri</div>
                <div className="text-[11px] text-gray-400 truncate">Brilliant & Blunders</div>
              </div>
            </div>
          </div>
        </section>

        {/* Tab Selection */}
        <section className="max-w-3xl mx-auto">
          <div className="flex p-1.5 rounded-2xl bg-chess-surface border border-chess-border mb-6 shadow-inner gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('pgn')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === 'pgn'
                  ? 'bg-chess-card text-white shadow-md border border-chess-border text-chess-accent'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-chess-card/40'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>PGN Yapıştır</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('chesscom')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === 'chesscom'
                  ? 'bg-chess-card text-white shadow-md border border-chess-border text-chess-accent'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-chess-card/40'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Chess.com</span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] bg-chess-accent/20 text-chess-accent font-bold">
                API
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('lichess')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === 'lichess'
                  ? 'bg-chess-card text-white shadow-md border border-chess-border text-cyan-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-chess-card/40'
              }`}
            >
              <Swords className="w-4 h-4 text-cyan-400" />
              <span>Lichess</span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] bg-cyan-500/20 text-cyan-400 font-bold">
                Açık API
              </span>
            </button>
          </div>

          {/* Active Tab Component */}
          {activeTab === 'pgn' ? (
            <PgnInputCard onSelectGame={onSelectGame} />
          ) : activeTab === 'chesscom' ? (
            <ChessComImporter onSelectGame={onSelectGame} />
          ) : (
            <LichessImporter onSelectGame={onSelectGame} />
          )}
        </section>

        {/* Additional information card */}
        <section className="max-w-3xl mx-auto mt-12 p-5 rounded-2xl bg-chess-surface/40 border border-chess-border/60 flex flex-col sm:flex-row items-center gap-4 text-xs text-gray-400">
          <div className="w-10 h-10 rounded-xl bg-chess-card border border-chess-border flex items-center justify-center text-chess-accent shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <span className="text-gray-200 font-semibold">Nasıl Çalışır?</span> PGN kodunu yapıştırdığınızda veya Chess.com maçınızı seçtiğinizde, hamleler ve oyun metadataları ayrıştırılır ve tarayıcınızda çalışan analiz motoruna aktarılır.
          </div>
        </section>
      </main>

      {/* Geliştiriciler & Footer */}
      <footer className="bg-chess-dark pb-8">
        <DevelopersSection 
          onOpenFeedback={onOpenFeedback} 
          onOpenAdminFeedbacks={onOpenAdminFeedbacks} 
        />
      </footer>
    </div>
  );
};
