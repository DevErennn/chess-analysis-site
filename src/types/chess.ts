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
  color: 'w' | 'b';
  san: string;
  from: string;
  to: string;
  fenBefore: string;
  fenAfter: string;
  evalBefore?: number; // centipawns or mate from White's perspective
  evalAfter?: number;
  mate?: number | null;
  bestMoveSan?: string;
  bestMoveUci?: string;
  classification?: MoveClassification;
  comment?: string;
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
