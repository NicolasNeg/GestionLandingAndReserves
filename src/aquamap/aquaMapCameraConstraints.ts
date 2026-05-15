import { computeCanvasLayout } from './aquaMapCanvasCoords';

export type CameraState = { x: number; y: number; scale: number };

export type CameraLimits = {
  minScale: number;
  maxScale: number;
  /** Margen en px permitido fuera del lienzo al hacer pan */
  panPadding: number;
  constrainPan: boolean;
};

export const EDITOR_CAMERA_LIMITS: CameraLimits = {
  minScale: 0.42,
  maxScale: 2.35,
  panPadding: 0,
  constrainPan: false
};

/** Vista pública: sin alejarse del encuadre ni desplazarse fuera del mapa */
export const LANDING_CAMERA_LIMITS: CameraLimits = {
  minScale: 1,
  maxScale: 1.85,
  panPadding: 36,
  constrainPan: true
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

export function clampCameraScale(scale: number, limits: CameraLimits): number {
  return clamp(scale, limits.minScale, limits.maxScale);
}

export function clampCameraPosition(
  camera: CameraState,
  viewport: { width: number; height: number },
  world: { w: number; h: number },
  limits: CameraLimits
): Pick<CameraState, 'x' | 'y'> {
  if (!limits.constrainPan || viewport.width <= 0 || viewport.height <= 0) {
    return { x: camera.x, y: camera.y };
  }

  const layout = computeCanvasLayout(viewport.width, viewport.height, world.w, world.h, camera.scale);
  const { groupX, groupY, scale: s } = layout;
  const mapW = world.w * s;
  const mapH = world.h * s;
  const pad = limits.panPadding;

  let minX: number;
  let maxX: number;
  if (mapW <= viewport.width) {
    const centered = (viewport.width - mapW) / 2 - groupX;
    minX = maxX = centered;
  } else {
    maxX = pad - groupX;
    minX = viewport.width - pad - groupX - mapW;
  }

  let minY: number;
  let maxY: number;
  if (mapH <= viewport.height) {
    const centered = (viewport.height - mapH) / 2 - groupY;
    minY = maxY = centered;
  } else {
    maxY = pad - groupY;
    minY = viewport.height - pad - groupY - mapH;
  }

  return {
    x: clamp(camera.x, minX, maxX),
    y: clamp(camera.y, minY, maxY)
  };
}

export function constrainAquaMapCamera(
  camera: CameraState,
  viewport: { width: number; height: number },
  world: { w: number; h: number },
  limits: CameraLimits
): CameraState {
  const scale = clampCameraScale(camera.scale, limits);
  const scaled = { ...camera, scale };
  const { x, y } = clampCameraPosition(scaled, viewport, world, limits);
  return { x, y, scale };
}

/** Encuadre inicial / reset para landing (scale 1 + centrado con límites) */
export function landingFitCamera(
  viewport: { width: number; height: number },
  world: { w: number; h: number },
  limits: CameraLimits = LANDING_CAMERA_LIMITS
): CameraState {
  return constrainAquaMapCamera({ x: 0, y: 0, scale: 1 }, viewport, world, limits);
}
