import { MAP_SCHEMA_VERSION } from './mapTypes.js';
import {
  createDefaultMapDocument,
  defaultMapJson,
  mapDocumentToLegacyShape,
  normalizeMapDocument
} from './mapSchema.js';

export { defaultMapJson, mapDocumentToLegacyShape };

export function migrateLegacyMap(raw, options = {}) {
  return normalizeMapDocument(
    {
      version: MAP_SCHEMA_VERSION,
      view: options.view,
      width: raw?.width ?? raw?.w,
      height: raw?.height ?? raw?.h,
      renderProfile: raw?.renderProfile,
      navGraph: raw?.navGraph,
      publicMapUi: raw?.publicMapUi,
      background: raw?.background,
      grid: raw?.grid,
      layers: raw?.layers,
      items: Array.isArray(raw?.items) ? raw.items : []
    },
    options
  );
}

export function parseMapDocument(jsonStr, options = {}) {
  if (!jsonStr) return createDefaultMapDocument(options.view);
  try {
    const raw = typeof jsonStr === 'string' ? JSON.parse(jsonStr || '{}') : jsonStr;
    if (!raw || typeof raw !== 'object') return createDefaultMapDocument(options.view);
    if (Number(raw.version) >= 2 || raw.width || raw.layers || raw.background) {
      return normalizeMapDocument(raw, options);
    }
    return migrateLegacyMap(raw, options);
  } catch {
    return createDefaultMapDocument(options.view);
  }
}

export function serializeMapDocument(doc) {
  const normalized = normalizeMapDocument(doc);
  const clean = {
    version: normalized.version,
    view: normalized.view,
    width: normalized.width,
    height: normalized.height,
    renderProfile: normalized.renderProfile,
    navGraph: normalized.navGraph,
    publicMapUi: normalized.publicMapUi,
    background: normalized.background,
    grid: normalized.grid,
    layers: normalized.layers,
    items: normalized.items
  };
  return JSON.stringify(clean);
}

export function parseLegacyDistribucionJson(jsonStr, options = {}) {
  return mapDocumentToLegacyShape(parseMapDocument(jsonStr, options));
}

