import { hitTestMapDocument } from './mapHitTesting.js';
import { parseMapDocument } from './mapMigrations.js';
import { drawMapCanvasViewport } from './mapRenderer.js';

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function distance(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export function createMapViewer(canvas, jsonOrDoc, options = {}) {
  let doc = typeof jsonOrDoc === 'string' ? parseMapDocument(jsonOrDoc, options) : jsonOrDoc;
  const state = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    minScale: options.minScale || 0.35,
    maxScale: options.maxScale || 4
  };
  const pointers = new Map();
  let dragging = false;
  let lastPoint = null;
  let dragStart = null;
  let pinchStart = null;
  let destroyed = false;
  let hoveredId = '';
  let selectedId = '';

  canvas.style.touchAction = 'none';
  canvas.style.userSelect = 'none';

  const emitViewport = () => options.onViewportChange?.({ ...state });

  const fit = () => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width || canvas.parentElement?.clientWidth || doc.width);
    const height = Math.max(1, rect.height || canvas.parentElement?.clientHeight || doc.height);
    const scale = Math.min(width / doc.width, height / doc.height) * (options.fitPaddingScale || 0.92);
    state.scale = clamp(scale, state.minScale, state.maxScale);
    state.offsetX = (width - doc.width * state.scale) / 2;
    state.offsetY = (height - doc.height * state.scale) / 2;
    emitViewport();
  };

  const draw = () => {
    if (destroyed) return;
    const resolvedSelection =
      options.selectedIds === undefined
        ? selectedId
          ? [selectedId]
          : []
        : Array.isArray(options.selectedIds)
          ? options.selectedIds
          : [];
    drawMapCanvasViewport(canvas, doc, state, {
      ...options,
      hoveredId,
      selectedIds: resolvedSelection,
      requestRedraw: draw
    });
  };

  const clientToMap = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - state.offsetX) / state.scale,
      y: (clientY - rect.top - state.offsetY) / state.scale
    };
  };

  const zoomAt = (clientX, clientY, nextScale) => {
    const rect = canvas.getBoundingClientRect();
    const before = clientToMap(clientX, clientY);
    state.scale = clamp(nextScale, state.minScale, state.maxScale);
    state.offsetX = clientX - rect.left - before.x * state.scale;
    state.offsetY = clientY - rect.top - before.y * state.scale;
    emitViewport();
    draw();
  };

  const hitAtClient = (clientX, clientY) => {
    const point = clientToMap(clientX, clientY);
    return hitTestMapDocument(doc, point.x, point.y);
  };

  const setHoverFromClient = (ev) => {
    if (options.interactive === false) return;
    const hit = hitAtClient(ev.clientX, ev.clientY);
    const nextHoveredId = hit.item?.id || '';
    const mapPoint = clientToMap(ev.clientX, ev.clientY);
    canvas.style.cursor = hit.item ? 'pointer' : 'grab';
    if (nextHoveredId === hoveredId) {
      if (hit.item) {
        options.onHover?.(hit.item, hit.index, mapPoint, {
          clientX: ev.clientX,
          clientY: ev.clientY
        });
      }
      return;
    }
    hoveredId = nextHoveredId;
    options.onHover?.(hit.item || null, hit.index, mapPoint, {
      clientX: ev.clientX,
      clientY: ev.clientY
    });
    draw();
  };

  const onWheel = (ev) => {
    if (options.interactive === false) return;
    ev.preventDefault();
    const factor = ev.deltaY > 0 ? 0.9 : 1.12;
    zoomAt(ev.clientX, ev.clientY, state.scale * factor);
  };

  const onPointerDown = (ev) => {
    if (options.interactive === false) return;
    pointers.set(ev.pointerId, ev);
    canvas.setPointerCapture?.(ev.pointerId);
    canvas.style.cursor = 'grabbing';
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStart = {
        distance: distance(a, b),
        scale: state.scale,
        cx: (a.clientX + b.clientX) / 2,
        cy: (a.clientY + b.clientY) / 2
      };
      return;
    }
    dragging = true;
    lastPoint = { x: ev.clientX, y: ev.clientY };
    dragStart = { x: ev.clientX, y: ev.clientY };
  };

  const onPointerMove = (ev) => {
    if (!pointers.has(ev.pointerId)) {
      setHoverFromClient(ev);
      return;
    }
    pointers.set(ev.pointerId, ev);
    if (pointers.size === 2 && pinchStart) {
      const [a, b] = [...pointers.values()];
      const next = pinchStart.scale * (distance(a, b) / Math.max(1, pinchStart.distance));
      zoomAt((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2, next);
      return;
    }
    if (!dragging || !lastPoint) return;
    state.offsetX += ev.clientX - lastPoint.x;
    state.offsetY += ev.clientY - lastPoint.y;
    lastPoint = { x: ev.clientX, y: ev.clientY };
    emitViewport();
    draw();
  };

  const onPointerUp = (ev) => {
    const start = dragStart;
    pointers.delete(ev.pointerId);
    canvas.releasePointerCapture?.(ev.pointerId);
    if (pointers.size < 2) pinchStart = null;
    dragging = false;
    lastPoint = null;
    dragStart = null;
    if (!start) return;
    const moved = Math.hypot(ev.clientX - start.x, ev.clientY - start.y);
    if (moved <= 5) {
      const hit = hitAtClient(ev.clientX, ev.clientY);
      selectedId = hit.item?.id || '';
      options.onSelect?.(hit.item, hit.index, clientToMap(ev.clientX, ev.clientY));
      draw();
    } else {
      canvas.style.cursor = hoveredId ? 'pointer' : 'grab';
    }
  };

  const onPointerLeave = () => {
    if (!hoveredId) return;
    hoveredId = '';
    canvas.style.cursor = 'grab';
    options.onHover?.(null, -1, null, null);
    draw();
  };

  const resizeObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(() => {
        fit();
        draw();
      })
    : null;
  resizeObserver?.observe(canvas.parentElement || canvas);

  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerLeave);

  fit();
  draw();

  return {
    redraw: draw,
    fit: () => {
      fit();
      draw();
    },
    zoomIn: () => {
      const rect = canvas.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, state.scale * 1.18);
    },
    zoomOut: () => {
      const rect = canvas.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, state.scale / 1.18);
    },
    reset: () => {
      fit();
      draw();
    },
    /** Limpia selección interna (ej. cambio de fecha en reservas sin volver a crear el viewer). */
    clearSelection: () => {
      selectedId = '';
      hoveredId = '';
      canvas.style.cursor = 'grab';
      draw();
    },
    setJson: (nextJson, nextOptions = {}) => {
      doc = typeof nextJson === 'string' ? parseMapDocument(nextJson, { ...options, ...nextOptions }) : nextJson;
      hoveredId = '';
      selectedId = '';
      fit();
      draw();
    },
    getDocument: () => doc,
    getViewport: () => ({ ...state }),
    clientToMap,
    hitAtClient,
    destroy: () => {
      destroyed = true;
      resizeObserver?.disconnect();
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
    }
  };
}
