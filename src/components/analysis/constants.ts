import React from 'react';
import type { MoveClassification } from '../../types/chess';
import { Sparkles, Star, CheckCircle, ThumbsUp, AlertTriangle, AlertCircle, XCircle, BookOpen } from 'lucide-react';

export const CLASSIFICATION_CONFIG: Record<
  MoveClassification,
  {
    label: string;
    symbol: string;
    color: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    icon: React.ComponentType<{ className?: string }>;
    image: string;
  }
> = {
  brilliant: {
    label: 'Brilliant',
    symbol: '!!',
    color: '#26c2a3',
    bgColor: 'bg-teal-500/20',
    borderColor: 'border-teal-400/40',
    textColor: 'text-teal-400',
    icon: Sparkles,
    image: '/brilliant.png',
  },
  great: {
    label: 'Harika',
    symbol: '!',
    color: '#5c8bb0',
    bgColor: 'bg-sky-500/20',
    borderColor: 'border-sky-400/40',
    textColor: 'text-sky-400',
    icon: Star,
    image: '/great.png',
  },
  best: {
    label: 'En İyi',
    symbol: '⭐',
    color: '#81b64c',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-400/40',
    textColor: 'text-emerald-400',
    icon: Star,
    image: '/best.png',
  },
  excellent: {
    label: 'Mükemmel',
    symbol: '✅',
    color: '#96bc4b',
    bgColor: 'bg-lime-500/20',
    borderColor: 'border-lime-400/40',
    textColor: 'text-lime-400',
    icon: CheckCircle,
    image: '/excellent.png',
  },
  good: {
    label: 'İyi',
    symbol: '👍',
    color: '#a88865',
    bgColor: 'bg-stone-500/20',
    borderColor: 'border-stone-400/40',
    textColor: 'text-stone-300',
    icon: ThumbsUp,
    image: '/good.png',
  },
  book: {
    label: 'Kitap',
    symbol: '📖',
    color: '#a88865',
    bgColor: 'bg-amber-900/20',
    borderColor: 'border-amber-700/40',
    textColor: 'text-amber-300',
    icon: BookOpen,
    image: '/book.png',
  },
  inaccuracy: {
    label: 'Şüpheli',
    symbol: '?!',
    color: '#f0c15c',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-400/40',
    textColor: 'text-amber-400',
    icon: AlertTriangle,
    image: '/inaccuracy.png',
  },
  mistake: {
    label: 'Hata',
    symbol: '?',
    color: '#e6912c',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-400/40',
    textColor: 'text-orange-400',
    icon: AlertCircle,
    image: '/mistake.png',
  },
  miss: {
    label: 'Kaçırma',
    symbol: '❌',
    color: '#ee5656',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-400/40',
    textColor: 'text-red-400',
    icon: XCircle,
    image: '/miss.png',
  },
  blunder: {
    label: 'Büyük Hata',
    symbol: '??',
    color: '#fa412d',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-400/50',
    textColor: 'text-red-400',
    icon: XCircle,
    image: '/blunder.png',
  },
};
