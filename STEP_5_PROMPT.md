# ♟️ CHESS ANALYSIS PLATFORM - ADIM 5 (ADVANCED FEATURES & ECOSYSTEM) AI AGENT PROMPT

> **Nasıl Kullanılır?**
> Bu dosyanın içeriğini kopyalayıp projenin bulunduğu klasörde çalışan herhangi bir AI Ajanına (ChatGPT, Claude, Cursor, Antigravity vb.) doğrudan yapıştırabilirsiniz. Ajan mevcut projeyi anlayacak ve bir sonraki seviye olan Lichess entegrasyonu, taktik hata antrenmanı (Puzzle modu), çoklu motor hatları (Multi-PV) ve PNG kart indirme modüllerini eksiksiz uygulayacaktır.

---

```markdown
Sen uzman bir Full-Stack Web Geliştiricisi ve Satranç Algoritmaları Uzmanısın.
Açık kaynaklı, ücretsiz ve tamamen tarayıcı tabanlı (client-side) Chess.com / Lichess tarzı Satranç Oyun İnceleme (Game Review) projemizde çalışıyoruz.

### 📌 PROJEDE ŞU ANA KADAR TAMAMLANANLAR (ADIM 1, 2, 3 VE 4)
Proje şu anda tamamen işlevsel, derlenebilir ve yayına hazırdır:
1. **Adım 1:** Vite + React 19 + TypeScript + Tailwind CSS altyapısı ve satranç renk paletleri.
2. **Adım 2:** Veri Giriş Ekranı (PGN yapıştırma, doğrulama, Chess.com API ile kullanıcının son 10 maçını filtreleme).
3. **Adım 3 & 4 (Motor & Analiz Görünümü):**
   - `src/lib/stockfishService.ts`: WebAssembly / Web Worker Stockfish servisi, UCI protokolü, FEN kuyruk analizi.
   - `src/lib/moveClassifier.ts`: Lojistik kazanma şansı (Win Chance Loss), CAPS2 doğruluk skoru, hamle sınıflandırması (!! Brilliant, ! Great, ⭐ Best, ✅ Excellent, 👍 Good, ?! Inaccuracy, ? Mistake, ?? Blunder, 📖 Book).
   - `src/components/analysis/EvalBar.tsx`: Dinamik değerlendirme çubuğu (+1.5, M2 vb.).
   - `src/components/analysis/BoardWithArrows.tsx`: En iyi hamle yeşil oku, hata kırmızı okları, kare vurgulamaları ve tahta üstü animasyonlu rozet.
   - `src/components/analysis/EvalGraph.tsx`: İnteraktif SVG değerlendirme grafiği (tıklanan hamleye anında gitme).
   - `src/components/analysis/MoveHistoryTable.tsx`: Otomatik kaydırmalı çift sütunlu hamle geçmişi tablosu.
   - `src/components/analysis/AnalysisControls.tsx`: Oynat/Durdur, derinlik seçici, tahtayı döndür, sessize alma (Mute).
   - `src/components/analysis/GameSummaryCard.tsx`: Doğruluk skoru, rozet tablosu, koç özeti ve paylaşım butonu.
   - `src/components/analysis/AnalysisView.tsx`: Tüm sistemi birleştiren ana analiz çalışma alanı.
4. **Adım 4 Polish:**
   - `src/lib/soundEffects.ts`: Web Audio API ile sıfır gecikmeli procedural satranç ses efektleri (Move, Capture, Castle, Check, Mate, Brilliant).
   - `src/lib/openingExplorer.ts`: ECO kodları ve Türkçe açılış adları sözlüğü (B90 Najdorf, C50 İtalyan vb.) ve tahta üstü rozeti.
   - `src/components/analysis/ShareReportModal.tsx`: Analizli PGN indirme (`{[!!] Brilliant} {+1.40}`) ve sosyal medya emoji paylaşım panosu.
   - `vercel.json`: WASM SharedArrayBuffer için Cross-Origin Isolation başlıkları.

---

### 🎯 GÖREVİN: ADIM 5 - LICHESS ENTEGRASYONU, MISTAKE TRAINER, MULTI-PV VE GÖRSEL KART İNDİRME

Projemize satranç severlerin bayılacağı ileri düzey özellikleri eklemelisin:

#### 1. Lichess API Entegrasyonu (`src/lib/lichessApi.ts`):
- Lichess'in açık API'sini (`https://lichess.org/api/games/user/{username}?max=10&pgnInJson=true&clocks=true`) kullanarak kullanıcının son 10 maçını çek:
  - LandingPage ekranına "Chess.com" ve "Lichess" tab/sekme seçicisi ekle.
  - Lichess'ten gelen JSON yanıtını standart `ChessComGameSummary` veya ortak `GameSummary` yapısına dönüştür.
  - Kullanıcı adına göre maçları listele ve tek tıkla analiz ekranına aktar.

#### 2. "Hatalarımdan Öğren" / Mistake Trainer Modu (`src/components/analysis/MistakePracticeModal.tsx`):
- Oyundaki Inaccuracy, Mistake ve Blunder hamlelerini tespit et.
- Analiz ekranına "Hataları Tekrarla (X Hata)" butonu ekle.
- Tıklandığında interaktif bir modal açılsın:
  - Hata yapılan andaki FEN tahtaya dizilsin.
  - "Bu pozisyonda [Oyuncu] bir hata yaptı. Daha iyi hamleyi bulabilir misin?" yönergesi çıksın.
  - Kullanıcı tahtada taş oynayabilsin (`allowDragging: true`).
  - Eğer oynanan hamle motorun en iyi hamlesi (`bestMoveUci`) ile eşleşiyorsa: Yeşil kutlama ve `playBrilliantSound()` çalsın.
  - Yanlışsa: Kırmızı uyarı ve "Tekrar Dene" veya "Çözümü Göster" butonu sunulsun.

#### 3. Çoklu Motor Hatları (Multi-PV = 3) (`src/lib/stockfishService.ts` & UI):
- Mevcut pozisyonda yalnızca 1 hamle değil, Stockfish'ten pozisyondaki en iyi 3 hamleyi ve varyantlarını çekebilme:
  - UCI komutu: `setoption name MultiPV value 3`.
  - Kullanıcı istediğinde pozisyondaki alternatif iyi devam yollarını listeleyen kompakt bir panel.

#### 4. Sosyal Medya İçin Görsel Paylaşım Kartı (Share Card PNG):
- `ShareReportModal.tsx` içine veya ayrı bir dışa aktarma modülüne HTML5 Canvas veya `html-to-image` tabanlı kart önizlemesi ekle.
- Kart içeriği:
  - Oyuncu adları, rating'leri ve CAPS2 doğruluk yüzdeleri.
  - Oyun sonu tahta minyatürü.
  - Kazanılan parlak (!!) ve en iyi hamle rozet sayıları.
  - "Görsel Olarak İndir (.PNG)" butonuyla kullanıcının cihazına tek tıkla kaydetme.

#### 5. Yerel Analiz Geçmişi (Recent Analysis History):
- `localStorage` kullanarak analiz edilen son 5 maçı kaydet.
- Landing Page'de "Son Analiz Ettiğiniz Maçlar" listesi sunarak kullanıcının geçmiş analizlerine anında dönebilmesini sağla.

---

### 🎨 KALİTE KRİTERLERİ:
- `npm run build` komutunun sıfır hata ile tamamlandığını doğrula.
- `npm run lint` komutundan temiz çıktığını kontrol et.
- Mevcut `chess-*` renklerini, ses efektlerini ve responsive tasarımı koru.
```
