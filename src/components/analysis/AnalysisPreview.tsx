import React, { useState, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  Trophy, 
  Copy, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  RotateCcw,
  Layers,
  Clock
} from 'lucide-react';
import type { GameMetadata } from '../../types/chess';
import { formatGameResult } from '../../lib/chessUtils';

interface AnalysisPreviewProps {
  pgn: string;
  metadata: GameMetadata;
  onBack: () => void;
}

export const AnalysisPreview: React.FC<AnalysisPreviewProps> = ({
  pgn,
  metadata,
  onBack,
}) => {
  const [copied, setCopied] = useState(false);

  // Parse moves from PGN
  const { moves, fens } = useMemo(() => {
    try {
      const chess = new Chess();
      chess.loadPgn(pgn);
      const moveHistory = chess.history({ verbose: true });

      // Re-play to collect FEN at each step
      const replay = new Chess();
      const fenList: string[] = [replay.fen()];

      for (const move of moveHistory) {
        replay.move(move);
        fenList.push(replay.fen());
      }

      return {
        moves: moveHistory,
        fens: fenList,
      };
    } catch {
      return { moves: [], fens: ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'] };
    }
  }, [pgn]);

  const [currentStep, setCurrentStep] = useState<number>(() => {
    // Start at the final position or first position
    return fens.length > 0 ? fens.length - 1 : 0;
  });

  const currentFen = fens[currentStep] || fens[0] || 'start';

  const handleCopyPgn = async () => {
    try {
      await navigator.clipboard.writeText(pgn);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const resultInfo = formatGameResult(
    metadata.result,
    metadata.white.name,
    metadata.black.name
  );

  return (
    <div className="min-h-screen bg-chess-dark text-gray-100 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-chess-border/70 bg-chess-surface/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-chess-card hover:bg-chess-cardHover border border-chess-border text-xs font-semibold text-gray-200 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-chess-accent" />
              <span>Geri Dön</span>
            </button>

            <div className="h-4 w-px bg-chess-border hidden sm:block" />

            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-300">
              <span className="font-semibold text-white truncate max-w-[150px]">
                {metadata.white.name}
              </span>
              <span className="text-gray-500">vs</span>
              <span className="font-semibold text-white truncate max-w-[150px]">
                {metadata.black.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPgn}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-chess-card hover:bg-chess-cardHover border border-chess-border text-xs text-gray-300 transition-colors cursor-pointer"
              title="PGN'i Kopyala"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Kopyalandı!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>PGN Kopyala</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full space-y-6">
        {/* Step 2 Success & Step 3 Ready Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-chess-card via-chess-surface to-chess-card border border-chess-accent/40 shadow-xl shadow-chess-accent/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-chess-accent/20 border border-chess-accent/40 flex items-center justify-center text-chess-accent shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5 text-chess-accent" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Adım 2 Başarıyla Tamamlandı!
                  </h2>
                  <span className="px-2 py-0.5 rounded-md bg-chess-accent/20 border border-chess-accent/40 text-[11px] font-bold text-chess-accent">
                    Veri Girişi & Önizleme Hazır
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-300 mt-1">
                  Maç verileri ve PGN ayrıştırıldı. Sistem bir sonraki adım olan <strong>Adım 3: Stockfish Motoru & Hamle Sınıflandırması</strong> için tamamen hazır.
                </p>
              </div>
            </div>

            <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-chess-border/50">
              <div className="text-xs text-gray-400">Toplam Hamle</div>
              <div className="text-lg font-black text-white font-mono">
                {moves.length} <span className="text-xs font-normal text-gray-400">hamle</span>
              </div>
            </div>
          </div>
        </div>

        {/* Board & Metadata Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Interactive Chessboard */}
          <div className="lg:col-span-7 bg-chess-card border border-chess-border rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col items-center">
            {/* Black player bar */}
            <div className="w-full max-w-[480px] flex items-center justify-between pb-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-black border border-gray-500 shadow-sm" />
                <span className="font-bold text-gray-100 text-sm">{metadata.black.name}</span>
                {metadata.black.rating && (
                  <span className="text-gray-400 font-mono">({metadata.black.rating})</span>
                )}
              </div>
              {metadata.result === '0-1' && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[11px] border border-emerald-500/30">
                  Kazandı (0-1)
                </span>
              )}
            </div>

            {/* Chessboard */}
            <div className="w-full max-w-[480px] aspect-square rounded-xl overflow-hidden shadow-2xl border border-chess-border">
              <Chessboard
                options={{
                  position: currentFen,
                  allowDragging: false,
                  darkSquareStyle: { backgroundColor: '#769656' },
                  lightSquareStyle: { backgroundColor: '#eeeed2' },
                }}
              />
            </div>

            {/* White player bar */}
            <div className="w-full max-w-[480px] flex items-center justify-between pt-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-white border border-gray-400 shadow-sm" />
                <span className="font-bold text-gray-100 text-sm">{metadata.white.name}</span>
                {metadata.white.rating && (
                  <span className="text-gray-400 font-mono">({metadata.white.rating})</span>
                )}
              </div>
              {metadata.result === '1-0' && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[11px] border border-emerald-500/30">
                  Kazandı (1-0)
                </span>
              )}
            </div>

            {/* Move navigation controls */}
            <div className="w-full max-w-[480px] mt-4 pt-4 border-t border-chess-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentStep(0)}
                  disabled={currentStep === 0}
                  className="p-2 rounded-lg bg-chess-surface hover:bg-chess-cardHover disabled:opacity-40 disabled:cursor-not-allowed border border-chess-border text-gray-300 transition-colors cursor-pointer"
                  title="İlk Hamleye Git"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                  disabled={currentStep === 0}
                  className="p-2 rounded-lg bg-chess-surface hover:bg-chess-cardHover disabled:opacity-40 disabled:cursor-not-allowed border border-chess-border text-gray-300 transition-colors cursor-pointer"
                  title="Geri Hamle"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => Math.min(fens.length - 1, prev + 1))}
                  disabled={currentStep >= fens.length - 1}
                  className="p-2 rounded-lg bg-chess-surface hover:bg-chess-cardHover disabled:opacity-40 disabled:cursor-not-allowed border border-chess-border text-gray-300 transition-colors cursor-pointer"
                  title="İleri Hamle"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(fens.length - 1)}
                  disabled={currentStep >= fens.length - 1}
                  className="p-2 rounded-lg bg-chess-surface hover:bg-chess-cardHover disabled:opacity-40 disabled:cursor-not-allowed border border-chess-border text-gray-300 transition-colors cursor-pointer"
                  title="Son Hamleye Git"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-gray-400 font-mono">
                {currentStep === 0 ? (
                  <span>Başlangıç Pozisyonu</span>
                ) : (
                  <span>
                    Pozisyon: <strong>{currentStep}</strong> / {moves.length}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep(fens.length - 1)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-chess-surface hover:bg-chess-cardHover border border-chess-border text-xs text-gray-300 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-chess-accent" />
                <span>Sonuç</span>
              </button>
            </div>
          </div>

          {/* Right Column: Game Metadata & Move List */}
          <div className="lg:col-span-5 space-y-6">
            {/* Metadata Card */}
            <div className="bg-chess-card border border-chess-border rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2 pb-3 border-b border-chess-border/60">
                <Trophy className="w-4 h-4 text-chess-accent" />
                <span>Maç Detayları</span>
              </h3>

              <div className="space-y-3 text-xs">
                {/* Result */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-chess-surface border border-chess-border/60">
                  <span className="text-gray-400">Sonuç</span>
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span>{metadata.result}</span>
                    <span className="text-gray-400 font-normal">({resultInfo.label})</span>
                  </span>
                </div>

                {/* Event & Date */}
                {(metadata.event || metadata.date) && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-chess-surface border border-chess-border/60">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Etkinlik & Tarih</span>
                    </span>
                    <span className="font-medium text-gray-200 truncate max-w-[200px] text-right">
                      {metadata.event || ''} {metadata.date ? `(${metadata.date})` : ''}
                    </span>
                  </div>
                )}

                {/* Opening & ECO */}
                {(metadata.opening || metadata.eco) && (
                  <div className="flex items-start justify-between p-2.5 rounded-xl bg-chess-surface border border-chess-border/60">
                    <span className="text-gray-400 flex items-center gap-1 shrink-0">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Açılış</span>
                    </span>
                    <span className="font-medium text-gray-200 text-right truncate max-w-[220px]">
                      {metadata.eco ? `[${metadata.eco}] ` : ''}
                      {metadata.opening || 'Standart Açılış'}
                    </span>
                  </div>
                )}

                {/* Time Control */}
                {metadata.timeControl && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-chess-surface border border-chess-border/60">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Zaman Kontrolü</span>
                    </span>
                    <span className="font-mono text-gray-200">
                      {metadata.timeControl}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Move List Card */}
            <div className="bg-chess-card border border-chess-border rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-chess-border/60">
                <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-chess-accent" />
                  <span>Hamle Listesi ({moves.length})</span>
                </h3>
                <span className="text-[11px] text-gray-400">Hamleye tıkla</span>
              </div>

              <div className="max-h-[260px] overflow-y-auto pr-1 space-y-1 font-mono text-xs">
                {Array.from({ length: Math.ceil(moves.length / 2) }).map((_, turnIdx) => {
                  const whiteMoveIdx = turnIdx * 2;
                  const blackMoveIdx = turnIdx * 2 + 1;
                  const whiteMove = moves[whiteMoveIdx];
                  const blackMove = moves[blackMoveIdx];

                  return (
                    <div
                      key={turnIdx}
                      className="grid grid-cols-12 gap-1 items-center p-1 rounded-lg hover:bg-chess-surface/70 transition-colors"
                    >
                      <span className="col-span-2 text-gray-400 text-right pr-2">
                        {turnIdx + 1}.
                      </span>

                      {/* White Move */}
                      <button
                        type="button"
                        onClick={() => setCurrentStep(whiteMoveIdx + 1)}
                        className={`col-span-5 px-2 py-1 rounded text-left transition-colors cursor-pointer truncate ${
                          currentStep === whiteMoveIdx + 1
                            ? 'bg-chess-accent text-chess-dark font-bold'
                            : 'text-gray-200 hover:bg-chess-cardHover'
                        }`}
                      >
                        {whiteMove ? whiteMove.san : ''}
                      </button>

                      {/* Black Move */}
                      {blackMove ? (
                        <button
                          type="button"
                          onClick={() => setCurrentStep(blackMoveIdx + 1)}
                          className={`col-span-5 px-2 py-1 rounded text-left transition-colors cursor-pointer truncate ${
                            currentStep === blackMoveIdx + 1
                              ? 'bg-chess-accent text-chess-dark font-bold'
                              : 'text-gray-300 hover:bg-chess-cardHover'
                          }`}
                        >
                          {blackMove.san}
                        </button>
                      ) : (
                        <div className="col-span-5" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-chess-border/60 bg-chess-dark py-4 text-center text-xs text-gray-500">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-chess-accent hover:underline flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Yeni Maç Seç</span>
          </button>
          <span>ChessReview • Adım 2 Tamamlandı</span>
        </div>
      </footer>
    </div>
  );
};
