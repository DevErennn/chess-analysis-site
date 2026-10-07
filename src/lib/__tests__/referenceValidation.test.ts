import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  classifyMove,
  winPct,
} from '../moveClassifier';

// Raw reference data from python-chess + Stockfish depth 11
const referenceRows = [
  { ply: 1, moveNum: "1.", san: "h4", evB: 35, evA: -49, loss: 7.7, bestUci: "e2e4", playedUci: "h2h4", refCls: "inacc" },
  { ply: 2, moveNum: "1...", san: "e5", evB: -49, evA: -46, loss: 0.0, bestUci: "e7e5", playedUci: "e7e5", refCls: "best" },
  { ply: 3, moveNum: "2.", san: "Rh3", evB: -46, evA: -154, loss: 9.6, bestUci: "c2c4", playedUci: "h1h3", refCls: "inacc" },
  { ply: 4, moveNum: "2...", san: "Nc6", evB: -154, evA: -124, loss: 2.6, bestUci: "d7d5", playedUci: "b8c6", refCls: "good/exc" },
  { ply: 5, moveNum: "3.", san: "Re3", evB: -124, evA: -199, loss: 6.3, bestUci: "c2c4", playedUci: "h3e3", refCls: "inacc" },
  { ply: 6, moveNum: "3...", san: "Bc5", evB: -199, evA: -213, loss: 0.0, bestUci: "d7d5", playedUci: "f8c5", refCls: "good/exc" },
  { ply: 7, moveNum: "4.", san: "d4", evB: -213, evA: -246, loss: 2.6, bestUci: "e3g3", playedUci: "d2d4", refCls: "good/exc" },
  { ply: 8, moveNum: "4...", san: "Bxd4", evB: -246, evA: -226, loss: 0.0, bestUci: "c5d4", playedUci: "c5d4", refCls: "best" },
  { ply: 9, moveNum: "5.", san: "Nf3", evB: -226, evA: -393, loss: 11.3, bestUci: "e3g3", playedUci: "g1f3", refCls: "mistake" },
  { ply: 10, moveNum: "5...", san: "Bxe3", evB: -393, evA: -414, loss: 0.0, bestUci: "d4e3", playedUci: "d4e3", refCls: "best" },
  { ply: 11, moveNum: "6.", san: "Bxe3", evB: -414, evA: -385, loss: 0.0, bestUci: "c1e3", playedUci: "c1e3", refCls: "best" },
  { ply: 12, moveNum: "6...", san: "e4", evB: -385, evA: -286, loss: 6.4, bestUci: "d7d5", playedUci: "e5e4", refCls: "inacc" },
  { ply: 13, moveNum: "7.", san: "Bg5", evB: -286, evA: -548, loss: 14.1, bestUci: "f3d4", playedUci: "e3g5", refCls: "mistake" },
  { ply: 14, moveNum: "7...", san: "f6", evB: -548, evA: -537, loss: 0.0, bestUci: "f7f6", playedUci: "f7f6", refCls: "best" },
  { ply: 15, moveNum: "8.", san: "Bf4", evB: -537, evA: -549, loss: 0.5, bestUci: "b1c3", playedUci: "g5f4", refCls: "good/exc" },
  { ply: 16, moveNum: "8...", san: "exf3", evB: -549, evA: -531, loss: 0.0, bestUci: "e4f3", playedUci: "e4f3", refCls: "best" },
  { ply: 17, moveNum: "9.", san: "gxf3", evB: -531, evA: -588, loss: 2.1, bestUci: "e2e3", playedUci: "g2f3", refCls: "good/exc" },
  { ply: 18, moveNum: "9...", san: "Nge7", evB: -588, evA: -575, loss: 0.5, bestUci: "d7d6", playedUci: "g8e7", refCls: "good/exc" },
  { ply: 19, moveNum: "10.", san: "Nc3", evB: -575, evA: -552, loss: 0.0, bestUci: "d1d2", playedUci: "b1c3", refCls: "good/exc" },
  { ply: 20, moveNum: "10...", san: "O-O", evB: -552, evA: -536, loss: 0.6, bestUci: "d7d6", playedUci: "e8g8", refCls: "good/exc" },
  { ply: 21, moveNum: "11.", san: "Ne4", evB: -536, evA: -642, loss: 3.6, bestUci: "h4h5", playedUci: "c3e4", refCls: "good/exc" },
  { ply: 22, moveNum: "11...", san: "f5", evB: -642, evA: -569, loss: 2.4, bestUci: "d7d5", playedUci: "f6f5", refCls: "good/exc" },
  { ply: 23, moveNum: "12.", san: "Ng5", evB: -569, evA: -624, loss: 1.8, bestUci: "e4d6", playedUci: "e4g5", refCls: "good/exc" },
  { ply: 24, moveNum: "12...", san: "h6", evB: -624, evA: -571, loss: 1.8, bestUci: "d7d5", playedUci: "h7h6", refCls: "good/exc" },
  { ply: 25, moveNum: "13.", san: "Nh3", evB: -571, evA: -650, loss: 2.5, bestUci: "e2e4", playedUci: "g5h3", refCls: "good/exc" },
  { ply: 26, moveNum: "13...", san: "d5", evB: -650, evA: -614, loss: 1.1, bestUci: "d7d6", playedUci: "d7d5", refCls: "good/exc" },
  { ply: 27, moveNum: "14.", san: "Qd3", evB: -614, evA: -619, loss: 0.2, bestUci: "d1d2", playedUci: "d1d3", refCls: "good/exc" },
  { ply: 28, moveNum: "14...", san: "b6", evB: -619, evA: -574, loss: 1.5, bestUci: "c8e6", playedUci: "b7b6", refCls: "good/exc" },
  { ply: 29, moveNum: "15.", san: "Qc3", evB: -574, evA: -587, loss: 0.5, bestUci: "d3d2", playedUci: "d3c3", refCls: "good/exc" },
  { ply: 30, moveNum: "15...", san: "d4", evB: -587, evA: -537, loss: 0.0, bestUci: "d5d4", playedUci: "d5d4", refCls: "best" },
  { ply: 31, moveNum: "16.", san: "Qc4+", evB: -537, evA: -586, loss: 1.8, bestUci: "c3a3", playedUci: "c3c4", refCls: "good/exc" },
  { ply: 32, moveNum: "16...", san: "Rf7", evB: -586, evA: -473, loss: 4.5, bestUci: "d8d5", playedUci: "f8f7", refCls: "good/exc" },
  { ply: 33, moveNum: "17.", san: "Rd1", evB: -473, evA: -593, loss: 4.8, bestUci: "e1c1", playedUci: "a1d1", refCls: "good/exc" },
  { ply: 34, moveNum: "17...", san: "h5", evB: -593, evA: -260, loss: 17.6, bestUci: "d8d5", playedUci: "h6h5", refCls: "blunder" },
  { ply: 35, moveNum: "18.", san: "e3", evB: -260, evA: -337, loss: 5.3, bestUci: "h3g5", playedUci: "e2e3", refCls: "inacc" },
  { ply: 36, moveNum: "18...", san: "Be6", evB: -337, evA: 182, loss: 43.7, bestUci: "c6a5", playedUci: "c8e6", refCls: "BLUNDER>20" },
  { ply: 37, moveNum: "19.", san: "Qxe6", evB: 182, evA: 216, loss: 0.0, bestUci: "c4e6", playedUci: "c4e6", refCls: "best" },
  { ply: 38, moveNum: "19...", san: "Qd5", evB: 216, evA: 235, loss: 0.0, bestUci: "d8d5", playedUci: "d8d5", refCls: "best" },
  { ply: 39, moveNum: "20.", san: "Qxd5", evB: 235, evA: 21, loss: 18.4, bestUci: "f1c4", playedUci: "e6d5", refCls: "blunder" },
  { ply: 40, moveNum: "20...", san: "Nxd5", evB: 21, evA: 32, loss: 0.0, bestUci: "e7d5", playedUci: "e7d5", refCls: "best" },
  { ply: 41, moveNum: "21.", san: "Bd6", evB: 32, evA: -342, loss: 30.8, bestUci: "f1c4", playedUci: "f4d6", refCls: "BLUNDER>20" },
  { ply: 42, moveNum: "21...", san: "Ncb4", evB: -342, evA: 126, loss: 39.3, bestUci: "c7d6", playedUci: "c6b4", refCls: "BLUNDER>20" },
  { ply: 43, moveNum: "22.", san: "Rxd4", evB: 126, evA: -457, loss: 45.7, bestUci: "d6b4", playedUci: "d1d4", refCls: "BLUNDER>20" },
  { ply: 44, moveNum: "22...", san: "Nxc2+", evB: -457, evA: -529, loss: 0.0, bestUci: "b4c2", playedUci: "b4c2", refCls: "best" },
  { ply: 45, moveNum: "23.", san: "Kd2", evB: -529, evA: -478, loss: 0.0, bestUci: "e1d1", playedUci: "e1d2", refCls: "good/exc" },
  { ply: 46, moveNum: "23...", san: "Nxd4", evB: -478, evA: -535, loss: 0.0, bestUci: "c2d4", playedUci: "c2d4", refCls: "best" },
  { ply: 47, moveNum: "24.", san: "exd4", evB: -535, evA: -561, loss: 1.0, bestUci: "f1c4", playedUci: "e3d4", refCls: "good/exc" },
  { ply: 48, moveNum: "24...", san: "cxd6", evB: -561, evA: -565, loss: 0.0, bestUci: "c7d6", playedUci: "c7d6", refCls: "best" },
  { ply: 49, moveNum: "25.", san: "Bc4", evB: -565, evA: -528, loss: 0.0, bestUci: "h3g5", playedUci: "f1c4", refCls: "good/exc" },
  { ply: 50, moveNum: "25...", san: "Re7", evB: -528, evA: 273, loss: 60.7, bestUci: "d5f6", playedUci: "f7e7", refCls: "BLUNDER>20" },
  { ply: 51, moveNum: "26.", san: "Bxd5+", evB: 273, evA: 288, loss: 0.0, bestUci: "c4d5", playedUci: "c4d5", refCls: "best" },
  { ply: 52, moveNum: "26...", san: "Kh7", evB: 288, evA: 289, loss: 0.0, bestUci: "g8h7", playedUci: "g8h7", refCls: "best" },
  { ply: 53, moveNum: "27.", san: "Ng5+", evB: 289, evA: 266, loss: 1.6, bestUci: "d5a8", playedUci: "h3g5", refCls: "good/exc" },
  { ply: 54, moveNum: "27...", san: "Kg6", evB: 266, evA: 274, loss: 0.0, bestUci: "h7g6", playedUci: "h7g6", refCls: "best" },
  { ply: 55, moveNum: "28.", san: "f4", evB: 274, evA: -378, loss: 53.4, bestUci: "d5a8", playedUci: "f3f4", refCls: "BLUNDER>20" },
  { ply: 56, moveNum: "28...", san: "a5", evB: -378, evA: 305, loss: 55.5, bestUci: "a8e8", playedUci: "a7a5", refCls: "BLUNDER>20" },
  { ply: 57, moveNum: "29.", san: "b3", evB: 305, evA: -385, loss: 56.0, bestUci: "d5a8", playedUci: "b2b3", refCls: "BLUNDER>20" },
  { ply: 58, moveNum: "29...", san: "Rc8", evB: -385, evA: -337, loss: 2.9, bestUci: "a8b8", playedUci: "a8c8", refCls: "good/exc" },
  { ply: 59, moveNum: "30.", san: "a4", evB: -337, evA: -407, loss: 4.2, bestUci: "d5e6", playedUci: "a2a4", refCls: "good/exc" },
  { ply: 60, moveNum: "30...", san: "Ree8", evB: -407, evA: -363, loss: 2.5, bestUci: "e7c7", playedUci: "e7e8", refCls: "good/exc" },
  { ply: 61, moveNum: "31.", san: "Kd3", evB: -363, evA: -371, loss: 0.5, bestUci: "d5f7", playedUci: "d2d3", refCls: "good/exc" },
  { ply: 62, moveNum: "31...", san: "Kf6", evB: -371, evA: -433, loss: 0.0, bestUci: "g6f6", playedUci: "g6f6", refCls: "best" },
  { ply: 63, moveNum: "32.", san: "Nf7", evB: -433, evA: -424, loss: 0.0, bestUci: "g5h7", playedUci: "g5f7", refCls: "good/exc" },
  { ply: 64, moveNum: "32...", san: "Rc1", evB: -424, evA: -457, loss: 0.0, bestUci: "e8e1", playedUci: "c8c1", refCls: "good/exc" },
  { ply: 65, moveNum: "33.", san: "Nxd6", evB: -457, evA: -457, loss: 0.0, bestUci: "f7d6", playedUci: "f7d6", refCls: "best" },
  { ply: 66, moveNum: "33...", san: "Ree1", evB: -457, evA: -456, loss: 0.0, bestUci: "e8d8", playedUci: "e8e1", refCls: "good/exc" },
  { ply: 67, moveNum: "34.", san: "Ne4+", evB: -456, evA: -605, loss: 6.0, bestUci: "d5f3", playedUci: "d6e4", refCls: "inacc" },
  { ply: 68, moveNum: "34...", san: "Ke7", evB: -605, evA: -414, loss: 8.2, bestUci: "f5e4", playedUci: "f6e7", refCls: "inacc" },
  { ply: 69, moveNum: "35.", san: "Ng3", evB: -414, evA: -507, loss: 4.5, bestUci: "e4c3", playedUci: "e4g3", refCls: "good/exc" },
  { ply: 70, moveNum: "35...", san: "Rcd1+", evB: -507, evA: -444, loss: 2.9, bestUci: "e1d1", playedUci: "c1d1", refCls: "good/exc" },
  { ply: 71, moveNum: "36.", san: "Kc2", evB: -444, evA: -467, loss: 1.1, bestUci: "d3c3", playedUci: "d3c2", refCls: "good/exc" },
  { ply: 72, moveNum: "36...", san: "Rxd4", evB: -467, evA: 171, loss: 50.0, bestUci: "g7g6", playedUci: "d1d4", refCls: "BLUNDER>20" },
  { ply: 73, moveNum: "37.", san: "Nxf5+", evB: 171, evA: 163, loss: 0.0, bestUci: "g3f5", playedUci: "g3f5", refCls: "best" },
  { ply: 74, moveNum: "37...", san: "Kf6", evB: 163, evA: 147, loss: 0.0, bestUci: "e7f6", playedUci: "e7f6", refCls: "best" },
  { ply: 75, moveNum: "38.", san: "Nxd4", evB: 147, evA: 138, loss: 0.0, bestUci: "f5d4", playedUci: "f5d4", refCls: "best" },
  { ply: 76, moveNum: "38...", san: "g5", evB: 138, evA: 546, loss: 25.8, bestUci: "e1f1", playedUci: "g7g5", refCls: "BLUNDER>20" },
  { ply: 77, moveNum: "39.", san: "hxg5+", evB: 546, evA: 502, loss: 1.8, bestUci: "f4g5", playedUci: "h4g5", refCls: "good/exc" },
  { ply: 78, moveNum: "39...", san: "Kg6", evB: 502, evA: 499, loss: 0.0, bestUci: "f6g7", playedUci: "f6g6", refCls: "good/exc" },
  { ply: 79, moveNum: "40.", san: "f5+", evB: 499, evA: 545, loss: 0.0, bestUci: "f4f5", playedUci: "f4f5", refCls: "best" },
  { ply: 80, moveNum: "40...", san: "Kxg5", evB: 545, evA: 600, loss: 2.0, bestUci: "g6h7", playedUci: "g6g5", refCls: "good/exc" },
  { ply: 81, moveNum: "41.", san: "Nf3+", evB: 600, evA: 616, loss: 0.0, bestUci: "d4f3", playedUci: "d4f3", refCls: "best" },
  { ply: 82, moveNum: "41...", san: "Kf4", evB: 616, evA: 631, loss: 0.5, bestUci: "g5f5", playedUci: "g5f4", refCls: "good/exc" },
  { ply: 83, moveNum: "42.", san: "f6", evB: 631, evA: 408, loss: 9.3, bestUci: "f3e1", playedUci: "f5f6", refCls: "inacc" },
  { ply: 84, moveNum: "42...", san: "Re2+", evB: 408, evA: 425, loss: 0.9, bestUci: "e1e8", playedUci: "e1e2", refCls: "good/exc" },
  { ply: 85, moveNum: "43.", san: "Kd3", evB: 425, evA: 434, loss: 0.0, bestUci: "c2d3", playedUci: "c2d3", refCls: "best" },
  { ply: 86, moveNum: "43...", san: "Re8", evB: 434, evA: 439, loss: 0.0, bestUci: "e2e8", playedUci: "e2e8", refCls: "best" },
  { ply: 87, moveNum: "44.", san: "f7", evB: 439, evA: 450, loss: 0.0, bestUci: "f6f7", playedUci: "f6f7", refCls: "best" },
  { ply: 88, moveNum: "44...", san: "Rf8", evB: 450, evA: 456, loss: 0.0, bestUci: "e8f8", playedUci: "e8f8", refCls: "best" },
  { ply: 89, moveNum: "45.", san: "Nd4", evB: 456, evA: 448, loss: 0.4, bestUci: "d3e2", playedUci: "f3d4", refCls: "good/exc" },
  { ply: 90, moveNum: "45...", san: "h4", evB: 448, evA: 598, loss: 6.2, bestUci: "f4e5", playedUci: "h5h4", refCls: "inacc" },
  { ply: 91, moveNum: "46.", san: "Nc6", evB: 598, evA: 301, loss: 14.9, bestUci: "d4e6", playedUci: "d4c6", refCls: "mistake" },
  { ply: 92, moveNum: "46...", san: "h3", evB: 301, evA: 376, loss: 0.0, bestUci: "h4h3", playedUci: "h4h3", refCls: "best" },
  { ply: 93, moveNum: "47.", san: "Na7", evB: 376, evA: -96, loss: 38.7, bestUci: "d3d4", playedUci: "c6a7", refCls: "BLUNDER>20" },
  { ply: 94, moveNum: "47...", san: "h2", evB: -96, evA: -101, loss: 0.0, bestUci: "f4e5", playedUci: "h3h2", refCls: "good/exc" },
  { ply: 95, moveNum: "48.", san: "Nb5", evB: -101, evA: -111, loss: 0.9, bestUci: "d5h1", playedUci: "a7b5", refCls: "good/exc" },
  { ply: 96, moveNum: "48...", san: "Rxf7", evB: -111, evA: -114, loss: 0.0, bestUci: "f8f7", playedUci: "f8f7", refCls: "best" },
  { ply: 97, moveNum: "49.", san: "Nd4", evB: -114, evA: -241, loss: 10.5, bestUci: "d5h1", playedUci: "b5d4", refCls: "mistake" },
  { ply: 98, moveNum: "49...", san: "Ke5", evB: -241, evA: -259, loss: 0.0, bestUci: "f7d7", playedUci: "f4e5", refCls: "good/exc" },
  { ply: 99, moveNum: "50.", san: "Nf3+", evB: -259, evA: -454, loss: 12.0, bestUci: "d5c6", playedUci: "d4f3", refCls: "mistake" },
  { ply: 100, moveNum: "50...", san: "Kxd5", evB: -454, evA: -436, loss: 0.0, bestUci: "e5d5", playedUci: "e5d5", refCls: "best" },
  { ply: 101, moveNum: "51.", san: "Nxh2", evB: -436, evA: -478, loss: 0.0, bestUci: "f3h2", playedUci: "f3h2", refCls: "best" },
  { ply: 102, moveNum: "51...", san: "Rxf2", evB: -478, evA: -488, loss: 0.0, bestUci: "d5c5", playedUci: "f7f2", refCls: "good/exc" },
  { ply: 103, moveNum: "52.", san: "Ng4", evB: -488, evA: -528, loss: 0.0, bestUci: "h2g4", playedUci: "h2g4", refCls: "best" },
  { ply: 104, moveNum: "52...", san: "Rf3+", evB: -528, evA: -493, loss: 0.0, bestUci: "f2f3", playedUci: "f2f3", refCls: "best" },
  { ply: 105, moveNum: "53.", san: "Ke2", evB: -493, evA: -578, loss: 3.4, bestUci: "d3c2", playedUci: "d3e2", refCls: "good/exc" },
  { ply: 106, moveNum: "53...", san: "Ke4", evB: -578, evA: -562, loss: 0.6, bestUci: "f3b3", playedUci: "d5e4", refCls: "good/exc" },
  { ply: 107, moveNum: "54.", san: "Nh2", evB: -562, evA: -528, loss: 0.0, bestUci: "b3b4", playedUci: "g4h2", refCls: "good/exc" },
  { ply: 108, moveNum: "54...", san: "Rxb3", evB: -528, evA: -583, loss: 0.0, bestUci: "f3g3", playedUci: "f3b3", refCls: "good/exc" },
  { ply: 109, moveNum: "55.", san: "Ng4", evB: -583, evA: -591, loss: 0.3, bestUci: "h2f1", playedUci: "h2g4", refCls: "good/exc" },
  { ply: 110, moveNum: "55...", san: "Rb2+", evB: -591, evA: -617, loss: 0.0, bestUci: "b3b2", playedUci: "b3b2", refCls: "best" },
  { ply: 111, moveNum: "56.", san: "Kd1", evB: -617, evA: -553, loss: 0.0, bestUci: "e2e1", playedUci: "e2d1", refCls: "good/exc" },
  { ply: 112, moveNum: "56...", san: "Kd3", evB: -553, evA: -590, loss: 0.0, bestUci: "e4d3", playedUci: "e4d3", refCls: "best" },
  { ply: 113, moveNum: "57.", san: "Nf2+", evB: -590, evA: -788, loss: 5.0, bestUci: "g4e5", playedUci: "g4f2", refCls: "inacc" },
  { ply: 114, moveNum: "57...", san: "Kc3", evB: -788, evA: -618, loss: 4.1, bestUci: "b2f2", playedUci: "d3c3", refCls: "good/exc" },
  { ply: 115, moveNum: "58.", san: "Nd3", evB: -618, evA: -842, loss: 5.0, bestUci: "f2e4", playedUci: "f2d3", refCls: "inacc" },
  { ply: 116, moveNum: "58...", san: "Ra2", evB: -842, evA: -635, loss: 4.5, bestUci: "c3d3", playedUci: "b2a2", refCls: "good/exc" }
];

