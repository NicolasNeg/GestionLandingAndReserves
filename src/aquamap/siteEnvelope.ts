import { parseMapDocument } from '../lib/mapEngine/mapMigrations.js';
import type { ElementType, MapElement } from './types';
import { defaultSpriteForType } from './spriteUrls';
import { AQUAMAP_WORLD_H, AQUAMAP_WORLD_W } from './world';

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

function migrateElement(raw: unknown): MapElement | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<MapElement>;
  if (!o.id || !o.type) return null;
  const type = o.type as ElementType;
  return {
    id: String(o.id),
    type,
    name: String(o.name ?? ''),
    description: String(o.description ?? ''),
    x: Number(o.x) || 0,
    y: Number(o.y) || 0,
    width: Math.max(16, Number(o.width) || 100),
    height: Math.max(16, Number(o.height) || 84),
    color: String(o.color || '#0ea5e9'),
    imgSrc: o.imgSrc?.trim() || defaultSpriteForType(type)
  };
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
    const w = o.world && typeof o.world === 'object' ? Number((o.world as { w?: number }).w) : world.w;
    const h = o.world && typeof o.world === 'object' ? Number((o.world as { h?: number }).h) : world.h;
    const els = o.elements.map(migrateElement).filter((x): x is MapElement => x != null);
    return {
      format: AQUAMAP_FORMAT,
      world: {
        w: Number.isFinite(w) && w > 0 ? w : world.w,
        h: Number.isFinite(h) && h > 0 ? h : world.h
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

function kindToAquamapType(kind: string): ElementType {
  const k = String(kind || '').toLowerCase();
  if (k.includes('pool') || k === 'alberca') return 'pool';
  if (k.includes('slide') || k.includes('tobog')) return 'slide';
  if (k.includes('tree') || k.includes('arbol')) return 'tree';
  return 'service';
}

/**
 * Carga JSON de sitio: si ya es aquamap-v1 lo parsea; si es el mapa legacy (Konva) convierte piezas a elementos isometricos.
 */
export function ensureAquamapEnvelopeFromSiteJson(jsonStr: string | null | undefined): AquamapSiteEnvelope {
  if (!jsonStr || !String(jsonStr).trim()) {
    return parseAquamapSiteEnvelope(emptyAquamapJson());
  }
  if (isAquamapSiteJson(jsonStr)) {
    return parseAquamapSiteEnvelope(jsonStr);
  }
  try {
    const doc = parseMapDocument(jsonStr, { view: 'global' });
    const rawItems = Array.isArray(doc.items) ? doc.items : [];
    const elements: MapElement[] = rawItems.map((item: Record<string, unknown>, index: number) => {
      const type = kindToAquamapType(String(item.kind || 'area'));
      const id = String(item.id || `legacy-${index}`).trim() || `legacy-${index}`;
      const meta = (item.metadata && typeof item.metadata === 'object' ? item.metadata : {}) as Record<
        string,
        unknown
      >;
      return {
        id,
        type,
        name: String(item.label || meta.publicName || type).slice(0, 160),
        description: String(meta.description || item.notes || '').slice(0, 4000),
        x: Number(item.x) || 0,
        y: Number(item.y) || 0,
        width: Math.max(16, Number(item.width) || 80),
        height: Math.max(16, Number(item.height) || 72),
        color: String(item.fill || item.stroke || '#0ea5e9').slice(0, 40),
        imgSrc: defaultSpriteForType(type)
      };
    });
    const w = Math.max(320, Math.round(Number(doc.width) || AQUAMAP_WORLD_W));
    const h = Math.max(220, Math.round(Number(doc.height) || AQUAMAP_WORLD_H));
    return {
      format: AQUAMAP_FORMAT,
      world: { w, h },
      elements
    };
  } catch {
    return parseAquamapSiteEnvelope(emptyAquamapJson());
  }
}
