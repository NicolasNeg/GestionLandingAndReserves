import Konva from 'konva';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Ellipse, Group, Image, Layer, Line, Rect, Stage, Text, Transformer } from 'react-konva';
import { ELEMENT_NATIVE_SHAPE, elementUsesNativeShape } from './elementCatalog';
import type { MapElement } from './types';
import {
  getParkingGridPatternCanvas,
  getParkingStripePatternCanvas,
  PARKING_STATUS_FILL,
  PUBLIC_PARKING_FILL,
  type ParkingAudience
} from './parkingYardAssets';
import {
  constrainAquaMapCamera,
  EDITOR_CAMERA_LIMITS,
  type CameraLimits,
  type CameraState
} from './aquaMapCameraConstraints';
import { computeCanvasLayout, pointerToWorld } from './aquaMapCanvasCoords';
import type { AquaMapContextRequest } from './useAquaMapEditorCommands';
import { elementMatchesAquamapFilter } from './aquaMapPublicFilters';
import { useAquamapPinchZoom } from './useAquamapPinchZoom';
import { defaultSpriteForType } from './spriteUrls';
import { AQUAMAP_ISLAND_MARGIN } from './world';

export type AquaMapVisualMode = 'editor' | 'public';

export type AquaMapYardVariant = 'island' | 'parking';

type Camera = CameraState;

function resolveSrc(el: MapElement): string {
  const u = el.imgSrc?.trim();
  return u || defaultSpriteForType(el.type);
}

function normalizeShapeSize(node: Konva.Shape, w: number, h: number) {
  const width = Math.round(Math.max(16, w));
  const height = Math.round(Math.max(16, h));
  if (node.getClassName() === 'Image') {
    const im = node as Konva.Image;
    im.width(width);
    im.height(height);
  } else {
    const r = node as Konva.Rect;
    r.width(width);
    r.height(height);
  }
  return { width, height };
}

/** Tras arrastrar/redimensionar: lee geometría del Group contenedor (estable para Transformer). */
function readNodeGeometry(node: Konva.Node): { x: number; y: number; width: number; height: number } {
  if (node.getClassName() === 'Group') {
    const g = node as Konva.Group;
    const child =
      g.findOne<Konva.Image>('Image') ?? g.findOne<Konva.Rect>('Rect') ?? null;
    const scaleX = g.scaleX();
    const scaleY = g.scaleY();
    let w = 64;
    let h = 64;
    if (child) {
      w =
        child.getClassName() === 'Image'
          ? (child as Konva.Image).width() * scaleX
          : (child as Konva.Rect).width() * scaleX;
      h =
        child.getClassName() === 'Image'
          ? (child as Konva.Image).height() * scaleY
          : (child as Konva.Rect).height() * scaleY;
    }
    g.scaleX(1);
    g.scaleY(1);
    if (child) normalizeShapeSize(child, w, h);
    return {
      x: Math.round(g.x()),
      y: Math.round(g.y()),
      width: Math.round(Math.max(16, w)),
      height: Math.round(Math.max(16, h))
    };
  }

  const scaleX = node.scaleX();
  const scaleY = node.scaleY();
  const w =
    node.getClassName() === 'Image'
      ? (node as Konva.Image).width() * scaleX
      : (node as Konva.Rect).width() * scaleX;
  const h =
    node.getClassName() === 'Image'
      ? (node as Konva.Image).height() * scaleY
      : (node as Konva.Rect).height() * scaleY;
  node.scaleX(1);
  node.scaleY(1);
  const { width, height } = normalizeShapeSize(node as Konva.Shape, w, h);
  return {
    x: Math.round(node.x()),
    y: Math.round(node.y()),
    width,
    height
  };
}

type NativeShapeProps = {
  el: MapElement;
  childProps: {
    x: number;
    y: number;
    width: number;
    height: number;
    listening: boolean;
    shadowBlur: number;
    shadowColor: string;
    shadowOffsetY: number;
    shadowOpacity: number;
    stroke: string;
    strokeWidth: number;
  };
};

