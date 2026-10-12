import { describe, it, expect } from 'vitest';
// @ts-expect-error JS module without type declaration
import { winProbability, normalizeScoreToPlayerPOV, calculateMoveAccuracy, calculateGameAccuracy } from '../accuracy.js';
// @ts-expect-error JS module without type declaration
import { detectMaterialSacrifice, checkBookMove, hasHangingPiece } from '../analyzeGame.js';

describe('accuracy.js Unit Tests', () => {
  it('correctly normalizes POV for White and Black', () => {
    // White: +100 CP -> +100
    expect(normalizeScoreToPlayerPOV(100, 'w')).toBe(100);
    // Black: -100 CP (Black is winning) -> +100 mover advantage
    expect(normalizeScoreToPlayerPOV(-100, 'b')).toBe(100);
    // Black: +100 CP (White is winning) -> -100 mover advantage
    expect(normalizeScoreToPlayerPOV(100, 'b')).toBe(-100);
  });

  it('winProbability uses Sigmoid curve correctly', () => {
    // 0 cp -> 50%
    expect(winProbability(0)).toBeCloseTo(50, 1);
    // Positive cp -> >50%
    expect(winProbability(200)).toBeGreaterThan(60);
    // Negative cp -> <50%
    expect(winProbability(-200)).toBeLessThan(40);
  });

  it('calculates move accuracy with asymptotic formula', () => {
    // Best move: 0 loss -> 100%
    const bestMove = calculateMoveAccuracy(100, 100, 'w', true);
    expect(bestMove.accuracy).toBe(100);
    expect(bestMove.probLoss).toBe(0);

    // Minor inaccuracy: probLoss small -> accuracy ~90-95%
    const smallLoss = calculateMoveAccuracy(100, 80, 'w', false);
    expect(smallLoss.accuracy).toBeGreaterThan(85);

    // Blunder: big drop -> low accuracy
    const blunder = calculateMoveAccuracy(300, -300, 'w', false);
    expect(blunder.accuracy).toBeLessThan(30);
  });

  it('calculates game accuracy average', () => {
    expect(calculateGameAccuracy([100, 90, 80])).toBe(90);
  });
});

describe('analyzeGame.js Unit Tests', () => {
  it('detects book moves correctly from openings.json', () => {
    const bookCheck = checkBookMove(
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
      'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'
    );
    expect(bookCheck.isBook).toBe(true);
    expect(bookCheck.openingName).toContain('Italian');
  });

  it('detects material sacrifice for Brilliant candidates', () => {
    // Classic queen sacrifice / piece sacrifice scenario
    const fenBefore = 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5';
    const sac = detectMaterialSacrifice(fenBefore, 'c4', 'f7', 'w', 'c4f7 e8f7');
    expect(sac.isSacrifice).toBe(true);
    expect(sac.materialLost).toBeGreaterThanOrEqual(2);
  });

  it('detects passive queen sacrifice in Donald Byrne vs Bobby Fischer (17... Be6!!)', () => {
    // FEN before 17... Be6: White's Bishop on c5 attacks Black's Queen on b6.
    // Fischer does NOT move the Queen; he plays 17... Be6!! leaving the Queen hanging.
    const fenBefore = 'r3r1k1/pp3pbp/1qp3p1/2B5/2BP2b1/Q1n2N2/P4PPP/3R1K1R b - - 3 17';
    const hanging = hasHangingPiece(fenBefore, 'g4', 'e6');
    expect(hanging.hasHanging).toBe(true);
    expect(hanging.isPassive).toBe(true);
    expect(hanging.hangingPieceType).toBe('q'); // Queen
    expect(hanging.hangingSquare).toBe('b6');
    expect(hanging.materialDeficit).toBeGreaterThanOrEqual(6); // Queen traded for Bishop (9 - 3 = 6)
  });
});
