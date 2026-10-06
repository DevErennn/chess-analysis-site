# ♟️ CHESS ANALYSIS PLATFORM - ADIM 6 (ENGINE PRECISION, NNUE CLOUD/WASM, SMART COACH & SANDBOX) AI AGENT PROMPT

> **Nasıl Kullanılır?**
> Bu dosyanın içeriğini kopyalayıp projenin bulunduğu klasörde çalışan herhangi bir AI Ajanına (ChatGPT, Claude, Cursor, Antigravity vb.) doğrudan yapıştırabilirsiniz. Ajan mevcut projeyi anlayacak ve motor analiz hassasiyetini, Stockfish 16+ NNUE / Cloud Eval yedekleme sistemini, interaktif varyant deneme (Sandbox) modunu ve gelişmiş yapay zeka koç değerlendirmesini eksiksiz uygulayacaktır.

---

```markdown
Sen uzman bir Full-Stack Web Geliştiricisi ve Kıdemli Satranç Algoritmaları & Motor Entegrasyonu Uzmanısın.
Açık kaynaklı, ücretsiz ve tamamen tarayıcı tabanlı (client-side) Chess.com / Lichess kalitesinde Satranç Oyun İnceleme (Game Review) projemizde çalışıyoruz.

### 📌 PROJEDE ŞU ANA KADAR TAMAMLANANLAR (ADIM 1 - ADIM 5)
Proje şu anda derlenebilir ve çalışan bir Vite + React 19 + TypeScript mimarisine sahiptir:
1. **Adım 1:** Vite + React 19 + TypeScript + Tailwind CSS altyapısı ve satranç teması (`chess-dark`, `chess-accent`, `chess-card` vb.).
2. **Adım 2:** PGN girişi, Chess.com kullanıcı adı ile maç arama ve içe aktarma altyapısı.
3. **Adım 3 & 4:** Stockfish Web Worker servisi, CAPS2 lojistik doğruluk formülü, eval bar, tahta üstü yön okları, SVG değerlendirme grafiği, hamle tablosu ve ses efektleri.
4. **Adım 5 Temelleri:** Lichess API entegrasyonu hazırlığı, hamle dağılımı tablosu (`!! Brilliant (Göz Alıcı)` dahil), açılış tespit modülü (`openingExplorer.ts`).

---

### 🎯 GÖREVİN: ADIM 6 - MOTOR HASSASİYETİ KALİBRASYONU, LICHESS CLOUD EVAL YEDEK HATTI, İNTERAKTİF SANDBOX VE GELİŞMİŞ KOÇ ZEKA MOTORU

Kullanıcı geri bildirimlerinde motorun bazı maçlarda doğruluk skorunu gerçekçi olmayan yüksek oranlarda (%96+ gibi) vermesi, bazı taktik hataları veya gafları kaçırması ve feda hamlelerini doğru derinlikte tahlil edememesi gibi sorunlar bildirilmiştir. Bu adımda motorun analiz hassasiyetini kusursuzlaştıracak, alternatif derin hatları ve interaktif araçları ekleyeceksin:

#### 1. Motor Analiz Hassasiyeti & Hibrit Eval Sistemi (`src/lib/stockfishService.ts` & `src/lib/cloudEvalService.ts`):
- **Lichess Cloud Evaluation API Desteği (Anında & Kusursuz Derinlik):**
  - Açılış ve yaygın pozisyonlar için Lichess'in ücretsiz açık Cloud Eval API'sine istek at:
    `GET https://lichess.org/api/cloud-eval?fen={encodedFen}&multiPv=1`
  - Eğer pozisyon Lichess bulutunda zaten derin Stockfish (depth 30-50) ile çözülmüşse, anında oradaki skoru ve pv'yi al (0 ms gecikme, %100 doğruluk).
  - Eğer pozisyon bulutta yoksa yerel Stockfish WASM motoruna dön. Bu sayede analiz hızı 5 kat artar ve açılış/orta oyun taktikleri kesinlikle şaşmaz.
- **Dinamik Derinlik & Taktik Kuşku Analizi (Quiescence / Tactical Verification):**
  - Taş değişimlerinin ve şah çekişlerin olduğu kritik taktik pozisyonlarda derinliği dinamik olarak +2 ply artırarak motorun ufuk etkisine (horizon effect) takılmasını engelle.

