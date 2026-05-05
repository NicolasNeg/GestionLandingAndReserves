import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase-config.js';
import { isPermissionError } from './dataConnectErrors.js';
import { getUserAccessResolved } from './permissionsProvider.js';
import { waitForAuthUser as waitForAuthUserProvider } from './authProvider.js';
import { getCanonicalAuthUser } from './authCanonical.js';
import {
  BOOTSTRAP_PROGRAMADOR_EMAIL,
  DEFAULT_ROLE_PERMISSIONS,
  isBootstrapProgramadorEmail,
  PERMISSIONS,
  uniquePermissions
} from './permissionsConstants.js';

export {
  BOOTSTRAP_PROGRAMADOR_EMAIL,
  PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_LABELS,
  isBootstrapProgramadorEmail,
  normalizeRole,
  labelRole,
  uniquePermissions
} from './permissionsConstants.js';

export const AUTH_WAIT_TIMEOUT_MS = 6000;

export function waitForAuthUser(timeoutMs = AUTH_WAIT_TIMEOUT_MS) {
  return waitForAuthUserProvider(timeoutMs);
}

export async function getUserAccess(user) {
  const u = user !== undefined ? user : getCanonicalAuthUser();
  return getUserAccessResolved(u ?? null);
}

export async function syncFirestoreUserProfile(user, profile = {}) {
  if (!user) return;
  const uid = user.uid ?? user.id;
  if (!uid) return;
  const ref = doc(db, 'users', uid);
  const bootstrapProgramador = isBootstrapProgramadorEmail(user.email || profile.email);
  const base = {
    email: user.email || profile.email || '',
    nombre: profile.nombre || user.displayName || 'Usuario',
    photoURL: user.photoURL || '',
    providerId: user.providerData?.[0]?.providerId || 'password',
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp()
  };

  try {
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        ...base,
        rol: bootstrapProgramador ? 'programador' : 'cliente',
        permissions: bootstrapProgramador ? PERMISSIONS.map((p) => p.key) : [],
        createdAt: serverTimestamp()
      });
      return;
    }

    await setDoc(
      ref,
      {
        ...base,
        ...(bootstrapProgramador
          ? {
              rol: 'programador',
              permissions: PERMISSIONS.map((p) => p.key)
            }
          : {})
      },
      { merge: true }
    );
  } catch (error) {
    if (isPermissionError(error)) return;
    throw error;
  }
}
