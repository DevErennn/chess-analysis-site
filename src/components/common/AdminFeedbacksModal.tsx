import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Download, Trash2, Calendar, User, Tag, Mail } from 'lucide-react';

interface FeedbackItem {
  type: string;
  message: string;
  name?: string;
  email?: string;
  contact?: string;
  date: string;
}

interface AdminFeedbacksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminFeedbacksModal: React.FC<AdminFeedbacksModalProps> = ({ isOpen, onClose }) => {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);

  const loadFeedbacks = () => {
    try {
      const data = JSON.parse(localStorage.getItem('chess_review_user_feedbacks') || '[]');
      setFeedbacks(data);
    } catch {
      setFeedbacks([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFeedbacks();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClear = () => {
    if (window.confirm('Tüm kayıtlı görüş ve önerileri silmek istediğinize emin misiniz?')) {
      localStorage.removeItem('chess_review_user_feedbacks');
      setFeedbacks([]);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(feedbacks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `chess_review_feedbacks_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-chess-card border border-chess-border rounded-2xl shadow-2xl max-h-[85vh] flex flex-col text-gray-100 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-chess-border flex items-center justify-between bg-chess-surface/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-chess-accent/20 border border-chess-accent/40 flex items-center justify-center text-chess-accent font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Gelen Görüş ve Öneriler (Geliştirici Paneli)</h3>
              <p className="text-xs text-gray-400">
                Toplam <span className="text-chess-accent font-bold">{feedbacks.length}</span> adet geri bildirim kayıtlı
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-chess-surface border border-transparent hover:border-chess-border transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        {feedbacks.length > 0 && (
          <div className="px-5 py-2.5 bg-chess-surface/40 border-b border-chess-border/60 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-chess-surface hover:bg-chess-card border border-chess-border text-gray-300 hover:text-white transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-chess-accent" />
              <span>JSON Olarak İndir</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Tümünü Temizle</span>
            </button>
          </div>
        )}

        {/* Feedbacks List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {feedbacks.length === 0 ? (
            <div className="text-center py-12 text-gray-500 space-y-2">
              <MessageSquare className="w-10 h-10 mx-auto text-gray-600" />
              <p className="text-sm font-medium">Henüz kaydedilmiş geri bildirim bulunmuyor.</p>
              <p className="text-xs text-gray-600 max-w-sm mx-auto">
                Kullanıcılar "Görüş ve Önerileriniz" penceresinden form doldurdukça burada listelenecektir.
              </p>
            </div>
          ) : (
            feedbacks.map((item, idx) => (
              <div 
                key={idx}
                className="p-4 rounded-xl bg-chess-surface/80 border border-chess-border/80 hover:border-chess-accent/40 transition-colors space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] bg-chess-accent/20 text-chess-accent border border-chess-accent/30 flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {item.type}
                    </span>
                    {(item.name || item.contact) && (
                      <span className="text-gray-300 font-medium flex items-center gap-1 bg-chess-card px-2 py-0.5 rounded border border-chess-border">
                        <User className="w-3 h-3 text-chess-accent" />
                        {item.name || item.contact}
                      </span>
                    )}
                    {item.email && (
                      <a 
                        href={`mailto:${item.email}`}
                        className="text-gray-300 hover:text-white font-mono flex items-center gap-1 bg-chess-card px-2 py-0.5 rounded border border-chess-border hover:border-chess-accent transition-colors"
                      >
                        <Mail className="w-3 h-3 text-blue-400" />
                        {item.email}
                      </a>
                    )}
                  </div>
                  <span className="text-gray-500 font-mono text-[11px] flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.date).toLocaleString('tr-TR')}
                  </span>
                </div>

                <p className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed bg-chess-card/50 p-3 rounded-lg border border-chess-border/50">
                  {item.message}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-chess-border bg-chess-surface/80 flex items-center justify-between text-xs text-gray-400">
          <span>Geliştirici İnceleme Modu</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-chess-accent hover:bg-chess-accent/90 text-chess-dark font-bold transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
