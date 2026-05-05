/**
 * Storage actual (Firebase). Sin cambios de firma.
 */
export {
  uploadProductImage,
  uploadServiceImage,
  uploadAvatarImage
} from './uploadProductImage.js';

/** Eliminar objeto no está centralizado en Firebase en esta app; reservado para futura capa común. */
export async function deleteImage() {
  throw new Error('deleteImage no está implementado para Firebase Storage en esta base');
}

/** Las URLs ya son públicas tras subida; passthrough para compatibilidad de interfaz. */
export function getPublicUrl(urlOrPath) {
  return urlOrPath || '';
}
