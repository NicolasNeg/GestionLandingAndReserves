import type { ElementType } from './types';

const SPRITE_FILE: Partial<Record<ElementType, string>> = {
  mesa: 'service',
  parking: 'service'
};

export function defaultSpriteForType(type: ElementType): string {
  const file = SPRITE_FILE[type] ?? type;
  return `/aquamap-icons/${file}.svg`;
}
