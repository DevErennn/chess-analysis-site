import React from 'react';

interface EvalBarProps {
  cp?: number;
  mate?: number | null;
  orientation?: 'white' | 'black';
  height?: number | string;
}

export const EvalBar: React.FC<EvalBarProps> = ({
  cp = 0,
  mate = null,
  orientation = 'white',
  height = '100%',
}) => {
  // Calculate percentage of White's share of the bar (0 to 100)
  let whitePercent = 50;

  if (mate !== null && mate !== undefined) {
    whitePercent = mate > 0 ? 100 : 0;
  } else {
    const clampedCp = Math.max(-2500, Math.min(2500, cp));
    whitePercent = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clampedCp)) - 1);
  }

  // Format display text
  let label = '0.0';
  if (mate !== null && mate !== undefined) {
    label = `M${Math.abs(mate)}`;
  } else {
    const evalNumber = cp / 100;
    label = evalNumber > 0 ? `+${evalNumber.toFixed(1)}` : evalNumber.toFixed(1);
  }

  const isAdvantageWhite = (mate !== null && mate > 0) || (mate === null && cp >= 0);
  const displayPercent = orientation === 'white' ? whitePercent : 100 - whitePercent;

  return (
    <div
      style={{ height }}
      className="relative w-6 sm:w-8 h-full bg-[#1f1e1b] rounded-xl overflow-hidden shadow-inner flex flex-col justify-between border border-chess-border select-none shrink-0"
      title={`Değerlendirme: ${label}`}
    >
      {/* Black Area (Top) */}
      <div
        className="w-full bg-[#1b1a17] transition-all duration-300 ease-out relative flex items-start justify-center pt-1.5"
        style={{ height: `${100 - displayPercent}%` }}
      >
        {!isAdvantageWhite && (
          <span className="text-[10px] font-black text-gray-300 tracking-tight font-mono z-10 drop-shadow">
            {label}
          </span>
        )}
      </div>

      {/* White Area (Bottom) */}
      <div
        className="w-full bg-[#f1f1f1] transition-all duration-300 ease-out relative flex items-end justify-center pb-1.5"
        style={{ height: `${displayPercent}%` }}
      >
        {isAdvantageWhite && (
          <span className="text-[10px] font-black text-gray-900 tracking-tight font-mono z-10 drop-shadow">
            {label}
          </span>
        )}
      </div>
    </div>
  );
};
