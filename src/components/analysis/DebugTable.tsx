import React, { useState } from 'react';
import { Bug, ChevronDown, ChevronUp } from 'lucide-react';
import type { MoveAnalysis } from '../../types/chess';
import { CLASSIFICATION_CONFIG } from './constants';

interface DebugTableProps {
  moves: MoveAnalysis[];
  currentStep: number;
  onSelectStep: (step: number) => void;
}

export const DebugTable: React.FC<DebugTableProps> = ({
  moves,
  currentStep,
  onSelectStep,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  if (moves.length === 0) return null;

  return (
    <div className="w-full rounded-2xl bg-slate-950 border border-amber-500/40 shadow-2xl overflow-hidden font-mono text-xs">
      {/* Header Bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-3 bg-amber-950/40 border-b border-amber-500/30 flex items-center justify-between cursor-pointer select-none hover:bg-amber-950/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-amber-200">Geliştirici Teşhis & Debug Tablosu (?debug=1)</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {moves.length} Hamle
          </span>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <span className="text-[11px] hidden sm:inline">Eval, Win%, Kayıp & Motor Verisi</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded Table */}
      {isOpen && (
        <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900/90 text-gray-400 text-[11px] sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="p-2.5">#</th>
                <th className="p-2.5">Hamle</th>
                <th className="p-2.5">Taraf</th>
                <th className="p-2.5 text-right">Eval Önce</th>
                <th className="p-2.5 text-right">Eval Sonra</th>
                <th className="p-2.5 text-right">Win% Önce</th>
                <th className="p-2.5 text-right">Win% Sonra</th>
                <th className="p-2.5 text-right text-amber-300">Kayıp (Loss)</th>
                <th className="p-2.5">En İyi (Best)</th>
                <th className="p-2.5">Oynanan (UCI)</th>
                <th className="p-2.5 text-center">Best?</th>
                <th className="p-2.5">Sınıflandırma</th>
                <th className="p-2.5">Açıklama</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-gray-300 text-[11px]">
              {moves.map((m, idx) => {
                const isSelected = currentStep === idx + 1;
                const playedUci = `${m.from}${m.to}`.toLowerCase();
                const bestUci = (m.bestMoveUci || '').toLowerCase().slice(0, 4);
                const isBest = playedUci === bestUci;
                const cfg = m.classification ? CLASSIFICATION_CONFIG[m.classification] : null;

                const formatEval = (cp?: number, mate?: number | null) => {
                  if (mate !== null && mate !== undefined) {
                    return `#${mate > 0 ? `+${mate}` : mate}`;
                  }
                  if (cp === undefined) return '-';
                  const val = (cp / 100).toFixed(2);
                  return cp > 0 ? `+${val}` : val;
                };

                return (
                  <tr
                    key={idx}
                    onClick={() => onSelectStep(idx + 1)}
                    className={`hover:bg-slate-800/60 cursor-pointer transition-colors ${
                      isSelected ? 'bg-amber-500/15 font-semibold text-white' : ''
                    }`}
                  >
                    <td className="p-2 text-gray-500">{m.moveNumber}{m.color === 'w' ? '.' : '...'}</td>
                    <td className="p-2 font-bold text-white flex items-center gap-1">
                      <span>{m.san}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                    </td>
                    <td className="p-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${m.color === 'w' ? 'bg-white/10 text-gray-200' : 'bg-black/40 text-gray-400'}`}>
                        {m.color === 'w' ? 'Beyaz' : 'Siyah'}
                      </span>
                    </td>
                    <td className="p-2 text-right font-mono">{formatEval(m.evalBefore, m.mateBefore)}</td>
                    <td className="p-2 text-right font-mono">{formatEval(m.evalAfter, m.mateAfter)}</td>
                    <td className="p-2 text-right font-mono text-cyan-400">
                      {m.winChanceBefore !== undefined ? `%${m.winChanceBefore.toFixed(1)}` : '-'}
                    </td>
                    <td className="p-2 text-right font-mono text-cyan-400">
                      {m.winChanceAfter !== undefined ? `%${m.winChanceAfter.toFixed(1)}` : '-'}
                    </td>
                    <td className="p-2 text-right font-mono font-bold">
                      {m.winChanceLoss !== undefined ? (
                        <span className={m.winChanceLoss > 10 ? 'text-red-400' : m.winChanceLoss > 4 ? 'text-amber-400' : 'text-emerald-400'}>
                          %{m.winChanceLoss.toFixed(1)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-2 text-emerald-400 font-mono">
                      {m.bestMoveSan || m.bestMoveUci || '-'}
                    </td>
                    <td className="p-2 text-gray-400 font-mono">{playedUci}</td>
                    <td className="p-2 text-center">
                      {isBest ? (
                        <span className="text-emerald-400 font-bold">✓</span>
                      ) : (
                        <span className="text-gray-600">✗</span>
                      )}
                    </td>
                    <td className="p-2">
                      {cfg && (
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`}>
                          {cfg.symbol} {cfg.label}
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-gray-400 max-w-[280px] truncate" title={m.comment}>
                      {m.comment || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
