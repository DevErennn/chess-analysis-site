import React, { useState, useEffect } from 'react';
import { Layers, ChevronDown, ChevronUp, RefreshCw, Cpu } from 'lucide-react';
import type { MultiPvCandidate } from '../../types/chess';
import { getStockfishService } from '../../lib/stockfishService';

interface MultiPvPanelProps {
  fen: string;
  isSandboxMode?: boolean;
}

export const MultiPvPanel: React.FC<MultiPvPanelProps> = ({
  fen,
  isSandboxMode: _isSandboxMode = false,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<MultiPvCandidate[]>([]);
  const [autoEvaluate, setAutoEvaluate] = useState(true);

  const fetchMultiPv = async (targetFen: string) => {
    setLoading(true);
    try {
      const stockfish = getStockfishService();
      const results = await stockfish.evaluatePositionMultiPv(targetFen, 11, 3);
      setLines(results);
    } catch (err) {
      console.error('MultiPV evaluation error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!autoEvaluate || !fen) return;

    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        fetchMultiPv(fen);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [fen, autoEvaluate]);

  const formatScore = (candidate: MultiPvCandidate) => {
    if (candidate.mate !== null && candidate.mate !== undefined) {
      return `#${candidate.mate > 0 ? `+${candidate.mate}` : candidate.mate}`;
    }
    const val = (candidate.cp ?? 0) / 100;
    return (val > 0 ? `+` : '') + val.toFixed(2);
  };

  const getScoreColor = (candidate: MultiPvCandidate) => {
    if (candidate.mate !== null && candidate.mate !== undefined) {
      return candidate.mate > 0 ? 'text-amber-400 bg-amber-500/10' : 'text-red-400 bg-red-500/10';
    }
    const cp = candidate.cp ?? 0;
    if (cp > 50) return 'text-emerald-400 bg-emerald-500/10';
    if (cp < -50) return 'text-red-400 bg-red-500/10';
    return 'text-gray-300 bg-white/5';
  };

  return (
    <div className="w-full max-w-[500px] rounded-xl bg-chess-card/90 border border-chess-border shadow-md overflow-hidden transition-all">
      {/* Header Bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-3.5 py-2.5 bg-chess-surface/90 hover:bg-chess-surface flex items-center justify-between cursor-pointer select-none border-b border-chess-border/50"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white">Alternatif Motor Hatları (Multi-PV)</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono font-medium">
            En İyi 3
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fetchMultiPv(fen);
            }}
            disabled={loading}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-chess-card transition-colors"
            title="Yeniden Hesapla"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-2.5 space-y-2 text-xs">
          {loading && lines.length === 0 ? (
            <div className="py-4 text-center text-gray-400 flex items-center justify-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>Pozisyon varyantları hesaplanıyor...</span>
            </div>
          ) : lines.length === 0 ? (
            <div className="py-3 text-center text-gray-500 text-[11px]">
              Alternatif hat bulunamadı veya oyun sona erdi.
            </div>
          ) : (
            lines.map((line, idx) => (
              <div
                key={line.multipv || idx}
                className="p-2 rounded-lg bg-chess-surface/60 border border-chess-border/60 hover:border-cyan-500/40 transition-colors flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {/* Rank badge */}
                  <span className={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-[11px] shrink-0 ${
                    idx === 0
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                      : idx === 1
                      ? 'bg-slate-300/15 text-slate-300 border border-slate-400/20'
                      : 'bg-amber-700/20 text-amber-500 border border-amber-600/20'
                  }`}>
                    {idx + 1}
                  </span>

                  {/* Best move SAN */}
                  <span className="font-mono font-bold text-white text-xs shrink-0">
                    {line.bestMoveSan || line.bestMoveUci}
                  </span>

                  {/* Continuation line */}
                  <div className="text-[11px] text-gray-400 truncate font-mono">
                    {line.pvSanList && line.pvSanList.length > 1
                      ? line.pvSanList.slice(1).join(' ')
                      : line.pv}
                  </div>
                </div>

                {/* Score badge */}
                <div className={`px-2 py-0.5 rounded font-mono font-bold text-xs shrink-0 border border-white/5 ${getScoreColor(line)}`}>
                  {formatScore(line)}
                </div>
              </div>
            ))
          )}

          {/* Sub-footer toggle */}
          <div className="pt-1.5 flex items-center justify-between text-[11px] text-gray-400 border-t border-chess-border/40 px-1">
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-gray-500" />
              Stockfish 10 & 16 WASM Derinlik 11
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer text-gray-300 hover:text-white select-none">
              <input
                type="checkbox"
                checked={autoEvaluate}
                onChange={(e) => setAutoEvaluate(e.target.checked)}
                className="w-3 h-3 rounded bg-chess-surface accent-cyan-400 cursor-pointer"
              />
              <span>Otomatik Analiz</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
