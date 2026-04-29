/** JSON del mapa editable en admin y solo lectura en /home */

export const DEFAULT_MAPA_JSON = JSON.stringify({
  w: 800,
  h: 440,
  items: []
});

export function parseDistribucionJson(jsonStr) {
  try {
    const o = JSON.parse(jsonStr || '{}');
    const w = Number(o.w) > 0 ? Number(o.w) : 800;
    const h = Number(o.h) > 0 ? Number(o.h) : 440;
    const items = Array.isArray(o.items) ? o.items.filter((it) => it && it.type === 'rect') : [];
    return { w, h, items };
  } catch {
    return { w: 800, h: 440, items: [] };
  }
}

export function drawDistribucionCanvas(canvas, jsonStr) {
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
  ctx.fillStyle = '#e2f0ec';
  ctx.fillRect(0, 0, data.w, data.h);
  ctx.strokeStyle = '#94a3b8';
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
  for (const it of data.items) {
    const x = Number(it.x) || 0;
    const y = Number(it.y) || 0;
    const width = Number(it.width) || 100;
    const height = Number(it.height) || 80;
    ctx.fillStyle = it.fill || 'rgba(37, 99, 235, 0.28)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 13px system-ui, sans-serif';
    const label = String(it.label || 'Zona');
    ctx.fillText(label, x + 8, y + 22);
  }
}

/**
 * Editor simple: arrastrar zonas rectangulares, agregar, eliminar.
 * @returns {{ getJson: () => string, setJson: (s: string) => void, destroy: () => void }}
 */
export function createDistribucionEditor(canvas, initialJson, onChange) {
  let data = parseDistribucionJson(initialJson || DEFAULT_MAPA_JSON);
  let selected = -1;
  let dragging = false;
  let dragOffX = 0;
  let dragOffY = 0;
  let adding = false;
  let addStart = null;

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

  const emit = () => {
    const json = JSON.stringify({ w: data.w, h: data.h, items: data.items });
    onChange?.(json);
  };

  const redraw = () => {
    drawDistribucionCanvas(canvas, JSON.stringify(data));
    if (selected >= 0 && data.items[selected]) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const it = data.items[selected];
      const x = Number(it.x) || 0;
      const y = Number(it.y) || 0;
      const w = Number(it.width) || 0;
      const h = Number(it.height) || 0;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }
  };

  const onDown = (ev) => {
    const rect = canvas.getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;
    const idx = hitTest(mx, my);
    if (idx >= 0) {
      addStart = null;
      selected = idx;
      dragging = true;
      const it = data.items[idx];
      dragOffX = mx - (Number(it.x) || 0);
      dragOffY = my - (Number(it.y) || 0);
      redraw();
      return;
    }
    selected = -1;
    if (adding) {
      addStart = { x: mx, y: my };
    }
    redraw();
  };

  const onMove = (ev) => {
    const rect = canvas.getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;
    if (dragging && selected >= 0) {
      const it = data.items[selected];
      it.x = Math.round(mx - dragOffX);
      it.y = Math.round(my - dragOffY);
      emit();
      redraw();
    } else if (adding && addStart) {
      const x0 = addStart.x;
      const y0 = addStart.y;
      const x = Math.min(x0, mx);
      const y = Math.min(y0, my);
      const w = Math.abs(mx - x0);
      const h = Math.abs(my - y0);
      drawDistribucionCanvas(canvas, JSON.stringify(data));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#2563eb';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x, y, Math.max(w, 4), Math.max(h, 4));
        ctx.setLineDash([]);
      }
    }
  };

  const onUp = (ev) => {
    const rect = canvas.getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;
    if (adding && addStart) {
      const x0 = addStart.x;
      const y0 = addStart.y;
      const x = Math.min(x0, mx);
      const y = Math.min(y0, my);
      const w = Math.max(Math.abs(mx - x0), 40);
      const h = Math.max(Math.abs(my - y0), 40);
      data.items.push({
        type: 'rect',
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(w),
        height: Math.round(h),
        label: 'Nueva zona',
        fill: 'rgba(37, 99, 235, 0.28)'
      });
      selected = data.items.length - 1;
      addStart = null;
      adding = false;
      emit();
    }
    dragging = false;
    redraw();
  };

  const onKey = (ev) => {
    if ((ev.key === 'Delete' || ev.key === 'Backspace') && selected >= 0 && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      ev.preventDefault();
      data.items.splice(selected, 1);
      selected = -1;
      emit();
      redraw();
    }
  };

  const onDblClick = (ev) => {
    const rect = canvas.getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;
    const idx = hitTest(mx, my);
    if (idx < 0) return;
    const it = data.items[idx];
    const next = window.prompt('Etiqueta de la zona', it.label || 'Zona');
    if (next !== null) {
      it.label = next;
      emit();
      redraw();
    }
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
      selected = -1;
      redraw();
    },
    setAdding: (v) => {
      adding = !!v;
      addStart = null;
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('dblclick', onDblClick);
    }
  };
}
