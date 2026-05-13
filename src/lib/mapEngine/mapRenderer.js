import { getItemFocusRenderAlpha } from '../mapEditorViewConfig.js';
import { getSortedMapItems } from './mapHitTesting.js';
import { parseMapDocument } from './mapMigrations.js';
import { isMapItemVisibleInView, normalizeMapViewName } from './mapViewVisibility.js';
import { TABLE_STATES, getMapKind } from './mapTypes.js';
import {
  drawNavigationRoute,
  drawSemiRealParkOverlay,
  isSemiRealRender,
  publicMapItemFilter
} from './visual/mapPublicVisual.js';

const bgImageCache = new Map();

function ensureBgImage(url, requestRedraw) {
  if (!url) return { img: null, loaded: false, error: false };
  let entry = bgImageCache.get(url);
  if (!entry) {
    const img = new Image();
    entry = { img, loaded: false, error: false };
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      entry.loaded = true;
      requestRedraw?.();
    };
    img.onerror = () => {
      entry.error = true;
      requestRedraw?.();
    };
    img.src = url;
    bgImageCache.set(url, entry);
  }
  return entry;
}

function drawImageFit(ctx, img, dw, dh, fit, opacity) {
  if (!img?.naturalWidth) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  let sx = 0;
  let sy = 0;
  let sWidth = sw;
  let sHeight = sh;
  if (fit === 'stretch') {
    ctx.drawImage(img, 0, 0, sw, sh, 0, 0, dw, dh);
    ctx.restore();
    return;
  }
  const scale =
    fit === 'contain'
      ? Math.min(dw / sw, dh / sh)
      : Math.max(dw / sw, dh / sh);
  const rw = sw * scale;
  const rh = sh * scale;
  const dx = (dw - rw) / 2;
  const dy = (dh - rh) / 2;
  ctx.drawImage(img, 0, 0, sw, sh, dx, dy, rw, rh);
  ctx.restore();
}

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

function drawGrid(ctx, doc, options = {}) {
  if (doc.grid?.visible === false) return;
  const size = Math.max(10, Number(doc.grid?.size || 40));
  const view = options.view || doc.view;
  const dark = view === 'estacionamiento';
  ctx.save();
  ctx.strokeStyle = dark ? 'rgba(148, 163, 184, 0.13)' : 'rgba(15, 23, 42, 0.055)';
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
  if (options.editor) {
    ctx.strokeStyle = dark ? 'rgba(34, 211, 238, 0.18)' : 'rgba(14, 116, 144, 0.11)';
    ctx.lineWidth = 1.4;
    const major = size * 4;
    for (let x = 0; x <= doc.width; x += major) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, doc.height);
      ctx.stroke();
    }
    for (let y = 0; y <= doc.height; y += major) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(doc.width, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawParkGradient(ctx, doc, bg, view) {
  const gradient = ctx.createLinearGradient(0, 0, doc.width, doc.height);
  if (view === 'estacionamiento') {
    gradient.addColorStop(0, bg.fill || '#101827');
    gradient.addColorStop(0.52, '#172033');
    gradient.addColorStop(1, '#0f172a');
  } else if (view === 'mesas') {
    gradient.addColorStop(0, bg.fill || '#ecfdf5');
    gradient.addColorStop(0.55, '#f8fafc');
    gradient.addColorStop(1, '#eef6ff');
  } else {
    gradient.addColorStop(0, bg.fill || '#f0fdfa');
    gradient.addColorStop(0.5, '#f8fafc');
    gradient.addColorStop(1, '#e0f2fe');
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, doc.width, doc.height);
}

function drawParkDecor(ctx, doc, options, view) {
  ctx.save();
  if (view === 'estacionamiento') {
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.35)';
    ctx.lineWidth = 2;
    for (let x = 80; x < doc.width; x += 180) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 80, doc.height);
      ctx.stroke();
    }
  } else {
    ctx.globalAlpha = options.editor ? 0.13 : 0.22;
    ctx.strokeStyle = view === 'mesas' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(14, 165, 233, 0.32)';
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
  }
  ctx.restore();
}

