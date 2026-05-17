import { presetSizeForType } from './elementDefaults';
import type { MapElement } from './types';
import { AQUAMAP_ISLAND_MARGIN } from './world';

const SPOT_GAP = 12;
const GRID_STEP = 9;

export function normalizeParkingSpotCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function findParkingSpotByCode(
  elements: MapElement[],
  code: string,
  excludeId?: string | null
): MapElement | null {
  const needle = normalizeParkingSpotCode(code);
  if (!needle) return null;
  return (
    elements.find(
      (e) =>
        e.type === 'parking' &&
        e.id !== excludeId &&
        normalizeParkingSpotCode(e.name || '') === needle
    ) ?? null
  );
}

/** Centro vertical de la franja rayada del patio (coincide con ParkingYardBackdrop). */
export function parkingBandCenterY(worldH: number, spotHeight: number): number {
  const m = AQUAMAP_ISLAND_MARGIN;
  const ih = worldH - m * 2;
  const bandH = ih * 0.38;
  const bandY = m + (ih - bandH) / 2;
  return Math.round(bandY + bandH / 2 - spotHeight / 2);
}

/** Siguiente posición en fila horizontal (estilo P1, P2… del sandbox). */
export function computeNextParkingSpotPlacement(
  elements: MapElement[],
  world: { w: number; h: number }
): { x: number; y: number } {
  const { width, height } = presetSizeForType('parking');
  const m = AQUAMAP_ISLAND_MARGIN;
  const y = parkingBandCenterY(world.h, height);
  const spots = elements.filter((e) => e.type === 'parking');
  if (!spots.length) {
    return { x: m + 40, y };
  }
  const rightmost = spots.reduce((best, el) => {
    const right = el.x + el.width;
    return right > best ? right : best;
  }, m + 28);
  const x = Math.round(rightmost + SPOT_GAP);
  const maxX = world.w - m - width - 8;
  if (x > maxX) {
    return {
      x: m + 40,
      y: Math.min(world.h - m - height - 8, y + height + SPOT_GAP)
    };
  }
  return { x, y };
}

export function snapParkingCoord(n: number): number {
  return Math.round(n / GRID_STEP) * GRID_STEP;
}

export function snapParkingGeometry(geom: {
  x: number;
  y: number;
  width: number;
  height: number;
}): typeof geom {
  return {
    ...geom,
    x: snapParkingCoord(geom.x),
    y: snapParkingCoord(geom.y)
  };
}
