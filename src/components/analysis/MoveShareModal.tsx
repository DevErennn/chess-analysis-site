import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Share2,
  Flame,
  Smartphone,
  Square,
  MessageCircle,
  Sparkles,
  Layers
} from 'lucide-react';
import type { GameMetadata, MoveAnalysis } from '../../types/chess';
import { CLASSIFICATION_CONFIG } from './constants';
import { getPieceImage, preloadAllPieces } from '../../lib/chessPieceSvgs';

interface MoveShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  fen: string;
  activeMove: MoveAnalysis | null;
  metadata?: GameMetadata | null;
  orientation?: 'white' | 'black';
}

// Fallback Unicode glyphs if vector piece is still loading
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
  const [copiedImage, setCopiedImage] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [piecesLoaded, setPiecesLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    preloadAllPieces().then(() => {
      setPiecesLoaded(true);
    });
  }, []);

  // Safe names and details
  const whiteName = metadata?.white?.name || 'Beyaz Oyuncu';
  const blackName = metadata?.black?.name || 'Siyah Oyuncu';
  const whiteRating = metadata?.white?.rating ? `(${metadata.white.rating})` : '';
  const blackRating = metadata?.black?.rating ? `(${metadata.black.rating})` : '';
  const matchResult = metadata?.result || '*';

  // Move details
  const moveSan = activeMove?.san || 'Hamle';
  const moveNumber = activeMove?.moveNumber ? `${activeMove.moveNumber}.${activeMove.color === 'b' ? '..' : ''} ` : '';
  const moveFullText = activeMove ? `${moveNumber}${moveSan}` : 'Mevcut Pozisyon';
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

  // Social share text
  const shareText = useMemo(() => {
    return `🔥 Hey, satrançta yaptığım şu hamleye bak!\n\n♟️ Hamle: ${moveFullText} (${classConfig.label} ${classConfig.symbol})\n📊 Değerlendirme: ${evalScoreText}\n⚪ ${whiteName} vs ⚫ ${blackName}\n\nSen de maçlarını ücretsiz analiz et: https://github.com/DevErennn/chess-analysis-site`;
  }, [moveFullText, classConfig, evalScoreText, whiteName, blackName]);

  // Draw card on canvas
  const drawCard = useCallback((ratio: '1:1' | '9:16'): HTMLCanvasElement => {
    const width = ratio === '1:1' ? 1200 : 1080;
    const height = ratio === '1:1' ? 1200 : 1920;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // 1. Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#100f0d');
    bgGrad.addColorStop(0.4, '#181714');
    bgGrad.addColorStop(1, '#0c0b09');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Neon ambient glows
    const glow1 = ctx.createRadialGradient(width / 2, ratio === '1:1' ? 220 : 380, 20, width / 2, ratio === '1:1' ? 220 : 380, 550);
    glow1.addColorStop(0, 'rgba(239, 68, 68, 0.20)');
    glow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, width, height);

    const glow2 = ctx.createRadialGradient(width / 2, height - 250, 20, width / 2, height - 250, 500);
    glow2.addColorStop(0, 'rgba(129, 182, 76, 0.16)');
    glow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, width, height);

    // Outer subtle border
    ctx.strokeStyle = '#2d2b27';
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, width - 48, height - 48);

    // 2. Top Banner Header
    const topY = ratio === '1:1' ? 95 : 180;
    ctx.textAlign = 'center';

    // Glowing badge pill
    const badgeW = 540;
    const badgeH = 50;
    const badgeX = (width - badgeW) / 2;
    const badgeY = topY - 45;

    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 24px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔥 HEY, YAPTIĞIM HAMLEYE BAK!', width / 2, badgeY + badgeH / 2);

    // Match Players
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px Inter, system-ui, sans-serif';
    ctx.fillText(`⚪ ${whiteName} ${whiteRating} vs ⚫ ${blackName} ${blackRating}`, width / 2, topY + 45);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '500 20px Inter, system-ui, sans-serif';
    ctx.fillText(`Sonuç: ${matchResult} • Chess Review Doğrulanmış Analiz`, width / 2, topY + 80);

    // 3. Chessboard Rendering
    const boardSize = ratio === '1:1' ? 620 : 760;
    const boardX = (width - boardSize) / 2;
    const boardY = ratio === '1:1' ? 230 : 360;
    const squareSize = boardSize / 8;

    // Board Outer Frame with subtle rounded bevel & wood border
    ctx.fillStyle = '#211f1c';
    ctx.fillRect(boardX - 16, boardY - 16, boardSize + 32, boardSize + 32);
    ctx.strokeStyle = '#363431';
    ctx.lineWidth = 3;
    ctx.strokeRect(boardX - 16, boardY - 16, boardSize + 32, boardSize + 32);

    // Parse FEN piece positions
    const cleanFen = (fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR').trim();
    const fenRows = cleanFen.split(' ')[0].split('/');
    const isFlipped = orientation === 'black';

    const fromSquare = activeMove?.from;
    const toSquare = activeMove?.to;

    let fromCenter: { x: number; y: number } | null = null;
    let toCenter: { x: number; y: number } | null = null;

    // 3.1. Draw 64 squares & board coordinates
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        const sqX = boardX + col * squareSize;
        const sqY = boardY + row * squareSize;

        const fileChar = String.fromCharCode('a'.charCodeAt(0) + (isFlipped ? 7 - col : col));
        const rankNum = isFlipped ? row + 1 : 8 - row;
        const squareName = `${fileChar}${rankNum}`;

        // Base square color: Classic Chess.com green/cream palette
        ctx.fillStyle = isLight ? '#eeeed2' : '#769656';
        ctx.fillRect(sqX, sqY, squareSize, squareSize);

        // Highlight source and target squares with warm tournament highlights
        if (squareName === toSquare) {
          ctx.fillStyle = 'rgba(247, 215, 60, 0.70)'; // Target square warm gold
          ctx.fillRect(sqX, sqY, squareSize, squareSize);
          toCenter = { x: sqX + squareSize / 2, y: sqY + squareSize / 2 };
        } else if (squareName === fromSquare) {
          ctx.fillStyle = 'rgba(187, 203, 43, 0.65)'; // Source square light yellow-green
          ctx.fillRect(sqX, sqY, squareSize, squareSize);
          fromCenter = { x: sqX + squareSize / 2, y: sqY + squareSize / 2 };
        }

        // Draw Rank & File Board Coordinates (Chess.com style)
        ctx.font = `bold ${Math.floor(squareSize * 0.16)}px Inter, system-ui, sans-serif`;
        const coordColor = isLight ? '#769656' : '#eeeed2';
        ctx.fillStyle = coordColor;

        // Rank number on leftmost file
        if (col === 0) {
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(String(rankNum), sqX + 5, sqY + 5);
        }

        // File letter on bottom row
        if (row === 7) {
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          ctx.fillText(fileChar, sqX + squareSize - 5, sqY + squareSize - 4);
        }
      }
    }

    // 3.2. Draw Professional Chess.com-Style Move Arrow (BEFORE pieces, so pieces stay on top!)
    if (fromCenter && toCenter) {
      const dx = toCenter.x - fromCenter.x;
      const dy = toCenter.y - fromCenter.y;
      const distance = Math.hypot(dx, dy);

      if (distance > 10) {
        const angle = Math.atan2(dy, dx);
        const shaftWidth = squareSize * 0.22;
        const headWidth = squareSize * 0.54;
        const headLength = Math.min(distance * 0.50, squareSize * 0.44);
        const shaftLength = distance - headLength;

        ctx.save();
        ctx.translate(fromCenter.x, fromCenter.y);
        ctx.rotate(angle);

        // Subtle depth shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 3;

        // Warm luminous amber arrow (Chess.com style)
        ctx.fillStyle = 'rgba(245, 166, 35, 0.88)';
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
        ctx.lineWidth = 1.5;

        // Single closed polygonal path for shaft and head
        ctx.beginPath();
        ctx.moveTo(0, -shaftWidth / 2);
        ctx.lineTo(shaftLength, -shaftWidth / 2);
        ctx.lineTo(shaftLength, -headWidth / 2);
        ctx.lineTo(distance, 0); // Tip pointing directly into center of destination
        ctx.lineTo(shaftLength, headWidth / 2);
        ctx.lineTo(shaftLength, shaftWidth / 2);
        ctx.lineTo(0, shaftWidth / 2);
        // Rounded back cap
        ctx.arc(0, 0, shaftWidth / 2, Math.PI / 2, -Math.PI / 2);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // 3.3. Place Pieces with High-Res Standard Vector SVGs (On top of arrow!)
    for (let r = 0; r < 8; r++) {
      const fenRow = fenRows[isFlipped ? 7 - r : r] || '8';
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
          const pieceKey = `${isWhitePiece ? 'w' : 'b'}${char.toUpperCase()}`;
          const img = getPieceImage(pieceKey);

          const pad = squareSize * 0.07;
          const pieceSize = squareSize * 0.86;

          if (img && img.complete && img.naturalWidth > 0) {
            // Render crystal-clear vector piece SVG
            ctx.drawImage(img, sqX + pad, sqY + pad, pieceSize, pieceSize);
          } else {
            // High-contrast Unicode fallback if image not ready yet
            const symbol = PIECE_SYMBOLS[char] || '';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `bold ${Math.floor(squareSize * 0.76)}px "Apple Symbols", "DejaVu Sans", "Segoe UI Symbol", sans-serif`;
            ctx.fillStyle = isWhitePiece ? '#ffffff' : '#171717';
            ctx.strokeStyle = isWhitePiece ? '#1f2937' : '#f3f4f6';
            ctx.lineWidth = 1.8;
            ctx.strokeText(symbol, sqX + squareSize / 2, sqY + squareSize / 2 + 2);
            ctx.fillText(symbol, sqX + squareSize / 2, sqY + squareSize / 2 + 2);
          }

          col++;
        }
      }
    }

    // 4. Move Badge & Details Section
    const infoY = ratio === '1:1' ? 895 : 1210;

    // Move Highlight Card
    const cardW = 720;
    const cardH = 135;
    const cardX = (width - cardW) / 2;

    ctx.fillStyle = '#1c1a17';
    ctx.fillRect(cardX, infoY, cardW, cardH);
    ctx.strokeStyle = '#36332c';
    ctx.lineWidth = 2;
    ctx.strokeRect(cardX, infoY, cardW, cardH);

    // Left: Move SAN & Badge
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 46px Inter, system-ui, sans-serif';
    ctx.fillText(moveFullText, cardX + 30, infoY + 60);

    // Classification tag
    ctx.fillStyle = classConfig.color;
    ctx.font = 'bold 28px Inter, system-ui, sans-serif';
    ctx.fillText(`${classConfig.label} ${classConfig.symbol}`, cardX + 30, infoY + 104);

    // Right: Evaluation & Accuracy
    ctx.textAlign = 'right';
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 32px Inter, system-ui, sans-serif';
    ctx.fillText(evalScoreText, cardX + cardW - 30, infoY + 60);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '600 20px Inter, system-ui, sans-serif';
    ctx.fillText('Stockfish 16 WASM', cardX + cardW - 30, infoY + 100);

    // Coach summary snippet
    if (activeMove?.comment) {
      const commentY = ratio === '1:1' ? 1065 : 1400;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'italic 500 22px Inter, system-ui, sans-serif';
      const commentSnippet = `"${activeMove.comment.slice(0, 85)}${activeMove.comment.length > 85 ? '...' : ''}"`;
      ctx.fillText(commentSnippet, width / 2, commentY);
    }

    // 5. Watermark Footer
    const footerY = height - (ratio === '1:1' ? 65 : 90);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#81b64c';
    ctx.font = 'bold 24px Inter, system-ui, sans-serif';
    ctx.fillText('♟️ Chess Review • Ücretsiz Satranç Oyun Analizi', width / 2, footerY);

    ctx.fillStyle = '#71717a';
    ctx.font = '500 17px Inter, system-ui, sans-serif';
    ctx.fillText('Geliştiriciler: DevErennn & DevOnurrr • github.com/DevErennn/chess-analysis-site', width / 2, footerY + 28);

    return canvas;
  }, [
    whiteName,
    blackName,
    whiteRating,
    blackRating,
    matchResult,
    fen,
    activeMove,
    orientation,
    moveFullText,
    classConfig,
    evalScoreText,
    piecesLoaded,
  ]);

  // Generate preview data URL whenever dependencies change
  useEffect(() => {
    if (!isOpen) return;

    try {
      const canvas = drawCard(aspectRatio);
      canvasRef.current = canvas;
      const dataUrl = canvas.toDataURL('image/png');
      setPreviewDataUrl(dataUrl);
    } catch (err) {
      console.error('Error generating card preview:', err);
    }
  }, [isOpen, aspectRatio, drawCard]);

  if (!isOpen) return null;

  const handleDownloadImage = () => {
    setIsDownloading(true);
    try {
      const canvas = drawCard(aspectRatio);
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const safeSan = (activeMove?.san || 'pozisyon').replace(/[^a-zA-Z0-9]/g, '');
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

  const handleCopyImage = async () => {
    try {
      const canvas = drawCard(aspectRatio);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        if (navigator.clipboard && window.ClipboardItem) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            setCopiedImage(true);
            setTimeout(() => setCopiedImage(false), 2500);
            return;
          } catch {
            // Fall back to copying share text
          }
        }
        handleCopyText();
      }, 'image/png');
    } catch {
      handleCopyText();
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
        className="relative w-full max-w-xl bg-chess-card border border-chess-border rounded-2xl shadow-2xl max-h-[94vh] flex flex-col text-gray-100 overflow-hidden"
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
        <div className="p-4 sm:p-5 pb-3 border-b border-chess-border/70 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 shadow-inner">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 id="move-share-title" className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
              Hey, Yaptığım Hamleye Bak!
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold uppercase tracking-wide">
                Görsel Kart
              </span>
            </h3>
            <p className="text-xs text-gray-400">
              Tahtanın fotoğrafı ve hamleni içeren yüksek çözünürlüklü sosyal medya kartı
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* Aspect Ratio Switcher */}
          <div className="flex items-center justify-between gap-2 bg-chess-surface p-1.5 rounded-xl border border-chess-border text-xs">
            <span className="text-gray-400 font-semibold px-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-chess-accent" />
              <span>Kart Formatı:</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setAspectRatio('1:1')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  aspectRatio === '1:1'
                    ? 'bg-chess-card text-chess-accent border border-chess-border shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Square className="w-3.5 h-3.5" />
                <span>1:1 Kare (Post)</span>
              </button>

              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  aspectRatio === '9:16'
                    ? 'bg-chess-card text-chess-accent border border-chess-border shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>9:16 Dikey (Hikaye)</span>
              </button>
            </div>
          </div>

          {/* Real Live Card Preview Image */}
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-black/40 border border-chess-border/80 shadow-inner">
            {previewDataUrl ? (
              <div className="relative group max-h-[46vh] flex items-center justify-center">
                <img
                  src={previewDataUrl}
                  alt="Hey yaptığım hamleye bak kartı"
                  className={`rounded-xl shadow-2xl object-contain border border-chess-border/80 max-h-[44vh] ${
                    aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[9/16]'
                  }`}
                />
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/75 text-[10px] text-gray-300 font-mono border border-white/10 pointer-events-none">
                  {aspectRatio === '1:1' ? '1200 x 1200' : '1080 x 1920'}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-gray-400 text-xs">
                <Sparkles className="w-6 h-6 mx-auto mb-2 text-chess-accent animate-spin" />
                <span>Görsel kart hazırlanıyor...</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Download PNG Button */}
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isDownloading || !previewDataUrl}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-chess-accent hover:bg-chess-accent/90 text-chess-dark font-extrabold text-xs transition-all shadow-md shadow-chess-accent/20 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{downloadSuccess ? 'Görsel İndirildi! 🎉' : 'Görseli İndir (PNG)'}</span>
              </button>

              {/* WhatsApp Share Button */}
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp'ta Paylaş</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Copy Image / Text Button */}
              <button
                type="button"
                onClick={handleCopyImage}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-chess-surface hover:bg-chess-card border border-chess-border text-gray-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                {copiedImage || copiedText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">{copiedImage ? 'Görsel Kopyalandı!' : 'Metin Kopyalandı!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Görseli / Metni Kopyala</span>
                  </>
                )}
              </button>

              {/* Native / Instagram Story Share Button */}
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-chess-surface hover:bg-chess-card border border-chess-border text-gray-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Instagram / Diğer</span>
              </button>
            </div>
          </div>

          {/* Social tip alert */}
          <div className="p-2.5 rounded-xl bg-chess-surface/60 border border-chess-border/60 text-[11px] text-gray-400 leading-relaxed flex items-center gap-2">
            <span className="text-sm">💡</span>
            <span>
              <strong>İpucu:</strong> "Görseli İndir" butonuna basarak kartı doğrudan <strong>Instagram Hikayeler</strong> veya <strong>WhatsApp Durum</strong>'a yükleyebilirsiniz!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
