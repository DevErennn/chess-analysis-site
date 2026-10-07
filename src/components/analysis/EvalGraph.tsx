import React, { useMemo, useState } from 'react';
import type { MoveAnalysis } from '../../types/chess';
import { calculateWinChance } from '../../lib/moveClassifier';

interface EvalGraphProps {
  moves: MoveAnalysis[];
  currentStep: number;
  onSelectStep: (step: number) => void;
  height?: number;
}

export const EvalGraph: React.FC<EvalGraphProps> = ({
  moves,
  currentStep,
  onSelectStep,
  height = 80,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Construct array of points [initial position, ...after each move]
  const points = useMemo(() => {
    // Step 0 is initial position
    const evalList: number[] = [50]; // start at 50% win chance

    for (const m of moves) {
      if (m.evalAfter !== undefined || m.mateAfter !== undefined) {
        evalList.push(calculateWinChance(m.evalAfter, m.mateAfter));
      } else {
        // Fallback if not analyzed yet
        evalList.push(evalList[evalList.length - 1] ?? 50);
      }
    }
    return evalList;
  }, [moves]);

  if (points.length <= 1) return null;

  const totalPoints = points.length;
  const width = 1000;
  const graphHeight = height;
  const midY = graphHeight / 2;

  // Convert win chances (0-100) to SVG Y coordinates:
  const coords = points.map((p, idx) => {
    const x = (idx / (totalPoints - 1)) * width;
    const y = graphHeight - (p / 100) * (graphHeight - 8) - 4;
    return { x, y, idx, winChance: p };
  });

  // Build SVG path
  const linePath = coords.reduce((acc, curr, index) => {
    return `${acc} ${index === 0 ? 'M' : 'L'} ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }, '');

  // Fill area between line and mid line
  const areaPath = `${linePath} L ${width} ${midY} L 0 ${midY} Z`;

  const currentCoord = coords[Math.min(currentStep, coords.length - 1)] || coords[0];
  const activeHoverCoord = hoverIndex !== null ? coords[hoverIndex] : null;

  // Hovered move details
  const hoveredMove = hoverIndex !== null && hoverIndex > 0 ? moves[hoverIndex - 1] : undefined;

  return (
    <div className="w-full bg-chess-card border border-chess-border rounded-xl p-3 shadow-lg select-none">
      <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5 px-1 h-5">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-chess-accent inline-block" />
          <span>Değerlendirme Akışı</span>
        </span>

        {/* Dynamic Tooltip / Current Step info */}
        {hoverIndex !== null ? (
          <span className="text-white font-mono text-[11px] bg-chess-surface px-2 py-0.5 rounded border border-chess-border flex items-center gap-1.5 shadow-sm">
            {hoverIndex === 0 ? (
              <span className="text-gray-300">Başlangıç (50-50)</span>
            ) : hoveredMove ? (
              <>
                <strong className="text-chess-accent font-bold">
                  {hoveredMove.moveNumber}{hoveredMove.color === 'w' ? '.' : '...'} {hoveredMove.san}
                </strong>
                <span className="text-gray-500">|</span>
                <span className="text-emerald-400 font-semibold">
                  %{activeHoverCoord?.winChance.toFixed(0)} Kazanma
                </span>
                {hoveredMove.evalAfter !== undefined && (
                  <span className="text-gray-400 text-[10px]">
                    ({(hoveredMove.evalAfter / 100 > 0 ? '+' : '') + (hoveredMove.evalAfter / 100).toFixed(1)})
                  </span>
                )}
              </>
            ) : null}
          </span>
        ) : (
          <span className="font-mono text-gray-300 text-[11px]">
            Hamle {currentStep === 0 ? 0 : moves[currentStep - 1]?.moveNumber ?? Math.ceil(currentStep / 2)} / {Math.ceil(moves.length / 2)}
          </span>
        )}
      </div>

      <div className="relative w-full overflow-hidden rounded-lg bg-chess-surface border border-chess-border/60">
        <svg
          viewBox={`0 0 ${width} ${graphHeight}`}
          className="w-full h-20 overflow-visible cursor-pointer"
          preserveAspectRatio="none"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const ratio = Math.max(0, Math.min(1, clickX / rect.width));
            const targetStep = Math.round(ratio * (totalPoints - 1));
            setHoverIndex(targetStep);
          }}
          onMouseLeave={() => setHoverIndex(null)}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const ratio = Math.max(0, Math.min(1, clickX / rect.width));
            const targetStep = Math.round(ratio * (totalPoints - 1));
            onSelectStep(targetStep);
          }}
        >
          {/* Zero baseline (50% win chance) */}
          <line
            x1="0"
            y1={midY}
            x2={width}
            y2={midY}
            stroke="#4a4743"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />

          {/* Area fill */}
          <path
            d={areaPath}
            fill="url(#evalGradient)"
            opacity="0.35"
          />

          {/* Line stroke */}
          <path
            d={linePath}
            fill="none"
            stroke="#81b64c"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover indicator line & dot */}
          {activeHoverCoord && (
            <>
              <line
                x1={activeHoverCoord.x}
                y1="0"
                x2={activeHoverCoord.x}
                y2={graphHeight}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.9"
              />
              <circle
                cx={activeHoverCoord.x}
                cy={activeHoverCoord.y}
                r="4.5"
                fill="#38bdf8"
                stroke="#0f172a"
                strokeWidth="1.5"
              />
            </>
          )}

          {/* Current position indicator vertical line */}
          <line
            x1={currentCoord.x}
            y1="0"
            x2={currentCoord.x}
            y2={graphHeight}
            stroke="#ffffff"
            strokeWidth="1.5"
            opacity="0.8"
          />

          {/* Current position indicator dot */}
          <circle
            cx={currentCoord.x}
            cy={currentCoord.y}
            r="5"
            fill="#ffffff"
            stroke="#81b64c"
            strokeWidth="2"
            className="animate-pulse"
          />

          {/* Gradient Definition */}
          <defs>
            <linearGradient id="evalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#81b64c" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#81b64c" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#fa412d" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};
