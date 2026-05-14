/**
 * Proyección isométrica ligera (2.5D): mismos datos x,y en el documento;
 * la transformación es solo visual + orden de pintado + snap a rejilla oblicua.
 */

/** Rotación típica 2:1 isométrica (grados, sentido Konva). */
export const ISO_GROUP_ROTATION_DEG = -30;

/** Aplastamiento vertical para sensación de plano inclinado. */
export const ISO_GROUP_SCALE_Y = 0.58;

/**
 * Snap de un punto (esquina superior izquierda del bbox) a la rejilla oblicua
 * u = x + y, v = x − y en pasos de `step`.
 */
export function snapMapPositionToIsoGrid(x, y, step) {
  const s = Math.max(4, Number(step) || 20);
  const u = (x + y) / s;
  const v = (x - y) / s;
  const uq = Math.round(u);
  const vq = Math.round(v);
  return {
    x: ((uq + vq) / 2) * s,
    y: ((uq - vq) / 2) * s
  };
}

/** Orden de pintado “profundidad”: más abajo en el mapa se dibuja encima (painter). */
export function compareIsoDrawDepth(a, b) {
  const ad = Number(a.y || 0) + Number(a.height || 0);
  const bd = Number(b.y || 0) + Number(b.height || 0);
  if (Math.abs(ad - bd) > 0.5) return ad - bd;
  const az = Number(a.zIndex ?? 0);
  const bz = Number(b.zIndex ?? 0);
  return az - bz;
}

/**
 * Invierte la misma transformación que `applyIsoCanvasTransform` en mapRenderer
 * (punto en coordenadas de documento “planas” del lienzo → espacio lógico del mapa).
 */
export function inverseIsoCanvasPoint(doc, x, y) {
  const w = Number(doc?.width) || 0;
  const h = Number(doc?.height) || 0;
  const cx = w / 2;
  const cy = h / 2;
  const rad = (ISO_GROUP_ROTATION_DEG * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const v3x = x - cx;
  const v3y = y - cy;
  const v2x = v3x * cos + v3y * sin;
  const v2y = -v3x * sin + v3y * cos;
  const v1x = v2x;
  const v1y = v2y / ISO_GROUP_SCALE_Y;
  return { x: v1x + cx, y: v1y + cy };
}

/** AABB en espacio lógico que contiene la preimagen iso de un rect en pantalla (marquee). */
export function marqueeRectToLogicalAabb(doc, rect) {
  if (!doc?.publicMapUi?.isometric || !rect) return rect;
  const x1 = rect.x;
  const y1 = rect.y;
  const x2 = rect.x + rect.width;
  const y2 = rect.y + rect.height;
  const corners = [
    inverseIsoCanvasPoint(doc, x1, y1),
    inverseIsoCanvasPoint(doc, x2, y1),
    inverseIsoCanvasPoint(doc, x1, y2),
    inverseIsoCanvasPoint(doc, x2, y2)
  ];
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
