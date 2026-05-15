import Konva from 'konva';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Ellipse, Group, Image, Layer, Line, Rect, Stage, Transformer } from 'react-konva';
import type { MapElement } from './types';
import {
  constrainAquaMapCamera,
  EDITOR_CAMERA_LIMITS,
  type CameraLimits,
  type CameraState
} from './aquaMapCameraConstraints';
import { computeCanvasLayout, pointerToWorld } from './aquaMapCanvasCoords';
import type { AquaMapContextRequest } from './useAquaMapEditorCommands';
import { defaultSpriteForType } from './spriteUrls';
import { AQUAMAP_ISLAND_MARGIN } from './world';

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

type ElementSpriteProps = {
  el: MapElement;
  selected: boolean;
  hovered: boolean;
  readOnly: boolean;
  blockPointer: boolean;
  shapeRef: (id: string, node: Konva.Shape | null) => void;
  onSelect: () => void;
  onHoverChange: (id: string | null) => void;
  onGeometryChange: (id: string, geom: { x: number; y: number; width: number; height: number }) => void;
  onContextMenu?: (e: Konva.KonvaEventObject<PointerEvent>) => void;
};

function ElementSprite({
  el,
  selected,
  hovered,
  readOnly,
  blockPointer,
  shapeRef,
  onSelect,
  onHoverChange,
  onGeometryChange,
  onContextMenu
}: ElementSpriteProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const groupRef = useRef<Konva.Group>(null);
  const src = resolveSrc(el);

  useEffect(() => {
    shapeRef(el.id, groupRef.current);
    return () => shapeRef(el.id, null);
  }, [el.id, shapeRef, img]);

  useEffect(() => {
    const im = new window.Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => setImg(im);
    im.onerror = () => setImg(null);
    im.src = src;
  }, [src]);

  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.x(el.x);
    g.y(el.y);
    g.scaleX(1);
    g.scaleY(1);
    g.getLayer()?.batchDraw();
  }, [el.x, el.y, el.width, el.height, img]);

  const stroke = selected ? '#38bdf8' : hovered ? '#94a3b8' : 'rgba(15,23,42,0.22)';
  const listening = !blockPointer && !readOnly;
  const commitGeometry = (node: Konva.Node) => {
    const target = node.getClassName() === 'Group' ? node : node.getParent();
    if (target) onGeometryChange(el.id, readNodeGeometry(target));
  };

  const groupHandlers = {
    onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      if (!readOnly) onSelect();
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
    shadowBlur: selected ? 28 : hovered ? 18 : 11,
    shadowColor: 'rgba(0,0,0,0.35)',
    shadowOffsetY: selected ? 4 : 3,
    shadowOpacity: selected ? 0.62 : 0.48,
    stroke,
    strokeWidth: selected ? 2.6 : hovered ? 1.8 : 1.15
  };

  return (
    <Group ref={groupRef} draggable={listening} listening={!blockPointer} {...groupHandlers}>
      <Rect
        x={0}
        y={0}
        width={el.width}
        height={el.height}
        fill="rgba(0,0,0,0.004)"
        listening
        hitStrokeWidth={readOnly ? 16 : 12}
      />
      {!img ? (
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

function IslandBackdrop({ worldW, worldH }: { worldW: number; worldH: number }) {
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
  cameraLimits = EDITOR_CAMERA_LIMITS
}: AquaMapCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const shapeRefs = useRef<Map<string, Konva.Shape>>(new Map());
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
      className="touch-none bg-gradient-to-b from-[#1e2433] via-[#171a22] to-[#12141a]"
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
          <IslandBackdrop worldW={worldW} worldH={worldH} />
          {elementsSorted.map((el) => (
            <ElementSprite
              key={el.id}
              el={el}
              selected={el.id === selectedId}
              hovered={el.id === hoverId}
              readOnly={readOnly}
              blockPointer={blockElementPointer}
              shapeRef={registerShapeRef}
              onSelect={() => setSelectedId(el.id)}
              onHoverChange={setHoverId}
              onGeometryChange={onElementGeometryChange}
              onContextMenu={(ev) => emitContextRequest(ev, el.id)}
            />
          ))}
          {!readOnly && selectedId ? (
            <Transformer
              ref={trRef}
              rotateEnabled={false}
              ignoreStroke
              borderStroke="#38bdf8"
              borderStrokeWidth={1.5 / s}
              anchorStroke="#38bdf8"
              anchorFill="#0f172a"
              anchorSize={Math.max(7, 10 / s)}
              anchorCornerRadius={2}
              padding={2 / s}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 24 || newBox.height < 24) return oldBox;
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
        </Group>
      </Layer>
    </Stage>
  );
}
