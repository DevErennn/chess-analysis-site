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
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    md: 'px-2 py-0.5 text-xs gap-1.5',
    lg: 'px-3 py-1 text-sm gap-2',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-bold rounded-md border ${config.bgColor} ${config.borderColor} ${config.textColor} ${sizeClasses} ${className}`}
      title={config.label}
    >
      <Icon className={iconSizes} />
      <span className="font-mono">{config.symbol}</span>
      {showText && <span>{config.label}</span>}
    </span>
  );
};
