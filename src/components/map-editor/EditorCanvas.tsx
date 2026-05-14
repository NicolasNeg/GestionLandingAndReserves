import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Group, Image, Layer, Line, Rect, Stage } from 'react-konva';
import Konva from 'konva';
import { docUsesSemiRealProfile } from '../../lib/mapEngine/visual/mapPublicVisual.js';
import { normalizeMapViewName } from '../../lib/mapEngine/mapViewVisibility.js';
import { useMapEditorStore } from '../../store/map-editor-store';
import { CanvasObjectRenderer } from './CanvasObjectRenderer';
import { SelectionHandles } from './SelectionHandles';

function useBgImage(url: string | undefined) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) {
      setImg(null);
      return;
    }
    const im = new window.Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => setImg(im);
    im.onerror = () => setImg(null);
    im.src = url;
  }, [url]);
  return img;
}

function usePixelRatio() {
  const [dpr, setDpr] = useState(() => Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2));
  useEffect(() => {
    const ro = () => setDpr(Math.min(window.devicePixelRatio || 1, 2));
    ro();
    window.addEventListener('resize', ro);
    return () => window.removeEventListener('resize', ro);
  }, []);
  return dpr;
}

/** Alineado con mapRenderer.drawParkGradient + drawParkDecor (sin ondas completas). */
function parkGradientStops(view: string): (number | string)[] {
  const v = normalizeMapViewName(view);
  if (v === 'estacionamiento') {
    return [0, '#101827', 0.52, '#172033', 1, '#0f172a'];
  }
  if (v === 'mesas') {
    return [0, '#ecfdf5', 0.55, '#f8fafc', 1, '#eef6ff'];
  }
  return [0, '#f0fdfa', 0.5, '#f8fafc', 1, '#e0f2fe'];
}

function computeBgImageLayout(
  docW: number,
  docH: number,
  img: HTMLImageElement,
  fit: string
): { x: number; y: number; scale: number; cropW: number; cropH: number; cropX: number; cropY: number } {
  const iw = Math.max(1, img.naturalWidth || img.width);
  const ih = Math.max(1, img.naturalHeight || img.height);
  const f = String(fit || 'cover').toLowerCase();
  if (f === 'stretch') {
    return { x: 0, y: 0, scale: 1, cropW: iw, cropH: ih, cropX: 0, cropY: 0 };
  }
  const scaleContain = Math.min(docW / iw, docH / ih);
  const scaleCover = Math.max(docW / iw, docH / ih);
  const scale = f === 'contain' ? scaleContain : scaleCover;
  const dispW = iw * scale;
  const dispH = ih * scale;
  const x = (docW - dispW) / 2;
  const y = (docH - dispH) / 2;
  return { x, y, scale, cropW: iw, cropH: ih, cropX: 0, cropY: 0 };
}

