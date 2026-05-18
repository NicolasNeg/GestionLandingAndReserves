/** Estados visibles en la landing (sin datos sensibles). */

export type PublicSlotState =
  | 'libre'
  | 'ocupado'
  | 'reservado'
  | 'mantenimiento'
  | 'taller'
  | 'sucio';

export const PUBLIC_STATE_LABEL: Record<PublicSlotState, string> = {
  libre: 'Libre',
  ocupado: 'Ocupado',
  reservado: 'Reservado',
  mantenimiento: 'Mantenimiento',
  taller: 'Taller',
  sucio: 'No disponible'
};

export function publicStateForSpot(
  spot?: { estado?: string; placas?: string; modelo?: string } | null
): PublicSlotState {
  if (!spot) return 'libre';
  const estado = String(spot.estado || 'libre').toLowerCase();
  const hasVehicle = Boolean(spot.placas?.trim() || spot.modelo?.trim());
  if (estado === 'reservado') return 'reservado';
  if (estado === 'mantenimiento') return 'mantenimiento';
  if (estado === 'taller') return 'taller';
  if (estado === 'sucio') return 'sucio';
  if (estado === 'ocupado' || hasVehicle) return 'ocupado';
  return 'libre';
}
