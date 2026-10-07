# ♟️ Chess Game Review - Client-Side Chess Analysis Platform

A modern, high-performance, and open-source chess analysis platform running **Stockfish 16 NNUE** directly in the browser via WebAssembly and Web Workers. Zero server costs, privacy-focused, and completely free.

---

## ✨ Features

- **🚀 100% Client-Side Engine:** Powered by Stockfish 16 NNUE WASM running in dedicated Web Workers without slowing down the UI thread.
- **📊 Granular Move Classifications:**
  - `‼️` **Brilliant:** Sound tactical material sacrifices verified across PV candidate lines.
  - `!` **Great:** Game-turning moves or critical only-winning solutions based on Multi-PV gaps.
  - `⭐` **Best:** Engine's top recommended choice.
  - `✅` **Excellent & Good:** Solid positional play with negligible win percentage loss.
  - `?!` **Inaccuracy:** Minor loss of advantage.
  - `?` **Mistake:** Notable tactical or positional oversight.
  - `??` **Blunder:** Serious mistake, missed mate, or game-losing move.
  - `📖` **Book:** Opening theory detection with ECO database integration.
- **🎯 Non-linear Accuracy Model:** Evaluates game accuracy using harmonic and volatility-weighted win probability metrics.
- **🔄 Multi-PV Candidate Analysis:** Simultaneously calculates top 3 candidate variations with dynamic evaluation gaps.
- **🧭 Dynamic Phase Analysis:** Intelligently categorizes Opening, Middlegame, and Endgame based on piece count and pawn structure rather than arbitrary move counts.
- **⚡ Turning Point Detection:** Pinpoints the exact pivotal moves that altered the outcome of the match.
- **🧩 Mistake Practice Trainer:** Interactive puzzle mode enabling players to replay mistakes and discover top engine recommendations.
- **🧪 Interactive Sandbox Mode:** Free-play board allowing users to explore alternative branches at any move without losing game context.
- **📥 Multi-Source Game Importer:**
  - Raw PGN input and file upload
  - Direct Chess.com user game archives fetch
  - Direct Lichess user game archives fetch
- **📈 Visual Evaluation Bar & Graph:** Smooth evaluation curve rendering with discrete checkmate handling.
- **📤 Export & Share:** Export annotated PGN and generate social game review summary cards.

---

## 🛠️ Tech Stack

- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Vanilla CSS + Tailwind CSS (Custom Dark Chess Palette) + Lucide Icons
- **Chess Logic:** `chess.js`
- **Board UI:** `react-chessboard`
- **Engine:** `stockfish` 16.0.0 NNUE (Single-threaded WebAssembly & Web Worker)
- **Deployment:** Vercel (Configured with SPA rewrites and caching headers)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/DevErennn/chess-analysis-site.git
cd chess-analysis-site

# Install dependencies
npm install

# Run the local development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser to start analyzing games.

### Production Build

```bash
# Build the production bundle
npm run build

# Preview the production build locally
npm run preview
```

### Running Tests

```bash
# Run unit and engine scenario tests
npm test

# Run linter
npm run lint
```

---

## 📐 Architecture & Pipeline

```text
PGN Input / API Importer
       │
       ▼
FEN Sequence Generation (chess.js)
       │
       ▼
Stockfish 16 NNUE WASM Worker (MultiPV = 3, Depth 18)
       │
       ▼
Universal Perspective Normalization (White POV vs Mover POV)
       │
       ▼
Logistic Win Probability (evaluationToWinProbability)
       │
       ▼
Centipawn Loss (CPL) & Win% Loss Calculation
       │
       ▼
Move Classification & Sacrifice Verification
       │
       ▼
Accuracy Scoring (Harmonic Mean & Volatility Weighting)
       │
       ▼
Turning Point Detection, Phase Analysis & Interactive Practice
```

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