export function MapEditorCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Record<string, Konva.Node>>({});
  const [size, setSize] = useState({ w: 900, h: 520 });
  const panningRef = useRef(false);
  const lastClientRef = useRef({ x: 0, y: 0 });
  const [, bumpPanCursor] = useState(0);
  const doc = useMapEditorStore((s) => s.doc);
  const selectedIds = useMapEditorStore((s) => s.selectedIds);
  const tool = useMapEditorStore((s) => s.tool);
  const previewMode = useMapEditorStore((s) => s.previewMode);
  const gridVisible = useMapEditorStore((s) => s.gridVisible);
  const zoom = useMapEditorStore((s) => s.zoom);
  const panX = useMapEditorStore((s) => s.panX);
  const panY = useMapEditorStore((s) => s.panY);
  const selectItemById = useMapEditorStore((s) => s.selectItemById);
  const patchItemById = useMapEditorStore((s) => s.patchItemById);

  const bgUrl = String(doc.background?.url || '').trim() || undefined;
  const bgImg = useBgImage(bgUrl);
  const dpr = usePixelRatio();
  const docView = normalizeMapViewName(doc.view || 'global');
  const bgType = String(doc.background?.type || 'park').toLowerCase();
  const imgFit = ['cover', 'contain', 'stretch'].includes(String(doc.background?.fit || '').toLowerCase())
    ? String(doc.background?.fit).toLowerCase()
    : 'cover';
  const bgLayout = useMemo(() => {
    if (!bgImg || !bgUrl) return null;
    return computeBgImageLayout(doc.width, doc.height, bgImg, imgFit);
  }, [bgImg, bgUrl, doc.width, doc.height, imgFit]);

  useEffect(() => {
    if (tool !== 'pan') panningRef.current = false;
  }, [tool]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.max(320, Math.round(r.width));
      const h = Math.max(280, Math.round(r.height));
      setSize((prev) => {
        if (prev.w === w && prev.h === h) {
          useMapEditorStore.getState().setEditorViewport(w, h);
          return prev;
        }
        const st = useMapEditorStore.getState();
        const { panX, panY, zoom, doc } = st;
        const dw = Math.max(1, Number(doc.width) || 1);
        const dh = Math.max(1, Number(doc.height) || 1);
        const fitOld = Math.min(prev.w / dw, prev.h / dh) * 0.94 * zoom;
        const fitNew = Math.min(w / dw, h / dh) * 0.94 * zoom;
        const newPanX = (prev.w - dw * fitOld) / 2 + panX - (w - dw * fitNew) / 2;
        const newPanY = (prev.h - dh * fitOld) / 2 + panY - (h - dh * fitNew) / 2;
        queueMicrotask(() => {
          useMapEditorStore.getState().setEditorViewport(w, h);
          useMapEditorStore.getState().setPan(newPanX, newPanY);
        });
        return { w, h };
      });
    };
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    ro.observe(el);
    measure();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const fit = useMemo(() => {
    const sx = size.w / Math.max(1, doc.width);
    const sy = size.h / Math.max(1, doc.height);
    return Math.min(sx, sy) * 0.94 * zoom;
  }, [size, doc.width, doc.height, zoom]);

  useEffect(() => {
    useMapEditorStore.getState().setEditorViewport(size.w, size.h);
  }, [size.w, size.h]);

  const itemsSorted = useMemo(() => {
    return [...(doc.items || [])].sort((a: any, b: any) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0));
  }, [doc.items]);

  const primarySelected = selectedIds[0];
  const primaryNode = primarySelected ? nodeRefs.current[primarySelected] : null;

  useEffect(() => {
    const tr = trRef.current;
    if (!tr || previewMode) return;
    const n = primaryNode;
    const okGroup =
      n?.getClassName?.() === 'Group' &&
      ((n as Konva.Group).name() === 'map-item-table' || (n as Konva.Group).name() === 'map-item-pool');
    if (n && (n.getClassName?.() === 'Rect' || n.getClassName?.() === 'Ellipse' || n.getClassName?.() === 'Image' || okGroup)) {
      tr.nodes([n]);
      tr.getLayer()?.batchDraw();
    } else {
      tr.nodes([]);
    }
  }, [primaryNode, previewMode, itemsSorted, selectedIds]);

  const handleTransformEnd = useCallback(() => {
    const tr = trRef.current;
    if (!tr || previewMode) return;
    const id = useMapEditorStore.getState().selectedIds[0];
    const raw = tr.nodes()[0] as Konva.Rect | Konva.Ellipse | Konva.Image | Konva.Group | undefined;
    if (!raw || !id) return;
    const patch = useMapEditorStore.getState().patchItemById;
    const name = raw.getClassName();
    if (name === 'Group' && ((raw as Konva.Group).name() === 'map-item-table' || (raw as Konva.Group).name() === 'map-item-pool')) {
      const g = raw as Konva.Group;
      const inner = g.findOne<Konva.Rect>('.map-item-bounds');
      if (!inner) return;
      const bw = Math.max(8, inner.width() * g.scaleX());
      const bh = Math.max(8, inner.height() * g.scaleY());
      patch(id, {
        x: g.x() - bw / 2,
        y: g.y() - bh / 2,
        width: bw,
        height: bh,
        rotation: g.rotation()
      });
      g.scaleX(1);
      g.scaleY(1);
      inner.width(bw);
      inner.height(bh);
      g.offsetX(bw / 2);
      g.offsetY(bh / 2);
      return;
    }
    if (name === 'Rect' || name === 'Image') {
      const n = raw as Konva.Rect;
      patch(id, {
        x: n.x(),
        y: n.y(),
        width: Math.max(8, n.width() * n.scaleX()),
        height: Math.max(8, n.height() * n.scaleY()),
        rotation: n.rotation()
      });
      n.scaleX(1);
      n.scaleY(1);
    } else if (name === 'Ellipse') {
      const el = raw as Konva.Ellipse;
      const rx = el.radiusX() * el.scaleX();
      const ry = el.radiusY() * el.scaleY();
      patch(id, {
        x: el.x() - rx,
        y: el.y() - ry,
        width: Math.max(8, rx * 2),
        height: Math.max(8, ry * 2),
        rotation: el.rotation()
      });
      el.scaleX(1);
      el.scaleY(1);
    }
  }, [previewMode]);

  const handleStageWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      if (Math.abs(e.evt.deltaX) > Math.abs(e.evt.deltaY) * 1.15) return;
      e.evt.preventDefault();
      const stage = e.target.getStage();
      if (!stage) return;
      useMapEditorStore.getState().setEditorViewport(size.w, size.h);
      const st = useMapEditorStore.getState();
      const fine = e.evt.ctrlKey || e.evt.metaKey;
      const step = fine ? 0.07 : 0.05;
      const dir = e.evt.deltaY > 0 ? -1 : 1;
      const rect = stage.container().getBoundingClientRect();
      const px = e.evt.clientX - rect.left;
      const py = e.evt.clientY - rect.top;
      st.setZoomAnchored(st.zoom + dir * step, px, py);
    },
    [size.w, size.h]
  );

  const gridLines = useMemo(() => {
    if (!gridVisible) return null;
    const g = Number(doc.grid?.size || 20);
    const dark = docView === 'estacionamiento';
    const minor = dark ? 'rgba(148,163,184,0.13)' : 'rgba(15,23,42,0.055)';
    const major = dark ? 'rgba(34,211,238,0.18)' : 'rgba(14,116,144,0.11)';
    const majorStep = g * 4;
    const lines: JSX.Element[] = [];
    for (let x = 0; x <= doc.width; x += g) {
      const isM = x % majorStep === 0;
      lines.push(
        <Line
          key={`gx-${x}`}
          points={[x, 0, x, doc.height]}
          stroke={isM ? major : minor}
          strokeWidth={(isM ? 1.35 : 1) / fit}
        />
      );
    }
    for (let y = 0; y <= doc.height; y += g) {
      const isM = y % majorStep === 0;
      lines.push(
        <Line
          key={`gy-${y}`}
          points={[0, y, doc.width, y]}
          stroke={isM ? major : minor}
          strokeWidth={(isM ? 1.35 : 1) / fit}
        />
      );
    }
    return lines;
  }, [gridVisible, doc.width, doc.height, doc.grid, fit, docView]);

  const parkGradientStopsMemo = useMemo(() => parkGradientStops(docView), [docView]);

  const baseBackground = useMemo(() => {
    if (bgType === 'none') {
      return <Rect width={doc.width} height={doc.height} fill="#f1f5f9" listening={false} />;
    }
    if (bgType === 'color') {
      const fill = String(doc.background?.fill || '#f8fafc');
      return <Rect width={doc.width} height={doc.height} fill={fill} listening={false} />;
    }
    return (
      <Rect
        width={doc.width}
        height={doc.height}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: doc.width, y: doc.height }}
        fillLinearGradientColorStops={parkGradientStopsMemo}
        listening={false}
      />
    );
  }, [bgType, doc.width, doc.height, doc.background?.fill, parkGradientStopsMemo]);

  const semiRealOverlay =
    docUsesSemiRealProfile(doc) && bgType !== 'none' ? (
      <Rect
        width={doc.width}
        height={doc.height}
        fillRadialGradientStartPoint={{ x: doc.width * 0.2, y: doc.height * 0.15 }}
        fillRadialGradientEndPoint={{ x: doc.width * 0.55, y: doc.height * 0.5 }}
        fillRadialGradientColorStops={[
          0,
          'rgba(255,255,255,0.72)',
          0.45,
          'rgba(226,232,240,0.28)',
          1,
          docView === 'estacionamiento' ? 'rgba(15,23,42,0.14)' : 'rgba(15,118,110,0.1)'
        ]}
        globalCompositeOperation="multiply"
        opacity={docView === 'estacionamiento' ? 0.14 : 0.1}
        listening={false}
      />
    ) : null;

  const docFrameStroke =
    docView === 'estacionamiento' ? 'rgba(34, 211, 238, 0.46)' : 'rgba(15, 118, 110, 0.48)';
  const docFrameDash = docView === 'estacionamiento' ? [10 / fit, 8 / fit] : [];
  const docFrame = (
    <Rect
      x={1.5}
      y={1.5}
      width={doc.width - 3}
      height={doc.height - 3}
      fillEnabled={false}
      stroke={docFrameStroke}
      strokeWidth={(docView === 'estacionamiento' ? 2.4 : 3) / fit}
      dash={docFrameDash}
      listening={false}
    />
  );

  const bgImageLayer =
    bgImg && bgLayout && bgUrl ? (
      <Group
        listening={false}
        clipFunc={(ctx) => {
          ctx.rect(0, 0, doc.width, doc.height);
        }}
      >
        {imgFit === 'stretch' ? (
          <Image
            image={bgImg}
            x={0}
            y={0}
            width={doc.width}
            height={doc.height}
            opacity={Number(doc.background?.opacity ?? 1)}
            listening={false}
          />
        ) : (
          <Image
            image={bgImg}
            x={bgLayout.x}
            y={bgLayout.y}
            width={bgImg.naturalWidth || bgImg.width}
            height={bgImg.naturalHeight || bgImg.height}
            scaleX={bgLayout.scale}
            scaleY={bgLayout.scale}
            opacity={Number(doc.background?.opacity ?? 1)}
            listening={false}
          />
        )}
      </Group>
    ) : null;

  const panCursor = tool === 'pan' && !previewMode;
  const grabbing = panningRef.current && panCursor;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (tool !== 'pan' || previewMode) return;
    if (e.button !== 0) return;
    panningRef.current = true;
    lastClientRef.current = { x: e.clientX, y: e.clientY };
    bumpPanCursor((n) => n + 1);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!panningRef.current || tool !== 'pan' || previewMode) return;
    const dx = e.clientX - lastClientRef.current.x;
    const dy = e.clientY - lastClientRef.current.y;
    lastClientRef.current = { x: e.clientX, y: e.clientY };
    const st = useMapEditorStore.getState();
    st.setPan(st.panX + dx, st.panY + dy);
  };

  const endPointerPan = (e: React.PointerEvent) => {
    if (!panningRef.current) return;
    panningRef.current = false;
    bumpPanCursor((n) => n + 1);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      ref={wrapRef}
      className={`af-canvas-shell relative min-h-0 w-full flex-1 overflow-hidden rounded-lg border shadow-[inset_0_1px_0_rgb(255_255_255/0.9)] ${
        panCursor ? 'touch-none' : ''
      } ${grabbing ? 'cursor-grabbing' : panCursor ? 'cursor-grab' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointerPan}
      onPointerCancel={endPointerPan}
    >
      <Stage
        width={size.w}
        height={size.h}
        style={{ display: 'block' }}
        pixelRatio={dpr}
        onWheel={handleStageWheel}
      >
        <Layer>
          <Group
            x={(size.w - doc.width * fit) / 2 + panX}
            y={(size.h - doc.height * fit) / 2 + panY}
            scaleX={fit}
            scaleY={fit}
            listening
          >
            {baseBackground}
            {bgImageLayer}
            {semiRealOverlay}
            {gridLines}
            <CanvasObjectRenderer
              itemsSorted={itemsSorted}
              selectedIds={selectedIds}
              fit={fit}
              tool={tool}
              previewMode={previewMode}
              nodeRefs={nodeRefs}
              selectItemById={selectItemById}
              patchItemById={patchItemById}
            />
            {docFrame}
            <SelectionHandles ref={trRef} previewMode={previewMode} onTransformEnd={handleTransformEnd} />
          </Group>
        </Layer>
      </Stage>
      <div className="pointer-events-none absolute bottom-3 left-3 max-w-[min(100%,16rem)] rounded-md border border-[color:var(--af-line)] bg-[color:var(--af-canvas-hint-bg)] px-2.5 py-1 text-[10px] leading-snug text-[color:var(--af-muted)] backdrop-blur-sm">
        {tool === 'pan'
          ? 'Arrastra para mover el lienzo.'
          : 'Rueda vertical para zoom (Ctrl/⌘ = paso más fino). Selecciona y arrastra piezas.'}
      </div>
    </div>
  );
}

export { MapEditorCanvas as EditorCanvas };
