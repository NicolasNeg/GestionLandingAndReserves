import { ALL_AQUAMAP_ELEMENT_TYPES } from './elementCatalog';
import type { ElementType } from './types';

export { ALL_AQUAMAP_ELEMENT_TYPES };

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
    shortHint:
      'Plano completo: albercas, palapas, mesas, servicios, accesos, zonas y cajones de estacionamiento.',
    allowedTypes: [...ALL_AQUAMAP_ELEMENT_TYPES]
  },
  mesas: {
    id: 'mesas',
    label: 'Mesas',
    shortHint: 'Mesas reservables y contexto (palapas, árboles, zonas).',
    allowedTypes: ['mesa', 'palapa', 'tree', 'area', 'camino', 'entrada']
  },
  estacionamiento: {
    id: 'estacionamiento',
    label: 'Plano estacionamiento',
    shortHint:
      'Solo diseño del plano para la landing (#estacionamiento): cajones, entradas y zonas. La operación diaria (mover unidades) está en Gestión → Patio operativo.',
    allowedTypes: ['parking', 'entrada', 'area', 'camino', 'service']
  },
  albercas: {
    id: 'albercas',
    label: 'Albercas',
    shortHint: 'Zonas acuáticas, palapas, servicios y áreas de sombra.',
    allowedTypes: ['pool', 'slide', 'service', 'tree', 'palapa', 'area', 'banos', 'bar']
  }
};

export function normalizeMapLayerContext(raw: string | null | undefined): MapLayerContext {
  const k = String(raw || 'parque').toLowerCase();
  if (k === 'mesas' || k === 'estacionamiento' || k === 'albercas') return k;
  return 'parque';
}
