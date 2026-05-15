import type { ElementType, MapElement } from './types';

const TYPE_TO_FILTER: Record<ElementType, string> = {
  pool: 'piscinas',
  slide: 'toboganes',
  service: 'servicios',
  tree: 'areas',
  mesa: 'mesas',
  parking: 'estacionamiento'
};

const FILTER_LABELS: Record<string, string> = {
  all: 'Todo',
  piscinas: 'Albercas',
  toboganes: 'Toboganes',
  servicios: 'Servicios',
  areas: 'Áreas verdes',
  mesas: 'Mesas',
  estacionamiento: 'Estacionamiento'
};

export function filterIdForElement(el: MapElement): string {
  return TYPE_TO_FILTER[el.type] || 'otros';
}

export function buildAquamapFilterChips(elements: MapElement[]): { id: string; label: string }[] {
  const seen = new Set<string>();
  for (const el of elements) seen.add(filterIdForElement(el));
  const chips = [{ id: 'all', label: 'Todo' }];
  for (const id of [...seen].sort()) {
    chips.push({ id, label: FILTER_LABELS[id] || id });
  }
  return chips;
}

export function elementMatchesAquamapFilter(el: MapElement, filterId: string): boolean {
  if (!filterId || filterId === 'all') return true;
  return filterIdForElement(el) === filterId;
}

/** Ruta simple hacia el elemento (entrada → zona). */
export function simpleRouteToElement(
  el: MapElement,
  world: { w: number; h: number }
): { x: number; y: number }[] {
  const tx = Math.round(el.x + el.width / 2);
  const ty = Math.round(el.y + el.height / 2);
  const entry = { x: Math.round(world.w * 0.5), y: Math.round(world.h * 0.88) };
  const mid = { x: Math.round((entry.x + tx) / 2), y: Math.round((entry.y + ty) / 2 - 40) };
  return [entry, mid, { x: tx, y: ty }];
}
