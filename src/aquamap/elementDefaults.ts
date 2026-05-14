import type { ElementType, MapElement } from './types';
import { nanoid } from 'nanoid';

const LABELS: Record<ElementType, string> = {
  pool: 'Alberca',
  slide: 'Tobogán',
  service: 'Servicio',
  tree: 'Árbol'
};

const COLORS: Record<ElementType, string> = {
  pool: '#0ea5e9',
  slide: '#f97316',
  service: '#a855f7',
  tree: '#22c55e'
};

export function createMapElement(type: ElementType): MapElement {
  const id = nanoid();
  const jitter = () => 40 + Math.random() * 80;
  return {
    id,
    type,
    name: LABELS[type],
    description: '',
    x: jitter(),
    y: jitter(),
    width: 88,
    height: 64,
    color: COLORS[type]
  };
}
