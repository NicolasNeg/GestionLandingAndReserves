import { listMesaReservasVencibles, updateMesaReservaEstado } from '../dataconnect-generated';
import { clearMesaReservaLive } from './mesaRealtime.js';
import { formatFechaDia } from './fechaDiaMexico.js';

/**
 * Marca como vencidas las reservas "apartada" de días anteriores.
 * Se puede ejecutar al iniciar vistas operativas.
 */
export async function sweepExpiredMesaReservas() {
  const hoy = formatFechaDia();
  const res = await listMesaReservasVencibles({ fechaDia: hoy });
  const rows = res.data?.mesaReservas || [];
  for (const r of rows) {
    await updateMesaReservaEstado({ id: r.id, estado: 'vencida' });
    if (r.fechaDia && r.mapItemId) {
      await clearMesaReservaLive(r.fechaDia, r.mapItemId);
    }
  }
  return rows.length;
}
