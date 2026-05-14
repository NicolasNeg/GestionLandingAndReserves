import type { StoreApi } from 'zustand';

export type MapEditorBridgeApi = {
  getJson(): string;
  setJson(json: string): void;
  getDocument(): unknown;
  getItems(): unknown[];
  getSelected(): unknown | null;
  getSelection(): unknown[];
  selectItemById(id: string, additive?: boolean): void;
  updateSelected(patch: Record<string, unknown>): void;
  deleteSelected(): void;
  duplicateSelected(): void;
  undo(): void;
  redo(): void;
  setTool(tool: string): void;
  setSnap(snap: boolean): void;
  setGridVisible(visible: boolean): void;
  setAdding(value: boolean, kind?: string): void;
  addItem(kind?: string, patch?: Record<string, unknown>): unknown;
  addPresetRow(kind?: string, count?: number): void;
  addPresetWideBlock(kind?: string): void;
  setDocumentSize(w: number, h: number): void;
  getDocumentSize(): { w: number; h: number };
  setPreviewMode(on: boolean): void;
  getPreviewMode(): boolean;
  updateDocumentBackground(patch: Record<string, unknown>): void;
  setPublicMapUi(patch: Record<string, unknown>): void;
  setRenderOptions(patch: Record<string, unknown>): void;
  applyMapPreset(presetId: string): void;
  moveSelectedLayer(dir: number): void;
  bringToFront(): void;
  sendToBack(): void;
  setSelectedVisibility(visible: boolean): void;
  setSelectedLockedAll(locked: boolean): void;
  alignSelected(mode: string): void;
  distributeSelected(axis: string): void;
  toggleItemVisible(id: string): void;
  toggleItemLocked(id: string): void;
  duplicateSelectedRow(gap: number): void;
  duplicateSelectedColumn(gap: number): void;
  duplicateSelectedGrid(rows: number, cols: number, gx: number, gy: number): void;
  flipSelectedHorizontal(): void;
  flipSelectedVertical(): void;
  onSelectionChange(fn: (...args: unknown[]) => void): () => void;
  onDocumentChange(fn: (doc: unknown) => void): () => void;
};

let bridge: MapEditorBridgeApi | null = null;

export function registerMapEditorBridge(api: MapEditorBridgeApi | null) {
  bridge = api;
}

export function getMapEditorBridge(): MapEditorBridgeApi | null {
  return bridge;
}

/** Permite enlazar el store zustand al contrato del bridge sin depender de React. */
export function bindStoreToBridge(getStore: () => StoreApi<object>) {
  void getStore;
}
