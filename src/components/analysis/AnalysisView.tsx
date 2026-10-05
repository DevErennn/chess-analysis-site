import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import type { GameMetadata, MoveAnalysis, GameAnalysisResult } from '../../types/chess';
import { getStockfishService } from '../../lib/stockfishService';
import { 
  classifyMove, 
  calculateAccuracy, 
  countClassifications, 
  generateCoachSummary 
} from '../../lib/moveClassifier';
import { EvalBar } from './EvalBar';
import { BoardWithArrows } from './BoardWithArrows';
import { EvalGraph } from './EvalGraph';
import { MoveHistoryTable } from './MoveHistoryTable';
import { AnalysisControls } from './AnalysisControls';
import { GameSummaryCard } from './GameSummaryCard';
import { ClassificationBadge } from './ClassificationBadge';

interface AnalysisViewProps {
  pgn: string;
  metadata: GameMetadata;
  onBack: () => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  pgn,
  metadata,
  onBack,
}) => {
  const [copied, setCopied] = useState(false);
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [depth, setDepth] = useState<number>(12);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const playTimerRef = useRef<number | null>(null);

  // 1. Parse base moves and FEN sequence from PGN
  const { initialMoves, fens } = useMemo(() => {
    try {
      const chess = new Chess();
      chess.loadPgn(pgn);
      const history = chess.history({ verbose: true });

      const replay = new Chess();
      const fenList: string[] = [replay.fen()];
      const moveList: MoveAnalysis[] = [];

      for (let i = 0; i < history.length; i++) {
        const m = history[i];
        const fenBefore = replay.fen();
        replay.move(m);
        const fenAfter = replay.fen();
        fenList.push(fenAfter);

        moveList.push({
          moveNumber: Math.floor(i / 2) + 1,
          moveIndex: i,
          color: m.color,
          san: m.san,
          from: m.from,
          to: m.to,
          fenBefore,
          fenAfter,
        });
      }

      return { initialMoves: moveList, fens: fenList };
    } catch {
      return { initialMoves: [], fens: ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'] };
    }
  }, [pgn]);

  // Analyzed moves state
  const [analyzedMoves, setAnalyzedMoves] = useState<MoveAnalysis[]>(initialMoves);
  const [currentStep, setCurrentStep] = useState<number>(0);

  // Computed analysis summary (Accuracy, counts, coach)
  const analysisResult: GameAnalysisResult = useMemo(() => {
    const accuracy = calculateAccuracy(analyzedMoves);
    const counts = countClassifications(analyzedMoves);
    const coachSummary = generateCoachSummary(accuracy, counts, metadata.result);
    return { moves: analyzedMoves, accuracy, counts, coachSummary };
  }, [analyzedMoves, metadata.result]);

  // Current FEN and active move
  const currentFen = fens[currentStep] || fens[0] || 'start';
  const activeMove = currentStep > 0 ? analyzedMoves[currentStep - 1] : undefined;

  // Run full game analysis with Stockfish
  const startFullAnalysis = useCallback(async () => {
    if (isAnalyzing || fens.length === 0) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const stockfish = getStockfishService();
    const updatedMoves = [...initialMoves];

    try {
      // Analyze all positions (N+1 FENs)
      const evals = await stockfish.analyzePositions(fens, {
        depth,
        signal: controller.signal,
        onProgress: (prog) => {
          setAnalysisProgress(prog.percent);
        },
      });

      if (!controller.signal.aborted && evals.length === fens.length) {
        // Classify each move
        for (let i = 0; i < updatedMoves.length; i++) {
          const m = updatedMoves[i];
          const evalBefore = evals[i];
          const evalAfter = evals[i + 1];

          if (evalBefore && evalAfter) {
            const classificationResult = classifyMove(
              m.san,
              m.from,
              m.to,
              m.color,
              m.fenBefore,
              m.fenAfter,
              evalBefore,
              evalAfter,
              i
            );

            updatedMoves[i] = {
              ...m,
              evalBefore: evalBefore.cp,
              evalAfter: evalAfter.cp,
              mateBefore: evalBefore.mate,
              mateAfter: evalAfter.mate,
              bestMoveUci: evalBefore.bestMoveUci,
              bestMoveSan: evalBefore.bestMoveSan,
              winChanceBefore: classificationResult.winChanceBefore,
              winChanceAfter: classificationResult.winChanceAfter,
              winChanceLoss: classificationResult.winChanceLoss,
              classification: classificationResult.classification,
              comment: classificationResult.comment,
            };
          }
        }

        setAnalyzedMoves(updatedMoves);
        setAnalysisProgress(100);
      }
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, fens, depth, initialMoves]);

  // Stop analysis
  const stopAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    getStockfishService().stop();
    setIsAnalyzing(false);
  }, []);

  // Navigation handlers
  const handleFirst = () => setCurrentStep(0);
  const handlePrev = () => setCurrentStep((p) => Math.max(0, p - 1));
  const handleNext = () => setCurrentStep((p) => Math.min(fens.length - 1, p + 1));
  const handleLast = () => setCurrentStep(fens.length - 1);
  const handleTogglePlay = () => setIsPlaying((p) => !p);
  const handleFlipBoard = () => setOrientation((p) => (p === 'white' ? 'black' : 'white'));

  // Auto-play timer
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = window.setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= fens.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
    }

    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
      }
    };
  }, [isPlaying, fens.length]);

  // Trigger analysis automatically on first load
  useEffect(() => {
    startFullAnalysis();
    return () => {
      stopAnalysis();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentStep((p) => Math.max(0, p - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentStep((p) => Math.min(fens.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentStep(0);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentStep(fens.length - 1);
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setOrientation((p) => (p === 'white' ? 'black' : 'white'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fens.length]);

  const handleCopyPgn = async () => {
    try {
      await navigator.clipboard.writeText(pgn);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const currentEvalCp = activeMove?.evalAfter ?? 0;
  const currentEvalMate = activeMove?.mateAfter ?? null;

  return (
    <div className="min-h-screen bg-chess-dark text-gray-100 flex flex-col justify-between select-none">
      {/* Top Navbar */}
      <header className="border-b border-chess-border/70 bg-chess-surface/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
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

            {/* Players summary */}
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="font-bold text-white truncate max-w-[140px]">
                {metadata.white.name}
              </span>
              <span className="text-gray-500 font-mono">({metadata.white.rating || '?'})</span>
              <span className="text-gray-500 font-bold">vs</span>
              <span className="font-bold text-white truncate max-w-[140px]">
                {metadata.black.name}
              </span>
              <span className="text-gray-500 font-mono">({metadata.black.rating || '?'})</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Accuracy quick pill */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-chess-surface border border-chess-border text-xs font-mono">
              <span className="text-gray-400">Doğruluk:</span>
              <span className="font-bold text-white">%{analysisResult.accuracy.white}</span>
              <span className="text-gray-600">|</span>
              <span className="font-bold text-white">%{analysisResult.accuracy.black}</span>
            </div>

            <button
              type="button"
              onClick={handleCopyPgn}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-chess-card hover:bg-chess-cardHover border border-chess-border text-xs text-gray-300 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Kopyalandı!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>PGN</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Analysis Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Board + Eval Bar + Graph */}
          <div className="lg:col-span-7 flex flex-col items-center gap-4">
            {/* Player Info (Black) */}
            <div className="w-full max-w-[500px] flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-black border border-gray-600 shadow" />
                <span className="font-bold text-white text-sm">{metadata.black.name}</span>
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

            {/* Board and Eval Bar Area */}
            <div className="w-full max-w-[500px] flex items-center gap-3">
              {/* Eval Bar */}
              <div className="h-[360px] sm:h-[480px]">
                <EvalBar
                  cp={currentEvalCp}
                  mate={currentEvalMate}
                  orientation={orientation}
                  height="100%"
                />
              </div>

              {/* Chessboard with interactive arrows */}
              <div className="flex-1">
                <BoardWithArrows
                  fen={currentFen}
                  orientation={orientation}
                  activeMove={activeMove}
                  showBestMoveArrow={true}
                />
              </div>
            </div>

            {/* Player Info (White) */}
            <div className="w-full max-w-[500px] flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-white border border-gray-300 shadow" />
                <span className="font-bold text-white text-sm">{metadata.white.name}</span>
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

            {/* Move Explanation Bar */}
            {activeMove && (
              <div className="w-full max-w-[500px] p-3 rounded-xl bg-chess-card border border-chess-border flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2.5">
                  {activeMove.classification && (
                    <ClassificationBadge
                      classification={activeMove.classification}
                      size="md"
                    />
                  )}
                  <div className="text-xs text-gray-200">
                    <span className="font-bold text-white mr-1.5">{activeMove.san}:</span>
                    <span className="text-gray-300">{activeMove.comment || 'İyi hamle.'}</span>
                  </div>
                </div>

                {activeMove.bestMoveSan && activeMove.bestMoveSan !== activeMove.san && (
                  <div className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-md shrink-0">
                    En iyi: <strong>{activeMove.bestMoveSan}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Evaluation Timeline Graph */}
            <div className="w-full max-w-[500px]">
              <EvalGraph
                moves={analyzedMoves}
                currentStep={currentStep}
                onSelectStep={setCurrentStep}
              />
            </div>
          </div>

          {/* Right Column: Controls, Move List & Summary Card */}
          <div className="lg:col-span-5 space-y-5">
            {/* Analysis Controls */}
            <AnalysisControls
              currentStep={currentStep}
              totalSteps={fens.length - 1}
              isPlaying={isPlaying}
              isAnalyzing={isAnalyzing}
              analysisProgress={analysisProgress}
              depth={depth}
              onFirst={handleFirst}
              onPrev={handlePrev}
              onNext={handleNext}
              onLast={handleLast}
              onTogglePlay={handleTogglePlay}
              onFlipBoard={handleFlipBoard}
              onStartAnalysis={startFullAnalysis}
              onStopAnalysis={stopAnalysis}
              onChangeDepth={setDepth}
            />

            {/* Move History Table */}
            <MoveHistoryTable
              moves={analyzedMoves}
              currentStep={currentStep}
              onSelectStep={setCurrentStep}
            />

            {/* Game Summary & Classification Counts */}
            <GameSummaryCard
              metadata={metadata}
              accuracy={analysisResult.accuracy}
              counts={analysisResult.counts}
              coachSummary={analysisResult.coachSummary}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-chess-border/60 py-4 text-center text-xs text-gray-500 bg-chess-surface/40">
        Klavye Kısayolları: <kbd className="px-1.5 py-0.5 rounded bg-chess-card border border-chess-border text-gray-300">←</kbd> Önceki, <kbd className="px-1.5 py-0.5 rounded bg-chess-card border border-chess-border text-gray-300">→</kbd> Sonraki, <kbd className="px-1.5 py-0.5 rounded bg-chess-card border border-chess-border text-gray-300">Boşluk</kbd> Oynat/Durdur, <kbd className="px-1.5 py-0.5 rounded bg-chess-card border border-chess-border text-gray-300">F</kbd> Tahtayı Çevir
      </footer>
    </div>
  );
};
