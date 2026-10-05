import React, { useState, useId } from 'react';
import { 
  FileText, 
  Sparkles, 
  Play, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Swords, 
  Calendar,
  Layers
} from 'lucide-react';
import { SAMPLE_PGN, validatePgn, parsePgnMetadata } from '../../lib/chessUtils';
import type { GameMetadata } from '../../types/chess';

interface PgnInputCardProps {
  onSelectGame: (pgn: string, metadata: GameMetadata) => void;
}

export const PgnInputCard: React.FC<PgnInputCardProps> = ({ onSelectGame }) => {
  const [pgnText, setPgnText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<GameMetadata | null>(null);
  const textareaId = useId();

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setPgnText(value);
    setError(null);

    if (value.trim()) {
      if (validatePgn(value)) {
        try {
          const meta = parsePgnMetadata(value);
          setSuccessInfo(meta);
        } catch {
          setSuccessInfo(null);
        }
      } else {
        setSuccessInfo(null);
      }
    } else {
      setSuccessInfo(null);
    }
  };

  const handleLoadSample = () => {
    setPgnText(SAMPLE_PGN);
    setError(null);
    const meta = parsePgnMetadata(SAMPLE_PGN);
    setSuccessInfo(meta);
  };

  const handleClear = () => {
    setPgnText('');
    setError(null);
    setSuccessInfo(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!pgnText.trim()) {
      setError('Lütfen analiz edilecek bir PGN metni yapıştırın.');
      return;
    }

    if (!validatePgn(pgnText)) {
      setError('Geçersiz veya hamlesiz PGN formatı! Lütfen geçerli standart satranç hamleleri içeren bir PGN girin.');
      return;
    }

    const metadata = parsePgnMetadata(pgnText);
    onSelectGame(pgnText, metadata);
  };

  return (
    <div className="bg-chess-card border border-chess-border rounded-2xl p-6 sm:p-7 shadow-xl shadow-black/40 transition-all duration-200 hover:border-chess-border/80">
      <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-chess-border/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-chess-accent/15 border border-chess-accent/30 flex items-center justify-center text-chess-accent">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              PGN Metni Yapıştır
            </h2>
            <p className="text-xs text-gray-400">
              Chess.com, Lichess veya herhangi bir PGN dosyasından kopyaladığınız maç
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLoadSample}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-chess-surface hover:bg-chess-cardHover border border-chess-border text-xs font-medium text-chess-accent hover:text-chess-accentHover transition-all duration-200 hover:scale-[1.02] shadow-sm cursor-pointer"
          title="Kasparov vs Topalov (1999) 'Kasparov's Immortal' maçını yükle"
        >
          <Sparkles className="w-3.5 h-3.5 text-chess-accent" />
          <span className="hidden sm:inline">Örnek Maç:</span>
          <span>Kasparov vs Topalov</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <label htmlFor={textareaId} className="sr-only">
            PGN Metni
          </label>
          <textarea
            id={textareaId}
            rows={8}
            value={pgnText}
            onChange={handleTextChange}
            placeholder={`[Event "World Championship"]\n[White "Carlsen, Magnus"]\n[Black "Nepomniachtchi, Ian"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O...`}
            className="w-full bg-chess-surface border border-chess-border focus:border-chess-accent focus:ring-1 focus:ring-chess-accent/50 rounded-xl p-4 text-sm font-mono text-gray-200 placeholder-gray-500/70 outline-none resize-y transition-colors duration-200 leading-relaxed"
            spellCheck={false}
          />

          <div className="flex items-center justify-between text-xs text-gray-400 mt-2 px-1">
            <div className="flex items-center gap-2">
              {pgnText.trim() && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1 text-red-400/80 hover:text-red-300 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Temizle</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span>{pgnText.length.toLocaleString('tr-TR')} karakter</span>
            </div>
          </div>
        </div>

        {/* Dynamic validation / metadata preview */}
        {successInfo && (
          <div className="bg-chess-surface/90 border border-chess-accent/30 rounded-xl p-3.5 text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-chess-accent font-medium mb-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Geçerli PGN Algılandı</span>
              {successInfo.result && (
                <span className="ml-auto px-2 py-0.5 rounded bg-chess-dark border border-chess-border font-mono text-gray-300">
                  Sonuç: {successInfo.result}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-300 pt-1">
              <div className="flex items-center gap-2 bg-chess-card/80 px-2.5 py-1.5 rounded-lg border border-chess-border/50">
                <span className="w-2.5 h-2.5 rounded-full bg-white border border-gray-400 shrink-0" />
                <span className="truncate font-medium">{successInfo.white.name}</span>
                {successInfo.white.rating && (
                  <span className="text-gray-400 ml-auto font-mono text-[11px]">
                    ({successInfo.white.rating})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 bg-chess-card/80 px-2.5 py-1.5 rounded-lg border border-chess-border/50">
                <span className="w-2.5 h-2.5 rounded-full bg-black border border-gray-500 shrink-0" />
                <span className="truncate font-medium">{successInfo.black.name}</span>
                {successInfo.black.rating && (
                  <span className="text-gray-400 ml-auto font-mono text-[11px]">
                    ({successInfo.black.rating})
                  </span>
                )}
              </div>
            </div>

            {(successInfo.event || successInfo.opening) && (
              <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-chess-border/40 text-gray-400 text-[11px]">
                {successInfo.event && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gray-500" />
                    <span className="truncate max-w-[200px]">{successInfo.event}</span>
                  </span>
                )}
                {successInfo.opening && (
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-gray-500" />
                    <span className="truncate max-w-[240px] text-gray-300">{successInfo.opening}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full group flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-chess-accent hover:bg-chess-accentHover text-chess-dark font-bold text-sm transition-all duration-200 hover:scale-[1.01] shadow-lg shadow-chess-accent/20 cursor-pointer active:scale-[0.99]"
        >
          <Play className="w-4 h-4 fill-chess-dark transition-transform duration-200 group-hover:scale-110" />
          <span>Analizi Başlat</span>
          <Swords className="w-4 h-4 opacity-60 ml-1" />
        </button>
      </form>
    </div>
  );
};
