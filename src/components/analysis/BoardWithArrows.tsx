import React from 'react';
import { Chessboard } from 'react-chessboard';
import type { Arrow } from 'react-chessboard';
import type { MoveAnalysis } from '../../types/chess';
import { ClassificationBadge } from './ClassificationBadge';
import { CLASSIFICATION_CONFIG } from './constants';

interface BoardWithArrowsProps {
  fen: string;
  orientation: 'white' | 'black';
  activeMove?: MoveAnalysis;
  showBestMoveArrow?: boolean;
}

export const BoardWithArrows: React.FC<BoardWithArrowsProps> = ({
  fen,
  orientation,
  activeMove,
  showBestMoveArrow = true,
}) => {
  // Build arrows using react-chessboard Arrow type
  const arrows: Arrow[] = [];
  const squareStyles: Record<string, React.CSSProperties> = {};

  if (activeMove) {
    // 1. Highlight the played move squares
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

    // 2. Best move arrow (green/teal)
    if (showBestMoveArrow && activeMove.bestMoveUci && activeMove.bestMoveUci !== '(none)') {
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

  return (
    <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border-2 border-chess-border select-none">
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          allowDragging: false,
          arrows,
          squareStyles,
          darkSquareStyle: { backgroundColor: '#769656' },
          lightSquareStyle: { backgroundColor: '#eeeed2' },
          animationDurationInMs: 200,
        }}
      />

      {/* Floating Classification Badge on top right of board */}
      {activeMove?.classification && (
        <div className="absolute top-3 right-3 z-10 animate-in fade-in zoom-in duration-200">
          <div className="shadow-2xl rounded-lg overflow-hidden backdrop-blur-md">
            <ClassificationBadge
              classification={activeMove.classification}
              size="lg"
              className="shadow-lg border-2"
            />
          </div>
        </div>
      )}
    </div>
  );
};
