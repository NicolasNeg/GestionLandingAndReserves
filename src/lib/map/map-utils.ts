/** Utilidades geométricas ligeras para la barra inferior (área aprox. en px² del documento). */

export function polygonAreaPx(points: { x: number; y: number }[]): number {
  if (!points || points.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    s += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return Math.abs(s / 2);
}

export function polygonPerimeterPx(points: { x: number; y: number }[]): number {
  if (!points || points.length < 2) return 0;
  let p = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const dx = points[j].x - points[i].x;
    const dy = points[j].y - points[i].y;
    p += Math.hypot(dx, dy);
  }
  return p;
}
