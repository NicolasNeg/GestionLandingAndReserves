import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import { db } from '../firebase-config.js';

const COLL = 'mesaReservasLive';

function makeId(fechaDia, mapItemId) {
  return `${fechaDia}__${mapItemId}`.replace(/[^\w-]/g, '_');
}

export function subscribeMesaReservasByFecha(fechaDia, onData, onError) {
  const q = query(collection(db, COLL), where('fechaDia', '==', fechaDia));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(rows);
    },
    (err) => onError?.(err)
  );
}

export async function upsertMesaReservaLive({ fechaDia, mapItemId, userId, estado = 'apartada' }) {
  const id = makeId(fechaDia, mapItemId);
  await setDoc(
    doc(db, COLL, id),
    {
      id,
      fechaDia,
      mapItemId,
      userId: userId || '',
      estado,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function clearMesaReservaLive(fechaDia, mapItemId) {
  const id = makeId(fechaDia, mapItemId);
  await deleteDoc(doc(db, COLL, id));
}

/**
 * Bloqueo transaccional para evitar doble apartado en condiciones de carrera.
 * Retorna { acquired, mine, ownerId }.
 */
export async function claimMesaReservaLive({ fechaDia, mapItemId, userId }) {
  const id = makeId(fechaDia, mapItemId);
  const ref = doc(db, COLL, id);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      tx.set(ref, {
        id,
        fechaDia,
        mapItemId,
        userId: userId || '',
        estado: 'apartada',
        updatedAt: serverTimestamp()
      });
      return { acquired: true, mine: true, ownerId: userId || '' };
    }
    const data = snap.data() || {};
    const ownerId = String(data.userId || '');
    const isMine = ownerId && ownerId === userId;
    if (data.estado === 'apartada' && !isMine) {
      return { acquired: false, mine: false, ownerId };
    }
    tx.set(
      ref,
      {
        id,
        fechaDia,
        mapItemId,
        userId: userId || '',
        estado: 'apartada',
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    return { acquired: true, mine: true, ownerId: userId || '' };
  });
}

export async function getMesaReservaLive(fechaDia, mapItemId) {
  const id = makeId(fechaDia, mapItemId);
  const snap = await getDoc(doc(db, COLL, id));
  return snap.exists() ? { id, ...snap.data() } : null;
}
