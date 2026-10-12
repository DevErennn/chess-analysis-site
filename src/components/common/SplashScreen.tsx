import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
  minDuration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onFinish, 
  minDuration = 2200 
}) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Stockfish 16 NNUE motoru hazırlanıyor...');
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min(100, Math.floor((elapsed / minDuration) * 100));
      setProgress(currentProgress);

      if (currentProgress < 35) {
        setStatusText('Stockfish 16 NNUE WASM çekirdeği yükleniyor...');
      } else if (currentProgress < 70) {
        setStatusText('ECO Açılış teorisi veritabanı taranıyor...');
      } else if (currentProgress < 95) {
        setStatusText('Konum değerlendirme matrisleri senkronize ediliyor...');
      } else {
        setStatusText('Chess Review hazır! Tahta kuruluyor...');
      }

      if (elapsed >= minDuration) {
        clearInterval(interval);
        setIsFadingOut(true);
        setTimeout(() => {
          onFinish();
        }, 500); // 500ms fade transition
      }
    }, 40);

    return () => clearInterval(interval);
  }, [minDuration, onFinish]);

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onFinish();
    }, 200);
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-chess-dark transition-opacity duration-500 select-none px-4 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-chess-accent/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        {/* Animated Toppling White King Scene */}
        <div className="relative w-40 h-44 flex flex-col items-center justify-end mb-6">
          {/* Subtle ground shadow / base platform */}
          <div className="w-32 h-3.5 bg-black/40 rounded-full blur-xs border-b border-chess-border/40 mb-2 relative">
            <div className="absolute inset-0 bg-chess-accent/15 rounded-full blur-sm" />
          </div>

          {/* Devrilen Beyaz Şah (Toppling White King) */}
          <div className="absolute bottom-5 origin-bottom-right animate-topple-king">
            <svg 
              className="w-24 h-28 drop-shadow-[0_12px_24px_rgba(255,255,255,0.25)]" 
              viewBox="0 0 100 120" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* King Crown Cross */}
              <path 
                d="M47 8 H53 V15 H60 V21 H53 V28 H47 V21 H40 V15 H47 Z" 
                fill="#ffffff" 
                stroke="#d1d5db" 
                strokeWidth="2" 
                strokeLinejoin="round" 
              />
              
              {/* Crown Center Bulb & Finials */}
              <circle cx="50" cy="34" r="7" fill="#ffffff" stroke="#9ca3af" strokeWidth="2" />
              <circle cx="34" cy="38" r="4.5" fill="#f3f4f6" stroke="#9ca3af" strokeWidth="1.5" />
              <circle cx="66" cy="38" r="4.5" fill="#f3f4f6" stroke="#9ca3af" strokeWidth="1.5" />

              {/* Head / Coronet */}
              <path 
                d="M28 46 C32 40 40 37 50 37 C60 37 68 40 72 46 C70 54 66 58 50 58 C34 58 30 54 28 46 Z" 
                fill="url(#whitePieceGrad)" 
                stroke="#cbd5e1" 
                strokeWidth="2" 
              />

              {/* Neck Ring */}
              <path 
                d="M36 60 H64 V66 H36 Z" 
                fill="#f8fafc" 
                stroke="#94a3b8" 
                strokeWidth="1.8" 
              />

              {/* Body Curve */}
              <path 
                d="M38 66 C38 80 32 88 28 98 H72 C68 88 62 80 62 66 Z" 
                fill="url(#whitePieceGrad)" 
                stroke="#cbd5e1" 
                strokeWidth="2" 
              />

              {/* Base Pedestal Rings */}
              <path 
                d="M25 98 C25 98 32 96 50 96 C68 96 75 98 75 98 V105 H25 V98 Z" 
                fill="#e2e8f0" 
                stroke="#94a3b8" 
                strokeWidth="2" 
              />
              <path 
                d="M20 105 H80 V114 C80 116 78 118 75 118 H25 C22 118 20 116 20 114 Z" 
                fill="#f8fafc" 
                stroke="#64748b" 
                strokeWidth="2.2" 
              />

              {/* Gradient Shading */}
              <defs>
                <linearGradient id="whitePieceGrad" x1="20" y1="20" x2="80" y2="110" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#ffffff" />
                  <stop offset="0.6" stopColor="#f1f5f9" />
                  <stop offset="1" stopColor="#cbd5e1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Brand Title */}
        <div className="flex items-center gap-2 mb-2">
          <img 
            src="/mini-logo.png" 
            alt="Chess Review" 
            className="w-7 h-7 rounded-lg shadow-sm border border-chess-border/60 object-contain"
          />
          <h1 className="text-2xl font-black text-white tracking-tight">
            Chess<span className="text-chess-accent">Review</span>
          </h1>
        </div>

        {/* Status text */}
        <p className="text-xs text-gray-400 font-medium h-5 transition-all mb-4 px-2 truncate">
          {statusText}
        </p>

        {/* Progress bar container */}
        <div className="w-full bg-chess-card border border-chess-border/80 rounded-full h-2.5 p-0.5 overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-chess-accent via-emerald-400 to-cyan-400 rounded-full transition-all duration-75 shadow-sm"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Bottom percentage & skip button */}
        <div className="w-full flex items-center justify-between text-[11px] text-gray-500 mt-2.5 px-1 font-mono">
          <span>%{progress}</span>
          <button
            type="button"
            onClick={handleSkip}
            className="text-gray-400 hover:text-white transition-colors underline cursor-pointer"
          >
            Atla »
          </button>
        </div>
      </div>
    </div>
  );
};
