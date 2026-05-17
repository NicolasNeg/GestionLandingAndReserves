import type { MapElement, ParkingSpotStatus } from './types';
import { normalizeParkingStatus } from './parkingYardAssets';

export type ParkingSpotCounts = {
  total: number;
  libre: number;
  reservado: number;
  ocupado: number;
  mantenimiento: number;
};

export function countParkingSpots(elements: MapElement[]): ParkingSpotCounts {
  const spots = elements.filter((e) => e.type === 'parking');
  const counts: ParkingSpotCounts = {
    total: spots.length,
    libre: 0,
    reservado: 0,
    ocupado: 0,
    mantenimiento: 0
  };
  for (const el of spots) {
    const st = normalizeParkingStatus(el.parkingStatus) as ParkingSpotStatus;
    counts[st] += 1;
  }
  return counts;
}
