# ♟️ CHESS ANALYSIS PLATFORM - ADIM 4 & 5 (FİNAL POLISH & PRODUCTION) AI AGENT PROMPT

> **Nasıl Kullanılır?**
> Bu dosyanın içeriğini kopyalayıp projenin bulunduğu klasörde çalışan herhangi bir AI Ajanına (ChatGPT, Claude, Cursor, Antigravity vb.) doğrudan yapıştırabilirsiniz. Ajan mevcut projeyi anlayacak ve son adım olan ses efektleri, açılış veritabanı (ECO), analiz raporu indirme/paylaşma, mobil optimizasyon ve Vercel yayına hazırlık modüllerini eksiksiz uygulayacaktır.

---

```markdown
Sen uzman bir Full-Stack Web Geliştiricisi ve Satranç Algoritmaları Uzmanısın.
Açık kaynaklı, ücretsiz ve tamamen tarayıcı tabanlı (client-side) Chess.com / Lichess tarzı Satranç Oyun İnceleme (Game Review) projemizde çalışıyoruz.

### 📌 PROJEDE ŞU ANA KADAR TAMAMLANANLAR (ADIM 1, 2, 3 VE 4)
Proje şu anda çalışır durumdadır ve şu modüller eksiksiz olarak kodlanmıştır:
1. **Adım 1:** Vite + React 19 + TypeScript + Tailwind CSS altyapısı ve satranç renk paletleri.
2. **Adım 2:** Veri Giriş Ekranı (PGN yapıştırma, doğrulama, Chess.com API ile kullanıcının son 10 maçını filtreleme).
3. **Adım 3 & 4 (Motor & Analiz Paneli):**
   - `src/lib/stockfishService.ts`: WebAssembly / Web Worker Stockfish servisi, UCI protokolü, FEN kuyruk analizi.
   - `src/lib/moveClassifier.ts`: Lojistik kazanma şansı (Win Chance Loss), CAPS2 doğruluk skoru, hamle sınıflandırması (!! Brilliant, ! Great, ⭐ Best, ✅ Excellent, 👍 Good, ?! Inaccuracy, ? Mistake, ?? Blunder, 📖 Book).
   - `src/components/analysis/EvalBar.tsx`: Dinamik sol değerlendirme çubuğu (+1.5, M2 vb.).
   - `src/components/analysis/BoardWithArrows.tsx`: En iyi hamle yeşil oku, hata/gaf kırmızı okları, kare vurgulamaları ve tahta üstü animasyonlu rozet.
   - `src/components/analysis/EvalGraph.tsx`: İnteraktif SVG değerlendirme grafiği (tıklanan hamleye anında gitme).
   - `src/components/analysis/MoveHistoryTable.tsx`: Otomatik kaydırmalı, çift sütunlu hamle geçmişi tablosu.
   - `src/components/analysis/AnalysisControls.tsx`: Oynat/Durdur, ileri/geri, derinlik seçici, tahtayı döndür.
   - `src/components/analysis/GameSummaryCard.tsx`: Beyaz ve Siyah için doğruluk skoru, rozet tablosu, koç özeti.
   - `src/components/analysis/AnalysisView.tsx`: Tüm sistemi birleştiren ana analiz görünümü.

---

### 🎯 GÖREVİN: ADIM 4 & 5 - SES EFEKTLERİ, AÇILIŞ TESPİTİ, RAPOR PAYLAŞIMI VE VERCEL DEPLOYMENT

Projemizi profesyonel bir ürün seviyesine getirmek için aşağıdaki modülleri projeye entegre etmelisin:

#### 1. Satranç Ses Efektleri (`src/lib/soundEffects.ts`):
- Tarayıcının Web Audio API'sini veya sentetik ton/data-uri seslerini kullanarak harici dosya indirme gerektirmeden sıfır gecikmeli ses motoru oluştur:
  - `playMoveSound()`: Normal taş hamlesi sesi.
  - `playCaptureSound()`: Taş alma sesi.
  - `playCheckSound()`: Şah çekme / tehdit sesi.
  - `playCastleSound()`: Rok sesi.
  - `playGameEndSound()`: Oyun bitiş / mat sesi.
  - `playBrilliantSound()`: Göz alıcı (!!) hamle yapıldığında çalan özel ödül sesi.
- Tahtada kullanıcı ileri/geri gittiğinde veya otomatik oynatma sırasında ilgili sesin çalmasını sağla.
- Arayüze "Sesi Aç/Kapat" (Mute/Unmute) toggle butonu ekle.

#### 2. Açılış Tespit Modülü (`src/lib/openingExplorer.ts`):
- Yaygın satranç açılışlarının ECO kodlarını ve adlarını tanıyan hafif bir sözlük oluştur (Örn: C50 İtalyan Açılışı, B90 Sicilya Savunması Najdorf, D02 Vezir Gambiti, C60 Ruy Lopez vb.).
- Maçın ilk 5-10 hamlesi sırasında tahtanın üst kısmında açılış adını (Örn: *"ECO: B90 - Sicilya Savunması: Najdorf Varyantı"*) şık bir rozetle göster.

#### 3. Analiz Raporunu İndirme / Paylaşma (`src/components/analysis/ShareReportModal.tsx`):
- Kullanıcının analiz sonucunu (Doğruluk yüzdeleri, en iyi hamleler, rozet sayıları ve maç sonucu) görsel bir kart veya panoya kopyalanabilir metin formatında dışa aktarmasını sağlayan buton/modal:
  - "Analizli PGN İndir" (Hamlelerin yanında `{[!!] Brilliant} {+1.40}` gibi yorumlarla zenginleştirilmiş PGN).
  - "Raporu Kopyala" (Sosyal medyada paylaşılabilir emoji formatı: *"♟️ Chess Analysis Review: ⚪ Kasparov (%92.4) vs ⚫ Topalov (%84.1) - 2 Brilliant Moves!"*).

#### 4. Mobil ve Responsive Tasarım Optimizasyonu:
- Küçük ekranlarda (telefon ve tablet):
  - Tahta ve değerlendirme çubuğunun ekranı taşırmadan ekran genişliğine göre esnemesi.
  - Hamle listesi ve kontrol butonlarının tahtanın altına tek elle rahatça kullanılabilecek ergonomide yerleşmesi.

#### 5. Vercel & Production Dağıtım Yapılandırması (`vercel.json`):
- Web Worker ve WebAssembly'nin Vercel üzerinde Cross-Origin Isolation başlıklarıyla sorunsuz çalışması için `vercel.json` dosyasını oluştur:
  ```json
  {
    "headers": [
      {
        "source": "/(.*)",
        "headers": [
          { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
          { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
        ]
      }
    ]
  }
  ```

---

### 🎨 KALİTE KRİTERLERİ:
- `npm run build` komutunun sıfır hata ile tamamlandığını doğrula.
- `npm run lint` komutundan temiz çıktığını kontrol et.
- Tasarımda `chess-*` renklerini ve karanlık modern temayı koru.
```
