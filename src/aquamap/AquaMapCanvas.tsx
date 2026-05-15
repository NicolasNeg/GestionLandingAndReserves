import Konva from 'konva';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Ellipse, Group, Image, Layer, Line, Rect, Stage, Transformer } from 'react-konva';
import type { MapElement } from './types';
import { computeCanvasLayout, pointerToWorld } from './aquaMapCanvasCoords';
import type { AquaMapContextRequest } from './useAquaMapEditorCommands';
import { defaultSpriteForType } from './spriteUrls';
import { AQUAMAP_ISLAND_MARGIN } from './world';

type Camera = { x: number; y: number; scale: number };

function resolveSrc(el: MapElement): string {
  const u = el.imgSrc?.trim();
  return u || defaultSpriteForType(el.type);
}

/** Tras arrastrar/redimensionar en Konva, normaliza escala y devuelve tamaño real en px del mundo. */
function readNodeGeometry(node: Konva.Node): { x: number; y: number; width: number; height: number } {
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
  if (node.getClassName() === 'Image') {
    const im = node as Konva.Image;
    im.width(w);
    im.height(h);
  } else {
    const r = node as Konva.Rect;
    r.width(w);
    r.height(h);
  }
  return {
    x: Math.round(node.x()),
    y: Math.round(node.y()),
    width: Math.round(Math.max(16, w)),
    height: Math.round(Math.max(16, h))
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
  const innerRef = useRef<Konva.Shape>(null);
  const src = resolveSrc(el);

  useEffect(() => {
    shapeRef(el.id, innerRef.current);
    return () => shapeRef(el.id, null);
  }, [el.id, shapeRef]);

  useEffect(() => {
    const im = new window.Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => setImg(im);
    im.onerror = () => setImg(null);
    im.src = src;
  }, [src]);

  useEffect(() => {
    const node = innerRef.current;
    if (!node) return;
    node.x(el.x);
    node.y(el.y);
    node.scaleX(1);
    node.scaleY(1);
    if (node.getClassName() === 'Image') {
      const im = node as Konva.Image;
      im.width(el.width);
      im.height(el.height);
    } else {
      const r = node as Konva.Rect;
      r.width(el.width);
      r.height(el.height);
    }
    node.to({
      shadowBlur: selected ? 28 : hovered ? 18 : 11,
      shadowOpacity: selected ? 0.62 : 0.48,
      strokeWidth: selected ? 2.6 : hovered ? 1.8 : 1.15,
      duration: 0.12,
      easing: Konva.Easings.EaseOutCubic
    });
  }, [el.x, el.y, el.width, el.height, selected, hovered]);

  const stroke = selected ? '#38bdf8' : hovered ? '#94a3b8' : 'rgba(15,23,42,0.22)';
  const listening = !blockPointer && !readOnly;
  const commitGeometry = (node: Konva.Node) => {
    onGeometryChange(el.id, readNodeGeometry(node));
  };

  const commonHandlers = {
    onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      if (!readOnly) onSelect();
    },
    onTap: (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      if (readOnly) onSelect();
    },
    onMouseEnter: () => onHoverChange(el.id),
    onMouseLeave: () => onHoverChange(null),
    onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => {
      const n = e.target;
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

  if (!img) {
    return (
      <Rect
        ref={innerRef}
        x={el.x}
        y={el.y}
        width={el.width}
        height={el.height}
        fill="rgba(30,41,59,0.42)"
        stroke={stroke}
        strokeWidth={selected ? 2.6 : 1.15}
        cornerRadius={8}
        draggable={listening}
        listening={!blockPointer}
        shadowBlur={11}
        shadowColor="rgba(0,0,0,0.35)"
        shadowOffsetY={3}
        shadowOpacity={0.5}
        hitStrokeWidth={readOnly ? 14 : 10}
        {...commonHandlers}
      />
    );
  }

  return (
    <Image
      ref={innerRef}
      image={img}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      draggable={listening}
      listening={!blockPointer}
      shadowBlur={11}
      shadowColor="rgba(0,0,0,0.32)"
      shadowOffsetY={4}
      shadowOpacity={0.52}
      stroke={stroke}
      strokeWidth={selected ? 2.6 : 1.15}
      hitStrokeWidth={readOnly ? 16 : 12}
      {...commonHandlers}
    />
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
  onContextRequest
}: AquaMapCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const shapeRefs = useRef<Map<string, Konva.Shape>>(new Map());
  const [hoverId, setHoverId] = useState<string | null>(null);

  const registerShapeRef = useCallback((id: string, node: Konva.Shape | null) => {
    if (node) shapeRefs.current.set(id, node);
    else shapeRefs.current.delete(id);
  }, []);

  const layout = useMemo(
    () => computeCanvasLayout(width, height, worldW, worldH, camera.scale),
    [width, height, worldW, worldH, camera.scale]
  );
  const s = layout.scale;

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
    const tr = trRef.current;
    if (!tr || readOnly) return;
    const node = selectedId ? shapeRefs.current.get(selectedId) : null;
    if (node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    } else {
      tr.nodes([]);
    }
  }, [selectedId, elementsSorted, readOnly]);

  const onWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage || width <= 0 || height <= 0) return;

      const pointer = stage.getPointerPosition();
      const factor = e.evt.deltaY > 0 ? 0.9 : 1.11;
      const nextScale = Math.min(2.35, Math.max(0.42, camera.scale * factor));
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
        setCamera((c) => ({ ...c, scale: nextScale }));
        return;
      }

      const px = pointer.x;
      const py = pointer.y;
      const wx = (px - camera.x - gxOld) / oldS;
      const wy = (py - camera.y - gyOld) / oldS;
      setCamera({
        scale: nextScale,
        x: px - gxNew - wx * newS,
        y: py - gyNew - wy * newS
      });
    },
    [camera.scale, camera.x, camera.y, height, setCamera, width, worldW, worldH]
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
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
        const n = e.target;
        if (n.getClassName() !== 'Stage') return;
        setCamera((c) => ({ ...c, x: n.x(), y: n.y() }));
      }}
      onWheel={onWheel}
      onMouseDown={stageMouseDown}
      onDblClick={(e) => {
        if (e.target !== e.target.getStage()) return;
        e.evt.preventDefault();
        setCamera({ x: 0, y: 0, scale: 1 });
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
              borderStroke="#38bdf8"
              borderStrokeWidth={1.5}
              anchorStroke="#38bdf8"
              anchorFill="#0f172a"
              anchorSize={9}
              anchorCornerRadius={2}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 24 || newBox.height < 24) return oldBox;
                return newBox;
              }}
              onTransformEnd={() => {
                const node = selectedId ? shapeRefs.current.get(selectedId) : null;
                if (node) onElementGeometryChange(selectedId!, readNodeGeometry(node));
              }}
            />
          ) : null}
        </Group>
      </Layer>
    </Stage>
  );
}
