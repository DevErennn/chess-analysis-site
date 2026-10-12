import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Share2,
  Flame,
  Smartphone,
  Square,
  MessageCircle
} from 'lucide-react';
import type { GameMetadata, MoveAnalysis } from '../../types/chess';
import { CLASSIFICATION_CONFIG } from './constants';

interface MoveShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  fen: string;
  activeMove: MoveAnalysis | null;
  metadata: GameMetadata;
  orientation?: 'white' | 'black';
}

// Unicode chess pieces mapping
const PIECE_SYMBOLS: Record<string, string> = {
  P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔',
  p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚',
};

export const MoveShareModal: React.FC<MoveShareModalProps> = ({
  isOpen,
  onClose,
  fen,
  activeMove,
  metadata,
  orientation = 'white',
}) => {
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16'>('1:1');
  const [copiedText, setCopiedText] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!isOpen) return null;

  const moveSan = activeMove?.san || 'Hamle';
  const moveNumber = activeMove?.moveNumber ? `${activeMove.moveNumber}.${activeMove.color === 'b' ? '..' : ''} ` : '';
  const moveFullText = `${moveNumber}${moveSan}`;
  const classification = activeMove?.classification || 'best';
  const classConfig = CLASSIFICATION_CONFIG[classification] || CLASSIFICATION_CONFIG.best;

  // Format evaluation score
  const evalScoreText = useMemo(() => {
    if (!activeMove) return 'Eşit Pozisyon';
    if (activeMove.mateAfter !== undefined && activeMove.mateAfter !== null) {
      return activeMove.mateAfter > 0 ? `+M${activeMove.mateAfter} Mat` : `-M${Math.abs(activeMove.mateAfter)} Mat`;
    }
    const cp = activeMove.evalAfter ?? 0;
    const scoreVal = (cp / 100).toFixed(1);
    return `${cp >= 0 ? '+' : ''}${scoreVal} Değerlendirme`;
  }, [activeMove]);

  // Social share text for WhatsApp/Instagram
  const shareText = `🔥 Hey, satrançta yaptığım şu hamleye bak!\n\n♟️ Hamle: ${moveFullText} (${classConfig.label} ${classConfig.symbol})\n📊 Değerlendirme: ${evalScoreText}\n⚪ ${metadata.white.name} vs ⚫ ${metadata.black.name}\n\nSen de maçlarını ücretsiz analiz et: https://github.com/DevErennn/chess-analysis-site`;

  // Draw card on hidden or preview canvas
  const drawCanvas = (ratio: '1:1' | '9:16') => {
    const canvas = canvasRef.current || document.createElement('canvas');
    const width = ratio === '1:1' ? 1200 : 1080;
    const height = ratio === '1:1' ? 1200 : 1920;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // 1. Dark radial gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#12110e');
    bgGrad.addColorStop(0.5, '#1a1916');
    bgGrad.addColorStop(1, '#0e0d0b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Neon ambient glows
    const glow1 = ctx.createRadialGradient(width / 2, ratio === '1:1' ? 200 : 350, 10, width / 2, ratio === '1:1' ? 200 : 350, 600);
    glow1.addColorStop(0, 'rgba(129, 182, 76, 0.22)');
    glow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, width, height);

    const glow2 = ctx.createRadialGradient(width / 2, height - 200, 10, width / 2, height - 200, 500);
    glow2.addColorStop(0, 'rgba(38, 194, 163, 0.15)');
    glow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, width, height);

    // Border line frame
    ctx.strokeStyle = '#363431';
    ctx.lineWidth = 6;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    // 2. Top Banner Header
    const topY = ratio === '1:1' ? 100 : 180;
    ctx.textAlign = 'center';

    // Glowing badge
    ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
    ctx.fillRect(width / 2 - 250, topY - 45, 500, 48);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(width / 2 - 250, topY - 45, 500, 48);

    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillText('🔥 HEY, YAPTIĞIM HAMLEYE BAK!', width / 2, topY - 12);

    // Match Players
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.fillText(`${metadata.white.name} vs ${metadata.black.name}`, width / 2, topY + 45);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '500 20px Inter, sans-serif';
    ctx.fillText(`Sonuç: ${metadata.result || '*'} • Açılış: ${metadata.opening || 'Standart Oyun'}`, width / 2, topY + 80);

    // 3. Chessboard Rendering
    const boardSize = ratio === '1:1' ? 620 : 760;
    const boardX = (width - boardSize) / 2;
    const boardY = ratio === '1:1' ? 240 : 360;
    const squareSize = boardSize / 8;

    // Board shadow and border
    ctx.fillStyle = '#262421';
    ctx.fillRect(boardX - 12, boardY - 12, boardSize + 24, boardSize + 24);
    ctx.strokeStyle = '#81b64c';
    ctx.lineWidth = 3;
    ctx.strokeRect(boardX - 12, boardY - 12, boardSize + 24, boardSize + 24);

    // Parse FEN piece positions
    const fenParts = (fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR').split(' ')[0].split('/');
    const isFlipped = orientation === 'black';

    // Highlight squares if activeMove exists
    const fromSquare = activeMove?.from;
    const toSquare = activeMove?.to;



    // Draw 64 squares
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        const sqX = boardX + col * squareSize;
        const sqY = boardY + row * squareSize;

        // Coordinates in chess notation
        const fileChar = String.fromCharCode('a'.charCodeAt(0) + (isFlipped ? 7 - col : col));
        const rankNum = isFlipped ? row + 1 : 8 - row;
        const squareName = `${fileChar}${rankNum}`;

        // Base square color
        if (squareName === toSquare) {
          ctx.fillStyle = 'rgba(247, 206, 41, 0.75)'; // Target square gold
        } else if (squareName === fromSquare) {
          ctx.fillStyle = 'rgba(129, 182, 76, 0.75)'; // Source square green
        } else {
          ctx.fillStyle = isLight ? '#eeeed2' : '#769656';
        }
        ctx.fillRect(sqX, sqY, squareSize, squareSize);
      }
    }

    // Place pieces from FEN
    for (let r = 0; r < 8; r++) {
      const fenRow = isFlipped ? fenParts[7 - r] : fenParts[r];
      let col = 0;

      for (let i = 0; i < fenRow.length; i++) {
        const char = fenRow[i];
        if (char >= '1' && char <= '8') {
          col += parseInt(char, 10);
        } else {
          const renderCol = isFlipped ? 7 - col : col;
          const sqX = boardX + renderCol * squareSize;
          const sqY = boardY + r * squareSize;

          const isWhitePiece = char === char.toUpperCase();
          const symbol = PIECE_SYMBOLS[char] || '';

          // Draw piece symbol with clear contrast
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = `bold ${Math.floor(squareSize * 0.76)}px "Apple Symbols", "DejaVu Sans", "Segoe UI Symbol", sans-serif`;

          // Outer shadow for piece readability
          ctx.fillStyle = isWhitePiece ? '#ffffff' : '#18181b';
          ctx.strokeStyle = isWhitePiece ? '#27272a' : '#f4f4f5';
          ctx.lineWidth = 1.5;

          ctx.strokeText(symbol, sqX + squareSize / 2, sqY + squareSize / 2 + 2);
          ctx.fillText(symbol, sqX + squareSize / 2, sqY + squareSize / 2 + 2);

          col++;
        }
      }
    }

    // 4. Move Badge & Details Section
    const infoY = ratio === '1:1' ? 900 : 1200;

    // Move Highlight Pill
    ctx.fillStyle = '#262421';
    ctx.fillRect(width / 2 - 340, infoY, 680, 130);
    ctx.strokeStyle = '#363431';
    ctx.lineWidth = 2;
    ctx.strokeRect(width / 2 - 340, infoY, 680, 130);

    // Left: Move SAN & Symbol
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px Inter, sans-serif';
    ctx.fillText(moveFullText, width / 2 - 305, infoY + 60);

    // Classification tag
    ctx.fillStyle = classConfig.color;
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.fillText(`${classConfig.label} ${classConfig.symbol}`, width / 2 - 305, infoY + 102);

    // Right: Evaluation & Accuracy
    ctx.textAlign = 'right';
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 32px Inter, sans-serif';
    ctx.fillText(evalScoreText, width / 2 + 305, infoY + 60);

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '500 20px Inter, sans-serif';
    ctx.fillText('Stockfish 16 WASM', width / 2 + 305, infoY + 98);

    // Coach summary snippet
    if (activeMove?.comment) {
      const commentY = ratio === '1:1' ? 1065 : 1380;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'italic 500 22px Inter, sans-serif';
      const commentSnippet = `"${activeMove.comment.slice(0, 90)}${activeMove.comment.length > 90 ? '...' : ''}"`;
      ctx.fillText(commentSnippet, width / 2, commentY);
    }

    // 5. Watermark Footer
    const footerY = height - (ratio === '1:1' ? 65 : 90);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#81b64c';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillText('♟️ Chess Review • Ücretsiz Satranç Oyun Analiz Platformu', width / 2, footerY);

    ctx.fillStyle = '#64748b';
    ctx.font = '500 17px Inter, sans-serif';
    ctx.fillText('Geliştiriciler: DevErennn & DevOnurrr • github.com/DevErennn/chess-analysis-site', width / 2, footerY + 28);

    return canvas;
  };

  const handleDownloadImage = () => {
    setIsDownloading(true);
    try {
      const canvas = drawCanvas(aspectRatio);
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const safeSan = moveSan.replace(/[^a-zA-Z0-9]/g, '');
      link.download = `hey_yaptigim_hamleye_bak_${safeSan}_chess_review.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleWhatsAppShare = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Hey, yaptığım hamleye bak! 🔥',
          text: shareText,
          url: 'https://github.com/DevErennn/chess-analysis-site',
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyText();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-chess-card border border-chess-border rounded-2xl shadow-2xl max-h-[92vh] flex flex-col text-gray-100 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-share-title"
      >
        {/* Top Flame Highlight */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-amber-500 to-chess-accent shrink-0" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-chess-surface border border-transparent hover:border-chess-border transition-colors cursor-pointer z-10"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-3 border-b border-chess-border/70 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 shadow-inner">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 id="move-share-title" className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              Hey, Yaptığım Hamleye Bak!
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold uppercase tracking-wide">
                Sosyal Paylaşım
              </span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Instagram ve WhatsApp için mevcut tahtayı ve hamleni görsel kart olarak dışa aktar!
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Aspect Ratio Switcher */}
          <div className="flex items-center justify-between gap-3 bg-chess-surface p-1.5 rounded-xl border border-chess-border text-xs">
            <span className="text-gray-400 font-medium px-2">Kart Boyutu:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setAspectRatio('1:1')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${aspectRatio === '1:1'
                    ? 'bg-chess-card text-white border border-chess-border shadow-sm text-chess-accent'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Square className="w-3.5 h-3.5" />
                <span>1:1 Kare (Post)</span>
              </button>

              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${aspectRatio === '9:16'
                    ? 'bg-chess-card text-white border border-chess-border shadow-sm text-chess-accent'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>9:16 Dikey (Hikaye)</span>
              </button>
            </div>
          </div>

          {/* Interactive Card Preview Box */}
          <div className="relative rounded-2xl bg-gradient-to-b from-[#1a1916] to-[#12110e] border border-chess-border p-4 sm:p-5 shadow-2xl flex flex-col items-center text-center space-y-3 overflow-hidden">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold shadow-sm">
              <Flame className="w-3.5 h-3.5" />
              <span>HEY, YAPTIĞIM HAMLEYE BAK!</span>
            </div>

            <div className="text-xs text-gray-300 font-semibold truncate max-w-full">
              ⚪ {metadata.white.name} vs ⚫ {metadata.black.name}
            </div>

            {/* Current Move Pill */}
            <div className="w-full max-w-sm p-3 rounded-xl bg-chess-card border border-chess-border/80 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-white font-mono">{moveFullText}</span>
                <span
                  className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider"
                  style={{ backgroundColor: `${classConfig.color}25`, color: classConfig.color }}
                >
                  {classConfig.label} {classConfig.symbol}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-cyan-400 block">{evalScoreText}</span>
                <span className="text-[10px] text-gray-500">Stockfish 16</span>
              </div>
            </div>

            {/* Coach comment snippet */}
            {activeMove?.comment && (
              <p className="text-xs text-gray-400 italic max-w-md px-2">
                "{activeMove.comment}"
              </p>
            )}

            {/* Branding Footer */}
            <div className="text-[11px] text-gray-500 pt-1 border-t border-chess-border/40 w-full flex items-center justify-between">
              <span className="text-chess-accent font-semibold">♟️ Chess Review</span>
              <span>DevErennn & DevOnurrr</span>
            </div>
          </div>

          {/* Sharing Buttons Bar */}
          <div className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Download PNG Button */}
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isDownloading}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-chess-accent hover:bg-chess-accent/90 text-chess-dark font-extrabold text-xs transition-all shadow-lg shadow-chess-accent/20 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{downloadSuccess ? 'Görsel İndirildi! 🎉' : 'Görseli İndir (PNG)'}</span>
              </button>

              {/* WhatsApp Share Button */}
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp'ta Paylaş</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Copy Share Text Button */}
              <button
                type="button"
                onClick={handleCopyText}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-chess-surface hover:bg-chess-card border border-chess-border text-gray-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                {copiedText ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Metin Kopyalandı!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Paylaşım Metnini Kopyala</span>
                  </>
                )}
              </button>

              {/* Native / Instagram Story Share Button */}
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-chess-surface hover:bg-chess-card border border-chess-border text-gray-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-purple-400" />
                <span>Instagram / Diğer Uygulamalar</span>
              </button>
            </div>
          </div>

          {/* Social tip alert */}
          <div className="p-3 rounded-xl bg-chess-surface/60 border border-chess-border/60 text-[11px] text-gray-400 leading-relaxed flex items-center gap-2.5">
            <span className="text-base">💡</span>
            <span>
              <strong>İpucu:</strong> "Görseli İndir" butonuna tıklayıp fotoğrafı doğrudan <strong>Instagram Hikayeler</strong> veya <strong>WhatsApp Durum</strong>'a yükleyerek arkadaşlarınla paylaşabilirsin!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
