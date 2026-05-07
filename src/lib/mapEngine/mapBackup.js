/**
 * Respaldo local, export/import y validación ligera de mapas (sin tocar schema).
 */
import { formatFechaDia } from '../fechaDiaMexico.js';
import { parseMapDocument, serializeMapDocument } from './mapMigrations.js';
import { MAP_SCHEMA_VERSION } from './mapTypes.js';

const DRAFT_PREFIX = 'mapDraft_v1_';
const LAST_SAVED_PREFIX = 'mapLastSaved_v1_';

export const MAP_VIEW_KEYS = {
  global: 'global',
  mesas: 'mesas',
  estacionamiento: 'estacionamiento',
  albercas: 'albercas'
};

/** Admin context select value -> storage view key */
export function mapContextToViewKey(mapContext) {
  if (mapContext === 'mesas') return MAP_VIEW_KEYS.mesas;
  if (mapContext === 'estacionamiento') return MAP_VIEW_KEYS.estacionamiento;
  if (mapContext === 'albercas') return MAP_VIEW_KEYS.albercas;
  return MAP_VIEW_KEYS.global;
}

export function draftStorageKey(viewKey) {
  return `${DRAFT_PREFIX}${viewKey}`;
}

export function lastSavedStorageKey(viewKey) {
  return `${LAST_SAVED_PREFIX}${viewKey}`;
}

export function saveMapDraftLocal(viewKey, jsonString) {
  try {
    const payload = {
      view: viewKey,
      ts: Date.now(),
      json: String(jsonString || '')
    };
    localStorage.setItem(draftStorageKey(viewKey), JSON.stringify(payload));
  } catch (e) {
    console.warn('[mapDraft]', e?.message || e);
  }
}

export function loadMapDraftLocal(viewKey) {
  try {
    const raw = localStorage.getItem(draftStorageKey(viewKey));
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o.json !== 'string') return null;
    return { json: o.json, ts: Number(o.ts) || 0, view: o.view || viewKey };
  } catch {
    return null;
  }
}

export function clearMapDraftLocal(viewKey) {
  try {
    localStorage.removeItem(draftStorageKey(viewKey));
  } catch {}
}

export function clearAllMapDrafts() {
  Object.values(MAP_VIEW_KEYS).forEach((k) => clearMapDraftLocal(k));
}

export function saveLastSavedLocal(viewKey, jsonString) {
  try {
    localStorage.setItem(
      lastSavedStorageKey(viewKey),
      JSON.stringify({ ts: Date.now(), json: String(jsonString || '') })
    );
  } catch {}
}

function isTableKind(it) {
  const k = String(it?.kind || '');
  return k === 'mesa' || k === 'table' || it?.type === 'table';
}

function isParkingKind(it) {
  const k = String(it?.kind || '');
  return k === 'estacionamiento' || k === 'parkingSpot';
}

function isPoolKind(it) {
  const k = String(it?.kind || '');
  return k === 'alberca' || k === 'pool' || it?.type === 'pool';
}

/**
 * @param {string} jsonStr
 * @param {string} mapContext 'parque' | 'mesas' | 'estacionamiento'
 * @returns {{ errors: string[], warnings: string[], doc: object | null }}
 */
