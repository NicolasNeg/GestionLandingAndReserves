/** Layout fijo del sandbox BJX (MYPROYECT/app.js). */

export type SlotDef = {
  label: string;
  left: number;
  top: number;
  w: number;
  h: number;
  wide?: boolean;
  isArea?: boolean;
  isWorkshop?: boolean;
};

export const YARD_STAGE_W = 1840;
export const YARD_STAGE_H = 930;

/** Tamaño por defecto de un cajón en el lienzo operativo (% → px). */
export const DEFAULT_SLOT_W = 92;
export const DEFAULT_SLOT_H = 132;

export type ParkingSpotCoords = {
  id: string;
  x?: number;
  y?: number;
};

/** Convierte fila de parking_spots (x/y en %) a posición en el patio operativo. */
export function slotDefFromParkingSpot(spot: ParkingSpotCoords): SlotDef {
  const w = DEFAULT_SLOT_W;
  const h = DEFAULT_SLOT_H;
  const cx = (Number(spot.x ?? 20) / 100) * YARD_STAGE_W;
  const cy = (Number(spot.y ?? 20) / 100) * YARD_STAGE_H;
  return {
    label: spot.id,
    left: Math.max(8, Math.round(cx - w / 2)),
    top: Math.max(8, Math.round(cy - h / 2)),
    w,
    h
  };
}

/** Solo cajones definidos en la base (sin layout sandbox BJX). */
export function slotsFromParkingSpots(
  parkingById: Record<string, ParkingSpotCoords>
): SlotDef[] {
  return Object.values(parkingById)
    .filter((s) => s?.id)
    .sort((a, b) => String(a.id).localeCompare(String(b.id), 'es'))
    .map(slotDefFromParkingSpot);
}

export function slotLabelsFromParking(
  parkingById: Record<string, ParkingSpotCoords>
): string[] {
  return slotsFromParkingSpots(parkingById).map((s) => s.label);
}

export const BJX_SLOTS: SlotDef[] = [
  { label: 'L-1', left: 34, top: 32, w: 92, h: 132 },
  { label: 'L-2', left: 138, top: 32, w: 92, h: 132 },
  { label: 'L-3', left: 242, top: 32, w: 96, h: 132 },
  { label: 'L-4', left: 346, top: 32, w: 96, h: 132 },
  { label: 'L-5', left: 450, top: 32, w: 96, h: 132 },
  { label: 'L-6', left: 554, top: 32, w: 96, h: 132 },
  { label: 'L-7', left: 658, top: 32, w: 96, h: 132 },
  { label: 'L-8', left: 762, top: 32, w: 96, h: 132 },
  { label: 'L-9', left: 866, top: 32, w: 96, h: 132 },
  { label: 'L-10', left: 970, top: 32, w: 96, h: 132 },
  { label: 'L-11', left: 1074, top: 32, w: 96, h: 132 },
  { label: 'L2-1', left: 34, top: 180, w: 92, h: 132 },
  { label: 'L2-2', left: 138, top: 180, w: 92, h: 132 },
  { label: 'L2-3', left: 242, top: 180, w: 96, h: 132 },
  { label: 'L2-4', left: 346, top: 180, w: 96, h: 132 },
  { label: 'L2-5', left: 450, top: 180, w: 96, h: 132 },
  { label: 'L2-6', left: 554, top: 180, w: 96, h: 132 },
  { label: 'L2-7', left: 658, top: 180, w: 96, h: 132 },
  { label: 'L2-8', left: 762, top: 180, w: 96, h: 132 },
  { label: 'L2-9', left: 866, top: 180, w: 96, h: 132 },
  { label: 'L2-10', left: 970, top: 180, w: 96, h: 132 },
  { label: 'L2-11', left: 1074, top: 180, w: 96, h: 132 },
  { label: 'O-1', left: 34, top: 330, w: 196, h: 64, wide: true },
  { label: 'O-2', left: 242, top: 330, w: 196, h: 64, wide: true },
  { label: 'O-3', left: 450, top: 330, w: 196, h: 64, wide: true },
  { label: 'O-4', left: 658, top: 330, w: 196, h: 64, wide: true },
  { label: 'TLLRS-1', left: 1612, top: 32, w: 194, h: 90 },
  { label: 'TLLRS-2', left: 1612, top: 132, w: 194, h: 90 },
  { label: 'TLLRS-3', left: 1612, top: 232, w: 194, h: 90 },
  { label: 'TLLRS-4', left: 1612, top: 332, w: 194, h: 90 },
  { label: 'TLLRS-5', left: 1612, top: 432, w: 194, h: 90 },
  { label: 'TLLRS-6', left: 1612, top: 532, w: 194, h: 90 },
  { label: 'B-1', left: 34, top: 612, w: 92, h: 64 },
  { label: 'B-2', left: 138, top: 612, w: 92, h: 64 },
  { label: 'B-3', left: 242, top: 612, w: 96, h: 64 },
  { label: 'B-4', left: 346, top: 612, w: 96, h: 64 },
  { label: 'OFICINA-1', left: 554, top: 548, w: 96, h: 132 },
  { label: 'OFICINA-2', left: 670, top: 548, w: 96, h: 132 },
  { label: 'AREA LAVADO', left: 1200, top: 32, w: 188, h: 132, isArea: true },
  { label: 'TALLER', left: 1404, top: 32, w: 194, h: 818, isWorkshop: true }
];

