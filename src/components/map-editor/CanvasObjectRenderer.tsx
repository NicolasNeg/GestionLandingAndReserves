import Konva from 'konva';
import type { MutableRefObject } from 'react';
import { Circle, Ellipse, Line, Rect, Text } from 'react-konva';

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
        const stroke = sel ? '#0ea5e9' : String(item.stroke || '#0f766e');
        const strokeW = sel ? 3 : 2;
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
