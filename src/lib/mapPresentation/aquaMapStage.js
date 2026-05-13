import { itemMatchesPublicMapFilter } from '../mapEngine/mapPublicFilters.js';
import { getSortedMapItems } from '../mapEngine/mapHitTesting.js';
import { parseMapDocument } from '../mapEngine/mapMigrations.js';
import { getMapKind } from '../mapEngine/mapTypes.js';
import { isMapItemVisibleInView } from '../mapEngine/mapViewVisibility.js';

function clamp(n, a, b) {
  return Math.min(Math.max(n, a), b);
}

function distance(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function cameraRotation(camera) {
  return camera === 'editor'
    ? 'rotateX(55deg) rotateZ(-40deg)'
    : 'rotateX(30deg) rotateZ(0deg)';
}

function aquaShapeInnerClass(item) {
  const t = String(item.type || '').toLowerCase();
  const k = String(item.kind || '').toLowerCase();
  if (t === 'pool' || k === 'alberca' || k === 'pool') return 'aqua-shape-pool';
  if (t === 'table' || k === 'mesa') return 'aqua-shape-mesa';
  if (t === 'parkingspot' || k === 'estacionamiento' || k === 'parkingspot') return 'aqua-shape-parking';
  if (t === 'entrance' || k === 'entrada') return 'aqua-shape-entrance';
  if (t === 'marker' || t === 'icon' || t === 'line' || t === 'text') return 'aqua-shape-service';
  if (k === 'servicio' || k === 'palapa') return 'aqua-shape-service';
  return 'aqua-shape-area';
}

function fillForItem(item) {
  try {
    const meta = getMapKind(item.kind);
    return item.fill || meta?.fill || '#22c55e';
  } catch {
    return item.fill || '#22c55e';
  }
}

function labelForItem(item) {
  const explicit = String(item.metadata?.publicName || item.label || '').trim();
  if (explicit) return explicit;
  try {
    return getMapKind(item.kind).label || 'Zona';
  } catch {
    return 'Zona';
  }
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {HTMLElement} mountEl Contenedor vacío (p.ej. #landing-aqua-map-root)
 * @param {string|object} jsonOrDoc
 * @param {object} [initialOptions]
 * @param {'global'|'mesas'|'estacionamiento'|'albercas'} [initialOptions.view]
 * @param {'client'|'editor'} [initialOptions.camera] Cámara isométrica (cliente = más baja, editor = ángulo AquaEditor).
 * @param {(item: object|null, index: number, mapPoint: {x:number,y:number}|null, pointer: object|null) => void} [initialOptions.onHover]
 * @param {(item: object|null, index: number, mapPoint: {x:number,y:number}|null) => void} [initialOptions.onSelect]
 */
export function createAquaMapStage(mountEl, jsonOrDoc, initialOptions = {}) {
  let options = {
    view: 'global',
    camera: 'client',
    minScale: 0.22,
    maxScale: 2.1,
    fitPaddingScale: 0.88,
    ...initialOptions
  };

  let doc = typeof jsonOrDoc === 'string' ? parseMapDocument(jsonOrDoc, options) : jsonOrDoc;
  let panX = 0;
  let panY = 0;
  let scale = 0.55;
  let selectedId = '';
  let hoveredId = '';
  let destroyed = false;

  const pointers = new Map();
  let dragging = false;
  let lastPoint = null;
  let dragStart = null;
  let pinchStart = null;

  mountEl.innerHTML = '';
  mountEl.classList.add('aqua-map-stage');

  const viewport = document.createElement('div');
  viewport.className = 'aqua-map-viewport';
  const inner = document.createElement('div');
  inner.className = 'aqua-map-viewport-inner';
  const plane = document.createElement('div');
  plane.className = 'aqua-map-plane';
  const grass = document.createElement('div');
  grass.className = 'aqua-map-grass';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'aqua-map-routes');
  const routePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  routePath.setAttribute('class', 'aqua-map-route');
  routePath.style.display = 'none';
  svg.appendChild(routePath);
  const elementsHost = document.createElement('div');
  elementsHost.className = 'aqua-map-elements';
  const userPin = document.createElement('div');
  userPin.className = 'aqua-map-user-pin';
  userPin.hidden = true;
  userPin.innerHTML =
    '<span class="aqua-map-user-pin__tag">Usted está aquí</span><div class="aqua-map-user-pin__dot" aria-hidden="true"></div>';

  plane.appendChild(grass);
  plane.appendChild(svg);
  plane.appendChild(elementsHost);
  plane.appendChild(userPin);
  inner.appendChild(plane);
  viewport.appendChild(inner);
  mountEl.appendChild(viewport);

  const syncPlaneSize = () => {
    const w = Math.max(1, Number(doc.width || 1000));
    const h = Math.max(1, Number(doc.height || 620));
    plane.style.width = `${w}px`;
    plane.style.height = `${h}px`;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
  };

  const applyPlaneTransform = () => {
    const rot = cameraRotation(options.camera);
    plane.style.transform = `translate(${panX}px, ${panY}px) scale(${scale}) ${rot}`;
  };

  const fit = () => {
    const rect = viewport.getBoundingClientRect();
    const pw = Math.max(1, Number(doc.width || 1000));
    const ph = Math.max(1, Number(doc.height || 620));
    const next = Math.min(rect.width / pw, rect.height / ph) * (options.fitPaddingScale || 0.88);
    scale = clamp(next, options.minScale || 0.22, options.maxScale || 2.1);
    panX = (rect.width - pw * scale) / 2;
    panY = (rect.height - ph * scale) / 2;
    applyPlaneTransform();
  };

  const zoomAt = (clientX, clientY, nextScale) => {
    const rect = viewport.getBoundingClientRect();
    const innerRect = inner.getBoundingClientRect();
    const cx = clientX - innerRect.left;
    const cy = clientY - innerRect.top;
    const pw = Math.max(1, Number(doc.width || 1000));
    const ph = Math.max(1, Number(doc.height || 620));
    const beforeX = (cx - panX) / scale;
    const beforeY = (cy - panY) / scale;
    const clamped = clamp(nextScale, options.minScale || 0.22, options.maxScale || 2.1);
    scale = clamped;
    panX = cx - beforeX * scale;
    panY = cy - beforeY * scale;
    applyPlaneTransform();
  };

  const updateRouteSvg = () => {
    const pts = options.navigationPath;
    if (!Array.isArray(pts) || pts.length < 2) {
      routePath.style.display = 'none';
      routePath.removeAttribute('d');
      return;
    }
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    routePath.setAttribute('d', d);
    routePath.style.display = 'block';
  };

  const itemById = (id) => doc.items.find((it) => it.id === id) || null;

  const syncUserPin = () => {
    const items = doc.items || [];
    const here = items.find(
      (i) => i?.metadata?.youAreHere === true || i?.metadata?.youAreHere === 'true'
    );
    const entrance = items.find((i) => {
      const k = String(i.kind || '').toLowerCase();
      const t = String(i.type || '').toLowerCase();
      return t === 'entrance' || k === 'entrada';
    });
    const anchor = here || entrance;
    if (!anchor) {
      userPin.hidden = true;
      return;
    }
    const x = Number(anchor.x || 0) + Number(anchor.width || 0) / 2;
    const y = Number(anchor.y || 0) + Number(anchor.height || 0) / 2;
    userPin.style.left = `${x}px`;
    userPin.style.top = `${y}px`;
    userPin.style.transform = 'translate(-50%, -100%) translateZ(14px)';
    userPin.hidden = false;
  };

  const renderElements = () => {
    elementsHost.innerHTML = '';
    const view = options.view || 'global';

    const sorted = getSortedMapItems(doc).filter(({ item }) => isMapItemVisibleInView(item, view));

    sorted.forEach(({ item, index }) => {
      const el = document.createElement('div');
      el.className = 'aqua-map-el';
      el.dataset.itemId = item.id;
      const x = Number(item.x || 0);
      const y = Number(item.y || 0);
      const w = Math.max(8, Number(item.width || 0));
      const h = Math.max(8, Number(item.height || 0));
      const z = Math.round(Number(item.zIndex ?? index)) + 10;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      el.style.zIndex = String(z);
      const op = clamp(Number(item.opacity ?? 1), 0.05, 1);
      el.style.opacity = String(op);

      if (item.id === selectedId) el.classList.add('aqua-map-el--selected');

      const innerShape = document.createElement('div');
      innerShape.className = aquaShapeInnerClass(item);
      innerShape.style.width = '100%';
      innerShape.style.height = '100%';
      innerShape.style.backgroundColor = fillForItem(item);
      const rot = Number(item.rotation || 0);
      innerShape.style.transform = `translateZ(6px) rotate(${rot}deg)`;

      const lab = document.createElement('div');
      lab.className = 'aqua-map-el__label';
      lab.innerHTML = escapeHtml(labelForItem(item)).slice(0, 80);

      innerShape.appendChild(lab);
      el.appendChild(innerShape);

      el.addEventListener('pointerdown', (ev) => {
        ev.stopPropagation();
        selectedId = item.id;
        renderElements();
        const mx = x + w / 2;
        const my = y + h / 2;
        options.onSelect?.(item, index, { x: mx, y: my });
      });

      elementsHost.appendChild(el);
    });

    syncUserPin();
    updateRouteSvg();
    applyDimmingForFilter();
  };

  const applyDimmingForFilter = () => {
    const filterFn =
      options.publicMapFilter && options.publicMapFilter !== 'all'
        ? (item) => itemMatchesPublicMapFilter(item, options.publicMapFilter)
        : null;
    elementsHost.querySelectorAll('.aqua-map-el').forEach((node) => {
      const id = node.dataset.itemId;
      const item = itemById(id);
      if (!filterFn || !item) {
        node.classList.remove('aqua-map-el--dimmed');
        return;
      }
      node.classList.toggle('aqua-map-el--dimmed', !filterFn(item));
    });
  };

  const hitItemFromClient = (clientX, clientY) => {
    const stack = document.elementsFromPoint(clientX, clientY);
    const node = stack.find((n) => n.classList?.contains('aqua-map-el'));
    if (!node?.dataset?.itemId) return { item: null, index: -1 };
    const item = itemById(node.dataset.itemId);
    const index = doc.items.indexOf(item);
    return { item, index };
  };

  const setHoverFromClient = (ev) => {
    const { item, index } = hitItemFromClient(ev.clientX, ev.clientY);
    const next = item?.id || '';
    if (next === hoveredId) {
      if (item) options.onHover?.(item, index, null, { clientX: ev.clientX, clientY: ev.clientY });
      return;
    }
    hoveredId = next;
    options.onHover?.(item || null, index, null, { clientX: ev.clientX, clientY: ev.clientY });
  };

  const onWheel = (ev) => {
    ev.preventDefault();
    const factor = ev.deltaY > 0 ? 0.9 : 1.11;
    zoomAt(ev.clientX, ev.clientY, scale * factor);
  };

  const onPointerDown = (ev) => {
    if (ev.target.closest('.aqua-map-el')) return;
    pointers.set(ev.pointerId, ev);
    viewport.setPointerCapture?.(ev.pointerId);
    viewport.classList.add('is-dragging');
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStart = {
        distance: distance(a, b),
        scale,
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
    panX += ev.clientX - lastPoint.x;
    panY += ev.clientY - lastPoint.y;
    lastPoint = { x: ev.clientX, y: ev.clientY };
    applyPlaneTransform();
  };

  const onPointerUp = (ev) => {
    const start = dragStart;
    pointers.delete(ev.pointerId);
    viewport.releasePointerCapture?.(ev.pointerId);
    if (pointers.size < 2) pinchStart = null;
    dragging = false;
    lastPoint = null;
    dragStart = null;
    viewport.classList.remove('is-dragging');
    if (!start) return;
    const moved = Math.hypot(ev.clientX - start.x, ev.clientY - start.y);
    if (moved <= 6) {
      const { item, index } = hitItemFromClient(ev.clientX, ev.clientY);
      if (!item) {
        selectedId = '';
        renderElements();
        options.onSelect?.(null, -1, null);
      }
    }
  };

  const onPointerLeave = () => {
    if (!hoveredId) return;
    hoveredId = '';
    options.onHover?.(null, -1, null, null);
  };

  const resizeObserver =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          fit();
        })
      : null;
  resizeObserver?.observe(viewport);

  viewport.addEventListener('wheel', onWheel, { passive: false });
  viewport.addEventListener('pointerdown', onPointerDown);
  viewport.addEventListener('pointermove', onPointerMove);
  viewport.addEventListener('pointerup', onPointerUp);
  viewport.addEventListener('pointercancel', onPointerUp);
  viewport.addEventListener('pointerleave', onPointerLeave);

  const redraw = () => {
    if (destroyed) return;
    syncPlaneSize();
    renderElements();
    applyPlaneTransform();
  };

  syncPlaneSize();
  fit();
  redraw();

  return {
    redraw,
    fit: () => {
      fit();
      redraw();
    },
    zoomIn: () => {
      const r = viewport.getBoundingClientRect();
      zoomAt(r.left + r.width / 2, r.top + r.height / 2, scale * 1.16);
    },
    zoomOut: () => {
      const r = viewport.getBoundingClientRect();
      zoomAt(r.left + r.width / 2, r.top + r.height / 2, scale / 1.16);
    },
    reset: () => {
      fit();
      redraw();
    },
    clearSelection: () => {
      selectedId = '';
      renderElements();
    },
    setDrawOptions: (patch = {}) => {
      Object.assign(options, patch);
      redraw();
    },
    setJson: (nextJson, nextOpts = {}) => {
      doc =
        typeof nextJson === 'string'
          ? parseMapDocument(nextJson, { view: options.view, ...nextOpts })
          : nextJson;
      Object.assign(options, nextOpts);
      selectedId = '';
      hoveredId = '';
      fit();
      redraw();
    },
    getDocument: () => doc,
    getViewportElement: () => viewport,
    destroy: () => {
      destroyed = true;
      resizeObserver?.disconnect();
      viewport.removeEventListener('wheel', onWheel);
      viewport.removeEventListener('pointerdown', onPointerDown);
      viewport.removeEventListener('pointermove', onPointerMove);
      viewport.removeEventListener('pointerup', onPointerUp);
      viewport.removeEventListener('pointercancel', onPointerUp);
      viewport.removeEventListener('pointerleave', onPointerLeave);
      mountEl.innerHTML = '';
      mountEl.classList.remove('aqua-map-stage');
    }
  };
}
