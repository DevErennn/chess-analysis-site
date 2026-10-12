import React from 'react';
import { 
  X, 
  Sparkles, 
  Flame, 
  Cpu, 
  Share2, 
  HeartHandshake, 
  ArrowRight, 
  UploadCloud, 
  ChevronRight
} from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFeedback: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  onOpenFeedback,
}) => {
  if (!isOpen) return null;

  const handleSkip = () => {
    sessionStorage.setItem('chess_review_welcomed', 'true');
    onClose();
  };

  const handleSupportAndFeedback = () => {
    sessionStorage.setItem('chess_review_welcomed', 'true');
    onClose();
    onOpenFeedback();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-chess-card border border-chess-border rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col text-gray-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
      >
        {/* Top vibrant gradient banner */}
        <div className="h-1.5 w-full bg-gradient-to-r from-chess-accent via-amber-400 to-cyan-400 shrink-0" />

        {/* Quick Skip button at top right */}
        <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 flex items-center gap-2 z-10">
          <button
            type="button"
            onClick={handleSkip}
            className="px-3 py-1.5 rounded-xl bg-chess-surface/80 hover:bg-chess-surface border border-chess-border/80 text-xs font-semibold text-gray-300 hover:text-white transition-all cursor-pointer flex items-center gap-1 shadow-sm"
            title="Tanıtımı atlayıp doğrudan uygulamaya geç"
          >
            <span>Atla</span>
            <ChevronRight className="w-3.5 h-3.5 text-chess-accent" />
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-chess-surface transition-colors cursor-pointer"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-5">
          <div className="pr-16 sm:pr-20 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-chess-accent/15 border border-chess-accent/30 text-chess-accent text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Chess Review'e Hoş Geldiniz!</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/35 text-red-200 text-[11px] font-bold">
                <img src="/turkish.png" alt="Türk Bayrağı" className="w-3.5 h-3.5 object-contain rounded-full shadow-sm" />
                <span>%100 Türk Geliştiriciler Tarafından Geliştirildi</span>
              </div>
            </div>
            <h2 id="welcome-modal-title" className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
              Görüşleriniz bizim için değerli, bize destek olmak ister misiniz?
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              DevErennn ve DevOnurrr tarafından açık kaynak ve tamamen ücretsiz olarak geliştirilen satranç analiz platformumuzda maçlarınızı derinlemesine inceleyin.
            </p>
          </div>

          {/* Quick Feature Highlights (Sitenin Kullanımı Ana Hatları) */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Sitenin Kullanımı & Öne Çıkan Özellikler:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {/* Feature 1 */}
              <div className="p-3.5 rounded-xl bg-chess-surface/80 border border-chess-border hover:border-chess-accent/40 transition-colors flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs mb-0.5">1. Hızlı Maç İçe Aktarma</h4>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    Chess.com / Lichess kullanıcı adınızı girip son maçlarınızı tek tıkla çekin veya PGN metninizi yapıştırın.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="p-3.5 rounded-xl bg-chess-surface/80 border border-chess-border hover:border-chess-accent/40 transition-colors flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs mb-0.5">2. Stockfish 16 WASM</h4>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    Tarayıcınızda doğrudan çalışan en yeni Stockfish motoru ile anlık centipawn kaybı ve derinlikli hamle analizi.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="p-3.5 rounded-xl bg-chess-surface/80 border border-chess-border hover:border-chess-accent/40 transition-colors flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs mb-0.5">3. Dahi (!!) & Harika Hamleler</h4>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    Bobby Fischer seviyesinde pasif fedalar dahil, Brilliant (!!) ve Great (!) rozetleriyle oyun kalitenizi keşfedin.
                  </p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="p-3.5 rounded-xl bg-chess-surface/80 border border-chess-border hover:border-chess-accent/40 transition-colors flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs mb-0.5">4. "Hey Yaptığım Hamleye Bak!"</h4>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    Unutulmaz hamlelerinizi Instagram Hikaye (9:16) veya Kare (1:1) görsel kartlara dönüştürün ve arkadaşlarınızla paylaşın.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback & Support Highlight Box */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-chess-surface via-chess-surface to-chess-accent/10 border border-chess-accent/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-chess-accent">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Görüşünüz veya Öneriniz Var mı?</span>
              </div>
              <p className="text-gray-300 text-[11px] leading-relaxed">
                Platformu birlikte mükemmelleştirmek için geri bildirimleriniz doğrudan geliştiricilere ulaşıyor.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSupportAndFeedback}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-chess-accent hover:bg-chess-accent/90 text-chess-dark font-extrabold text-xs transition-transform active:scale-95 shadow-md shadow-chess-accent/20 cursor-pointer shrink-0"
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Görüş & Destek Bildir</span>
            </button>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-chess-border bg-chess-surface/80 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer font-medium px-2 py-1"
          >
            Atla ve Bir Daha Gösterme
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSkip}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-chess-accent hover:bg-chess-accent/90 text-chess-dark font-black text-xs transition-all shadow-md shadow-chess-accent/20 cursor-pointer"
            >
              <span>Uygulamayı Keşfet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
