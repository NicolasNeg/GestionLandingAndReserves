/**
 * Configuración central del editor de mapas por vista (admin context).
 * Claves: parque | mesas | estacionamiento | albercas (coinciden con mapContext en AdminDashboard).
 */
import { MAP_ITEM_KINDS_V2 } from './mapEngine/mapTypes.js';

const KIND_META = MAP_ITEM_KINDS_V2.reduce((acc, k) => {
  acc[k.value] = k;
  return acc;
}, {});

/** @typedef {'parque'|'mesas'|'estacionamiento'|'albercas'} MapAdminContext */

export const MAP_EDITOR_VIEWS = {
  parque: {
    label: 'Global',
    accent: 'neutral',
    mapView: 'global',
    storageField: 'mapaDistribucionJson',
    sidebarHint: 'Plano general del parque para la landing pública.',
    toolGroups: [
      {
        title: 'Parque',
        values: [
          'area',
          'rect',
          'polygon',
          'line',
          'entrada',
          'entrance',
          'servicio',
          'serviceArea',
          'palapa',
          'alberca',
          'pool',
          'estacionamiento',
          'parkingSpot',
          'text',
          'marker',
          'image'
        ]
      },
      { title: 'Formas', values: ['circle', 'ellipse', 'limitacion', 'blockedZone'] }
    ]
  },
  mesas: {
    label: 'Mesas',
    accent: 'green',
    mapView: 'mesas',
    storageField: 'mapaMesasJson',
    sidebarHint: 'Mesas y zonas reservables para /reservar.',
    toolGroups: [
      {
        title: 'Mesas',
        values: ['mesa', 'table', 'rect', 'ellipse', 'palapa', 'servicio', 'serviceArea', 'area']
      },
      {
        title: 'Extras visuales',
        values: ['marker', 'text', 'line', 'polygon', 'entrada', 'entrance', 'limitacion', 'blockedZone']
      },
      { title: 'Formas', values: ['circle', 'ellipse', 'image'] }
    ]
  },
  estacionamiento: {
    label: 'Estacionamiento',
    accent: 'yellow',
    mapView: 'estacionamiento',
    storageField: 'mapaEstacionamientoJson',
    sidebarHint: 'Cajones, circulación y zonas operativas de parking.',
    toolGroups: [
      {
        title: 'Agregar al mapa',
        values: [
          'estacionamiento',
          'parkingSpot',
          'entrada',
          'entrance',
          'area',
          'rect',
          'limitacion',
          'blockedZone',
          'line',
          'polygon',
          'text',
          'marker',
          'image'
        ]
      },
      { title: 'Formas', values: ['circle', 'ellipse', 'servicio', 'serviceArea'] },
      { title: 'Contexto', values: ['mesa', 'table', 'alberca', 'pool', 'palapa'] }
    ]
  },
  albercas: {
    label: 'Albercas',
    accent: 'blue',
    mapView: 'albercas',
    storageField: 'mapaDistribucionJson',
    sidebarHint: 'Zonas acuáticas sobre el mismo documento global (sin nuevo campo en BD).',
    toolGroups: [
      {
        title: 'Albercas',
        values: ['alberca', 'pool', 'area', 'rect', 'ellipse', 'circle', 'polygon', 'palapa', 'servicio', 'serviceArea']
      },
      { title: 'Formas y notas', values: ['line', 'text', 'marker', 'image', 'entrada', 'entrance'] },
      { title: 'Contexto', values: ['mesa', 'table', 'estacionamiento', 'parkingSpot', 'limitacion', 'blockedZone'] }
    ]
  }
};

export function itemCategoryForFocus(item) {
  const k = String(item?.kind || '').toLowerCase();
  const t = String(item?.type || '').toLowerCase();
  if (k === 'mesa' || k === 'table' || t === 'table') return 'mesa';
  if (k === 'estacionamiento' || k === 'parkingspot' || t === 'parkingspot') return 'parking';
  if (k === 'alberca' || k === 'pool' || t === 'pool') return 'pool';
  if (k === 'entrada' || k === 'entrance' || t === 'entrance' || k === 'line' || t === 'line') return 'circulation';
  return 'area';
}

/**
 * @param {string} editorView normalized global|mesas|estacionamiento|albercas
 * @param {object} item
 * @param {boolean} showContext mostrar piezas no primarias atenuadas
 * @returns {number} 0 = no dibujar, 0–1 = multiplicador de opacidad
 */
export function getItemFocusRenderAlpha(editorView, item, showContext) {
  const v = String(editorView || 'global').toLowerCase();
  if (v === 'global' || v === 'parque') return 1;

  const cat = itemCategoryForFocus(item);
  const primary = (() => {
    if (v === 'mesas') return cat === 'mesa';
    if (v === 'estacionamiento') return cat === 'parking';
    if (v === 'albercas') return cat === 'pool';
    return true;
  })();

  if (!showContext) {
    return primary ? 1 : 0;
  }

  if (primary) return 1;

  if (v === 'mesas') {
    if (cat === 'area' || cat === 'circulation') return 0.7;
    if (cat === 'pool') return 0.62;
    if (cat === 'parking') return 0.34;
    return 0.55;
  }
  if (v === 'estacionamiento') {
    if (cat === 'circulation') return 0.72;
    if (cat === 'area') return 0.55;
    if (cat === 'mesa') return 0.32;
    if (cat === 'pool') return 0.42;
    return 0.45;
  }
  if (v === 'albercas') {
    if (cat === 'area' || cat === 'circulation') return 0.7;
    if (cat === 'mesa') return 0.52;
    if (cat === 'parking') return 0.3;
    return 0.55;
  }
  return 1;
}

/**
 * @param {MapAdminContext} mapContext
 * @param {(s: string) => string} escapeHtml
 */
export function renderMapToolAccordionsHtml(mapContext, escapeHtml) {
  const ctx = mapContext === 'mesas' || mapContext === 'estacionamiento' || mapContext === 'albercas' ? mapContext : 'parque';
  const def = MAP_EDITOR_VIEWS[ctx] || MAP_EDITOR_VIEWS.parque;
  return def.toolGroups
    .map((group, gi) => {
      if (!group.values?.length) return '';
      const buttons = group.values
        .map((v) => {
          const kind = KIND_META[v];
          if (!kind) return '';
          return `<button type="button" class="mapa-tool-btn inline-flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-left text-[11px] font-bold text-slate-200 hover:bg-white/10" data-map-tool="${kind.value}" title="${escapeHtml(kind.label)}"><span class="h-2 w-2 shrink-0 rounded-full" style="background:${kind.stroke}"></span><span class="min-w-0 truncate">${escapeHtml(kind.label)}</span></button>`;
        })
        .join('');
      const openAttr = gi === 0 ? ' open' : '';
      return `<details class="mapa-tool-accordion border-b border-white/5 pb-2 last:border-0"${openAttr}><summary class="mapa-tool-accordion-summary">${escapeHtml(group.title)}</summary><div class="mapa-tool-grid mt-2 grid grid-cols-1 gap-1">${buttons}</div></details>`;
    })
    .join('');
}

export function mapSidebarHint(mapContext) {
  const ctx = mapContext === 'mesas' || mapContext === 'estacionamiento' || mapContext === 'albercas' ? mapContext : 'parque';
  return MAP_EDITOR_VIEWS[ctx]?.sidebarHint || '';
}
