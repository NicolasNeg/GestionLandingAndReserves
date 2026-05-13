/** Coordenadas normalizadas 0–1 respecto al lienzo lógico (ancho/alto del documento). */

export type NormRect = { nx: number; ny: number; nw: number; nh: number };

export function pixelRectToNorm(
  x: number,
  y: number,
  w: number,
  h: number,
  canvasW: number,
  canvasH: number
): NormRect {
  const cw = Math.max(1, canvasW);
  const ch = Math.max(1, canvasH);
  return { nx: x / cw, ny: y / ch, nw: w / cw, nh: h / ch };
}

export function normRectToPixel(n: NormRect, canvasW: number, canvasH: number) {
  return {
    x: n.nx * canvasW,
    y: n.ny * canvasH,
    width: n.nw * canvasW,
    height: n.nh * canvasH
  };
}

export function pixelPointToNorm(x: number, y: number, canvasW: number, canvasH: number) {
  const cw = Math.max(1, canvasW);
  const ch = Math.max(1, canvasH);
  return { nx: x / cw, ny: y / ch };
}

export function normPointToPixel(nx: number, ny: number, canvasW: number, canvasH: number) {
  return { x: nx * canvasW, y: ny * canvasH };
}
