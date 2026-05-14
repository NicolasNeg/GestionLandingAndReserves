import * as React from 'react';
import { registerMapEditorBridge } from '../../lib/map/mapEditorBridge';
import { setMapEditorOnChange, useMapEditorStore } from '../../store/map-editor-store';
import { serializeMapDocument } from '../../lib/mapEngine/mapMigrations.js';
import { MapEditorShell } from './MapEditorShell';

export type MapEditorAppProps = {
  initialJson: string;
  view: string;
  onChangeJson: (json: string) => void;
  onSaveSite: () => void;
  onPreviewPublic: () => void;
};

export function MapEditorApp(props: MapEditorAppProps) {
  const [saveStatus, setSaveStatus] = React.useState('Listo');
  const onChangeRef = React.useRef(props.onChangeJson);
  onChangeRef.current = props.onChangeJson;

  React.useEffect(() => {
    const el = document.getElementById('mapa-editor-save-status');
    if (el) el.textContent = saveStatus;
  }, [saveStatus]);

  React.useLayoutEffect(() => {
    setMapEditorOnChange((json) => {
      onChangeRef.current(json);
      setSaveStatus('Cambios pendientes · publica con Guardar sitio');
    });
    useMapEditorStore.getState().loadFromJson(props.initialJson, props.view);

    registerMapEditorBridge({
      getJson: () => serializeMapDocument(useMapEditorStore.getState().doc),
      setJson: (json: string) => useMapEditorStore.getState().loadFromJson(json, props.view),
      getDocument: () => JSON.parse(JSON.stringify(useMapEditorStore.getState().doc)),
      getItems: () => useMapEditorStore.getState().doc.items.map((it: any) => ({ ...it })),
      getSelected: () => {
        const id = useMapEditorStore.getState().selectedIds[0];
        const it = useMapEditorStore.getState().doc.items.find((x: any) => x.id === id);
        return it ? { ...it } : null;
      },
      getSelection: () =>
        useMapEditorStore
          .getState()
          .selectedIds.map((id) => useMapEditorStore.getState().doc.items.find((x: any) => x.id === id))
          .filter(Boolean)
          .map((x: any) => ({ ...x })),
      selectItemById: (id, additive) => useMapEditorStore.getState().selectItemById(id, additive),
      updateSelected: (patch) => useMapEditorStore.getState().updateSelected(patch),
      deleteSelected: () => useMapEditorStore.getState().deleteSelected(),
      duplicateSelected: () => useMapEditorStore.getState().duplicateSelected(),
      undo: () => useMapEditorStore.getState().undo(),
      redo: () => useMapEditorStore.getState().redo(),
      setTool: (t) => useMapEditorStore.getState().setTool(t),
      setSnap: (v) => useMapEditorStore.getState().setSnap(v),
      setGridVisible: (v) => useMapEditorStore.getState().setGridVisible(v),
      setAdding: (v, k) => useMapEditorStore.getState().setAdding(v, k),
      addItem: (k, p) => useMapEditorStore.getState().addItem(k, p),
      addPresetRow: (k, c) => useMapEditorStore.getState().addPresetRow(k, c),
      addPresetWideBlock: (k) => useMapEditorStore.getState().addPresetWideBlock(k),
      setDocumentSize: (w, h) => useMapEditorStore.getState().setDocumentSize(w, h),
      getDocumentSize: () => {
        const d = useMapEditorStore.getState().doc;
        return { w: d.width, h: d.height };
      },
      setPreviewMode: (on) => useMapEditorStore.getState().setPreviewMode(on),
      getPreviewMode: () => useMapEditorStore.getState().previewMode,
      updateDocumentBackground: (patch) => useMapEditorStore.getState().updateDocumentBackground(patch),
      setPublicMapUi: (patch) => useMapEditorStore.getState().setPublicMapUi(patch),
      setRenderOptions: (patch) => useMapEditorStore.getState().setRenderOptions(patch),
      applyMapPreset: (id) => useMapEditorStore.getState().applyMapPreset(id),
      moveSelectedLayer: (dir) => useMapEditorStore.getState().moveSelectedLayer(dir),
      bringToFront: () => useMapEditorStore.getState().bringToFront(),
      sendToBack: () => useMapEditorStore.getState().sendToBack(),
      setSelectedVisibility: (v) => useMapEditorStore.getState().setSelectedVisibility(v),
      setSelectedLockedAll: (v) => useMapEditorStore.getState().setSelectedLockedAll(v),
      alignSelected: (m) => useMapEditorStore.getState().alignSelected(m),
      distributeSelected: (a) => useMapEditorStore.getState().distributeSelected(a),
      toggleItemVisible: (id) => useMapEditorStore.getState().toggleItemVisible(id),
      toggleItemLocked: (id) => useMapEditorStore.getState().toggleItemLocked(id),
      duplicateSelectedRow: () => useMapEditorStore.getState().duplicateSelectedRow(),
      duplicateSelectedColumn: () => useMapEditorStore.getState().duplicateSelectedColumn(),
      duplicateSelectedGrid: () => useMapEditorStore.getState().duplicateSelectedGrid(),
      flipSelectedHorizontal: () => useMapEditorStore.getState().flipSelectedHorizontal(),
      flipSelectedVertical: () => useMapEditorStore.getState().flipSelectedVertical(),
      onSelectionChange: (fn) => useMapEditorStore.getState().onSelectionChange(fn as any),
      onDocumentChange: (fn) => useMapEditorStore.getState().onDocumentChange(fn),
      destroy: () => {}
    });

    return () => {
      setMapEditorOnChange(undefined);
      registerMapEditorBridge(null);
    };
  }, [props.initialJson, props.view]);

  return (
    <MapEditorShell
      saveStatus={saveStatus}
      onSaveSite={props.onSaveSite}
      onPreviewPublic={props.onPreviewPublic}
    />
  );
}
