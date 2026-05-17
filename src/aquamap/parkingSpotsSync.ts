import {
  removeParkingSpot,
  updateParkingSpot,
  upsertParkingSpot
} from '../lib/parkingRealtime.js';
import { normalizeParkingStatus } from './parkingYardAssets';
import { normalizeParkingSpotCode } from './parkingLayout';
import type { AquamapSiteEnvelope } from './siteEnvelope';
import type { MapElement, ParkingSpotStatus } from './types';

export type ParkingSpotLive = {
  id: string;
  x: number;
  y: number;
  estado: string;
  tipoVehiculo?: string;
  placas?: string;
  modelo?: string;
  reservadoPor?: string;
  ubicacion?: string;
};

/** Centro del cajón en % del lienzo (mismo criterio que el panel operativo). */
export function elementCenterPercent(
  el: MapElement,
  world: { w: number; h: number }
): { x: number; y: number } {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  return {
    x: Math.max(0, Math.min(95, (cx / world.w) * 100)),
    y: Math.max(0, Math.min(90, (cy / world.h) * 100))
  };
}

export function parkingStatusToEstado(status?: ParkingSpotStatus): string {
  return normalizeParkingStatus(status);
}

export function estadoToParkingStatus(estado: string): ParkingSpotStatus {
  const k = String(estado || '').toLowerCase();
  if (k === 'reservado') return 'reservado';
  if (k === 'ocupado') return 'ocupado';
  if (k === 'mantenimiento' || k === 'sucio' || k === 'taller') return 'mantenimiento';
  return 'libre';
}

export function mapElementToParkingSpotPayload(
  el: MapElement,
  world: { w: number; h: number }
): ParkingSpotLive | null {
  if (el.type !== 'parking') return null;
  const id = normalizeParkingSpotCode(el.name);
  if (!id) return null;
  const { x, y } = elementCenterPercent(el, world);
  return {
    id,
    x,
    y,
    estado: parkingStatusToEstado(el.parkingStatus),
    ubicacion: 'patio'
  };
}

export type MergeParkingLiveOptions = {
  world?: { w: number; h: number };
  /** public: solo libre/ocupado; worker|full: todos los estados. */
  audience?: 'public' | 'worker' | 'full';
};

function livePositionToWorld(
  el: MapElement,
  live: ParkingSpotLive,
  world: { w: number; h: number }
): { x: number; y: number } {
  const cx = (Number(live.x) / 100) * world.w;
  const cy = (Number(live.y) / 100) * world.h;
  return {
    x: Math.round(Math.max(0, cx - el.width / 2)),
    y: Math.round(Math.max(0, cy - el.height / 2))
  };
}

export function mergeParkingLiveIntoElements(
  elements: MapElement[],
  parkingById: Record<string, ParkingSpotLive>,
  options: MergeParkingLiveOptions = {}
): MapElement[] {
  if (!Object.keys(parkingById).length) return elements;
  const { world, audience = 'full' } = options;
  return elements.map((el) => {
    if (el.type !== 'parking') return el;
    const code = normalizeParkingSpotCode(el.name);
    const live = code ? parkingById[code] : undefined;
    if (!live) return el;
    let parkingStatus = estadoToParkingStatus(live.estado);
    if (audience === 'public') {
      parkingStatus = parkingStatus === 'libre' ? 'libre' : 'ocupado';
    }
    let next: MapElement = { ...el, parkingStatus };
    if (world) {
      const pos = livePositionToWorld(el, live, world);
      next = { ...next, x: pos.x, y: pos.y };
    }
    return next;
  });
}

export async function syncParkingOperationalToDb(
  spotId: string,
  patch: {
    estado?: string;
    placas?: string;
    modelo?: string;
    reservadoPor?: string;
    ubicacion?: string;
  }
): Promise<void> {
  const id = normalizeParkingSpotCode(spotId);
  if (!id) return;
  await updateParkingSpot(id, patch);
}

export function syncParkingOperationalToDbSafe(
  spotId: string,
  patch: Parameters<typeof syncParkingOperationalToDb>[1]
): void {
  void syncParkingOperationalToDb(spotId, patch).catch((err) => {
    console.warn('[parking sync] operational:', err);
  });
}

export async function syncParkingElementToDb(
  el: MapElement,
  world: { w: number; h: number }
): Promise<void> {
  const payload = mapElementToParkingSpotPayload(el, world);
  if (!payload) return;
  await upsertParkingSpot(payload);
}

export async function removeParkingElementFromDb(el: MapElement): Promise<void> {
  const id = normalizeParkingSpotCode(el.name);
  if (!id) return;
  await removeParkingSpot(id);
}

export async function renameParkingSpotInDb(
  oldName: string,
  el: MapElement,
  world: { w: number; h: number }
): Promise<void> {
  const oldId = normalizeParkingSpotCode(oldName);
  const payload = mapElementToParkingSpotPayload(el, world);
  if (!payload) return;
  if (oldId && oldId !== payload.id) {
    try {
      await removeParkingSpot(oldId);
    } catch {
      /* spot previo puede no existir */
    }
  }
  await upsertParkingSpot(payload);
}

export async function syncParkingPatchToDb(
  el: MapElement,
  world: { w: number; h: number },
  patch: Partial<MapElement>
): Promise<void> {
  const merged = { ...el, ...patch };
  if (patch.name != null) {
    await renameParkingSpotInDb(el.name, merged, world);
    return;
  }
  const id = normalizeParkingSpotCode(merged.name);
  if (!id) return;
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.parkingStatus != null) row.estado = parkingStatusToEstado(merged.parkingStatus);
  if (patch.x != null || patch.y != null || patch.width != null || patch.height != null) {
    const { x, y } = elementCenterPercent(merged, world);
    row.x = x;
    row.y = y;
  }
  if (Object.keys(row).length <= 1) return;
  await updateParkingSpot(id, row as Parameters<typeof updateParkingSpot>[1]);
}

export async function syncAllParkingElementsToDb(envelope: AquamapSiteEnvelope): Promise<void> {
  const tasks = envelope.elements
    .filter((e) => e.type === 'parking')
    .map((el) => syncParkingElementToDb(el, envelope.world));
  await Promise.all(tasks);
}

/** No bloquea la UI si Supabase falla (permisos, red). */
export function syncParkingElementToDbSafe(
  el: MapElement,
  world: { w: number; h: number }
): void {
  void syncParkingElementToDb(el, world).catch((err) => {
    console.warn('[parking sync] upsert:', err);
  });
}

export function removeParkingElementFromDbSafe(el: MapElement): void {
  void removeParkingElementFromDb(el).catch((err) => {
    console.warn('[parking sync] remove:', err);
  });
}

export function syncParkingPatchToDbSafe(
  el: MapElement,
  world: { w: number; h: number },
  patch: Partial<MapElement>
): void {
  void syncParkingPatchToDb(el, world, patch).catch((err) => {
    console.warn('[parking sync] patch:', err);
  });
}

export function syncAllParkingElementsToDbSafe(envelope: AquamapSiteEnvelope): void {
  void syncAllParkingElementsToDb(envelope).catch((err) => {
    console.warn('[parking sync] bulk:', err);
  });
}
