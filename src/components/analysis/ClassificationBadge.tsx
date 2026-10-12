import React from 'react';
import type { MoveClassification } from '../../types/chess';
import { CLASSIFICATION_CONFIG } from './constants';

interface ClassificationBadgeProps {
  classification?: MoveClassification;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ClassificationBadge: React.FC<ClassificationBadgeProps> = ({
  classification,
  showText = true,
  size = 'md',
  className = '',
}) => {
  if (!classification || !CLASSIFICATION_CONFIG[classification]) return null;

  const config = CLASSIFICATION_CONFIG[classification];

  const px = {
    sm: 15,
    md: 18,
    lg: 22,
  }[size];

  if (!showText) {
    return (
      <img
        src={config.image}
        alt={config.label}
        title={`${config.label} (${config.symbol})`}
        style={{ width: `${px}px`, height: `${px}px` }}
        className={`object-contain inline-block shrink-0 drop-shadow-sm select-none ${className}`}
      />
    );
  }

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1.5',
    md: 'px-2 py-0.5 text-xs gap-1.5',
    lg: 'px-2.5 py-1 text-xs gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-bold rounded-lg border ${config.bgColor} ${config.borderColor} ${config.textColor} ${sizeClasses} ${className}`}
      title={`${config.label} (${config.symbol})`}
    >
      <img
        src={config.image}
        alt={config.label}
        style={{ width: `${px}px`, height: `${px}px` }}
        className="object-contain shrink-0 drop-shadow-sm select-none"
      />
      <span>{config.label}</span>
      <span className="font-mono text-[10px] opacity-75">({config.symbol})</span>
    </span>
  );
};
