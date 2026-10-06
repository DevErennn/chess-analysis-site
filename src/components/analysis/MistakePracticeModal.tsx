import React, { useState, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import type { Arrow } from 'react-chessboard';
import { 
  X, 
  Target, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw, 
  Lightbulb, 
  Sparkles,
  Award
} from 'lucide-react';
import type { MoveAnalysis } from '../../types/chess';
import { CLASSIFICATION_CONFIG } from './constants';
import { playBrilliantSound, playMoveSound } from '../../lib/soundEffects';

interface MistakePracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  moves: MoveAnalysis[];
  onGoToMoveInGame?: (moveIndex: number) => void;
}

export const MistakePracticeModal: React.FC<MistakePracticeModalProps> = ({
  isOpen,
  onClose,
  moves,
  onGoToMoveInGame,
}) => {
  // Filter all mistakes (inaccuracy, mistake, blunder) that have a recorded best move
  const mistakeMoves = useMemo(() => {
    return moves.filter(
      (m) =>
        (m.classification === 'blunder' ||
          m.classification === 'mistake' ||
          m.classification === 'inaccuracy') &&
        Boolean(m.bestMoveUci && m.bestMoveUci !== '(none)')
    );
  }, [moves]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [playedFen, setPlayedFen] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [showSolution, setShowSolution] = useState(false);
  const [solvedCount, setSolvedCount] = useState<Record<number, boolean>>({});

  const currentMistake = mistakeMoves[currentIndex];
  const boardFen = playedFen ?? currentMistake?.fenBefore ?? '';

  if (!isOpen) return null;

  if (mistakeMoves.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-chess-card border border-chess-border rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Tebrikler!</h3>
          <p className="text-xs text-gray-300">
            Bu maçta alıştırma yapılacak herhangi bir büyük hata veya yanılgı bulunamadı. Temiz bir oyun!
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-chess-accent hover:bg-chess-accentHover text-chess-dark font-bold text-xs transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    );
  }

  const orientation = currentMistake.color === 'w' ? 'white' : 'black';
  const moverLabel = currentMistake.color === 'w' ? 'Beyaz' : 'Siyah';
  const cfg = currentMistake.classification
    ? CLASSIFICATION_CONFIG[currentMistake.classification]
    : null;

  // Handle Drag & Drop move by user
  const handlePieceDrop = ({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string | null;
  }): boolean => {
    if (status === 'success' || !targetSquare) return false;

    try {
      const chess = new Chess(boardFen);
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (!move) return false;

      // Update board position
      setPlayedFen(chess.fen());
      playMoveSound();

      const playedUci = `${sourceSquare}${targetSquare}`.toLowerCase();
      const targetBestUci = (currentMistake.bestMoveUci || '').toLowerCase().slice(0, 4);

      if (playedUci === targetBestUci || move.san === currentMistake.bestMoveSan) {
        setStatus('success');
        setSolvedCount((prev) => ({ ...prev, [currentIndex]: true }));
        playBrilliantSound();
      } else {
        setStatus('failed');
      }

      return true;
    } catch {
      return false;
    }
  };

  const handleResetCurrent = () => {
    setPlayedFen(null);
    setStatus('idle');
    setShowSolution(false);
  };

  const handleNext = () => {
    if (currentIndex < mistakeMoves.length - 1) {
      setCurrentIndex((p) => p + 1);
      setPlayedFen(null);
      setStatus('idle');
      setShowSolution(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((p) => p - 1);
      setPlayedFen(null);
      setStatus('idle');
      setShowSolution(false);
    }
  };

  // Build arrow for solution if requested
  const arrows: Arrow[] = [];
  if (showSolution && currentMistake.bestMoveUci) {
    const from = currentMistake.bestMoveUci.slice(0, 2);
    const to = currentMistake.bestMoveUci.slice(2, 4);
    arrows.push({
      startSquare: from,
      endSquare: to,
      color: 'rgba(38, 194, 163, 0.95)',
    });
  }

  const solvedTotal = Object.keys(solvedCount).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-chess-card border border-chess-border rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-chess-border/70 flex items-center justify-between bg-chess-surface/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base">
                  Hatalarımdan Öğren (Taktik Antrenman)
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {currentIndex + 1} / {mistakeMoves.length}
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Maçtaki hatalı anlarda doğru hamleyi bularak taktik görüşünüzü geliştirin
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-chess-cardHover transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Situation Card */}
          <div className="p-3.5 rounded-xl bg-chess-surface border border-chess-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-3 h-3 rounded-full border ${
                  currentMistake.color === 'w' ? 'bg-white border-gray-400' : 'bg-black border-gray-600'
                }`}
              />
              <div>
                <span className="text-gray-400 mr-1.5">Hamle {currentMistake.moveNumber}:</span>
                <span className="font-bold text-white mr-1.5">{moverLabel} oynadı:</span>
                <span className={`font-mono font-bold px-1.5 py-0.5 rounded border ${cfg?.bgColor} ${cfg?.textColor} ${cfg?.borderColor}`}>
                  {currentMistake.san} {cfg?.symbol}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-gray-300">
              <span className="text-[11px] text-gray-400">Çözülen:</span>
              <span className="font-mono font-bold text-emerald-400 text-xs">
                {solvedTotal} / {mistakeMoves.length}
              </span>
            </div>
          </div>

          {/* Interactive Chessboard */}
          <div className="max-w-[420px] mx-auto aspect-square rounded-2xl overflow-hidden border-2 border-chess-border shadow-xl relative">
            <Chessboard
              options={{
                position: boardFen,
                boardOrientation: orientation,
                allowDragging: status !== 'success',
                onPieceDrop: handlePieceDrop as any,
                arrows,
                darkSquareStyle: { backgroundColor: '#769656' },
                lightSquareStyle: { backgroundColor: '#eeeed2' },
                animationDurationInMs: 160,
              }}
            />

            {/* Success Overlay Banner */}
            {status === 'success' && (
              <div className="absolute inset-x-3 top-3 z-20 p-2.5 rounded-xl bg-emerald-600/90 text-white text-xs font-bold flex items-center justify-between backdrop-blur-md shadow-lg border border-emerald-400 animate-in fade-in zoom-in">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span>Harika! En iyi hamleyi buldunuz!</span>
                </div>
                {currentIndex < mistakeMoves.length - 1 && (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-2 py-0.5 rounded bg-white text-emerald-800 font-bold text-[11px] hover:bg-gray-100 transition-colors"
                  >
                    Sonraki →
                  </button>
                )}
              </div>
            )}

            {/* Failed Overlay Banner */}
            {status === 'failed' && (
              <div className="absolute inset-x-3 top-3 z-20 p-2.5 rounded-xl bg-red-600/90 text-white text-xs font-bold flex items-center justify-between backdrop-blur-md shadow-lg border border-red-400 animate-in fade-in">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>Daha iyi bir hamle var. Tekrar deneyin!</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetCurrent}
                  className="px-2 py-0.5 rounded bg-white text-red-800 font-bold text-[11px] hover:bg-gray-100 transition-colors"
                >
                  Yenile 🔄
                </button>
              </div>
            )}
          </div>

          {/* Solution Display Card */}
          {showSolution && (
            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2 text-teal-300">
                <Lightbulb className="w-4 h-4 text-teal-400" />
                <span>
                  Motorun en iyi önerisi: <strong className="font-mono text-white text-sm">{currentMistake.bestMoveSan || currentMistake.bestMoveUci}</strong>
                </span>
              </div>
              <span className="text-[11px] text-teal-400/80">Tahta üstünde yeşil okla gösterildi</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetCurrent}
                className="px-3 py-2 rounded-xl bg-chess-surface hover:bg-chess-card border border-chess-border text-xs font-medium text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Konumu baştan dene"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Sıfırla</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSolution((p) => !p)}
                className="px-3 py-2 rounded-xl bg-chess-surface hover:bg-chess-card border border-chess-border text-xs font-medium text-amber-300 hover:text-amber-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{showSolution ? 'Çözümü Gizle' : 'Çözümü Göster'}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="p-2 rounded-xl bg-chess-surface hover:bg-chess-card border border-chess-border disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 hover:text-white transition-colors cursor-pointer"
                title="Önceki Hata"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex >= mistakeMoves.length - 1}
                className="p-2 rounded-xl bg-chess-surface hover:bg-chess-card border border-chess-border disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 hover:text-white transition-colors cursor-pointer"
                title="Sonraki Hata"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 px-6 border-t border-chess-border/60 bg-chess-surface/40 flex items-center justify-between text-xs text-gray-400">
          <span>{moverLabel} taşlarıyla en iyi devam yolunu oynayın</span>
          {onGoToMoveInGame && (
            <button
              type="button"
              onClick={() => {
                onGoToMoveInGame(currentMistake.moveIndex + 1);
                onClose();
              }}
              className="text-chess-accent hover:underline cursor-pointer"
            >
              Maçta bu hamleye git →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
