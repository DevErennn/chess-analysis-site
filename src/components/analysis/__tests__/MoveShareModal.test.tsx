import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MoveShareModal } from '../MoveShareModal';

describe('MoveShareModal', () => {
  const mockMetadata = {
    white: { name: 'ErenNotoriousV2', rating: '454' },
    black: { name: 'Zacwali', rating: '437' },
    result: '1-0',
    pgn: '1. e4 e5',
  };

  it('renders without crashing when isOpen is true and activeMove is null', () => {
    const html = renderToString(
      <MoveShareModal
        isOpen={true}
        onClose={() => {}}
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        activeMove={null}
        metadata={mockMetadata}
        orientation="white"
      />
    );
    expect(html).toContain('Hey, Yaptığım Hamleye Bak!');
  });

  it('renders without crashing when activeMove is provided', () => {
    const html = renderToString(
      <MoveShareModal
        isOpen={true}
        onClose={() => {}}
        fen="rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
        activeMove={{
          moveIndex: 0,
          san: 'e4',
          from: 'e2',
          to: 'e4',
          color: 'w',
          fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
          moveNumber: 1,
          evalAfter: 35,
          classification: 'best',
          comment: 'Harika bir merkez kontrolü',
          bestMoveSan: 'e4',
          bestMoveUci: 'e2e4',
          cpl: 0,
        }}
        metadata={mockMetadata}
        orientation="white"
      />
    );
    expect(html).toContain('Hey, Yaptığım Hamleye Bak!');
  });
});
