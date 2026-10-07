import { describe, it, expect } from 'vitest';
import {
  classifyMove,
  winPct,
  moverWinPct,
  clampCp,
  calculateMoveAccuracy,
  calculateAccuracy,
  verifyMaterialSacrifice,
} from '../moveClassifier';
import type { MoveAnalysis } from '../../types/chess';

describe('moveClassifier pure functions', () => {
  it('clampCp clamps properly between -1000 and 1000', () => {
    expect(clampCp(1500)).toBe(1000);
    expect(clampCp(-2000)).toBe(-1000);
    expect(clampCp(150)).toBe(150);
  });

  it('winPct correctly calculates win percentage from White perspective', () => {
    // 0 cp gives ~50%
    expect(winPct(0)).toBeCloseTo(50, 1);
    // Positive cp gives > 50%
    expect(winPct(200)).toBeGreaterThan(60);
    // Negative cp gives < 50%
    expect(winPct(-200)).toBeLessThan(40);
  });

  it('moverWinPct handles perspective correctly for White and Black', () => {
    // White mover: +200 cp means White is winning
    expect(moverWinPct(200, 'w')).toBeCloseTo(winPct(200), 2);
    // Black mover: +200 cp means Black is losing (< 50%)
    expect(moverWinPct(200, 'b')).toBeCloseTo(100 - winPct(200), 2);
    // Black mover: -200 cp means Black is winning (> 50%)
    expect(moverWinPct(-200, 'b')).toBeCloseTo(winPct(200), 2);
  });
});

describe('Move classification rules', () => {
  it('guarantees loss = 0 and at least "best" classification when isBestMove is true', () => {
    const fenBefore = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const fenAfter = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2';
    const evalBefore = {
      cp: 30,
      mate: null,
      depth: 14,
      bestMoveUci: 'e7e5',
      bestMoveSan: 'e5',
      pv: 'e7e5 g1f3',
    };
    const evalAfter = {
      cp: 35,
      mate: null,
      depth: 14,
      bestMoveUci: 'g1f3',
      bestMoveSan: 'Nf3',
      pv: 'g1f3 b8c6',
    };

    const res = classifyMove(
      'e5',
      'e7',
      'e5',
      'b',
      fenBefore,
      fenAfter,
      evalBefore,
      evalAfter,
      1,
      ['e4', 'e5']
    );

    expect(res.winChanceLoss).toBe(0);
    expect(['best', 'book', 'great', 'brilliant']).toContain(res.classification);
  });

  it('classifies major queen hung blunder as "blunder"', () => {
    const fenBefore = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    const fenAfter = 'r1bqkb1r/pppp1ppp/2n2n2/4Q3/4P3/5N2/PPPP1PPP/RNB1K2R b KQkq - 0 4';
    const evalBefore = {
      cp: 0,
      mate: null,
      depth: 14,
      bestMoveUci: 'd2d3',
      bestMoveSan: 'd3',
      pv: 'd2d3 f8e7',
    };
    const evalAfter = {
      cp: -800, // Black is completely winning after White hung queen
      mate: null,
      depth: 14,
      bestMoveUci: 'c6e5',
      bestMoveSan: 'Nxe5',
      pv: 'c6e5 f3e5',
    };

    const res = classifyMove(
      'Qxe5+',
      'd1',
      'e5',
      'w',
      fenBefore,
      fenAfter,
      evalBefore,
      evalAfter,
      6,
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Qxe5+']
    );

    expect(res.classification).toBe('blunder');
    expect(res.winChanceLoss).toBeGreaterThan(25);
  });

  it('correctly calculates Black blundering with White perspective evaluation', () => {
    const fenBefore = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2';
    const fenAfter = 'rnbqkbnr/pppp1ppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const evalBefore = {
      cp: 50,
      mate: null,
      depth: 14,
      bestMoveUci: 'g8f6',
      bestMoveSan: 'Nf6',
      pv: 'g8f6 b1c3',
    };
    const evalAfter = {
      cp: 600, // White huge advantage -> Black lost heavily
      mate: null,
      depth: 14,
      bestMoveUci: 'f1c4',
      bestMoveSan: 'Bc4',
      pv: 'f1c4 f8c5',
    };

    const res = classifyMove(
      'exd4',
      'e5',
      'd4',
      'b',
      fenBefore,
      fenAfter,
      evalBefore,
      evalAfter,
      3,
      ['e4', 'e5', 'Nf3', 'exd4']
    );

    expect(res.classification).toBe('blunder');
    expect(res.winChanceLoss).toBeGreaterThan(25);
  });

  it('mate sequence progression: mate in 3 to mate in 2 is not penalized', () => {
    const fenBefore = '6k1/5ppp/8/8/8/8/5PPP/4Q1K1 w - - 0 1';
    const fenAfter = '4Q1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 1 1';
    const evalBefore = {
      cp: 9970, // mate in 3
      mate: 3,
      depth: 14,
      bestMoveUci: 'e1e8',
      bestMoveSan: 'Qe8#',
      pv: 'e1e8',
    };
    const evalAfter = {
      cp: 9980, // mate delivered / mate in 2
      mate: 2,
      depth: 14,
      bestMoveUci: '',
      bestMoveSan: '',
      pv: '',
    };

    const res = classifyMove(
      'Qe8#',
      'e1',
      'e8',
      'w',
      fenBefore,
      fenAfter,
      evalBefore,
      evalAfter,
      0,
      ['Qe8#']
    );

    expect(res.winChanceLoss).toBe(0);
    expect(['best', 'great']).toContain(res.classification);
  });

  it('missed mate in 1 from winning to equal is classified as blunder', () => {
    const fenBefore = '6k1/5ppp/8/8/8/8/5PPP/4Q1K1 w - - 0 1';
    const fenAfter = '6k1/5ppp/8/8/4P3/8/5PP1/4Q1K1 b - - 0 1';
    const evalBefore = {
      cp: 9990, // forced mate
      mate: 1,
      depth: 14,
      bestMoveUci: 'e1e8',
      bestMoveSan: 'Qe8#',
      pv: 'e1e8',
    };
    const evalAfter = {
      cp: 50, // threw away forced win
      mate: null,
      depth: 14,
      bestMoveUci: 'h7h6',
      bestMoveSan: 'h6',
      pv: 'h7h6 e1e4',
    };

    const res = classifyMove(
      'e4',
      'e2',
      'e4',
      'w',
      fenBefore,
      fenAfter,
      evalBefore,
      evalAfter,
      0,
      ['e4']
    );

    expect(res.classification).toBe('blunder');
  });

  it('opening book move is classified as "book" with 0 loss', () => {
    const fenBefore = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const fenAfter = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const evalBefore = {
      cp: 15,
      mate: null,
      depth: 14,
      bestMoveUci: 'e2e4',
      bestMoveSan: 'e4',
      pv: 'e2e4 e7e5',
    };
    const evalAfter = {
      cp: 20,
      mate: null,
      depth: 14,
      bestMoveUci: 'e7e5',
      bestMoveSan: 'e5',
      pv: 'e7e5 g1f3',
    };

    const res = classifyMove(
      'e4',
      'e2',
      'e4',
      'w',
      fenBefore,
      fenAfter,
      evalBefore,
      evalAfter,
      0,
      ['e4']
    );

    expect(res.classification).toBe('book');
    expect(res.winChanceLoss).toBe(0);
  });

  it('distinguishes genuine material sacrifice from quiet moves', () => {
    const quietResult = verifyMaterialSacrifice(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'b1',
      'c3',
      'b1c3 d7d5'
    );
    expect(quietResult.isSacrifice).toBe(false);
  });
});

