# ♟️ Chess Game Review - Client-Side Analysis Platform

Chess.com ve Lichess'in ücretli "Game Review" (Oyun İnceleme) özelliklerine alternatif, tamamen ücretsiz, açık kaynaklı ve istemci tarafında (tarayıcıda Stockfish Web Worker ile) çalışan satranç analiz web uygulaması.

---

## 🚀 Özellikler

- **%100 Ücretsiz & Sınırsız:** Hiçbir üyelik veya abonelik gerektirmez.
- **Sıfır Sunucu Maliyeti (Client-Side):** Tüm motor hesaplamaları kullanıcının tarayıcısında WebAssembly (WASM) ve Web Worker ile çalışır.
- **Çoklu Veri Girişi:**
  - PGN yapıştırma veya dosya yükleme
  - Chess.com API entegrasyonu ile son 10 maçı otomatik çekme
- **Detaylı Hamle Sınıflaması:**
  - `!!` Brilliant (Göz Alıcı)
  - `⭐` Best (En İyi Hamle)
  - `✅` Excellent (Mükemmel)
  - `?!` Inaccuracy (Şüpheli)
  - `?` Mistake (Hata)
  - `??` Blunder (Büyük Hata)
- **Görsel Geri Bildirim:** Dinamik Değerlendirme Çubuğu (Eval Bar), tahta üstü en iyi hamle okları (arrows), doğruluk oranı (Accuracy %).

---

## 🛠️ Teknoloji Yığını

- **Frontend:** React 19 + TypeScript + Vite
- **Stil / Tasarım:** Tailwind CSS (Özel Satranç Koyu Teması) + Lucide React
- **Satranç Mantığı:** `chess.js`
- **Satranç Tahtası UI:** `react-chessboard`
- **Satranç Motoru:** `Stockfish` (WebAssembly & Web Worker)

---

## 🗺️ Geliştirme Yol Haritası

- [x] **Adım 1:** Vite + React + TypeScript + Tailwind CSS kurulumu, kütüphanelerin entegrasyonu ve tip mimarisi.
- [x] **Adım 2:** Veri Giriş Ekranı (PGN Yapıştırma ve Chess.com API ile son 10 maçı çekme) - *([Detaylar için STEP_2_PROMPT.md dosyasına bakın](./STEP_2_PROMPT.md))*
- [x] **Adım 3 & 4:** Stockfish Web Worker Entegrasyonu, Eval Bar, Hamle Sınıflandırma ve Doğruluk Algoritması - *([Detaylar için STEP_3_PROMPT.md dosyasına bakın](./STEP_3_PROMPT.md))*
- [x] **Adım 4 & 5 (Polish & Production):** Web Audio ses efektleri, ECO açılış tespiti, analizli PGN & sosyal rapor paylaşımı, mobil optimizasyon ve Vercel COOP/COEP headers.
- [ ] **Adım 5 (İleri Seviye Eklentiler):** Lichess API entegrasyonu, hata tekrarı (Mistake Trainer puzzle modu), Multi-PV çoklu motor hatları ve görsel PNG paylaşımı - *([Detaylar için STEP_5_PROMPT.md dosyasına bakın](./STEP_5_PROMPT.md))*

---

## 💻 Kurulum ve Çalıştırma

Projeyi yerel ortamınızda çalıştırmak için:

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev

# Üretim derlemesi oluşturun
npm run build
```

---

## 🤖 AI Ajanı ile Geliştirmeye Devam Etme
Eğer bir AI yardımcısı (Cursor, Claude, ChatGPT, Antigravity vb.) ile sonraki adımı geliştirecekseniz, kök dizindeki [`STEP_3_PROMPT.md`](./STEP_3_PROMPT.md) dosyasının içeriğini doğrudan AI ajanınıza yapıştırabilirsiniz.
