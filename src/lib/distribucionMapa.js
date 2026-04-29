/** JSON del mapa editable en admin y solo lectura en /home */

export const MAP_ITEM_KINDS = [
  { value: 'mesa', label: 'Mesa', fill: 'rgba(37, 99, 235, 0.28)', stroke: '#1d4ed8' },
  { value: 'area', label: 'Area', fill: 'rgba(20, 184, 166, 0.24)', stroke: '#0f766e' },
  { value: 'limitacion', label: 'Limitacion', fill: 'rgba(244, 63, 94, 0.14)', stroke: '#be123c', dashed: true },
  { value: 'estacionamiento', label: 'Cajon estacionamiento', fill: 'rgba(245, 158, 11, 0.22)', stroke: '#b45309' },
  { value: 'alberca', label: 'Alberca', fill: 'rgba(14, 165, 233, 0.24)', stroke: '#0369a1' },
  { value: 'palapa', label: 'Palapa', fill: 'rgba(132, 204, 22, 0.22)', stroke: '#4d7c0f' },
  { value: 'servicio', label: 'Servicio', fill: 'rgba(168, 85, 247, 0.20)', stroke: '#7e22ce' },
  { value: 'entrada', label: 'Entrada / salida', fill: 'rgba(16, 185, 129, 0.24)', stroke: '#047857' }
];

export const DEFAULT_MAP_ITEM_KIND = 'area';

export const DEFAULT_MAPA_JSON = JSON.stringify({
  w: 800,
  h: 440,
  items: []
});

const KIND_BY_VALUE = MAP_ITEM_KINDS.reduce((acc, kind) => {
  acc[kind.value] = kind;
  return acc;
}, {});

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function sanitizeId(text, fallback) {
  const clean = String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || fallback;
}

export function getMapKind(kind) {
  return KIND_BY_VALUE[kind] || KIND_BY_VALUE[DEFAULT_MAP_ITEM_KIND];
}

export function normalizeMapItem(item, index = 0) {
  const kind = KIND_BY_VALUE[item?.kind] ? item.kind : DEFAULT_MAP_ITEM_KIND;
  const meta = getMapKind(kind);
  const fallbackId = `${kind}-${String(index + 1).padStart(2, '0')}`;
  const id = sanitizeId(item?.id, fallbackId);
  const width = clamp(Math.round(Number(item?.width) || 100), 20, 2000);
  const height = clamp(Math.round(Number(item?.height) || 80), 20, 2000);
  return {
    type: 'rect',
    id,
    kind,
    label: String(item?.label || meta.label || 'Zona'),
    x: Math.round(Number(item?.x) || 0),
    y: Math.round(Number(item?.y) || 0),
    width,
    height,
    fill: item?.fill || meta.fill,
    stroke: item?.stroke || meta.stroke,
    notes: String(item?.notes || ''),
    locked: Boolean(item?.locked)
  };
}

export function parseDistribucionJson(jsonStr) {
  try {
    const o = JSON.parse(jsonStr || '{}');
    const w = Number(o.w) > 0 ? Number(o.w) : 800;
    const h = Number(o.h) > 0 ? Number(o.h) : 440;
    const items = Array.isArray(o.items)
      ? o.items
          .filter((it) => it && (!it.type || it.type === 'rect'))
          .map((it, index) => normalizeMapItem(it, index))
      : [];
    return { w, h, items };
  } catch {
    return { w: 800, h: 440, items: [] };
  }
}

