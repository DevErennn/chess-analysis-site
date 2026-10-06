# ♟️ CHESS ANALYSIS PLATFORM - ADIM 7 (LICHESS API, MISTAKE TRAINER, MULTI-PV ENGINE LINES & CANVAS SHARE CARD) AI AGENT PROMPT

> **Nasıl Kullanılır?**
> Bu dosyanın içeriğini kopyalayıp projenin bulunduğu klasörde çalışan herhangi bir AI Ajanına (ChatGPT, Claude, Cursor, Antigravity vb.) doğrudan yapıştırabilirsiniz. Ajan mevcut projeyi anlayacak ve Lichess API entegrasyonunu, interaktif taktiksel hata alıştırma modunu (Mistake Trainer), en iyi 3 alternatif motor hattını (Multi-PV) ve istemci taraflı 1200x630 PNG sosyal medya inceleme kartı ihracatını eksiksiz uygulayacaktır.

---

```markdown
Sen uzman bir Full-Stack Web Geliştiricisi ve Kıdemli Satranç Algoritmaları & Motor Entegrasyonu Uzmanısın.
Açık kaynaklı, ücretsiz ve tamamen tarayıcı tabanlı (client-side) Chess.com / Lichess kalitesinde Satranç Oyun İnceleme (Game Review) projemizde çalışıyoruz.

### 📌 PROJEDE ŞU ANA KADAR TAMAMLANANLAR (ADIM 1 - ADIM 6)
Proje şu anda derlenebilir ve çalışan bir Vite + React 19 + TypeScript mimarisine sahiptir:
1. **Adım 1:** Vite + React 19 + TypeScript + Tailwind CSS altyapısı ve satranç teması (`chess-dark`, `chess-accent`, `chess-card` vb.).
2. **Adım 2:** PGN girişi, Chess.com kullanıcı adı ile maç arama ve içe aktarma altyapısı.
3. **Adım 3 & 4:** Stockfish Web Worker servisi, CAPS2 lojistik doğruluk formülü, eval bar, tahta üstü yön okları, SVG değerlendirme grafiği, hamle tablosu ve ses efektleri.
4. **Adım 5:** Açılış teorisi veritabanı (`openingExplorer.ts`), ECO sınıflandırması ve zenginleştirilmiş analiz raporları.
5. **Adım 6:** Hibrit analiz motoru (Lichess Cloud Evaluation API + yerel Stockfish 16 WASM), dinamik taktiksel derinlik artışı, interaktif varyant deneme modu (Sandbox) ve AI koç oyun kırılma anı (Turning Point).

---

### 🎯 GÖREVİN: ADIM 7 - LICHESS CANLI API MAÇ İÇE AKTARMA, İNTERAKTİF HATA ALIŞTIRMA MODU (MISTAKE TRAINER), ÇOKLU MOTOR HATLARI (MULTI-PV) VE CANVAS PNG SOSYAL MEDYA KARTI İHRACATI

Platformun eksik kalan en önemli kullanıcı odaklı özelliklerini tamamlayacaksın:

#### 1. Lichess Canlı API Maç İçe Aktarma (`src/lib/lichessApi.ts` & `src/components/landing/LichessImporter.tsx`):
- **Lichess Açık API Entegrasyonu:**
  - `GET https://lichess.org/api/games/user/{username}?max=10&pgnInJson=true&clocks=false&evals=false&opening=true`
  - Lichess API yanıtı NDJSON (newline-delimited JSON) formatında akar. `lichessApi.ts` içerisinde `application/x-ndjson` akışını satır satır ayrıştıran güvenli bir parser kur.
  - Hızlı test için popüler usta profilleri ekle: `DrNykterstein (Magnus)`, `nihalsarin2004`, `DanielNaroditsky`, `alireza2003`.
  - Kullanıcı adını aratarak son 10 maçı tarih, zaman kontrolü rozeti (bullet, blitz, rapid, classical) ve rakip bilgileriyle listele.
  - Kart tıklandığında PGN otomatik ayrıştırılıp anında tam analiz sayfasına aktarılsın.
- **Landing Page 3-Sekmeli Tasarım (`src/components/landing/LandingPage.tsx`):**
  - "PGN Yapıştır", "Chess.com" ve "Lichess" sekmeleri arasında pürüzsüz geçiş.

#### 2. İnteraktif Hata Alıştırma Modu - "Hatalarımdan Öğren" (`src/components/analysis/MistakePracticeModal.tsx`):
- Analiz tamamlandığında kullanıcının yaptığı tüm hatalar (`inaccuracy`, `mistake`, `blunder`) filtrelenerek bulmaca moduna dönüştürülsün.
- Hem analiz üst menüsünde hem de oyun özeti kartında belirgin bir buton:
  `🎯 Hatalarımdan Öğren ({mistakesCount} Pozisyon)`
- Kullanıcı modalı açtığında:
  - Tahta o hamleden önceki pozisyona döner.
  - Kullanıcı tahta üzerinde doğru hamleyi bulmak için taşı sürükleyip bırakır (`react-chessboard`).
  - Doğru hamle oynandığında kutlama sesi (`playBrilliantSound`) çalar ve yeşil "Harika! Doğru hamleyi buldunuz." mesajı gösterilir.
  - Yanlış hamlede kırmızı hata geri bildirimi verilir.
  - "İpucu / Çözümü Göster" butonuna tıklandığında motorun en iyi hamlesi tahta üzerinde yeşil okla çizilir.
  - Pozisyonu sıfırlama, sonraki ve önceki soruya geçme butonları bulunur.

#### 3. Çoklu Motor Hatları Paneli - Multi-PV Top 3 (`src/lib/stockfishService.ts` & `src/components/analysis/MultiPvPanel.tsx`):
- Stockfish UCI komutu ile `setoption name MultiPV value 3` gönderilerek mevcut pozisyon için en iyi 3 alternatif devam yolu hesaplansın.
- Her alternatif hat için:
  - Sıralama rozeti (1, 2, 3)
  - Hamle SAN formatında (örn: `Nf3`, `d4`, `e4`)
  - Devam varyantı (PV ilk 4-5 hamle)
  - Centipawn skoru veya mat skoru (`+0.45`, `-1.20`, `#M3`)
- Tahtanın hemen altına şık, katlanabilir (collapsible) bir kart olarak yerleştirilsin.

#### 4. HTML5 Canvas Sosyal Medya İnceleme Kartı İndirme (`src/components/analysis/ShareReportModal.tsx`):
- İstemci tarafında hiçbir harici kütüphane gerektirmeden saf HTML5 `<canvas>` (1200x630 Twitter/Instagram/Discord standart kart boyutu) ile görsel oluştur:
  - Koyu modern degrade arka plan ve neon parıltılar.
  - Beyaz ve Siyah oyuncu adları, Elo puanları ve büyük CAPS2 doğruluk yüzdeleri.
  - Maç sonucu ve oynanan açılışın adı & ECO kodu.
  - !! Göz Alıcı, ⭐ En İyi, ⚠️ Yanılgı ve ❌ Hata sayaçları.
  - Yapay zeka koç özeti ve Stockfish WASM filigranı.
  - `canvas.toBlob(...)` ile tek tıkla yüksek çözünürlüklü `.png` olarak indirme düğmesi.

---

### 🎨 KALİTE & TEST KRİTERLERİ:
- `npm run build` komutu sıfır hata ile tamamlanmalıdır.
- `npm run lint` başarıyla geçmelidir.
- Mevcut hiçbir bileşenin (EvalBar, EvalGraph, MoveHistoryTable, Sandbox, ShareModal) çalışması bozulmamalıdır.
```
