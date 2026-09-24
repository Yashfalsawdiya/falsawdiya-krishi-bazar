import React from 'react';
import { Bike, Truck, Car, Tractor, Package } from 'lucide-react';

interface VehicleIconProps {
  emojiOrType?: string;
  className?: string;
}

export const VehicleIcon: React.FC<VehicleIconProps> = ({ emojiOrType = 'truck', className = 'w-5 h-5 text-emerald-700' }) => {
  const clean = (emojiOrType || '').toLowerCase().trim();

  if (clean === '🛵' || clean.includes('bike') || clean.includes('motorcycle') || clean.includes('scooter') || clean === '🚲') {
    return <Bike className={className} />;
  }

  if (clean === '🚜' || clean.includes('tractor')) {
    return <Tractor className={className} />;
  }

  if (clean === '📦' || clean.includes('package') || clean.includes('box')) {
    return <Package className={className} />;
  }

  if (clean === '🚗' || clean === '🛺' || clean.includes('rickshaw') || clean.includes('auto') || clean.includes('car')) {
    return <Car className={className} />;
  }

  // Default to Truck for pickup, tempo, truck, 🛻, 🚚, 🚛
  return <Truck className={className} />;
};
