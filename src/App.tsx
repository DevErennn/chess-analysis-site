import { useState } from 'react';
import type { GameMetadata } from './types/chess';
import { LandingPage } from './components/landing/LandingPage';
import { AnalysisPreview } from './components/analysis/AnalysisPreview';

function App() {
  const [currentPgn, setCurrentPgn] = useState<string | null>(null);
  const [gameMetadata, setGameMetadata] = useState<GameMetadata | null>(null);
  const [viewMode, setViewMode] = useState<'landing' | 'analysis'>('landing');

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
          <AnalysisPreview
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
