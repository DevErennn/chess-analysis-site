export type MoveClassification = 
  | 'brilliant'   // !!
  | 'great'       // !
  | 'best'        // ⭐
  | 'excellent'   // ✅
  | 'good'        // 👍
  | 'inaccuracy'  // ?!
  | 'mistake'     // ?
  | 'blunder'     // ??
  | 'book';       // 📖

export interface MoveAnalysis {
  moveNumber: number;
  moveIndex: number;
  color: 'w' | 'b';
  san: string;
  from: string;
  to: string;
  fenBefore: string;
  fenAfter: string;
  evalBefore?: number; // centipawns from White's perspective (+ is white advantage)
  evalAfter?: number;  // centipawns from White's perspective
  mateBefore?: number | null; // mate in N from White's perspective
  mateAfter?: number | null;
  bestMoveUci?: string;
  bestMoveSan?: string;
  winChanceBefore?: number;
  winChanceAfter?: number;
  winChanceLoss?: number;
  classification?: MoveClassification;
  comment?: string;
}

export interface EngineEvaluation {
  cp?: number;
  mate?: number | null;
  bestMoveUci: string;
  bestMoveSan?: string;
  depth: number;
  pv?: string;
}

export interface ClassificationCount {
  brilliant: number;
  great: number;
  best: number;
  excellent: number;
  good: number;
  inaccuracy: number;
  mistake: number;
  blunder: number;
  book: number;
}

export interface GameAccuracy {
  white: number;
  black: number;
}

export interface GameAnalysisResult {
  moves: MoveAnalysis[];
  accuracy: GameAccuracy;
  counts: {
    white: ClassificationCount;
    black: ClassificationCount;
  };
  coachSummary: string;
}

export interface GameMetadata {
  white: {
    name: string;
    rating?: string | number;
    avatar?: string;
  };
  black: {
    name: string;
    rating?: string | number;
    avatar?: string;
  };
  result: string; // "1-0", "0-1", "1/2-1/2", "*"
  date?: string;
  event?: string;
  timeControl?: string;
  eco?: string;
  opening?: string;
  pgn: string;
}

export interface ChessComGameSummary {
  url: string;
  pgn: string;
  timeControl: string;
  timeClass: string;
  endTime: number;
  rated: boolean;
  white: {
    username: string;
    rating: number;
    result: string;
  };
  black: {
    username: string;
    rating: number;
    result: string;
  };
}

export interface AnalysisProgress {
  percent: number;
  currentMove: number;
  totalMoves: number;
  isComplete: boolean;
}
