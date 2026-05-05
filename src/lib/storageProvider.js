/**
 * Subida de archivos: Firebase Storage por defecto.
 */
import { isStorageSupabase } from './migrationEnv.js';
import * as stFirebase from './storageFirebase.js';
import * as stSupabase from './storageSupabase.js';

function impl() {
  return isStorageSupabase() ? stSupabase : stFirebase;
}

export function resolveStorageProvider() {
  return isStorageSupabase() ? 'supabase' : 'firebase';
}

export function uploadProductImage(file, uid) {
  return impl().uploadProductImage(file, uid);
}

export function uploadServiceImage(file, uid) {
  return impl().uploadServiceImage(file, uid);
}

export function uploadAvatarImage(file, uid) {
  return impl().uploadAvatarImage(file, uid);
}

export function deleteImage(path) {
  return impl().deleteImage(path);
}

export function getPublicUrl(path) {
  return impl().getPublicUrl(path);
}