function roundRect(ctx, x, y, w, h, r = 10) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawBackground(ctx, data) {
  const bg = ctx.createLinearGradient(0, 0, data.w, data.h);
  bg.addColorStop(0, '#dff8f4');
  bg.addColorStop(0.45, '#f8fafc');
  bg.addColorStop(1, '#dbeafe');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, data.w, data.h);

  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.strokeStyle = 'rgba(14, 165, 233, 0.28)';
  ctx.lineWidth = 2;
  for (let y = 30; y < data.h; y += 70) {
    ctx.beginPath();
    for (let x = 0; x <= data.w; x += 28) {
      const wave = Math.sin((x + y) / 34) * 5;
      if (x === 0) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(100, 116, 139, 0.18)';
  ctx.lineWidth = 1;
  for (let x = 0; x < data.w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, data.h);
    ctx.stroke();
  }
  for (let y = 0; y < data.h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(data.w, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(14, 116, 144, 0.32)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, data.w - 3, data.h - 3);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
  roundRect(ctx, data.w - 76, 14, 58, 58, 16);
  ctx.fill();
  ctx.fillStyle = '#0f766e';
  ctx.font = '900 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', data.w - 47, 36);
  ctx.strokeStyle = '#0f766e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(data.w - 47, 42);
  ctx.lineTo(data.w - 47, 60);
  ctx.moveTo(data.w - 55, 50);
  ctx.lineTo(data.w - 47, 42);
  ctx.lineTo(data.w - 39, 50);
  ctx.stroke();
  ctx.textAlign = 'left';
}

function drawItem(ctx, item, selected = false, mesaEstadoVisual = null, options = {}) {
  const meta = getMapKind(item.kind);
  const x = Number(item.x) || 0;
  const y = Number(item.y) || 0;
  const width = Number(item.width) || 100;
  const height = Number(item.height) || 80;
  let stroke = item.stroke || meta.stroke;
  let fill = item.fill || meta.fill;
  if (item.kind === 'mesa' && mesaEstadoVisual === 'apartada') {
    fill = 'rgba(239, 68, 68, 0.36)';
    stroke = '#b91c1c';
  } else if (item.kind === 'mesa' && mesaEstadoVisual === 'apartada_mia') {
    fill = 'rgba(245, 158, 11, 0.34)';
    stroke = '#b45309';
  } else if (item.kind === 'mesa' && mesaEstadoVisual === 'ocupada') {
    fill = 'rgba(79, 70, 229, 0.34)';
    stroke = '#3730a3';
  }

  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.18)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = fill;
  roundRect(ctx, x, y, width, height, item.kind === 'mesa' ? 12 : 8);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = stroke;
  ctx.lineWidth = selected ? 3 : 2;
  ctx.setLineDash(meta.dashed ? [8, 5] : []);
  ctx.stroke();
  ctx.setLineDash([]);

  const showItemIds = options.showItemIds !== false;
  const showKindBadge = options.showKindBadge !== false;
  if (showItemIds || showKindBadge) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    roundRect(ctx, x + 6, y + 6, Math.max(Math.min(width - 12, 190), 56), 44, 8);
    ctx.fill();
    if (showItemIds) {
      ctx.fillStyle = '#0f172a';
      ctx.font = '800 12px system-ui, sans-serif';
      ctx.fillText(String(item.id || 'sin-id').slice(0, 24), x + 14, y + 23);
    }
    if (showKindBadge) {
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.fillStyle = stroke;
      ctx.fillText(String(meta.label || item.kind).slice(0, 26), x + 14, showItemIds ? 40 : 28);
    }
  }

  if (height > 72) {
    ctx.fillStyle = '#334155';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText(String(item.label || 'Zona').slice(0, 28), x + 10, y + height - 14);
  }

  if (item.locked) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    roundRect(ctx, x + width - 30, y + 8, 20, 20, 6);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.fillText('L', x + width - 24, y + 23);
  }
}

