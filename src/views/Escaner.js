import { Html5Qrcode } from 'html5-qrcode';
import {
  listTicketsForScannerCache,
  scanTicketOnline,
  syncPendingTicketScan
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

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

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

function playTone(ok = true) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = ok ? 920 : 280;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (ok ? 0.14 : 0.24));
    osc.start(now);
    osc.stop(now + (ok ? 0.16 : 0.26));
  } catch {}
}

const Escaner = {
  render: () => `
    <section class="min-h-full bg-slate-100 p-3 sm:p-4">
      <div class="mx-auto max-w-3xl space-y-3">
        <header class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h1 class="text-xl font-black text-slate-900">Escáner operativo</h1>
          <p class="mt-1 text-sm text-slate-600">Validación online/offline para personal con permiso tickets.scan.</p>
          <div id="scanner-connection-state" class="mt-2 text-xs font-bold text-slate-500" aria-live="polite"></div>
        </header>

        <section class="overflow-hidden rounded-2xl bg-slate-950 shadow-lg">
          <div class="relative aspect-[4/5] min-h-[320px]">
            <div id="qr-reader-root" class="absolute inset-0"></div>
            <div class="pointer-events-none absolute inset-x-6 top-6 bottom-6 rounded-3xl border-4 border-cyan-300/80"></div>
            <div class="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-cyan-100">${icon('scan', 'inline h-4 w-4 mr-1')} Cámara</div>
            <div id="camera-chip" class="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-slate-100">En espera</div>
          </div>
          <div class="grid grid-cols-1 gap-2 border-t border-white/10 p-3 sm:grid-cols-2">
            <button id="btn-start-camera" class="rounded-xl bg-cyan-400 px-3 py-3 text-sm font-black text-slate-900">Iniciar cámara</button>
            <button id="btn-stop-camera" class="rounded-xl border border-white/20 px-3 py-3 text-sm font-bold text-white" disabled>Detener cámara</button>
          </div>
        </section>

        <section id="scanner-result-box" class="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm" aria-live="polite">
          <p id="scanner-result-title" class="font-black text-slate-900">Listo para escanear</p>
          <p id="scanner-result-message" class="mt-1 text-slate-600">Escanea un QR o pega un código manual.</p>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-black uppercase text-slate-500">Entrada manual</p>
          <div class="mt-2 flex gap-2">
            <input id="scanner-manual-input" class="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="UUID, URL o ticket:..." />
            <button id="scanner-manual-btn" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Validar</button>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <button id="scanner-cache-btn" class="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold">Actualizar cache hoy</button>
            <button id="scanner-sync-btn" class="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold">Sincronizar ahora</button>
            <button id="scanner-another-btn" class="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold">Escanear otro</button>
          </div>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 class="text-sm font-black text-slate-900">Pendientes offline</h2>
          <div id="scanner-pending-list" class="mt-2 text-xs text-slate-600"></div>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 class="text-sm font-black text-slate-900">Historial reciente</h2>
          <div id="scanner-history-list" class="mt-2 text-xs text-slate-600"></div>
        </section>
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
    const btnAnother = document.getElementById('scanner-another-btn');
    const inputManual = document.getElementById('scanner-manual-input');
    const cameraChip = document.getElementById('camera-chip');
    const connState = document.getElementById('scanner-connection-state');
    const resultBox = document.getElementById('scanner-result-box');
    const resultTitle = document.getElementById('scanner-result-title');
    const resultMessage = document.getElementById('scanner-result-message');
    const pendingList = document.getElementById('scanner-pending-list');
    const historyList = document.getElementById('scanner-history-list');

    let scanner = null;
    let lastRaw = '';
    let lastAt = 0;
    let busy = false;
    const deviceId = getScannerDeviceId();

    const paintResult = (variant, title, message) => {
      const styles = {
        ok: 'rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm shadow-sm',
        bad: 'rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm shadow-sm',
        warn: 'rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm shadow-sm',
        pending: 'rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm shadow-sm',
        idle: 'rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm'
      };
      resultBox.className = styles[variant] || styles.idle;
      resultTitle.textContent = title;
      resultMessage.textContent = message;
    };

    const updateConn = async () => {
      const pending = await listPendingScans();
      connState.textContent = `${navigator.onLine ? 'Online' : 'Offline'} · Pendientes: ${pending.filter((p) => p.status === 'pending').length}`;
    };

    const renderPending = async () => {
      const rows = await listPendingScans();
      if (!rows.length) {
        pendingList.innerHTML = '<p class="text-emerald-700">Todo sincronizado.</p>';
        return;
      }
      pendingList.innerHTML = rows
        .slice(0, 10)
        .map((row) => `<p class="mb-1 rounded-lg bg-slate-100 px-2 py-1">#${String(row.ticketId || '').slice(0, 8)} · ${row.status} · ${new Date(row.scannedAt).toLocaleTimeString()}</p>`)
        .join('');
    };

    const renderHistory = async () => {
      const rows = await listRecentScans(12);
      if (!rows.length) {
        historyList.innerHTML = '<p class="text-slate-500">Sin escaneos recientes.</p>';
        return;
      }
      historyList.innerHTML = rows
        .map((row) => `<p class="mb-1 rounded-lg bg-slate-100 px-2 py-1">${row.mode.toUpperCase()} · ${row.status} · ${String(row.ticketId || '').slice(0, 8)}</p>`)
        .join('');
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
      if (result === 'valid') {
        paintResult('ok', 'Entrada aceptada', 'Ticket válido y marcado como escaneado en Supabase.');
        playTone(true);
        if (navigator.vibrate) navigator.vibrate(55);
        await addRecentScan({ ticketId, rawQr: raw, mode: 'online', status: 'accepted', message: 'valid' });
      } else {
        paintResult('bad', 'Entrada rechazada', `No válido: ${reason || 'invalid'}.`);
        playTone(false);
        if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
        await addRecentScan({ ticketId, rawQr: raw, mode: 'online', status: 'rejected', message: reason || 'invalid' });
      }
    };

    const processOffline = async ({ ticketId, raw }) => {
      const ticket = await getCachedTicket(ticketId);
      if (!ticket) {
        paintResult('warn', 'No validable offline', 'No se puede validar offline: ticket no descargado en este dispositivo.');
        playTone(false);
        await addRecentScan({ ticketId, rawQr: raw, mode: 'offline', status: 'not_cached' });
        return;
      }
      if (ticket.estadoTicket === 'cancelado') {
        paintResult('bad', 'Ticket cancelado', 'Ticket cancelado en cache local.');
        playTone(false);
        await addRecentScan({ ticketId, rawQr: raw, mode: 'offline', status: 'cancelled' });
        return;
      }
      if (ticket.estadoTicket === 'escaneado') {
        paintResult('bad', 'Duplicado offline', 'Este ticket ya fue marcado como escaneado en este dispositivo.');
        playTone(false);
        await addRecentScan({ ticketId, rawQr: raw, mode: 'offline', status: 'already_scanned' });
        return;
      }
      if (ticket.estadoTicket !== 'valido') {
        paintResult('bad', 'Estado no válido', `Estado local no válido: ${ticket.estadoTicket || 'desconocido'}`);
        playTone(false);
        await addRecentScan({ ticketId, rawQr: raw, mode: 'offline', status: 'invalid_state' });
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
      await addRecentScan({ ticketId, rawQr: raw, mode: 'offline', status: 'accepted_pending_sync' });
      paintResult('pending', 'Aceptado offline', 'Entrada aceptada offline — pendiente de sincronizar.');
      playTone(true);
      if (navigator.vibrate) navigator.vibrate(35);
    };

    const processRaw = async (rawInput) => {
      if (busy) return;
      const now = Date.now();
      if (rawInput === lastRaw && now - lastAt < 1800) return;
      lastRaw = rawInput;
      lastAt = now;
      busy = true;
      try {
        const parsed = parseTicketQr(rawInput);
        if (!parsed.ticketId) {
          paintResult('bad', 'QR inválido', 'No se encontró ticket id válido en el código.');
          playTone(false);
          return;
        }
        if (navigator.onLine) await processOnline(parsed);
        else await processOffline(parsed);
        await renderPending();
        await renderHistory();
        await updateConn();
      } catch (error) {
        paintResult('warn', 'Error de validación', error?.message || 'No se pudo validar.');
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
        paintResult('warn', 'Cámara no disponible', 'Usa validación manual en este dispositivo.');
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
        paintResult('warn', 'Error de cámara', 'No se pudo abrir la cámara. Usa entrada manual.');
      }
    };

    const syncPending = async () => {
      const rows = await listPendingScans();
      const pending = rows.filter((row) => row.status === 'pending' || row.status === 'conflict');
      if (!pending.length) {
        paintResult('idle', 'Sin pendientes', 'No hay escaneos por sincronizar.');
        return;
      }
      paintResult('warn', 'Sincronizando', `Procesando ${pending.length} escaneos pendientes...`);
      for (const row of pending) {
        try {
          const res = await syncPendingTicketScan(row);
          if (res.data?.result === 'valid') await markPendingScanSynced(row.localId, res.data);
          else await markPendingScanConflict(row.localId, new Error(res.data?.reason || 'rejected'));
        } catch (error) {
          await markPendingScanConflict(row.localId, error);
        }
      }
      paintResult('idle', 'Sincronización terminada', 'Revisa pendientes y conflictos.');
      await renderPending();
      await renderHistory();
      await updateConn();
    };

    const refreshCache = async () => {
      if (!navigator.onLine) {
        paintResult('warn', 'Offline', 'Conéctate a internet para actualizar cache del día.');
        return;
      }
      const date = new Date().toISOString().slice(0, 10);
      const res = await listTicketsForScannerCache({ date });
      const rows = res.data?.tickets || [];
      await cacheTicketsForDay(date, rows);
      await clearOldCache(5);
      paintResult('ok', 'Cache actualizado', `Cache actualizado: ${rows.length} tickets.`);
    };

    btnStart?.addEventListener('click', () => void startCamera());
    btnStop?.addEventListener('click', () => void stopCamera());
    btnManual?.addEventListener('click', () => void processRaw(inputManual.value));
    inputManual?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') void processRaw(inputManual.value);
    });
    btnCache?.addEventListener('click', () => void refreshCache());
    btnSync?.addEventListener('click', () => void syncPending());
    btnAnother?.addEventListener('click', () => {
      inputManual.value = '';
      paintResult('idle', 'Listo para escanear', 'Escanea un QR o pega un código manual.');
    });

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