function drawBackground(ctx, doc, options = {}) {
  const bg = doc.background || {};
  const view = options.view || doc.view;
  const bgType = String(bg.type || 'park').toLowerCase();
  const requestRedraw = options.requestRedraw;
  const url = String(bg.url || '').trim();
  const imgOpacity = Math.min(1, Math.max(0, Number(bg.opacity ?? 1)));
  const imgFit = ['cover', 'contain', 'stretch'].includes(String(bg.fit || '').toLowerCase())
    ? String(bg.fit).toLowerCase()
    : 'cover';
  const showImageLayer = bgType === 'image' && url && bg.visible !== false;

  if (bgType === 'none') {
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, doc.width, doc.height);
  } else if (bgType === 'color') {
    ctx.fillStyle = bg.fill || '#f8fafc';
    ctx.fillRect(0, 0, doc.width, doc.height);
  } else if (bgType === 'image') {
    drawParkGradient(ctx, doc, bg, view);
    if (showImageLayer) {
      const entry = ensureBgImage(url, requestRedraw);
      if (entry.loaded && entry.img) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, doc.width, doc.height);
        ctx.clip();
        drawImageFit(ctx, entry.img, doc.width, doc.height, imgFit, imgOpacity);
        ctx.restore();
      } else if (entry.error) {
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.06)';
        for (let i = -doc.height; i < doc.width + doc.height; i += 24) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i + doc.height, doc.height);
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.restore();
        if (options.editor) {
          ctx.save();
          ctx.fillStyle = 'rgba(71, 85, 105, 0.85)';
          ctx.font = '700 13px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('No se pudo cargar la imagen de fondo', doc.width / 2, doc.height / 2);
          ctx.restore();
        }
      }
    }
  } else {
    drawParkGradient(ctx, doc, bg, view);
    drawParkDecor(ctx, doc, options, view);
    if (isSemiRealRender(doc, options)) drawSemiRealParkOverlay(ctx, doc, options, view);
  }

  drawGrid(ctx, doc, { ...options, view });

  ctx.save();
  ctx.strokeStyle = bg.stroke || (view === 'estacionamiento' ? 'rgba(34, 211, 238, 0.46)' : 'rgba(15, 118, 110, 0.48)');
  ctx.lineWidth = view === 'estacionamiento' ? 2.4 : 3;
  if (view === 'estacionamiento') ctx.setLineDash([10, 8]);
  ctx.strokeRect(1.5, 1.5, doc.width - 3, doc.height - 3);
  ctx.setLineDash([]);
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
    const explicitReservable = item.metadata?.reservable;
    const noReservable = state === TABLE_STATES.NO_RESERVABLE || explicitReservable === false || explicitReservable === 'false';
    if (noReservable) {
      fill = 'rgba(100, 116, 139, 0.24)';
      stroke = '#64748b';
    } else if (state === TABLE_STATES.APARTADA) {
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
    } else if (stateParking === 'libre' || !stateParking) {
      fill = 'rgba(34, 197, 94, 0.14)';
      stroke = '#15803d';
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
  const view = options.view || options.docView;
  const kindLabel = getMapKind(item.kind).label;
  const label = String(item.metadata?.publicName || item.label || '').trim();
  const isGlobalLike = view === 'global' || view === 'parque';
  const fallbackGlobal = !label && !showIds && isGlobalLike ? kindLabel : '';
  const fallbackId = !label && !fallbackGlobal && !showIds && view === 'mesas' && (item.kind === 'mesa' || item.type === 'table')
    ? String(item.id || 'Mesa')
    : '';
  if (!label && !fallbackGlobal && !fallbackId && !showIds && !showKind) return;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fontSize =
    options.publicTypography === 'mesa'
      ? item.type === 'table'
        ? 13
        : 12
      : item.type === 'text'
        ? 18
        : view === 'global' || view === 'parque'
          ? 12
          : 13;
  ctx.font =
    item.type === 'text'
      ? `${Number(item.metadata?.fontWeight || 800)} ${Number(item.metadata?.fontSize || 18)}px system-ui, sans-serif`
      : `800 ${fontSize}px system-ui, sans-serif`;
  const labelInk = view === 'estacionamiento' && item.type !== 'parkingSpot' ? '#e2e8f0' : '#0f172a';
  ctx.fillStyle = item.type === 'text' ? (item.fill || labelInk) : labelInk;
  const text = showIds ? String(item.id || label || kindLabel) : (label || fallbackGlobal || fallbackId);
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
  const sr = Boolean(options.semiRealActive) && !options.editor;
  ctx.save();
  ctx.shadowColor = options.editor ? 'transparent' : sr ? 'rgba(15, 23, 42, 0.24)' : 'rgba(15, 23, 42, 0.16)';
  ctx.shadowBlur = options.editor ? 0 : sr ? 22 : 16;
  ctx.shadowOffsetY = options.editor ? 0 : sr ? 11 : 7;
  ctx.fillStyle = fill;
  roundRect(ctx, x, y, w, h, item.kind === 'area' ? 16 : 10);
  ctx.fill();
  if (dashed) {
    ctx.clip();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    for (let i = -h; i < w + h; i += 16) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + h);
      ctx.lineTo(x + i + h, y);
      ctx.stroke();
    }
  }
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

