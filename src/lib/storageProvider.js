/**
 * Subida de archivos: Supabase Storage.
 */
import * as stSupabase from './storageSupabase.js';

export function resolveStorageProvider() {
  return 'supabase';
}

export function uploadProductImage(file, uid) {
  return stSupabase.uploadProductImage(file, uid);
}

export function uploadServiceImage(file, uid) {
  return stSupabase.uploadServiceImage(file, uid);
}

export function uploadAvatarImage(file, uid) {
  return stSupabase.uploadAvatarImage(file, uid);
}

export function uploadMapBackgroundImage(file, options) {
  return stSupabase.uploadMapBackgroundImage(file, options);
}

export function deleteImage(path) {
  return stSupabase.deleteImage(path);
}

export function getPublicUrl(path) {
  return stSupabase.getPublicUrl(path);
}
