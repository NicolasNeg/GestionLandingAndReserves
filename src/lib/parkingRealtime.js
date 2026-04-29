import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase-config.js';

const PARKING_COLLECTION = 'parkingSpots';

export function subscribeParkingSpots(onData, onError) {
  return onSnapshot(
    collection(db, PARKING_COLLECTION),
    (snap) => {
      const spots = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => String(a.id).localeCompare(String(b.id)));
      onData(spots);
    },
    onError
  );
}

export async function upsertParkingSpot(spot) {
  const id = String(spot.id || '').trim();
  if (!id) throw new Error('Spot sin ID');
  await setDoc(
    doc(db, PARKING_COLLECTION, id),
    {
      id,
      x: Number(spot.x || 20),
      y: Number(spot.y || 20),
      estado: spot.estado || 'libre',
      tipoVehiculo: spot.tipoVehiculo || '',
      placas: spot.placas || '',
      modelo: spot.modelo || '',
      reservadoPor: spot.reservadoPor || '',
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function updateParkingSpot(id, patch) {
  await updateDoc(doc(db, PARKING_COLLECTION, id), {
    ...patch,
    updatedAt: serverTimestamp()
  });
}

export async function removeParkingSpot(id) {
  await deleteDoc(doc(db, PARKING_COLLECTION, id));
}