export const STATUS_STYLE: Record<string, string> = {
  LISTO: 'green',
  SUCIO: 'yellow',
  MANTENIMIENTO: 'red',
  'NO ARRENDABLE': 'blue',
  'EN TALLER': 'orange',
  TRASLADO: 'purple'
};

export const STATUS_LABEL: Record<string, string> = {
  LISTO: 'Listo',
  SUCIO: 'Sucio',
  MANTENIMIENTO: 'Manto',
  'NO ARRENDABLE': 'No arrendable',
  'EN TALLER': 'En taller',
  TRASLADO: 'Traslado'
};

export const SANDBOX_STATUSES = [
  'LISTO',
  'SUCIO',
  'MANTENIMIENTO',
  'NO ARRENDABLE',
  'EN TALLER',
  'TRASLADO'
] as const;

export type SandboxStatus = (typeof SANDBOX_STATUSES)[number];

export type BjxUnit = {
  /** Identificador interno / MVA */
  identificador: string;
  slot: string;
  model: string;
  plates: string;
  titular: string;
  color: string;
  place: string;
};

export const UNIT_COLOR_OPTIONS = [
  { id: 'green', label: 'Verde' },
  { id: 'blue', label: 'Azul' },
  { id: 'cyan', label: 'Cian' },
  { id: 'purple', label: 'Morado' },
  { id: 'orange', label: 'Naranja' },
  { id: 'gray', label: 'Gris' }
] as const;

export function parseUbicacionMeta(ubicacion?: string): { zone: string; color: string } {
  const raw = String(ubicacion || 'patio');
  const [zone, color] = raw.split('|');
  const valid = UNIT_COLOR_OPTIONS.some((c) => c.id === color);
  return { zone: zone || 'patio', color: valid ? color : 'green' };
}

export function encodeUbicacionMeta(slot: string, color: string): string {
  const zone = layerForSlot(slot);
  const valid = UNIT_COLOR_OPTIONS.some((c) => c.id === color);
  return `${zone}|${valid ? color : 'green'}`;
}

export function spotHasVehicle(spot?: {
  estado?: string;
  placas?: string;
  modelo?: string;
  tipoVehiculo?: string;
} | null): boolean {
  if (!spot) return false;
  if (spot.tipoVehiculo?.trim() || spot.placas?.trim() || spot.modelo?.trim()) return true;
  return String(spot.estado || '').toLowerCase() === 'ocupado';
}

