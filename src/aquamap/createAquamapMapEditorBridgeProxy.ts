import type { MapEditorBridgeApi } from '../lib/map/mapEditorBridge';

type Core = {
  getJson: () => string;
  setJson: (json: string) => void;
  destroy: () => void;
};

const emptyDoc = () => ({
  items: [],
  width: 1000,
  height: 620,
  background: { type: 'park' },
  view: 'global'
});

export function createAquamapMapEditorBridgeProxy(core: Core): MapEditorBridgeApi & { destroy: () => void } {
  const selectionFns = new Set<(...args: unknown[]) => void>();
  const documentFns = new Set<(doc: unknown) => void>();

  const notifySel = () => {
    selectionFns.forEach((f) => {
      try {
        f();
      } catch {
        /* ignore */
      }
    });
  };
  const notifyDoc = () => {
    const stub = emptyDoc();
    documentFns.forEach((f) => {
      try {
        f(stub);
      } catch {
        /* ignore */
      }
    });
  };

  const noop = () => {};
  const api: MapEditorBridgeApi & {
    destroy: () => void;
    __aquamapNotifySelection: () => void;
    __aquamapNotifyDocument: () => void;
  } = {
    getJson: () => core.getJson(),
    setJson: (json) => {
      core.setJson(json);
    },
    destroy: () => core.destroy(),
    __aquamapNotifySelection: notifySel,
    __aquamapNotifyDocument: notifyDoc,
    getDocument: () => emptyDoc(),
    getItems: () => [],
    getSelected: () => null,
    getSelection: () => [],
    selectItemById: noop,
    updateSelected: noop,
    deleteSelected: noop,
    duplicateSelected: noop,
    undo: noop,
    redo: noop,
    setTool: noop,
    setSnap: noop,
    setGridVisible: noop,
    setAdding: noop,
    addItem: () => null,
    addPresetRow: noop,
    addPresetWideBlock: noop,
    setDocumentSize: noop,
    getDocumentSize: () => ({ w: 1000, h: 620 }),
    setPreviewMode: noop,
    getPreviewMode: () => false,
    updateDocumentBackground: noop,
    setPublicMapUi: noop,
    setRenderOptions: noop,
    applyMapPreset: noop,
    moveSelectedLayer: noop,
    bringToFront: noop,
    sendToBack: noop,
    setSelectedVisibility: noop,
    setSelectedLockedAll: noop,
    alignSelected: noop,
    distributeSelected: noop,
    toggleItemVisible: noop,
    toggleItemLocked: noop,
    duplicateSelectedRow: noop,
    duplicateSelectedColumn: noop,
    duplicateSelectedGrid: noop,
    flipSelectedHorizontal: noop,
    flipSelectedVertical: noop,
    onSelectionChange: (fn) => {
      selectionFns.add(fn);
      return () => selectionFns.delete(fn);
    },
    onDocumentChange: (fn) => {
      documentFns.add(fn);
      return () => documentFns.delete(fn);
    }
  };
  return api;
}
