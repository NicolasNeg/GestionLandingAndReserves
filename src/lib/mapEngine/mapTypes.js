export const MAP_SCHEMA_VERSION = 2;

export const MAP_VIEWS = {
  GLOBAL: 'global',
  MESAS: 'mesas',
  ESTACIONAMIENTO: 'estacionamiento'
};

export const LEGACY_VIEW_ALIASES = {
  parque: MAP_VIEWS.GLOBAL,
  global: MAP_VIEWS.GLOBAL,
  mesas: MAP_VIEWS.MESAS,
  estacionamiento: MAP_VIEWS.ESTACIONAMIENTO,
  parking: MAP_VIEWS.ESTACIONAMIENTO
};

export const DEFAULT_LAYER_IDS = {
  BASE: 'base',
  AREAS: 'areas',
  MESAS: 'mesas',
  PARKING: 'parking',
  SERVICES: 'servicios',
  NOTES: 'anotaciones'
};

export const MAP_LAYERS = [
  { id: DEFAULT_LAYER_IDS.BASE, name: 'Base', type: 'base', visible: true, locked: true, zIndex: 0 },
  { id: DEFAULT_LAYER_IDS.AREAS, name: 'Areas y zonas', type: 'areas', visible: true, locked: false, zIndex: 10 },
  { id: DEFAULT_LAYER_IDS.MESAS, name: 'Mesas', type: 'tables', visible: true, locked: false, zIndex: 20 },
  { id: DEFAULT_LAYER_IDS.PARKING, name: 'Estacionamiento', type: 'parking', visible: true, locked: false, zIndex: 30 },
  { id: DEFAULT_LAYER_IDS.SERVICES, name: 'Servicios y accesos', type: 'services', visible: true, locked: false, zIndex: 40 },
  { id: DEFAULT_LAYER_IDS.NOTES, name: 'Textos y marcas', type: 'notes', visible: true, locked: false, zIndex: 50 }
];