describe('Accuracy calculations (Lichess model)', () => {
  it('calculateMoveAccuracy gives 100 for 0 win% loss', () => {
    expect(calculateMoveAccuracy(0)).toBe(100);
  });

  it('calculateMoveAccuracy decreases sharply for higher win% loss', () => {
    const accSmall = calculateMoveAccuracy(2);
    const accLarge = calculateMoveAccuracy(30);
    expect(accSmall).toBeGreaterThan(85);
    expect(accLarge).toBeLessThan(35);
  });

  it('calculateAccuracy returns accurate aggregate percentages for both colors', () => {
    const mockMove = (color: 'w' | 'b', loss: number, cl: any = 'best'): MoveAnalysis => ({
      moveNumber: 1,
      moveIndex: 0,
      color,
      san: 'e4',
      from: 'e2',
      to: 'e4',
      fenBefore: '',
      fenAfter: '',
      evalBefore: 20,
      evalAfter: 20,
      classification: cl,
      winChanceBefore: 50,
      winChanceAfter: 50,
      winChanceLoss: loss,
      comment: '',
    });

    const perfectMoves: MoveAnalysis[] = [
      mockMove('w', 0, 'best'),
      mockMove('b', 0, 'best'),
      mockMove('w', 0, 'best'),
      mockMove('b', 0, 'best'),
    ];

    const perfectAcc = calculateAccuracy(perfectMoves);
    expect(perfectAcc.white).toBe(100);
    expect(perfectAcc.black).toBe(100);

    const realisticMoves: MoveAnalysis[] = [
      mockMove('w', 0, 'book'),
      mockMove('b', 0.5, 'best'),
      mockMove('w', 1.2, 'good'),
      mockMove('b', 4.5, 'inaccuracy'),
      mockMove('w', 0.5, 'best'),
      mockMove('b', 22.0, 'blunder'),
      mockMove('w', 0, 'best'),
      mockMove('b', 3.0, 'good'),
    ];

    const realAcc = calculateAccuracy(realisticMoves);
    expect(realAcc.white).toBeGreaterThan(80);
    expect(realAcc.black).toBeLessThan(75);
    expect(realAcc.black).toBeGreaterThan(45);
  });
});