function NativeElementShape({ el, childProps }: NativeShapeProps) {
  const shape = ELEMENT_NATIVE_SHAPE[el.type];
  const fill = el.color || '#64748b';
  const label = (el.name || '').trim();
  const fs = Math.max(9, Math.round(Math.min(el.width, el.height) * 0.18));

  if (shape === 'ellipse') {
    return (
      <Ellipse
        x={el.width / 2}
        y={el.height / 2}
        radiusX={el.width / 2}
        radiusY={el.height / 2}
        fill={fill}
        opacity={0.88}
        stroke={childProps.stroke}
        strokeWidth={childProps.strokeWidth}
        listening={false}
        shadowBlur={childProps.shadowBlur}
        shadowColor={childProps.shadowColor}
        shadowOffsetY={childProps.shadowOffsetY}
        shadowOpacity={childProps.shadowOpacity}
      />
    );
  }

  if (shape === 'zone') {
    return (
      <Rect
        {...childProps}
        fill={fill}
        opacity={0.32}
        cornerRadius={14}
        dash={[10, 7]}
        listening={false}
      />
    );
  }

  if (shape === 'path') {
    return (
      <>
        <Rect
          {...childProps}
          fill="#64748b"
          opacity={0.75}
          cornerRadius={8}
          listening={false}
        />
        <Line
          points={[12, el.height / 2, el.width - 12, el.height / 2]}
          stroke="#e2e8f0"
          strokeWidth={2}
          dash={[14, 10]}
          listening={false}
        />
      </>
    );
  }

  if (shape === 'entrance') {
    return (
      <>
        <Rect
          {...childProps}
          fill={fill}
          opacity={0.92}
          cornerRadius={10}
          listening={false}
        />
        <Text
          text={label || 'ENTRADA'}
          width={el.width}
          height={el.height}
          align="center"
          verticalAlign="middle"
          fill="#ecfdf5"
          fontStyle="bold"
          fontSize={fs}
          listening={false}
        />
      </>
    );
  }

  if (shape === 'building') {
    return (
      <>
        <Rect
          {...childProps}
          fill={fill}
          opacity={0.9}
          cornerRadius={12}
          listening={false}
        />
        {label ? (
          <Text
            text={label}
            width={el.width}
            height={el.height}
            align="center"
            verticalAlign="middle"
            fill="#f8fafc"
            fontStyle="bold"
            fontSize={fs}
            listening={false}
          />
        ) : null}
      </>
    );
  }

  return (
    <Rect
      {...childProps}
      fill={fill}
      opacity={0.85}
      cornerRadius={8}
      listening={false}
    />
  );
}

function ParkingCarSilhouette({ w, h }: { w: number; h: number }) {
  const cw = Math.round(w * 0.62);
  const ch = Math.round(h * 0.38);
  const cx = Math.round((w - cw) / 2);
  const cy = Math.round((h - ch) / 2);
  return (
    <Group listening={false}>
      <Rect
        x={cx}
        y={cy}
        width={cw}
        height={ch}
        cornerRadius={6}
        fill="#cbd5e1"
        stroke="#94a3b8"
        strokeWidth={1.2}
      />
      <Rect x={cx + cw * 0.12} y={cy - ch * 0.12} width={cw * 0.22} height={ch * 0.2} cornerRadius={3} fill="#e2e8f0" />
      <Rect
        x={cx + cw * 0.66}
        y={cy - ch * 0.12}
        width={cw * 0.22}
        height={ch * 0.2}
        cornerRadius={3}
        fill="#e2e8f0"
      />
    </Group>
  );
}

type ElementSpriteProps = {
  el: MapElement;
  yardVariant: AquaMapYardVariant;
  parkingAudience: ParkingAudience;
  selected: boolean;
  hovered: boolean;
  readOnly: boolean;
  blockPointer: boolean;
  visualMode: AquaMapVisualMode;
  dimmed: boolean;
  shapeRef: (id: string, node: Konva.Group | null) => void;
  onSelect: () => void;
  onHoverChange: (id: string | null) => void;
  onGeometryChange: (id: string, geom: { x: number; y: number; width: number; height: number }) => void;
  onContextMenu?: (e: Konva.KonvaEventObject<PointerEvent>) => void;
};

