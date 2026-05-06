import { listMesaReservasVencibles, updateMesaReservaEstado } from './dataLayer.js';
import { getCurrentUser } from './authProvider.js';
import { getBackendErrorMessage, isBackendOperationUnavailable, isPermissionError } from './backendErrors.js';
import { clearMesaReservaLive } from './mesaRealtime.js';
import { formatFechaDia } from './fechaDiaMexico.js';

function warnSweepSkipped(error, context = 'consulta') {
  console.warn(`Barrido de reservas vencidas omitido (${context}):`, getBackendErrorMessage(error));
}

/**
 * Marca como vencidas las reservas "apartada" de días anteriores.
 * Se puede ejecutar al iniciar vistas operativas.
 * Es best-effort: no debe bloquear rutas públicas si Postgres o RLS no están listos.
 */
export async function sweepExpiredMesaReservas({ rethrowUnexpected = false } = {}) {
  if (!getCurrentUser()) return 0;

  const hoy = formatFechaDia();
  let res;
  try {
    res = await listMesaReservasVencibles({ fechaDia: hoy });
  } catch (error) {
    if (isBackendOperationUnavailable(error) || isPermissionError(error)) {
      warnSweepSkipped(error);
      return 0;
    }
    if (rethrowUnexpected) throw error;
    warnSweepSkipped(error);
    return 0;
  }

  const rows = res.data?.mesaReservas || [];
  let updated = 0;
  for (const r of rows) {
    try {
      await updateMesaReservaEstado({ id: r.id, estado: 'vencida' });
      updated += 1;
      if (r.fechaDia && r.mapItemId) {
        await clearMesaReservaLive(r.fechaDia, r.mapItemId);
      }
    } catch (error) {
      if (isBackendOperationUnavailable(error) || isPermissionError(error)) {
        warnSweepSkipped(error, `actualizacion ${r.id || ''}`.trim());
        continue;
      }
      if (rethrowUnexpected) throw error;
      warnSweepSkipped(error, `actualizacion ${r.id || ''}`.trim());
    }
  }
  return updated;
}
