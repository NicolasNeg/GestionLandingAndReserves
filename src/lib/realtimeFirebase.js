/**
 * Implementación realtime actual (Firestore). Se reexporta sin cambios de comportamiento.
 */
export {
  subscribeMesaReservasByFecha,
  upsertMesaReservaLive,
  clearMesaReservaLive,
  claimMesaReservaLive,
  getMesaReservaLive
} from './mesaRealtime.js';

export {
  subscribeParkingSpots,
  upsertParkingSpot,
  updateParkingSpot,
  removeParkingSpot
} from './parkingRealtime.js';
