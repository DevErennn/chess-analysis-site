import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Share2, 
  Trophy, 
  Award, 
  Sparkles,
  BookOpen,
  Image as ImageIcon
} from 'lucide-react';
import type { GameMetadata, GameAnalysisResult } from '../../types/chess';
import type { OpeningInfo } from '../../lib/openingExplorer';
import { CLASSIFICATION_CONFIG } from './constants';

interface ShareReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: GameMetadata;
  analysisResult: GameAnalysisResult;
  openingInfo?: OpeningInfo | null;
}

export const ShareReportModal: React.FC<ShareReportModalProps> = ({
  isOpen,
  onClose,
  metadata,
  analysisResult,
  openingInfo,
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadingCard, setDownloadingCard] = useState(false);
  const [cardSuccess, setCardSuccess] = useState(false);

  if (!isOpen) return null;

  const { white, black, result } = metadata;
  const { accuracy, counts, coachSummary, moves } = analysisResult;

  // Build social text summary
  const generateShareText = (): string => {
    const whiteName = white.name || 'Beyaz';
    const blackName = black.name || 'Siyah';
    const whiteRat = white.rating ? ` (${white.rating})` : '';
    const blackRat = black.rating ? ` (${black.rating})` : '';

    const openingStr = openingInfo
      ? `\n📖 Açılış: ${openingInfo.eco} - ${openingInfo.turkishName || openingInfo.name}`
      : metadata.opening
      ? `\n📖 Açılış: ${metadata.opening}`
      : '';

    const brilliantCount = (counts.white.brilliant || 0) + (counts.black.brilliant || 0);
    const greatCount = (counts.white.great || 0) + (counts.black.great || 0);

    const highlights: string[] = [];
    if (brilliantCount > 0) highlights.push(`‼️ ${brilliantCount} Göz Alıcı Hamle (Brilliant)`);
    if (greatCount > 0) highlights.push(`! ${greatCount} Üstün Hamle (Great)`);
    highlights.push(`⭐ En İyi: ⚪ ${counts.white.best} | ⚫ ${counts.black.best}`);
    highlights.push(`❌ Hata/Gaf: ⚪ ${(counts.white.mistake || 0) + (counts.white.blunder || 0)} | ⚫ ${(counts.black.mistake || 0) + (counts.black.blunder || 0)}`);

    return [
      `♟️ Satranç Maç İncelemesi | Chess Game Review`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `⚪ ${whiteName}${whiteRat}: %${accuracy.white} Doğruluk`,
      `⚫ ${blackName}${blackRat}: %${accuracy.black} Doğruluk`,
      `🏆 Sonuç: ${result || '*'}`,
      openingStr,
      ``,
      `📊 Öne Çıkanlar:`,
      ...highlights.map((h) => `• ${h}`),
      ``,
      `💬 Koç: "${coachSummary.slice(0, 120)}${coachSummary.length > 120 ? '...' : ''}"`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `⚡ Analiz Platformu: Stockfish WebAssembly & Doğruluk Modeli`,
    ]
      .filter((line) => line !== undefined)
      .join('\n');
  };

  // Generate enriched PGN with annotations
  const generateAnnotatedPgn = (): string => {
    let pgnHeader = metadata.pgn;

    // Build annotated moves text
    let annotatedMovesStr = '';
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      if (m.color === 'w') {
        annotatedMovesStr += `${m.moveNumber}. `;
      } else if (i === 0) {
        annotatedMovesStr += `${m.moveNumber}... `;
      }

      annotatedMovesStr += m.san;

      // Evaluation and classification annotation
      const comments: string[] = [];
      if (m.classification) {
        const cfg = CLASSIFICATION_CONFIG[m.classification];
        comments.push(`[${cfg.symbol}] ${cfg.label}`);
      }
      if (m.evalAfter !== undefined) {
        if (m.mateAfter !== undefined && m.mateAfter !== null) {
          comments.push(`M${m.mateAfter}`);
        } else {
          const evalNum = (m.evalAfter / 100).toFixed(2);
          comments.push(m.evalAfter >= 0 ? `+${evalNum}` : evalNum);
        }
      }
      if (m.bestMoveSan && m.bestMoveSan !== m.san) {
        comments.push(`Best: ${m.bestMoveSan}`);
      }

      if (comments.length > 0) {
        annotatedMovesStr += ` { ${comments.join(' | ')} }`;
      }

      annotatedMovesStr += ' ';
    }

    if (metadata.result) {
      annotatedMovesStr += `${metadata.result}`;
    }

    // Replace move text in original pgn or assemble fresh
    const headerLines = pgnHeader
      .split('\n')
      .filter((line) => line.trim().startsWith('['));

    if (headerLines.length > 0) {
      return `${headerLines.join('\n')}\n\n${annotatedMovesStr.trim()}\n`;
    }

    return `[Event "Chess Analysis Review"]\n[White "${white.name}"]\n[Black "${black.name}"]\n[Result "${result}"]\n\n${annotatedMovesStr.trim()}\n`;
  };

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(generateShareText());
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch (err) {
      console.error('Failed to copy report:', err);
    }
  };

  const handleDownloadPgn = () => {
    try {
      const pgnContent = generateAnnotatedPgn();
      const blob = new Blob([pgnContent], { type: 'application/x-chess-pgn;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const safeWhite = (white.name || 'white').toLowerCase().replace(/[^a-z0-9]/g, '_');
      const safeBlack = (black.name || 'black').toLowerCase().replace(/[^a-z0-9]/g, '_');
      link.href = url;
      link.download = `${safeWhite}_vs_${safeBlack}_analysis.pgn`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to download PGN:', err);
    }
  };

  const handleDownloadImageCard = () => {
    setDownloadingCard(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setDownloadingCard(false);
        return;
      }

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(0.5, '#0f172a');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 630);

      // Radial neon glows
      const radGrad = ctx.createRadialGradient(250, 120, 10, 250, 120, 450);
      radGrad.addColorStop(0, 'rgba(56, 189, 248, 0.18)');
      radGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, 1200, 630);

      const radGrad2 = ctx.createRadialGradient(950, 480, 10, 950, 480, 450);
      radGrad2.addColorStop(0, 'rgba(129, 140, 248, 0.16)');
      radGrad2.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = radGrad2;
      ctx.fillRect(0, 0, 1200, 630);

      // Outer border frame
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 1160, 590);

      // Top Title Bar
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.fillText('⚡ SATRANÇ OYUN İNCELEMESİ • GAME REVIEW', 60, 75);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 18px Inter, sans-serif';
      const openingText = openingInfo
        ? `${openingInfo.eco} - ${openingInfo.turkishName || openingInfo.name}`
        : metadata.opening || metadata.event || 'Klasik Karşılaşma';
      ctx.fillText(openingText.slice(0, 60), 60, 110);

      // Safe roundRect helper
      const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, w, h, r);
        } else {
          ctx.rect(x, y, w, h);
        }
      };

      // White Player Card (Left)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      drawRoundRect(60, 140, 470, 220, 20);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // White indicator circle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(105, 195, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // White player name & rating
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px Inter, sans-serif';
      ctx.fillText((white.name || 'Beyaz').slice(0, 18), 140, 205);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '18px Inter, sans-serif';
      ctx.fillText(white.rating ? `Puan: ${white.rating}` : 'Oyuncu', 140, 235);

      // White accuracy score
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 54px monospace';
      ctx.fillText(`%${accuracy.white}`, 105, 315);

      ctx.fillStyle = '#64748b';
      ctx.font = '600 15px Inter, sans-serif';
      ctx.fillText('DOĞRULUK ORANI', 315, 308);

      // Center VS & Result
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 26px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VS', 600, 230);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 40px monospace';
      ctx.fillText(result || '*', 600, 280);

      // Black Player Card (Right)
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      drawRoundRect(670, 140, 470, 220, 20);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Black indicator circle
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(715, 195, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Black player name & rating
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px Inter, sans-serif';
      ctx.fillText((black.name || 'Siyah').slice(0, 18), 750, 205);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '18px Inter, sans-serif';
      ctx.fillText(black.rating ? `Puan: ${black.rating}` : 'Oyuncu', 750, 235);

      // Black accuracy score
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 54px monospace';
      ctx.fillText(`%${accuracy.black}`, 715, 315);

      ctx.fillStyle = '#64748b';
      ctx.font = '600 15px Inter, sans-serif';
      ctx.fillText('DOĞRULUK ORANI', 925, 308);

      // Stats Banner Box
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      drawRoundRect(60, 385, 1080, 110, 16);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`‼️ Göz Alıcı: ${(counts.white.brilliant || 0) + (counts.black.brilliant || 0)}`, 90, 430);

      ctx.fillStyle = '#34d399';
      ctx.fillText(`⭐ En İyi: ${(counts.white.best || 0) + (counts.black.best || 0)}`, 320, 430);

      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`⚠️ Yanılgı: ${(counts.white.inaccuracy || 0) + (counts.black.inaccuracy || 0)}`, 560, 430);

      ctx.fillStyle = '#f87171';
      ctx.fillText(`❌ Hata & Gaf: ${(counts.white.mistake || 0) + (counts.white.blunder || 0) + (counts.black.mistake || 0) + (counts.black.blunder || 0)}`, 820, 430);

      // Coach comment
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'italic 16px Inter, sans-serif';
      const cleanCoach = (coachSummary || 'Kapsamlı oyun analizi ve hamle sınıflandırması.').replace(/\n/g, ' ');
      ctx.fillText(`💬 "${cleanCoach.slice(0, 95)}${cleanCoach.length > 95 ? '...' : ''}"`, 90, 468);

      // Bottom Watermark
      ctx.fillStyle = '#64748b';
      ctx.font = '600 15px Inter, sans-serif';
      ctx.fillText('Stockfish 16 WASM & Açık Kaynak Doğruluk Modeli', 60, 545);

      ctx.textAlign = 'right';
      ctx.fillText('Chess Analysis Site', 1140, 545);

      // Export Blob
      canvas.toBlob((blob) => {
        if (!blob) {
          setDownloadingCard(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const safeWhite = (white.name || 'white').toLowerCase().replace(/[^a-z0-9]/g, '_');
        const safeBlack = (black.name || 'black').toLowerCase().replace(/[^a-z0-9]/g, '_');
        link.href = url;
        link.download = `${safeWhite}_vs_${safeBlack}_card.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setDownloadingCard(false);
        setCardSuccess(true);
        setTimeout(() => setCardSuccess(false), 2500);
      }, 'image/png');
    } catch (err) {
      console.error('Error generating card image:', err);
      setDownloadingCard(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-chess-card border border-chess-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-chess-border flex items-center justify-between bg-chess-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-chess-accent/20 border border-chess-accent/40 flex items-center justify-center text-chess-accent">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Analiz Raporunu Paylaş & İndir</h3>
              <p className="text-[11px] text-gray-400">Doğruluk skoru, hamle yorumları ve zenginleştirilmiş PGN</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-chess-card transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Visual Preview Card */}
          <div className="p-4 rounded-xl bg-chess-surface border border-chess-border shadow-inner space-y-4">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-chess-border/60">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white border border-gray-400" />
                <span className="font-bold text-white">{white.name}</span>
                {white.rating && <span className="text-gray-400 font-mono">({white.rating})</span>}
              </div>
              <div className="font-mono font-extrabold text-sm text-chess-accent">
                %{accuracy.white}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-black border border-gray-600" />
                <span className="font-bold text-white">{black.name}</span>
                {black.rating && <span className="text-gray-400 font-mono">({black.rating})</span>}
              </div>
              <div className="font-mono font-extrabold text-sm text-chess-accent">
                %{accuracy.black}
              </div>
            </div>

            {/* Opening Tag */}
            {openingInfo && (
              <div className="pt-2 border-t border-chess-border/40 flex items-center gap-2 text-xs text-gray-300">
                <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-semibold text-gray-400">{openingInfo.eco}:</span>
                <span className="text-white truncate">{openingInfo.turkishName || openingInfo.name}</span>
              </div>
            )}
          </div>

          {/* Classification Stats Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-chess-surface/70 border border-chess-border/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Göz Alıcı (!!)</span>
              </div>
              <span className="font-mono font-bold text-white">
                {(counts.white.brilliant || 0) + (counts.black.brilliant || 0)}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-chess-surface/70 border border-chess-border/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Award className="w-3.5 h-3.5" />
                <span>En İyi (⭐)</span>
              </div>
              <span className="font-mono font-bold text-white">
                {(counts.white.best || 0) + (counts.black.best || 0)}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-chess-surface/70 border border-chess-border/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <Trophy className="w-3.5 h-3.5" />
                <span>Kaçırılan / Yanılgı</span>
              </div>
              <span className="font-mono font-bold text-white">
                {(counts.white.inaccuracy || 0) + (counts.black.inaccuracy || 0)}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-chess-surface/70 border border-chess-border/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-red-400 font-semibold">
                <span>❌ Hata & Gaf</span>
              </div>
              <span className="font-mono font-bold text-white">
                {(counts.white.mistake || 0) + (counts.white.blunder || 0) + (counts.black.mistake || 0) + (counts.black.blunder || 0)}
              </span>
            </div>
          </div>

          {/* Social share text preview */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Paylaşım Metni Önizlemesi:
            </div>
            <pre className="p-3 bg-chess-surface border border-chess-border rounded-xl text-xs font-mono text-gray-300 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto selection:bg-chess-accent">
              {generateShareText()}
            </pre>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 border-t border-chess-border bg-chess-surface flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCopyReport}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-chess-card hover:bg-chess-cardHover border border-chess-border text-xs font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow"
          >
            {copiedText ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Rapor Panoya Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-chess-accent" />
                <span>Raporu Kopyala (Metin)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadImageCard}
            disabled={downloadingCard}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow"
            title="Instagram / Twitter / Discord için 1200x630 görsel kart oluşturup indirir"
          >
            {cardSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Görsel İndirildi!</span>
              </>
            ) : downloadingCard ? (
              <>
                <ImageIcon className="w-4 h-4 animate-spin" />
                <span>Oluşturuluyor...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span>Kart İndir (.png)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadPgn}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-chess-accent hover:bg-chess-accentHover text-chess-dark font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-chess-accent/20 transition-all cursor-pointer"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>İndirildi!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Analizli PGN İndir (.pgn)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
