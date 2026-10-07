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
  'fast-scan': {
    id: 'fast-scan',
    name: 'Hızlı İnceleme (FAST)',
    shortName: 'FAST (Derinlik 14)',
    tagline: 'Saniyeler İçinde Hızlı Önizleme (Derinlik 14)',
    description: 'Mobil ve hızlı incelemeler için optimize edilmiş hafif Stockfish 16 NNUE analizi.',
    defaultDepth: 14,
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    isFast: true,
  },
  'stockfish-16': {
    id: 'stockfish-16',
    name: 'Stockfish 16 NNUE (NORMAL)',
    shortName: 'NORMAL (Derinlik 18)',
    tagline: 'Dengeli & Güvenilir Turnuva Analizi (Derinlik 18)',
    description: 'Dünya şampiyonu Stockfish 16 NNUE motoru ile hassas, konumsal ve taktiksel tam oyun incelemesi.',
    defaultDepth: 18,
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  },
  'tactical-depth': {
    id: 'tactical-depth',
    name: 'Taktiksel Derinlik Modu',
    shortName: 'Taktiksel (Derinlik 16)',
    tagline: 'Taktiksel Arama & Fedalar (Derinlik 16)',
    description: 'Şah hücumları, taş fedaları ve kritik varyantları yakalamak için 16 ply derinliğe ulaşan yüksek taktiksel hassasiyet.',
    defaultDepth: 16,
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  'master-deep': {
    id: 'master-deep',
    name: 'GM Usta Seviyesi Analiz (DEEP)',
    shortName: 'DEEP (Derinlik 22)',
    tagline: 'Büyük Usta Kalitesinde 22+ Derinlik',
    description: 'Büyük usta seviyesinde maksimum hesaplama derinliği. Her pozisyon için derin yerel Stockfish araması.',
    defaultDepth: 22,
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  },
};
