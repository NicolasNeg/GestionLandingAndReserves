import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase-config.js';
import { getDataConnectErrorMessage, isPermissionError } from './dataConnectErrors.js';

const CHANNEL_REF = doc(db, 'appRealtime', 'global');
const CLIENT_ID = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export async function publishAppUpdate(scope = 'general', detail = '') {
  if (!auth.currentUser) {
    return { ok: false, skipped: true, reason: 'auth-required' };
  }
  try {
    await setDoc(
      CHANNEL_REF,
      {
        scope,
        detail,
        source: CLIENT_ID,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || null
      },
      { merge: true }
    );
    return { ok: true, skipped: false };
  } catch (error) {
    if (isPermissionError(error)) {
      console.warn('Sincronizacion en vivo sin permisos:', getDataConnectErrorMessage(error));
      return { ok: false, skipped: true, reason: 'permission-denied', error };
    }
    throw error;
  }
}

export function initRealtimeSync(onRemoteUpdate) {
  let lastKey = '';
  return onSnapshot(
    CHANNEL_REF,
    (snap) => {
      if (!snap.exists() || snap.metadata.hasPendingWrites) return;
      const data = snap.data() || {};
      const millis = data.updatedAt?.toMillis?.() || 0;
      const key = `${millis}_${data.source || ''}_${data.scope || ''}`;
      if (!millis || key === lastKey) return;
      lastKey = key;
      if (data.source === CLIENT_ID) return;
      onRemoteUpdate?.(data.scope || 'general', data);
    },
    (err) => {
      if (isPermissionError(err)) return;
      console.warn('Sincronizacion en vivo (Firestore) no disponible:', getDataConnectErrorMessage(err));
    }
  );
}
