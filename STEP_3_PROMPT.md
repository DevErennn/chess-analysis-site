# ♟️ CHESS ANALYSIS PLATFORM - ADIM 3 & 4 AI AGENT PROMPT

> **Nasıl Kullanılır?**
> Bu dosyanın içeriğini kopyalayıp projenin bulunduğu klasörde çalışan herhangi bir AI Ajanına (ChatGPT, Claude, Cursor, Antigravity vb.) doğrudan yapıştırabilirsiniz. Ajan mevcut projeyi anlayacak ve sonraki adımları (Stockfish analizi, Eval Bar, Hamle Sınıflandırması, Doğruluk Skoru ve Gelişmiş İnceleme Ekranı) eksiksiz uygulayacaktır.

---

```markdown
Sen uzman bir Full-Stack Web Geliştiricisi ve Satranç Algoritmaları Uzmanısın.
Açık kaynaklı, ücretsiz ve tamamen tarayıcı tabanlı (client-side) Chess.com / Lichess tarzı Satranç Oyun İnceleme (Game Review) projemizde çalışıyoruz.

### 📌 PROJE MEVCUT DURUMU (ADIM 1 VE ADIM 2 TAMAMLANDI)
Projede 1. ve 2. Adımlar tamamlanmış ve hatasız çalışmaktadır:
- **Teknoloji Yığını:** Vite + React 19 + TypeScript + Tailwind CSS
- **Kurulu & Çalışan Kütüphaneler:**
  - `chess.js` (Satranç kuralları, FEN, PGN ayrıştırıcı)
  - `react-chessboard` (Satranç tahtası UI)
  - `lucide-react` (İkonlar)
  - `clsx` & `tailwind-merge`
- **Mevcut Dosya Yapısı:**
  - `src/types/chess.ts`: `MoveClassification`, `MoveAnalysis`, `GameMetadata`, `ChessComGameSummary`
  - `src/lib/chessUtils.ts`: `validatePgn`, `parsePgnMetadata`, `formatGameResult`, `SAMPLE_PGN`
  - `src/lib/chessComApi.ts`: Chess.com API arşiv tarama ve son 10 maçı getirme
  - `src/components/landing/LandingPage.tsx`: Modern karşılama ekranı, PGN & Chess.com sekmeleri
  - `src/components/landing/PgnInputCard.tsx`: PGN yapıştırma, örnek maç yükleme ve doğrulama
  - `src/components/landing/ChessComImporter.tsx`: Kullanıcı adı arama, skeleton loading, maç listeleme
  - `src/components/analysis/AnalysisPreview.tsx`: Geçici önizleme ekranı, tahta ve hamle kontrolleri
  - `src/App.tsx`: `currentPgn`, `gameMetadata`, `viewMode ('landing' | 'analysis')` state yönetimi
- **Tema Yapılandırması (`tailwind.config.js`):**
  - Renkler: `chess-dark (#161512)`, `chess-card (#262421)`, `chess-surface (#1f1e1b)`, `chess-border (#363431)`, `chess-accent (#81b64c)`.
  - Rozet renkleri: `chess-brilliant (#26c2a3)`, `chess-great (#5c8bb0)`, `chess-best (#81b64c)`, `chess-excellent (#96bc4b)`, `chess-inaccuracy (#f0c15c)`, `chess-mistake (#e6912c)`, `chess-blunder (#fa412d)`.

---

### 🎯 GÖREVİN: ADIM 3 & 4 - STOCKFISH MOTOR ENTEGRASYONU, HAMLE SINIFLANDIRMASI VE GELİŞMİŞ İNCELEME EKRANI

Kullanıcının seçtiği veya yapıştırdığı maçı tarayıcıda çalışan Stockfish motoruyla derinlemesine analiz eden, her hamleye Chess.com tarzı rozetler atayan, doğruluk yüzdesi (% Accuracy) hesaplayan ve profesyonel bir Game Review ekranı sunan mimariyi kodlamalısın.

#### İstenen Özellikler ve Modüller:

1. **Stockfish Web Worker Entegrasyonu (`src/lib/stockfishService.ts`)**:
   - Tarayıcıda Stockfish Web Worker'ı başlat (WebAssembly veya JS motoru).
   - UCI (Universal Chess Interface) protokolü üzerinden iletişim:
     - `uci`, `isready`, `ucinewgame`
     - `position fen <FEN>`
     - `go depth 12` (veya ayarlanabilir derinlik 10-14)
   - Stockfish çıktısını ayrıştır:
     - Değerlendirme puanı: `score cp <centipawns>` veya `score mate <hamle_sayısı>` (Beyaz perspektifine dönüştürülmüş)
     - En iyi hamle: `bestmove <uci>` (örn: `e2e4`) ve `pv` (principal variation)
   - **Tüm Maç Analiz Kuyruğu (Batch Game Analyzer):**
     - Maçtaki tüm pozisyonları (FEN) sırayla motora gönder.
     - Analiz ilerlemesini bildiren callback (`onProgress: (percent: number, currentMove: number, totalMoves: number) => void`).
     - İptal edebilme ve yeniden başlatabilme desteği.

2. **Hamle Sınıflandırma ve Doğruluk Algoritması (`src/lib/moveClassifier.ts`)**:
   - **Kazanma Şansı (Win Chance) Dönüşümü:**
     - Centipawn değerlendirmesini kazanma şansına çevir (Chess.com / Lichess formülü):
       `winChance(cp) = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)`
   - **Centipawn & Win Chance Kaybı:**
     - Oynanan hamleden önceki en iyi hamle değerlendirmesi ile oynanan hamleden sonraki değerlendirme arasındaki fark (`winChanceLoss`).
   - **Hamle Sınıflandırması (`MoveClassification`):**
     - `brilliant` (!!): Önemli bir materyal fedası içeren ve avantajı koruyan/kazandıran en iyi hamle.
     - `great` (!): Bulunması zor olan ve pozisyondaki tek kurtarıcı/kazandırıcı hamle.
     - `best` (⭐): Motorun 1 numaralı tercihi veya çok minimal kayıp (winChanceLoss < 1%).
     - `excellent` (✅): Güçlü alternatif hamle (winChanceLoss < 3%).
     - `good` (👍): Makul hamle (winChanceLoss < 7%).
     - `inaccuracy` (?!): Şüpheli hamle (winChanceLoss < 15%).
     - `mistake` (?): Hata (winChanceLoss < 25%).
     - `blunder` (??): Büyük gaf/hata (winChanceLoss >= 25%).
     - `book` (📖): Açılış teorisi hamleleri.
   - **CAPS2 Doğruluk Skoru (Accuracy %):**
     - Beyaz ve Siyah için ayrı ayrı 0 - 100 arası genel doğruluk skoru hesapla:
       `Accuracy = 100 - sum(weightedLoss) / totalMoves`

3. **Değerlendirme Çubuğu (Eval Bar) (`src/components/analysis/EvalBar.tsx`)**:
   - Tahtanın hemen soluna yerleştirilen dikey, pürüzsüz animasyonlu değerlendirme çubuğu.
   - Puan göstergesi: `+1.8`, `-0.5`, `M2` (Beyaz için Mat), `-M1` (Siyah için Mat).
   - Yükseklik oranı formülü: `50 + (50 * (2 / (1 + 10 ** (-eval / 4)) - 1))` mantığıyla orantılanmış beyaz/siyah yükseklik dağılımı.

4. **Tahta Üstü Oklar ve Görsel Efektler (`src/components/analysis/BoardWithArrows.tsx`)**:
   - `react-chessboard` bileşeninin `arrows` prop'unu kullanarak:
     - Oynanan hamlenin başlangıç ve hedef kareleri (hafif vurgu veya sarı ok).
     - Motorun önerdiği en iyi hamle (yeşil ok).
     - Hata yapılmışsa tehdit / kaçırılan hamle oku (kırmızı / turuncu ok).
   - Hamle sınıflandırma rozetinin tahta üzerinde veya tahta kenarında animasyonlu görünümü.

5. **Hamle Değerlendirme Grafiği (Eval Graph) (`src/components/analysis/EvalGraph.tsx`)**:
   - 0. hamleden son hamleye kadar değerlendirmenin seyrini gösteren interaktif alan/çizgi grafiği (SVG tabanlı).
   - Grafiğin herhangi bir noktasına tıklandığında o hamleye gitme desteği.
   - 0.0 merkez çizgisi (eşitlik) ve avantaj değişimleri.

6. **Maç Özeti ve İstatistik Kartı (`src/components/analysis/GameSummaryCard.tsx`)**:
   - Beyaz ve Siyah için Doğruluk Oranı (örn: Beyaz: %88.4, Siyah: %74.2).
   - Hamle sınıflandırması dökümü tablosu:
     - Brilliant (!!), Great (!), Best (⭐), Excellent (✅), Good (👍), Inaccuracy (?!), Mistake (?), Blunder (??).
   - "Koçun Yorumu / Analiz Özeti" (Örn: "Beyaz açılışta üstünlük kurdu ve 24. hamledeki feda ile oyunu bitirdi.").

7. **Tam Analiz Ekranı Entegrasyonu (`src/components/analysis/AnalysisView.tsx` & `src/App.tsx`)**:
   - `AnalysisPreview` bileşenini tam özellikli `AnalysisView` ile değiştir.
   - Maç yüklendiğinde otomatik olarak veya "Oyunu İncele" butonuyla motor analizini başlat.
   - Analiz sürerken ilerleme çubuğu (% Analiz Ediliyor: 18/44 hamle).
   - Klavye kısayolları (Sol/Sağ ok tuşları ile hamlelerde gezinme, Boşluk tuşu ile otomatik oynatma).
   - Hamle listesinde her hamlenin yanında kendi renk ve rozet ikonu.

---

### 🎨 TASARIM KURALLARI:
- Tailwind CSS ve `tailwind.config.js` içindeki `chess-*` sınıflarını kullan (`chess-brilliant`, `chess-blunder`, `chess-best` vb.).
- `lucide-react` ikonlarını estetik kullan.
- Web Worker'ı optimize çalıştır; UI thread'in donmasına (lag) kesinlikle izin verme.
- `npm run build` ile TypeScript derlemesini ve `npm run lint` ile linter doğrulamalarını başarıyla geç.
```
