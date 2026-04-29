import { getSortedMapItems } from './mapHitTesting.js';
import { parseMapDocument } from './mapMigrations.js';
import { TABLE_STATES, getMapKind } from './mapTypes.js';

function roundRect(ctx, x, y, w, h, r = 10) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
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

function drawGrid(ctx, doc) {
  if (doc.grid?.visible === false) return;
  const size = Math.max(10, Number(doc.grid?.size || 40));
  ctx.save();
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= doc.width; x += size) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, doc.height);
    ctx.stroke();
  }
  for (let y = 0; y <= doc.height; y += size) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(doc.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBackground(ctx, doc, options = {}) {
  const bg = doc.background || {};
  const gradient = ctx.createLinearGradient(0, 0, doc.width, doc.height);
  gradient.addColorStop(0, bg.fill || '#ecfdf5');
  gradient.addColorStop(0.48, '#f8fafc');
  gradient.addColorStop(1, '#dbeafe');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, doc.width, doc.height);

  ctx.save();
  ctx.globalAlpha = options.editor ? 0.16 : 0.28;
  ctx.strokeStyle = 'rgba(14, 165, 233, 0.34)';
  ctx.lineWidth = 2;
  for (let y = 38; y < doc.height; y += 82) {
    ctx.beginPath();
    for (let x = 0; x <= doc.width; x += 30) {
      const wave = Math.sin((x + y) / 38) * 5;
      if (x === 0) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
  ctx.restore();

  drawGrid(ctx, doc);

  ctx.save();
  ctx.strokeStyle = bg.stroke || 'rgba(15, 118, 110, 0.42)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, doc.width - 3, doc.height - 3);
  ctx.restore();
}

function applyItemTransform(ctx, item) {
  const x = Number(item.x || 0);
  const y = Number(item.y || 0);
  const w = Number(item.width || 0);
  const h = Number(item.height || 0);
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.translate(cx, cy);
  ctx.rotate((Number(item.rotation || 0) * Math.PI) / 180);
  ctx.translate(-cx, -cy);
}

function colorsForItem(item, options = {}) {
  const kind = getMapKind(item.kind);
  let fill = item.fill || kind.fill;
  let stroke = item.stroke || kind.stroke;
  const state = options.statusByMapItemId?.[item.id] || item.metadata?.estadoVisual;
  if (item.kind === 'mesa' || item.type === 'table') {
    if (state === TABLE_STATES.APARTADA) {
      fill = 'rgba(239, 68, 68, 0.34)';
      stroke = '#b91c1c';
    } else if (state === TABLE_STATES.APARTADA_MIA) {
      fill = 'rgba(245, 158, 11, 0.38)';
      stroke = '#b45309';
    } else if (state === TABLE_STATES.OCUPADA) {
      fill = 'rgba(79, 70, 229, 0.36)';
      stroke = '#3730a3';
    } else {
      fill = 'rgba(16, 185, 129, 0.30)';
      stroke = '#047857';
    }
  }
  if (item.type === 'parkingSpot' || item.kind === 'estacionamiento' || item.kind === 'parkingSpot') {
    const parking = options.parkingById?.[item.id] || options.parkingById?.[item.metadata?.spotCode];
    const stateParking = parking?.estado || item.metadata?.baseStatus;
    if (stateParking === 'ocupado') {
      fill = 'rgba(239, 68, 68, 0.22)';
      stroke = '#b91c1c';
    } else if (stateParking === 'reservado') {
      fill = 'rgba(245, 158, 11, 0.24)';
      stroke = '#b45309';
    } else if (stateParking === 'mantenimiento' || stateParking === 'taller' || stateParking === 'sucio') {
      fill = 'rgba(100, 116, 139, 0.20)';
      stroke = '#475569';
    }
  }
  return { fill, stroke };
}

function drawLabel(ctx, item, options, stroke) {
  const x = Number(item.x || 0);
  const y = Number(item.y || 0);
  const w = Number(item.width || 0);
  const h = Number(item.height || 0);
  const showIds = options.showItemIds === true;
  const showKind = options.showKindBadge === true;
  const label = String(item.label || '');
  if (!label && !showIds && !showKind) return;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = item.type === 'text' ? '800 18px system-ui, sans-serif' : '800 13px system-ui, sans-serif';
  ctx.fillStyle = item.type === 'text' ? (item.fill || '#0f172a') : '#0f172a';
  const text = showIds ? String(item.id || label) : label;
  const yPos = item.type === 'table' ? y + h / 2 + 1 : y + h / 2;
  if (item.type !== 'text') {
    ctx.shadowColor = 'rgba(255,255,255,0.82)';
    ctx.shadowBlur = 6;
  }
  ctx.fillText(text.slice(0, 34), x + w / 2, yPos);
  if (showKind && item.type !== 'text') {
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.fillStyle = stroke;
    ctx.fillText(getMapKind(item.kind).label.slice(0, 24), x + w / 2, y + Math.min(h - 12, 18));
  }
  ctx.restore();
}

function drawRectLike(ctx, item, options, fill, stroke) {
  const x = Number(item.x || 0);
  const y = Number(item.y || 0);
  const w = Number(item.width || 0);
  const h = Number(item.height || 0);
  const dashed = getMapKind(item.kind).dashed || item.kind === 'limitacion' || item.kind === 'blockedZone';
  ctx.save();
  ctx.shadowColor = options.editor ? 'transparent' : 'rgba(15, 23, 42, 0.16)';
  ctx.shadowBlur = options.editor ? 0 : 16;
  ctx.shadowOffsetY = options.editor ? 0 : 7;
  ctx.fillStyle = fill;
  roundRect(ctx, x, y, w, h, item.kind === 'area' ? 16 : 10);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2.2;
  if (dashed) ctx.setLineDash([9, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawEllipse(ctx, item, fill, stroke) {
  const x = Number(item.x || 0);
  const y = Number(item.y || 0);
  const w = Number(item.width || 0);
  const h = Number(item.height || 0);
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, Math.max(w / 2, 1), Math.max(h / 2, 1), 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2.2;
  ctx.stroke();
}

function drawPool(ctx, item, fill, stroke) {
  drawEllipse(ctx, item, fill, stroke);
  const x = Number(item.x || 0);
  const y = Number(item.y || 0);
  const w = Number(item.width || 0);
  const h = Number(item.height || 0);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.72)';
  ctx.lineWidth = 2;
  for (let yy = y + h * 0.32; yy <= y + h * 0.72; yy += 16) {
    ctx.beginPath();
    for (let xx = x + w * 0.16; xx <= x + w * 0.84; xx += 10) {
      const wave = Math.sin((xx + yy) / 18) * 3;
      if (xx === x + w * 0.16) ctx.moveTo(xx, yy + wave);
      else ctx.lineTo(xx, yy + wave);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawTable(ctx, item, fill, stroke) {
  const x = Number(item.x || 0);
  const y = Number(item.y || 0);
  const w = Number(item.width || 0);
  const h = Number(item.height || 0);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.max(Math.min(w, h) * 0.34, 14);
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.12)';
  const chairs = Math.max(2, Math.min(10, Number(item.metadata?.capacidad || 4)));
  for (let i = 0; i < chairs; i++) {
    const a = (Math.PI * 2 * i) / chairs;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * (r + 9), cy + Math.sin(a) * (r + 9), 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.restore();
}

function drawParkingSpot(ctx, item, options, fill, stroke) {
  const x = Number(item.x || 0);
  const y = Number(item.y || 0);
  const w = Number(item.width || 0);
  const h = Number(item.height || 0);
  drawRectLike(ctx, item, { ...options, editor: true }, fill, stroke);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 1.4;
  for (let i = -h; i < w; i += 18) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + h, y);
    ctx.stroke();
  }
  const parking = options.parkingById?.[item.id] || options.parkingById?.[item.metadata?.spotCode];
  if (parking?.placas || parking?.modelo || parking?.estado === 'ocupado') {
    roundRect(ctx, x + w * 0.18, y + h * 0.28, w * 0.64, h * 0.42, 7);
    ctx.fillStyle = parking.estado === 'ocupado' ? '#0f172a' : '#475569';
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = '800 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(parking.placas || parking.modelo || 'Auto').slice(0, 12), x + w / 2, y + h / 2 + 4);
  }
  ctx.restore();
}

function drawEntrance(ctx, item, fill, stroke) {
  drawRectLike(ctx, item, { editor: true }, fill, stroke);
  const x = Number(item.x || 0);
  const y = Number(item.y || 0);
  const w = Number(item.width || 0);
  const h = Number(item.height || 0);
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.22, y + h * 0.5);
  ctx.lineTo(x + w * 0.72, y + h * 0.5);
  ctx.moveTo(x + w * 0.58, y + h * 0.32);
  ctx.lineTo(x + w * 0.74, y + h * 0.5);
  ctx.lineTo(x + w * 0.58, y + h * 0.68);
  ctx.stroke();
  ctx.restore();
}

function drawPolygon(ctx, item, fill, stroke) {
  const points = Array.isArray(item.points) ? item.points : [];
  const x = Number(item.x || 0);
  const y = Number(item.y || 0);
  if (!points.length) return;
  ctx.beginPath();
  points.forEach((point, index) => {
    const px = x + Number(point.x || 0);
    const py = y + Number(point.y || 0);
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2.2;
  ctx.stroke();
}

function drawLine(ctx, item, stroke) {
  const x = Number(item.x || 0);
  const y = Number(item.y || 0);
  const w = Number(item.width || 0);
  const h = Number(item.height || 0);
  const points = Array.isArray(item.points) && item.points.length >= 2 ? item.points : [{ x: 0, y: 0 }, { x: w, y: h }];
  ctx.beginPath();
  ctx.moveTo(x + Number(points[0].x || 0), y + Number(points[0].y || 0));
  ctx.lineTo(x + Number(points[1].x || w), y + Number(points[1].y || h));
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(2, Number(item.metadata?.strokeWidth || 4));
  ctx.stroke();
}

function drawMarker(ctx, item, fill, stroke) {
  const x = Number(item.x || 0);
  const y = Number(item.y || 0);
  const w = Number(item.width || 0);
  const h = Number(item.height || 0);
  const cx = x + w / 2;
  const cy = y + h * 0.42;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(Math.min(w, h) * 0.28, 10), 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, y + h - 4);
  ctx.lineTo(cx - 10, cy + 10);
  ctx.lineTo(cx + 10, cy + 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawImagePlaceholder(ctx, item, fill, stroke) {
  drawRectLike(ctx, item, { editor: true }, fill, stroke);
  const x = Number(item.x || 0);
  const y = Number(item.y || 0);
  const w = Number(item.width || 0);
  const h = Number(item.height || 0);
  ctx.save();
  ctx.strokeStyle = 'rgba(100,116,139,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 12, y + h - 14);
  ctx.lineTo(x + w * 0.38, y + h * 0.48);
  ctx.lineTo(x + w * 0.54, y + h * 0.64);
  ctx.lineTo(x + w - 12, y + h * 0.34);
  ctx.stroke();
  ctx.restore();
}

function drawLock(ctx, item) {
  if (!item.locked) return;
  const x = Number(item.x || 0) + Number(item.width || 0) - 28;
  const y = Number(item.y || 0) + 8;
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
  roundRect(ctx, x, y, 20, 20, 6);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.font = '900 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('L', x + 10, y + 14);
  ctx.restore();
}

function drawSelection(ctx, item, multi = false) {
  const x = Number(item.x || 0);
  const y = Number(item.y || 0);
  const w = Number(item.width || 0);
  const h = Number(item.height || 0);
  ctx.save();
  applyItemTransform(ctx, item);
  ctx.strokeStyle = multi ? '#22d3ee' : '#f59e0b';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([7, 5]);
  ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
  ctx.setLineDash([]);
  [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([hx, hy]) => {
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(hx - 5, hy - 5, 10, 10);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function drawItem(ctx, item, options = {}) {
  const { fill, stroke } = colorsForItem(item, options);
  ctx.save();
  ctx.globalAlpha = Number(item.opacity ?? 1);
  applyItemTransform(ctx, item);
  const type = item.type || 'rect';
  if (type === 'table') drawTable(ctx, item, fill, stroke);
  else if (type === 'ellipse' || type === 'circle') drawEllipse(ctx, item, fill, stroke);
  else if (type === 'pool') drawPool(ctx, item, fill, stroke);
  else if (type === 'parkingSpot') drawParkingSpot(ctx, item, options, fill, stroke);
  else if (type === 'entrance') drawEntrance(ctx, item, fill, stroke);
  else if (type === 'polygon') drawPolygon(ctx, item, fill, stroke);
  else if (type === 'line') drawLine(ctx, item, stroke);
  else if (type === 'marker' || type === 'icon') drawMarker(ctx, item, fill, stroke);
  else if (type === 'text') {
    ctx.fillStyle = item.fill || stroke;
    ctx.font = `${Number(item.metadata?.fontWeight || 800)} ${Number(item.metadata?.fontSize || 18)}px system-ui, sans-serif`;
    ctx.fillText(String(item.label || 'Texto'), Number(item.x || 0), Number(item.y || 0) + Number(item.height || 24) / 2);
  } else if (type === 'image' || type === 'background') drawImagePlaceholder(ctx, item, fill, stroke);
  else drawRectLike(ctx, item, options, fill, stroke);
  if (type !== 'text') drawLabel(ctx, item, options, stroke);
  drawLock(ctx, item);
  ctx.restore();
}

function drawEmptyState(ctx, doc) {
  const boxW = Math.min(410, doc.width - 80);
  const boxH = 120;
  const x = (doc.width - boxW) / 2;
  const y = (doc.height - boxH) / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  roundRect(ctx, x, y, boxW, boxH, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(14, 116, 144, 0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Mapa en preparacion', doc.width / 2, y + 45);
  ctx.fillStyle = '#64748b';
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText('El personal puede publicar zonas desde el panel.', doc.width / 2, y + 72);
  ctx.restore();
}

export function drawMapDocument(ctx, doc, options = {}) {
  drawBackground(ctx, doc, options);
  const selectedIds = new Set(options.selectedIds || []);
  getSortedMapItems(doc).forEach(({ item }) => drawItem(ctx, item, options));
  if (!doc.items.length) drawEmptyState(ctx, doc);
  if (selectedIds.size) {
    getSortedMapItems(doc)
      .filter(({ item }) => selectedIds.has(item.id))
      .forEach(({ item }) => drawSelection(ctx, item, selectedIds.size > 1));
  }
  if (options.marqueeRect) {
    const r = options.marqueeRect;
    ctx.save();
    ctx.fillStyle = 'rgba(34, 211, 238, 0.12)';
    ctx.strokeStyle = '#22d3ee';
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.8;
    ctx.fillRect(r.x, r.y, r.width, r.height);
    ctx.strokeRect(r.x, r.y, r.width, r.height);
    ctx.restore();
  }
}

export function drawMapCanvas(canvas, jsonOrDoc, options = {}) {
  const doc = typeof jsonOrDoc === 'string' ? parseMapDocument(jsonOrDoc, options) : jsonOrDoc;
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Number(doc.width || doc.w || 1000));
  const height = Math.max(1, Number(doc.height || doc.h || 620));
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return doc;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  drawMapDocument(ctx, doc, options);
  return doc;
}

export function drawMapCanvasViewport(canvas, doc, viewport, options = {}) {
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(1, rect.width || canvas.parentElement?.clientWidth || doc.width);
  const cssHeight = Math.max(1, rect.height || canvas.parentElement?.clientHeight || doc.height);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  ctx.save();
  ctx.translate(viewport.offsetX, viewport.offsetY);
  ctx.scale(viewport.scale, viewport.scale);
  drawMapDocument(ctx, doc, options);
  ctx.restore();
}

