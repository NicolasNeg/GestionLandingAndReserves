import type { ElementType } from './types';

/** Tipos soportados por el lienzo Konva (biblioteca completa del parque). */
export const ALL_AQUAMAP_ELEMENT_TYPES: ElementType[] = [
  'pool',
  'slide',
  'service',
  'tree',
  'mesa',
  'parking'
];

export type MapLayerContext = 'parque' | 'mesas' | 'estacionamiento' | 'albercas';

export type LayerUiConfig = {
  id: MapLayerContext;
  label: string;
  shortHint: string;
  allowedTypes: ElementType[];
};

export const MAP_LAYER_CONFIG: Record<MapLayerContext, LayerUiConfig> = {
  parque: {
    id: 'parque',
    label: 'Parque global',
    shortHint: 'Todas las piezas del plano público: albercas, toboganes, mesas, parking y más.',
    allowedTypes: [...ALL_AQUAMAP_ELEMENT_TYPES]
  },
  mesas: {
    id: 'mesas',
    label: 'Mesas',
    shortHint: 'Mesas reservables para /reservar.',
    allowedTypes: ['mesa']
  },
  estacionamiento: {
    id: 'estacionamiento',
    label: 'Estacionamiento',
    shortHint:
      'Solo cajones de parking en este modo (distinto del mapa global). Posiciónalo sobre el plano del parque.',
    allowedTypes: ['parking']
  },
  albercas: {
    id: 'albercas',
    label: 'Albercas',
    shortHint: 'Zonas acuáticas; también servicios y árboles de contexto.',
    allowedTypes: ['pool', 'slide', 'service', 'tree']
  }
};

export function normalizeMapLayerContext(raw: string | null | undefined): MapLayerContext {
  const k = String(raw || 'parque').toLowerCase();
  if (k === 'mesas' || k === 'estacionamiento' || k === 'albercas') return k;
  return 'parque';
}
