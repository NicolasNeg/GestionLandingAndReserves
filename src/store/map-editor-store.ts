import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { parseMapDocument, serializeMapDocument } from '../lib/mapEngine/mapMigrations.js';
import { clamp, normalizeMapItem } from '../lib/mapEngine/mapSchema.js';
import { DEFAULT_MAP_ITEM_KIND, getMapKind } from '../lib/mapEngine/mapTypes.js';

function cloneDoc(doc: unknown) {
  return JSON.parse(JSON.stringify(doc));
}

function makeItem(doc: any, patch: Record<string, unknown> = {}) {
  const kind = getMapKind(String(patch.kind || DEFAULT_MAP_ITEM_KIND)).value || DEFAULT_MAP_ITEM_KIND;
  const meta = getMapKind(kind);
  const count = doc.items.filter((it: any) => it.kind === kind).length + 1;
  return normalizeMapItem(
    {
      id: patch.id || `${kind}-${String(count).padStart(2, '0')}`,
      kind,
      type: patch.type || meta.type,
      label: patch.label || meta.label,
      x: patch.x ?? 40,
      y: patch.y ?? 40,
      width: patch.width ?? (kind === 'mesa' ? 76 : 130),
      height: patch.height ?? (kind === 'mesa' ? 76 : 84),
      fill: patch.fill || meta.fill,
      stroke: patch.stroke || meta.stroke,
      layerId: patch.layerId || meta.layerId,
      notes: patch.notes || '',
      locked: patch.locked || false,
      visible: patch.visible !== false,
      metadata: patch.metadata || {}
    },
    doc.items.length,
    { view: doc.view }
  );
}

type Listener = (...args: unknown[]) => void;

export type MapEditorStore = {
  view: string;
  doc: any;
  selectedIds: string[];
  tool: 'select' | 'pan' | 'draw';
  adding: boolean;
  drawKind: string;
  zoom: number;
  panX: number;
  panY: number;
  /** Último tamaño del lienzo (stage); para zoom anclado desde botones y rueda. */
  editorViewportW: number;
  editorViewportH: number;
  gridVisible: boolean;
  snap: boolean;
  previewMode: boolean;
  history: string[];
  redoStack: string[];
  selectionListeners: Set<Listener>;
  documentListeners: Set<(d: unknown) => void>;
  runtimeRenderOptions: Record<string, unknown>;
  saveHistoryBefore: () => void;
  commit: () => void;
  loadFromJson: (json: string, view?: string) => void;
  setSelectedIds: (ids: string[], additive?: boolean) => void;
  selectItemById: (id: string, additive?: boolean) => void;
  updateSelected: (patch: Record<string, unknown>) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  setTool: (t: string) => void;
  setSnap: (v: boolean) => void;
  setGridVisible: (v: boolean) => void;
  setAdding: (v: boolean, kind?: string) => void;
  addItem: (kind?: string, patch?: Record<string, unknown>) => unknown;
  addPresetRow: (kind?: string, count?: number) => void;
  addPresetWideBlock: (kind?: string) => void;
  setDocumentSize: (w: number, h: number) => void;
  setPreviewMode: (on: boolean) => void;
  updateDocumentBackground: (patch: Record<string, unknown>) => void;
  setRenderOptions: (patch: Record<string, unknown>) => void;
  setPublicMapUi: (patch: Record<string, unknown>) => void;
  applyMapPreset: (_presetId: string) => void;
  moveSelectedLayer: (dir: number) => void;
  bringToFront: () => void;
  sendToBack: () => void;
  setSelectedVisibility: (v: boolean) => void;
  setSelectedLockedAll: (v: boolean) => void;
  alignSelected: (_mode: string) => void;
  distributeSelected: (_axis: string) => void;
  toggleItemVisible: (id: string) => void;
  toggleItemLocked: (id: string) => void;
  duplicateSelectedRow: (_gap: number) => void;
  duplicateSelectedColumn: (_gap: number) => void;
  duplicateSelectedGrid: (_r: number, _c: number, _gx: number, _gy: number) => void;
  flipSelectedHorizontal: () => void;
  flipSelectedVertical: () => void;
  undo: () => void;
  redo: () => void;
  onSelectionChange: (fn: Listener) => () => void;
  onDocumentChange: (fn: (d: unknown) => void) => () => void;
  emitSelection: () => void;
  emitDocument: () => void;
  setZoom: (z: number) => void;
  setPan: (x: number, y: number) => void;
  setEditorViewport: (w: number, h: number) => void;
  setZoomAnchored: (newZoom: number, anchorStageX: number, anchorStageY: number) => void;
  patchItemById: (id: string, patch: Record<string, unknown>) => void;
};

