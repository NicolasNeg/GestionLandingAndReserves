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
import { getCurrentUser } from './authProvider.js';
import { getDataConnectErrorMessage, isPermissionError } from './dataConnectErrors.js';

const COLL = 'mesaReservasLive';

function makeId(fechaDia, mapItemId) {
  return `${fechaDia}__${mapItemId}`.replace(/[^\w-]/g, '_');
}

export function subscribeMesaReservasByFecha(fechaDia, onData, onError) {
  const q = query(collection(db, COLL), where('fechaDia', '==', fechaDia));
  try {
    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        onData(rows);
      },
      (err) => onError?.(err)
    );
  } catch (err) {
    onError?.(err);
    return () => {};
  }
}

export async function upsertMesaReservaLive({ fechaDia, mapItemId, userId, estado = 'apartada' }) {
  if (!getCurrentUser() || !userId) {
    return { ok: false, skipped: true, reason: 'auth-required' };
  }
  const id = makeId(fechaDia, mapItemId);
  try {
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
    return { ok: true, skipped: false };
  } catch (error) {
    if (isPermissionError(error)) {
      console.warn('Realtime de mesas sin permiso para actualizar; se usara Data Connect:', getDataConnectErrorMessage(error));
      return { ok: false, skipped: true, reason: 'permission-denied', error };
    }
    throw error;
  }
}

export async function clearMesaReservaLive(fechaDia, mapItemId) {
  if (!getCurrentUser()) {
    return { ok: false, skipped: true, reason: 'auth-required' };
  }
  const id = makeId(fechaDia, mapItemId);
  try {
    await deleteDoc(doc(db, COLL, id));
    return { ok: true, skipped: false };
  } catch (error) {
    if (isPermissionError(error)) {
      console.warn('Realtime de mesas sin permiso para limpiar; se usara Data Connect:', getDataConnectErrorMessage(error));
      return { ok: false, skipped: true, reason: 'permission-denied', error };
    }
    throw error;
  }
}

/**
 * Bloqueo transaccional para evitar doble apartado en condiciones de carrera.
 * Retorna { acquired, mine, ownerId }.
 */
export async function claimMesaReservaLive({ fechaDia, mapItemId, userId }) {
  if (!getCurrentUser() || !userId) {
    return { acquired: false, mine: false, ownerId: '', skipped: true, reason: 'auth-required' };
  }
  const id = makeId(fechaDia, mapItemId);
  const ref = doc(db, COLL, id);
  try {
    return await runTransaction(db, async (tx) => {
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
  } catch (error) {
    if (isPermissionError(error)) {
      console.warn('Realtime de mesas sin permiso para reclamar; continuando con Data Connect:', getDataConnectErrorMessage(error));
      return {
        acquired: true,
        mine: true,
        ownerId: userId || '',
        skipped: true,
        reason: 'permission-denied'
      };
    }
    throw error;
  }
}

export async function getMesaReservaLive(fechaDia, mapItemId) {
  const id = makeId(fechaDia, mapItemId);
  try {
    const snap = await getDoc(doc(db, COLL, id));
    return snap.exists() ? { id, ...snap.data() } : null;
  } catch (error) {
    if (isPermissionError(error)) {
      console.warn('Realtime de mesas sin permiso para leer snapshot; se usara Data Connect:', getDataConnectErrorMessage(error));
      return null;
    }
    throw error;
  }
}
