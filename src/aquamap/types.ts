export type ElementType = 'pool' | 'slide' | 'service' | 'tree';

export interface MapElement {
  id: string;
  type: ElementType;
  name: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  imgSrc?: string;
}

export interface AppState {
  elements: MapElement[];
  selectedId: string | null;
  camera: { x: number; y: number; scale: number };
}
