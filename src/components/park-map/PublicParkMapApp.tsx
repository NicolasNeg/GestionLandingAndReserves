import Konva from 'konva';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from 'react';
import { Circle, Ellipse, Group, Image, Layer, Line, Rect, Stage, Text } from 'react-konva';
import { hitTestMapDocument, getSortedMapItems } from '../../lib/mapEngine/mapHitTesting.js';
import { itemMatchesPublicMapFilter } from '../../lib/mapEngine/mapPublicFilters.js';
import { parseMapDocument } from '../../lib/mapEngine/mapMigrations.js';
import { getMapKind } from '../../lib/mapEngine/mapTypes.js';
import { isMapItemVisibleInView } from '../../lib/mapEngine/mapViewVisibility.js';

export type PublicParkMapMountOptions = {
  view?: string;
  camera?: string;
  publicMapFilter?: string;
  navigationPath?: { x: number; y: number }[];
  onHover?: (
    item: unknown | null,
    index: number,
    point: { x: number; y: number } | null,
    pointer: { clientX: number; clientY: number } | null
  ) => void;
  onSelect?: (item: unknown | null, index: number, point: { x: number; y: number } | null) => void;
};

export type PublicParkMapAppHandle = {
  getDocument: () => ReturnType<typeof parseMapDocument>;
  setDrawOptions: (patch: Partial<PublicParkMapMountOptions>) => void;
  fit: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  clearSelection: () => void;
  getViewportElement: () => HTMLElement | null;
};

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

function fillForItem(item: { fill?: string; kind?: string }) {
  try {
    const meta = getMapKind(item.kind);
    return item.fill || meta?.fill || '#22c55e';
  } catch {
    return item.fill || '#22c55e';
  }
}

function labelForItem(item: { metadata?: { publicName?: string }; label?: string; kind?: string }) {
  const explicit = String(item.metadata?.publicName || item.label || '').trim();
  if (explicit) return explicit;
  try {
    return getMapKind(item.kind).label || 'Zona';
  } catch {
    return 'Zona';
  }
}

function isBlockedKind(kind: string | undefined) {
  const k = String(kind || '').toLowerCase();
  return k === 'limitacion' || k === 'blockedzone' || k === 'blocked-zone';
}

type Props = {
  initialJson: string;
  initialOptions?: PublicParkMapMountOptions;
};

