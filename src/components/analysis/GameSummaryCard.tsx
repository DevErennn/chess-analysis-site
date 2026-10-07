import React from 'react';
import type { 
  GameAccuracy, 
  ClassificationCount, 
  GameMetadata, 
  TurningPoint, 
  MissedWin, 
  PhaseAdvice 
} from '../../types/chess';
import { CLASSIFICATION_CONFIG } from './constants';
import { 
  Trophy, 
  Award, 
  MessageSquare, 
  Share2, 
  Zap, 
  AlertCircle, 
  Compass, 
  ChevronRight,
  Sparkles,
  Target
} from 'lucide-react';

interface GameSummaryCardProps {
  metadata: GameMetadata;
  accuracy: GameAccuracy;
  counts: {
    white: ClassificationCount;
    black: ClassificationCount;
  };
  coachSummary: string;
  turningPoint?: TurningPoint | null;
  missedWins?: MissedWin[];
  phaseAdvice?: PhaseAdvice;
  isAnalyzing?: boolean;
  analysisProgress?: number;
  onShare?: () => void;
  onSelectStep?: (step: number) => void;
  onSelectClassification?: (key: keyof ClassificationCount) => void;
  onOpenMistakes?: () => void;
  mistakesCount?: number;
}

const ORDERED_KEYS: (keyof ClassificationCount)[] = [
  'brilliant',
  'great',
  'best',
  'excellent',
  'good',
  'book',
  'inaccuracy',
  'mistake',
  'blunder',
];

