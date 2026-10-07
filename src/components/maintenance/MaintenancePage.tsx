import React from 'react';
import { Wrench, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

export const MaintenancePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 selection:bg-amber-500 selection:text-black relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full bg-slate-900/80 border border-amber-500/30 rounded-3xl p-8 backdrop-blur-xl shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Icon Header */}
        <div className="relative mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/40 flex items-center justify-center shadow-lg">
          <Wrench className="w-10 h-10 text-amber-400 animate-pulse" />
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Title & Message */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Planlı Bakım Çalışması</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Kısa Bir Mola Veriyoruz!
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            Satranç motorumuz ve analiz algoritmalarımız üzerinde performans ve doğruluk iyileştirmeleri yapılıyor. Çok yakında yeniden hizmetinizdeyiz.
          </p>
        </div>

        {/* Estimated Time / Status Card */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-left space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Durum:</span>
            <span className="font-semibold text-amber-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Güncelleme Sürüyor
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Motor:</span>
            <span className="font-mono text-gray-300">Stockfish 16 NNUE</span>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer active:scale-[0.98]"
        >
          <RefreshCw className="w-4 h-4" />
          Sayfayı Yenile
        </button>
      </div>

      {/* Footer Branding */}
      <footer className="mt-8 text-xs text-gray-600 font-mono">
        ChessReview Platform &bull; Maintenance Mode
      </footer>
    </div>
  );
};
