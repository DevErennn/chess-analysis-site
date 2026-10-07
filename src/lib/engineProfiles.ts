export type EngineProfileId = 'stockfish-16' | 'tactical-depth' | 'master-deep' | 'fast-scan';

export interface EngineProfile {
  id: EngineProfileId;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  defaultDepth: number;
  badgeColor: string;
  isFast?: boolean;
}

export const ENGINE_PROFILES: Record<EngineProfileId, EngineProfile> = {
  'stockfish-16': {
    id: 'stockfish-16',
    name: 'Stockfish 16 NNUE (Standart)',
    shortName: 'Stockfish 16',
    tagline: 'Dengeli & Güvenilir Analiz (Derinlik 11)',
    description: 'Dünya şampiyonu Stockfish 16 sinir ağı (NNUE) motoru. Konumsal ve taktiksel dengeli derinlikte tutarlı oyun incelemesi.',
    defaultDepth: 11,
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  },
  'tactical-depth': {
    id: 'tactical-depth',
    name: 'Taktiksel Derinlik Modu',
    shortName: 'Taktiksel Mod',
    tagline: 'Taktiksel Arama & Fedalar (Derinlik 16)',
    description: 'Şah hücumları, taş fedaları ve kritik varyantları yakalamak için 16 ply derinliğe ulaşan yüksek taktiksel hassasiyet.',
    defaultDepth: 16,
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  'master-deep': {
    id: 'master-deep',
    name: 'GM Usta Seviyesi Analiz',
    shortName: 'GM Master',
    tagline: 'Turnuva Kalitesinde 18 Derinlik',
    description: 'Büyük usta seviyesinde maksimum hassasiyet. Her pozisyon için derin yerel Stockfish araması ve en düşük hata payı.',
    defaultDepth: 18,
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  },
  'fast-scan': {
    id: 'fast-scan',
    name: 'Hızlı İnceleme (Düşük Derinlik)',
    shortName: 'Hızlı Tarama',
    tagline: 'Saniyeler İçinde Hızlı Önizleme (Derinlik 10)',
    description: 'Oyunun genel seyrini ve büyük gafları saniyeler içinde tespit eden hızlı tarama modu (Düşük derinlik nedeniyle gürültü içerebilir).',
    defaultDepth: 10,
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    isFast: true,
  },
};
