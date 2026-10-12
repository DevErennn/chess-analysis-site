import React, { useState } from 'react';
import { 
  X, 
  MessageSquareHeart, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  Bug, 
  Lightbulb, 
  HeartHandshake 
} from 'lucide-react';
import { GithubIcon } from './GithubIcon';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [feedbackType, setFeedbackType] = useState<'suggestion' | 'bug' | 'praise' | 'other'>('suggestion');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Store in localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('chess_review_user_feedbacks') || '[]');
      existing.push({
        type: feedbackType,
        message: message.trim(),
        contact: contact.trim(),
        date: new Date().toISOString(),
      });
      localStorage.setItem('chess_review_user_feedbacks', JSON.stringify(existing));
    } catch {
      // Ignore storage errors
    }

    setSubmitted(true);
  };

  const handleClose = () => {
    setSubmitted(false);
    setMessage('');
    setContact('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-chess-card border border-chess-border rounded-2xl shadow-2xl overflow-hidden transition-all text-gray-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
      >
        {/* Top gradient highlight banner */}
        <div className="h-1.5 w-full bg-gradient-to-r from-chess-accent via-emerald-400 to-cyan-400" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-chess-surface border border-transparent hover:border-chess-border transition-colors cursor-pointer"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-7">
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

                {/* Contact Input (Optional) */}
                <div>
                  <label htmlFor="feedback-contact" className="block text-xs font-semibold text-gray-300 mb-1.5">
                    İletişim / E-posta <span className="text-gray-500 font-normal">(opsiyonel)</span>
                  </label>
                  <input
                    id="feedback-contact"
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="ornek@mail.com veya Chess.com kullanıcı adı"
                    className="w-full px-3.5 py-2 rounded-xl bg-chess-surface border border-chess-border text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-chess-accent focus:ring-1 focus:ring-chess-accent transition-colors"
                  />
                </div>

                {/* Developer note */}
                <div className="p-3 rounded-xl bg-chess-surface/70 border border-chess-border/60 text-[11px] text-gray-400 leading-relaxed flex items-center gap-2">
                  <span className="text-chess-accent text-sm">💡</span>
                  <span>
                    Geri bildirimler doğrudan geliştiricilerimiz <strong className="text-gray-200">Eren UÇAR</strong> ve <strong className="text-gray-200">Onuralp DURHAN</strong> tarafından incelenmektedir.
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
                      disabled={!message.trim()}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-chess-accent hover:bg-chess-accent/90 text-chess-dark text-xs font-bold transition-all shadow-md shadow-chess-accent/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Gönder</span>
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
                <p className="text-xs text-gray-300 max-w-sm mx-auto mt-2 leading-relaxed">
                  Değerli görüş ve önerileriniz için çok teşekkür ederiz. Eren UÇAR & Onuralp DURHAN olarak bildirimlerinizi dikkate alacağız.
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
