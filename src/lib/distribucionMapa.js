/** Fachada compatible del mapa editable en admin y solo lectura en vistas publicas. */

import { findMapItemIndexAtPoint } from './mapEngine/mapHitTesting.js';
import {
  defaultMapJson,
  parseLegacyDistribucionJson,
  parseMapDocument,
  serializeMapDocument
} from './mapEngine/mapMigrations.js';
import { drawMapCanvas } from './mapEngine/mapRenderer.js';
import { normalizeMapItem as normalizeEngineMapItem } from './mapEngine/mapSchema.js';
import { itemMatchesPublicMapFilter } from './mapEngine/mapPublicFilters.js';
import { createMapViewer } from './mapEngine/mapViewport.js';
import {
  DEFAULT_MAP_ITEM_KIND,
  MAP_ITEM_KINDS_V2,
  getMapKind
} from './mapEngine/mapTypes.js';

export {
  DEFAULT_MAP_ITEM_KIND,
  createMapViewer,
  getMapKind,
  parseMapDocument,
  serializeMapDocument
};

export const MAP_ITEM_KINDS = MAP_ITEM_KINDS_V2;
export const DEFAULT_MAPA_JSON = defaultMapJson('global');

export function normalizeMapItem(item, index = 0) {
  return normalizeEngineMapItem(item, index);
}

export function parseDistribucionJson(jsonStr, options = {}) {
  return parseLegacyDistribucionJson(jsonStr, options);
}

export function drawDistribucionCanvas(canvas, jsonStr, options = {}) {
  return drawMapCanvas(canvas, jsonStr || DEFAULT_MAPA_JSON, options);
}

export function findMapItemIndexAtClientPoint(canvas, jsonStr, clientX, clientY, options = {}) {
  const data = parseDistribucionJson(jsonStr, options);
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return -1;
  const mx = ((clientX - rect.left) / rect.width) * data.w;
  const my = ((clientY - rect.top) / rect.height) * data.h;
  let itemFilter = options.itemFilter;
  if (!itemFilter && options.publicMapFilter && options.publicMapFilter !== 'all') {
    const fid = options.publicMapFilter;
    itemFilter = (item) => itemMatchesPublicMapFilter(item, fid);
  }
  return findMapItemIndexAtPoint(jsonStr, mx, my, { ...options, itemFilter });
}
