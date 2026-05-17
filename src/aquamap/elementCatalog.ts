import type { ElementType } from './types';

export const ALL_AQUAMAP_ELEMENT_TYPES: ElementType[] = [
  'pool',
  'slide',
  'service',
  'tree',
  'mesa',
  'parking',
  'palapa',
  'entrada',
  'area',
  'bar',
  'camino',
  'banos'
];

export const ELEMENT_LABELS: Record<ElementType, string> = {
  pool: 'Alberca',
  slide: 'Tobogán',
  service: 'Servicio',
  tree: 'Árbol',
  mesa: 'Mesa',
  parking: 'Cajón',
  palapa: 'Palapa',
  entrada: 'Entrada',
  area: 'Zona',
  bar: 'Bar / comida',
  camino: 'Camino',
  banos: 'Baños'
};

export const ELEMENT_COLORS: Record<ElementType, string> = {
  pool: '#0ea5e9',
  slide: '#f97316',
  service: '#a855f7',
  tree: '#22c55e',
  mesa: '#10b981',
  parking: '#f59e0b',
  palapa: '#84cc16',
  entrada: '#22c55e',
  area: '#14b8a6',
  bar: '#f97316',
  camino: '#64748b',
  banos: '#38bdf8'
};

export const ELEMENT_PRESET_SIZES: Record<ElementType, { width: number; height: number }> = {
  pool: { width: 240, height: 200 },
  slide: { width: 160, height: 130 },
  service: { width: 180, height: 150 },
  tree: { width: 96, height: 110 },
  mesa: { width: 112, height: 96 },
  parking: { width: 88, height: 108 },
  palapa: { width: 200, height: 160 },
  entrada: { width: 140, height: 72 },
  area: { width: 220, height: 160 },
  bar: { width: 160, height: 120 },
  camino: { width: 280, height: 56 },
  banos: { width: 120, height: 100 }
};

/** Lienzo Konva: formas vectoriales en lugar de PNG/SVG externos. */
export const ELEMENT_NATIVE_SHAPE: Partial<Record<ElementType, 'ellipse' | 'zone' | 'path' | 'entrance' | 'building'>> = {
  palapa: 'ellipse',
  entrada: 'entrance',
  area: 'zone',
  bar: 'building',
  camino: 'path',
  banos: 'building'
};

export function elementUsesNativeShape(type: ElementType): boolean {
  return type in ELEMENT_NATIVE_SHAPE;
}

export const ELEMENT_FILTER_ID: Record<ElementType, string> = {
  pool: 'piscinas',
  slide: 'toboganes',
  service: 'servicios',
  tree: 'areas',
  mesa: 'mesas',
  parking: 'estacionamiento',
  palapa: 'zonas',
  entrada: 'accesos',
  area: 'zonas',
  bar: 'servicios',
  camino: 'accesos',
  banos: 'servicios'
};

export const FILTER_LABELS: Record<string, string> = {
  all: 'Todo',
  piscinas: 'Albercas',
  toboganes: 'Toboganes',
  servicios: 'Servicios',
  areas: 'Árboles',
  mesas: 'Mesas',
  estacionamiento: 'Estacionamiento',
  zonas: 'Zonas',
  accesos: 'Accesos'
};