function drawTable(ctx, item, fill, stroke, options = {}) {
  const x = Number(item.x || 0);
  const y = Number(item.y || 0);
  const w = Number(item.width || 0);
  const h = Number(item.height || 0);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.max(Math.min(w, h) * 0.34, 14);
  const sr = Boolean(options.semiRealActive) && !options.editor;
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.18)';
  ctx.shadowBlur = sr ? 20 : 12;
  ctx.shadowOffsetY = sr ? 8 : 5;
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
  const vip = item.metadata?.vip === true || item.metadata?.vip === 'true';
  if (vip && !options.editor) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, r + 5, r + 5, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

function drawParkingSpot(ctx, item, options, fill, stroke) {
  const x = Number(item.x || 0);
  const y = Number(item.y || 0);
  const w = Number(item.width || 0);
  const h = Number(item.height || 0);
  drawRectLike(ctx, item, options, fill, stroke);
  ctx.save();
  ctx.strokeStyle = options.editor ? 'rgba(255,255,255,0.52)' : 'rgba(226,232,240,0.72)';
  ctx.lineWidth = 1.4;
  for (let i = -h; i < w; i += 18) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + h, y);
    ctx.stroke();
  }
  const parking = options.parkingById?.[item.id] || options.parkingById?.[item.metadata?.spotCode];
  if (parking?.placas || parking?.modelo || parking?.estado === 'ocupado') {
    roundRect(ctx, x + w * 0.16, y + h * 0.26, w * 0.68, h * 0.46, 9);
    ctx.fillStyle = parking.estado === 'ocupado' ? '#020617' : '#334155';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.stroke();
    ctx.fillStyle = 'white';
    ctx.font = '800 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(parking.placas || parking.modelo || 'Auto').slice(0, 12), x + w / 2, y + h / 2 + 4);
  }
  ctx.restore();
}

