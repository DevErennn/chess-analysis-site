import React, { useEffect, useRef } from 'react';
import type { MoveAnalysis } from '../../types/chess';
import { ClassificationBadge } from './ClassificationBadge';

interface MoveHistoryTableProps {
  moves: MoveAnalysis[];
  currentStep: number;
  onSelectStep: (step: number) => void;
}

export const MoveHistoryTable: React.FC<MoveHistoryTableProps> = ({
  moves,
  currentStep,
  onSelectStep,
}) => {
  const activeRowRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to active move
  useEffect(() => {
    if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentStep]);

  // Group moves into pairs (White & Black)
  const movePairs: {
    moveNumber: number;
    white?: MoveAnalysis;
    black?: MoveAnalysis;
    whiteStep: number;
    blackStep?: number;
  }[] = [];

  for (let i = 0; i < moves.length; i += 2) {
    const white = moves[i];
    const black = moves[i + 1];
    movePairs.push({
      moveNumber: white.moveNumber,
      white,
      black,
      whiteStep: i + 1,
      blackStep: black ? i + 2 : undefined,
    });
  }

  return (
    <div className="w-full bg-chess-card border border-chess-border rounded-xl shadow-md overflow-hidden flex flex-col h-[280px] sm:h-[320px]">
      {/* Header */}
      <div className="bg-chess-surface px-4 py-2 border-b border-chess-border/80 flex items-center justify-between text-xs font-semibold text-gray-400 select-none">
        <span className="w-8">#</span>
        <span className="flex-1 text-center">Beyaz</span>
        <span className="flex-1 text-center">Siyah</span>
      </div>

      {/* Move list */}
      <div className="flex-1 overflow-y-auto divide-y divide-chess-border/30 p-1 text-xs">
        {movePairs.map((pair) => {
          const isWhiteActive = currentStep === pair.whiteStep;
          const isBlackActive = currentStep === pair.blackStep;

          return (
            <div
              key={pair.moveNumber}
              ref={isWhiteActive || isBlackActive ? activeRowRef : null}
              className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-chess-surface/50 transition-colors"
            >
              {/* Move Number */}
              <span className="w-8 font-mono text-gray-500 font-semibold select-none">
                {pair.moveNumber}.
              </span>

              {/* White Move */}
              <div className="flex-1 flex justify-center">
                {pair.white && (
                  <button
                    type="button"
                    onClick={() => onSelectStep(pair.whiteStep)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all cursor-pointer font-mono font-medium ${
                      isWhiteActive
                        ? 'bg-chess-accent text-chess-dark font-extrabold shadow'
                        : 'text-gray-100 hover:bg-chess-surface'
                    }`}
                  >
                    <span>{pair.white.san}</span>
                    {pair.white.classification && (
                      <ClassificationBadge
                        classification={pair.white.classification}
                        showText={false}
                        size="sm"
                      />
                    )}
                  </button>
                )}
              </div>

              {/* Black Move */}
              <div className="flex-1 flex justify-center">
                {pair.black && (
                  <button
                    type="button"
                    onClick={() => onSelectStep(pair.blackStep!)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all cursor-pointer font-mono font-medium ${
                      isBlackActive
                        ? 'bg-chess-accent text-chess-dark font-extrabold shadow'
                        : 'text-gray-100 hover:bg-chess-surface'
                    }`}
                  >
                    <span>{pair.black.san}</span>
                    {pair.black.classification && (
                      <ClassificationBadge
                        classification={pair.black.classification}
                        showText={false}
                        size="sm"
                      />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
