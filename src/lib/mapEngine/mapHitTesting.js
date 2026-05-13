import { parseMapDocument } from './mapMigrations.js';

export function rotatePoint(x, y, cx, cy, degrees) {
  const rad = (Number(degrees) || 0) * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos
  };
}

export function unrotatePoint(x, y, item) {
  const cx = Number(item.x || 0) + Number(item.width || 0) / 2;
  const cy = Number(item.y || 0) + Number(item.height || 0) / 2;
  return rotatePoint(x, y, cx, cy, -(Number(item.rotation) || 0));
}

function pointInPolygon(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function pointInMapItem(item, x, y) {
  if (!item || item.visible === false) return false;
  const local = unrotatePoint(x, y, item);
  const ix = Number(item.x || 0);
  const iy = Number(item.y || 0);
  const w = Number(item.width || 0);
  const h = Number(item.height || 0);
  const lx = local.x - ix;
  const ly = local.y - iy;
  const type = item.type || 'rect';

  if (type === 'ellipse' || type === 'circle' || type === 'table' || type === 'pool' || type === 'marker') {
    const rx = Math.max(w / 2, 1);
    const ry = Math.max(h / 2, 1);
    return ((lx - rx) ** 2) / (rx ** 2) + ((ly - ry) ** 2) / (ry ** 2) <= 1;
  }

  if (type === 'polygon') {
    const points = Array.isArray(item.points) ? item.points : [];
    return points.length >= 3 && pointInPolygon(points, lx, ly);
  }

  if (type === 'line') {
    const points = Array.isArray(item.points) && item.points.length >= 2
      ? item.points
      : [{ x: 0, y: 0 }, { x: w, y: h }];
    return distanceToSegment(lx, ly, points[0].x, points[0].y, points[1].x, points[1].y) <= 8;
  }

  return lx >= 0 && lx <= w && ly >= 0 && ly <= h;
}

function layerVisible(doc, layerId) {
  const layer = (doc.layers || []).find((item) => item.id === layerId);
  return !layer || layer.visible !== false;
}

export function getSortedMapItems(doc) {
  return [...(doc.items || [])]
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.visible !== false && layerVisible(doc, item.layerId))
    .sort((a, b) => {
      const az = Number(a.item.zIndex ?? a.index);
      const bz = Number(b.item.zIndex ?? b.index);
      return az === bz ? a.index - b.index : az - bz;
    });
}

export function hitTestMapDocument(doc, x, y, options = {}) {
  const sorted = getSortedMapItems(doc);
  const itemFilter = options.itemFilter;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const row = sorted[i];
    if (itemFilter && !itemFilter(row.item)) continue;
    if (pointInMapItem(row.item, x, y)) return row;
  }
  return { item: null, index: -1 };
}

export function findMapItemIndexAtPoint(jsonStr, x, y, options = {}) {
  const doc = parseMapDocument(jsonStr, options);
  return hitTestMapDocument(doc, x, y, { itemFilter: options.itemFilter }).index;
}

export function itemsIntersectRect(items, rect) {
  const x1 = Math.min(rect.x, rect.x + rect.width);
  const y1 = Math.min(rect.y, rect.y + rect.height);
  const x2 = Math.max(rect.x, rect.x + rect.width);
  const y2 = Math.max(rect.y, rect.y + rect.height);
  return items
    .map((item, index) => {
      const ix1 = Number(item.x || 0);
      const iy1 = Number(item.y || 0);
      const ix2 = ix1 + Number(item.width || 0);
      const iy2 = iy1 + Number(item.height || 0);
      const intersects = ix1 <= x2 && ix2 >= x1 && iy1 <= y2 && iy2 >= y1;
      return intersects ? index : -1;
    })
    .filter((index) => index >= 0);
}

