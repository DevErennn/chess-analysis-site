import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  Share2, 
  Volume2, 
  VolumeX, 
  BookOpen, 
  FlaskConical, 
  RotateCcw, 
  X,
  Target
} from 'lucide-react';
import type { 
  GameMetadata, 
  MoveAnalysis, 
  GameAnalysisResult, 
  ClassificationCount,
  EngineEvaluation 
} from '../../types/chess';
import { getStockfishService } from '../../lib/stockfishService';
import { 
  classifyMove, 
  calculateAccuracy, 
  countClassifications, 
  generateCoachSummary,
  detectTurningPoint,
  detectMissedWins,
  calculatePhaseAdvice
} from '../../lib/moveClassifier';
import { detectOpening } from '../../lib/openingExplorer';
import { 
  isSoundMuted, 
  toggleSoundMuted, 
  playMoveAnalysisSound, 
  playMoveSound 
} from '../../lib/soundEffects';
import { EvalBar } from './EvalBar';
import { BoardWithArrows } from './BoardWithArrows';
import { EvalGraph } from './EvalGraph';
import { MoveHistoryTable } from './MoveHistoryTable';
import { AnalysisControls } from './AnalysisControls';
import { GameSummaryCard } from './GameSummaryCard';
import { ClassificationBadge } from './ClassificationBadge';
import { ShareReportModal } from './ShareReportModal';
import { MistakePracticeModal } from './MistakePracticeModal';
import { MultiPvPanel } from './MultiPvPanel';

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
  const [isMuted, setIsMuted] = useState<boolean>(() => isSoundMuted());
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isMistakeTrainerOpen, setIsMistakeTrainerOpen] = useState(false);

  // Interactive Sandbox ("Ne Olurdu?") mode state
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  const [sandboxFen, setSandboxFen] = useState<string>('');
  const [sandboxMoves, setSandboxMoves] = useState<{ san: string; from: string; to: string }[]>([]);
  const [sandboxEval, setSandboxEval] = useState<EngineEvaluation | null>(null);
  const [isSandboxThinking, setIsSandboxThinking] = useState(false);

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

  // Sound playback tracking step changes
  const prevStepRef = useRef<number>(currentStep);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevStepRef.current = currentStep;
      return;
    }

    const prev = prevStepRef.current;
    prevStepRef.current = currentStep;

    if (!isSandboxMode) {
      if (currentStep > prev && currentStep > 0) {
        const move = analyzedMoves[currentStep - 1];
        const isGameOver = currentStep === fens.length - 1 && metadata.result !== '*';
        playMoveAnalysisSound(move, isGameOver);
      } else if (currentStep < prev) {
        playMoveSound();
      }
    }
  }, [currentStep, analyzedMoves, fens.length, metadata.result, isSandboxMode]);

  const handleToggleMute = useCallback(() => {
    const next = toggleSoundMuted();
    setIsMuted(next);
  }, []);

  // Detect Opening
  const openingInfo = useMemo(() => {
    const sans = analyzedMoves.map((m) => m.san);
    return detectOpening(sans, metadata);
  }, [analyzedMoves, metadata]);

  // Turning Point, Missed Wins & Phase Advice
  const turningPoint = useMemo(() => detectTurningPoint(analyzedMoves), [analyzedMoves]);
  const missedWins = useMemo(() => detectMissedWins(analyzedMoves), [analyzedMoves]);
  const phaseAdvice = useMemo(() => calculatePhaseAdvice(analyzedMoves), [analyzedMoves]);

  // Mistakes count for practice trainer
  const mistakesCount = useMemo(() => {
    return analyzedMoves.filter(
      (m) =>
        (m.classification === 'blunder' ||
          m.classification === 'mistake' ||
          m.classification === 'inaccuracy') &&
        Boolean(m.bestMoveUci && m.bestMoveUci !== '(none)')
    ).length;
  }, [analyzedMoves]);

  // Computed analysis summary (Accuracy, counts, coach)
  const analysisResult: GameAnalysisResult = useMemo(() => {
    const accuracy = calculateAccuracy(analyzedMoves);
    const counts = countClassifications(analyzedMoves);
    const coachSummary = generateCoachSummary(
      accuracy, 
      counts, 
      metadata.result, 
      turningPoint, 
      phaseAdvice
    );
    return { 
      moves: analyzedMoves, 
      accuracy, 
      counts, 
      coachSummary,
      turningPoint,
      missedWins,
      phaseAdvice,
    };
  }, [analyzedMoves, metadata.result, turningPoint, missedWins, phaseAdvice]);

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

  // Sandbox Mode Handlers
  const handleStartSandbox = () => {
    setIsPlaying(false);
    setIsSandboxMode(true);
    setSandboxFen(currentFen);
    setSandboxMoves([]);
    setSandboxEval(null);
    setIsSandboxThinking(true);

    getStockfishService().evaluatePosition(currentFen, 12, true).then((res) => {
      setSandboxEval(res);
      setIsSandboxThinking(false);
    });
  };

  const handleExitSandbox = () => {
    setIsSandboxMode(false);
    setSandboxFen('');
    setSandboxMoves([]);
    setSandboxEval(null);
    setIsSandboxThinking(false);
  };

  const handleResetSandbox = () => {
    setSandboxFen(currentFen);
    setSandboxMoves([]);
    setIsSandboxThinking(true);
    getStockfishService().evaluatePosition(currentFen, 12, true).then((res) => {
      setSandboxEval(res);
      setIsSandboxThinking(false);
    });
  };

  const handleSandboxPieceDrop = (sourceSquare: string, targetSquare: string): boolean => {
    try {
      const chess = new Chess(sandboxFen);
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });
      if (!move) return false;

      const nextFen = chess.fen();
      setSandboxFen(nextFen);
      setSandboxMoves((prev) => [...prev, { san: move.san, from: sourceSquare, to: targetSquare }]);
      playMoveSound();

      setIsSandboxThinking(true);
      getStockfishService().evaluatePosition(nextFen, 12, true).then((res) => {
        setSandboxEval(res);
        setIsSandboxThinking(false);
      });

      return true;
    } catch {
      return false;
    }
  };

  // Sandbox response arrow
  const sandboxArrows = useMemo(() => {
    if (!isSandboxMode || !sandboxEval?.bestMoveUci || sandboxEval.bestMoveUci === '(none)') {
      return undefined;
    }
    const from = sandboxEval.bestMoveUci.slice(0, 2);
    const to = sandboxEval.bestMoveUci.slice(2, 4);
    return [
      {
        startSquare: from,
        endSquare: to,
        color: 'rgba(38, 194, 163, 0.95)',
      },
    ];
  }, [isSandboxMode, sandboxEval]);

  // Jump to specific classification moves
  const lastJumpIndexRef = useRef<Record<string, number>>({});
  const handleSelectClassification = (key: keyof ClassificationCount) => {
    if (isSandboxMode) {
      handleExitSandbox();
    }
    const matchingIndices: number[] = [];
    analyzedMoves.forEach((m, idx) => {
      if (m.classification === key) {
        matchingIndices.push(idx + 1);
      }
    });

    if (matchingIndices.length === 0) return;

    const lastIdx = lastJumpIndexRef.current[key] ?? -1;
    const nextIdx = (lastIdx + 1) % matchingIndices.length;
    lastJumpIndexRef.current[key] = nextIdx;

    setCurrentStep(matchingIndices[nextIdx]);
  };

  // Navigation handlers
  const handleFirst = () => { if (isSandboxMode) handleExitSandbox(); setCurrentStep(0); };
  const handlePrev = () => { if (isSandboxMode) handleExitSandbox(); setCurrentStep((p) => Math.max(0, p - 1)); };
  const handleNext = () => { if (isSandboxMode) handleExitSandbox(); setCurrentStep((p) => Math.min(fens.length - 1, p + 1)); };
  const handleLast = () => { if (isSandboxMode) handleExitSandbox(); setCurrentStep(fens.length - 1); };
  const handleTogglePlay = () => { if (isSandboxMode) handleExitSandbox(); setIsPlaying((p) => !p); };
  const handleFlipBoard = () => setOrientation((p) => (p === 'white' ? 'black' : 'white'));

  // Auto-play timer
  useEffect(() => {
    if (isPlaying && !isSandboxMode) {
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
  }, [isPlaying, fens.length, isSandboxMode]);

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
        if (isSandboxMode) handleExitSandbox();
        setCurrentStep((p) => Math.max(0, p - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (isSandboxMode) handleExitSandbox();
        setCurrentStep((p) => Math.min(fens.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (isSandboxMode) handleExitSandbox();
        setCurrentStep(0);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (isSandboxMode) handleExitSandbox();
        setCurrentStep(fens.length - 1);
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (isSandboxMode) handleExitSandbox();
        setIsPlaying((p) => !p);
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setOrientation((p) => (p === 'white' ? 'black' : 'white'));
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleToggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fens.length, handleToggleMute, isSandboxMode]);

  const handleCopyPgn = async () => {
    try {
      await navigator.clipboard.writeText(pgn);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Evaluation display scores
  const currentEvalCp = isSandboxMode ? (sandboxEval?.cp ?? 0) : (activeMove?.evalAfter ?? 0);
  const currentEvalMate = isSandboxMode ? (sandboxEval?.mate ?? null) : (activeMove?.mateAfter ?? null);

  // Players
  const isWhiteBottom = orientation === 'white';
  const topPlayer = isWhiteBottom ? metadata.black : metadata.white;
  const bottomPlayer = isWhiteBottom ? metadata.white : metadata.black;
  const topPlayerWon = isWhiteBottom ? metadata.result === '0-1' : metadata.result === '1-0';
  const bottomPlayerWon = isWhiteBottom ? metadata.result === '1-0' : metadata.result === '0-1';

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
              <span className="font-bold text-white truncate max-w-[130px]">
                {metadata.white.name}
              </span>
              <span className="text-gray-500 font-mono">({metadata.white.rating || '?'})</span>
              <span className="text-gray-500 font-bold">vs</span>
              <span className="font-bold text-white truncate max-w-[130px]">
                {metadata.black.name}
              </span>
              <span className="text-gray-500 font-mono">({metadata.black.rating || '?'})</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Accuracy quick pill */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-chess-surface border border-chess-border text-xs font-mono">
              <span className="text-gray-400">Doğruluk:</span>
              {isAnalyzing ? (
                <span className="text-chess-accent font-semibold animate-pulse">
                  Hesaplanıyor (%{analysisProgress})...
                </span>
              ) : (
                <>
                  <span className="font-bold text-white">%{analysisResult.accuracy.white}</span>
                  <span className="text-gray-600">|</span>
                  <span className="font-bold text-white">%{analysisResult.accuracy.black}</span>
                </>
              )}
            </div>

            {/* Sound Mute Toggle */}
            <button
              type="button"
              onClick={handleToggleMute}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                  : 'bg-chess-card hover:bg-chess-cardHover border border-chess-border text-gray-300'
              }`}
              title={isMuted ? 'Sesi Aç (M)' : 'Sesi Kapat (M)'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-chess-accent" />}
            </button>

            {/* Mistake Practice Trainer Button */}
            {mistakesCount > 0 && (
              <button
                type="button"
                onClick={() => setIsMistakeTrainerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-xs font-bold text-amber-300 transition-colors cursor-pointer shadow-sm"
                title="Hatalı pozisyonları bulmaca şeklinde çözün"
              >
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Hatalarımdan Öğren</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-[10px] text-amber-200 font-mono font-bold">
                  {mistakesCount}
                </span>
              </button>
            )}

            {/* Share / Export Modal Button */}
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-chess-accent/15 hover:bg-chess-accent/25 border border-chess-accent/40 text-xs font-bold text-chess-accent transition-colors cursor-pointer"
              title="Analiz Raporunu Paylaş ve İndir"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Paylaş & İndir</span>
            </button>

            {/* Copy PGN Button */}
            <button
              type="button"
              onClick={handleCopyPgn}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-chess-card hover:bg-chess-cardHover border border-chess-border text-xs text-gray-300 transition-colors cursor-pointer"
              title="Orijinal PGN'i Kopyala"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 hidden sm:inline">Kopyalandı!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">PGN</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Analysis Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex-1 w-full space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Board + Eval Bar + Graph */}
          <div className="lg:col-span-7 flex flex-col items-center gap-3.5 lg:sticky lg:top-20">
            {/* Opening Tag Banner */}
            {openingInfo && (
              <div className="w-full max-w-[500px] flex items-center justify-between px-3.5 py-2 rounded-xl bg-chess-surface border border-chess-border text-xs shadow-sm">
                <div className="flex items-center gap-2 overflow-hidden">
                  <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-mono font-bold text-chess-accent shrink-0 text-xs">
                    {openingInfo.eco}
                  </span>
                  <span className="text-gray-200 truncate font-semibold text-xs">
                    {openingInfo.turkishName || openingInfo.name}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 bg-chess-card px-2 py-0.5 rounded border border-chess-border shrink-0 font-medium ml-2">
                  Açılış
                </span>
              </div>
            )}

            {/* Top Player Info */}
            <div className="w-full max-w-[500px] flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3.5 h-3.5 rounded-full border shadow ${
                    isWhiteBottom ? 'bg-black border-gray-600' : 'bg-white border-gray-300'
                  }`}
                />
                <span className="font-bold text-white text-sm">{topPlayer.name}</span>
                {topPlayer.rating && (
                  <span className="text-gray-400 font-mono">({topPlayer.rating})</span>
                )}
              </div>
              {topPlayerWon && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[11px] border border-emerald-500/30">
                  Kazandı ({metadata.result})
                </span>
              )}
            </div>

            {/* Board and Eval Bar Area */}
            <div className="w-full max-w-[500px] flex items-stretch gap-2.5 sm:gap-3">
              {/* Eval Bar */}
              <div className="self-stretch">
                <EvalBar
                  cp={currentEvalCp}
                  mate={currentEvalMate}
                  orientation={orientation}
                  height="100%"
                />
              </div>

              {/* Chessboard with interactive arrows */}
              <div className="flex-1 min-w-0">
                <BoardWithArrows
                  fen={isSandboxMode ? sandboxFen : currentFen}
                  orientation={orientation}
                  activeMove={isSandboxMode ? undefined : activeMove}
                  showBestMoveArrow={!isSandboxMode}
                  isSandboxMode={isSandboxMode}
                  onPieceDrop={handleSandboxPieceDrop}
                  customArrows={isSandboxMode ? sandboxArrows : undefined}
                />
              </div>
            </div>

            {/* Bottom Player Info */}
            <div className="w-full max-w-[500px] flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3.5 h-3.5 rounded-full border shadow ${
                    isWhiteBottom ? 'bg-white border-gray-300' : 'bg-black border-gray-600'
                  }`}
                />
                <span className="font-bold text-white text-sm">{bottomPlayer.name}</span>
                {bottomPlayer.rating && (
                  <span className="text-gray-400 font-mono">({bottomPlayer.rating})</span>
                )}
              </div>
              {bottomPlayerWon && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[11px] border border-emerald-500/30">
                  Kazandı ({metadata.result})
                </span>
              )}
            </div>

            {/* Sandbox Mode Active Bar OR "Ne Olurdu?" Starter Button */}
            {isSandboxMode ? (
              <div className="w-full max-w-[500px] p-3.5 rounded-2xl bg-indigo-950/40 border-2 border-indigo-500/60 shadow-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-indigo-400 animate-spin" />
                    <span className="text-xs font-bold text-indigo-300">Varyant Deneme Modu (Sandbox)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                      Taşları sürükleyebilirsiniz
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleResetSandbox}
                      className="p-1.5 rounded-lg bg-chess-card hover:bg-chess-cardHover border border-chess-border text-gray-300 hover:text-white text-xs cursor-pointer"
                      title="Pozisyonu Sıfırla"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleExitSandbox}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow"
                    >
                      <X className="w-3 h-3" />
                      <span>Analize Dön</span>
                    </button>
                  </div>
                </div>

                {/* Sandbox Realtime Status */}
                <div className="flex items-center justify-between text-xs bg-chess-surface/70 px-3 py-2 rounded-xl border border-indigo-500/30 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Değerlendirme:</span>
                    <span className="font-bold text-white">
                      {isSandboxThinking ? (
                        <span className="text-gray-400 animate-pulse">Hesaplanıyor...</span>
                      ) : sandboxEval?.mate ? (
                        <span className="text-amber-400">#{sandboxEval.mate > 0 ? `+${sandboxEval.mate}` : sandboxEval.mate}</span>
                      ) : (
                        <span className="text-emerald-400">
                          {((sandboxEval?.cp ?? 0) / 100 > 0 ? '+' : '') + ((sandboxEval?.cp ?? 0) / 100).toFixed(2)}
                        </span>
                      )}
                    </span>
                  </div>
                  {sandboxEval?.bestMoveSan && (
                    <div className="text-[11px] text-teal-300 font-sans">
                      Motor Yanıtı: <strong className="font-mono text-white">{sandboxEval.bestMoveSan}</strong>
                    </div>
                  )}
                </div>

                {/* Sandbox Moves History */}
                {sandboxMoves.length > 0 && (
                  <div className="text-[11px] text-gray-300 flex items-center gap-1 flex-wrap">
                    <span className="text-gray-500">Denenen hat:</span>
                    {sandboxMoves.map((m, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-200 font-mono">
                        {m.san}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full max-w-[500px] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleStartSandbox}
                  className="w-full py-2 px-3 rounded-xl bg-chess-surface hover:bg-chess-surface/90 border border-chess-border hover:border-indigo-500/50 text-xs font-bold text-indigo-300 hover:text-indigo-200 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  title="Farklı bir hamle denemek için serbest modu açın"
                >
                  <FlaskConical className="w-3.5 h-3.5 text-indigo-400" />
                  <span>🧪 Bu hamleyi oynasaydım ne olurdu? (Varyant Dene)</span>
                </button>
              </div>
            )}

            {/* Move Explanation Bar (When not in sandbox) */}
            {!isSandboxMode && activeMove && (
              <div className="w-full max-w-[500px] p-3 rounded-xl bg-chess-card border border-chess-border flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  {activeMove.classification && (
                    <ClassificationBadge
                      classification={activeMove.classification}
                      size="md"
                    />
                  )}
                  <div className="text-xs text-gray-200 truncate">
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

            {/* Multi-PV Top 3 Engine Lines Panel */}
            <div className="w-full max-w-[500px]">
              <MultiPvPanel
                fen={isSandboxMode ? sandboxFen : currentFen}
                isSandboxMode={isSandboxMode}
              />
            </div>

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
              onSelectStep={(step) => {
                if (isSandboxMode) handleExitSandbox();
                setCurrentStep(step);
              }}
            />

            {/* Game Summary & Classification Counts */}
            <GameSummaryCard
              metadata={metadata}
              accuracy={analysisResult.accuracy}
              counts={analysisResult.counts}
              coachSummary={analysisResult.coachSummary}
              turningPoint={analysisResult.turningPoint}
              missedWins={analysisResult.missedWins}
              phaseAdvice={analysisResult.phaseAdvice}
              isAnalyzing={isAnalyzing}
              analysisProgress={analysisProgress}
              onShare={() => setIsShareModalOpen(true)}
              onOpenMistakes={() => setIsMistakeTrainerOpen(true)}
              mistakesCount={mistakesCount}
              onSelectStep={(step) => {
                if (isSandboxMode) handleExitSandbox();
                setCurrentStep(step);
              }}
              onSelectClassification={handleSelectClassification}
            />
          </div>
        </div>
      </main>

      {/* Share & Export Report Modal */}
      <ShareReportModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        metadata={metadata}
        analysisResult={analysisResult}
        openingInfo={openingInfo}
      />

      {/* Mistake Practice Trainer Modal */}
      <MistakePracticeModal
        isOpen={isMistakeTrainerOpen}
        onClose={() => setIsMistakeTrainerOpen(false)}
        moves={analyzedMoves}
        onGoToMoveInGame={(moveIndex) => {
          setIsMistakeTrainerOpen(false);
          setCurrentStep(moveIndex + 1);
        }}
      />

      {/* Footer */}
      <footer className="border-t border-chess-border/60 py-4 text-center text-xs text-gray-500 bg-chess-surface/40">
        Klavye Kısayolları: <kbd className="px-1.5 py-0.5 rounded bg-chess-card border border-chess-border text-gray-300">←</kbd> Önceki, <kbd className="px-1.5 py-0.5 rounded bg-chess-card border border-chess-border text-gray-300">→</kbd> Sonraki, <kbd className="px-1.5 py-0.5 rounded bg-chess-card border border-chess-border text-gray-300">Boşluk</kbd> Oynat/Durdur, <kbd className="px-1.5 py-0.5 rounded bg-chess-card border border-chess-border text-gray-300">F</kbd> Çevir, <kbd className="px-1.5 py-0.5 rounded bg-chess-card border border-chess-border text-gray-300">M</kbd> Ses
      </footer>
    </div>
  );
};