function emitSel(state: MapEditorStore) {
  const sel =
    state.doc.items.find((it: any) => state.selectedIds.includes(it.id)) || null;
  const selectedObjs = state.selectedIds
    .map((id) => state.doc.items.find((x: any) => x.id === id))
    .filter(Boolean)
    .map((x: any) => ({ ...x }));
  state.selectionListeners.forEach((fn) => fn(sel ? { ...sel } : null, 0, selectedObjs));
}

function emitDoc(state: MapEditorStore) {
  const d = cloneDoc(state.doc);
  state.documentListeners.forEach((fn) => fn(d));
}

const FIT_PAD = 0.94;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3;

/** Mantiene fijo el punto del documento que estaba bajo (ax, ay) en coords del stage al cambiar zoom. */
function computeAnchoredZoomPan(
  state: Pick<MapEditorStore, 'doc' | 'zoom' | 'panX' | 'panY'>,
  vw: number,
  vh: number,
  newZoom: number,
  ax: number,
  ay: number
) {
  const doc = state.doc;
  const dw = Math.max(1, Number(doc.width) || 1);
  const dh = Math.max(1, Number(doc.height) || 1);
  const oldZoom = state.zoom;
  const newZ = clamp(Number(newZoom) || 1, ZOOM_MIN, ZOOM_MAX);
  const fitOld = Math.min(vw / dw, vh / dh) * FIT_PAD * oldZoom;
  const fitNew = Math.min(vw / dw, vh / dh) * FIT_PAD * newZ;
  const baseXo = (vw - dw * fitOld) / 2;
  const baseYo = (vh - dh * fitOld) / 2;
  const mapX = (ax - baseXo - state.panX) / fitOld;
  const mapY = (ay - baseYo - state.panY) / fitOld;
  const baseXn = (vw - dw * fitNew) / 2;
  const baseYn = (vh - dh * fitNew) / 2;
  return {
    zoom: newZ,
    panX: ax - mapX * fitNew - baseXn,
    panY: ay - mapY * fitNew - baseYn
  };
}

const initialDoc = parseMapDocument('', { view: 'global' });
const initialSnap = serializeMapDocument(initialDoc);

