import { nanoid } from 'nanoid';
import { normalizeParkingStatus } from './parkingYardAssets';
import type { ElementType, MapElement } from './types';
import { defaultSpriteForType } from './spriteUrls';
import { AQUAMAP_WORLD_H, AQUAMAP_WORLD_W } from './world';

const LABELS: Record<ElementType, string> = {
  pool: 'Alberca',
  slide: 'Tobogán',
  service: 'Servicio',
  tree: 'Árbol',
  mesa: 'Mesa',
  parking: 'Cajón'
};

const COLORS: Record<ElementType, string> = {
  pool: '#0ea5e9',
  slide: '#f97316',
  service: '#a855f7',
  tree: '#22c55e',
  mesa: '#10b981',
  parking: '#f59e0b'
};

/** Tamaños por defecto al crear (px en coordenadas del mundo). */
export const PRESET_SIZE_BY_TYPE: Record<ElementType, { width: number; height: number }> = {
  pool: { width: 240, height: 200 },
  slide: { width: 160, height: 130 },
  service: { width: 180, height: 150 },
  tree: { width: 96, height: 110 },
  mesa: { width: 112, height: 96 },
  /** Cajón vertical (vista cenital del patio). */
  parking: { width: 88, height: 108 }
};

export function presetSizeForType(type: ElementType): { width: number; height: number } {
  return { ...PRESET_SIZE_BY_TYPE[type] };
}

/** Evita anchos absurdos (p. ej. ancho del documento legacy guardado en una pieza). */
export function clampElementDimensions(
  el: Pick<MapElement, 'type' | 'width' | 'height'>,
  world: { w: number; h: number }
): { width: number; height: number } {
  const preset = presetSizeForType(el.type);
  let width = Number(el.width);
  let height = Number(el.height);
  if (!Number.isFinite(width) || width < 16) width = preset.width;
  if (!Number.isFinite(height) || height < 16) height = preset.height;
  const maxW = Math.max(200, world.w * 0.55);
  const maxH = Math.max(160, world.h * 0.55);
  if (width > maxW) width = preset.width;
  if (height > maxH) height = preset.height;
  return {
    width: Math.round(Math.min(maxW, Math.max(16, width))),
    height: Math.round(Math.min(maxH, Math.max(16, height)))
  };
}

export function createMapElement(
  type: ElementType,
  world?: { w: number; h: number }
): MapElement {
  const id = nanoid();
  const W = world?.w ?? AQUAMAP_WORLD_W;
  const H = world?.h ?? AQUAMAP_WORLD_H;
  const cx = W / 2;
  const cy = H / 2;
  const spread = 120;
  const { width, height } = presetSizeForType(type);
  const base: MapElement = {
    id,
    type,
    name: LABELS[type],
    description: '',
    x: cx - width / 2 + (Math.random() - 0.5) * spread,
    y: cy - height / 2 + (Math.random() - 0.5) * spread,
    width,
    height,
    color: COLORS[type],
    imgSrc: defaultSpriteForType(type)
  };
  if (type === 'parking') {
    base.parkingStatus = normalizeParkingStatus('libre');
  }
  return base;
}
