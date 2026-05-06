/**
 * Reexporta implementaciones Supabase (mesas + parking).
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
