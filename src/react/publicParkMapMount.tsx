import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import {
  PublicParkMapApp,
  type PublicParkMapAppHandle,
  type PublicParkMapMountOptions
} from '../components/park-map/PublicParkMapApp';

/**
 * Vista pública del mapa (Landing) con React + Konva.
 */
export function mountPublicParkMap(
  host: HTMLElement,
  jsonStr: string,
  initialOptions: PublicParkMapMountOptions = {}
) {
  host.innerHTML = '';
  const apiHolder: { current: PublicParkMapAppHandle | null } = { current: null };
  const root = createRoot(host);
  flushSync(() => {
    root.render(
      <PublicParkMapApp
        ref={(inst) => {
          apiHolder.current = inst;
        }}
        initialJson={jsonStr}
        initialOptions={initialOptions}
      />
    );
  });

  const api = () => apiHolder.current;

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
      api()?.clearSelection();
    },
    setDrawOptions: (patch: Partial<PublicParkMapMountOptions>) => {
      api()?.setDrawOptions(patch);
    },
    setJson: () => {},
    getDocument: () => api()?.getDocument(),
    getViewportElement: () => api()?.getViewportElement() ?? host,
    destroy: () => {
      root.unmount();
      host.innerHTML = '';
    }
  };
}
