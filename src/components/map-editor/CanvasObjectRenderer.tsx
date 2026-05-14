import Konva from 'konva';
import type { MutableRefObject } from 'react';
import { Circle, Ellipse, Group, Line, Rect, Text } from 'react-konva';

function isBlockedKind(kind: string) {
  const k = String(kind || '').toLowerCase();
  return k === 'limitacion' || k === 'blockedzone' || k === 'blocked-zone';
}

export type CanvasObjectRendererProps = {
  itemsSorted: any[];
  selectedIds: string[];
  fit: number;
  tool: string;
  previewMode: boolean;
  nodeRefs: MutableRefObject<Record<string, Konva.Node | undefined>>;
  selectItemById: (id: string, additive?: boolean) => void;
  patchItemById: (id: string, patch: Record<string, unknown>) => void;
};

/** Piezas del mapa en coordenadas de documento (dentro del Group escalado). */
export function CanvasObjectRenderer(props: CanvasObjectRendererProps) {
  const { itemsSorted, selectedIds, fit, tool, previewMode, nodeRefs, selectItemById, patchItemById } = props;

  return (
    <>
      {itemsSorted.map((item: any) => {
        if (item.visible === false) return null;
        const sel = selectedIds.includes(item.id);
        const common = {
          id: item.id,
          ref: (node: Konva.Node | null) => {
            if (node) nodeRefs.current[item.id] = node;
            else delete nodeRefs.current[item.id];
          },
          onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => {
            if (previewMode) return;
            if (tool !== 'select') return;
            e.cancelBubble = true;
            selectItemById(item.id, e.evt.shiftKey);
          },
          draggable: tool === 'select' && !item.locked && !previewMode,
          onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
            const n = e.target;
            patchItemById(item.id, { x: n.x(), y: n.y() });
          }
        };
        const stroke = sel ? '#94a3b8' : String(item.stroke || '#0f766e');
        const strokeW = sel ? 2.5 : 2;
        if (item.type === 'polygon' || item.type === 'line') {
          const pts = (item.points || []).flatMap((p: any) => [p.x, p.y]);
          return (
            <Line
              key={item.id}
              {...common}
              points={pts}
              closed={item.type === 'polygon'}
              fill={isBlockedKind(item.kind) ? 'rgba(244,63,94,0.18)' : String(item.fill || 'rgba(20,184,166,0.2)')}
              stroke={stroke}
              strokeWidth={strokeW / fit}
            />
          );
        }
        if (item.type === 'table') {
          const w = Number(item.width);
          const h = Number(item.height);
          const cx = w / 2;
          const cy = h / 2;
          const r = Math.max(Math.min(w, h) * 0.34, 14);
          const chairs = Math.max(2, Math.min(10, Number(item.metadata?.capacidad || 4)));
          const rot = Number(item.rotation || 0);
          const fill = String(item.fill || 'rgba(16, 185, 129, 0.30)');
          const sw = strokeW / fit;
          return (
            <Group
              key={item.id}
              id={item.id}
              name="map-item-table"
              ref={(node: Konva.Group | null) => {
                if (node) nodeRefs.current[item.id] = node;
                else delete nodeRefs.current[item.id];
              }}
              x={Number(item.x) + cx}
              y={Number(item.y) + cy}
              offsetX={cx}
              offsetY={cy}
              rotation={rot}
              onMouseDown={(e: Konva.KonvaEventObject<MouseEvent>) => {
                if (previewMode) return;
                if (tool !== 'select') return;
                e.cancelBubble = true;
                selectItemById(item.id, e.evt.shiftKey);
              }}
              draggable={tool === 'select' && !item.locked && !previewMode}
              onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
                const n = e.target as Konva.Group;
                patchItemById(item.id, {
                  x: n.x() - w / 2,
                  y: n.y() - h / 2,
                  rotation: n.rotation()
                });
              }}
            >
              <Rect
                name="map-item-bounds"
                x={0}
                y={0}
                width={w}
                height={h}
                opacity={0}
                listening={false}
              />
              {Array.from({ length: chairs }, (_, i) => {
                const a = (Math.PI * 2 * i) / chairs;
                return (
                  <Circle
                    key={`ch-${i}`}
                    x={cx + Math.cos(a) * (r + 9)}
                    y={cy + Math.sin(a) * (r + 9)}
                    radius={5}
                    fill="rgba(15, 23, 42, 0.12)"
                    listening={false}
                  />
                );
              })}
              <Ellipse
                x={cx}
                y={cy}
                radiusX={r}
                radiusY={r}
                fill={fill}
                stroke={stroke}
                strokeWidth={sw}
                listening={false}
              />
            </Group>
          );
        }
        if (item.type === 'ellipse' || item.type === 'circle') {
          return (
            <Ellipse
              key={item.id}
              {...common}
              x={Number(item.x) + Number(item.width) / 2}
              y={Number(item.y) + Number(item.height) / 2}
              radiusX={Number(item.width) / 2}
              radiusY={Number(item.height) / 2}
              rotation={Number(item.rotation || 0)}
              fill={String(item.fill || '#bae6fd')}
              stroke={stroke}
              strokeWidth={strokeW / fit}
            />
          );
        }
        if (item.type === 'pool') {
          const x = Number(item.x);
          const y = Number(item.y);
          const w = Number(item.width);
          const h = Number(item.height);
          const cx = w / 2;
          const cy = h / 2;
          const rot = Number(item.rotation || 0);
          const fill = String(item.fill || 'rgba(14, 165, 233, 0.26)');
          const sw = strokeW / fit;
          const waves: JSX.Element[] = [];
          for (let ly = h * 0.32; ly <= h * 0.72; ly += 16) {
            const pts: number[] = [];
            for (let lx = w * 0.16; lx <= w * 0.84; lx += 10) {
              const wave = Math.sin((lx + ly + x + y) / 18) * 3;
              pts.push(lx, ly + wave);
            }
            waves.push(
              <Line
                key={`wv-${ly}`}
                points={pts}
                stroke="rgba(255,255,255,0.72)"
                strokeWidth={2 / fit}
                listening={false}
              />
            );
          }
          return (
            <Group
              key={item.id}
              id={item.id}
              name="map-item-pool"
              ref={(node: Konva.Group | null) => {
                if (node) nodeRefs.current[item.id] = node;
                else delete nodeRefs.current[item.id];
              }}
              x={x + cx}
              y={y + cy}
              offsetX={cx}
              offsetY={cy}
              rotation={rot}
              onMouseDown={(e: Konva.KonvaEventObject<MouseEvent>) => {
                if (previewMode) return;
                if (tool !== 'select') return;
                e.cancelBubble = true;
                selectItemById(item.id, e.evt.shiftKey);
              }}
              draggable={tool === 'select' && !item.locked && !previewMode}
              onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
                const n = e.target as Konva.Group;
                patchItemById(item.id, {
                  x: n.x() - w / 2,
                  y: n.y() - h / 2,
                  rotation: n.rotation()
                });
              }}
            >
              <Rect
                name="map-item-bounds"
                x={0}
                y={0}
                width={w}
                height={h}
                opacity={0}
                listening={false}
              />
              <Ellipse
                x={cx}
                y={cy}
                radiusX={Math.max(w / 2, 1)}
                radiusY={Math.max(h / 2, 1)}
                fill={fill}
                stroke={stroke}
                strokeWidth={sw}
                listening={false}
              />
              {waves}
            </Group>
          );
        }
        if (item.type === 'text') {
          return (
            <Text
              key={item.id}
              {...common}
              x={Number(item.x)}
              y={Number(item.y)}
              width={Number(item.width)}
              text={String(item.label || '')}
              fontSize={14 / fit}
              fill={String(item.fill || '#0f172a')}
            />
          );
        }
        if (item.type === 'marker') {
          return (
            <Circle
              key={item.id}
              {...common}
              x={Number(item.x) + Number(item.width) / 2}
              y={Number(item.y) + Number(item.height) / 2}
              radius={Math.max(6, Number(item.width) / 2)}
              fill={String(item.fill || '#f97316')}
              stroke={stroke}
              strokeWidth={strokeW / fit}
            />
          );
        }
        return (
          <Rect
            key={item.id}
            {...common}
            x={Number(item.x)}
            y={Number(item.y)}
            width={Number(item.width)}
            height={Number(item.height)}
            rotation={Number(item.rotation || 0)}
            fill={
              isBlockedKind(item.kind) ? 'rgba(244,63,94,0.22)' : String(item.fill || 'rgba(45,212,191,0.25)')
            }
            stroke={stroke}
            strokeWidth={strokeW / fit}
            cornerRadius={item.metadata?.cornerRadius ? Number(item.metadata.cornerRadius) : 0}
          />
        );
      })}
    </>
  );
}
