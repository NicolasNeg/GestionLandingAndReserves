import { MAP_VIEWS, normalizeMapView } from './mapTypes.js';

export function mapFieldForView(view) {
  const normalized = normalizeMapView(view);
  if (normalized === MAP_VIEWS.MESAS) return 'mapaMesasJson';
  if (normalized === MAP_VIEWS.ESTACIONAMIENTO) return 'mapaEstacionamientoJson';
  return 'mapaDistribucionJson';
}

export function readMapFromLanding(landing, view) {
  const field = mapFieldForView(view);
  if (field === 'mapaMesasJson') return landing?.mapaMesasJson || landing?.mapaDistribucionJson || '';
  if (field === 'mapaEstacionamientoJson') return landing?.mapaEstacionamientoJson || landing?.mapaDistribucionJson || '';
  return landing?.mapaDistribucionJson || '';
}

export function writeMapToLanding(landing, view, json) {
  const field = mapFieldForView(view);
  landing[field] = json;
  return landing;
}

