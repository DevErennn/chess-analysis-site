import React from 'react';
import type { GameAccuracy, ClassificationCount, GameMetadata } from '../../types/chess';
import { CLASSIFICATION_CONFIG } from './constants';
import { Trophy, Award, MessageSquare } from 'lucide-react';

interface GameSummaryCardProps {
  metadata: GameMetadata;
  accuracy: GameAccuracy;
  counts: {
    white: ClassificationCount;
    black: ClassificationCount;
  };
  coachSummary: string;
}

const ORDERED_KEYS: (keyof ClassificationCount)[] = [
  'brilliant',
  'great',
  'best',
  'excellent',
  'good',
  'inaccuracy',
  'mistake',
  'blunder',
];

export const GameSummaryCard: React.FC<GameSummaryCardProps> = ({
  metadata,
  accuracy,
  counts,
  coachSummary,
}) => {
  return (
    <div className="bg-chess-card border border-chess-border rounded-2xl p-5 shadow-xl space-y-5">
      {/* Accuracy Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
            <Award className="w-4 h-4 text-chess-accent" />
            <span>CAPS2 Doğruluk Skoru</span>
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
            <div className="text-3xl font-black text-white mt-4 font-mono">
              %{accuracy.white}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">Doğruluk Oranı</div>
          </div>

          {/* Black Accuracy */}
          <div className="bg-chess-surface border border-chess-border rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-2 left-2 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-black border border-gray-600" />
              <span className="text-xs font-semibold text-gray-200 truncate max-w-[100px]">
                {metadata.black.name}
              </span>
            </div>
            <div className="text-3xl font-black text-white mt-4 font-mono">
              %{accuracy.black}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">Doğruluk Oranı</div>
          </div>
        </div>
      </div>

      {/* Coach Commentary */}
      {coachSummary && (
        <div className="p-3.5 rounded-xl bg-chess-surface border border-chess-border/80 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-chess-accent/20 border border-chess-accent/40 flex items-center justify-center text-chess-accent shrink-0 mt-0.5">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="text-xs text-gray-300 leading-relaxed">
            <span className="font-bold text-white block mb-0.5">Koç Değerlendirmesi:</span>
            {coachSummary}
          </div>
        </div>
      )}

      {/* Classification Breakdown Table */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-300 mb-2">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>Hamle Dağılımı</span>
        </div>

        <div className="space-y-1.5">
          {ORDERED_KEYS.map((key) => {
            const config = CLASSIFICATION_CONFIG[key];
            const whiteCount = counts.white[key] || 0;
            const blackCount = counts.black[key] || 0;

            if (whiteCount === 0 && blackCount === 0 && (key === 'brilliant' || key === 'great')) {
              return null; // hide 0 brilliant/great if none happened
            }

            const Icon = config.icon;

            return (
              <div
                key={key}
                className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-chess-surface/60 border border-chess-border/40 hover:bg-chess-surface transition-colors"
              >
                {/* White count */}
                <span className="w-8 font-mono font-bold text-left text-gray-200">
                  {whiteCount}
                </span>

                {/* Badge name */}
                <div className="flex items-center gap-2 flex-1 justify-center">
                  <Icon className={`w-3.5 h-3.5 ${config.textColor}`} />
                  <span className={`font-semibold ${config.textColor}`}>
                    {config.label} ({config.symbol})
                  </span>
                </div>

                {/* Black count */}
                <span className="w-8 font-mono font-bold text-right text-gray-200">
                  {blackCount}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
