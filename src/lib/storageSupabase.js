/**
 * Storage en Supabase. Bucket por defecto: VITE_SUPABASE_STORAGE_BUCKET (ej. app-uploads).
 * Políticas: lectura pública si el bucket es público; escritura autenticada por prefijo uid/.
 */
import { supabase } from '../supabase/client.js';

const MAX_BYTES = 6 * 1024 * 1024;

function bucketName() {
  const b = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET;
  return typeof b === 'string' && b.trim() ? b.trim() : 'app-uploads';
}

function requireClient() {
  if (!supabase) throw new Error('Supabase no inicializado');
  return supabase;
}

function validateImage(file) {
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
  return type;
}

async function uploadToBucket(path, file, contentType) {
  const sb = requireClient();
  const bucket = bucketName();
  const { error } = await sb.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType
  });
  if (error) {
    const msg = String(error?.message || '');
    if (error?.statusCode === '404' || msg.toLowerCase().includes('bucket')) {
      throw new Error('El bucket app-uploads no existe. Ejecuta patch_storage_app_uploads.sql.');
    }
    if (error?.statusCode === '403' || msg.toLowerCase().includes('row-level security')) {
      throw new Error('No tienes permiso para subir imagenes en esta seccion.');
    }
    throw error;
  }
  const {
    data: { publicUrl }
  } = sb.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}

export async function uploadProductImage(file, uid) {
  const type = validateImage(file);
  const base =
    file.name && file.name.includes('.')
      ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      : 'foto.jpg';
  const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}_${base}`;
  const path = `products/${uid}/${safeName}`;
  return uploadToBucket(path, file, type);
}

export async function uploadAvatarImage(file, uid) {
  const type = validateImage(file);
  const base =
    file.name && file.name.includes('.') ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_') : 'avatar.jpg';
  const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}_${base}`;
  const path = `avatars/${uid}/${safeName}`;
  return uploadToBucket(path, file, type);
}

export async function uploadServiceImage(file, uid) {
  const type = validateImage(file);
  const base =
    file.name && file.name.includes('.') ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_') : 'servicio.jpg';
  const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}_${base}`;
  const path = `services/${uid}/${safeName}`;
  return uploadToBucket(path, file, type);
}

export async function deleteImage(pathOrUrl) {
  const sb = requireClient();
  const bucket = bucketName();
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = String(pathOrUrl || '').indexOf(marker);
  const objectPath = idx >= 0 ? pathOrUrl.slice(idx + marker.length) : String(pathOrUrl || '').replace(/^\//, '');
  if (!objectPath) throw new Error('Ruta de objeto invalida');
  const { error } = await sb.storage.from(bucket).remove([objectPath]);
  if (error) throw error;
}

export function getPublicUrl(path) {
  const sb = requireClient();
  const bucket = bucketName();
  const {
    data: { publicUrl }
  } = sb.storage.from(bucket).getPublicUrl(path.replace(/^\//, ''));
  return publicUrl;
}
