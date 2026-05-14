import Konva from 'konva';
import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Group, Image, Layer, Rect, Stage, Text } from 'react-konva';
import type { MapElement } from './types';

type Camera = { x: number; y: number; scale: number };

type ElementShapeProps = {
  el: MapElement;
  selected: boolean;
  onSelect: () => void;
  onDragEnd: (id: string, x: number, y: number) => void;
};

function ElementShape({ el, selected, onSelect, onDragEnd }: ElementShapeProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const src = el.imgSrc?.trim();
    if (!src) {
      setImg(null);
      return;
    }
    const im = new window.Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => setImg(im);
    im.onerror = () => setImg(null);
    im.src = src;
  }, [el.imgSrc]);

  const stroke = selected ? '#38bdf8' : 'rgba(15,23,42,0.35)';
  const sw = selected ? 2.5 : 1.5;

  return (
    <Group>
      {img ? (
        <Image
          image={img}
          x={el.x}
          y={el.y}
          width={el.width}
          height={el.height}
          draggable
          onMouseDown={(e: Konva.KonvaEventObject<MouseEvent>) => {
            e.cancelBubble = true;
            onSelect();
          }}
          onDragEnd={(e) => {
            const n = e.target;
            onDragEnd(el.id, n.x(), n.y());
          }}
          stroke={stroke}
          strokeWidth={sw}
        />
      ) : (
        <Rect
          x={el.x}
          y={el.y}
          width={el.width}
          height={el.height}
          fill={el.color}
          cornerRadius={6}
          opacity={0.92}
          stroke={stroke}
          strokeWidth={sw}
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
      )}
      <Text
        x={el.x + 4}
        y={el.y + 4}
        width={el.width - 8}
        text={el.name}
        fontSize={11}
        fill="#0f172a"
        listening={false}
      />
    </Group>
  );
}

type Props = {
  width: number;
  height: number;
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
  elementsSorted,
  camera,
  setCamera,
  selectedId,
  setSelectedId,
  onElementDragEnd
}: Props) {
  return (
    <Stage
      width={width}
      height={height}
      className="touch-none bg-slate-950"
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
          scale: Math.min(2.5, Math.max(0.25, c.scale * factor))
        }));
      }}
    >
      <Layer>
        <Group scaleX={camera.scale} scaleY={camera.scale}>
          {elementsSorted.map((el) => (
            <ElementShape
              key={el.id}
              el={el}
              selected={el.id === selectedId}
              onSelect={() => setSelectedId(el.id)}
              onDragEnd={onElementDragEnd}
            />
          ))}
        </Group>
      </Layer>
    </Stage>
  );
}