describe('Reference Engine & Classifier Validation', () => {
  it('asserts evalBefore[i] === evalAfter[i-1] for all moves', () => {
    for (let i = 1; i < referenceRows.length; i++) {
      const prevEvalAfter = referenceRows[i - 1].evA;
      const currEvalBefore = referenceRows[i].evB;
      expect(currEvalBefore).toBe(prevEvalAfter);
    }
  });

  it('validates win% loss formula against python-chess reference', () => {
    for (const row of referenceRows) {
      const isWhite = row.ply % 2 === 1;
      const bw = isWhite ? winPct(row.evB) : 100 - winPct(row.evB);
      const aw = isWhite ? winPct(row.evA) : 100 - winPct(row.evA);
      const expectedLoss = row.bestUci === row.playedUci ? 0 : Math.max(0, bw - aw);
      
      expect(Math.abs(expectedLoss - row.loss)).toBeLessThan(0.3);
    }
  });

  it('compares best moves count (White: 12, Black: 23)', () => {
    const whiteBest = referenceRows.filter(r => r.ply % 2 === 1 && r.bestUci === r.playedUci);
    const blackBest = referenceRows.filter(r => r.ply % 2 === 0 && r.bestUci === r.playedUci);

    expect(whiteBest.length).toBe(12);
    expect(blackBest.length).toBe(23);
  });

  it('runs classifyMove on all reference rows and inspects classifications', () => {
    const chess = new Chess();
    const fens: string[] = [chess.fen()];
    const allSans: string[] = [];

    for (const ref of referenceRows) {
      const from = ref.playedUci.slice(0, 2);
      const to = ref.playedUci.slice(2, 4);
      const promotion = ref.playedUci.length > 4 ? ref.playedUci.slice(4, 5) : undefined;
      const res = chess.move({ from, to, promotion });
      if (!res) {
        console.error(`Failed move at ply ${ref.ply}: ${ref.playedUci}`);
      }
      allSans.push(res ? res.san : ref.san);
      fens.push(chess.fen());
    }

    const counts: Record<string, { best: number; great: number; brilliant: number; book: number; totalBestUci: number }> = {
      w: { best: 0, great: 0, brilliant: 0, book: 0, totalBestUci: 0 },
      b: { best: 0, great: 0, brilliant: 0, book: 0, totalBestUci: 0 },
    };

    const divergences: any[] = [];

    for (let i = 0; i < referenceRows.length; i++) {
      const ref = referenceRows[i];
      const isWhite = ref.ply % 2 === 1;
      const side = isWhite ? 'w' : 'b';
      const from = ref.playedUci.slice(0, 2);
      const to = ref.playedUci.slice(2, 4);

      const evalBefore = {
        cp: ref.evB,
        mate: null,
        depth: 11,
        bestMoveUci: ref.bestUci,
        bestMoveSan: '',
        pv: `${ref.bestUci}`,
      };
      const evalAfter = {
        cp: ref.evA,
        mate: null,
        depth: 11,
        bestMoveUci: '',
        bestMoveSan: '',
        pv: '',
      };

      const res = classifyMove(
        ref.san,
        from,
        to,
        side,
        fens[i],
        fens[i + 1],
        evalBefore,
        evalAfter,
        i,
        allSans
      );

      const isBestUci = ref.bestUci === ref.playedUci;
      if (isBestUci) {
        counts[side].totalBestUci++;
        if (res.classification === 'best') counts[side].best++;
        else if (res.classification === 'great') counts[side].great++;
        else if (res.classification === 'brilliant') counts[side].brilliant++;
        else if (res.classification === 'book') counts[side].book++;
        else {
          divergences.push({
            ply: i + 1,
            move: ref.moveNum + ' ' + ref.san,
            classification: res.classification,
            bestUci: ref.bestUci,
            playedUci: ref.playedUci,
            loss: res.winChanceLoss,
          });
        }
      }
    }

    console.log('BEST MOVE DISTRIBUTION ON GROUND TRUTH:');
    console.log(JSON.stringify(counts, null, 2));
    console.log('DIVERGENCES (isBestUci but not best/great/brilliant/book):', divergences);
  });
});