export const GameSummaryCard: React.FC<GameSummaryCardProps> = ({
  metadata,
  accuracy,
  counts,
  coachSummary,
  turningPoint,
  missedWins,
  phaseAdvice,
  isAnalyzing = false,
  analysisProgress = 0,
  onShare,
  onSelectStep,
  onSelectClassification,
  onOpenMistakes,
  mistakesCount = 0,
}) => {
  return (
    <div className="bg-chess-card border border-chess-border rounded-2xl p-5 shadow-xl space-y-5">
      {/* Accuracy Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
            <Award className="w-4 h-4 text-chess-accent" />
            <span>Oyun Doğruluk Oranı</span>
          </div>
          <span className="text-[11px] text-gray-400">0 - 100%</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* White Accuracy */}
          <div className="bg-chess-surface border border-chess-border rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-2 left-2 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white border border-gray-400" />
              <span className="text-xs font-semibold text-gray-200 truncate max-w-[100px]">
                {metadata.white.name}
              </span>
            </div>
            {isAnalyzing ? (
              <div className="text-xl sm:text-2xl font-bold text-chess-accent mt-4 font-mono animate-pulse">
                %{analysisProgress}
              </div>
            ) : (
              <div className="text-3xl font-black text-white mt-4 font-mono">
                %{accuracy.white}
              </div>
            )}
            <div className="text-[10px] text-gray-400 mt-0.5">
              {isAnalyzing ? 'Hesaplanıyor...' : 'Doğruluk Oranı'}
            </div>
          </div>

          {/* Black Accuracy */}
          <div className="bg-chess-surface border border-chess-border rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-2 left-2 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-black border border-gray-600" />
              <span className="text-xs font-semibold text-gray-200 truncate max-w-[100px]">
                {metadata.black.name}
              </span>
            </div>
            {isAnalyzing ? (
              <div className="text-xl sm:text-2xl font-bold text-chess-accent mt-4 font-mono animate-pulse">
                %{analysisProgress}
              </div>
            ) : (
              <div className="text-3xl font-black text-white mt-4 font-mono">
                %{accuracy.black}
              </div>
            )}
            <div className="text-[10px] text-gray-400 mt-0.5">
              {isAnalyzing ? 'Hesaplanıyor...' : 'Doğruluk Oranı'}
            </div>
          </div>
        </div>
      </div>

      {/* Turning Point (Kırılma Noktası) Card */}
      {!isAnalyzing && turningPoint && (
        <div 
          onClick={() => onSelectStep && onSelectStep(turningPoint.moveIndex + 1)}
          className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/15 transition-all cursor-pointer group shadow-sm"
          title="Kırılma anı pozisyonuna gitmek için tıklayın"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Oyunun Kırılma Noktası</span>
            </div>
            <span className="text-[10px] text-amber-300 font-mono flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Hamleye Git <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            {turningPoint.description}
          </p>
        </div>
      )}

      {/* Missed Wins Alert */}
      {!isAnalyzing && missedWins && missedWins.length > 0 && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-red-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Kaçırılan Fırsatlar ({missedWins.length})</span>
          </div>
          <div className="space-y-1">
            {missedWins.slice(0, 2).map((mw, idx) => (
              <div 
                key={idx}
                onClick={() => onSelectStep && onSelectStep(mw.moveIndex + 1)}
                className="text-[11px] text-gray-300 hover:text-white flex items-center justify-between cursor-pointer py-0.5"
              >
                <span>{mw.description}</span>
                <span className="text-red-400 font-mono text-[10px] shrink-0 ml-2">İncele →</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase Breakdown (Açılış, Orta Oyun, Oyun Sonu) */}
      {!isAnalyzing && phaseAdvice && (
        <div className="p-3.5 rounded-xl bg-chess-surface border border-chess-border/80 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
            <Compass className="w-3.5 h-3.5 text-chess-accent" />
            <span>Aşama Analizi</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className={`p-2 rounded-lg border ${phaseAdvice.weakestPhase === 'opening' ? 'border-amber-500/40 bg-amber-500/5' : 'border-chess-border bg-chess-card'}`}>
              <div className="text-[10px] text-gray-400 font-medium">Açılış</div>
              <div className="text-sm font-bold text-white font-mono mt-0.5">%{phaseAdvice.opening.score}</div>
            </div>
            <div className={`p-2 rounded-lg border ${phaseAdvice.weakestPhase === 'middlegame' ? 'border-amber-500/40 bg-amber-500/5' : 'border-chess-border bg-chess-card'}`}>
              <div className="text-[10px] text-gray-400 font-medium">Orta Oyun</div>
              <div className="text-sm font-bold text-white font-mono mt-0.5">%{phaseAdvice.middlegame.score}</div>
            </div>
            <div className={`p-2 rounded-lg border ${phaseAdvice.weakestPhase === 'endgame' ? 'border-amber-500/40 bg-amber-500/5' : 'border-chess-border bg-chess-card'}`}>
              <div className="text-[10px] text-gray-400 font-medium">Oyun Sonu</div>
              <div className="text-sm font-bold text-white font-mono mt-0.5">%{phaseAdvice.endgame.score}</div>
            </div>
          </div>
        </div>
      )}

      {/* Coach Commentary */}
      {isAnalyzing ? (
        <div className="p-3.5 rounded-xl bg-chess-surface border border-chess-border/80 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-chess-accent/20 border border-chess-accent/40 flex items-center justify-center text-chess-accent shrink-0 mt-0.5 animate-pulse">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-xs text-gray-300 leading-relaxed">
            <span className="font-bold text-white block mb-0.5">Analiz Sürüyor:</span>
            Stockfish derin motor analizi yapılıyor (%{analysisProgress}). Bittiğinde net doğruluk ve koç tavsiyeleri burada görünecektir.
          </div>
        </div>
      ) : (
        coachSummary && (
          <div className="p-3.5 rounded-xl bg-chess-surface border border-chess-border/80 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-chess-accent/20 border border-chess-accent/40 flex items-center justify-center text-chess-accent shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="text-xs text-gray-300 leading-relaxed">
              <span className="font-bold text-white block mb-0.5">Koç Değerlendirmesi:</span>
              {coachSummary}
            </div>
          </div>
        )
      )}

      {/* Classification Breakdown Table with interactive row jumping */}
      <div>
        <div className="flex items-center justify-between text-xs font-bold text-gray-300 mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Hamle Dağılımı</span>
          </div>
          <span className="text-[10px] text-gray-400 font-normal">
            {isAnalyzing ? `Hesaplanıyor (%${analysisProgress})...` : 'Hamleye gitmek için tıkla'}
          </span>
        </div>

        <div className="space-y-1.5">
          {ORDERED_KEYS.map((key) => {
            const config = CLASSIFICATION_CONFIG[key];
            const whiteCount = counts.white[key] || 0;
            const blackCount = counts.black[key] || 0;
            const total = whiteCount + blackCount;

            // Only hide book/great if both players have 0; NEVER hide brilliant or standard error categories
            if (whiteCount === 0 && blackCount === 0 && (key === 'great' || key === 'book')) {
              return null;
            }

            const Icon = config.icon;

            return (
              <button
                type="button"
                key={key}
                disabled={total === 0}
                onClick={() => onSelectClassification && onSelectClassification(key)}
                className={`w-full flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg border transition-all ${
                  total > 0
                    ? 'bg-chess-surface/60 border-chess-border/40 hover:bg-chess-surface hover:border-chess-accent/40 cursor-pointer active:scale-[0.99]'
                    : 'bg-chess-surface/30 border-chess-border/20 opacity-60 cursor-default'
                }`}
                title={total > 0 ? `${config.label} hamlelerine sıçramak için tıklayın` : undefined}
              >
                {/* White count */}
                <span className="w-8 font-mono font-bold text-left text-gray-200">
                  {whiteCount}
                </span>

                {/* Badge name */}
                <div className="flex items-center gap-2 flex-1 justify-center">
                  <Icon className={`w-3.5 h-3.5 ${config.textColor}`} />
                  <span className={`font-semibold ${config.textColor}`}>
                    {key === 'brilliant' ? '!! Brilliant (Göz Alıcı)' : `${config.label} (${config.symbol})`}
                  </span>
                </div>

                {/* Black count */}
                <span className="w-8 font-mono font-bold text-right text-gray-200">
                  {blackCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mistake Practice Trainer Button */}
      {onOpenMistakes && mistakesCount > 0 && (
        <button
          type="button"
          onClick={onOpenMistakes}
          className="w-full py-2.5 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-xs font-bold text-amber-300 flex items-center justify-center gap-2 transition-all cursor-pointer shadow hover:border-amber-400 active:scale-[0.99]"
        >
          <Target className="w-4 h-4 text-amber-400" />
          <span>🎯 Hatalarımdan Öğren ({mistakesCount} Pozisyon)</span>
        </button>
      )}

      {/* Share / Export Action Button */}
      {onShare && (
        <button
          type="button"
          onClick={onShare}
          className="w-full py-2.5 px-4 rounded-xl bg-chess-surface hover:bg-chess-surface/90 border border-chess-border text-xs font-bold text-gray-200 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow hover:border-chess-accent/50"
        >
          <Share2 className="w-4 h-4 text-chess-accent" />
          <span>Raporu Paylaş & PGN İndir</span>
        </button>
      )}
    </div>
  );
};
