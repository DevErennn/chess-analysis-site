import React from 'react';
import { 
  ChevronsLeft, 
  ChevronLeft, 
  Play, 
  Pause, 
  ChevronRight, 
  ChevronsRight, 
  RotateCcw, 
  Cpu, 
  Square,
  Sparkles
} from 'lucide-react';

interface AnalysisControlsProps {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  isAnalyzing: boolean;
  analysisProgress: number; // 0 - 100
  depth: number;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  onTogglePlay: () => void;
  onFlipBoard: () => void;
  onStartAnalysis: () => void;
  onStopAnalysis: () => void;
  onChangeDepth: (depth: number) => void;
}

export const AnalysisControls: React.FC<AnalysisControlsProps> = ({
  currentStep,
  totalSteps,
  isPlaying,
  isAnalyzing,
  analysisProgress,
  depth,
  onFirst,
  onPrev,
  onNext,
  onLast,
  onTogglePlay,
  onFlipBoard,
  onStartAnalysis,
  onStopAnalysis,
  onChangeDepth,
}) => {
  return (
    <div className="w-full space-y-4">
      {/* Navigation Buttons Row */}
      <div className="flex items-center justify-between gap-1.5 bg-chess-surface p-2 rounded-xl border border-chess-border shadow-md">
        <button
          type="button"
          onClick={onFirst}
          disabled={currentStep === 0}
          className="p-2 rounded-lg bg-chess-card hover:bg-chess-cardHover border border-chess-border disabled:opacity-40 disabled:cursor-not-allowed text-gray-200 transition-colors cursor-pointer"
          title="İlk Hamle (Yukarı Ok)"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onPrev}
          disabled={currentStep === 0}
          className="p-2 rounded-lg bg-chess-card hover:bg-chess-cardHover border border-chess-border disabled:opacity-40 disabled:cursor-not-allowed text-gray-200 transition-colors cursor-pointer"
          title="Önceki Hamle (Sol Ok)"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onTogglePlay}
          className="flex-1 py-2 px-3 rounded-lg bg-chess-accent hover:bg-chess-accentHover text-chess-dark font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
          title="Otomatik Oynat / Durdur (Boşluk Tuşu)"
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>Durdur</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Oynat</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={currentStep >= totalSteps}
          className="p-2 rounded-lg bg-chess-card hover:bg-chess-cardHover border border-chess-border disabled:opacity-40 disabled:cursor-not-allowed text-gray-200 transition-colors cursor-pointer"
          title="Sonraki Hamle (Sağ Ok)"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onLast}
          disabled={currentStep >= totalSteps}
          className="p-2 rounded-lg bg-chess-card hover:bg-chess-cardHover border border-chess-border disabled:opacity-40 disabled:cursor-not-allowed text-gray-200 transition-colors cursor-pointer"
          title="Son Hamle (Aşağı Ok)"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onFlipBoard}
          className="p-2 rounded-lg bg-chess-card hover:bg-chess-cardHover border border-chess-border text-gray-200 transition-colors cursor-pointer"
          title="Tahtayı Döndür (F Tuşu)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Stockfish Engine Controls & Progress */}
      <div className="bg-chess-surface p-3.5 rounded-xl border border-chess-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
            <Cpu className="w-4 h-4 text-chess-accent" />
            <span>Stockfish 16+ WASM / Cloud Eval</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-400 text-[11px]">Derinlik:</span>
            <select
              value={depth}
              disabled={isAnalyzing}
              onChange={(e) => onChangeDepth(Number(e.target.value))}
              className="bg-chess-card border border-chess-border text-white text-xs rounded-lg px-2 py-1 outline-none focus:border-chess-accent cursor-pointer disabled:opacity-50"
            >
              <option value={10}>10 (Çok Hızlı)</option>
              <option value={12}>12 (Dengeli)</option>
              <option value={14}>14 (Derin)</option>
              <option value={16}>16 (Usta)</option>
            </select>
          </div>
        </div>

        {/* Action Button */}
        <div>
          {isAnalyzing ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-chess-accent animate-ping inline-block" />
                  Motor Analiz Ediyor...
                </span>
                <span className="font-mono font-bold text-chess-accent">
                  %{analysisProgress}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-chess-card rounded-full h-2 overflow-hidden border border-chess-border">
                <div
                  className="bg-gradient-to-r from-chess-accent to-emerald-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>

              <button
                type="button"
                onClick={onStopAnalysis}
                className="w-full py-2 px-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Analizi Durdur</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onStartAnalysis}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-chess-accent to-emerald-500 hover:from-chess-accentHover hover:to-emerald-400 text-chess-dark font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-chess-accent/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>{analysisProgress === 100 ? 'Yeniden Analiz Et' : 'Tüm Oyunu İncele (Game Review)'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
