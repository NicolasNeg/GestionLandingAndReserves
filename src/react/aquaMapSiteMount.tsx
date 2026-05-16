import { createRef, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { AquaMapSiteEditor, type AquaMapSiteEditorHandle } from '../aquamap/AquaMapSiteEditor';
import { createAquamapMapEditorBridgeProxy } from '../aquamap/createAquamapMapEditorBridgeProxy';

import type { MapLayerContext } from '../aquamap/mapLayers';

export type MountAquaMapSiteEditorOptions = {
  initialJson: string;
  mapContext?: MapLayerContext;
  onChangeJson: (json: string) => void;
  onSaveSite: () => void;
  onPreviewPublic: () => void;
  onExitToSitePanel?: () => void;
};

export function mountAquaMapSiteEditor(host: HTMLElement, options: MountAquaMapSiteEditorOptions) {
  const editorRef = createRef<AquaMapSiteEditorHandle>();
  const root = createRoot(host);
  const core = {
    getJson: () => editorRef.current?.getJson() ?? '',
    setJson: (json: string) => {
      editorRef.current?.setJson(json);
    },
    destroy: () => {
      root.unmount();
    }
  };
  const bridge = createAquamapMapEditorBridgeProxy(core);
  const inner = bridge as typeof bridge & {
    __aquamapNotifySelection?: () => void;
    __aquamapNotifyDocument?: () => void;
  };
  const mapBridgeNotifiers = {
    notifySelection: () => inner.__aquamapNotifySelection?.(),
    notifyDocument: () => inner.__aquamapNotifyDocument?.()
  };

  flushSync(() => {
    root.render(
      <StrictMode>
        <AquaMapSiteEditor
          ref={editorRef}
          initialJson={options.initialJson}
          mapContext={options.mapContext ?? 'parque'}
          onChangeJson={options.onChangeJson}
          onSaveSite={options.onSaveSite}
          onPreviewPublic={options.onPreviewPublic}
          onExitToSitePanel={options.onExitToSitePanel}
          mapBridgeNotifiers={mapBridgeNotifiers}
        />
      </StrictMode>
    );
  });

  return bridge;
}
