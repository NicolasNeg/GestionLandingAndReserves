import { parseMapDocument } from '../lib/mapEngine/mapMigrations.js';
import { ALL_AQUAMAP_ELEMENT_TYPES } from './elementCatalog';
import { clampElementDimensions, presetSizeForType } from './elementDefaults';
import type { ElementType, MapElement } from './types';
import { normalizeParkingStatus } from './parkingYardAssets';
import { defaultSpriteForType } from './spriteUrls';
import { AQUAMAP_WORLD_H, AQUAMAP_WORLD_MAX_H, AQUAMAP_WORLD_MAX_W, AQUAMAP_WORLD_W } from './world';

function clampWorldDim(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export const AQUAMAP_FORMAT = 'aquamap-v1' as const;

export type AquamapSiteEnvelope = {
  format: typeof AQUAMAP_FORMAT;
  world: { w: number; h: number };
  elements: MapElement[];
};

export function isAquamapSiteJson(jsonStr: string | null | undefined): boolean {
  if (!jsonStr || typeof jsonStr !== 'string') return false;
  try {
    const o = JSON.parse(jsonStr);
    return o && typeof o === 'object' && o.format === AQUAMAP_FORMAT && Array.isArray(o.elements);
  } catch {
    return false;
  }
}

function migrateElement(raw: unknown, world = { w: AQUAMAP_WORLD_W, h: AQUAMAP_WORLD_H }): MapElement | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<MapElement>;
  if (!o.id || !o.type) return null;
  const rawType = String(o.type);
  const valid = ALL_AQUAMAP_ELEMENT_TYPES;
  const type = valid.includes(rawType as ElementType) ? (rawType as ElementType) : 'service';
  const preset = presetSizeForType(type);
  const dims = clampElementDimensions(
    {
      type,
      width: Number(o.width) || preset.width,
      height: Number(o.height) || preset.height
    },
    world
  );
  const base: MapElement = {
    id: String(o.id),
    type,
    name: String(o.name ?? ''),
    description: String(o.description ?? ''),
    x: Number(o.x) || 0,
    y: Number(o.y) || 0,
    width: dims.width,
    height: dims.height,
    color: String(o.color || '#0ea5e9'),
    imgSrc: o.imgSrc?.trim() || defaultSpriteForType(type)
  };
  if (type === 'parking') {
    base.parkingStatus = normalizeParkingStatus((o as { parkingStatus?: unknown }).parkingStatus);
  }
  return base;
}

export function parseAquamapSiteEnvelope(jsonStr: string | null | undefined): AquamapSiteEnvelope {
  const world = { w: AQUAMAP_WORLD_W, h: AQUAMAP_WORLD_H };
  if (!jsonStr || typeof jsonStr !== 'string') {
    return { format: AQUAMAP_FORMAT, world, elements: [] };
  }
  try {
    const o = JSON.parse(jsonStr) as Partial<AquamapSiteEnvelope> & { elements?: unknown[] };
    if (!o || o.format !== AQUAMAP_FORMAT || !Array.isArray(o.elements)) {
      return { format: AQUAMAP_FORMAT, world, elements: [] };
    }
    const rawW = o.world && typeof o.world === 'object' ? Number((o.world as { w?: number }).w) : world.w;
    const rawH = o.world && typeof o.world === 'object' ? Number((o.world as { h?: number }).h) : world.h;
    const w = clampWorldDim(Number.isFinite(rawW) && rawW > 0 ? rawW : world.w, 400, AQUAMAP_WORLD_MAX_W);
    const h = clampWorldDim(Number.isFinite(rawH) && rawH > 0 ? rawH : world.h, 280, AQUAMAP_WORLD_MAX_H);
    const els = o.elements.map((raw) => migrateElement(raw, { w, h })).filter((x): x is MapElement => x != null);
    return {
      format: AQUAMAP_FORMAT,
      world: {
        w,
        h
      },
      elements: els
    };
  } catch {
    return { format: AQUAMAP_FORMAT, world, elements: [] };
  }
}

export function serializeAquamapSiteEnvelope(env: AquamapSiteEnvelope): string {
  return JSON.stringify({
    format: AQUAMAP_FORMAT,
    world: env.world,
    elements: env.elements
  });
}

export function emptyAquamapJson(): string {
  return serializeAquamapSiteEnvelope({
    format: AQUAMAP_FORMAT,
    world: { w: AQUAMAP_WORLD_W, h: AQUAMAP_WORLD_H },
    elements: []
  });
}

