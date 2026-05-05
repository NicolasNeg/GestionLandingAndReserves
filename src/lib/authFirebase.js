/**
 * Adaptador Auth sobre Firebase Auth (implementación actual).
 */
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { auth, facebookProvider, googleProvider } from '../firebase-config.js';

const AUTH_WAIT_MS = 6000;

export function getAuthBackendName() {
  return 'firebase';
}

export function getCurrentUser() {
  return auth?.currentUser ?? null;
}

export function onAuthChange(callback) {
  if (!auth) {
    queueMicrotask(() => callback(null));
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export function waitForAuthUser(timeoutMs = AUTH_WAIT_MS) {
  if (!auth) return Promise.resolve(null);
  return new Promise((resolve) => {
    let done = false;
    let unsub = () => {};
    const finish = (user) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      unsub();
      resolve(user);
    };
    const timer = globalThis.setTimeout(() => finish(auth.currentUser || null), timeoutMs);
    unsub = onAuthStateChanged(auth, (user) => finish(user));
  });
}

export async function signInWithGoogle() {
  if (!auth || !googleProvider) throw new Error('Firebase Auth no disponible');
  return signInWithPopup(auth, googleProvider);
}

export async function signInWithFacebook() {
  if (!auth || !facebookProvider) throw new Error('Firebase Auth no disponible');
  return signInWithPopup(auth, facebookProvider);
}

export async function signInWithEmail(email, password) {
  if (!auth) throw new Error('Firebase Auth no disponible');
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email, password, metadata = {}) {
  if (!auth) throw new Error('Firebase Auth no disponible');
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const displayName = metadata?.nombre || metadata?.name || '';
  if (displayName && cred.user) {
    await updateProfile(cred.user, { displayName });
  }
  return cred;
}

export async function logout() {
  if (!auth) return;
  await firebaseSignOut(auth);
}

export function getUserId() {
  return auth?.currentUser?.uid ?? null;
}

export function getUserEmail() {
  return auth?.currentUser?.email ?? '';
}

export function getUserDisplayName() {
  return auth?.currentUser?.displayName ?? '';
}

export function getUserPhotoURL() {
  return auth?.currentUser?.photoURL ?? '';
}
