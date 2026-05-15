import { createRef, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { AquaMapLandingViewer, type AquaMapLandingViewerHandle } from '../aquamap/AquaMapLandingViewer';
import type { MapElement } from '../aquamap/types';

export function mountAquamapLandingMap(
  host: HTMLElement,
  jsonStr: string,
  options: { onSelectElement: (el: MapElement | null) => void }
) {
  const viewerRef = createRef<AquaMapLandingViewerHandle>();
  const root = createRoot(host);
  flushSync(() => {
    root.render(
      <StrictMode>
        <AquaMapLandingViewer
          ref={viewerRef}
          jsonStr={jsonStr}
          onSelectElement={options.onSelectElement}
        />
      </StrictMode>
    );
  });

  const api = () => viewerRef.current;

  return {
    redraw: () => {},
    fit: () => {
      api()?.fit();
    },
    zoomIn: () => {
      api()?.zoomIn();
    },
    zoomOut: () => {
      api()?.zoomOut();
    },
    reset: () => {
      api()?.reset();
    },
    clearSelection: () => {
      /* selection controlled inside viewer */
    },
    setDrawOptions: (patch: Record<string, unknown>) => {
      api()?.setDrawOptions(patch);
    },
    setJson: () => {},
    getDocument: () => api()?.getDocument() ?? null,
    getViewportElement: () => api()?.getViewportElement() ?? host,
    destroy: () => {
      root.unmount();
      host.innerHTML = '';
    }
  };
}
