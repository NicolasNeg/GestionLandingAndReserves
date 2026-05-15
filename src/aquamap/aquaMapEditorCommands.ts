import { nanoid } from 'nanoid';
import type { MapElement } from './types';

export function duplicateElement(el: MapElement, offset = 28): MapElement {
  const suffix = el.name.trim() ? ' (copia)' : '';
  return {
    ...el,
    id: nanoid(),
    x: Math.round(el.x + offset),
    y: Math.round(el.y + offset),
    name: `${el.name}${suffix}`.slice(0, 160)
  };
}

export function pasteFromClipboard(
  clip: MapElement,
  world: { w: number; h: number },
  at?: { x: number; y: number }
): MapElement {
  const suffix = clip.name.trim() ? ' (pegado)' : '';
  const x = at?.x ?? clip.x + 28;
  const y = at?.y ?? clip.y + 28;
  return {
    ...clip,
    id: nanoid(),
    x: Math.max(0, Math.min(world.w - clip.width, Math.round(x))),
    y: Math.max(0, Math.min(world.h - clip.height, Math.round(y))),
    name: `${clip.name}${suffix}`.slice(0, 160)
  };
}

export function bringElementToFront(el: MapElement, all: MapElement[]): MapElement {
  const maxY = all.reduce((m, e) => Math.max(m, e.y + e.height), 0);
  return { ...el, y: Math.round(maxY + 4) };
}

export function sendElementToBack(el: MapElement, all: MapElement[]): MapElement {
  const minY = all.reduce((m, e) => Math.min(m, e.y), el.y);
  return { ...el, y: Math.round(Math.max(0, minY - 4)) };
}

export function nudgeElement(
  el: MapElement,
  dx: number,
  dy: number,
  world: { w: number; h: number }
): MapElement {
  return {
    ...el,
    x: Math.max(0, Math.min(world.w - el.width, Math.round(el.x + dx))),
    y: Math.max(0, Math.min(world.h - el.height, Math.round(el.y + dy)))
  };
}
