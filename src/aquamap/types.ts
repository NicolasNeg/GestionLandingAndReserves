export type ElementType =
  | 'pool'
  | 'slide'
  | 'service'
  | 'tree'
  | 'mesa'
  | 'parking'
  | 'palapa'
  | 'entrada'
  | 'area'
  | 'bar'
  | 'camino'
  | 'banos';

export type ParkingSpotStatus = 'libre' | 'reservado' | 'ocupado' | 'mantenimiento';

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
  /** Solo type === 'parking': estado operativo en patio / landing. */
  parkingStatus?: ParkingSpotStatus;
}

export interface AppState {
  elements: MapElement[];
  selectedId: string | null;
  camera: { x: number; y: number; scale: number };
}
