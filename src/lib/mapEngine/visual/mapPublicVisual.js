import { itemMatchesPublicMapFilter } from '../mapPublicFilters.js';

/** Solo el documento (p. ej. vista previa del editor), sin la ruta `options.editor` del lienzo público. */
export function docUsesSemiRealProfile(doc) {
  return String(doc?.renderProfile || '').toLowerCase() === 'semireal';
}

export function isSemiRealRender(doc, options = {}) {
  if (options.editor) return false;
  if (options.semiReal === false) return false;
  if (options.semiReal === true) return true;
  return docUsesSemiRealProfile(doc);
}

/**
 * Micro-textura (césped / firme) para semi-real sin assets pesados.
 */
export function drawSemiRealTerrainTexture(ctx, doc, view) {
  const w = Math.max(1, Number(doc.width) || 1);
  const h = Math.max(1, Number(doc.height) || 1);
  ctx.save();
  if (view === 'estacionamiento') {
    ctx.globalAlpha = 0.045;
    for (let i = 0; i < 700; i++) {
      const x = ((i * 7919) % w + (i * 13) % 17) % w;
      const y = ((i * 6151) % h + (i * 7) % 19) % h;
      ctx.fillStyle = i % 2 ? '#e2e8f0' : '#94a3b8';
      ctx.fillRect(x, y, 1.2, 1.2);
    }
  } else {
    ctx.globalAlpha = 0.055;
    for (let i = 0; i < 1100; i++) {
      const x = ((i * 11003) % w + (i * 17) % 23) % w;
      const y = ((i * 9109) % h + (i * 11) % 29) % h;
      ctx.fillStyle = i % 3 === 0 ? '#166534' : i % 3 === 1 ? '#15803d' : '#22c55e';
      ctx.fillRect(x, y, 1.2, 1.2);
    }
    ctx.globalAlpha = 0.035;
    ctx.strokeStyle = 'rgba(120, 113, 108, 0.35)';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 28; i++) {
      const y0 = (h / 28) * i + 6;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 14) {
        const yy = y0 + Math.sin((x + i * 40) / 22) * 2.2;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawSemiRealParkOverlay(ctx, doc, options, view) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = view === 'estacionamiento' ? 0.12 : 0.08;
  const g = ctx.createRadialGradient(
    doc.width * 0.2,
    doc.height * 0.15,
    20,
    doc.width * 0.55,
    doc.height * 0.5,
    Math.max(doc.width, doc.height) * 0.85
  );
  g.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  g.addColorStop(0.45, 'rgba(226, 232, 240, 0.35)');
  g.addColorStop(1, 'rgba(15, 118, 110, 0.12)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, doc.width, doc.height);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = view === 'estacionamiento' ? 0.06 : 0.035;
  ctx.fillStyle = view === 'estacionamiento' ? '#22d3ee' : '#0f766e';
  const step = view === 'estacionamiento' ? 44 : 36;
  for (let y = 0; y < doc.height; y += step) {
    for (let x = (y / step) % 2 ? step / 2 : 0; x < doc.width; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, view === 'estacionamiento' ? 1.2 : 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} points
 * @param {number} dashPhase
 */
export function drawNavigationRoute(ctx, points, dashPhase = 0) {
  if (!points || points.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.22)';
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();

  ctx.lineWidth = 5;
  ctx.strokeStyle = '#0ea5e9';
  ctx.shadowColor = 'rgba(14, 165, 233, 0.45)';
  ctx.shadowBlur = 12;
  ctx.setLineDash([14, 10]);
  ctx.lineDashOffset = -(dashPhase % 240);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 14]);
  ctx.lineDashOffset = -(dashPhase * 0.6 % 240);
  ctx.stroke();
  ctx.restore();
}

export function publicMapItemFilter(options) {
  const fid = options.publicMapFilter;
  if (!fid || fid === 'all') return null;
  return (item) => itemMatchesPublicMapFilter(item, fid);
}