function drawEntrance(ctx, item, fill, stroke, options = {}) {
  drawRectLike(ctx, item, options, fill, stroke);
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

function drawImagePlaceholder(ctx, item, fill, stroke, options = {}) {
  drawRectLike(ctx, item, options, fill, stroke);
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

function drawSelection(ctx, item, multi = false, options = {}) {
  const x = Number(item.x || 0);
  const y = Number(item.y || 0);
  const w = Number(item.width || 0);
  const h = Number(item.height || 0);
  ctx.save();
  applyItemTransform(ctx, item);
  const simplePublic = options.viewerSelectionStyle === 'simple' && !options.editor;
  if (simplePublic && !multi) {
    ctx.strokeStyle = 'rgba(14, 116, 144, 0.92)';
    ctx.lineWidth = 2.6;
    ctx.setLineDash([]);
    ctx.shadowColor = 'rgba(14, 165, 233, 0.28)';
    ctx.shadowBlur = 14;
    roundRect(ctx, x - 4, y - 4, w + 8, h + 8, Math.min(14, w / 8, h / 8));
    ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.strokeStyle = multi ? '#67e8f9' : '#f59e0b';
  ctx.lineWidth = multi ? 1.8 : 2.8;
  ctx.setLineDash(multi ? [5, 5] : []);
  ctx.shadowColor = multi ? 'rgba(103, 232, 249, 0.35)' : 'rgba(245, 158, 11, 0.36)';
  ctx.shadowBlur = 10;
  ctx.strokeRect(x - 5, y - 5, w + 10, h + 10);
  ctx.setLineDash([]);
  if (multi) {
    ctx.restore();
    return;
  }
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

function boundsForItems(items) {
  if (!items.length) return null;
  const left = Math.min(...items.map((item) => Number(item.x || 0)));
  const top = Math.min(...items.map((item) => Number(item.y || 0)));
  const right = Math.max(...items.map((item) => Number(item.x || 0) + Number(item.width || 0)));
  const bottom = Math.max(...items.map((item) => Number(item.y || 0) + Number(item.height || 0)));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function drawSelectionBounds(ctx, items) {
  const box = boundsForItems(items);
  if (!box) return;
  ctx.save();
  ctx.strokeStyle = '#22d3ee';
  ctx.fillStyle = 'rgba(34, 211, 238, 0.06)';
  ctx.lineWidth = 2.2;
  ctx.setLineDash([10, 6]);
  ctx.fillRect(box.x - 8, box.y - 8, box.width + 16, box.height + 16);
  ctx.strokeRect(box.x - 8, box.y - 8, box.width + 16, box.height + 16);
  ctx.setLineDash([]);
  ctx.restore();
}

function drawHover(ctx, item, options = {}) {
  const x = Number(item.x || 0);
  const y = Number(item.y || 0);
  const w = Number(item.width || 0);
  const h = Number(item.height || 0);
  ctx.save();
  applyItemTransform(ctx, item);
  const pub = options.viewerUi === true && !options.editor;
  ctx.strokeStyle = pub ? 'rgba(14, 165, 233, 0.55)' : 'rgba(255, 255, 255, 0.86)';
  ctx.lineWidth = pub ? 2.8 : 5;
  ctx.shadowColor = pub ? 'rgba(14, 165, 233, 0.22)' : 'rgba(14, 165, 233, 0.42)';
  ctx.shadowBlur = pub ? 12 : 16;
  roundRect(ctx, x - (pub ? 3 : 5), y - (pub ? 3 : 5), w + (pub ? 6 : 10), h + (pub ? 6 : 10), pub ? 12 : 14);
  ctx.stroke();
  ctx.restore();
}

function drawItem(ctx, item, options = {}) {
  const { fill, stroke } = colorsForItem(item, options);
  const view = normalizeMapViewName(options.view || options.docView);
  if (!isMapItemVisibleInView(item, view)) return;
  ctx.save();
  const showCtx = options.showViewContext !== false;
  const focusAlpha = options.editor ? getItemFocusRenderAlpha(view, item, showCtx) : 1;
  if (focusAlpha <= 0) {
    ctx.restore();
    return;
  }
  ctx.globalAlpha = Math.max(0, Number(item.opacity ?? 1) * focusAlpha);
  applyItemTransform(ctx, item);
  const type = item.type || 'rect';
  if (type === 'table') drawTable(ctx, item, fill, stroke, options);
  else if (type === 'ellipse' || type === 'circle') drawEllipse(ctx, item, fill, stroke);
  else if (type === 'pool') drawPool(ctx, item, fill, stroke);
  else if (type === 'parkingSpot') drawParkingSpot(ctx, item, options, fill, stroke);
  else if (type === 'entrance') drawEntrance(ctx, item, fill, stroke, options);
  else if (type === 'polygon') drawPolygon(ctx, item, fill, stroke);
  else if (type === 'line') drawLine(ctx, item, stroke);
  else if (type === 'marker' || type === 'icon') drawMarker(ctx, item, fill, stroke);
  else if (type === 'text') {
    ctx.fillStyle = item.fill || stroke;
    ctx.font = `${Number(item.metadata?.fontWeight || 800)} ${Number(item.metadata?.fontSize || 18)}px system-ui, sans-serif`;
    ctx.fillText(String(item.label || 'Texto'), Number(item.x || 0), Number(item.y || 0) + Number(item.height || 24) / 2);
  } else if (type === 'image' || type === 'background') drawImagePlaceholder(ctx, item, fill, stroke, options);
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
  const viewName = normalizeMapViewName(options.view || doc.view);
  const renderOptions = {
    ...options,
    view: viewName,
    docView: normalizeMapViewName(doc.view),
    semiRealActive: isSemiRealRender(doc, { ...options, view: viewName })
  };
  drawBackground(ctx, doc, renderOptions);
  const selectedIds = new Set(options.selectedIds || []);
  const sorted = getSortedMapItems(doc).filter(({ item }) => isMapItemVisibleInView(item, renderOptions.view));
  const filterFn = publicMapItemFilter(renderOptions);
  const sortedDraw = filterFn ? sorted.filter(({ item }) => filterFn(item)) : sorted;
  sortedDraw.forEach(({ item }) => drawItem(ctx, item, renderOptions));
  if (!doc.items.length) drawEmptyState(ctx, doc);
  const hovered = options.hoveredId ? doc.items.find((item) => item.id === options.hoveredId) : null;
  const hoverOk = hovered && hovered.visible !== false && (!filterFn || filterFn(hovered));
  if (hoverOk && !selectedIds.has(hovered.id)) drawHover(ctx, hovered, renderOptions);
  if (selectedIds.size) {
    const selected = sortedDraw.filter(({ item }) => selectedIds.has(item.id)).map(({ item }) => item);
    if (selected.length > 1) drawSelectionBounds(ctx, selected);
    selected.forEach((item) => drawSelection(ctx, item, selectedIds.size > 1, renderOptions));
  }
  if (Array.isArray(options.navigationPath) && options.navigationPath.length >= 2) {
    drawNavigationRoute(ctx, options.navigationPath, Number(options.routeDashPhase) || 0);
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
  const requestRedraw =
    options.requestRedraw ||
    (() => {
      drawMapCanvas(canvas, jsonOrDoc, options);
    });
  drawMapDocument(ctx, doc, { ...options, requestRedraw });
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
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  ctx.save();
  ctx.translate(viewport.offsetX, viewport.offsetY);
  ctx.scale(viewport.scale, viewport.scale);
  const requestRedraw =
    options.requestRedraw ||
    (() => {
      drawMapCanvasViewport(canvas, doc, viewport, options);
    });
  drawMapDocument(ctx, doc, { ...options, requestRedraw });
  ctx.restore();
}
