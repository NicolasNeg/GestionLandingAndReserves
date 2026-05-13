/** Visibilidad de ítems por vista de mapa (global / mesas / estacionamiento / albercas). */

export function normalizeMapViewName(view) {
  const v = String(view || '').toLowerCase();
  if (v === 'parque') return 'global';
  if (v === 'parking') return 'estacionamiento';
  if (v === 'pool' || v === 'alberca') return 'albercas';
  return v || 'global';
}

function defaultVisibilityByKind(item = {}) {
  const kind = String(item.kind || '').toLowerCase();
  const type = String(item.type || '').toLowerCase();
  const isMesa = kind === 'mesa' || kind === 'table' || type === 'table';
  const isParking = kind === 'estacionamiento' || kind === 'parkingspot' || type === 'parkingspot';
  const isPool = kind === 'alberca' || kind === 'pool' || type === 'pool';
  return {
    global: true,
    mesas: isMesa,
    estacionamiento: isParking,
    albercas: isPool
  };
}

export function isMapItemVisibleInView(item, view) {
  if (item?.visible === false) return false;
  const activeView = normalizeMapViewName(view);
  if (activeView === 'global') return true;
  const cfg =
    item?.metadata &&
    typeof item.metadata === 'object' &&
    item.metadata.visibilityByView &&
    typeof item.metadata.visibilityByView === 'object'
      ? item.metadata.visibilityByView
      : null;
  const fallback = defaultVisibilityByKind(item);
  if (cfg && Object.prototype.hasOwnProperty.call(cfg, activeView)) return cfg[activeView] !== false;
  if (cfg) {
    const hasAny =
      Object.prototype.hasOwnProperty.call(cfg, 'global') ||
      Object.prototype.hasOwnProperty.call(cfg, 'mesas') ||
      Object.prototype.hasOwnProperty.call(cfg, 'estacionamiento') ||
      Object.prototype.hasOwnProperty.call(cfg, 'albercas');
    if (hasAny) return false;
  }
  return fallback[activeView] || fallback.global;
}
