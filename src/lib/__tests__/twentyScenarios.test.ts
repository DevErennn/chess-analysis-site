import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  classifyMove,
  evaluationToWinProbability,
  getMultiPvGap,
  verifyMaterialSacrifice,
} from '../moveClassifier';
import type { EngineEvaluation } from '../../types/chess';

describe('20 Critical Chess Engine & Classification Scenarios', () => {
  // Helper to make mock EngineEvaluation
  const mockEval = (
    cp: number,
    bestMoveUci: string,
    mate: number | null = null,
    lines?: Array<{ multipv: number; scoreCp?: number; scoreMate?: number | null; pv: string[] }>
  ): EngineEvaluation => ({
    cp,
    mate,
    score: mate !== null ? { type: 'mate', mateIn: mate } : { type: 'cp', cp },
    depth: 18,
    bestMoveUci,
    bestMoveSan: bestMoveUci,
    pv: bestMoveUci,
    lines: lines?.map((l) => ({
      multipv: l.multipv,
      cp: l.scoreCp ?? 0,
      mate: l.scoreMate ?? null,
      score: l.scoreMate ? { type: 'mate' as const, mateIn: l.scoreMate } : { type: 'cp' as const, cp: l.scoreCp ?? 0 },
      depth: 18,
      pv: l.pv.join(' '),
      bestMoveUci: l.pv[0] || '',
      bestMoveSan: l.pv[0] || '',
    })),
  });

  // 1. Normal good move (middlegame, non-book)
  it('Scenario 1: Normal good move', () => {
    const fenBefore = 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQ1RK1 w - - 0 7';
    const fenAfter = 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N1P/PP3PPP/RNBQ1RK1 b - - 0 7';
    const evalBefore = mockEval(35, 'h2h3');
    const evalAfter = mockEval(25, 'd7d6');

    const res = classifyMove('h3', 'h2', 'h3', 'w', fenBefore, fenAfter, evalBefore, evalAfter, 25, []);
    expect(['best', 'excellent', 'good']).toContain(res.classification);
    expect(res.winChanceLoss).toBeLessThan(5);
  });

  // 2. Inaccuracy (middlegame, non-book, moderate loss)
  it('Scenario 2: Inaccuracy (moderate loss)', () => {
    const fenBefore = 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQ1RK1 w - - 0 7';
    const fenAfter = 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQ1RK1 b - - 0 7';
    // Top move leaves +50, played move leaves +10 (approx 6-8% loss)
    const evalBefore = mockEval(50, 'd2d4');
    const evalAfter = mockEval(10, 'd6d5');

    const res = classifyMove('a3', 'a2', 'a3', 'w', fenBefore, fenAfter, evalBefore, evalAfter, 25, []);
    expect(['inaccuracy', 'good']).toContain(res.classification);
  });

  // 3. Mistake
  it('Scenario 3: Mistake (significant advantage reduction)', () => {
    const fenBefore = 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5';
    const fenAfter = 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 1 5';
    // Before was +180 with d2d4, played move drops to +30
    const evalBefore = mockEval(180, 'd2d4');
    const evalAfter = mockEval(30, 'd7d5');

    const res = classifyMove('O-O', 'e1', 'g1', 'w', fenBefore, fenAfter, evalBefore, evalAfter, 25, []);
    expect(['mistake', 'inaccuracy']).toContain(res.classification);
  });

  // 4. Blunder
  it('Scenario 4: Blunder (hanging material / throwing position)', () => {
    const fenBefore = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    const fenAfter = 'r1bqkb1r/pppp1ppp/2n2n2/4Q3/4P3/5N2/PPPP1PPP/RNB1K2R b KQkq - 0 4';
    const evalBefore = mockEval(0, 'd2d3');
    const evalAfter = mockEval(-800, 'c6e5');

    const res = classifyMove('Qxe5+', 'd1', 'e5', 'w', fenBefore, fenAfter, evalBefore, evalAfter, 25, ['Qxe5+']);
    expect(res.classification).toBe('blunder');
    expect(res.winChanceLoss).toBeGreaterThan(20);
  });

  // 5. Forced mate progression
  it('Scenario 5: Forced mate sequence', () => {
    const fenBefore = '6k1/5ppp/8/8/8/8/5PPP/4Q1K1 w - - 0 1';
    const fenAfter = '4Q1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 1 1';
    const evalBefore = mockEval(9990, 'e1e8', 1);
    const evalAfter = mockEval(10000, '', 0);

    const res = classifyMove('Qe8#', 'e1', 'e8', 'w', fenBefore, fenAfter, evalBefore, evalAfter, 0, ['Qe8#']);
    expect(['best', 'great']).toContain(res.classification);
    expect(res.winChanceLoss).toBe(0);
  });

  // 6. Missed mate (Mate kaçırma)
  it('Scenario 6: Missed mate in 1 drops to equal', () => {
    const fenBefore = '6k1/5ppp/8/8/8/8/5PPP/4Q1K1 w - - 0 1';
    const fenAfter = '6k1/5ppp/8/8/4P3/8/5PP1/4Q1K1 b - - 0 1';
    const evalBefore = mockEval(9990, 'e1e8', 1);
    const evalAfter = mockEval(50, 'h7h6', null);

    const res = classifyMove('e4', 'e2', 'e4', 'w', fenBefore, fenAfter, evalBefore, evalAfter, 0, ['e4']);
    expect(res.classification).toBe('blunder');
  });

  // 7. Queen sacrifice
  it('Scenario 7: Queen sacrifice (Brilliant candidate)', () => {
    const fenBefore = '1r1qkb1r/p2n1ppp/4b3/8/4P3/1Q6/PPP2PPP/2KR1BNR w k - 2 16';
    const fenAfter = '1Q1qkb1r/p2n1ppp/4b3/8/4P3/8/PPP2PPP/2KR1BNR b k - 0 16';
    const evalBefore = mockEval(600, 'b3b8', null, [
      { multipv: 1, scoreCp: 600, pv: ['b3b8', 'd7b8', 'd1d8'] },
      { multipv: 2, scoreCp: 150, pv: ['b3a4', 'f8c5'] },
    ]);
    const evalAfter = mockEval(580, 'd7b8', null);

    const res = classifyMove('Qb8+', 'b3', 'b8', 'w', fenBefore, fenAfter, evalBefore, evalAfter, 16, ['Qb8+']);
    expect(['brilliant', 'great', 'best']).toContain(res.classification);
  });

  // 8. Exchange sacrifice
  it('Scenario 8: Exchange sacrifice verification', () => {
    const fenBefore = 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5';
    const sac = verifyMaterialSacrifice(fenBefore, 'c4', 'f7', 'c4f7 e8f7');
    expect(sac.isSacrifice).toBe(true);
    expect(sac.sacrificedPieceName).toBe('Fil');
  });

  // 9. Piece sacrifice
  it('Scenario 9: Piece sacrifice verification', () => {
    const fenBefore = 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5';
    const sac = verifyMaterialSacrifice(fenBefore, 'c4', 'f7', 'c4f7 e8f7');
    expect(sac.isSacrifice).toBe(true);
    expect(sac.materialDiff).toBeGreaterThanOrEqual(2);
  });

  // 10. Opening book move
  it('Scenario 10: Opening book move (e.g. 1. e4)', () => {
    const fenBefore = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const fenAfter = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const evalBefore = mockEval(20, 'e2e4');
    const evalAfter = mockEval(25, 'e7e5');

    const res = classifyMove('e4', 'e2', 'e4', 'w', fenBefore, fenAfter, evalBefore, evalAfter, 0, ['e4']);
    expect(res.classification).toBe('book');
    expect(res.winChanceLoss).toBe(0);
  });

  // 11. Multiple equal best moves
  it('Scenario 11: Multiple equal best moves handled via MultiPV gap', () => {
    const evalBefore: EngineEvaluation = {
      cp: 80,
      mate: null,
      score: { type: 'cp', cp: 80 },
      depth: 18,
      bestMoveUci: 'g1f3',
      pv: 'g1f3',
      lines: [
        { multipv: 1, cp: 80, score: { type: 'cp', cp: 80 }, depth: 18, pv: 'g1f3', bestMoveUci: 'g1f3', bestMoveSan: 'Nf3' },
        { multipv: 2, cp: 78, score: { type: 'cp', cp: 78 }, depth: 18, pv: 'd2d4', bestMoveUci: 'd2d4', bestMoveSan: 'd4' },
        { multipv: 3, cp: 75, score: { type: 'cp', cp: 75 }, depth: 18, pv: 'c2c4', bestMoveUci: 'c2c4', bestMoveSan: 'c4' },
      ],
    };
    const gap = getMultiPvGap(evalBefore, 'w');
    // Gap between line 1 (80) and line 2 (78) is only 2 cp
    expect(gap).toBe(2);
  });

  // 12. White move POV check
  it('Scenario 12: White move POV calculation', () => {
    const winWhite = evaluationToWinProbability({ cp: 200 }, 'w');
    expect(winWhite).toBeGreaterThan(65);
    expect(winWhite).toBeLessThan(80);
  });

  // 13. Black move POV check
  it('Scenario 13: Black move POV inversion check', () => {
    const winBlack = evaluationToWinProbability({ cp: -200 }, 'b');
    expect(winBlack).toBeGreaterThan(65);
    expect(winBlack).toBeLessThan(80);

    const winBlackWhenWhiteAhead = evaluationToWinProbability({ cp: 200 }, 'b');
    expect(winBlackWhenWhiteAhead).toBeLessThan(35);
  });

  // 14. Castling move execution
  it('Scenario 14: Kingside Castling test', () => {
    const chess = new Chess('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 5');
    const move = chess.move('O-O');
    expect(move).not.toBeNull();
    expect(move.san).toBe('O-O');
    expect(chess.fen()).toContain('RNBQ1RK1');
  });

  // 15. En passant move execution
  it('Scenario 15: En passant capture test', () => {
    const chess = new Chess('rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3');
    const move = chess.move({ from: 'e5', to: 'f6' });
    expect(move).not.toBeNull();
    expect(move.captured).toBe('p');
  });

  // 16. Pawn promotion execution
  it('Scenario 16: Pawn promotion test', () => {
    const chess = new Chess('8/4P3/8/8/8/8/8/k3K3 w - - 0 1');
    const move = chess.move({ from: 'e7', to: 'e8', promotion: 'q' });
    expect(move).not.toBeNull();
    expect(move.promotion).toBe('q');
  });

  // 17. Winning to losing swing
  it('Scenario 17: Winning to losing swing is classified as blunder', () => {
    const fenBefore = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
    const fenAfter = '4k3/8/8/8/8/8/8/4K3 b - - 0 1';
    const evalBefore = mockEval(450, 'e2e4');
    const evalAfter = mockEval(-350, 'e8e7');

    const res = classifyMove('Kd1', 'e1', 'd1', 'w', fenBefore, fenAfter, evalBefore, evalAfter, 10, ['Kd1']);
    expect(res.classification).toBe('blunder');
    expect(res.winChanceLoss).toBeGreaterThan(40);
  });

  // 18. Losing to winning swing
  it('Scenario 18: Losing to winning swing reflects win% gain', () => {
    const beforeLoss = evaluationToWinProbability({ cp: -300 }, 'w');
    const afterGain = evaluationToWinProbability({ cp: 300 }, 'w');
    expect(afterGain - beforeLoss).toBeGreaterThan(50);
  });

  // 19. Drawing to winning swing
  it('Scenario 19: Drawing to winning swing reflects breakout', () => {
    const beforeDraw = evaluationToWinProbability({ cp: 0 }, 'w');
    const afterWin = evaluationToWinProbability({ cp: 450 }, 'w');
    expect(beforeDraw).toBeCloseTo(50, 1);
    expect(afterWin).toBeGreaterThan(80);
  });

  // 20. Winning to drawing swing
  it('Scenario 20: Winning to drawing swing drops ~30-40% winChance', () => {
    const fenBefore = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
    const fenAfter = '4k3/8/8/8/8/8/8/4K3 b - - 0 1';
    const evalBefore = mockEval(400, 'e2e4');
    const evalAfter = mockEval(0, 'e8e7');

    const res = classifyMove('Kd1', 'e1', 'd1', 'w', fenBefore, fenAfter, evalBefore, evalAfter, 10, ['Kd1']);
    expect(['blunder', 'mistake']).toContain(res.classification);
  });
});
