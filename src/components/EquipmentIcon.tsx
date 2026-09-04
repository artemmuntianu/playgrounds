import React from 'react';
import type { EquipmentTypeId } from '../types/playground';
import { getEquipmentIcon } from '../lib/equipment';

interface EquipmentIconProps {
  type: EquipmentTypeId;
  size?: number;
  className?: string;
  title?: string;
}

/** Render the cropped icon for an equipment type. */
export const EquipmentIcon: React.FC<EquipmentIconProps> = ({
  type,
  size = 20,
  className = '',
  title,
}) => {
  return (
    <img
      src={getEquipmentIcon(type)}
      alt={title || ''}
      width={size}
      height={size}
      className={`inline-block object-contain align-middle shrink-0 ${className}`}
      loading="lazy"
    />
  );
};
