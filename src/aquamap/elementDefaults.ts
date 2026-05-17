import { nanoid } from 'nanoid';
import {
  ELEMENT_COLORS,
  ELEMENT_LABELS,
  ELEMENT_PRESET_SIZES
} from './elementCatalog';
import { normalizeParkingStatus } from './parkingYardAssets';
import type { ElementType, MapElement } from './types';
import { defaultSpriteForType } from './spriteUrls';
import { AQUAMAP_WORLD_H, AQUAMAP_WORLD_W } from './world';

export { ELEMENT_LABELS as ELEMENT_TYPE_LABELS };

/** Tamaños por defecto al crear (px en coordenadas del mundo). */
export const PRESET_SIZE_BY_TYPE = ELEMENT_PRESET_SIZES;

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
    name: ELEMENT_LABELS[type],
    description: '',
    x: cx - width / 2 + (Math.random() - 0.5) * spread,
    y: cy - height / 2 + (Math.random() - 0.5) * spread,
    width,
    height,
    color: ELEMENT_COLORS[type],
    imgSrc: defaultSpriteForType(type)
  };
  if (type === 'parking') {
    base.parkingStatus = normalizeParkingStatus('libre');
  }
  return base;
}
