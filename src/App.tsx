import { useState, useEffect } from 'react';
import type { GameMetadata } from './types/chess';
import { LandingPage } from './components/landing/LandingPage';
import { AnalysisView } from './components/analysis/AnalysisView';
import { MaintenancePage } from './components/maintenance/MaintenancePage';
import { FeedbackModal } from './components/common/FeedbackModal';

function App() {
  const [currentPgn, setCurrentPgn] = useState<string | null>(null);
  const [gameMetadata, setGameMetadata] = useState<GameMetadata | null>(null);
  const [viewMode, setViewMode] = useState<'landing' | 'analysis'>('landing');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Site ilk açılırken ekrana görüş ve önerileriniz penceresi çıksın
  useEffect(() => {
    const hasSeenSession = sessionStorage.getItem('chess_review_initial_feedback_shown');
    if (!hasSeenSession) {
      const timer = setTimeout(() => {
        setIsFeedbackOpen(true);
        sessionStorage.setItem('chess_review_initial_feedback_shown', 'true');
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

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
      {viewMode === 'landing' ? (
        <LandingPage 
          onSelectGame={handleSelectGame} 
          onOpenFeedback={() => setIsFeedbackOpen(true)} 
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

      {/* Görüş ve Önerileriniz Penceresi */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </div>
  );
}

export default App;
