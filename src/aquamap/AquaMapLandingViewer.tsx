import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import { AquaMapBootOverlay } from './AquaMapBootOverlay';
import { AquaMapCanvas } from './AquaMapCanvas';
import { AquaMapLegend } from './AquaMapLegend';
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

  useEffect(() => {
    setEnvelope(ensureAquamapEnvelopeFromSiteJson(jsonStr));
    setSelectedId(null);
    setCamera({ x: 0, y: 0, scale: 1 });
  }, [jsonStr]);

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
    setCamera((c) => ({ ...c, scale: Math.min(2.35, c.scale * 1.12) }));
  }, []);
  const zoomOut = useCallback(() => {
    setCamera((c) => ({ ...c, scale: Math.max(0.42, c.scale / 1.12) }));
  }, []);
  const reset = useCallback(() => {
    setCamera({ x: 0, y: 0, scale: 1 });
  }, []);
  const fit = useCallback(() => {
    setCamera({ x: 0, y: 0, scale: 1 });
  }, []);

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
    <div ref={mapWrapRef} className="aquamap-artboard relative h-full w-full overflow-hidden">
      {booting ? <AquaMapBootOverlay subtitle="Vista publica del parque" /> : null}
      <AquaMapCanvas
        width={stageSize.w}
        height={stageSize.h}
        worldW={envelope.world.w}
        worldH={envelope.world.h}
        elementsSorted={elementsSorted}
        camera={camera}
        setCamera={setCamera}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        onElementGeometryChange={onElementGeometryChange}
        readOnly
        blockElementPointer={false}
      />
      <AquaMapLegend />
    </div>
  );
});
