import { Html5Qrcode } from 'html5-qrcode';
import {
  listTicketsForScannerCache,
  scanTicketOnline,
  syncPendingTicketScan,
  getTicketSnapshotForScan
} from '../lib/dataLayer.js';
import { getCurrentUser } from '../lib/authProvider.js';
import { getUserAccess } from '../lib/accessControl.js';
import { icon } from '../lib/icons.js';
import {
  addPendingScan,
  addRecentScan,
  cacheTicketsForDay,
  clearOldCache,
  getCachedTicket,
  getScannerDeviceId,
  listPendingScans,
  listRecentScans,
  markPendingScanConflict,
  markPendingScanSynced,
  markTicketScannedLocal
} from '../lib/offlineScannerStore.js';
import {
  classifyOfflineOutcome,
  classifyOnlineScanOutcome,
  fmtWhen,
  humanSummaryForHistory,
  moneyMx,
  normalizeTicketForScanDisplay
} from '../lib/scanTicketDisplay.js';
import {
  isScannerSoundEnabled,
  primeScannerAudioContext,
  runScannerFeedback,
  setScannerSoundEnabled
} from '../lib/scannerFeedback.js';
import { logAuditEvent } from '../lib/auditLog.js';

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

const VARIANT_SURFACE = {
  accepted: 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-400/80',
  already_scanned: 'border-orange-400 bg-orange-50 ring-2 ring-orange-400/70',
  cancelled: 'border-red-500 bg-red-50 ring-2 ring-red-500/70',
  unpaid: 'border-amber-400 bg-amber-50 ring-2 ring-amber-400/80',
  not_found: 'border-slate-400 bg-slate-100 ring-2 ring-slate-400/60',
  offline_pending: 'border-yellow-400 bg-yellow-50 ring-2 ring-yellow-400/80',
  conflict: 'border-rose-500 bg-rose-50 ring-2 ring-rose-500/70'
};

const TYPE_SECTION_LABEL = {
  ticket: 'Entradas / tipo de ticket',
  paquete: 'Paquetes',
  producto: 'Productos',
  servicio: 'Servicios extra',
  mesa: 'Mesa y reserva',
  extra: 'Extras',
  item: 'Otros'
};