#### 2. Hassas Hamle Sınıflandırma & CAPS2 Skor Kalibrasyonu (`src/lib/moveClassifier.ts`):
- **Sıkılaştırılmış Rozet Kriterleri:**
  - `!! Brilliant (Göz Alıcı)`: Yalnızca motorun 1 numaralı hamlesi olan, materyal fedası içeren ve sonrasında pozisyonu açık kazanç veya sağlam tutan hamleler.
  - `! Harika (Great)`: Pozisyonu kurtaran tek geçerli hamle veya zor bulunan dönüm noktası.
  - `⭐ En İyi (Best)`: Yalnızca ve yalnızca motorun önerdiği 1. hamle (isBestMove).
  - `✅ Mükemmel (Excellent)`: En iyi hamle olmasa da kazanma şansı kaybı < %2.5 olan çok güçlü devam yolları.
  - `👍 İyi (Good)`: Normal, kabul edilebilir hamleler (%2.5 - %6.5 kayıp).
  - `?! Şüpheli (Inaccuracy)`: Küçük avantaj kaybı (%6.5 - %14 kayıp).
  - `? Hata (Mistake)`: Ciddi pozisyon veya piyon kaybı (%14 - %24 kayıp).
  - `?? Büyük Hata (Blunder)`: Taş uyutan veya kazancı rakibe veren fahiş gaflar (> %24 kayıp).
  - `📖 Kitap (Book)`: Açılış teorisi hamleleri (Örn: ECO veritabanı eşleşmeleri).
- **Doğruluk Skoru Eğrisi:**
  - Gerçek maçlarda amatör seviyedeki gafların (örn: 300-800 Elo) skoru hak ettiği %55 - %70 seviyesine, temiz usta maçlarının ise %85 - %95 seviyesine çekilmesini garanti et.

#### 3. İnteraktif Varyant Deneme Modu (Board Sandbox / "Ne Olurdu?" Modu):
- Analiz ekranında kullanıcının tahta üzerinde kendi taşlarını oynatarak farklı devam yollarını test edebileceği serbest mod:
  - "Bu hamleyi oynasaydım ne olurdu?" butonu ile mevcut analiz duraklatılıp tahtada serbest hamle yapma imkanı.
  - Kullanıcı alternatif bir hamle oynadığında motorun anlık olarak o hamleye karşı en iyi yanıtı ve değerlendirme çubuğundaki değişimi göstermesi.
  - "Analize Geri Dön" butonuyla orijinal maç akışına tek tıkla pürüzsüz dönüş.

#### 4. Gelişmiş Yapay Zeka Koç Değerlendirmesi & Oyunun Kırılma Anı (Turning Points):
- `GameSummaryCard.tsx` ve analiz ekranında:
  - **Oyunun Kırılma Noktası (Turning Point):** Oyunun kaderini değiştiren hamleyi (örneğin "17... Nd3?? hamlesi oyunun dengesini tamamen Beyaz lehine çevirdi") belirten özel bir kart.
  - **Fırsat Kaçırma Bildirimi (Missed Win):** Rakip hata yaptığında cezalandırılmayan hamlelerin tespiti.
  - Koç özetinde oyuncunun zayıf kaldığı aşamayı (Açılış, Orta Oyun, Oyun Sonu) belirten dinamik tavsiye.

#### 5. Görsel Parlatma & UI Polish:
- `!! Brilliant (Göz Alıcı)` hamlesi tahtada oynandığında tahta üzerinde parlayan teal neon efekti ve kutlama mikro-animasyonu.
- Hamle dağılımı listesinde tüm sayaçların tıklanabilir olması (örneğin "Büyük Hata (2)" satırına tıklandığında tahtanın doğrudan o hata hamlesine sıçraması).

---

### 🎨 KALİTE & TEST KRİTERLERİ:
- `npm run build` komutu sıfır hata ve uyarı ile tamamlanmalıdır.
- `npm run lint` başarıyla geçmelidir.
- Mevcut hiçbir bileşenin (EvalBar, EvalGraph, MoveHistoryTable, ShareModal) çalışması bozulmamalıdır.
```
