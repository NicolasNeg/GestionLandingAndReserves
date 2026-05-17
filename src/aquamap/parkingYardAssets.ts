/** Patrón de puntos para el lienzo tipo patio (estilo sandbox-mapa). */

let gridPatternCanvas: HTMLCanvasElement | null = null;

export function getParkingGridPatternCanvas(): HTMLCanvasElement {
  if (gridPatternCanvas) return gridPatternCanvas;
  const c = document.createElement('canvas');
  const size = 18;
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(31,40,58,0.92)';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(115,133,164,0.35)';
    ctx.beginPath();
    ctx.arc(2.5, 2.5, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  gridPatternCanvas = c;
  return c;
}

/** Franjas diagonales suaves (área tipo zona ajardinada / texto plan). */
let stripePatternCanvas: HTMLCanvasElement | null = null;

export function getParkingStripePatternCanvas(): HTMLCanvasElement {
  if (stripePatternCanvas) return stripePatternCanvas;
  const c = document.createElement('canvas');
  const size = 24;
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    for (let i = -size; i < size * 2; i += 7) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
    }
  }
  stripePatternCanvas = c;
  return c;
}

export const PARKING_STATUS_FILL: Record<string, { fill: string; stroke: string }> = {
  libre: { fill: 'rgba(34,197,94,0.38)', stroke: '#22c55e' },
  reservado: { fill: 'rgba(245,158,11,0.32)', stroke: '#f59e0b' },
  ocupado: { fill: 'rgba(239,68,68,0.30)', stroke: '#ef4444' },
  mantenimiento: { fill: 'rgba(100,116,139,0.34)', stroke: '#64748b' }
};

/** Vista pública: solo libre vs ocupado (sin reservado/mantenimiento visibles). */
export const PUBLIC_PARKING_FILL: Record<'libre' | 'ocupado', { fill: string; stroke: string }> = {
  libre: { fill: 'rgba(34,197,94,0.42)', stroke: '#22c55e' },
  ocupado: { fill: 'rgba(51,65,85,0.72)', stroke: '#94a3b8' }
};

export type ParkingAudience = 'editor' | 'worker' | 'public';

export function normalizeParkingStatus(raw: unknown): 'libre' | 'reservado' | 'ocupado' | 'mantenimiento' {
  const k = String(raw || '').toLowerCase();
  if (k === 'reservado') return 'reservado';
  if (k === 'ocupado') return 'ocupado';
  if (k === 'mantenimiento') return 'mantenimiento';
  return 'libre';
}
