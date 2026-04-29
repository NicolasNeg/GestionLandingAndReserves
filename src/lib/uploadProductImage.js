import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase-config.js';

const MAX_BYTES = 6 * 1024 * 1024;

/**
 * Sube una imagen del dispositivo a Storage y devuelve la URL publica de descarga.
 * @param {File} file
 * @param {string} uid - Firebase Auth uid (debe coincidir con las reglas Storage)
 */
export async function uploadProductImage(file, uid) {
  if (!(file instanceof File) || file.size <= 0) {
    throw new Error('Selecciona un archivo de imagen valido.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('La imagen supera 6 MB. Elige otra mas pequena.');
  }
  const type = String(file.type || '');
  if (!type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen (JPG, PNG, WebP, etc.).');
  }
  const base =
    (file.name && file.name.includes('.'))
      ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      : 'foto.jpg';
  const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}_${base}`;
  const storageRef = ref(storage, `productos/${uid}/${safeName}`);
  await uploadBytes(storageRef, file, { contentType: type });
  return getDownloadURL(storageRef);
}
