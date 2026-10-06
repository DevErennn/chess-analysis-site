import React from 'react';
import { Chessboard } from 'react-chessboard';
import type { Arrow } from 'react-chessboard';
import type { MoveAnalysis } from '../../types/chess';
import { ClassificationBadge } from './ClassificationBadge';
import { CLASSIFICATION_CONFIG } from './constants';
import { Sparkles } from 'lucide-react';

interface BoardWithArrowsProps {
  fen: string;
  orientation: 'white' | 'black';
  activeMove?: MoveAnalysis;
  showBestMoveArrow?: boolean;
  isSandboxMode?: boolean;
  onPieceDrop?: (sourceSquare: string, targetSquare: string) => boolean;
  customArrows?: Arrow[];
}

export const BoardWithArrows: React.FC<BoardWithArrowsProps> = ({
  fen,
  orientation,
  activeMove,
  showBestMoveArrow = true,
  isSandboxMode = false,
  onPieceDrop,
  customArrows,
}) => {
  // Build arrows using react-chessboard Arrow type
  const arrows: Arrow[] = customArrows ? [...customArrows] : [];
  const squareStyles: Record<string, React.CSSProperties> = {};

  const isBrilliant = !isSandboxMode && activeMove?.classification === 'brilliant';

  if (!isSandboxMode && activeMove) {
    // 1. Highlight the played move squares
    if (isBrilliant) {
      squareStyles[activeMove.from] = {
        backgroundColor: 'rgba(34, 211, 238, 0.25)',
      };
      squareStyles[activeMove.to] = {
        backgroundColor: 'rgba(34, 211, 238, 0.45)',
        boxShadow: '0 0 22px rgba(34, 211, 238, 0.9), inset 0 0 12px rgba(20, 184, 166, 0.8)',
      };
      arrows.push({
        startSquare: activeMove.from,
        endSquare: activeMove.to,
        color: 'rgba(34, 211, 238, 0.95)',
      });
    } else {
      const playedColor = activeMove.classification === 'blunder'
        ? 'rgba(250, 65, 45, 0.4)'
        : activeMove.classification === 'mistake'
        ? 'rgba(230, 145, 44, 0.4)'
        : 'rgba(240, 193, 92, 0.35)';

      squareStyles[activeMove.from] = { backgroundColor: playedColor };
      squareStyles[activeMove.to] = { backgroundColor: playedColor };

      // Played move arrow for mistakes and blunders
      if (activeMove.classification === 'blunder' || activeMove.classification === 'mistake') {
        arrows.push({
          startSquare: activeMove.from,
          endSquare: activeMove.to,
          color: CLASSIFICATION_CONFIG[activeMove.classification].color,
        });
      }
    }

    // 2. Best move arrow (green/teal)
    if (showBestMoveArrow && !isBrilliant && activeMove.bestMoveUci && activeMove.bestMoveUci !== '(none)') {
      const bestFrom = activeMove.bestMoveUci.slice(0, 2);
      const bestTo = activeMove.bestMoveUci.slice(2, 4);

      if (bestFrom !== activeMove.from || bestTo !== activeMove.to) {
        arrows.push({
          startSquare: bestFrom,
          endSquare: bestTo,
          color: 'rgba(38, 194, 163, 0.9)',
        });
        squareStyles[bestTo] = {
          ...squareStyles[bestTo],
          boxShadow: 'inset 0 0 10px rgba(38, 194, 163, 0.7)',
        };
      }
    }
  }

  const handlePieceDrop = ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }): boolean => {
    if (!isSandboxMode || !onPieceDrop || !targetSquare) return false;
    return onPieceDrop(sourceSquare, targetSquare);
  };

  return (
    <div
      className={`relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 select-none ${
        isBrilliant
          ? 'border-2 border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.55)] ring-2 ring-cyan-400/80 animate-pulse'
          : isSandboxMode
          ? 'border-2 border-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.35)]'
          : 'border-2 border-chess-border'
      }`}
    >
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          allowDragging: isSandboxMode,
          onPieceDrop: handlePieceDrop as any,
          arrows,
          squareStyles,
          darkSquareStyle: { backgroundColor: '#769656' },
          lightSquareStyle: { backgroundColor: '#eeeed2' },
          animationDurationInMs: 180,
        }}
      />

      {/* Brilliant Celebration Banner */}
      {isBrilliant && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-black text-xs shadow-[0_0_20px_rgba(6,182,212,0.85)] border border-cyan-300 animate-bounce">
          <Sparkles className="w-3.5 h-3.5 text-yellow-200 fill-yellow-200" />
          <span>GÖZ ALICI FEDA! (!!)</span>
        </div>
      )}

      {/* Floating Classification Badge on top right of board */}
      {!isSandboxMode && activeMove?.classification && (
        <div className="absolute top-3 right-3 z-10 animate-in fade-in zoom-in duration-200">
          <div className="shadow-2xl rounded-lg overflow-hidden backdrop-blur-md">
            <ClassificationBadge
              classification={activeMove.classification}
              size="lg"
              className={`shadow-lg border-2 ${isBrilliant ? 'border-cyan-400 ring-2 ring-cyan-400/60' : ''}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};