function ElementSprite({
  el,
  yardVariant,
  parkingAudience,
  selected,
  hovered,
  readOnly,
  blockPointer,
  visualMode,
  dimmed,
  shapeRef,
  onSelect,
  onHoverChange,
  onGeometryChange,
  onContextMenu
}: ElementSpriteProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const groupRef = useRef<Konva.Group>(null);
  const src = resolveSrc(el);
  const parkingStallVisual = yardVariant === 'parking' && el.type === 'parking';
  const nativeShape = elementUsesNativeShape(el.type);

  useEffect(() => {
    shapeRef(el.id, groupRef.current);
    return () => shapeRef(el.id, null);
  }, [el.id, shapeRef, img]);

  useEffect(() => {
    if (parkingStallVisual || nativeShape) {
      setImg(null);
      return;
    }
    const im = new window.Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => setImg(im);
    im.onerror = () => setImg(null);
    im.src = src;
  }, [src, parkingStallVisual, nativeShape]);

  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.x(el.x);
    g.y(el.y);
    g.scaleX(1);
    g.scaleY(1);
    g.getLayer()?.batchDraw();
  }, [el.x, el.y, el.width, el.height, img]);

  const isPublic = visualMode === 'public' || parkingAudience === 'public';
  const publicStall = parkingAudience === 'public';
  const rawStatus = el.parkingStatus ?? 'libre';
  const displayStatus =
    publicStall && rawStatus !== 'libre' ? 'ocupado' : rawStatus;
  const stallPalette = publicStall
    ? PUBLIC_PARKING_FILL[displayStatus === 'libre' ? 'libre' : 'ocupado']
    : PARKING_STATUS_FILL[rawStatus] ?? PARKING_STATUS_FILL.libre;
  const isOcupadoPublic = publicStall && displayStatus === 'ocupado';
  const workerStatusLabel =
    parkingAudience === 'worker'
      ? { libre: 'Libre', reservado: 'Res.', ocupado: 'Ocup.', mantenimiento: 'Mant.' }[
          rawStatus as 'libre' | 'reservado' | 'ocupado' | 'mantenimiento'
        ] ?? ''
      : '';
  const stroke = isPublic
    ? selected
      ? '#38bdf8'
      : 'transparent'
    : selected
      ? '#38bdf8'
      : hovered
        ? '#94a3b8'
        : 'rgba(15,23,42,0.22)';
  const listening = !blockPointer && !readOnly;
  const commitGeometry = (node: Konva.Node) => {
    const target = node.getClassName() === 'Group' ? node : node.getParent();
    if (target) onGeometryChange(el.id, readNodeGeometry(target));
  };

  const groupHandlers = {
    onPointerDown: (e: Konva.KonvaEventObject<PointerEvent>) => {
      e.cancelBubble = true;
      onSelect();
    },
    onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      onSelect();
    },
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      onSelect();
    },
    onTap: (e: Konva.KonvaEventObject<TouchEvent>) => {
      e.cancelBubble = true;
      onSelect();
    },
    onMouseEnter: () => {
      onHoverChange(el.id);
      if (readOnly) {
        const stage = groupRef.current?.getStage();
        stage?.container().style.setProperty('cursor', 'pointer');
      }
    },
    onMouseLeave: () => {
      onHoverChange(null);
      if (readOnly) {
        const stage = groupRef.current?.getStage();
        stage?.container().style.setProperty('cursor', 'grab');
      }
    },
    onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => {
      const n = e.target as Konva.Group;
      n.scaleX(1);
      n.scaleY(1);
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      commitGeometry(e.target);
    },
    onContextMenu: (e: Konva.KonvaEventObject<PointerEvent>) => {
      e.evt.preventDefault();
      e.cancelBubble = true;
      if (readOnly || blockPointer) return;
      onContextMenu?.(e);
    }
  };

  const childProps = {
    x: 0,
    y: 0,
    width: el.width,
    height: el.height,
    listening: false,
    shadowBlur: isPublic ? (selected ? 22 : 14) : selected ? 28 : hovered ? 18 : 11,
    shadowColor: isPublic ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.35)',
    shadowOffsetY: isPublic ? 5 : selected ? 4 : 3,
    shadowOpacity: isPublic ? 0.55 : selected ? 0.62 : 0.48,
    stroke,
    strokeWidth: isPublic ? (selected ? 2.2 : 0) : selected ? 2.6 : hovered ? 1.8 : 1.15
  };

  return (
    <Group
      ref={groupRef}
      draggable={listening}
      listening={!blockPointer}
      opacity={dimmed ? 0.28 : 1}
      {...groupHandlers}
    >
      <Rect
        x={0}
        y={0}
        width={el.width}
        height={el.height}
        fill="rgba(0,0,0,0.004)"
        listening
        hitStrokeWidth={readOnly ? 16 : 12}
      />
      {parkingStallVisual ? (
        <>
          <Rect
            {...childProps}
            cornerRadius={10}
            fill={stallPalette.fill}
            stroke={selected ? '#38bdf8' : stallPalette.stroke}
            strokeWidth={
              isPublic ? (selected ? 2.4 : 1.6) : selected ? 3 : hovered ? 2.2 : 1.6
            }
            listening={false}
          />
          {isOcupadoPublic ? (
            <ParkingCarSilhouette w={el.width} h={el.height} />
          ) : publicStall ? (
            <Text
              text={(el.name || '').trim() || '—'}
              width={el.width}
              height={el.height}
              align="center"
              verticalAlign="middle"
              fill="#ecfdf5"
              fontStyle="bold"
              fontSize={Math.max(11, Math.round(Math.min(el.width, el.height) * 0.26))}
              listening={false}
            />
          ) : (
            <>
              <Text
                text={(el.name || '').trim() || '—'}
                width={el.width}
                height={el.height - (parkingAudience === 'worker' ? 14 : 0)}
                y={0}
                align="center"
                verticalAlign="middle"
                fill="#f8fafc"
                fontStyle="bold"
                fontSize={Math.max(11, Math.round(Math.min(el.width, el.height) * 0.24))}
                listening={false}
                shadowColor="rgba(0,0,0,0.45)"
                shadowBlur={5}
                shadowOffsetY={1}
              />
              {parkingAudience === 'worker' && workerStatusLabel ? (
                <Text
                  text={workerStatusLabel}
                  width={el.width}
                  y={el.height - 16}
                  height={14}
                  align="center"
                  verticalAlign="middle"
                  fill="#cbd5e1"
                  fontSize={9}
                  fontStyle="bold"
                  listening={false}
                />
              ) : null}
            </>
          )}
        </>
      ) : nativeShape ? (
        <NativeElementShape el={el} childProps={childProps} />
      ) : !img ? (
        <Rect
          {...childProps}
          fill="rgba(30,41,59,0.42)"
          cornerRadius={8}
          listening={false}
        />
      ) : (
        <Image {...childProps} image={img} listening={false} />
      )}
    </Group>
  );
}

