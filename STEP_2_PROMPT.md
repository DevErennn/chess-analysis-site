# ♟️ CHESS ANALYSIS PLATFORM - ADIM 2 AI AGENT PROMPT

> **Nasıl Kullanılır?**
> Bu dosyanın içeriğini kopyalayıp projenin bulunduğu klasörde çalışan herhangi bir AI Ajanına (ChatGPT, Claude, Cursor, Antigravity vb.) doğrudan yapıştırabilirsiniz. Ajan mevcut projeyi anlayacak ve Adım 2'yi kusursuz şekilde uygulayacaktır.

---

```markdown
Sen uzman bir Full-Stack Web Geliştiricisi ve Satranç Algoritmaları Uzmanısın.
Açık kaynaklı, ücretsiz ve tamamen tarayıcı tabanlı (client-side) Chess.com / Lichess tarzı Satranç Oyun İnceleme (Game Review) projemizde çalışıyoruz.

### 📌 PROJE MEVCUT DURUMU (ADIM 1 TAMAMLANDI)
Projenin 1. Adımı tamamlanmış ve GitHub deposunda hazırdır:
- **Teknoloji Yığını:** Vite + React + TypeScript + Tailwind CSS
- **Kurulu Kütüphaneler:**
  - `chess.js` (Satranç kuralları, FEN, PGN ayrıştırıcı)
  - `react-chessboard` (Satranç tahtası UI)
  - `lucide-react` (İkonlar)
  - `clsx` & `tailwind-merge`
- **Tasarım & Tema Yapılandırması (`tailwind.config.js`):**
  - Satranç koyu teması: `bg-chess-dark (#161512)`, `bg-chess-card (#262421)`, `bg-chess-surface (#1f1e1b)`, `border-chess-border (#363431)`, `text-chess-accent (#81b64c)`.
  - Hamle rozet renkleri: `chess-brilliant (#26c2a3)`, `chess-great (#5c8bb0)`, `chess-best (#81b64c)`, `chess-excellent (#96bc4b)`, `chess-inaccuracy (#f0c15c)`, `chess-mistake (#e6912c)`, `chess-blunder (#fa412d)`.
- **Tip Tanımlamaları:** `src/types/chess.ts` dosyası mevcuttur (`MoveClassification`, `MoveAnalysis`, `GameMetadata`, `ChessComGameSummary`).

---

### 🎯 GÖREVİN: ADIM 2 - VERİ GİRİŞ EKRANI (LANDING PAGE) GELİŞTİRİLMESİ

Kullanıcıların maçlarını analiz moduna aktarabilmeleri için modern, şık ve responsive bir karşılama ekranı (Landing Page) kodlamalısın.

#### İstenen Özellikler ve Dosyalar:

1. **`src/lib/chessComApi.ts`**:
   - Chess.com Public API'sini kullanarak verilen kullanıcı adının oyun arşivlerini çek:
     - `https://api.chess.com/pub/player/{username}/games/archives` adresine GET isteği at.
     - Dönen arşiv listesinin en son ayına (son elemanına) git ve o ayın maçlarını çek (`.../games/YYYY/MM`).
     - Gelen maç listesinden **son 10 maçı** filtrele ve tarihe göre yeniden eskiye sırala.
     - Eğer son ayda 10'dan az maç varsa bir önceki ayın arşivine de bakıp 10 maça tamamla.
     - Her maç için: Beyaz/Siyah kullanıcı adı, rating'leri, kazanan/kaybeden sonucu, süre kontrolü (Blitz, Rapid, Bullet, Daily) ve PGN içeriğini `ChessComGameSummary` tipine dönüştür.
     - Hata yönetimi yap (Kullanıcı bulunamadı, maç bulunamadı, ağ hatası).

2. **`src/lib/chessUtils.ts`**:
   - `chess.js` kütüphanesini kullanarak PGN doğrulama fonksiyonu (`validatePgn(pgn: string): boolean`).
   - PGN başlıklarını (`[White "Kasparov"]`, `[Black "Topalov"]`, `[Result "1-0"]`, `[Date "1999.01.20"]` vb.) ayrıştırıp `GameMetadata` objesi üreten fonksiyon (`parsePgnMetadata(pgn: string): GameMetadata`).
   - Hızlı test için hazır ikonik bir örnek PGN sun (Örnek: Garry Kasparov vs Veselin Topalov 1999 "Kasparov's Immortal").

3. **`src/components/landing/PgnInputCard.tsx`**:
   - Geniş ve modern bir metin alanı (textarea) içeren PGN yapıştırma kartı.
   - "Örnek Maç Yükle (Kasparov vs Topalov)" butonu (kullanıcı tek tıkla test edebilsin).
   - "Analizi Başlat" butonu (geçersiz PGN girildiğinde hata mesajı gösteren doğrulama ile).
   - Temizle butonu ve karakter sayacı.

4. **`src/components/landing/ChessComImporter.tsx`**:
   - Kullanıcı adı giriş alanı ve "Maçları Getir" butonu.
   - Yükleme esnasında modern Spinner / Skeleton loading durumu.
   - Kullanıcının son 10 maçını listeleyen modern kartlar:
     - Zaman kontrolü rozeti (Örn: ⚡ 3+0 Blitz, ⏱️ 10+0 Rapid)
     - Oyuncuların isimleri, reytingleri ve kazanma/kaybetme renk göstergeleri (Yeşil / Kırmızı / Gri)
     - "İncele" (Review) butonu: Tıklandığında o maçın PGN'i doğrudan analize aktarılır.
   - Hata ve boş durum (Empty State) mesajları.

5. **`src/components/landing/LandingPage.tsx`**:
   - Şık bir Hero başlığı: "Ücretsiz & Sınırsız Satranç Oyun Analizi"
   - Alt başlık: "Chess.com Game Review kalitesinde, tamamen tarayıcınızda çalışan, Stockfish destekli ücretsiz analiz aracı."
   - İki seçeneği (PGN Yapıştır vs Chess.com Hesabı) sekmeler (tabs) veya yan yana iki modern kart olarak sunan yapı.
   - Özellikler bölümü (Hızlı badge'ler: ⚡ %100 Ücretsiz, 🔒 Sıfır Sunucu Kaydı, 🧠 Stockfish Destekli).

6. **`src/App.tsx` Entegrasyonu**:
   - State yönetimi:
     - `currentPgn: string | null`
     - `gameMetadata: GameMetadata | null`
     - `viewMode: 'landing' | 'analysis'`
   - Landing page'de bir maç seçildiğinde veya PGN girildiğinde `currentPgn` ve `gameMetadata` state'e yazılmalı ve geçici olarak "Adım 3'e aktarılmaya hazır" başarı bildirim ekranı veya basit önizleme gösterilmelidir.

---

### 🎨 TASARIM KURALLARI:
- Mutlaka `tailwind.config.js` içindeki `chess-*` renklerini ve Tailwind sınıflarını kullan.
- Butonlarda ve kartlarda modern hover animasyonları (`transition-all duration-200 hover:scale-[1.01] hover:border-chess-accent`) ekle.
- `lucide-react` ikonlarını bolca ve estetik kullan (`Swords`, `Download`, `User`, `Clock`, `Sparkles`, `AlertCircle`, `CheckCircle` vb.).
- Kodların TypeScript tip güvenliğine tam uyumlu olmasını sağla ve `npm run build` ile hatasız derlendiğini doğrula.
```
