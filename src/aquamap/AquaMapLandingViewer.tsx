import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import { AquaMapBootOverlay } from './AquaMapBootOverlay';
import { AquaMapCanvas } from './AquaMapCanvas';
import { AquaMapLegend } from './AquaMapLegend';
import {
  constrainAquaMapCamera,
  LANDING_CAMERA_LIMITS,
  landingFitCamera,
  clampCameraScale
} from './aquaMapCameraConstraints';
import type { ElementType, MapElement } from './types';
import { ensureAquamapEnvelopeFromSiteJson, type AquamapSiteEnvelope } from './siteEnvelope';
import { defaultSpriteForType } from './spriteUrls';
import './aquamapEditor.css';

export type AquaMapLandingViewerHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  fit: () => void;
  getViewportElement: () => HTMLElement | null;
  setDrawOptions: (_patch: Record<string, unknown>) => void;
  getDocument: () => null;
  destroy: () => void;
};

type Props = {
  jsonStr: string;
  onSelectElement: (el: MapElement | null) => void;
};

async function preloadImageUrls(urls: string[]): Promise<void> {
  await Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          if (src.startsWith('data:')) {
            resolve();
            return;
          }
          const im = new window.Image();
          im.crossOrigin = 'anonymous';
          im.onload = () => resolve();
          im.onerror = () => resolve();
          im.src = src;
        })
    )
  );
}

function collectAssetUrls(envelope: AquamapSiteEnvelope): string[] {
  const set = new Set<string>();
  const types: ElementType[] = ['pool', 'slide', 'service', 'tree'];
  for (const t of types) set.add(defaultSpriteForType(t));
  for (const el of envelope.elements) {
    const u = el.imgSrc?.trim();
    if (u && !u.startsWith('data:')) set.add(u);
  }
  return [...set];
}

export const AquaMapLandingViewer = forwardRef<AquaMapLandingViewerHandle, Props>(function AquaMapLandingViewer(
  { jsonStr, onSelectElement },
  ref
) {
  const [envelope, setEnvelope] = useState<AquamapSiteEnvelope>(() => ensureAquamapEnvelopeFromSiteJson(jsonStr));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [booting, setBooting] = useState(true);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 800, h: 600 });

  const viewport = useMemo(() => ({ width: stageSize.w, height: stageSize.h }), [stageSize]);
  const world = useMemo(() => ({ w: envelope.world.w, h: envelope.world.h }), [envelope.world]);

  const setCameraLanding = useCallback(
    (next: typeof camera | ((prev: typeof camera) => typeof camera)) => {
      setCamera((prev) => {
        const raw = typeof next === 'function' ? next(prev) : next;
        return constrainAquaMapCamera(raw, viewport, world, LANDING_CAMERA_LIMITS);
      });
    },
    [viewport, world]
  );

  const fitCamera = useCallback(() => {
    setCamera(landingFitCamera(viewport, world, LANDING_CAMERA_LIMITS));
  }, [viewport, world]);

  useEffect(() => {
    setEnvelope(ensureAquamapEnvelopeFromSiteJson(jsonStr));
    setSelectedId(null);
    setCamera(landingFitCamera(viewport, world, LANDING_CAMERA_LIMITS));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset al cambiar JSON
  }, [jsonStr]);

  useEffect(() => {
    setCameraLanding((c) => c);
  }, [stageSize.w, stageSize.h, envelope.world.w, envelope.world.h, setCameraLanding]);

  useEffect(() => {
    let cancelled = false;
    setBooting(true);
    const env = ensureAquamapEnvelopeFromSiteJson(jsonStr);
    void (async () => {
      await preloadImageUrls(collectAssetUrls(env));
      await new Promise((r) => window.setTimeout(r, 200));
      if (!cancelled) setBooting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [jsonStr]);

  useEffect(() => {
    const el = mapWrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setStageSize({ w: Math.max(280, Math.floor(r.width)), h: Math.max(240, Math.floor(r.height)) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const elementsSorted = useMemo(
    () => [...envelope.elements].sort((a, b) => a.y - b.y),
    [envelope.elements]
  );

  const selected = useMemo(
    () => (selectedId ? envelope.elements.find((e) => e.id === selectedId) ?? null : null),
    [envelope.elements, selectedId]
  );

  useEffect(() => {
    onSelectElement(selected);
  }, [selected, onSelectElement]);

  const onElementGeometryChange = useCallback(() => {}, []);

  const zoomIn = useCallback(() => {
    setCameraLanding((c) => ({
      ...c,
      scale: clampCameraScale(c.scale * 1.12, LANDING_CAMERA_LIMITS)
    }));
  }, [setCameraLanding]);

  const zoomOut = useCallback(() => {
    setCameraLanding((c) => ({
      ...c,
      scale: clampCameraScale(c.scale / 1.12, LANDING_CAMERA_LIMITS)
    }));
  }, [setCameraLanding]);

  const reset = useCallback(() => {
    fitCamera();
  }, [fitCamera]);

  const fit = useCallback(() => {
    fitCamera();
  }, [fitCamera]);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn,
      zoomOut,
      reset,
      fit,
      getViewportElement: () => mapWrapRef.current,
      setDrawOptions: () => {},
      getDocument: () => null,
      destroy: () => {}
    }),
    [zoomIn, zoomOut, reset, fit]
  );

  return (
    <div
      ref={mapWrapRef}
      className="aquamap-artboard relative h-full w-full overflow-hidden"
      data-aquamap-landing-viewer
    >
      {booting ? <AquaMapBootOverlay subtitle="Vista publica del parque" /> : null}
      <AquaMapCanvas
        width={stageSize.w}
        height={stageSize.h}
        worldW={envelope.world.w}
        worldH={envelope.world.h}
        elementsSorted={elementsSorted}
        camera={camera}
        setCamera={setCameraLanding}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        onElementGeometryChange={onElementGeometryChange}
        readOnly
        blockElementPointer={false}
        cameraLimits={LANDING_CAMERA_LIMITS}
      />
      <AquaMapLegend />
    </div>
  );
});