function ParkingYardBackdrop({ worldW, worldH }: { worldW: number; worldH: number }) {
  const dotPattern = useMemo(() => getParkingGridPatternCanvas(), []);
  const stripePattern = useMemo(() => getParkingStripePatternCanvas(), []);
  const m = AQUAMAP_ISLAND_MARGIN;
  const iw = worldW - m * 2;
  const ih = worldH - m * 2;
  const r = 26;
  const bandH = ih * 0.38;
  const bandY = m + (ih - bandH) / 2;
  return (
    <Group listening={false}>
      <Rect
        x={0}
        y={0}
        width={worldW}
        height={worldH}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: worldW, y: worldH }}
        fillLinearGradientColorStops={[0, '#172554', 0.48, '#1e1b4b', 1, '#0f172a']}
        listening={false}
      />
      <Rect
        x={m}
        y={m}
        width={iw}
        height={ih}
        cornerRadius={r}
        fillPatternImage={dotPattern}
        fillPatternRepeat="repeat"
        stroke="#134e4a"
        strokeWidth={1}
        listening={false}
      />
      <Rect
        x={m + 14}
        y={bandY}
        width={iw - 28}
        height={bandH}
        cornerRadius={14}
        fillPatternImage={stripePattern}
        fillPatternRepeat="repeat"
        opacity={0.55}
        listening={false}
      />
      <Rect
        x={m + 10}
        y={m + 10}
        width={iw - 20}
        height={ih - 20}
        cornerRadius={r - 6}
        fillEnabled={false}
        stroke="#2dd4bf"
        strokeWidth={2}
        dash={[14, 10]}
        listening={false}
      />
    </Group>
  );
}

