import type { ElementType } from './types';

export function defaultSpriteForType(type: ElementType): string {
  return `/aquamap-icons/${type}.svg`;
}