export const useMapEditorStore = create<MapEditorStore>((set, get) => ({
  view: 'global',
  doc: initialDoc,
  selectedIds: [],
  tool: 'select',
  adding: false,
  drawKind: DEFAULT_MAP_ITEM_KIND,
  zoom: 1,
  panX: 0,
  panY: 0,
  editorViewportW: 900,
  editorViewportH: 520,
  gridVisible: true,
  snap: true,
  previewMode: false,
  history: [initialSnap],
  redoStack: [],
  selectionListeners: new Set(),
  documentListeners: new Set(),
  runtimeRenderOptions: {},

  saveHistoryBefore() {
    const { doc, history } = get();
    const json = serializeMapDocument(doc);
    const h = [...history];
    if (h[h.length - 1] !== json) h.push(json);
    if (h.length > 80) h.shift();
    set({ history: h, redoStack: [] });
  },

  commit() {
    const { doc, history } = get();
    const json = serializeMapDocument(doc);
    const h = [...history];
    if (h[h.length - 1] !== json) {
      h.push(json);
      if (h.length > 80) h.shift();
    }
    set({ history: h });
    const onChange = (useMapEditorStore as unknown as { _onChange?: (j: string) => void })._onChange;
    onChange?.(json);
    emitDoc(get());
    emitSel(get());
  },

  loadFromJson(json, view) {
    const doc = parseMapDocument(json || '{}', { view: view || get().view });
    const snap = serializeMapDocument(doc);
    set({
      doc,
      view: doc.view || view || 'global',
      selectedIds: [],
      history: [snap],
      redoStack: [],
      tool: 'select',
      adding: false,
      previewMode: false,
      zoom: 1,
      panX: 0,
      panY: 0
    });
    emitDoc(get());
    emitSel(get());
  },

  emitSelection() {
    emitSel(get());
  },

  emitDocument() {
    emitDoc(get());
  },

  setSelectedIds(ids, additive) {
    set((s) => ({
      selectedIds: additive ? Array.from(new Set([...s.selectedIds, ...ids])) : [...ids]
    }));
    get().emitSelection();
  },

  selectItemById(id, additive) {
    if (!id) {
      set({ selectedIds: [] });
      get().emitSelection();
      return;
    }
    get().setSelectedIds([id], additive);
  },

  updateSelected(patch) {
    const { doc, selectedIds, saveHistoryBefore, commit } = get();
    if (!selectedIds.length) return;
    saveHistoryBefore();
    const next = cloneDoc(doc);
    selectedIds.forEach((id, index) => {
      const idx = next.items.findIndex((it: any) => it.id === id);
      if (idx < 0) return;
      const item = next.items[idx];
      if (item.locked && !('locked' in patch) && !('visible' in patch)) return;
      const merged = normalizeMapItem(
        {
          ...item,
          ...patch,
          kind: patch.kind ? getMapKind(String(patch.kind)).value || item.kind : item.kind,
          metadata: { ...(item.metadata || {}), ...((patch.metadata as object) || {}) }
        },
        idx,
        { view: next.view }
      );
      if (index > 0 && (patch.id || patch.label)) {
        merged.id = `${merged.id}-${index + 1}`;
      }
      next.items[idx] = merged;
    });
    set({ doc: next });
    commit();
  },

  patchItemById(id, patch) {
    const { doc, saveHistoryBefore, commit } = get();
    const idx = doc.items.findIndex((it: any) => it.id === id);
    if (idx < 0) return;
    saveHistoryBefore();
    const next = cloneDoc(doc);
    const item = next.items[idx];
    next.items[idx] = normalizeMapItem({ ...item, ...patch }, idx, { view: next.view });
    set({ doc: next });
    commit();
  },

  deleteSelected() {
    const { doc, selectedIds, saveHistoryBefore, commit } = get();
    if (!selectedIds.length) return;
    saveHistoryBefore();
    const next = cloneDoc(doc);
    next.items = next.items.filter((it: any) => !selectedIds.includes(it.id));
    set({ doc: next, selectedIds: [] });
    commit();
  },

  duplicateSelected() {
    const { doc, selectedIds, saveHistoryBefore, commit } = get();
    if (!selectedIds.length) return;
    saveHistoryBefore();
    const next = cloneDoc(doc);
    const newIds: string[] = [];
    for (const id of selectedIds) {
      const item = next.items.find((it: any) => it.id === id);
      if (!item) continue;
      const copy = JSON.parse(JSON.stringify(item));
      copy.id = `${String(item.kind || 'item')}-${nanoid(8)}`;
      copy.x = clamp(Number(copy.x) + 16, 0, next.width - Number(copy.width));
      copy.y = clamp(Number(copy.y) + 16, 0, next.height - Number(copy.height));
      next.items.push(normalizeMapItem(copy, next.items.length, { view: next.view }));
      newIds.push(copy.id);
    }
    set({ doc: next, selectedIds: newIds });
    commit();
  },

  setTool(t) {
    const tool = (t === 'pan' ? 'pan' : t === 'draw' ? 'draw' : 'select') as 'select' | 'pan' | 'draw';
    set({ tool, adding: false });
  },

  setSnap(v) {
    set((s) => ({ doc: { ...s.doc, grid: { ...s.doc.grid, snap: v } } }));
    get().commit();
  },

  setGridVisible(v) {
    set((s) => ({ gridVisible: v, doc: { ...s.doc, grid: { ...s.doc.grid, visible: v } } }));
    get().commit();
  },

  setAdding(v, kind) {
    const drawKind = getMapKind(String(kind || DEFAULT_MAP_ITEM_KIND)).value || DEFAULT_MAP_ITEM_KIND;
    set({ adding: Boolean(v), drawKind, tool: v ? 'draw' : 'select' });
  },

  addItem(kind, patch = {}) {
    const { doc, saveHistoryBefore, commit, selectItemById } = get();
    saveHistoryBefore();
    const next = cloneDoc(doc);
    const item = makeItem(next, { ...patch, kind: kind || patch.kind });
    next.items.push(item);
    set({ doc: next });
    selectItemById(item.id, false);
    commit();
    return item;
  },

  addPresetRow(kind, count = 3) {
    const k = getMapKind(String(kind || DEFAULT_MAP_ITEM_KIND)).value || DEFAULT_MAP_ITEM_KIND;
    const { doc, saveHistoryBefore, commit } = get();
    saveHistoryBefore();
    const next = cloneDoc(doc);
    const gap = 18;
    const cellW = k === 'mesa' ? 76 : 118;
    const cellH = k === 'mesa' ? 76 : 74;
    const startX = 56;
    const startY = Math.min(130, doc.height - cellH - 44);
    const created: string[] = [];
    for (let i = 0; i < count; i++) {
      const item = makeItem(next, {
        kind: k,
        x: startX + i * (cellW + gap),
        y: startY,
        width: cellW,
        height: cellH
      });
      next.items.push(item);
      created.push(item.id);
    }
    set({ doc: next, selectedIds: created });
    commit();
  },

  addPresetWideBlock(kind) {
    const k = getMapKind(String(kind || DEFAULT_MAP_ITEM_KIND)).value || DEFAULT_MAP_ITEM_KIND;
    const { doc } = get();
    get().addItem(k, { x: 48, y: 92, width: Math.min(560, doc.width - 96), height: 110 });
  },

  setDocumentSize(w, h) {
    const { doc, saveHistoryBefore, commit } = get();
    saveHistoryBefore();
    const next = cloneDoc(doc);
    next.width = clamp(Math.round(Number(w) || next.width), 320, 6000);
    next.height = clamp(Math.round(Number(h) || next.height), 220, 4000);
    next.items.forEach((item: any) => {
      item.x = clamp(Number(item.x || 0), 0, Math.max(0, next.width - Number(item.width || 0)));
      item.y = clamp(Number(item.y || 0), 0, Math.max(0, next.height - Number(item.height || 0)));
    });
    set({ doc: next });
    commit();
  },

  setPreviewMode(on) {
    set({ previewMode: Boolean(on), adding: false, tool: 'select' });
    get().commit();
  },

  updateDocumentBackground(patch) {
    const { doc, saveHistoryBefore, commit } = get();
    saveHistoryBefore();
    const next = cloneDoc(doc);
    next.background = { ...(next.background || {}), ...patch };
    set({ doc: next });
    commit();
  },

  setRenderOptions(patch) {
    set((s) => ({ runtimeRenderOptions: { ...s.runtimeRenderOptions, ...patch } }));
  },

  setPublicMapUi(patch) {
    const { doc, saveHistoryBefore, commit } = get();
    saveHistoryBefore();
    const next = cloneDoc(doc);
    next.publicMapUi = { ...(next.publicMapUi || {}), ...patch };
    set({ doc: next });
    commit();
  },

  applyMapPreset() {},

  moveSelectedLayer(dir) {
    const { doc, selectedIds, saveHistoryBefore, commit } = get();
    if (!selectedIds.length) return;
    saveHistoryBefore();
    const next = cloneDoc(doc);
    selectedIds.forEach((id) => {
      const index = next.items.findIndex((it: any) => it.id === id);
      const to = clamp(index + dir, 0, next.items.length - 1);
      if (index >= 0 && to !== index) {
        const [it] = next.items.splice(index, 1);
        next.items.splice(to, 0, it);
      }
    });
    next.items.forEach((it: any, i: number) => {
      it.zIndex = i;
    });
    set({ doc: next });
    commit();
  },

  bringToFront() {
    const { doc, selectedIds, saveHistoryBefore, commit } = get();
    if (!selectedIds.length) return;
    saveHistoryBefore();
    const next = cloneDoc(doc);
    const sel = next.items.filter((it: any) => selectedIds.includes(it.id));
    next.items = next.items.filter((it: any) => !selectedIds.includes(it.id)).concat(sel);
    next.items.forEach((it: any, i: number) => {
      it.zIndex = i;
    });
    set({ doc: next });
    commit();
  },

  sendToBack() {
    const { doc, selectedIds, saveHistoryBefore, commit } = get();
    if (!selectedIds.length) return;
    saveHistoryBefore();
    const next = cloneDoc(doc);
    const sel = next.items.filter((it: any) => selectedIds.includes(it.id));
    next.items = sel.concat(next.items.filter((it: any) => !selectedIds.includes(it.id)));
    next.items.forEach((it: any, i: number) => {
      it.zIndex = i;
    });
    set({ doc: next });
    commit();
  },

  setSelectedVisibility(v) {
    get().updateSelected({ visible: v });
  },

  setSelectedLockedAll(v) {
    get().updateSelected({ locked: v });
  },

  alignSelected() {},
  distributeSelected() {},

  toggleItemVisible(id) {
    const { doc, saveHistoryBefore, commit } = get();
    const idx = doc.items.findIndex((it: any) => it.id === id);
    if (idx < 0) return;
    saveHistoryBefore();
    const next = cloneDoc(doc);
    next.items[idx].visible = next.items[idx].visible === false;
    set({ doc: next });
    commit();
  },

  toggleItemLocked(id) {
    const { doc, saveHistoryBefore, commit } = get();
    const idx = doc.items.findIndex((it: any) => it.id === id);
    if (idx < 0) return;
    saveHistoryBefore();
    const next = cloneDoc(doc);
    next.items[idx].locked = !next.items[idx].locked;
    set({ doc: next });
    commit();
  },

  duplicateSelectedRow() {},
  duplicateSelectedColumn() {},
  duplicateSelectedGrid() {},

  flipSelectedHorizontal() {
    const { saveHistoryBefore, commit } = get();
    saveHistoryBefore();
    commit();
  },

  flipSelectedVertical() {
    get().flipSelectedHorizontal();
  },

  undo() {
    const { history, redoStack, view } = get();
    if (history.length <= 1) return;
    const h = [...history];
    const r = [...redoStack];
    r.push(h.pop()!);
    const prev = h[h.length - 1];
    set({
      history: h,
      redoStack: r,
      doc: parseMapDocument(prev, { view }),
      selectedIds: []
    });
    const json = serializeMapDocument(get().doc);
    (useMapEditorStore as unknown as { _onChange?: (j: string) => void })._onChange?.(json);
    emitDoc(get());
    emitSel(get());
  },

  redo() {
    const { history, redoStack, view } = get();
    if (!redoStack.length) return;
    const h = [...history];
    const r = [...redoStack];
    const next = r.pop()!;
    h.push(next);
    set({
      history: h,
      redoStack: r,
      doc: parseMapDocument(next, { view }),
      selectedIds: []
    });
    const json = serializeMapDocument(get().doc);
    (useMapEditorStore as unknown as { _onChange?: (j: string) => void })._onChange?.(json);
    emitDoc(get());
    emitSel(get());
  },

  onSelectionChange(fn) {
    get().selectionListeners.add(fn);
    const st = get();
    const sel = st.doc.items.find((it: any) => st.selectedIds.includes(it.id)) || null;
    const selectedObjs = st.selectedIds
      .map((id) => st.doc.items.find((x: any) => x.id === id))
      .filter(Boolean)
      .map((x: any) => ({ ...x }));
    fn(sel ? { ...sel } : null, 0, selectedObjs);
    return () => {
      get().selectionListeners.delete(fn);
    };
  },

  onDocumentChange(fn) {
    get().documentListeners.add(fn);
    fn(cloneDoc(get().doc));
    return () => {
      get().documentListeners.delete(fn);
    };
  },

  setZoom(z) {
    set({ zoom: clamp(Number(z) || 1, ZOOM_MIN, ZOOM_MAX) });
  },

  setPan(x, y) {
    set({ panX: x, panY: y });
  },

  setEditorViewport(w, h) {
    const rw = Math.max(1, Math.round(Number(w) || 1));
    const rh = Math.max(1, Math.round(Number(h) || 1));
    set({ editorViewportW: rw, editorViewportH: rh });
  },

  setZoomAnchored(newZoom, ax, ay) {
    const s = get();
    const next = computeAnchoredZoomPan(s, s.editorViewportW, s.editorViewportH, newZoom, ax, ay);
    if (Math.abs(next.zoom - s.zoom) < 1e-9) return;
    set({ zoom: next.zoom, panX: next.panX, panY: next.panY });
  }
}));

export function setMapEditorOnChange(cb: ((json: string) => void) | undefined) {
  (useMapEditorStore as unknown as { _onChange?: (j: string) => void })._onChange = cb;
}
