import { useState } from 'react';
import type { GameMetadata } from './types/chess';
import { LandingPage } from './components/landing/LandingPage';
import { AnalysisView } from './components/analysis/AnalysisView';
import { MaintenancePage } from './components/maintenance/MaintenancePage';

function App() {
  const [currentPgn, setCurrentPgn] = useState<string | null>(null);
  const [gameMetadata, setGameMetadata] = useState<GameMetadata | null>(null);
  const [viewMode, setViewMode] = useState<'landing' | 'analysis'>('landing');

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
        <LandingPage onSelectGame={handleSelectGame} />
      ) : (
        currentPgn && gameMetadata && (
          <AnalysisView
            pgn={currentPgn}
            metadata={gameMetadata}
            onBack={handleBackToLanding}
          />
        )
      )}
    </div>
  );
}

export default App;