export const MAP_ITEM_KINDS_V2 = [
  { value: 'area', label: 'Area', type: 'serviceArea', layerId: DEFAULT_LAYER_IDS.AREAS, fill: 'rgba(20, 184, 166, 0.20)', stroke: '#0f766e' },
  { value: 'mesa', label: 'Mesa', type: 'table', layerId: DEFAULT_LAYER_IDS.MESAS, fill: 'rgba(16, 185, 129, 0.26)', stroke: '#047857' },
  { value: 'table', label: 'Mesa redonda', type: 'table', layerId: DEFAULT_LAYER_IDS.MESAS, fill: 'rgba(16, 185, 129, 0.26)', stroke: '#047857' },
  { value: 'estacionamiento', label: 'Cajon estacionamiento', type: 'parkingSpot', layerId: DEFAULT_LAYER_IDS.PARKING, fill: 'rgba(245, 158, 11, 0.18)', stroke: '#b45309' },
  { value: 'parkingSpot', label: 'Cajon parking', type: 'parkingSpot', layerId: DEFAULT_LAYER_IDS.PARKING, fill: 'rgba(245, 158, 11, 0.18)', stroke: '#b45309' },
  { value: 'limitacion', label: 'Zona bloqueada', type: 'rect', layerId: DEFAULT_LAYER_IDS.AREAS, fill: 'rgba(244, 63, 94, 0.12)', stroke: '#be123c', dashed: true },
  { value: 'blockedZone', label: 'Limitacion', type: 'rect', layerId: DEFAULT_LAYER_IDS.AREAS, fill: 'rgba(244, 63, 94, 0.12)', stroke: '#be123c', dashed: true },
  { value: 'alberca', label: 'Alberca', type: 'pool', layerId: DEFAULT_LAYER_IDS.AREAS, fill: 'rgba(14, 165, 233, 0.26)', stroke: '#0369a1' },
  { value: 'pool', label: 'Alberca', type: 'pool', layerId: DEFAULT_LAYER_IDS.AREAS, fill: 'rgba(14, 165, 233, 0.26)', stroke: '#0369a1' },
  { value: 'palapa', label: 'Palapa', type: 'ellipse', layerId: DEFAULT_LAYER_IDS.AREAS, fill: 'rgba(132, 204, 22, 0.22)', stroke: '#4d7c0f' },
  { value: 'servicio', label: 'Servicio', type: 'serviceArea', layerId: DEFAULT_LAYER_IDS.SERVICES, fill: 'rgba(168, 85, 247, 0.18)', stroke: '#7e22ce' },
  { value: 'serviceArea', label: 'Servicio', type: 'serviceArea', layerId: DEFAULT_LAYER_IDS.SERVICES, fill: 'rgba(168, 85, 247, 0.18)', stroke: '#7e22ce' },
  { value: 'entrada', label: 'Entrada / salida', type: 'entrance', layerId: DEFAULT_LAYER_IDS.SERVICES, fill: 'rgba(34, 197, 94, 0.24)', stroke: '#047857' },
  { value: 'entrance', label: 'Entrada / salida', type: 'entrance', layerId: DEFAULT_LAYER_IDS.SERVICES, fill: 'rgba(34, 197, 94, 0.24)', stroke: '#047857' },
  { value: 'rect', label: 'Rectangulo', type: 'rect', layerId: DEFAULT_LAYER_IDS.AREAS, fill: 'rgba(148, 163, 184, 0.22)', stroke: '#475569' },
  { value: 'circle', label: 'Circulo', type: 'ellipse', layerId: DEFAULT_LAYER_IDS.AREAS, fill: 'rgba(59, 130, 246, 0.18)', stroke: '#2563eb' },
  { value: 'ellipse', label: 'Elipse', type: 'ellipse', layerId: DEFAULT_LAYER_IDS.AREAS, fill: 'rgba(59, 130, 246, 0.18)', stroke: '#2563eb' },
  { value: 'polygon', label: 'Poligono', type: 'polygon', layerId: DEFAULT_LAYER_IDS.AREAS, fill: 'rgba(217, 119, 6, 0.18)', stroke: '#b45309' },
  { value: 'line', label: 'Linea', type: 'line', layerId: DEFAULT_LAYER_IDS.NOTES, fill: 'rgba(15, 23, 42, 0)', stroke: '#334155' },
  { value: 'text', label: 'Texto', type: 'text', layerId: DEFAULT_LAYER_IDS.NOTES, fill: '#0f172a', stroke: '#0f172a' },
  { value: 'marker', label: 'Marcador', type: 'marker', layerId: DEFAULT_LAYER_IDS.SERVICES, fill: 'rgba(239, 68, 68, 0.20)', stroke: '#dc2626' },
  { value: 'image', label: 'Imagen / fondo', type: 'image', layerId: DEFAULT_LAYER_IDS.BASE, fill: 'rgba(226, 232, 240, 0.24)', stroke: '#94a3b8' }
];

export const DEFAULT_MAP_ITEM_KIND = 'area';

export const TABLE_STATES = {
  LIBRE: 'libre',
  APARTADA_MIA: 'apartada_mia',
  APARTADA: 'apartada',
  OCUPADA: 'ocupada'
};

export const PARKING_STATES = {
  LIBRE: 'libre',
  RESERVADO: 'reservado',
  OCUPADO: 'ocupado',
  MANTENIMIENTO: 'mantenimiento',
  TALLER: 'taller',
  SUCIO: 'sucio'
};

export const KIND_BY_VALUE = MAP_ITEM_KINDS_V2.reduce((acc, kind) => {
  acc[kind.value] = kind;
  return acc;
}, {});

export function normalizeMapView(view) {
  return LEGACY_VIEW_ALIASES[String(view || '').trim()] || MAP_VIEWS.GLOBAL;
}

export function getMapKind(kind) {
  return KIND_BY_VALUE[kind] || KIND_BY_VALUE[DEFAULT_MAP_ITEM_KIND];
}

