import { forwardRef } from 'react';
import Konva from 'konva';
import { Transformer } from 'react-konva';

type Props = {
  previewMode: boolean;
};

/** Transformer de Konva para la selección principal (sustituye manijas HTML). */
export const SelectionHandles = forwardRef<Konva.Transformer, Props>(function SelectionHandles(
  { previewMode },
  ref
) {
  if (previewMode) return null;
  return <Transformer ref={ref} rotateEnabled borderStroke="#0ea5e9" anchorStroke="#0369a1" />;
});
