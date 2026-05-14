import Konva from 'konva';
import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Ellipse, Group, Image, Layer, Line, Rect, Stage } from 'react-konva';
import { ISO_GROUP_ROTATION_DEG, ISO_GROUP_SCALE_Y } from '../lib/mapEngine/isoProjection.js';
import type { ElementType, MapElement } from './types';
import { defaultSpriteForType } from './spriteUrls';
import { AQUAMAP_ISLAND_MARGIN, AQUAMAP_WORLD_H, AQUAMAP_WORLD_W } from './world';

type Camera = { x: number; y: number; scale: number };

function resolveSrc(el: MapElement): string {
  const u = el.imgSrc?.trim();
  return u || defaultSpriteForType(el.type);
}

type ElementSpriteProps = {
  el: MapElement;
  selected: boolean;
  onSelect: () => void;
  onDragEnd: (id: string, x: number, y: number) => void;
};

function ElementSprite({ el, selected, onSelect, onDragEnd }: ElementSpriteProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const src = resolveSrc(el);

  useEffect(() => {
    const im = new window.Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => setImg(im);
    im.onerror = () => setImg(null);
    im.src = src;
  }, [src]);

  const stroke = selected ? '#38bdf8' : 'rgba(15,23,42,0.2)';
  const sw = selected ? 3 : 1.2;

  if (!img) {
    return (
      <Rect
        x={el.x}
        y={el.y}
        width={el.width}
        height={el.height}
        fill="rgba(30,41,59,0.35)"
        stroke="#64748b"
        strokeWidth={1}
        cornerRadius={8}
        draggable
        onMouseDown={(e: Konva.KonvaEventObject<MouseEvent>) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onDragEnd={(e) => {
          const n = e.target;
          onDragEnd(el.id, n.x(), n.y());
        }}
      />
    );
  }

  return (
    <Image
      image={img}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      draggable
      shadowBlur={selected ? 18 : 10}
      shadowColor="rgba(0,0,0,0.28)"
      shadowOffsetY={4}
      shadowOpacity={0.55}
      stroke={stroke}
      strokeWidth={sw}
      onMouseDown={(e: Konva.KonvaEventObject<MouseEvent>) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragEnd={(e) => {
        const n = e.target;
        onDragEnd(el.id, n.x(), n.y());
      }}
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
    </Group>
  );
}

type Props = {
  width: number;
  height: number;
  worldW: number;
  worldH: number;
  elementsSorted: MapElement[];
  camera: Camera;
  setCamera: Dispatch<SetStateAction<Camera>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  onElementDragEnd: (id: string, x: number, y: number) => void;
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
  onElementDragEnd
}: Props) {
  const baseFit = useMemo(
    () => Math.min(width / worldW, height / worldH) * 0.9,
    [width, height, worldW, worldH]
  );
  const s = baseFit * camera.scale;

  return (
    <Stage
      width={width}
      height={height}
      className="touch-none bg-gradient-to-b from-sky-950 via-slate-950 to-slate-950"
      draggable
      x={camera.x}
      y={camera.y}
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
        const n = e.target;
        if (n.getClassName() !== 'Stage') return;
        setCamera((c) => ({ ...c, x: n.x(), y: n.y() }));
      }}
      onWheel={(e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        const factor = e.evt.deltaY > 0 ? 0.92 : 1.08;
        setCamera((c) => ({
          ...c,
          scale: Math.min(2.2, Math.max(0.45, c.scale * factor))
        }));
      }}
    >
      <Layer>
        <Group x={(width - worldW * s) / 2} y={(height - worldH * s) / 2} scaleX={s} scaleY={s}>
          <Group
            x={worldW / 2}
            y={worldH / 2}
            offsetX={worldW / 2}
            offsetY={worldH / 2}
            rotation={ISO_GROUP_ROTATION_DEG}
            scaleX={1}
            scaleY={ISO_GROUP_SCALE_Y}
          >
            <IslandBackdrop worldW={worldW} worldH={worldH} />
            {elementsSorted.map((el) => (
              <ElementSprite
                key={el.id}
                el={el}
                selected={el.id === selectedId}
                onSelect={() => setSelectedId(el.id)}
                onDragEnd={onElementDragEnd}
              />
            ))}
          </Group>
        </Group>
      </Layer>
    </Stage>
  );
}