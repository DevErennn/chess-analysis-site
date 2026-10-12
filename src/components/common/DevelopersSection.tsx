import React from 'react';
import { Code2, Sparkles, MessageSquareHeart, Heart } from 'lucide-react';
import { GithubIcon } from './GithubIcon';

interface DevelopersSectionProps {
  onOpenFeedback?: () => void;
}

export const DevelopersSection: React.FC<DevelopersSectionProps> = ({ onOpenFeedback }) => {
  return (
    <section className="w-full mt-16 pt-10 border-t border-chess-border/60">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-chess-accent/10 border border-chess-accent/30 text-chess-accent text-xs font-semibold mb-2.5">
            <Code2 className="w-3.5 h-3.5" />
            <span>Açık Kaynak & Bağımsız Geliştirme</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Geliştiriciler
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-lg mx-auto">
            Chess Review platformunun arkasındaki yazılım geliştiricileri ve satranç motoru mimarları.
          </p>
        </div>

        {/* Developer Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {/* Developer 1: Eren UÇAR */}
          <div className="relative group p-4 sm:p-5 rounded-2xl bg-chess-surface/70 hover:bg-chess-card border border-chess-border hover:border-chess-accent/50 transition-all duration-300 shadow-lg">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-chess-accent to-emerald-500 flex items-center justify-center text-chess-dark font-black text-base shadow-md shrink-0 group-hover:scale-105 transition-transform">
                EU
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">
                    Eren UÇAR
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-chess-accent/20 text-chess-accent font-bold uppercase tracking-wide">
                    Dev
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Full-Stack Geliştirici & Satranç Algoritmaları
                </p>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-chess-border/50 flex items-center justify-between text-xs">
              <span className="text-[11px] text-gray-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-chess-accent" />
                Motor Mimarisi
              </span>
              <a
                href="https://github.com/DevErennn/chess-analysis-site"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors font-medium text-xs"
              >
                <GithubIcon className="w-3.5 h-3.5" />
                <span>GitHub</span>
              </a>
            </div>
          </div>

          {/* Developer 2: Onuralp DURHAN */}
          <div className="relative group p-4 sm:p-5 rounded-2xl bg-chess-surface/70 hover:bg-chess-card border border-chess-border hover:border-cyan-400/50 transition-all duration-300 shadow-lg">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-chess-dark font-black text-base shadow-md shrink-0 group-hover:scale-105 transition-transform">
                OD
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">
                    Onuralp DURHAN
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-bold uppercase tracking-wide">
                    Dev
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Full-Stack Geliştirici & UI/UX Tasarım
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-chess-border/50 flex items-center justify-between text-xs">
              <span className="text-[11px] text-gray-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Arayüz & Entegrasyon
              </span>
              <a
                href="https://github.com/DevErennn/chess-analysis-site"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors font-medium text-xs"
              >
                <GithubIcon className="w-3.5 h-3.5" />
                <span>GitHub</span>
              </a>
            </div>
          </div>
        </div>

        {/* Quick Feedback & Repository CTA Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs">
          {onOpenFeedback && (
            <button
              type="button"
              onClick={onOpenFeedback}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-chess-card hover:bg-chess-cardHover border border-chess-border text-gray-200 hover:text-white transition-colors cursor-pointer shadow-sm"
            >
              <MessageSquareHeart className="w-4 h-4 text-chess-accent" />
              <span>Görüş ve Önerileriniz Penceresi</span>
            </button>
          )}

          <a
            href="https://github.com/DevErennn/chess-analysis-site"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-chess-card hover:bg-chess-cardHover border border-chess-border text-gray-200 hover:text-white transition-colors"
          >
            <GithubIcon className="w-4 h-4 text-gray-300" />
            <span>GitHub Proje Deposu</span>
          </a>
        </div>

        {/* Bottom copyright notice */}
        <div className="mt-8 pt-4 border-t border-chess-border/40 text-center text-[11px] text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span>Satranç tutkunları için sevgiyle geliştirildi</span>
            <Heart className="w-3 h-3 text-red-500 fill-red-500 inline" />
          </div>
          <div>
            <span>© 2026 Eren UÇAR & Onuralp DURHAN. Tüm hakları saklıdır.</span>
          </div>
        </div>
      </div>
    </section>
  );
};
