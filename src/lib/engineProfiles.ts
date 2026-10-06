export type EngineProfileId = 'stockfish-16' | 'torch-tactical' | 'master-deep' | 'fast-scan';

export interface EngineProfile {
  id: EngineProfileId;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  defaultDepth: number;
  tacticalBoost: boolean;
  badgeColor: string;
}

export const ENGINE_PROFILES: Record<EngineProfileId, EngineProfile> = {
  'stockfish-16': {
    id: 'stockfish-16',
    name: 'Stockfish 16 NNUE',
    shortName: 'Stockfish 16',
    tagline: 'Hibrit Cloud + WASM Sinir Ağı',
    description: 'Dünya şampiyonu Stockfish 16 motoru. Lichess bulut veri tabanı ile 40+ derinlik, yerel WASM ile derin pozisyonel değerlendirme.',
    defaultDepth: 13,
    tacticalBoost: false,
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  },
  'torch-tactical': {
    id: 'torch-tactical',
    name: 'Torch Taktiksel Motor',
    shortName: 'Torch Tactical',
    tagline: 'Agresif Feda & Taktik Avcısı',
    description: 'Taktiksel gerilim ve şah hücumlarını özel quiescence derinliği ile analiz eden, fedaları ve gizli taktikleri önceleyen agresif motor profili.',
    defaultDepth: 15,
    tacticalBoost: true,
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  'master-deep': {
    id: 'master-deep',
    name: 'GM Usta Seviyesi Derinlik',
    shortName: 'GM Master',
    tagline: 'Turnuva Kalitesinde 16-18 Derinlik',
    description: 'Büyük usta seviyesinde maksimum hassasiyet. Her pozisyon için derin taktiksel arama ve sıfır hata payı.',
    defaultDepth: 17,
    tacticalBoost: true,
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  },
  'fast-scan': {
    id: 'fast-scan',
    name: 'Hızlı İnceleme',
    shortName: 'Hızlı Tarama',
    tagline: 'Saniyeler İçinde Hızlı Önizleme',
    description: 'Oyunun genel gidişatını, büyük gafları ve kırılma anını saniyeler içinde tespit eden yüksek hızlı tarama modu.',
    defaultDepth: 10,
    tacticalBoost: false,
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
};
