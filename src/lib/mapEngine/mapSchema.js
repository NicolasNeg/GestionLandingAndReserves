import {
  DEFAULT_LAYER_IDS,
  DEFAULT_MAP_ITEM_KIND,
  KIND_BY_VALUE,
  MAP_LAYERS,
  MAP_SCHEMA_VERSION,
  getMapKind,
  normalizeMapView
} from './mapTypes.js';

export const DEFAULT_MAP_WIDTH = 1000;
export const DEFAULT_MAP_HEIGHT = 620;

const ITEM_TYPES = new Set([
  'rect',
  'circle',
  'ellipse',
  'polygon',
  'line',
  'text',
  'icon',
  'marker',
  'table',
  'parkingSpot',
  'serviceArea',
  'pool',
  'entrance',
  'image',
  'background'
]);

const RESERVED_ITEM_KEYS = new Set([
  'id',
  'type',
  'kind',
  'label',
  'notes',
  'x',
  'y',
  'width',
  'height',
  'rotation',
  'fill',
  'stroke',
  'opacity',
  'zIndex',
  'locked',
  'visible',
  'metadata',
  'layerId',
  'points'
]);

export function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

export function sanitizeId(text, fallback) {
  const clean = String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || fallback;
}

function normalizeNavGraph(raw) {
  if (!raw || typeof raw !== 'object') return { nodes: [], edges: [] };
  const nodes = (Array.isArray(raw.nodes) ? raw.nodes : [])
    .map((n, i) => ({
      id: sanitizeId(n?.id, `n${i}`),
      x: Math.round(numberOr(n?.x, 0)),
      y: Math.round(numberOr(n?.y, 0)),
      label: String(n?.label || '').trim()
    }))
    .filter((n) => n.id);
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = (Array.isArray(raw.edges) ? raw.edges : [])
    .map((e) => ({
      from: sanitizeId(e?.from, ''),
      to: sanitizeId(e?.to, ''),
      weight: clamp(numberOr(e?.weight, 1), 0.01, 9999)
    }))
    .filter((e) => e.from && e.to && nodeIds.has(e.from) && nodeIds.has(e.to));
  return { nodes, edges };
}

function normalizePublicMapUi(raw) {
  if (!raw || typeof raw !== 'object') return { filters: [], isometric: false };
  const filters = (Array.isArray(raw.filters) ? raw.filters : [])
    .map((f) => ({
      id: sanitizeId(f?.id, ''),
      label: String(f?.label || f?.id || '').trim()
    }))
    .filter((f) => f.id && f.id !== 'all');
  const isometric = raw.isometric === true || raw.isometric === 'true';
  return { filters, isometric };
}

export function createDefaultMapDocument(view = 'global') {
  return {
    version: MAP_SCHEMA_VERSION,
    view: normalizeMapView(view),
    width: DEFAULT_MAP_WIDTH,
    height: DEFAULT_MAP_HEIGHT,
    renderProfile: 'semiReal',
    navGraph: { nodes: [], edges: [] },
    publicMapUi: { filters: [], isometric: false },
    background: {
      type: 'park',
      fill: '#ecfdf5',
      stroke: '#0f766e',
      url: '',
      storagePath: '',
      fileName: '',
      opacity: 1,
      fit: 'cover',
      locked: true,
      visible: true
    },
    grid: {
      visible: true,
      size: 20,
      snap: true
    },
    layers: MAP_LAYERS.map((layer) => ({ ...layer })),
    items: []
  };
}

export function defaultMapJson(view = 'global') {
  return JSON.stringify(createDefaultMapDocument(view));
}

function numberOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function inferType(item, kindMeta) {
  const raw = String(item?.type || '').trim();
  if (ITEM_TYPES.has(raw)) return raw;
  if (raw === 'rect') return 'rect';
  return kindMeta.type || 'rect';
}

