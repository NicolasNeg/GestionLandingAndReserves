import type { ElementType, MapElement } from './types';
import { nanoid } from 'nanoid';
import { defaultSpriteForType } from './spriteUrls';
import { AQUAMAP_WORLD_H, AQUAMAP_WORLD_W } from './world';

const LABELS: Record<ElementType, string> = {
  pool: 'Alberca',
  slide: 'Tobogán',
  service: 'Servicio',
  tree: 'Árbol'
};

const COLORS: Record<ElementType, string> = {
  pool: '#0ea5e9',
  slide: '#f97316',
  service: '#a855f7',
  tree: '#22c55e'
};

export function createMapElement(type: ElementType): MapElement {
  const id = nanoid();
  const cx = AQUAMAP_WORLD_W / 2;
  const cy = AQUAMAP_WORLD_H / 2;
  const spread = 120;
  return {
    id,
    type,
    name: LABELS[type],
    description: '',
    x: cx - 65 + (Math.random() - 0.5) * spread,
    y: cy - 54 + (Math.random() - 0.5) * spread,
    width: 130,
    height: 108,
    color: COLORS[type],
    imgSrc: defaultSpriteForType(type)
  };
}