export function unitFromParkingSpot(spot: {
  id: string;
  placas?: string;
  modelo?: string;
  tipoVehiculo?: string;
  reservadoPor?: string;
  ubicacion?: string;
}): BjxUnit {
  const slot = spot.id;
  const meta = parseUbicacionMeta(spot.ubicacion);
  const identificador = String(spot.tipoVehiculo || spot.placas || slot).trim();
  return {
    identificador,
    slot,
    model: spot.modelo || '',
    plates: spot.placas || '',
    titular: spot.reservadoPor || '',
    color: meta.color,
    place: placeForSlot(slot)
  };
}

export function parkingCajonSlots(parkingById: Record<string, ParkingSpotCoords> = {}): string[] {
  return slotLabelsFromParking(parkingById).filter((s) => layerForSlot(s) === 'patio');
}

export function limboSlots(parkingById: Record<string, ParkingSpotCoords> = {}): string[] {
  return slotLabelsFromParking(parkingById).filter((s) => layerForSlot(s) === 'limbo');
}

export function firstFreeSlot(
  units: Record<string, BjxUnit>,
  parkingById: Record<string, ParkingSpotCoords>,
  preferLimbo: boolean
): string {
  const pool = preferLimbo ? limboSlots(parkingById) : parkingCajonSlots(parkingById);
  const free = pool.find((s) => !units[s]);
  if (free) return free;
  return slotLabelsFromParking(parkingById).find((s) => !units[s]) || '';
}

export type HistoryItem = {
  action: string;
  detail: string;
  actor: string;
  at: string;
};

export function placeForSlot(slotId: string): string {
  if (!slotId) return 'Patio';
  if (slotId.startsWith('TLLRS')) return 'Taller';
  if (slotId.startsWith('B-')) return 'Baño';
  if (slotId.startsWith('L')) return 'Limbo';
  if (slotId.startsWith('OFICINA')) return 'Oficina';
  return 'Patio';
}

export function layerForSlot(slotId: string): string {
  if (!slotId) return 'patio';
  if (slotId.startsWith('TLLRS')) return 'taller';
  if (slotId.startsWith('B-')) return 'bano';
  if (slotId.startsWith('L')) return 'limbo';
  if (slotId.startsWith('OFICINA')) return 'oficina';
  return 'patio';
}

export function fuelFill(fuel: string): string {
  const map: Record<string, string> = {
    F: '100%',
    '3/4': '75%',
    '1/2': '50%',
    '1/4': '25%',
    E: '0%',
    'N/A': '0%',
    '': '0%'
  };
  return map[fuel] || '0%';
}

export function nowLabel(): string {
  return new Date().toLocaleString('es-MX', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/** Mapeo estado Supabase → estado sandbox. */
export function estadoToSandboxStatus(estado: string): SandboxStatus {
  const k = String(estado || '').toLowerCase();
  if (k === 'sucio') return 'SUCIO';
  if (k === 'mantenimiento') return 'MANTENIMIENTO';
  if (k === 'taller') return 'EN TALLER';
  if (k === 'reservado') return 'NO ARRENDABLE';
  if (k === 'ocupado') return 'LISTO';
  return 'LISTO';
}

export function sandboxStatusToEstado(status: string): string {
  const s = String(status || '').toUpperCase();
  if (s === 'SUCIO') return 'sucio';
  if (s === 'MANTENIMIENTO') return 'mantenimiento';
  if (s === 'EN TALLER') return 'taller';
  if (s === 'NO ARRENDABLE' || s === 'TRASLADO') return 'reservado';
  if (s === 'LISTO') return 'ocupado';
  return 'libre';
}

export function unitVisibleOnSlot(spot: {
  estado?: string;
  placas?: string;
  modelo?: string;
}): boolean {
  const e = String(spot.estado || '').toLowerCase();
  if (spot.placas?.trim() || spot.modelo?.trim()) return true;
  return ['ocupado', 'reservado', 'sucio', 'mantenimiento', 'taller'].includes(e);
}

export function allInteractiveSlotLabels(): string[] {
  return BJX_SLOTS.filter((s) => !s.isArea && !s.isWorkshop).map((s) => s.label);
}