export const PublicParkMapApp = forwardRef<PublicParkMapAppHandle, Props>(function PublicParkMapApp(
  { initialJson, initialOptions = {} },
  ref
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<Konva.Group>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const hoverIdRef = useRef<string>('');

  const view = initialOptions.view || 'global';
  const doc = useMemo(() => parseMapDocument(initialJson, { view }), [initialJson, view]);

  const [size, setSize] = useState({ w: 800, h: 520 });
  const [zoomMul, setZoomMul] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [publicMapFilter, setPublicMapFilter] = useState(initialOptions.publicMapFilter || 'all');
  const [navigationPath, setNavigationPath] = useState<{ x: number; y: number }[]>(
    initialOptions.navigationPath || []
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const callbacksRef = useRef({
    onHover: initialOptions.onHover,
    onSelect: initialOptions.onSelect
  });
  useEffect(() => {
    callbacksRef.current.onHover = initialOptions.onHover;
    callbacksRef.current.onSelect = initialOptions.onSelect;
  }, [initialOptions.onHover, initialOptions.onSelect]);

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

  const baseFit = useMemo(() => {
    const sx = size.w / Math.max(1, doc.width);
    const sy = size.h / Math.max(1, doc.height);
    return Math.min(sx, sy) * 0.88;
  }, [size, doc.width, doc.height]);

  const worldScale = baseFit * zoomMul;

  const groupPos = useMemo(() => {
    const gx = (size.w - doc.width * worldScale) / 2 + pan.x;
    const gy = (size.h - doc.height * worldScale) / 2 + pan.y;
    return { gx, gy };
  }, [size, doc.width, doc.height, worldScale, pan]);

  const clientToMap = useCallback(
    (clientX: number, clientY: number) => {
      const stage = stageRef.current;
      const group = groupRef.current;
      if (!stage || !group) return null;
      const rect = stage.container().getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const t = group.getAbsoluteTransform().copy();
      t.invert();
      return t.point({ x: px, y: py });
    },
    []
  );

  const applyFit = useCallback(() => {
    setZoomMul(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const zoomAtClient = useCallback(
    (clientX: number, clientY: number, nextZoomMul: number) => {
      const stage = stageRef.current;
      const group = groupRef.current;
      if (!stage || !group) return;
      const rect = stage.container().getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const mapPt = group.getAbsoluteTransform().copy().invert().point({ x: px, y: py });
      const clamped = Math.min(2.4, Math.max(0.35, nextZoomMul));
      const prevScale = baseFit * zoomMul;
      const nextScale = baseFit * clamped;
      const cx = (size.w - doc.width * prevScale) / 2 + pan.x;
      const cy = (size.h - doc.height * prevScale) / 2 + pan.y;
      const mapX = (px - cx) / prevScale;
      const mapY = (py - cy) / prevScale;
      const ncx = px - mapX * nextScale;
      const ncy = py - mapY * nextScale;
      setPan({ x: ncx - (size.w - doc.width * nextScale) / 2, y: ncy - (size.h - doc.height * nextScale) / 2 });
      setZoomMul(clamped);
    },
    [baseFit, zoomMul, pan, size, doc.width, doc.height]
  );

  const dragRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);

  useEffect(() => {
    const end = () => {
      dragRef.current = null;
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, []);

  const onBgPointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (e.evt.button !== 0) return;
    dragRef.current = { sx: pan.x, sy: pan.y, px: e.evt.clientX, py: e.evt.clientY };
  };

  const onStagePointerMove = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const d = dragRef.current;
    if (d) {
      setPan({ x: d.sx + e.evt.clientX - d.px, y: d.sy + e.evt.clientY - d.py });
      return;
    }
    const p = clientToMap(e.evt.clientX, e.evt.clientY);
    if (!p) return;
    const { item, index } = hitTestMapDocument(doc, p.x, p.y);
    const nextId = item?.id || '';
    if (nextId !== hoverIdRef.current) {
      hoverIdRef.current = nextId;
      callbacksRef.current.onHover?.(
        item || null,
        index,
        item ? { x: Number(item.x || 0) + Number(item.width || 0) / 2, y: Number(item.y || 0) + Number(item.height || 0) / 2 } : null,
        { clientX: e.evt.clientX, clientY: e.evt.clientY }
      );
    } else if (item) {
      callbacksRef.current.onHover?.(item, index, null, { clientX: e.evt.clientX, clientY: e.evt.clientY });
    }
  };

  const onStagePointerLeave = () => {
    if (!hoverIdRef.current) return;
    hoverIdRef.current = '';
    callbacksRef.current.onHover?.(null, -1, null, null);
  };

  const routePoints = useMemo(() => {
    if (!navigationPath?.length) return [];
    return navigationPath.flatMap((pt) => [pt.x, pt.y]);
  }, [navigationPath]);

  const itemsRender = useMemo(() => {
    const sorted = getSortedMapItems(doc).filter(({ item }) => isMapItemVisibleInView(item, view));
    return sorted.map(({ item, index }) => ({ item, index }));
  }, [doc, view]);

  const filterActive = publicMapFilter && publicMapFilter !== 'all';

  const handleItemSelect = (item: Record<string, unknown>, index: number) => {
    setSelectedId(String(item.id || ''));
    const mx = Number(item.x || 0) + Number(item.width || 0) / 2;
    const my = Number(item.y || 0) + Number(item.height || 0) / 2;
    callbacksRef.current.onSelect?.(item, index, { x: mx, y: my });
  };

  useImperativeHandle(
    ref,
    () => ({
      getDocument: () => doc,
      setDrawOptions: (patch) => {
        if (patch.publicMapFilter != null) setPublicMapFilter(patch.publicMapFilter);
        if (patch.navigationPath != null) setNavigationPath(patch.navigationPath);
        if (patch.onHover != null) callbacksRef.current.onHover = patch.onHover;
        if (patch.onSelect != null) callbacksRef.current.onSelect = patch.onSelect;
      },
      fit: () => applyFit(),
      zoomIn: () => {
        const stage = stageRef.current;
        if (!stage) return;
        const r = stage.container().getBoundingClientRect();
        zoomAtClient(r.left + r.width / 2, r.top + r.height / 2, zoomMul * 1.16);
      },
      zoomOut: () => {
        const stage = stageRef.current;
        if (!stage) return;
        const r = stage.container().getBoundingClientRect();
        zoomAtClient(r.left + r.width / 2, r.top + r.height / 2, zoomMul / 1.16);
      },
      reset: () => applyFit(),
      clearSelection: () => {
        setSelectedId(null);
        callbacksRef.current.onSelect?.(null, -1, null);
      },
      getViewportElement: () => wrapRef.current
    }),
    [doc, applyFit, zoomAtClient, zoomMul]
  );

  const parkBg =
    String(doc.background?.type || '') === 'park' && !bgImg ? (
      <Rect
        listening={false}
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
      className="public-konva-map-viewport relative h-full w-full cursor-grab overflow-hidden bg-gradient-to-b from-sky-50 via-white to-teal-50/90 active:cursor-grabbing"
    >
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        onPointerMove={onStagePointerMove}
        onPointerLeave={onStagePointerLeave}
        onWheel={(e) => {
          e.evt.preventDefault();
          const factor = e.evt.deltaY > 0 ? 0.9 : 1.11;
          zoomAtClient(e.evt.clientX, e.evt.clientY, zoomMul * factor);
        }}
      >
        <Layer>
          <Group ref={groupRef} x={groupPos.gx} y={groupPos.gy} scaleX={worldScale} scaleY={worldScale}>
            <Rect
              name="publicMapBgPan"
              width={doc.width}
              height={doc.height}
              fill="rgba(255,255,255,0.001)"
              onPointerDown={onBgPointerDown}
              onClick={() => {
                setSelectedId(null);
                callbacksRef.current.onSelect?.(null, -1, null);
              }}
            />
            {parkBg}
            {bgImg ? (
              <Image
                listening={false}
                image={bgImg}
                x={0}
                y={0}
                width={doc.width}
                height={doc.height}
                opacity={Number(doc.background?.opacity ?? 1)}
              />
            ) : null}
            {routePoints.length >= 4 ? (
              <Line
                points={routePoints}
                stroke="#0369a1"
                strokeWidth={4 / worldScale}
                lineCap="round"
                lineJoin="round"
                listening={false}
              />
            ) : null}
            {itemsRender.map(({ item, index }) => {
              const it = item as Record<string, any>;
              const dimmed = filterActive && !itemMatchesPublicMapFilter(it, publicMapFilter);
              const opacity = dimmed ? 0.38 : Math.min(1, Math.max(0.06, Number(it.opacity ?? 1)));
              const sel = selectedId && it.id === selectedId;
              const stroke = sel ? '#0ea5e9' : String(it.stroke || '#0f766e');
              const strokeW = sel ? 3.5 : 2;

              const common = {
                opacity,
                onPointerDown: (e: Konva.KonvaEventObject<PointerEvent>) => {
                  e.cancelBubble = true;
                  dragRef.current = null;
                },
                onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
                  e.cancelBubble = true;
                  handleItemSelect(it, index);
                }
              };

              if (it.type === 'polygon' || it.type === 'line') {
                const pts = (it.points || []).flatMap((p: { x: number; y: number }) => [p.x, p.y]);
                return (
                  <Line
                    key={it.id}
                    {...common}
                    points={pts}
                    closed={it.type === 'polygon'}
                    fill={isBlockedKind(it.kind) ? 'rgba(244,63,94,0.18)' : String(it.fill || 'rgba(20,184,166,0.2)')}
                    stroke={stroke}
                    strokeWidth={strokeW / worldScale}
                  />
                );
              }
              if (it.type === 'ellipse' || it.type === 'circle') {
                return (
                  <Ellipse
                    key={it.id}
                    {...common}
                    x={Number(it.x) + Number(it.width) / 2}
                    y={Number(it.y) + Number(it.height) / 2}
                    radiusX={Number(it.width) / 2}
                    radiusY={Number(it.height) / 2}
                    rotation={Number(it.rotation || 0)}
                    fill={String(it.fill || fillForItem(it))}
                    stroke={stroke}
                    strokeWidth={strokeW / worldScale}
                  />
                );
              }
              if (it.type === 'text') {
                return (
                  <Text
                    key={it.id}
                    {...common}
                    x={Number(it.x)}
                    y={Number(it.y)}
                    width={Number(it.width)}
                    text={String(it.label || '')}
                    fontSize={14 / worldScale}
                    fill={String(it.fill || '#0f172a')}
                  />
                );
              }
              if (it.type === 'marker') {
                return (
                  <Circle
                    key={it.id}
                    {...common}
                    x={Number(it.x) + Number(it.width) / 2}
                    y={Number(it.y) + Number(it.height) / 2}
                    radius={Math.max(6, Number(it.width) / 2)}
                    fill={String(it.fill || '#f97316')}
                    stroke={stroke}
                    strokeWidth={strokeW / worldScale}
                  />
                );
              }
              return (
                <Group key={it.id}>
                  <Rect
                    {...common}
                    x={Number(it.x)}
                    y={Number(it.y)}
                    width={Math.max(8, Number(it.width || 0))}
                    height={Math.max(8, Number(it.height || 0))}
                    rotation={Number(it.rotation || 0)}
                    fill={
                      isBlockedKind(it.kind)
                        ? 'rgba(244,63,94,0.22)'
                        : String(it.fill || fillForItem(it))
                    }
                    stroke={stroke}
                    strokeWidth={strokeW / worldScale}
                    cornerRadius={it.metadata?.cornerRadius ? Number(it.metadata.cornerRadius) : 0}
                  />
                  <Text
                    x={Number(it.x) + 4}
                    y={Number(it.y) + 4}
                    width={Math.max(8, Number(it.width || 0)) - 8}
                    text={labelForItem(it).slice(0, 80)}
                    fontSize={11 / worldScale}
                    fill="#0f172a"
                    listening={false}
                    opacity={Math.min(1, opacity + 0.2)}
                  />
                </Group>
              );
            })}
          </Group>
        </Layer>
      </Stage>
    </div>
  );
});