function IslandBackdrop({
  worldW,
  worldH,
  publicMode
}: {
  worldW: number;
  worldH: number;
  publicMode?: boolean;
}) {
  const m = AQUAMAP_ISLAND_MARGIN;
  const iw = worldW - m * 2;
  const ih = worldH - m * 2;
  const r = 36;
  return (
    <Group listening={false}>
      <Ellipse
        x={worldW / 2}
        y={worldH / 2 + 28}
        radiusX={worldW * 0.42}
        radiusY={worldH * 0.2}
        fill="rgba(0,0,0,0.18)"
        listening={false}
      />
      <Rect
        x={m}
        y={worldH - m * 2.4}
        width={iw}
        height={m * 2.2}
        fill="#5d3f1e"
        cornerRadius={[0, 0, r, r]}
        listening={false}
      />
      <Line
        points={[m, worldH - m * 2.4, worldW - m, worldH - m * 2.4]}
        stroke="#3f2a12"
        strokeWidth={4}
        listening={false}
      />
      <Rect
        x={m}
        y={m}
        width={iw}
        height={ih}
        cornerRadius={r}
        fillLinearGradientStartPoint={{ x: m, y: m }}
        fillLinearGradientEndPoint={{ x: worldW, y: worldH }}
        fillLinearGradientColorStops={[
          0,
          '#bbf7d0',
          0.35,
          '#4ade80',
          0.65,
          '#22c55e',
          1,
          '#15803d'
        ]}
        stroke="#166534"
        strokeWidth={3}
        listening={false}
      />
      <Rect
        x={m + 8}
        y={m + 8}
        width={iw - 16}
        height={ih - 16}
        cornerRadius={r - 8}
        fillRadialGradientStartPoint={{ x: worldW * 0.35, y: worldH * 0.35 }}
        fillRadialGradientEndPoint={{ x: worldW * 0.65, y: worldH * 0.65 }}
        fillRadialGradientColorStops={[
          0,
          'rgba(255,255,255,0.22)',
          0.45,
          'rgba(255,255,255,0)',
          1,
          'rgba(21,128,61,0.12)'
        ]}
        listening={false}
      />
      <Rect
        x={m}
        y={m}
        width={iw}
        height={ih}
        cornerRadius={r}
        fillEnabled={false}
        stroke="rgba(15,23,42,0.45)"
        strokeWidth={1.5}
        listening={false}
      />
      {publicMode ? (
        <Rect
          x={0}
          y={0}
          width={worldW}
          height={worldH}
          listening={false}
          fillRadialGradientStartPoint={{ x: worldW * 0.5, y: worldH * 0.45 }}
          fillRadialGradientEndPoint={{ x: worldW * 0.5, y: worldH * 0.5 }}
          fillRadialGradientStartRadius={0}
          fillRadialGradientEndRadius={worldW * 0.72}
          fillRadialGradientColorStops={[0, 'rgba(255,255,255,0)', 0.72, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.22)']}
        />
      ) : null}
    </Group>
  );
}

export type AquaMapCanvasProps = {
  width: number;
  height: number;
  worldW: number;
  worldH: number;
  elementsSorted: MapElement[];
  camera: Camera;
  setCamera: Dispatch<SetStateAction<Camera>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  onElementGeometryChange: (
    id: string,
    geom: { x: number; y: number; width: number; height: number }
  ) => void;
  readOnly?: boolean;
  blockElementPointer?: boolean;
  onContextRequest?: (req: AquaMapContextRequest) => void;
  cameraLimits?: CameraLimits;
  visualMode?: AquaMapVisualMode;
  yardVariant?: AquaMapYardVariant;
  parkingAudience?: ParkingAudience;
  publicFilter?: string;
  navigationPath?: { x: number; y: number }[];
};

export function AquaMapCanvas({
  width,
  height,
  worldW,
  worldH,
  elementsSorted,
  camera,
  setCamera,
  selectedId,
  setSelectedId,
  onElementGeometryChange,
  readOnly = false,
  blockElementPointer = false,
  onContextRequest,
  cameraLimits = EDITOR_CAMERA_LIMITS,
  visualMode = 'editor',
  yardVariant = 'island',
  parkingAudience = 'editor',
  publicFilter = 'all',
  navigationPath = []
}: AquaMapCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const shapeRefs = useRef<Map<string, Konva.Group>>(new Map());
  const [hoverId, setHoverId] = useState<string | null>(null);

  const registerShapeRef = useCallback((id: string, node: Konva.Group | null) => {
    if (node) shapeRefs.current.set(id, node);
    else shapeRefs.current.delete(id);
  }, []);

  const syncTransformer = useCallback(() => {
    const tr = trRef.current;
    if (!tr || readOnly) return;
    const node = selectedId ? shapeRefs.current.get(selectedId) : null;
    if (node && node.getStage()) {
      tr.nodes([node]);
      tr.forceUpdate();
      tr.getLayer()?.batchDraw();
    } else {
      tr.nodes([]);
    }
  }, [readOnly, selectedId]);

  const layout = useMemo(
    () => computeCanvasLayout(width, height, worldW, worldH, camera.scale),
    [width, height, worldW, worldH, camera.scale]
  );
  const s = layout.scale;
  const isPublicVisual = visualMode === 'public';
  const parkingYard = yardVariant === 'parking';
  const routePoints = useMemo(
    () => navigationPath.flatMap((pt) => [pt.x, pt.y]),
    [navigationPath]
  );

  const applyCamera = useCallback(
    (next: Camera | ((prev: Camera) => Camera)) => {
      setCamera((prev) => {
        const raw = typeof next === 'function' ? next(prev) : next;
        return constrainAquaMapCamera(raw, { width, height }, { w: worldW, h: worldH }, cameraLimits);
      });
    },
    [cameraLimits, height, setCamera, width, worldH, worldW]
  );

  const emitContextRequest = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>, elementId?: string) => {
      if (!onContextRequest || readOnly) return;
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const world = pointerToWorld(pointer, camera, layout, worldW, worldH);
      onContextRequest({
        target: elementId ? 'element' : 'stage',
        elementId,
        clientX: e.evt.clientX,
        clientY: e.evt.clientY,
        worldX: world.x,
        worldY: world.y
      });
    },
    [camera, layout, onContextRequest, readOnly, worldH, worldW]
  );

  useAquamapPinchZoom(
    stageRef,
    cameraLimits.constrainPan,
    camera,
    applyCamera,
    { width, height, worldW, worldH },
    cameraLimits
  );

  useEffect(() => {
    syncTransformer();
    const id = window.requestAnimationFrame(syncTransformer);
    return () => window.cancelAnimationFrame(id);
  }, [syncTransformer, elementsSorted, layout.scale, layout.groupX, layout.groupY]);

  const selectedEl = useMemo(
    () => (selectedId ? elementsSorted.find((e) => e.id === selectedId) : null),
    [elementsSorted, selectedId]
  );

  useEffect(() => {
    if (!selectedEl) return;
    syncTransformer();
  }, [selectedEl?.x, selectedEl?.y, selectedEl?.width, selectedEl?.height, syncTransformer]);

  const onWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage || width <= 0 || height <= 0) return;

      const pointer = stage.getPointerPosition();
      const factor = e.evt.deltaY > 0 ? 0.9 : 1.11;
      const nextScale = camera.scale * factor;
      if (Math.abs(nextScale - camera.scale) < 1e-6) return;

      const oldLayout = computeCanvasLayout(width, height, worldW, worldH, camera.scale);
      const newLayout = computeCanvasLayout(width, height, worldW, worldH, nextScale);
      const oldS = oldLayout.scale;
      const newS = newLayout.scale;
      const gxOld = oldLayout.groupX;
      const gyOld = oldLayout.groupY;
      const gxNew = newLayout.groupX;
      const gyNew = newLayout.groupY;

      if (!pointer) {
        applyCamera((c) => ({ ...c, scale: nextScale }));
        return;
      }

      const px = pointer.x;
      const py = pointer.y;
      const wx = (px - camera.x - gxOld) / oldS;
      const wy = (py - camera.y - gyOld) / oldS;
      applyCamera({
        scale: nextScale,
        x: px - gxNew - wx * newS,
        y: py - gyNew - wy * newS
      });
    },
    [applyCamera, camera.scale, camera.x, camera.y, height, width, worldW, worldH]
  );

  const stageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()) setSelectedId(null);
    },
    [setSelectedId]
  );

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      dragDistance={8}
      className={`touch-none bg-gradient-to-b ${
        isPublicVisual
          ? parkingYard
            ? 'from-[#0f172a] via-[#111827] to-[#020617]'
            : 'from-[#1a2438] via-[#151a28] to-[#0f1218]'
          : parkingYard
            ? 'from-[#0f172a] via-[#111827] to-[#020617]'
            : 'from-[#1e2433] via-[#171a22] to-[#12141a]'
      }`}
      draggable
      x={camera.x}
      y={camera.y}
      onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => {
        if (!cameraLimits.constrainPan) return;
        const n = e.target;
        if (n.getClassName() !== 'Stage') return;
        const clamped = constrainAquaMapCamera(
          { x: n.x(), y: n.y(), scale: camera.scale },
          { width, height },
          { w: worldW, h: worldH },
          cameraLimits
        );
        n.position({ x: clamped.x, y: clamped.y });
      }}
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
        const n = e.target;
        if (n.getClassName() !== 'Stage') return;
        applyCamera((c) => ({ ...c, x: n.x(), y: n.y() }));
      }}
      onWheel={onWheel}
      onMouseDown={stageMouseDown}
      onDblClick={(e) => {
        if (e.target !== e.target.getStage()) return;
        e.evt.preventDefault();
        applyCamera({ x: 0, y: 0, scale: 1 });
      }}
      onMouseLeave={() => setHoverId(null)}
      onContextMenu={(e) => {
        if (e.target !== e.target.getStage()) return;
        emitContextRequest(e);
      }}
    >
      <Layer>
        <Group x={layout.groupX} y={layout.groupY} scaleX={s} scaleY={s}>
          {parkingYard ? (
            <ParkingYardBackdrop worldW={worldW} worldH={worldH} />
          ) : (
            <IslandBackdrop worldW={worldW} worldH={worldH} publicMode={isPublicVisual} />
          )}
          {elementsSorted.map((el) => {
            const dimmed =
              Boolean(publicFilter && publicFilter !== 'all') &&
              !elementMatchesAquamapFilter(el, publicFilter);
            return (
              <ElementSprite
                key={el.id}
                el={el}
                yardVariant={yardVariant}
                parkingAudience={parkingAudience}
                selected={el.id === selectedId}
                hovered={el.id === hoverId}
                readOnly={readOnly}
                blockPointer={blockElementPointer}
                visualMode={visualMode}
                dimmed={dimmed}
                shapeRef={registerShapeRef}
                onSelect={() => setSelectedId(el.id)}
                onHoverChange={setHoverId}
                onGeometryChange={onElementGeometryChange}
                onContextMenu={(ev) => emitContextRequest(ev, el.id)}
              />
            );
          })}
          {routePoints.length >= 4 ? (
            <Line
              points={routePoints}
              stroke="#22d3ee"
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
              dash={[14, 10]}
              opacity={0.9}
              listening={false}
              shadowColor="rgba(34,211,238,0.45)"
              shadowBlur={8}
            />
          ) : null}
        </Group>
        {!readOnly && selectedId ? (
          <Transformer
            ref={trRef}
            rotateEnabled={false}
            ignoreStroke
            borderStroke="#38bdf8"
            borderStrokeWidth={1.5}
            anchorStroke="#38bdf8"
            anchorFill="#0f172a"
            anchorSize={8}
            anchorCornerRadius={2}
            padding={4}
            boundBoxFunc={(oldBox, newBox) => {
              const minScreen = 20;
              if (newBox.width < minScreen || newBox.height < minScreen) return oldBox;
              return newBox;
            }}
            onTransform={() => {
              trRef.current?.forceUpdate();
            }}
            onTransformEnd={() => {
              const node = selectedId ? shapeRefs.current.get(selectedId) : null;
              if (node) onElementGeometryChange(selectedId!, readNodeGeometry(node));
              syncTransformer();
            }}
          />
        ) : null}
      </Layer>
    </Stage>
  );
}
