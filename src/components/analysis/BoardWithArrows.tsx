import React, { useRef, useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Arrow } from 'react-chessboard';
import type { MoveAnalysis } from '../../types/chess';
import { CLASSIFICATION_CONFIG } from './constants';
import { Sparkles } from 'lucide-react';

// Map classification -> image filename in /public/
const CLASSIFICATION_IMAGES: Record<string, string> = {
  brilliant: '/brilliant.png',
  great: '/great.png',
  best: '/best.png',
  excellent: '/excellent.png',
  good: '/good.png',
  inaccuracy: '/inaccuracy.png',
  mistake: '/mistake.png',
  blunder: '/blunder.png',
  book: '/book.png',
  miss: '/miss.png',
};

interface BoardWithArrowsProps {
  fen: string;
  orientation: 'white' | 'black';
  activeMove?: MoveAnalysis;
  showBestMoveArrow?: boolean;
  isSandboxMode?: boolean;
  onPieceDrop?: (sourceSquare: string, targetSquare: string) => boolean;
  customArrows?: Arrow[];
}

/**
 * Converts a UCI square (e.g. "e5") to fractional [col, row] position
 * on the board from top-left (0..1), accounting for orientation.
 */
function squareToFraction(
  square: string,
  orientation: 'white' | 'black'
): { x: number; y: number } {
  const file = square.charCodeAt(0) - 97; // a=0 .. h=7
  const rank = parseInt(square[1], 10) - 1;  // 1=0 .. 8=7

  const col = orientation === 'white' ? file : 7 - file;
  const row = orientation === 'white' ? 7 - rank : rank;

  return {
    x: (col + 0.5) / 8,
    y: (row + 0.5) / 8,
  };
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
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(0);

  // Track rendered board size for icon positioning
  useEffect(() => {
    if (!boardRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setBoardSize(entry.contentRect.width);
    });
    observer.observe(boardRef.current);
    return () => observer.disconnect();
  }, []);

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

  // Compute icon position on the destination square
  const iconOverlay = activeMove?.classification && activeMove.to && boardSize > 0
    ? (() => {
        const imgSrc = CLASSIFICATION_IMAGES[activeMove.classification];
        if (!imgSrc) return null;

        const squareSize = boardSize / 8;
        const iconSize = Math.round(squareSize * 0.42); // 42% of square width

        // Top-left corner of the destination square
        const { x, y } = squareToFraction(activeMove.to, orientation);
        const squareCenterX = x * boardSize;
        const squareCenterY = y * boardSize;

        return {
          imgSrc,
          left: Math.round(squareCenterX - squareSize / 2),       // left edge of square
          top: Math.round(squareCenterY - squareSize / 2),         // top edge of square
          size: iconSize,
        };
      })()
    : null;

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
      <div ref={boardRef} className="w-full h-full">
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
      </div>

      {/* Classification icon on top of the destination square */}
      {iconOverlay && (
        <img
          key={`${activeMove!.to}-${activeMove!.classification}`}
          src={iconOverlay.imgSrc}
          alt={activeMove!.classification}
          style={{
            position: 'absolute',
            left: iconOverlay.left,
            top: iconOverlay.top,
            width: iconOverlay.size,
            height: iconOverlay.size,
            pointerEvents: 'none',
            zIndex: 20,
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))',
          }}
          className="animate-in zoom-in-50 fade-in duration-200"
        />
      )}

      {/* Brilliant Celebration Banner */}
      {isBrilliant && (
        <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-black text-xs shadow-[0_0_20px_rgba(6,182,212,0.85)] border border-cyan-300 animate-bounce">
          <Sparkles className="w-3.5 h-3.5 text-yellow-200 fill-yellow-200" />
          <span>GÖZ ALICI FEDA! (!!)</span>
        </div>
      )}
    </div>
  );
};