function drawEmptyState(ctx, data) {
  const boxW = Math.min(360, data.w - 80);
  const boxH = 112;
  const x = (data.w - boxW) / 2;
  const y = (data.h - boxH) / 2;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  roundRect(ctx, x, y, boxW, boxH, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(14, 116, 144, 0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Mapa en preparacion', data.w / 2, y + 42);
  ctx.fillStyle = '#64748b';
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText('El personal puede publicar zonas desde el panel.', data.w / 2, y + 68);
  ctx.textAlign = 'left';
}

function drawHandles(ctx, item) {
  const x = Number(item.x) || 0;
  const y = Number(item.y) || 0;
  const w = Number(item.width) || 0;
  const h = Number(item.height) || 0;
  [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([hx, hy]) => {
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(hx - 5, hy - 5, 10, 10);
    ctx.fill();
    ctx.stroke();
  });
}

/**
 * @param {Record<string, 'apartada' | string>} [options.statusByMapItemId] - id de ítem del mapa → estado visual (solo afecta kind mesa)
 * @param {boolean} [options.showItemIds] - mostrar IDs técnicos en canvas (default true).
 * @param {boolean} [options.showKindBadge] - mostrar tipo/kind en canvas (default true).
 */
export function drawDistribucionCanvas(canvas, jsonStr, options = {}) {
  const data = parseDistribucionJson(jsonStr);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(data.w * dpr);
  canvas.height = Math.floor(data.h * dpr);
  canvas.style.width = `${data.w}px`;
  canvas.style.height = `${data.h}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, data.w, data.h);
  drawBackground(ctx, data);
  const statusByMapItemId = options.statusByMapItemId || {};
  data.items.forEach((item, index) =>
    drawItem(
      ctx,
      item,
      options.selected === index,
      item.kind === 'mesa' ? statusByMapItemId[item.id] || null : null,
      options
    )
  );
  if (!data.items.length) drawEmptyState(ctx, data);
  if (options.selected >= 0 && data.items[options.selected]) {
    drawHandles(ctx, data.items[options.selected]);
  }
}

/**
 * Devuelve el índice del ítem bajo el punto (pantalla), o -1. Coordenadas en espacio lógico del plano (como `data.w` / `data.h`).
 */
export function findMapItemIndexAtClientPoint(canvas, jsonStr, clientX, clientY) {
  const data = parseDistribucionJson(jsonStr);
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return -1;
  const mx = ((clientX - rect.left) / rect.width) * data.w;
  const my = ((clientY - rect.top) / rect.height) * data.h;
  for (let i = data.items.length - 1; i >= 0; i--) {
    const it = data.items[i];
    const x = Number(it.x) || 0;
    const y = Number(it.y) || 0;
    const w = Number(it.width) || 0;
    const h = Number(it.height) || 0;
    if (mx >= x && mx <= x + w && my >= y && my <= y + h) return i;
  }
  return -1;
}

function makeNewItem(data, patch = {}) {
  const kind = KIND_BY_VALUE[patch.kind] ? patch.kind : DEFAULT_MAP_ITEM_KIND;
  const count = data.items.filter((item) => item.kind === kind).length + 1;
  const meta = getMapKind(kind);
  return normalizeMapItem({
    type: 'rect',
    id: patch.id || `${kind}-${String(count).padStart(2, '0')}`,
    kind,
    label: patch.label || meta.label,
    x: patch.x ?? 40,
    y: patch.y ?? 40,
    width: patch.width ?? 120,
    height: patch.height ?? 80,
    fill: patch.fill || meta.fill,
    stroke: patch.stroke || meta.stroke,
    notes: patch.notes || '',
    locked: patch.locked || false
  }, data.items.length);
}

/**
 * Editor: arrastrar, redimensionar, agregar, eliminar, duplicar y editar metadata.
 */
export function createDistribucionEditor(canvas, initialJson, onChange) {
  let data = parseDistribucionJson(initialJson || DEFAULT_MAPA_JSON);
  let selected = -1;
  let dragging = false;
  let resizing = false;
  let resizeHandle = '';
  let dragOffX = 0;
  let dragOffY = 0;
  let adding = false;
  let addingKind = DEFAULT_MAP_ITEM_KIND;
  let addStart = null;
  const selectionListeners = new Set();

  const DOC_W_MIN = 400;
  const DOC_W_MAX = 2800;
  const DOC_H_MIN = 280;
  const DOC_H_MAX = 2000;

  const emit = () => {
    const json = JSON.stringify({ w: data.w, h: data.h, items: data.items });
    onChange?.(json);
  };

  const selectedItem = () => (selected >= 0 && data.items[selected] ? data.items[selected] : null);

  const notifySelection = () => {
    const item = selectedItem();
    selectionListeners.forEach((fn) => fn(item ? { ...item } : null, selected));
  };

  const redraw = () => {
    drawDistribucionCanvas(canvas, JSON.stringify(data), { selected });
  };

  const setSelected = (idx) => {
    selected = idx;
    notifySelection();
    redraw();
  };

  const hitTest = (mx, my) => {
    for (let i = data.items.length - 1; i >= 0; i--) {
      const it = data.items[i];
      const x = Number(it.x) || 0;
      const y = Number(it.y) || 0;
      const w = Number(it.width) || 0;
      const h = Number(it.height) || 0;
      if (mx >= x && mx <= x + w && my >= y && my <= y + h) return i;
    }
    return -1;
  };

  const handleHit = (mx, my, item) => {
    if (!item) return '';
    const x = Number(item.x) || 0;
    const y = Number(item.y) || 0;
    const w = Number(item.width) || 0;
    const h = Number(item.height) || 0;
    const handles = { nw: [x, y], ne: [x + w, y], sw: [x, y + h], se: [x + w, y + h] };
    return Object.entries(handles).find(([, [hx, hy]]) => Math.abs(mx - hx) <= 9 && Math.abs(my - hy) <= 9)?.[0] || '';
  };

  const pointer = (ev) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = data.w / rect.width;
    const scaleY = data.h / rect.height;
    return {
      x: clamp((ev.clientX - rect.left) * scaleX, 0, data.w),
      y: clamp((ev.clientY - rect.top) * scaleY, 0, data.h)
    };
  };

  const onDown = (ev) => {
    const { x: mx, y: my } = pointer(ev);
    const current = selectedItem();
    const handle = handleHit(mx, my, current);
    if (handle && current && !current.locked) {
      resizing = true;
      resizeHandle = handle;
      return;
    }

    const idx = hitTest(mx, my);
    if (idx >= 0) {
      addStart = null;
      setSelected(idx);
      const it = data.items[idx];
      if (!it.locked) {
        dragging = true;
        dragOffX = mx - (Number(it.x) || 0);
        dragOffY = my - (Number(it.y) || 0);
      }
      return;
    }

    setSelected(-1);
    if (adding) {
      addStart = { x: mx, y: my };
    }
  };

  const resizeSelected = (mx, my) => {
    const it = selectedItem();
    if (!it || it.locked) return;
    const minSize = 24;
    const right = Number(it.x) + Number(it.width);
    const bottom = Number(it.y) + Number(it.height);
    if (resizeHandle.includes('n')) {
      const nextY = clamp(Math.round(my), 0, bottom - minSize);
      it.height = Math.round(bottom - nextY);
      it.y = nextY;
    }
    if (resizeHandle.includes('s')) it.height = Math.round(clamp(my - Number(it.y), minSize, data.h - Number(it.y)));
    if (resizeHandle.includes('w')) {
      const nextX = clamp(Math.round(mx), 0, right - minSize);
      it.width = Math.round(right - nextX);
      it.x = nextX;
    }
    if (resizeHandle.includes('e')) it.width = Math.round(clamp(mx - Number(it.x), minSize, data.w - Number(it.x)));
  };

  const onMove = (ev) => {
    const { x: mx, y: my } = pointer(ev);
    if (resizing && selected >= 0) {
      resizeSelected(mx, my);
      emit();
      notifySelection();
      redraw();
      return;
    }
    if (dragging && selected >= 0) {
      const it = selectedItem();
      if (!it || it.locked) return;
      it.x = Math.round(clamp(mx - dragOffX, 0, data.w - Number(it.width)));
      it.y = Math.round(clamp(my - dragOffY, 0, data.h - Number(it.height)));
      emit();
      notifySelection();
      redraw();
      return;
    }
    if (adding && addStart) {
      const x0 = addStart.x;
      const y0 = addStart.y;
      const x = Math.min(x0, mx);
      const y = Math.min(y0, my);
      const w = Math.abs(mx - x0);
      const h = Math.abs(my - y0);
      redraw();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const meta = getMapKind(addingKind);
        ctx.strokeStyle = meta.stroke;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, Math.max(w, 4), Math.max(h, 4));
        ctx.setLineDash([]);
      }
    }
  };

  const onUp = (ev) => {
    const { x: mx, y: my } = pointer(ev);
    if (adding && addStart) {
      const x0 = addStart.x;
      const y0 = addStart.y;
      data.items.push(makeNewItem(data, {
        kind: addingKind,
        x: Math.round(Math.min(x0, mx)),
        y: Math.round(Math.min(y0, my)),
        width: Math.round(Math.max(Math.abs(mx - x0), 40)),
        height: Math.round(Math.max(Math.abs(my - y0), 40))
      }));
      selected = data.items.length - 1;
      addStart = null;
      adding = false;
      emit();
      notifySelection();
    }
    dragging = false;
    resizing = false;
    resizeHandle = '';
    redraw();
  };

  const onKey = (ev) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (ev.key === 'Escape') {
      if (adding || addStart) {
        ev.preventDefault();
        adding = false;
        addStart = null;
        redraw();
      }
      return;
    }
    const it = selectedItem();
    if (!it) return;
    if (ev.key === 'Delete' || ev.key === 'Backspace') {
      ev.preventDefault();
      data.items.splice(selected, 1);
      selected = -1;
      emit();
      notifySelection();
      redraw();
      return;
    }
    const step = ev.shiftKey ? 10 : 1;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(ev.key) && !it.locked) {
      ev.preventDefault();
      if (ev.key === 'ArrowUp') it.y = clamp(Number(it.y) - step, 0, data.h - Number(it.height));
      if (ev.key === 'ArrowDown') it.y = clamp(Number(it.y) + step, 0, data.h - Number(it.height));
      if (ev.key === 'ArrowLeft') it.x = clamp(Number(it.x) - step, 0, data.w - Number(it.width));
      if (ev.key === 'ArrowRight') it.x = clamp(Number(it.x) + step, 0, data.w - Number(it.width));
      emit();
      notifySelection();
      redraw();
    }
  };

  const onDblClick = (ev) => {
    const { x: mx, y: my } = pointer(ev);
    const idx = hitTest(mx, my);
    if (idx >= 0) setSelected(idx);
  };

  canvas.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  window.addEventListener('keydown', onKey);
  canvas.addEventListener('dblclick', onDblClick);
  redraw();

  return {
    getJson: () => JSON.stringify({ w: data.w, h: data.h, items: data.items }),
    setJson: (s) => {
      data = parseDistribucionJson(s);
      setSelected(-1);
    },
    setDocumentSize: (w, h) => {
      const nw = clamp(Math.round(Number(w) || data.w), DOC_W_MIN, DOC_W_MAX);
      const nh = clamp(Math.round(Number(h) || data.h), DOC_H_MIN, DOC_H_MAX);
      data.w = nw;
      data.h = nh;
      data.items = data.items.map((it) => {
        const ix = Number(it.x) || 0;
        const iy = Number(it.y) || 0;
        const iw = Number(it.width) || 0;
        const ih = Number(it.height) || 0;
        return {
          ...it,
          x: Math.min(ix, Math.max(0, nw - 20)),
          y: Math.min(iy, Math.max(0, nh - 20)),
          width: Math.min(iw, nw - ix),
          height: Math.min(ih, nh - iy)
        };
      });
      emit();
      notifySelection();
      redraw();
    },
    getDocumentSize: () => ({ w: data.w, h: data.h }),
    setAdding: (v, kind = DEFAULT_MAP_ITEM_KIND) => {
      adding = !!v;
      addingKind = KIND_BY_VALUE[kind] ? kind : DEFAULT_MAP_ITEM_KIND;
      addStart = null;
    },
    addPresetRow: (kind = DEFAULT_MAP_ITEM_KIND, count = 3) => {
      const k = KIND_BY_VALUE[kind] ? kind : DEFAULT_MAP_ITEM_KIND;
      const meta = getMapKind(k);
      const gap = 12;
      const cellW = 110;
      const cellH = 72;
      const startX = 48;
      const startY = Math.min(120, data.h - cellH - 48);
      for (let i = 0; i < count; i++) {
        data.items.push(
          makeNewItem(data, {
            kind: k,
            x: startX + i * (cellW + gap),
            y: startY,
            width: cellW,
            height: cellH,
            label: `${meta.label} ${i + 1}`
          })
        );
      }
      selected = data.items.length - 1;
      adding = false;
      addStart = null;
      emit();
      notifySelection();
      redraw();
    },
    addPresetWideBlock: (kind = DEFAULT_MAP_ITEM_KIND) => {
      const k = KIND_BY_VALUE[kind] ? kind : DEFAULT_MAP_ITEM_KIND;
      const meta = getMapKind(k);
      data.items.push(
        makeNewItem(data, {
          kind: k,
          x: 40,
          y: 80,
          width: Math.min(520, data.w - 80),
          height: 100,
          label: meta.label
        })
      );
      selected = data.items.length - 1;
      adding = false;
      addStart = null;
      emit();
      notifySelection();
      redraw();
    },
    addItem: (kind = DEFAULT_MAP_ITEM_KIND) => {
      data.items.push(makeNewItem(data, { kind }));
      selected = data.items.length - 1;
      emit();
      notifySelection();
      redraw();
      return { ...data.items[selected] };
    },
    getSelected: () => {
      const it = selectedItem();
      return it ? { ...it } : null;
    },
    updateSelected: (patch = {}) => {
      const it = selectedItem();
      if (!it) return;
      const nextKind = KIND_BY_VALUE[patch.kind] ? patch.kind : it.kind;
      const meta = getMapKind(nextKind);
      Object.assign(it, normalizeMapItem({
        ...it,
        ...patch,
        kind: nextKind,
        fill: patch.fill || (nextKind !== it.kind ? meta.fill : it.fill),
        stroke: patch.stroke || (nextKind !== it.kind ? meta.stroke : it.stroke)
      }, selected));
      emit();
      notifySelection();
      redraw();
    },
    deleteSelected: () => {
      if (selected < 0) return;
      data.items.splice(selected, 1);
      selected = -1;
      emit();
      notifySelection();
      redraw();
    },
    duplicateSelected: () => {
      const it = selectedItem();
      if (!it) return;
      data.items.push(makeNewItem(data, { ...it, id: `${it.id}-copia`, x: Number(it.x) + 18, y: Number(it.y) + 18 }));
      selected = data.items.length - 1;
      emit();
      notifySelection();
      redraw();
    },
    moveSelectedLayer: (dir) => {
      if (selected < 0) return;
      const next = clamp(selected + dir, 0, data.items.length - 1);
      if (next === selected) return;
      const [it] = data.items.splice(selected, 1);
      data.items.splice(next, 0, it);
      selected = next;
      emit();
      notifySelection();
      redraw();
    },
    onSelectionChange: (fn) => {
      selectionListeners.add(fn);
      fn(selectedItem() ? { ...selectedItem() } : null, selected);
      return () => selectionListeners.delete(fn);
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('dblclick', onDblClick);
      selectionListeners.clear();
    }
  };
}
