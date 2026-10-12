import React, { useState } from 'react';
import { 
  X, 
  MessageSquareHeart, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  Bug, 
  Lightbulb, 
  HeartHandshake,
  Loader2
} from 'lucide-react';
import { GithubIcon } from './GithubIcon';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DISCORD_WEBHOOK_URL = import.meta.env.VITE_DISCORD_WEBHOOK_URL || '';

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [feedbackType, setFeedbackType] = useState<'suggestion' | 'bug' | 'praise' | 'other'>('suggestion');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [discordDelivered, setDiscordDelivered] = useState(false);

  if (!isOpen) return null;

  const validateEmail = (val: string): boolean => {
    const trimmed = val.trim();
    if (!trimmed) {
      setEmailError('E-posta adresi zorunludur.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailError('Lütfen geçerli bir e-posta adresi giriniz (örn: isim@mail.com).');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending) return;

    if (!validateEmail(email)) {
      return;
    }

    setIsSending(true);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    const newFeedback = {
      type: feedbackType,
      message: message.trim(),
      name: trimmedName,
      email: trimmedEmail,
      contact: trimmedName ? `${trimmedName} (${trimmedEmail})` : trimmedEmail,
      date: new Date().toISOString(),
    };

    // 1. Store in localStorage as backup
    try {
      const existing = JSON.parse(localStorage.getItem('chess_review_user_feedbacks') || '[]');
      existing.push(newFeedback);
      localStorage.setItem('chess_review_user_feedbacks', JSON.stringify(existing));
    } catch {
      // Ignore storage errors
    }

    // 2. Dispatch to Discord Webhook (if configured)
    if (DISCORD_WEBHOOK_URL) {
      try {
        const typeLabels: Record<string, string> = {
          suggestion: '💡 Yeni Özellik / Öneri',
          bug: '🐛 Hata Bildirimi',
          praise: '✨ Beğeni / Teşekkür',
          other: '💬 Genel Görüş',
        };

        const typeColors: Record<string, number> = {
          suggestion: 0x81b64c, // Green
          bug: 0xfa412d,        // Red
          praise: 0x26c2a3,     // Cyan / Turquoise
          other: 0x5c8bb0,      // Blue
        };

        const payload = {
          username: 'Chess Review Bildirim',
          avatar_url: 'https://raw.githubusercontent.com/DevErennn/chess-analysis-site/main/public/mini-logo.png',
          embeds: [
            {
              title: `♟️ ${typeLabels[feedbackType] || feedbackType}`,
              description: message.trim(),
              color: typeColors[feedbackType] || 0x81b64c,
              fields: [
                {
                  name: '👤 İsim',
                  value: trimmedName || 'Belirtilmedi',
                  inline: true,
                },
                {
                  name: '📧 E-posta',
                  value: trimmedEmail,
                  inline: true,
                },
                {
                  name: '🏷️ Kategori',
                  value: typeLabels[feedbackType] || feedbackType,
                  inline: true,
                },
                {
                  name: '⏰ Tarih',
                  value: new Date().toLocaleString('tr-TR'),
                  inline: true,
                },
              ],
              footer: {
                text: 'Chess Review • DevErennn & DevOnurrr',
              },
              timestamp: new Date().toISOString(),
            },
          ],
        };

        const response = await fetch(DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok || response.status === 204) {
          setDiscordDelivered(true);
        }
      } catch (err) {
        console.warn('Discord webhook notification notice:', err);
      }
    }

    setIsSending(false);
    setSubmitted(true);
  };

  const handleClose = () => {
    setSubmitted(false);
    setIsSending(false);
    setMessage('');
    setName('');
    setEmail('');
    setEmailError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-chess-card border border-chess-border rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col text-gray-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
      >
        {/* Top gradient highlight banner */}
        <div className="h-1.5 w-full bg-gradient-to-r from-chess-accent via-emerald-400 to-cyan-400 shrink-0" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-chess-surface border border-transparent hover:border-chess-border transition-colors cursor-pointer z-10"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 sm:p-7 overflow-y-auto flex-1">
          {!submitted ? (
            <>
              {/* Modal Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-chess-accent/15 border border-chess-accent/30 flex items-center justify-center text-chess-accent shrink-0 shadow-inner">
                  <MessageSquareHeart className="w-6 h-6" />
                </div>
                <div>
                  <h3 id="feedback-title" className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    Görüş ve Önerileriniz
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-chess-accent/20 text-chess-accent font-bold uppercase tracking-wider">
                      Geri Bildirim
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Chess Review deneyiminizi geliştirmemiz için düşünceleriniz çok kıymetli!
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 mt-5">
                {/* Type Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2">
                    Geri Bildirim Türü
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setFeedbackType('suggestion')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border font-medium transition-colors cursor-pointer ${
                        feedbackType === 'suggestion'
                          ? 'bg-chess-accent/20 border-chess-accent text-chess-accent font-bold shadow-sm'
                          : 'bg-chess-surface border-chess-border text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>Öneri</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFeedbackType('bug')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border font-medium transition-colors cursor-pointer ${
                        feedbackType === 'bug'
                          ? 'bg-red-500/20 border-red-500 text-red-400 font-bold shadow-sm'
                          : 'bg-chess-surface border-chess-border text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <Bug className="w-3.5 h-3.5" />
                      <span>Hata</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFeedbackType('praise')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border font-medium transition-colors cursor-pointer ${
                        feedbackType === 'praise'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold shadow-sm'
                          : 'bg-chess-surface border-chess-border text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Beğeni</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFeedbackType('other')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border font-medium transition-colors cursor-pointer ${
                        feedbackType === 'other'
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 font-bold shadow-sm'
                          : 'bg-chess-surface border-chess-border text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <HeartHandshake className="w-3.5 h-3.5" />
                      <span>Diğer</span>
                    </button>
                  </div>
                </div>

                {/* Message Input */}
                <div>
                  <label htmlFor="feedback-message" className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Mesajınız veya Öneriniz <span className="text-chess-accent">*</span>
                  </label>
                  <textarea
                    id="feedback-message"
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Deneyiminizi, görmek istediğiniz özellikleri veya karşılaştığınız durumları yazabilirsiniz..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-chess-surface border border-chess-border text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-chess-accent focus:ring-1 focus:ring-chess-accent transition-colors resize-none"
                  />
                </div>

                {/* Contact Section: 1. Name & 2. Email (Required) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="feedback-name" className="block text-xs font-semibold text-gray-300 mb-1.5">
                      İsim / Kullanıcı Adı <span className="text-gray-500 font-normal">(opsiyonel)</span>
                    </label>
                    <input
                      id="feedback-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Örn: Ahmet veya Chess.com nicki"
                      className="w-full px-3.5 py-2 rounded-xl bg-chess-surface border border-chess-border text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-chess-accent focus:ring-1 focus:ring-chess-accent transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="feedback-email" className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
                      <span>E-posta Adresi <span className="text-red-400 font-bold">*</span></span>
                      <span className="text-[10px] text-chess-accent font-medium">Zorunlu</span>
                    </label>
                    <input
                      id="feedback-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) validateEmail(e.target.value);
                      }}
                      onBlur={(e) => validateEmail(e.target.value)}
                      placeholder="ornek@mail.com"
                      className={`w-full px-3.5 py-2 rounded-xl bg-chess-surface border text-xs text-gray-100 placeholder-gray-500 focus:outline-none transition-colors ${
                        emailError 
                          ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50' 
                          : 'border-chess-border focus:border-chess-accent focus:ring-1 focus:ring-chess-accent'
                      }`}
                    />
                    {emailError && (
                      <p className="text-[11px] text-red-400 mt-1 font-medium animate-in fade-in">
                        {emailError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Developer note */}
                <div className="p-3 rounded-xl bg-chess-surface/70 border border-chess-border/60 text-[11px] text-gray-400 leading-relaxed flex items-center gap-2">
                  <span className="text-chess-accent text-sm">💡</span>
                  <span>
                    Geri bildirimler doğrudan geliştiricilerimiz <strong className="text-gray-200">DevErennn</strong> ve <strong className="text-gray-200">DevOnurrr</strong> tarafından incelenmektedir.
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <a
                    href="https://github.com/DevErennn/chess-analysis-site/issues"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    <GithubIcon className="w-3.5 h-3.5" />
                    <span>GitHub'da Issue Aç</span>
                  </a>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 rounded-xl bg-chess-surface hover:bg-chess-card border border-chess-border text-xs font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer"
                    >
                      Daha Sonra
                    </button>
                    <button
                      type="submit"
                      disabled={!message.trim() || isSending}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-chess-accent hover:bg-chess-accent/90 text-chess-dark text-xs font-bold transition-all shadow-md shadow-chess-accent/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>İletiliyor...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Gönder</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </>
          ) : (
            /* Success confirmation screen */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-xl font-black text-white">Görüşünüz İletildi!</h4>
                {discordDelivered ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    <span>Discord Webhook ile geliştiricilere ulaştırıldı ✨</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Geri bildiriminiz kaydedildi ✨</span>
                  </div>
                )}
                <p className="text-xs text-gray-300 max-w-sm mx-auto mt-2 leading-relaxed">
                  Değerli görüş ve önerileriniz için çok teşekkür ederiz. DevErennn & DevOnurrr olarak mesajınızı inceleyeceğiz.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <a
                  href="https://github.com/DevErennn/chess-analysis-site"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-chess-surface hover:bg-chess-card border border-chess-border text-xs font-semibold text-gray-200 transition-colors"
                >
                  <GithubIcon className="w-4 h-4 text-chess-accent" />
                  <span>GitHub Projesi</span>
                </a>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2 rounded-xl bg-chess-accent hover:bg-chess-accent/90 text-chess-dark text-xs font-bold transition-colors cursor-pointer"
                >
                  Tamamdır
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
