import { createRef, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import {
  ParkingBjxPublicPreview,
  type ParkingBjxPublicMetrics,
  type ParkingBjxPublicPreviewHandle
} from '../aquamap/ParkingBjxPublicPreview';
import type { ParkingSpotLive } from '../aquamap/parkingSpotsSync';

export type ParkingPublicMountOptions = {
  onMetrics?: (metrics: ParkingBjxPublicMetrics) => void;
  onSpotsChange?: (spots: ParkingSpotLive[]) => void;
  onError?: (err: unknown) => void;
};

export function mountParkingBjxPublicPreview(
  host: HTMLElement,
  options: ParkingPublicMountOptions = {}
) {
  const viewerRef = createRef<ParkingBjxPublicPreviewHandle>();
  const root = createRoot(host);
  flushSync(() => {
    root.render(
      <StrictMode>
        <ParkingBjxPublicPreview
          ref={viewerRef}
          onMetrics={options.onMetrics}
          onSpotsChange={options.onSpotsChange}
          onError={options.onError}
        />
      </StrictMode>
    );
  });

  const api = () => viewerRef.current;

  return {
    redraw: () => {},
    fit: () => api()?.fit(),
    zoomIn: () => api()?.zoomIn(),
    zoomOut: () => api()?.zoomOut(),
    reset: () => api()?.reset(),
    clearSelection: () => {},
    setDrawOptions: () => {},
    setJson: () => {},
    getDocument: () => null,
    getViewportElement: () => host,
    destroy: () => {
      root.unmount();
      host.innerHTML = '';
    }
  };
}
