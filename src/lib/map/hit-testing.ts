/**
 * Pruebas de puntero sobre documento de mapa (coordenadas de lienzo lógico).
 * El motor detallado sigue en mapHitTesting.js para el canvas legacy.
 */
export function pointInRect(px: number, py: number, x: number, y: number, w: number, h: number) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}