function defaultLayerForKind(kindMeta) {
  return kindMeta.layerId || DEFAULT_LAYER_IDS.AREAS;
}

function collectLegacyMetadata(item) {
  const metadata = { ...(item?.metadata && typeof item.metadata === 'object' ? item.metadata : {}) };
  Object.entries(item || {}).forEach(([key, value]) => {
    if (!RESERVED_ITEM_KEYS.has(key) && value !== undefined) metadata[key] = value;
  });
  return metadata;
}

function normalizePoints(points, width, height) {
  if (Array.isArray(points) && points.length >= 2) {
    return points
      .map((point) => ({
        x: numberOr(point?.x, 0),
        y: numberOr(point?.y, 0)
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  }
  return [
    { x: 0, y: height },
    { x: width * 0.5, y: 0 },
    { x: width, y: height }
  ];
}

export function normalizeLayer(layer, index = 0) {
  const fallback = MAP_LAYERS[index] || MAP_LAYERS[0];
  return {
    id: sanitizeId(layer?.id, fallback.id || `layer-${index + 1}`),
    name: String(layer?.name || fallback.name || `Capa ${index + 1}`),
    type: String(layer?.type || fallback.type || 'custom'),
    visible: layer?.visible !== false,
    locked: Boolean(layer?.locked),
    zIndex: Math.round(numberOr(layer?.zIndex, index * 10))
  };
}

export function normalizeMapItem(item = {}, index = 0, options = {}) {
  const kind = KIND_BY_VALUE[item?.kind] ? item.kind : DEFAULT_MAP_ITEM_KIND;
  const kindMeta = getMapKind(kind);
  const fallbackId = `${kind}-${String(index + 1).padStart(2, '0')}`;
  const id = sanitizeId(item?.id, fallbackId);
  const width = clamp(Math.round(numberOr(item?.width, kind === 'mesa' ? 76 : 120)), 8, 5000);
  const height = clamp(Math.round(numberOr(item?.height, kind === 'mesa' ? 76 : 80)), 8, 5000);
  const type = inferType(item, kindMeta);
  const metadata = collectLegacyMetadata(item);

  if (kind === 'mesa') {
    metadata.capacidad = Number(metadata.capacidad || item.capacidad || 4);
    metadata.precio = Number(metadata.precio || item.precio || 0);
    metadata.vip = Boolean(metadata.vip || item.vip);
    metadata.reservable = item.metadata?.reservable !== false && item.reservable !== false;
  }

  if (kind === 'estacionamiento' || kind === 'parkingSpot') {
    metadata.spotCode = String(metadata.spotCode || item.spotCode || id).toUpperCase();
    metadata.zone = String(metadata.zone || item.zone || 'General');
    metadata.baseStatus = String(metadata.baseStatus || item.baseStatus || 'libre');
    metadata.reservadoPor = String(metadata.reservadoPor || item.reservadoPor || '').trim();
  }

  if (kind === 'servicio' || kind === 'serviceArea') {
    metadata.category = String(metadata.category || item.category || 'servicio');
    metadata.icon = String(metadata.icon || item.icon || 'info');
    metadata.description = String(metadata.description || item.description || item.notes || '');
  }

  if (kind === 'alberca' || kind === 'pool') {
    const pt = String(metadata.poolType || metadata.tipoAlberca || item.poolType || 'alberca').toLowerCase();
    metadata.poolType = ['alberca', 'chapoteadero', 'olas', 'zona_libre', 'waterarea'].includes(pt)
      ? pt
      : 'alberca';
    metadata.publicName = String(metadata.publicName || item.publicName || '').trim();
    metadata.reglasPublicas = String(metadata.reglasPublicas || metadata.advertencias || '').trim();
    metadata.capacidadAprox = Math.max(0, Math.round(numberOr(metadata.capacidadAprox, 0)));
  }

  return {
    ...item,
    type,
    id,
    kind,
    label: String(item?.label || kindMeta.label || 'Zona'),
    notes: String(item?.notes || ''),
    x: Math.round(numberOr(item?.x, 0)),
    y: Math.round(numberOr(item?.y, 0)),
    width,
    height,
    rotation: Math.round(numberOr(item?.rotation, 0)),
    fill: item?.fill || kindMeta.fill,
    stroke: item?.stroke || kindMeta.stroke,
    opacity: clamp(numberOr(item?.opacity, 1), 0.05, 1),
    zIndex: Math.round(numberOr(item?.zIndex, index)),
    locked: Boolean(item?.locked),
    visible: item?.visible !== false,
    layerId: sanitizeId(item?.layerId, defaultLayerForKind(kindMeta)),
    points: type === 'polygon' || type === 'line' ? normalizePoints(item?.points, width, height) : item?.points,
    metadata
  };
}

export function normalizeMapDocument(raw = {}, options = {}) {
  const view = normalizeMapView(raw.view || options.view);
  const fallback = createDefaultMapDocument(view);
  const width = clamp(Math.round(numberOr(raw.width ?? raw.w, fallback.width)), 320, 6000);
  const height = clamp(Math.round(numberOr(raw.height ?? raw.h, fallback.height)), 220, 4000);
  const mergedLayers = Array.isArray(raw.layers) && raw.layers.length
    ? raw.layers.map(normalizeLayer)
    : fallback.layers;
  const knownLayerIds = new Set(mergedLayers.map((layer) => layer.id));
  const items = Array.isArray(raw.items)
    ? raw.items
        .filter(Boolean)
        .map((item, index) => normalizeMapItem(item, index, { view }))
        .map((item) => ({
          ...item,
          layerId: knownLayerIds.has(item.layerId) ? item.layerId : defaultLayerForKind(getMapKind(item.kind))
        }))
    : [];

  const rawBg = raw.background && typeof raw.background === 'object' ? raw.background : {};
  const bgTypeRaw = String(rawBg.type || '').toLowerCase();
  const bgType =
    bgTypeRaw === 'none' ||
    bgTypeRaw === 'color' ||
    bgTypeRaw === 'image' ||
    bgTypeRaw === 'park'
      ? bgTypeRaw
      : fallback.background.type || 'park';

  const renderRaw = String(raw.renderProfile || '').toLowerCase();
  const renderProfile = renderRaw === 'semiReal' ? 'semiReal' : 'flat';

  return {
    version: MAP_SCHEMA_VERSION,
    view,
    width,
    height,
    renderProfile,
    navGraph: normalizeNavGraph(raw.navGraph),
    publicMapUi: normalizePublicMapUi(raw.publicMapUi),
    w: undefined,
    h: undefined,
    background: {
      ...fallback.background,
      ...rawBg,
      type: bgType,
      fill: String(rawBg.fill || rawBg.color || fallback.background.fill || '#ecfdf5'),
      url: String(rawBg.url || '').trim(),
      storagePath: String(rawBg.storagePath || '').trim(),
      fileName: String(rawBg.fileName || '').trim(),
      opacity: clamp(numberOr(rawBg.opacity, fallback.background.opacity ?? 1), 0, 1),
      fit: ['cover', 'contain', 'stretch'].includes(String(rawBg.fit || '').toLowerCase())
        ? String(rawBg.fit).toLowerCase()
        : fallback.background.fit || 'cover',
      locked: rawBg.locked !== false,
      visible: rawBg.visible !== false
    },
    grid: {
      ...fallback.grid,
      ...(raw.grid && typeof raw.grid === 'object' ? raw.grid : {})
    },
    layers: mergedLayers,
    items
  };
}

export function mapDocumentToLegacyShape(doc) {
  const normalized = normalizeMapDocument(doc);
  return {
    w: normalized.width,
    h: normalized.height,
    items: normalized.items.map((item) => ({ ...item }))
  };
}

