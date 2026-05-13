import { useEffect, useMemo, useRef, useState } from 'react';
import { Group, Image, Layer, Line, Rect, Stage } from 'react-konva';
import Konva from 'konva';
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

export function MapEditorCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Record<string, Konva.Node>>({});
  const [size, setSize] = useState({ w: 900, h: 520 });
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
  const setPan = useMapEditorStore((s) => s.setPan);
  const setZoom = useMapEditorStore((s) => s.setZoom);

  const bgUrl = String(doc.background?.url || '').trim() || undefined;
  const bgImg = useBgImage(bgUrl);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(320, r.width), h: Math.max(280, r.height) });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setSize({ w: Math.max(320, r.width), h: Math.max(280, r.height) });
    return () => ro.disconnect();
  }, []);

  const fit = useMemo(() => {
    const sx = size.w / Math.max(1, doc.width);
    const sy = size.h / Math.max(1, doc.height);
    return Math.min(sx, sy) * 0.94 * zoom;
  }, [size, doc.width, doc.height, zoom]);

  const itemsSorted = useMemo(() => {
    return [...(doc.items || [])].sort((a: any, b: any) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0));
  }, [doc.items]);

  const primarySelected = selectedIds[0];
  const primaryNode = primarySelected ? nodeRefs.current[primarySelected] : null;

  useEffect(() => {
    const tr = trRef.current;
    if (!tr || previewMode) return;
    const n = primaryNode;
    if (n && (n.getClassName?.() === 'Rect' || n.getClassName?.() === 'Ellipse' || n.getClassName?.() === 'Image')) {
      tr.nodes([n]);
      tr.getLayer()?.batchDraw();
    } else {
      tr.nodes([]);
    }
  }, [primaryNode, previewMode, itemsSorted, selectedIds]);

  const gridLines = useMemo(() => {
    if (!gridVisible) return null;
    const g = Number(doc.grid?.size || 40);
    const lines: JSX.Element[] = [];
    for (let x = 0; x <= doc.width; x += g) {
      lines.push(
        <Line
          key={`gx-${x}`}
          points={[x, 0, x, doc.height]}
          stroke="rgba(14,116,144,0.12)"
          strokeWidth={1 / fit}
        />
      );
    }
    for (let y = 0; y <= doc.height; y += g) {
      lines.push(
        <Line
          key={`gy-${y}`}
          points={[0, y, doc.width, y]}
          stroke="rgba(14,116,144,0.12)"
          strokeWidth={1 / fit}
        />
      );
    }
    return lines;
  }, [gridVisible, doc.width, doc.height, doc.grid, fit]);

  const parkBg =
    String(doc.background?.type || '') === 'park' && !bgImg ? (
      <Rect
        width={doc.width}
        height={doc.height}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: doc.width, y: doc.height }}
        fillLinearGradientColorStops={[0, '#ecfeff', 0.45, '#cffafe', 1, '#a5f3fc']}
      />
    ) : null;

  return (
    <div
      ref={wrapRef}
      className="relative flex min-h-[min(68vh,620px)] w-full flex-1 items-center justify-center overflow-hidden rounded-2xl border border-cyan-100/80 bg-gradient-to-b from-sky-50 via-white to-teal-50/90 shadow-inner"
    >
      <Stage
        width={size.w}
        height={size.h}
        onWheel={(e) => {
          e.evt.preventDefault();
          const dir = e.evt.deltaY > 0 ? -1 : 1;
          setZoom(zoom + dir * 0.08);
        }}
      >
        <Layer>
          <Group
            x={(size.w - doc.width * fit) / 2 + panX}
            y={(size.h - doc.height * fit) / 2 + panY}
            scaleX={fit}
            scaleY={fit}
            draggable={tool === 'pan' && !previewMode}
            onDragEnd={(e) => {
              const baseX = (size.w - doc.width * fit) / 2;
              const baseY = (size.h - doc.height * fit) / 2;
              setPan(e.target.x() - baseX, e.target.y() - baseY);
            }}
          >
          {parkBg}
          {bgImg ? (
            <Image
              image={bgImg}
              x={0}
              y={0}
              width={doc.width}
              height={doc.height}
              opacity={Number(doc.background?.opacity ?? 1)}
            />
          ) : null}
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
          <SelectionHandles ref={trRef} previewMode={previewMode} />
          </Group>
        </Layer>
      </Stage>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-slate-600 shadow">
        {tool === 'pan' ? 'Arrastra el lienzo' : 'Selecciona y arrastra piezas'}
      </div>
    </div>
  );
}

export { MapEditorCanvas as EditorCanvas };
