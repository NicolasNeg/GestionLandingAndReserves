/**
 * Editor de mapa con React + Konva (experimental).
 * Activa: localStorage.setItem('USE_REACT_KONVA_MAP', '1') y recarga.
 * O variable de entorno VITE_USE_REACT_KONVA_MAP=true al construir.
 */
export function useReactKonvaMapEditor() {
  try {
    if (import.meta.env?.VITE_USE_REACT_KONVA_MAP === 'true') return true;
  } catch {
    /* no import.meta en tests */
  }
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem('USE_REACT_KONVA_MAP') === '1';
}

/** Vista pública del mapa en landing con Konva (misma data JSON). */
export function useReactKonvaPublicMap() {
  try {
    if (import.meta.env?.VITE_USE_REACT_KONVA_PUBLIC_MAP === 'true') return true;
  } catch {
    /* */
  }
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem('USE_REACT_KONVA_PUBLIC_MAP') === '1';
}
