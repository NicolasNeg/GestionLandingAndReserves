import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { MapElement } from './types';

const STORAGE_KEY = 'aquamap-editor-pro-elements';

function readStoredElements(fallback: MapElement[]): MapElement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    return parsed as MapElement[];
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
