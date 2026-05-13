import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { getMapEditorBridge, registerMapEditorBridge } from '../lib/map/mapEditorBridge';
import { MapEditorApp } from '../components/map-editor/MapEditorApp';

export type MountReactMapEditorOptions = {
  initialJson: string;
  view: string;
  onChangeJson: (json: string) => void;
  onSaveSite: () => void;
  onPreviewPublic: () => void;
};

/**
 * Monta el editor React+Konva. Usa flushSync para que el bridge exista antes de devolver el proxy.
 */
export function mountReactMapEditor(host: HTMLElement, options: MountReactMapEditorOptions) {
  const root = createRoot(host);
  flushSync(() => {
    root.render(
      <MapEditorApp
        initialJson={options.initialJson}
        view={options.view}
        onChangeJson={options.onChangeJson}
        onSaveSite={options.onSaveSite}
        onPreviewPublic={options.onPreviewPublic}
      />
    );
  });

  return new Proxy(
    {},
    {
      get(_, prop: string | symbol) {
        if (prop === 'destroy') {
          return () => {
            root.unmount();
            registerMapEditorBridge(null);
          };
        }
        const b = getMapEditorBridge();
        if (!b) return undefined;
        const v = (b as any)[prop];
        return typeof v === 'function' ? v.bind(b) : v;
      }
    }
  ) as import('../lib/map/mapEditorBridge').MapEditorBridgeApi & { destroy: () => void };
}
