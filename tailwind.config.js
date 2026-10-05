/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        chess: {
          dark: '#161512',      // Lichess derin arka plan
          surface: '#1f1e1b',   // İkincil arka plan
          card: '#262421',      // Panel ve kart rengi
          cardHover: '#312e2b', // Hover kart rengi
          border: '#363431',    // İnce ayırıcı çizgiler
          accent: '#81b64c',    // Chess.com yeşili
          accentHover: '#98c863',
          boardDark: '#769656', // Standart tahta koyu kare rengi
          boardLight: '#eeeed2',// Standart tahta açık kare rengi
          // Hamle Rozet Renkleri (Chess.com & Lichess uyumlu)
          brilliant: '#26c2a3', // Turkuaz !!
          great: '#5c8bb0',     // Mavi !
          best: '#81b64c',      // Yeşil ⭐
          excellent: '#96bc4b', // Açık yeşil ✅
          good: '#a88865',      // Bej/Nötr
          inaccuracy: '#f0c15c',// Sarı ?!
          mistake: '#e6912c',   // Turuncu ?
          blunder: '#fa412d',   // Kırmızı ??
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
