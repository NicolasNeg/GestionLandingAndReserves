import { forwardRef } from 'react';
import Konva from 'konva';
import { Transformer } from 'react-konva';

type Props = {
  previewMode: boolean;
  onTransformEnd?: (e: Konva.KonvaEventObject<Event>) => void;
};

/** Transformer de Konva para la selección principal (sustituye manijas HTML). */
export const SelectionHandles = forwardRef<Konva.Transformer, Props>(function SelectionHandles(
  { previewMode, onTransformEnd },
  ref
) {
  if (previewMode) return null;
  return (
    <Transformer
      ref={ref}
      rotateEnabled
      rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
      borderStroke="rgba(148,163,184,0.55)"
      borderStrokeWidth={1}
      anchorStroke="#94a3b8"
      anchorFill="#1e293b"
      anchorSize={8}
      padding={2}
      onTransformEnd={onTransformEnd}
    />
  );
});
