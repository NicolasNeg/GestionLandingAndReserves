import { useEffect, useRef, type RefObject } from 'react';
import type Konva from 'konva';
import { clampCameraScale, constrainAquaMapCamera, type CameraLimits, type CameraState } from './aquaMapCameraConstraints';
import { computeCanvasLayout } from './aquaMapCanvasCoords';

type Viewport = { width: number; height: number; worldW: number; worldH: number };

function pointerDistance(a: PointerEvent, b: PointerEvent) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/** Pinch-to-zoom en contenedor del stage (landing / vista previa). */
export function useAquamapPinchZoom(
  stageRef: RefObject<Konva.Stage | null>,
  enabled: boolean,
  camera: CameraState,
  applyCamera: (next: CameraState | ((prev: CameraState) => CameraState)) => void,
  viewport: Viewport,
  limits: CameraLimits
) {
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  const pinchStartRef = useRef<{
    distance: number;
    scale: number;
    cx: number;
    cy: number;
    gx: number;
    gy: number;
    oldS: number;
  } | null>(null);
  const pointersRef = useRef(new Map<number, PointerEvent>());

  useEffect(() => {
    if (!enabled) return;
    const stage = stageRef.current;
    if (!stage) return;
    const container = stage.container();
    container.style.touchAction = 'none';

    const zoomAt = (clientX: number, clientY: number, nextScale: number) => {
      const rect = container.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const cam = cameraRef.current;
      const oldLayout = computeCanvasLayout(
        viewport.width,
        viewport.height,
        viewport.worldW,
        viewport.worldH,
        cam.scale
      );
      const newLayout = computeCanvasLayout(
        viewport.width,
        viewport.height,
        viewport.worldW,
        viewport.worldH,
        nextScale
      );
      const wx = (px - cam.x - oldLayout.groupX) / oldLayout.scale;
      const wy = (py - cam.y - oldLayout.groupY) / oldLayout.scale;
      const next = constrainAquaMapCamera(
        {
          scale: nextScale,
          x: px - newLayout.groupX - wx * newLayout.scale,
          y: py - newLayout.groupY - wy * newLayout.scale
        },
        { width: viewport.width, height: viewport.height },
        { w: viewport.worldW, h: viewport.worldH },
        limits
      );
      applyCamera(next);
    };

    const onPointerDown = (e: PointerEvent) => {
      pointersRef.current.set(e.pointerId, e);
      container.setPointerCapture?.(e.pointerId);
      if (pointersRef.current.size === 2) {
        const [a, b] = [...pointersRef.current.values()];
        const layout = computeCanvasLayout(
          viewport.width,
          viewport.height,
          viewport.worldW,
          viewport.worldH,
          cameraRef.current.scale
        );
        pinchStartRef.current = {
          distance: pointerDistance(a, b),
          scale: cameraRef.current.scale,
          cx: (a.clientX + b.clientX) / 2,
          cy: (a.clientY + b.clientY) / 2,
          gx: layout.groupX,
          gy: layout.groupY,
          oldS: layout.scale
        };
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, e);
      const pinch = pinchStartRef.current;
      if (pointersRef.current.size !== 2 || !pinch) return;
      e.preventDefault();
      const [a, b] = [...pointersRef.current.values()];
      const d = pointerDistance(a, b);
      if (d < 2) return;
      const cx = (a.clientX + b.clientX) / 2;
      const cy = (a.clientY + b.clientY) / 2;
      const nextScale = clampCameraScale(pinch.scale * (d / pinch.distance), limits);
      zoomAt(cx, cy, nextScale);
    };

    const clearPointer = (e: PointerEvent) => {
      pointersRef.current.delete(e.pointerId);
      container.releasePointerCapture?.(e.pointerId);
      if (pointersRef.current.size < 2) pinchStartRef.current = null;
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove, { passive: false });
    container.addEventListener('pointerup', clearPointer);
    container.addEventListener('pointercancel', clearPointer);

    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', clearPointer);
      container.removeEventListener('pointercancel', clearPointer);
    };
  }, [applyCamera, enabled, limits, stageRef, viewport]);
}