export function validateMapDocumentForSave(jsonStr, mapContext) {
  const errors = [];
  const warnings = [];
  let doc;
  try {
    doc = parseMapDocument(jsonStr, { view: mapContextToViewKey(mapContext) });
  } catch (e) {
    return { errors: ['El JSON del mapa no se pudo interpretar.'], warnings: [], doc: null };
  }

  const w = Number(doc.width);
  const h = Number(doc.height);
  if (!Number.isFinite(w) || w <= 0) errors.push('El ancho del lienzo debe ser mayor que 0.');
  if (!Number.isFinite(h) || h <= 0) errors.push('El alto del lienzo debe ser mayor que 0.');

  const items = Array.isArray(doc.items) ? doc.items : [];
  const ids = items.map((it) => String(it?.id || '').trim()).filter(Boolean);
  const seen = new Set();
  ids.forEach((id) => {
    if (!id) return;
    if (seen.has(id)) errors.push(`ID duplicado en el mapa: "${id}".`);
    seen.add(id);
  });

  items.forEach((it, i) => {
    if (!String(it?.id || '').trim()) warnings.push(`Pieza índice ${i + 1}: sin ID (se recomienda ID estable).`);
    const x = Number(it.x);
    const y = Number(it.y);
    const wi = Number(it.width);
    const he = Number(it.height);
    if ([x, y, wi, he].some((n) => Number.isNaN(n))) {
      errors.push(`Pieza ${i + 1}: posición o tamaño inválido (NaN).`);
    }
    if (Number.isFinite(w) && Number.isFinite(wi) && Number.isFinite(x) && x + wi > w + 1)
      warnings.push(`Pieza "${it.id || i}": sobresale del lienzo por la derecha o abajo.`);
    if (Number.isFinite(h) && Number.isFinite(he) && Number.isFinite(y) && y + he > h + 1)
      warnings.push(`Pieza "${it.id || i}": sobresale del lienzo por la derecha o abajo.`);
  });

  if (mapContext === 'mesas') {
    items.forEach((it) => {
      if (!isTableKind(it)) return;
      const meta = it.metadata || {};
      const res = meta.reservable !== false;
      const cap = Number(meta.capacity ?? meta.capacidad);
      if (res && (!Number.isFinite(cap) || cap < 1)) {
        warnings.push(`Mesa "${it.id}": sin capacidad válida (reservable).`);
      }
      const pub = String(meta.publicName || it.label || '').trim();
      if (!pub) warnings.push(`Mesa "${it.id}": sin nombre público ni etiqueta.`);
    });
  }

  if (mapContext === 'estacionamiento') {
    items.forEach((it) => {
      if (!isParkingKind(it)) return;
      const code = String(it.metadata?.spotCode || it.id || '').trim();
      if (!code) warnings.push(`Cajón "${it.id}": sin código / ID estable visible.`);
    });
  }

  if (mapContext === 'albercas') {
    items.forEach((it) => {
      if (!isPoolKind(it)) return;
      const pub = String(it.metadata?.publicName || it.label || '').trim();
      if (!pub) warnings.push(`Alberca "${it.id}": sin nombre visible.`);
    });
  }

  items.forEach((it) => {
    const lab = String(it.label || '').trim();
    const pub = String(it.metadata?.publicName || '').trim();
    if (!lab && !pub && (isTableKind(it) || isParkingKind(it))) {
      warnings.push(`Pieza "${it.id}": sin etiqueta ni nombre público.`);
    }
    const vis = it?.metadata?.visibilityByView;
    if (vis && typeof vis === 'object') {
      const anyOn = ['global', 'mesas', 'estacionamiento', 'albercas'].some((k) => vis[k] === true);
      if (!anyOn) warnings.push(`Pieza "${it.id}": no visible en ninguna vista.`);
    }
  });

  return { errors, warnings, doc };
}

export function suggestFilenameForView(viewKey) {
  const day = formatFechaDia();
  if (viewKey === MAP_VIEW_KEYS.mesas) return `mapa-mesas-${day}.json`;
  if (viewKey === MAP_VIEW_KEYS.estacionamiento) return `mapa-estacionamiento-${day}.json`;
  if (viewKey === MAP_VIEW_KEYS.albercas) return `mapa-albercas-${day}.json`;
  return `mapa-global-${day}.json`;
}

export function suggestFilenameFullBackup() {
  return `mapas-parque-backup-${formatFechaDia()}.json`;
}

export function downloadJsonFile(filename, data) {
  const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8'
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(a.href);
  a.remove();
}

export function buildFullBackupPayload(landing) {
  return {
    format: 'mapas-parque-backup',
    formatVersion: 1,
    schemaVersion: MAP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    mapaDistribucionJson: landing.mapaDistribucionJson || '{}',
    mapaMesasJson: landing.mapaMesasJson || '{}',
    mapaEstacionamientoJson: landing.mapaEstacionamientoJson || '{}'
  };
}

export function tryParseJsonFile(text) {
  if (!text || !String(text).trim()) return { ok: false, error: 'Archivo vacío.' };
  try {
    const v = JSON.parse(text);
    return { ok: true, value: v };
  } catch (e) {
    return { ok: false, error: 'JSON inválido: no se pudo analizar el archivo.' };
  }
}

export function detectImportShape(parsed) {
  if (!parsed || typeof parsed !== 'object') return { kind: 'invalid', reason: 'No es un objeto JSON.' };

  if (
    parsed.format === 'mapas-parque-backup' ||
    (parsed.mapaDistribucionJson != null &&
      (parsed.mapaMesasJson != null || parsed.mapaEstacionamientoJson != null))
  ) {
    return { kind: 'full', payload: parsed };
  }

  if (Array.isArray(parsed.items) || parsed.width != null || parsed.w != null || parsed.version != null) {
    return { kind: 'single', payload: parsed };
  }

  return { kind: 'unknown', reason: 'Estructura no reconocida (falta items o datos de mapa).' };
}

export function normalizeImportSingleDoc(parsed, viewKey) {
  const str = typeof parsed === 'string' ? parsed : serializeMapDocument(parseMapDocument(JSON.stringify(parsed), { view: viewKey }));
  parseMapDocument(str, { view: viewKey });
  return str;
}

export function extractFullBackupStrings(payload) {
  const g = payload.mapaDistribucionJson ?? payload.maps?.global;
  const m = payload.mapaMesasJson ?? payload.maps?.mesas;
  const e = payload.mapaEstacionamientoJson ?? payload.maps?.estacionamiento;
  return {
    global: typeof g === 'string' ? g : g ? JSON.stringify(g) : null,
    mesas: typeof m === 'string' ? m : m ? JSON.stringify(m) : null,
    estacionamiento: typeof e === 'string' ? e : e ? JSON.stringify(e) : null
  };
}
