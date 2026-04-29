import { hitTestMapDocument, itemsIntersectRect } from './mapHitTesting.js';
import { parseMapDocument, serializeMapDocument } from './mapMigrations.js';
import { drawMapCanvas } from './mapRenderer.js';
import { alignItems, distributeItems } from './mapSelection.js';
import { DEFAULT_MAP_ITEM_KIND, getMapKind } from './mapTypes.js';
import { clamp, normalizeMapItem } from './mapSchema.js';

function pointerFor(canvas, doc, ev) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = doc.width / Math.max(1, rect.width);
  const scaleY = doc.height / Math.max(1, rect.height);
  return {
    x: clamp((ev.clientX - rect.left) * scaleX, 0, doc.width),
    y: clamp((ev.clientY - rect.top) * scaleY, 0, doc.height)
  };
}

function snapValue(value, doc) {
  if (!doc.grid?.snap) return Math.round(value);
  const size = Math.max(4, Number(doc.grid?.size || 20));
  return Math.round(value / size) * size;
}

function cloneDoc(doc) {
  return JSON.parse(JSON.stringify(doc));
}

function makeNewItem(doc, patch = {}) {
  const kind = getMapKind(patch.kind).value || DEFAULT_MAP_ITEM_KIND;
  const count = doc.items.filter((item) => item.kind === kind).length + 1;
  const meta = getMapKind(kind);
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

export function createMapEditor(canvas, initialJson, onChange, options = {}) {
  let doc = parseMapDocument(initialJson, options);
  let selectedIds = [];
  let tool = 'select';
  let drawingKind = DEFAULT_MAP_ITEM_KIND;
  let adding = false;
  let dragMode = '';
  let dragStart = null;
  let dragOriginItems = null;
  let resizeHandle = '';
  let marqueeRect = null;
  let clipboard = [];
  const selectionListeners = new Set();
  const documentListeners = new Set();
  const history = [serializeMapDocument(doc)];
  const redoStack = [];

  const emit = () => {
    const json = serializeMapDocument(doc);
    onChange?.(json);
    documentListeners.forEach((fn) => fn(cloneDoc(doc)));
  };

  const saveHistory = () => {
    const json = serializeMapDocument(doc);
    if (history[history.length - 1] !== json) history.push(json);
    if (history.length > 80) history.shift();
    redoStack.length = 0;
  };

  const selectedItems = () => selectedIds.map((id) => doc.items.find((item) => item.id === id)).filter(Boolean);
  const selectedItem = () => selectedItems()[0] || null;

  const notifySelection = () => {
    const item = selectedItem();
    selectionListeners.forEach((fn) => fn(item ? { ...item } : null, doc.items.indexOf(item), selectedItems().map((it) => ({ ...it }))));
  };

  const redraw = () => {
    drawMapCanvas(canvas, doc, {
      ...options,
      editor: true,
      showItemIds: true,
      showKindBadge: true,
      selectedIds,
      marqueeRect
    });
  };

  const commit = () => {
    const json = serializeMapDocument(doc);
    if (history[history.length - 1] !== json) {
      history.push(json);
      if (history.length > 80) history.shift();
    }
    emit();
    notifySelection();
    redraw();
  };

  const setSelection = (ids) => {
    selectedIds = [...new Set(ids.filter(Boolean))];
    notifySelection();
    redraw();
  };

  const handleHit = (point, item) => {
    if (!item || selectedIds.length !== 1) return '';
    const x = Number(item.x || 0);
    const y = Number(item.y || 0);
    const w = Number(item.width || 0);
    const h = Number(item.height || 0);
    const handles = { nw: [x, y], ne: [x + w, y], sw: [x, y + h], se: [x + w, y + h] };
    return Object.entries(handles).find(([, [hx, hy]]) => Math.abs(point.x - hx) <= 10 && Math.abs(point.y - hy) <= 10)?.[0] || '';
  };

  const onDown = (ev) => {
    const point = pointerFor(canvas, doc, ev);
    if (tool === 'pan') {
      dragMode = 'pan';
      dragStart = { clientX: ev.clientX, clientY: ev.clientY };
      return;
    }

    const current = selectedItem();
    const handle = handleHit(point, current);
    if (handle && current && !current.locked) {
      saveHistory();
      dragMode = 'resize';
      resizeHandle = handle;
      dragStart = point;
      return;
    }

    if (adding || tool === 'draw') {
      saveHistory();
      dragMode = 'draw';
      dragStart = point;
      return;
    }

    const hit = hitTestMapDocument(doc, point.x, point.y);
    if (hit.item) {
      if (ev.shiftKey) {
        const exists = selectedIds.includes(hit.item.id);
        setSelection(exists ? selectedIds.filter((id) => id !== hit.item.id) : [...selectedIds, hit.item.id]);
      } else if (!selectedIds.includes(hit.item.id)) {
        setSelection([hit.item.id]);
      }
      if (!hit.item.locked) {
        saveHistory();
        dragMode = 'drag';
        dragStart = point;
        dragOriginItems = selectedItems().map((item) => ({ id: item.id, x: item.x, y: item.y }));
      }
      return;
    }

    if (!ev.shiftKey) setSelection([]);
    dragMode = 'marquee';
    dragStart = point;
    marqueeRect = { x: point.x, y: point.y, width: 0, height: 0 };
    redraw();
  };

  const resizeSelected = (point) => {
    const item = selectedItem();
    if (!item || item.locked) return;
    const min = 16;
    const right = Number(item.x) + Number(item.width);
    const bottom = Number(item.y) + Number(item.height);
    if (resizeHandle.includes('n')) {
      const nextY = clamp(snapValue(point.y, doc), 0, bottom - min);
      item.height = Math.round(bottom - nextY);
      item.y = nextY;
    }
    if (resizeHandle.includes('s')) item.height = Math.round(clamp(snapValue(point.y - Number(item.y), doc), min, doc.height - Number(item.y)));
    if (resizeHandle.includes('w')) {
      const nextX = clamp(snapValue(point.x, doc), 0, right - min);
      item.width = Math.round(right - nextX);
      item.x = nextX;
    }
    if (resizeHandle.includes('e')) item.width = Math.round(clamp(snapValue(point.x - Number(item.x), doc), min, doc.width - Number(item.x)));
  };

  const onMove = (ev) => {
    const point = pointerFor(canvas, doc, ev);
    if (dragMode === 'pan' && dragStart) {
      const scroller = canvas.closest('.mapa-viewport-outer');
      if (scroller) {
        scroller.scrollLeft -= ev.clientX - dragStart.clientX;
        scroller.scrollTop -= ev.clientY - dragStart.clientY;
      }
      dragStart = { clientX: ev.clientX, clientY: ev.clientY };
      return;
    }
    if (dragMode === 'resize') {
      resizeSelected(point);
      commit();
      return;
    }
    if (dragMode === 'drag' && dragStart && dragOriginItems) {
      const dx = snapValue(point.x - dragStart.x, doc);
      const dy = snapValue(point.y - dragStart.y, doc);
      dragOriginItems.forEach((origin) => {
        const item = doc.items.find((candidate) => candidate.id === origin.id);
        if (!item || item.locked) return;
        item.x = clamp(origin.x + dx, 0, Math.max(0, doc.width - Number(item.width || 0)));
        item.y = clamp(origin.y + dy, 0, Math.max(0, doc.height - Number(item.height || 0)));
      });
      commit();
      return;
    }
    if (dragMode === 'draw' && dragStart) {
      marqueeRect = {
        x: dragStart.x,
        y: dragStart.y,
        width: point.x - dragStart.x,
        height: point.y - dragStart.y
      };
      redraw();
      return;
    }
    if (dragMode === 'marquee' && dragStart) {
      marqueeRect = {
        x: dragStart.x,
        y: dragStart.y,
        width: point.x - dragStart.x,
        height: point.y - dragStart.y
      };
      redraw();
    }
  };

  const onUp = (ev) => {
    const point = pointerFor(canvas, doc, ev);
    if (dragMode === 'draw' && dragStart) {
      const x = Math.min(dragStart.x, point.x);
      const y = Math.min(dragStart.y, point.y);
      const width = Math.max(Math.abs(point.x - dragStart.x), 32);
      const height = Math.max(Math.abs(point.y - dragStart.y), 32);
      const item = makeNewItem(doc, {
        kind: drawingKind,
        x: snapValue(x, doc),
        y: snapValue(y, doc),
        width: snapValue(width, doc),
        height: snapValue(height, doc)
      });
      doc.items.push(item);
      selectedIds = [item.id];
      adding = false;
      tool = 'select';
      marqueeRect = null;
      dragMode = '';
      dragStart = null;
      commit();
      return;
    }
    if (dragMode === 'marquee' && marqueeRect) {
      const indices = itemsIntersectRect(doc.items, marqueeRect);
      const ids = indices.map((index) => doc.items[index]?.id).filter(Boolean);
      marqueeRect = null;
      dragMode = '';
      dragStart = null;
      setSelection(ev.shiftKey ? [...selectedIds, ...ids] : ids);
      return;
    }
    dragMode = '';
    dragStart = null;
    dragOriginItems = null;
    resizeHandle = '';
    marqueeRect = null;
    redraw();
  };

  const undo = () => {
    if (history.length <= 1) return;
    redoStack.push(history.pop());
    doc = parseMapDocument(history[history.length - 1], { view: doc.view });
    selectedIds = selectedIds.filter((id) => doc.items.some((item) => item.id === id));
    commit();
  };

  const redo = () => {
    const next = redoStack.pop();
    if (!next) return;
    history.push(next);
    doc = parseMapDocument(next, { view: doc.view });
    selectedIds = selectedIds.filter((id) => doc.items.some((item) => item.id === id));
    commit();
  };

  const onKey = (ev) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
      ev.preventDefault();
      if (ev.shiftKey) redo();
      else undo();
      return;
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'y') {
      ev.preventDefault();
      redo();
      return;
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'c') {
      clipboard = selectedItems().map((item) => cloneDoc(item));
      return;
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'v') {
      ev.preventDefault();
      if (!clipboard.length) return;
      saveHistory();
      const nextItems = clipboard.map((item, index) => makeNewItem(doc, {
        ...item,
        id: `${item.id}-copia-${index + 1}`,
        x: Number(item.x || 0) + 24,
        y: Number(item.y || 0) + 24
      }));
      doc.items.push(...nextItems);
      selectedIds = nextItems.map((item) => item.id);
      commit();
      return;
    }
    if (ev.key === 'Escape') {
      adding = false;
      tool = 'select';
      marqueeRect = null;
      redraw();
      return;
    }
    if ((ev.key === 'Delete' || ev.key === 'Backspace') && selectedIds.length) {
      ev.preventDefault();
      saveHistory();
      doc.items = doc.items.filter((item) => !selectedIds.includes(item.id));
      selectedIds = [];
      commit();
      return;
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(ev.key) && selectedIds.length) {
      ev.preventDefault();
      saveHistory();
      const step = ev.shiftKey ? 10 : 1;
      selectedItems().forEach((item) => {
        if (item.locked) return;
        if (ev.key === 'ArrowUp') item.y = clamp(Number(item.y) - step, 0, doc.height - Number(item.height));
        if (ev.key === 'ArrowDown') item.y = clamp(Number(item.y) + step, 0, doc.height - Number(item.height));
        if (ev.key === 'ArrowLeft') item.x = clamp(Number(item.x) - step, 0, doc.width - Number(item.width));
        if (ev.key === 'ArrowRight') item.x = clamp(Number(item.x) + step, 0, doc.width - Number(item.width));
      });
      commit();
    }
  };

  canvas.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  window.addEventListener('keydown', onKey);
  redraw();

  return {
    getJson: () => serializeMapDocument(doc),
    getDocument: () => cloneDoc(doc),
    getItems: () => doc.items.map((item) => ({ ...item })),
    setJson: (s) => {
      doc = parseMapDocument(s, { view: options.view || doc.view });
      selectedIds = [];
      history.length = 0;
      history.push(serializeMapDocument(doc));
      redoStack.length = 0;
      commit();
    },
    setDocumentSize: (w, h) => {
      saveHistory();
      doc.width = clamp(Math.round(Number(w) || doc.width), 320, 6000);
      doc.height = clamp(Math.round(Number(h) || doc.height), 220, 4000);
      doc.items.forEach((item) => {
        item.x = clamp(Number(item.x || 0), 0, Math.max(0, doc.width - Number(item.width || 0)));
        item.y = clamp(Number(item.y || 0), 0, Math.max(0, doc.height - Number(item.height || 0)));
      });
      commit();
    },
    getDocumentSize: () => ({ w: doc.width, h: doc.height }),
    setTool: (nextTool) => {
      tool = nextTool || 'select';
      adding = false;
      marqueeRect = null;
      redraw();
    },
    setSnap: (snap) => {
      doc.grid = { ...(doc.grid || {}), snap: Boolean(snap) };
      commit();
    },
    setAdding: (value, kind = DEFAULT_MAP_ITEM_KIND) => {
      adding = Boolean(value);
      drawingKind = getMapKind(kind).value || kind;
      tool = adding ? 'draw' : 'select';
    },
    addItem: (kind = DEFAULT_MAP_ITEM_KIND, patch = {}) => {
      saveHistory();
      const item = makeNewItem(doc, { ...patch, kind });
      doc.items.push(item);
      selectedIds = [item.id];
      commit();
      return { ...item };
    },
    addPresetRow: (kind = DEFAULT_MAP_ITEM_KIND, count = 3) => {
      saveHistory();
      const gap = 18;
      const cellW = kind === 'mesa' ? 76 : 118;
      const cellH = kind === 'mesa' ? 76 : 74;
      const startX = 56;
      const startY = Math.min(130, doc.height - cellH - 44);
      const created = [];
      for (let i = 0; i < count; i++) {
        const item = makeNewItem(doc, {
          kind,
          x: startX + i * (cellW + gap),
          y: startY,
          width: cellW,
          height: cellH
        });
        doc.items.push(item);
        created.push(item.id);
      }
      selectedIds = created;
      commit();
    },
    addPresetWideBlock: (kind = DEFAULT_MAP_ITEM_KIND) => {
      saveHistory();
      const item = makeNewItem(doc, {
        kind,
        x: 48,
        y: 92,
        width: Math.min(560, doc.width - 96),
        height: 110
      });
      doc.items.push(item);
      selectedIds = [item.id];
      commit();
    },
    getSelected: () => {
      const item = selectedItem();
      return item ? { ...item } : null;
    },
    getSelection: () => selectedItems().map((item) => ({ ...item })),
    selectItemById: (id, additive = false) => setSelection(additive ? [...selectedIds, id] : [id]),
    updateSelected: (patch = {}) => {
      const items = selectedItems();
      if (!items.length) return;
      saveHistory();
      items.forEach((item, index) => {
        if (item.locked && !('locked' in patch) && !('visible' in patch)) return;
        const nextKind = getMapKind(patch.kind || item.kind);
        const normalized = normalizeMapItem({
          ...item,
          ...patch,
          kind: nextKind.value || patch.kind || item.kind,
          fill: patch.fill || (patch.kind && patch.kind !== item.kind ? nextKind.fill : item.fill),
          stroke: patch.stroke || (patch.kind && patch.kind !== item.kind ? nextKind.stroke : item.stroke),
          metadata: {
            ...(item.metadata || {}),
            ...(patch.metadata || {})
          }
        }, doc.items.indexOf(item), { view: doc.view });
        Object.assign(item, normalized);
        if (index > 0 && (patch.id || patch.label)) {
          item.id = `${normalized.id}-${index + 1}`;
        }
      });
      commit();
    },
    deleteSelected: () => {
      if (!selectedIds.length) return;
      saveHistory();
      doc.items = doc.items.filter((item) => !selectedIds.includes(item.id));
      selectedIds = [];
      commit();
    },
    duplicateSelected: () => {
      const items = selectedItems();
      if (!items.length) return;
      saveHistory();
      const created = items.map((item, index) => makeNewItem(doc, {
        ...item,
        id: `${item.id}-copia-${index + 1}`,
        x: Number(item.x || 0) + 24,
        y: Number(item.y || 0) + 24
      }));
      doc.items.push(...created);
      selectedIds = created.map((item) => item.id);
      commit();
    },
    moveSelectedLayer: (dir) => {
      if (!selectedIds.length) return;
      saveHistory();
      selectedIds.forEach((id) => {
        const index = doc.items.findIndex((item) => item.id === id);
        const next = clamp(index + dir, 0, doc.items.length - 1);
        if (index >= 0 && next !== index) {
          const [item] = doc.items.splice(index, 1);
          doc.items.splice(next, 0, item);
        }
      });
      doc.items.forEach((item, index) => {
        item.zIndex = index;
      });
      commit();
    },
    bringToFront: () => {
      if (!selectedIds.length) return;
      saveHistory();
      const selected = doc.items.filter((item) => selectedIds.includes(item.id));
      doc.items = doc.items.filter((item) => !selectedIds.includes(item.id)).concat(selected);
      doc.items.forEach((item, index) => {
        item.zIndex = index;
      });
      commit();
    },
    sendToBack: () => {
      if (!selectedIds.length) return;
      saveHistory();
      const selected = doc.items.filter((item) => selectedIds.includes(item.id));
      doc.items = selected.concat(doc.items.filter((item) => !selectedIds.includes(item.id)));
      doc.items.forEach((item, index) => {
        item.zIndex = index;
      });
      commit();
    },
    alignSelected: (mode) => {
      if (selectedIds.length < 2) return;
      saveHistory();
      alignItems(selectedItems(), mode);
      commit();
    },
    distributeSelected: (axis) => {
      if (selectedIds.length < 3) return;
      saveHistory();
      distributeItems(selectedItems(), axis);
      commit();
    },
    toggleItemVisible: (id) => {
      const item = doc.items.find((candidate) => candidate.id === id);
      if (!item) return;
      saveHistory();
      item.visible = item.visible === false;
      commit();
    },
    toggleItemLocked: (id) => {
      const item = doc.items.find((candidate) => candidate.id === id);
      if (!item) return;
      saveHistory();
      item.locked = !item.locked;
      commit();
    },
    undo,
    redo,
    onSelectionChange: (fn) => {
      selectionListeners.add(fn);
      fn(selectedItem() ? { ...selectedItem() } : null, doc.items.indexOf(selectedItem()), selectedItems().map((it) => ({ ...it })));
      return () => selectionListeners.delete(fn);
    },
    onDocumentChange: (fn) => {
      documentListeners.add(fn);
      fn(cloneDoc(doc));
      return () => documentListeners.delete(fn);
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKey);
      selectionListeners.clear();
      documentListeners.clear();
    }
  };
}
