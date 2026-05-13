/**
 * Filtros del mapa público (chips) y coincidencia por ítem.
 */

const KIND_TO_FILTER = {
  mesa: 'mesas',
  table: 'mesas',
  alberca: 'piscinas',
  pool: 'piscinas',
  estacionamiento: 'estacionamiento',
  parkingSpot: 'estacionamiento',
  parkingspot: 'estacionamiento',
  servicio: 'servicios',
  service: 'servicios',
  area: 'zonas',
  palapa: 'palapas',
  entrada: 'accesos',
  entrance: 'accesos',
  limitacion: 'referencias',
  blockedZone: 'referencias'
};

function filterIdForItem(item) {
  const explicit = String(item?.metadata?.mapFilter || '').trim().toLowerCase();
  if (explicit) return explicit;
  const kind = String(item?.kind || '').toLowerCase();
  const type = String(item?.type || '').toLowerCase();
  return KIND_TO_FILTER[kind] || KIND_TO_FILTER[type] || 'otros';
}

const FILTER_LABELS = {
  all: 'Todo',
  mesas: 'Mesas',
  piscinas: 'Albercas',
  estacionamiento: 'Estacionamiento',
  servicios: 'Servicios',
  zonas: 'Zonas',
  palapas: 'Palapas',
  accesos: 'Accesos',
  referencias: 'Referencias',
  otros: 'Otros'
};

/**
 * @param {{ items?: object[], publicMapUi?: { filters?: { id?: string, label?: string }[] } }} doc
 * @returns {{ id: string, label: string }[]}
 */
export function buildPublicMapFilterChips(doc) {
  const fromDoc = doc?.publicMapUi?.filters;
  if (Array.isArray(fromDoc) && fromDoc.length) {
    return [{ id: 'all', label: 'Todo' }, ...fromDoc.filter((f) => f.id && f.id !== 'all')];
  }
  const seen = new Set();
  for (const item of doc?.items || []) {
    if (item?.visible === false) continue;
    seen.add(filterIdForItem(item));
  }
  const ids = [...seen].filter((id) => id !== 'all').sort();
  const chips = [{ id: 'all', label: 'Todo' }];
  for (const id of ids) {
    chips.push({ id, label: FILTER_LABELS[id] || id });
  }
  return chips;
}

/**
 * @param {object} item
 * @param {string} filterId
 */
export function itemMatchesPublicMapFilter(item, filterId) {
  if (!filterId || filterId === 'all') return true;
  return filterIdForItem(item) === filterId;
}