function parseTicketQr(rawValue) {
  const text = String(rawValue || '').trim();
  if (!text) return { ticketId: null, raw: text };
  const direct = text.match(UUID_PATTERN);
  if (direct) return { ticketId: direct[0].toLowerCase(), raw: text };
  if (text.toLowerCase().startsWith('ticket:')) {
    return parseTicketQr(text.slice(7).trim());
  }
  try {
    const parsed = JSON.parse(text);
    const candidate = parsed?.ticketId || parsed?.ticket_id || parsed?.ticket || parsed?.id;
    if (candidate) return parseTicketQr(candidate);
  } catch {}
  try {
    const url = new URL(text);
    const qCandidate =
      url.searchParams.get('ticket') ||
      url.searchParams.get('ticketId') ||
      url.searchParams.get('ticket_id') ||
      url.searchParams.get('id');
    if (qCandidate) return parseTicketQr(qCandidate);
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((p) => p.toLowerCase() === 'ticket');
    if (idx >= 0 && parts[idx + 1]) return parseTicketQr(parts[idx + 1]);
  } catch {}
  return { ticketId: null, raw: text };
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function groupItemsByType(items) {
  const map = new Map();
  for (const it of items || []) {
    const k = it.type || 'item';
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(it);
  }
  const order = ['ticket', 'paquete', 'producto', 'servicio', 'mesa', 'extra', 'item'];
  return order.filter((k) => map.has(k)).map((k) => ({ type: k, rows: map.get(k) }));
}

const Escaner = {
  render: () => `
    <section class="min-h-full bg-slate-100 p-3 pb-44 sm:p-4 sm:pb-48">
      <div class="mx-auto max-w-3xl space-y-3">
        <header class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h1 class="text-xl font-black text-slate-900">Escáner operativo</h1>
          <p class="mt-1 text-sm text-slate-600">Validación rápida para personal en móvil.</p>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <div id="scanner-connection-state" class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600" aria-live="polite"></div>
            <label class="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
              <input id="scanner-sound-toggle" type="checkbox" class="h-4 w-4" />
              Sonido
            </label>
          </div>
        </header>

        <section class="overflow-hidden rounded-2xl bg-slate-950 shadow-lg">
          <div class="relative aspect-[4/5] min-h-[280px] sm:min-h-[320px]">
            <div id="qr-reader-root" class="absolute inset-0"></div>
            <div class="pointer-events-none absolute inset-x-6 top-6 bottom-6 rounded-3xl border-4 border-cyan-300/80"></div>
            <div class="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-cyan-100">${icon('scan', 'inline h-4 w-4 mr-1')} Cámara</div>
            <div id="camera-chip" class="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-slate-100">En espera</div>
          </div>
          <div class="grid grid-cols-1 gap-2 border-t border-white/10 p-3 sm:grid-cols-2">
            <button id="btn-start-camera" type="button" class="rounded-xl bg-cyan-400 px-3 py-3 text-sm font-black text-slate-900">Iniciar cámara</button>
            <button id="btn-stop-camera" type="button" class="rounded-xl border border-white/20 px-3 py-3 text-sm font-bold text-white" disabled>Detener cámara</button>
          </div>
        </section>

        <div id="scanner-result-strip" class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-live="polite">
          <p id="scanner-strip-title" class="text-base font-black text-slate-900">Listo para escanear</p>
          <p id="scanner-strip-msg" class="mt-1 text-sm text-slate-600">Escanea un código QR o usa la entrada manual debajo.</p>
        </div>

        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-black uppercase text-slate-500">Entrada manual</p>
          <div class="mt-2 flex gap-2">
            <input id="scanner-manual-input" class="flex-1 rounded-xl border border-slate-300 px-3 py-3 text-base" placeholder="UUID, URL o ticket:..." autocomplete="off" />
            <button id="scanner-manual-btn" type="button" class="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">Validar</button>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <button id="scanner-cache-btn" type="button" class="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold">Actualizar cache hoy</button>
            <button id="scanner-sync-btn" type="button" class="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold">Sincronizar ahora</button>
          </div>
        </section>

        <details class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <summary class="cursor-pointer text-sm font-black text-slate-900">Pendientes offline</summary>
          <div id="scanner-pending-list" class="mt-3 text-xs text-slate-600"></div>
        </details>

        <details class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <summary class="cursor-pointer text-sm font-black text-slate-900">Historial reciente</summary>
          <div id="scanner-history-list" class="mt-3 text-xs text-slate-600"></div>
        </details>
      </div>

      <div id="scanner-result-overlay" class="fixed inset-0 z-50 hidden" aria-modal="true" role="dialog">
        <div class="absolute inset-0 bg-black/50" aria-hidden="true"></div>
        <div class="absolute inset-x-0 bottom-0 flex max-h-[94vh] flex-col rounded-t-3xl bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.2)]">
          <div class="flex shrink-0 justify-center pt-3 pb-1">
            <div class="h-1.5 w-14 rounded-full bg-slate-200"></div>
          </div>
          <div id="scanner-result-scroll" class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2 pt-1"></div>
          <div class="shrink-0 border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button type="button" id="scanner-result-sync-pending" class="mb-2 hidden w-full rounded-xl border border-amber-300 bg-amber-50 py-3 text-sm font-black text-amber-800">
              Sincronizar pendientes
            </button>
            <button type="button" id="scanner-result-scan-another" class="w-full rounded-2xl bg-slate-900 py-4 text-base font-black text-white shadow-lg active:scale-[0.99]">
              Escanear otro
            </button>
          </div>
        </div>
      </div>
    </section>
  `,
  mount: async () => {
    const access = await getUserAccess(getCurrentUser());
    if (!access.can('tickets.scan')) return;

    const btnStart = document.getElementById('btn-start-camera');
    const btnStop = document.getElementById('btn-stop-camera');
    const btnManual = document.getElementById('scanner-manual-btn');
    const btnCache = document.getElementById('scanner-cache-btn');
    const btnSync = document.getElementById('scanner-sync-btn');
    const inputManual = document.getElementById('scanner-manual-input');
    const soundToggle = document.getElementById('scanner-sound-toggle');
    const cameraChip = document.getElementById('camera-chip');
    const connState = document.getElementById('scanner-connection-state');
    const stripTitle = document.getElementById('scanner-strip-title');
    const stripMsg = document.getElementById('scanner-strip-msg');
    const overlay = document.getElementById('scanner-result-overlay');
    const scrollRoot = document.getElementById('scanner-result-scroll');
    const btnScanAnotherFooter = document.getElementById('scanner-result-scan-another');
    const btnResultSyncPending = document.getElementById('scanner-result-sync-pending');
    const pendingList = document.getElementById('scanner-pending-list');
    const historyList = document.getElementById('scanner-history-list');

    let scanner = null;
    let lastRaw = '';
    let lastAt = 0;
    let busy = false;
    const deviceId = getScannerDeviceId();
    let lastScanRawSaved = '';

    const paintStripIdle = () => {
      stripTitle.textContent = 'Listo para escanear';
      stripMsg.textContent = 'Escanea un código QR o usa la entrada manual.';
    };

    const paintStripBusy = (title, msg) => {
      stripTitle.textContent = title;
      stripMsg.textContent = msg;
    };

    const hideOverlay = () => {
      overlay?.classList.add('hidden');
      scrollRoot.innerHTML = '';
    };

    const appendIncludeLi = (ul, row, bulletClass) => {
      const li = document.createElement('li');
      li.className = 'flex gap-2 text-sm text-slate-800';
      const qty = row.qty > 1 ? `${row.qty} × ` : '';
      const pricePart =
        row.price != null && Number.isFinite(row.price) ? ` · ${moneyMx(row.price)}` : '';
      const desc = row.description ? ` — ${escapeHtml(row.description)}` : '';
      const notes = row.notes ? ` (${escapeHtml(row.notes)})` : '';
      li.innerHTML = `<span class="mt-1.5 h-2 w-2 shrink-0 rounded-full ${bulletClass}"></span><span>${qty}<strong>${escapeHtml(row.label)}</strong>${escapeHtml(pricePart)}${desc}${notes}</span>`;
      ul.appendChild(li);
    };

    const buildIncludesSection = (display) => {
      const groups = groupItemsByType(display.items);
      const wrap = document.createElement('div');
      wrap.className = 'mt-5 rounded-2xl border border-slate-200 bg-white p-4';

      const h = document.createElement('h3');
      h.className = 'text-sm font-black uppercase tracking-wide text-slate-700';
      h.textContent = 'Este ticket incluye';
      wrap.appendChild(h);

      const flat = [];
      for (const { type, rows } of groups) {
        for (const row of rows) flat.push({ ...row, _section: type });
      }

      if (!flat.length) {
        const p = document.createElement('p');
        p.className = 'mt-2 text-sm text-slate-600';
        p.textContent =
          'No hay desglose guardado en el ticket. Revisa total y datos del cliente; mesas y extras aparecen si están vinculadas en el sistema o en metadata.';
        wrap.appendChild(p);
        return wrap;
      }

      const SHOW_FIRST = 8;
      const head = flat.slice(0, SHOW_FIRST);
      const tail = flat.slice(SHOW_FIRST);

      const renderGrouped = (rows, bulletPrimary) => {
        const host = document.createElement('div');
        host.className = 'mt-3 space-y-4';
        let lastSection = null;
        let ul = null;
        for (const row of rows) {
          const sec = row._section || 'item';
          if (sec !== lastSection) {
            lastSection = sec;
            const labEl = document.createElement('p');
            labEl.className = bulletPrimary
              ? 'text-xs font-black uppercase text-teal-800'
              : 'text-xs font-black uppercase text-slate-500';
            labEl.textContent = TYPE_SECTION_LABEL[sec] || TYPE_SECTION_LABEL.item;
            host.appendChild(labEl);
            ul = document.createElement('ul');
            ul.className = 'mt-1 space-y-2';
            host.appendChild(ul);
          }
          appendIncludeLi(ul, row, bulletPrimary ? 'bg-teal-500' : 'bg-slate-400');
        }
        return host;
      };

      wrap.appendChild(renderGrouped(head, true));

      if (tail.length) {
        const det = document.createElement('details');
        det.className = 'mt-3';
        const sum = document.createElement('summary');
        sum.className = 'cursor-pointer rounded-xl bg-slate-50 px-3 py-2 text-sm font-black text-teal-800 ring-1 ring-slate-200';
        sum.textContent = `Ver más (${tail.length})`;
        det.appendChild(sum);
        det.appendChild(renderGrouped(tail, false));
        wrap.appendChild(det);
      }

      return wrap;
    };

    /** @param {{ outcome: ReturnType<typeof classifyOnlineScanOutcome>, display: ReturnType<typeof normalizeTicketForScanDisplay>, subtitle?: string, cacheNote?: string, rawQr: string, iconGlyph?: string }} ctx */
    const showOperationalResult = (ctx) => {
      lastScanRawSaved = ctx.rawQr || '';
      scrollRoot.innerHTML = '';
      const surface = VARIANT_SURFACE[ctx.outcome.variant] || VARIANT_SURFACE.not_found;

      const banner = document.createElement('div');
      banner.className = `rounded-2xl border p-4 ${surface}`;
      const iconWrap = document.createElement('div');
      iconWrap.className = 'flex items-start gap-3';
      const glyph =
        ctx.iconGlyph ||
        (ctx.outcome.variant === 'accepted' || ctx.outcome.variant === 'offline_pending'
          ? icon('check', 'h-10 w-10 shrink-0 text-emerald-700')
          : ctx.outcome.variant === 'already_scanned' || ctx.outcome.variant === 'unpaid'
            ? icon('clock', 'h-10 w-10 shrink-0 text-amber-800')
            : icon('scan', 'h-10 w-10 shrink-0 text-slate-700'));
      const icSlot = document.createElement('div');
      icSlot.className = 'shrink-0';
      icSlot.innerHTML = glyph;
      const txtSlot = document.createElement('div');
      txtSlot.className = 'min-w-0';
      txtSlot.innerHTML = `<h2 class="text-xl font-black leading-tight text-slate-900">${escapeHtml(ctx.outcome.title)}</h2><p class="mt-1 text-sm font-semibold text-slate-700">${escapeHtml(ctx.subtitle || ctx.outcome.subtitle)}</p>`;
      iconWrap.appendChild(icSlot.firstElementChild || icSlot);
      iconWrap.appendChild(txtSlot);
      banner.appendChild(iconWrap);
      scrollRoot.appendChild(banner);

      if (ctx.cacheNote) {
        const note = document.createElement('p');
        note.className =
          'mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 ring-1 ring-amber-200';
        note.textContent = ctx.cacheNote;
        scrollRoot.appendChild(note);
      }

      const grid = document.createElement('div');
      grid.className =
        'mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800';

      const row = (k, v) =>
        `<div class="flex flex-col gap-0.5 border-b border-slate-200/80 pb-2 last:border-0 last:pb-0"><span class="text-[11px] font-black uppercase text-slate-500">${escapeHtml(k)}</span><span class="font-semibold text-slate-900">${v}</span></div>`;

      const tipo =
        ctx.display.tipoTicketLabel ||
        (ctx.display.items.find((x) => x.type === 'ticket')?.label ?? '—');
      grid.innerHTML = [
        row('Cliente', escapeHtml(ctx.display.clienteNombre)),
        row('Correo', ctx.display.clienteEmail ? escapeHtml(ctx.display.clienteEmail) : '—'),
        row('Ticket / código', `#${escapeHtml(ctx.display.shortId)}`),
        row('Tipo de compra', escapeHtml(tipo)),
        row('Estado del ticket', escapeHtml(ctx.display.estadoTicket)),
        row('Estado de pago', escapeHtml(ctx.display.estadoPago)),
        row('Fecha de compra', ctx.display.fechaCreacion ? escapeHtml(fmtWhen(ctx.display.fechaCreacion)) : '—'),
        row('Último escaneo', ctx.display.fechaEscaneo ? escapeHtml(fmtWhen(ctx.display.fechaEscaneo)) : '—'),
        row('Método de pago', escapeHtml(ctx.display.metodoPago)),
        row('Total', escapeHtml(moneyMx(ctx.display.precioTotal)))
      ].join('');
      scrollRoot.appendChild(grid);

      scrollRoot.appendChild(buildIncludesSection(ctx.display));

      const actions = document.createElement('div');
      actions.className = 'mt-4 flex flex-col gap-2';
      const btnQr = document.createElement('button');
      btnQr.type = 'button';
      btnQr.className =
        'rounded-xl border-2 border-slate-300 bg-white py-3 text-sm font-black text-slate-900';
      btnQr.textContent = 'Ver detalles';
      const preWrap = document.createElement('pre');
      preWrap.className =
        'hidden max-h-36 overflow-auto rounded-xl bg-slate-900 p-3 text-xs text-emerald-100';
      preWrap.textContent = lastScanRawSaved || '(sin dato)';
      btnQr.addEventListener('click', () => {
        preWrap.classList.toggle('hidden');
      });
      actions.appendChild(btnQr);
      actions.appendChild(preWrap);
      scrollRoot.appendChild(actions);

      overlay.classList.remove('hidden');
      if (btnResultSyncPending) {
        const needsSync = ctx.outcome.key === 'offline_pending' || ctx.outcome.key === 'conflict';
        btnResultSyncPending.classList.toggle('hidden', !needsSync);
      }
      stripTitle.textContent = ctx.outcome.title;
      stripMsg.textContent = 'Resultado abajo. Pulsa «Escanear otro» para continuar.';
    };

    const updateConn = async () => {
      const pending = await listPendingScans();
      connState.textContent = `${navigator.onLine ? 'Online' : 'Offline'} · Pendientes: ${pending.filter((p) => p.status === 'pending').length}`;
    };

    const renderPending = async () => {
      const rows = await listPendingScans();
      if (!rows.length) {
        pendingList.innerHTML = '<p class="text-emerald-700 font-semibold">Todo sincronizado.</p>';
        return;
      }
      pendingList.innerHTML = rows
        .slice(0, 10)
        .map(
          (row) =>
            `<p class="mb-1 rounded-lg bg-slate-100 px-2 py-2 font-medium">Ticket #${String(row.ticketId || '').slice(0, 8)} · ${escapeHtml(row.status)} · ${fmtWhen(row.scannedAt)}</p>`
        )
        .join('');
    };

    const renderHistory = async () => {
      const rows = await listRecentScans(14);
      if (!rows.length) {
        historyList.innerHTML = '<p class="text-slate-500">Sin escaneos recientes.</p>';
        return;
      }
      historyList.innerHTML = rows
        .map((row) => {
          const lineRaw =
            row.displaySummary ||
            `${String(row.mode || '')} · ${String(row.status || '')} · #${String(row.ticketId || '').slice(0, 8)}`;
          return `<p class="mb-1 rounded-lg bg-slate-100 px-2 py-2 font-semibold text-slate-800">${escapeHtml(lineRaw)}</p>`;
        })
        .join('');
    };

    const pushHistory = async (payload) => {
      await addRecentScan(payload);
    };

    const logScanAudit = ({ eventType, title, description, severity = 'info', ticketId = '', metadata = {} }) => {
      void logAuditEvent({
        eventType,
        entityType: ticketId ? 'ticket' : 'scan',
        entityId: ticketId || null,
        severity,
        title,
        description,
        metadata
      });
    };

    const processOnline = async ({ ticketId, raw }) => {
      const response = await scanTicketOnline({
        ticketId,
        rawQr: raw,
        deviceId,
        scannedBy: access.userId || access.uid || ''
      });
      const result = response.data?.result;
      const reason = response.data?.reason;
      let ticketFull = response.data?.ticket || null;
      let mesas = [];

      try {
        const snap = await getTicketSnapshotForScan(ticketId);
        if (snap.ticket) ticketFull = snap.ticket;
        mesas = snap.mesaReservas || [];
      } catch {
        /* usar ticket devuelto por RPC */
      }

      const outcome = classifyOnlineScanOutcome(result, reason);
      let subtitle = outcome.subtitle;
      if (outcome.key === 'already_scanned' && ticketFull?.fechaEscaneo) {
        subtitle = `Escaneado el ${fmtWhen(ticketFull.fechaEscaneo)}`;
      }

      const display = normalizeTicketForScanDisplay(ticketFull, {
        mesaReservas: mesas,
        stubTicketId: ticketId,
        source: 'online'
      });

      showOperationalResult({
        outcome,
        display,
        subtitle,
        rawQr: raw,
        cacheNote: ''
      });

      const ok = result === 'valid' && reason === 'accepted';
      if (ok) {
        logScanAudit({
          eventType: 'ticket_escaneado',
          title: 'Ticket escaneado',
          description: `Entrada validada para ${display.clienteNombre || 'cliente'}.`,
          ticketId,
          metadata: { reason, mode: 'online' }
        });
      } else if (outcome.key === 'already_scanned') {
        logScanAudit({
          eventType: 'ticket_ya_usado',
          title: 'Ticket ya usado',
          description: `Se intentó escanear de nuevo el ticket ${display.shortId}.`,
          severity: 'warning',
          ticketId,
          metadata: { reason, mode: 'online' }
        });
      } else {
        logScanAudit({
          eventType: 'ticket_scan_rechazado',
          title: 'Escaneo rechazado',
          description: `Escaneo rechazado (${outcome.key}) para ticket ${display.shortId}.`,
          severity: 'warning',
          ticketId,
          metadata: { reason, mode: 'online', outcomeKey: outcome.key }
        });
      }
      runScannerFeedback(ok ? 'accepted' : outcome.key === 'already_scanned' ? 'already_scanned' : 'rejected');

      const summary = humanSummaryForHistory({
        outcomeKey: outcome.key,
        clienteNombre: display.clienteNombre,
        shortId: display.shortId,
        offlinePending: false
      });
      await pushHistory({
        ticketId,
        rawQr: raw,
        mode: 'online',
        status: ok ? 'accepted' : reason || 'rejected',
        displaySummary: summary,
        message: outcome.title,
        scannedAt: new Date().toISOString()
      });
    };

    const processOffline = async ({ ticketId, raw }) => {
      const ticket = await getCachedTicket(ticketId);
      if (!ticket) {
        const oc = classifyOfflineOutcome('not_cached');
        const display = normalizeTicketForScanDisplay(null, { stubTicketId: ticketId, source: 'cache' });
        showOperationalResult({
          outcome: oc,
          display,
          subtitle: oc.subtitle,
          rawQr: raw,
          cacheNote: 'Sin datos en este dispositivo.'
        });
        runScannerFeedback('rejected');
        logScanAudit({
          eventType: 'scanner_offline_no_cache',
          title: 'Escaneo sin cache',
          description: `No se encontró en cache local el ticket ${display.shortId}.`,
          severity: 'warning',
          ticketId,
          metadata: { mode: 'offline' }
        });
        await pushHistory({
          ticketId,
          rawQr: raw,
          mode: 'offline',
          status: 'not_cached',
          displaySummary: humanSummaryForHistory({
            outcomeKey: 'not_cached',
            clienteNombre: '',
            shortId: display.shortId,
            offlinePending: false
          }),
          scannedAt: new Date().toISOString()
        });
        return;
      }

      if (ticket.estadoTicket === 'cancelado') {
        const oc = classifyOfflineOutcome('cancelled');
        const display = normalizeTicketForScanDisplay(ticket, { mesaReservas: [], source: 'cache' });
        showOperationalResult({
          outcome: oc,
          display,
          subtitle: oc.subtitle,
          rawQr: raw,
          cacheNote: 'Datos tomados del cache local.'
        });
        runScannerFeedback('rejected');
        logScanAudit({
          eventType: 'ticket_scan_rechazado',
          title: 'Ticket cancelado',
          description: `Se intentó escanear ticket cancelado ${display.shortId}.`,
          severity: 'warning',
          ticketId,
          metadata: { mode: 'offline', state: 'cancelado' }
        });
        await pushHistory({
          ticketId,
          rawQr: raw,
          mode: 'offline',
          status: 'cancelled',
          displaySummary: humanSummaryForHistory({
            outcomeKey: 'cancelled',
            clienteNombre: display.clienteNombre,
            shortId: display.shortId,
            offlinePending: false
          }),
          scannedAt: new Date().toISOString()
        });
        return;
      }
      if (ticket.estadoTicket === 'escaneado') {
        const oc = classifyOfflineOutcome('already_scanned');
        const display = normalizeTicketForScanDisplay(ticket, { mesaReservas: [], source: 'cache' });
        let subtitle = oc.subtitle;
        if (ticket.fechaEscaneo) subtitle = `Escaneado el ${fmtWhen(ticket.fechaEscaneo)}`;
        showOperationalResult({
          outcome: oc,
          display,
          subtitle,
          rawQr: raw,
          cacheNote: 'Datos tomados del cache local.'
        });
        runScannerFeedback('already_scanned');
        logScanAudit({
          eventType: 'ticket_ya_usado',
          title: 'Ticket ya usado',
          description: `Ticket ${display.shortId} ya estaba marcado como escaneado.`,
          severity: 'warning',
          ticketId,
          metadata: { mode: 'offline', state: 'escaneado' }
        });
        await pushHistory({
          ticketId,
          rawQr: raw,
          mode: 'offline',
          status: 'already_scanned',
          displaySummary: humanSummaryForHistory({
            outcomeKey: 'already_scanned',
            clienteNombre: display.clienteNombre,
            shortId: display.shortId,
            offlinePending: false
          }),
          scannedAt: new Date().toISOString()
        });
        return;
      }
      if (ticket.estadoTicket !== 'valido') {
        const oc = classifyOfflineOutcome('invalid_state');
        const display = normalizeTicketForScanDisplay(ticket, { mesaReservas: [], source: 'cache' });
        showOperationalResult({
          outcome: oc,
          display,
          subtitle: oc.subtitle,
          rawQr: raw,
          cacheNote: 'Datos tomados del cache local.'
        });
        runScannerFeedback('rejected');
        logScanAudit({
          eventType: 'ticket_scan_rechazado',
          title: 'Estado de ticket inválido',
          description: `No se pudo validar ticket ${display.shortId} por estado ${ticket.estadoTicket || 'desconocido'}.`,
          severity: 'warning',
          ticketId,
          metadata: { mode: 'offline', state: ticket.estadoTicket || null }
        });
        await pushHistory({
          ticketId,
          rawQr: raw,
          mode: 'offline',
          status: 'invalid_state',
          displaySummary: humanSummaryForHistory({
            outcomeKey: 'invalid_state',
            clienteNombre: display.clienteNombre,
            shortId: display.shortId,
            offlinePending: false
          }),
          scannedAt: new Date().toISOString()
        });
        return;
      }

      const now = new Date().toISOString();
      await markTicketScannedLocal(ticketId, { scannedAt: now });
      await addPendingScan({
        ticketId,
        scannedAt: now,
        scannedBy: access.userId || access.uid || '',
        deviceId,
        mode: 'offline',
        status: 'pending',
        rawQr: raw,
        resultSnapshot: { ticketEstado: ticket.estadoTicket }
      });

      const oc = classifyOfflineOutcome('offline_pending');
      const display = normalizeTicketForScanDisplay(
        { ...ticket, estadoTicket: 'escaneado', fechaEscaneo: now },
        { mesaReservas: [], source: 'cache' }
      );
      showOperationalResult({
        outcome: oc,
        display,
        subtitle: oc.subtitle,
        rawQr: raw,
        cacheNote: 'Datos tomados del cache local. Pendiente de sincronizar con el servidor.'
      });
      runScannerFeedback('offline_pending');
      logScanAudit({
        eventType: 'scanner_offline_pending_sync',
        title: 'Escaneo offline pendiente',
        description: `Ticket ${display.shortId} validado offline, pendiente de sincronizar.`,
        ticketId,
        metadata: { mode: 'offline', pendingSync: true }
      });
      await pushHistory({
        ticketId,
        rawQr: raw,
        mode: 'offline',
        status: 'accepted_pending_sync',
        displaySummary: humanSummaryForHistory({
          outcomeKey: 'offline_pending',
          clienteNombre: display.clienteNombre,
          shortId: display.shortId,
          offlinePending: true
        }),
        scannedAt: now
      });
    };

    const processRaw = async (rawInput) => {
      if (busy) return;
      const now = Date.now();
      if (rawInput === lastRaw && now - lastAt < 1800) return;
      lastRaw = rawInput;
      lastAt = now;
      busy = true;
      paintStripBusy('Validando…', 'Espera un momento.');
      try {
        const parsed = parseTicketQr(rawInput);
        if (!parsed.ticketId) {
          hideOverlay();
          paintStripBusy('QR inválido', 'No se encontró un ticket válido en el código.');
          runScannerFeedback('rejected');
          await pushHistory({
            ticketId: null,
            rawQr: parsed.raw,
            mode: navigator.onLine ? 'online' : 'offline',
            status: 'bad_qr',
            displaySummary: 'Código inválido — sin UUID de ticket',
            scannedAt: new Date().toISOString()
          });
          return;
        }
        if (navigator.onLine) await processOnline(parsed);
        else await processOffline(parsed);
        await renderPending();
        await renderHistory();
        await updateConn();
      } catch (error) {
        hideOverlay();
        paintStripBusy('Error', error?.message || 'No se pudo validar.');
      } finally {
        busy = false;
      }
    };

    const stopCamera = async () => {
      if (!scanner) return;
      try {
        if (scanner.isScanning) await scanner.stop();
        scanner.clear();
      } catch {}
      scanner = null;
      btnStart.disabled = false;
      btnStop.disabled = true;
      cameraChip.textContent = 'En espera';
    };

    const startCamera = async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        paintStripBusy('Cámara no disponible', 'Usa validación manual en este dispositivo.');
        return;
      }
      await stopCamera();
      btnStart.disabled = true;
      btnStop.disabled = false;
      cameraChip.textContent = 'Activa';
      scanner = new Html5Qrcode('qr-reader-root', { verbose: false });
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: { width: 220, height: 220 } },
          (decodedText) => processRaw(decodedText),
          () => {}
        );
      } catch {
        await stopCamera();
        paintStripBusy('Error de cámara', 'No se pudo abrir la cámara. Usa entrada manual.');
      }
    };

    const syncPending = async () => {
      const rows = await listPendingScans();
      const pending = rows.filter((row) => row.status === 'pending' || row.status === 'conflict');
      if (!pending.length) {
        paintStripBusy('Sin pendientes', 'No hay escaneos por sincronizar.');
        return;
      }
      paintStripBusy('Sincronizando', `Procesando ${pending.length} escaneos pendientes…`);
      for (const row of pending) {
        try {
          const res = await syncPendingTicketScan(row);
          if (res.data?.result === 'valid') await markPendingScanSynced(row.localId, res.data);
          else await markPendingScanConflict(row.localId, new Error(res.data?.reason || 'rejected'));
        } catch (error) {
          await markPendingScanConflict(row.localId, error);
        }
      }
      hideOverlay();
      paintStripIdle();
      await renderPending();
      await renderHistory();
      await updateConn();
    };

    const refreshCache = async () => {
      if (!navigator.onLine) {
        paintStripBusy('Offline', 'Conéctate a internet para actualizar cache del día.');
        return;
      }
      const date = new Date().toISOString().slice(0, 10);
      const res = await listTicketsForScannerCache({ date });
      const rows = res.data?.tickets || [];
      await cacheTicketsForDay(date, rows);
      await clearOldCache(5);
      paintStripBusy('Cache actualizado', `${rows.length} tickets guardados en el dispositivo.`);
    };

    const scanAnother = () => {
      inputManual.value = '';
      hideOverlay();
      paintStripIdle();
    };

    if (soundToggle) {
      soundToggle.checked = isScannerSoundEnabled();
      soundToggle.addEventListener('change', () => {
        setScannerSoundEnabled(Boolean(soundToggle.checked));
      });
    }

    btnStart?.addEventListener('click', async () => {
      await primeScannerAudioContext();
      void startCamera();
    });
    btnStop?.addEventListener('click', () => void stopCamera());
    btnManual?.addEventListener('click', async () => {
      await primeScannerAudioContext();
      void processRaw(inputManual.value);
    });
    inputManual?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') void processRaw(inputManual.value);
    });
    btnCache?.addEventListener('click', () => void refreshCache());
    btnSync?.addEventListener('click', () => void syncPending());
    btnScanAnotherFooter?.addEventListener('click', scanAnother);
    btnResultSyncPending?.addEventListener('click', () => void syncPending());

    window.addEventListener('online', () => void syncPending());
    window.addEventListener('online', () => void updateConn());
    window.addEventListener('offline', () => void updateConn());

    await renderPending();
    await renderHistory();
    await updateConn();
    await clearOldCache(5);

    window.__ticketScannerCleanup = () => {
      void stopCamera();
    };
  }
};

export default Escaner;
