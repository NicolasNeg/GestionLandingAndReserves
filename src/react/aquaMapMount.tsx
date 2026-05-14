import { createRoot, type Root } from 'react-dom/client';
import { StrictMode } from 'react';
import { AquaMapEditorApp } from '../aquamap/AquaMapEditorApp';

let root: Root | null = null;

export function mountAquaMapEditor(host: HTMLElement) {
  root = createRoot(host);
  root.render(
    <StrictMode>
      <AquaMapEditorApp />
    </StrictMode>
  );
  return () => {
    root?.unmount();
    root = null;
  };
}
