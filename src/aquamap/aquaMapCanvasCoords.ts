export const ISO_VISUAL_W_FACTOR = 1.12;
export const ISO_VISUAL_H_FACTOR = 0.96;

export function computeCanvasLayout(
  width: number,
  height: number,
  worldW: number,
  worldH: number,
  cameraScale: number
): { scale: number; groupX: number; groupY: number } {
  const vw = worldW * ISO_VISUAL_W_FACTOR;
  const vh = worldH * ISO_VISUAL_H_FACTOR;
  const baseFit = Math.min(width / vw, height / vh) * 0.88;
  const scale = baseFit * cameraScale;
  return {
    scale,
    groupX: (width - worldW * scale) / 2,
    groupY: (height - worldH * scale) / 2
  };
}

export function pointerToWorld(
  pointer: { x: number; y: number },
  camera: { x: number; y: number },
  layout: { scale: number; groupX: number; groupY: number },
  worldW: number,
  worldH: number
): { x: number; y: number } {
  const wx = (pointer.x - camera.x - layout.groupX) / layout.scale;
  const wy = (pointer.y - camera.y - layout.groupY) / layout.scale;
  return {
    x: Math.max(0, Math.min(worldW, Math.round(wx))),
    y: Math.max(0, Math.min(worldH, Math.round(wy)))
  };
}