/** Validación ligera al guardar desde el panel (formato aquamap-v1). */
export function validateAquamapSiteForSave(jsonStr: string | null | undefined): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isAquamapSiteJson(jsonStr)) {
    errors.push('El JSON del mapa no tiene formato aquamap-v1 válido.');
    return { errors, warnings };
  }
  const env = parseAquamapSiteEnvelope(jsonStr);
  if (env.world.w < 400 || env.world.h < 280) {
    errors.push('El lienzo debe medir al menos 400×280 px.');
  }
  if (env.world.w > AQUAMAP_WORLD_MAX_W || env.world.h > AQUAMAP_WORLD_MAX_H) {
    warnings.push(
      `El lienzo se guardará como máximo ${AQUAMAP_WORLD_MAX_W}×${AQUAMAP_WORLD_MAX_H} px para mantener el editor estable.`
    );
  }
  const seen = new Set<string>();
  env.elements.forEach((el, i) => {
    const label = el.name || el.type || `#${i + 1}`;
    if (!String(el.id || '').trim()) warnings.push(`Pieza "${label}": sin ID estable.`);
    else if (seen.has(el.id)) errors.push(`ID duplicado: "${el.id}".`);
    else seen.add(el.id);
    if (el.width < 16 || el.height < 16) errors.push(`Pieza "${label}": tamaño inválido.`);
    if (!String(el.name || '').trim()) warnings.push(`Pieza "${el.id || i}": sin nombre.`);
  });
  return { errors, warnings };
}

function kindToAquamapType(kind: string): ElementType {
  const k = String(kind || '').toLowerCase();
  if (k.includes('pool') || k === 'alberca') return 'pool';
  if (k.includes('slide') || k.includes('tobog')) return 'slide';
  if (k.includes('tree') || k.includes('arbol')) return 'tree';
  if (k === 'mesa' || k === 'table') return 'mesa';
  if (k.includes('parking') || k === 'estacionamiento' || k.includes('cajon')) return 'parking';
  if (k.includes('palapa')) return 'palapa';
  if (k.includes('entrada') || k.includes('entrance') || k.includes('acceso')) return 'entrada';
  if (k === 'area' || k.includes('zona') || k.includes('zone')) return 'area';
  if (k.includes('bar') || k.includes('restaur') || k.includes('comida') || k.includes('food')) return 'bar';
  if (k.includes('camino') || k.includes('path') || k.includes('via') || k === 'line') return 'camino';
  if (k.includes('bano') || k.includes('wc') || k.includes('restroom')) return 'banos';
  return 'service';
}

/**
 * Carga JSON de sitio: si ya es aquamap-v1 lo parsea; si es el mapa legacy (Konva) convierte piezas a elementos isometricos.
 */
export function ensureAquamapEnvelopeFromSiteJson(
  jsonStr: string | null | undefined,
  options: { view?: string } = {}
): AquamapSiteEnvelope {
  if (!jsonStr || !String(jsonStr).trim()) {
    return parseAquamapSiteEnvelope(emptyAquamapJson());
  }
  if (isAquamapSiteJson(jsonStr)) {
    return parseAquamapSiteEnvelope(jsonStr);
  }
  try {
    const doc = parseMapDocument(jsonStr, { view: options.view ?? 'global' });
    const rawItems = Array.isArray(doc.items) ? doc.items : [];
    const w = clampWorldDim(Math.max(320, Math.round(Number(doc.width) || AQUAMAP_WORLD_W)), 400, AQUAMAP_WORLD_MAX_W);
    const h = clampWorldDim(Math.max(220, Math.round(Number(doc.height) || AQUAMAP_WORLD_H)), 280, AQUAMAP_WORLD_MAX_H);
    const world = { w, h };
    const elements: MapElement[] = rawItems.map((item: Record<string, unknown>, index: number) => {
      const type = kindToAquamapType(String(item.kind || 'area'));
      const id = String(item.id || `legacy-${index}`).trim() || `legacy-${index}`;
      const meta = (item.metadata && typeof item.metadata === 'object' ? item.metadata : {}) as Record<
        string,
        unknown
      >;
      const preset = presetSizeForType(type);
      const dims = clampElementDimensions(
        {
          type,
          width: Number(item.width) || preset.width,
          height: Number(item.height) || preset.height
        },
        world
      );
      return {
        id,
        type,
        name: String(item.label || meta.publicName || type).slice(0, 160),
        description: String(meta.description || item.notes || '').slice(0, 4000),
        x: Number(item.x) || 0,
        y: Number(item.y) || 0,
        width: dims.width,
        height: dims.height,
        color: String(item.fill || item.stroke || '#0ea5e9').slice(0, 40),
        imgSrc: defaultSpriteForType(type)
      };
    });
    return {
      format: AQUAMAP_FORMAT,
      world: { w, h },
      elements
    };
  } catch {
    return parseAquamapSiteEnvelope(emptyAquamapJson());
  }
}
