import { useState } from 'react';
import type { GameMetadata } from './types/chess';
import { LandingPage } from './components/landing/LandingPage';
import { AnalysisView } from './components/analysis/AnalysisView';
import { MaintenancePage } from './components/maintenance/MaintenancePage';
import { FeedbackModal } from './components/common/FeedbackModal';
import { WelcomeModal } from './components/common/WelcomeModal';
import { SplashScreen } from './components/common/SplashScreen';
import { AdminFeedbacksModal } from './components/common/AdminFeedbacksModal';

function App() {
  const [currentPgn, setCurrentPgn] = useState<string | null>(null);
  const [gameMetadata, setGameMetadata] = useState<GameMetadata | null>(null);
  const [viewMode, setViewMode] = useState<'landing' | 'analysis'>('landing');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isAdminFeedbacksOpen, setIsAdminFeedbacksOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Yükleme ekranı bittiğinde ilk olarak Hoş Geldiniz & Bilgilendirme modalı açılsın
  const handleSplashFinish = () => {
    setShowSplash(false);
    const hasSeenWelcome = sessionStorage.getItem('chess_review_welcomed');
    if (!hasSeenWelcome) {
      setTimeout(() => {
        setIsWelcomeOpen(true);
      }, 300);
    }
  };

  // Check if maintenance mode is enabled via environment variable or ?maintenance=1
  const isMaintenance =
    import.meta.env.VITE_MAINTENANCE_MODE === 'true' ||
    (typeof window !== 'undefined' && window.location.search.includes('maintenance=1'));

  if (isMaintenance) {
    return <MaintenancePage />;
  }

  const handleSelectGame = (pgn: string, metadata: GameMetadata) => {
    setCurrentPgn(pgn);
    setGameMetadata(metadata);
    setViewMode('analysis');
  };

  const handleBackToLanding = () => {
    setViewMode('landing');
  };

  return (
    <div className="min-h-screen bg-chess-dark text-gray-100 selection:bg-chess-accent selection:text-chess-dark">
      {/* Açılış Yükleme Ekranı (Devrilen Beyaz Şah Animasyonu) */}
      {showSplash && (
        <SplashScreen onFinish={handleSplashFinish} minDuration={2200} />
      )}

      {viewMode === 'landing' ? (
        <LandingPage 
          onSelectGame={handleSelectGame} 
          onOpenFeedback={() => setIsFeedbackOpen(true)} 
          onOpenWelcome={() => setIsWelcomeOpen(true)}
          onOpenAdminFeedbacks={() => setIsAdminFeedbacksOpen(true)}
        />
      ) : (
        currentPgn && gameMetadata && (
          <AnalysisView
            pgn={currentPgn}
            metadata={gameMetadata}
            onBack={handleBackToLanding}
            onOpenFeedback={() => setIsFeedbackOpen(true)}
          />
        )
      )}

      {/* Hoş Geldiniz & Bilgilendirme Modalı */}
      <WelcomeModal
        isOpen={isWelcomeOpen}
        onClose={() => setIsWelcomeOpen(false)}
        onOpenFeedback={() => {
          setIsWelcomeOpen(false);
          setIsFeedbackOpen(true);
        }}
      />

      {/* Görüş ve Önerileriniz Penceresi */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />

      {/* Geliştirici Paneli (Gelen Görüşleri İnceleme Modalı) */}
      <AdminFeedbacksModal
        isOpen={isAdminFeedbacksOpen}
        onClose={() => setIsAdminFeedbacksOpen(false)}
      />
    </div>
  );
}

export default App;

