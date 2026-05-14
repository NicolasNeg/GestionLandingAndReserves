import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { ElementType, MapElement } from './types';
import { defaultSpriteForType } from './spriteUrls';

const STORAGE_KEY = 'aquamap-editor-pro-elements';

function migrateRow(el: unknown): MapElement | null {
  if (!el || typeof el !== 'object') return null;
  const o = el as Partial<MapElement>;
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

function readStoredElements(fallback: MapElement[]): MapElement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    return parsed.map(migrateRow).filter((x): x is MapElement => x != null);
  } catch {
    return fallback;
  }
}

/** Persiste solo el array `elements` en localStorage (Fase 4). */
export function useLocalStorageElements(initial: MapElement[] = []): [MapElement[], Dispatch<SetStateAction<MapElement[]>>] {
  const [elements, setElements] = useState<MapElement[]>(() => readStoredElements(initial));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(elements));
    } catch {
      /* quota u otro error: ignorar */
    }
  }, [elements]);

  return [elements, setElements];
}
