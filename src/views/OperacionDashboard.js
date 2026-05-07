import { navigateTo } from '../router.js';
import { getCurrentUser } from '../lib/authProvider.js';
import { getUserAccess } from '../lib/accessControl.js';
import { getOperacionDashboardData, listRecentTickets } from '../lib/dataLayer.js';
import { formatFechaDia } from '../lib/fechaDiaMexico.js';
import { icon } from '../lib/icons.js';
import { listPendingScans, listRecentScans } from '../lib/offlineScannerStore.js';

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const OperacionDashboard = {
  render: () => `
    <div class="min-h-[calc(100vh-92px)] bg-slate-100 pb-24">
      <div class="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <header class="mb-6">
          <p class="text-xs font-black uppercase tracking-wider text-cyan-700">Operación</p>
          <h1 class="text-2xl font-black text-slate-900 sm:text-3xl">Panel operativo</h1>
          <p id="operacion-conn-line" class="mt-1 text-sm font-semibold text-slate-600">…</p>
        </header>

        <section class="mb-6 rounded-3xl border border-cyan-100 bg-gradient-to-br from-cyan-700 to-teal-800 p-5 text-white shadow-xl">
          <p class="text-xs font-black uppercase tracking-wide text-cyan-100">Escáner</p>
          <p id="operacion-offline-hint" class="mt-1 text-sm text-cyan-50"></p>
          <button type="button" id="operacion-btn-scan" class="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-5 text-lg font-black text-teal-900 shadow-lg transition hover:bg-cyan-50 active:scale-[0.99]">
            ${icon('scan', 'h-8 w-8')}
            Escanear ticket
          </button>
        </section>

        <section class="mb-6">
          <h2 class="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">Acciones rápidas</h2>
          <div id="operacion-quick-actions" class="grid grid-cols-2 gap-3 sm:grid-cols-3"></div>
        </section>

        <section class="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 class="text-sm font-black uppercase tracking-wide text-slate-500">Estado hoy</h2>
          <div id="operacion-status-grid" class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3"></div>
        </section>

        <section class="mb-6 rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
          <h2 class="text-sm font-black uppercase tracking-wide text-amber-900">Alertas</h2>
          <ul id="operacion-alerts" class="mt-2 space-y-2 text-sm font-semibold text-amber-950"></ul>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-sm font-black uppercase tracking-wide text-slate-500">Tickets recientes</h2>
            <button type="button" id="operacion-refresh" class="rounded-full border border-slate-200 px-3 py-1 text-xs font-black text-slate-700 hover:bg-slate-50">Actualizar</button>
          </div>
          <div id="operacion-recent-tickets" class="mt-3 space-y-2 text-sm"></div>
        </section>
      </div>

      <nav class="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden" aria-label="Acceso rápido operación">
        <div class="mx-auto flex max-w-lg items-center justify-between gap-2">
          <a href="/home" data-link class="flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[0.65rem] font-black text-slate-600">
            ${icon('home', 'h-5 w-5')} Inicio
          </a>
          <button type="button" id="operacion-mobile-scan" class="flex flex-[1.4] flex-col items-center gap-1 rounded-2xl bg-teal-700 py-3 text-[0.7rem] font-black text-white shadow-md">
            ${icon('scan', 'h-7 w-7')} Escanear
          </button>
          <a href="/admin/dashboard" data-link id="operacion-nav-gestion" class="flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[0.65rem] font-black text-slate-600">
            ${icon('briefcase', 'h-5 w-5')} Gestión
          </a>
        </div>
      </nav>
    </div>
  `,

  mount: async () => {
    const access = await getUserAccess(getCurrentUser());
    const connLine = document.getElementById('operacion-conn-line');
    const offlineHint = document.getElementById('operacion-offline-hint');
    const quickWrap = document.getElementById('operacion-quick-actions');
    const statusGrid = document.getElementById('operacion-status-grid');
    const alertsUl = document.getElementById('operacion-alerts');
    const recentWrap = document.getElementById('operacion-recent-tickets');
    const btnScan = document.getElementById('operacion-btn-scan');
    const btnMobileScan = document.getElementById('operacion-mobile-scan');
    const btnRefresh = document.getElementById('operacion-refresh');

    const goScan = () => navigateTo('/escaner');

    const renderQuickActions = () => {
      if (!quickWrap) return;
      const actions = [];
      if (access.can('tickets.scan')) {
        actions.push({
          id: 'scan',
          label: 'Escanear',
          icon: 'scan',
          tone: 'bg-teal-700 text-white',
          onClick: goScan
        });
      }
      actions.push({
        id: 'sync',
        label: 'Sincronizar',
        icon: 'waves',
        tone: 'bg-slate-800 text-white',
        onClick: () => navigateTo('/escaner'),
        subtitle: 'En escáner'
      });
      if (access.can('parking.manage') || access.can('admin.panel')) {
        actions.push({
          id: 'parking',
          label: 'Parking',
          icon: 'parking',
          tone: 'bg-emerald-600 text-white',
          onClick: () => navigateTo('/admin/dashboard?section=parking')
        });
      }
      if (access.can('sales.physical')) {
        actions.push({
          id: 'sales',
          label: 'Venta física',
          icon: 'package',
          tone: 'bg-amber-600 text-white',
          onClick: () => navigateTo('/admin/dashboard?section=inventario')
        });
      }
      actions.push({
        id: 'recent',
        label: 'Ver recientes',
        icon: 'ticket',
        tone: 'bg-white text-slate-800 ring-1 ring-slate-200',
        onClick: () => navigateTo('/admin/dashboard')
      });

      quickWrap.innerHTML = actions
        .map(
          (a, i) => `
        <button type="button" class="operacion-quick-btn flex flex-col items-start gap-1 rounded-2xl px-4 py-4 text-left shadow-sm transition active:scale-[0.99] ${a.tone}" data-op-quick="${i}">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-black/10">${icon(a.icon, 'h-5 w-5')}</span>
          <span class="text-sm font-black">${escapeHtml(a.label)}</span>
          ${a.subtitle ? `<span class="text-[10px] font-bold opacity-80">${escapeHtml(a.subtitle)}</span>` : ''}
        </button>`
        )
        .join('');

      quickWrap.querySelectorAll('.operacion-quick-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-op-quick'));
          actions[idx]?.onClick?.();
        });
      });
    };

    const paintAlerts = async (bundle, pendingLen, conflictLen, recentLocal) => {
      if (!alertsUl) return;
      const items = [];
      if (pendingLen > 0) {
        items.push(`${pendingLen} escaneo(s) pendientes de sincronizar.`);
      }
      if (conflictLen > 0) {
        items.push(`${conflictLen} conflicto(s) offline — revisa desde el escáner.`);
      }
      const pk = bundle?.parking;
      if (pk?.ok && pk.total > 0 && pk.libres === 0) {
        items.push('Estacionamiento sin cajones libres.');
      }
      const mesas = bundle?.mesas;
      if (mesas?.ok && mesas.pagadasPendientes > 3) {
        items.push(`${mesas.pagadasPendientes} reservas de mesa con pago pendiente hoy.`);
      }
      const nextLocal = (recentLocal || []).find(
        (r) => r.status === 'accepted_pending_sync' || r.status === 'pending'
      );
      if (nextLocal && pendingLen === 0 && conflictLen === 0) {
        items.push('Último flujo offline registrado en este dispositivo.');
      }
      if (!items.length) {
        items.push('Sin alertas operativas.');
      }
      alertsUl.innerHTML = items.map((t) => `<li class="rounded-xl bg-white/70 px-3 py-2">${escapeHtml(t)}</li>`).join('');
    };

    const paintStatus = async () => {
      const bundle = await getOperacionDashboardData();
      let pending = [];
      let recentLocal = [];
      try {
        pending = await listPendingScans();
      } catch {
        pending = [];
      }
      try {
        recentLocal = await listRecentScans(12);
      } catch {
        recentLocal = [];
      }

      const pendingLen = pending.filter((p) => p.status === 'pending').length;
      const conflictLen = pending.filter((p) => p.status === 'conflict').length;

      if (connLine) {
        connLine.textContent = `${navigator.onLine ? 'En línea' : 'Sin conexión'} · Pendientes offline: ${pendingLen}`;
      }
      if (offlineHint) {
        offlineHint.textContent = navigator.onLine
          ? 'Con conexión estable el escaneo valida en servidor al instante.'
          : 'Sin red: el escáner usará caché local y cola de sincronización.';
      }

      const sales = bundle.sales;
      const tix = bundle.tickets;
      const mesas = bundle.mesas;
      const pk = bundle.parking;
      const sc = bundle.scanner;

      const cards = [
        {
          label: 'Ventas pagadas (MX)',
          value: sales?.ok ? `$${Number(sales.totalPaid || 0).toFixed(2)}` : '—',
          sub: sales?.ok ? `${sales.paidCount} pagos` : 'Sin datos'
        },
        {
          label: 'Tickets vendidos hoy',
          value: tix?.ok ? String(tix.soldToday ?? 0) : '—',
          sub: formatFechaDia()
        },
        {
          label: 'Escaneados hoy',
          value: tix?.ok ? String(tix.scannedToday ?? 0) : '—',
          sub: sc?.lastScanAt
            ? `Último ${new Date(sc.lastScanAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Sin registros'
        },
        {
          label: 'Mesas hoy',
          value: mesas?.ok ? String(mesas.total ?? 0) : '—',
          sub: mesas?.ok ? `${mesas.apartadas} apartadas` : 'Sin datos'
        },
        {
          label: 'Parking libres',
          value: pk?.ok ? String(pk.libres ?? 0) : '—',
          sub: pk?.ok ? `${pk.ocupados} ocup.` : ''
        },
        {
          label: 'Escaneos servidor hoy',
          value: sc?.ok ? String(sc.scansToday ?? 0) : '—',
          sub: 'ticket_scans'
        }
      ];

      if (statusGrid) {
        statusGrid.innerHTML = cards
          .map(
            (c) => `
          <div class="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <p class="text-[10px] font-black uppercase tracking-wide text-slate-500">${escapeHtml(c.label)}</p>
            <p class="mt-1 text-xl font-black text-slate-900">${escapeHtml(c.value)}</p>
            <p class="text-[11px] font-semibold text-slate-500">${escapeHtml(c.sub || '')}</p>
          </div>`
          )
          .join('');
      }

      await paintAlerts(bundle, pendingLen, conflictLen, recentLocal);
    };

    const paintRecentTickets = async () => {
      if (!recentWrap) return;
      recentWrap.innerHTML = `<p class="text-slate-500">Cargando…</p>`;
      try {
        const res = await listRecentTickets();
        const rows = res.data?.tickets || [];
        if (!rows.length) {
          recentWrap.innerHTML = '<p class="text-slate-500">Sin tickets recientes visibles.</p>';
          return;
        }
        recentWrap.innerHTML = rows
          .slice(0, 8)
          .map((t) => {
            const st = escapeHtml(t.estadoTicket || '');
            const pay = escapeHtml(t.estadoPago || '');
            return `
            <div class="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <div class="min-w-0">
                <p class="truncate font-mono text-xs font-bold text-slate-800">#${escapeHtml(String(t.id).slice(0, 8))}</p>
                <p class="truncate text-xs text-slate-600">${escapeHtml(t.clienteNombre || '')}</p>
              </div>
              <div class="text-right text-[10px] font-black uppercase">
                <span class="rounded-full bg-white px-2 py-0.5">${st}</span>
                <span class="mt-1 block rounded-full bg-cyan-50 px-2 py-0.5 text-cyan-800">${pay}</span>
              </div>
            </div>`;
          })
          .join('');
      } catch {
        recentWrap.innerHTML = '<p class="text-rose-600 text-xs">No se pudieron cargar tickets (RLS o red).</p>';
      }
    };

    renderQuickActions();
    if (!access.can('tickets.scan')) {
      if (btnScan) {
        btnScan.disabled = true;
        btnScan.classList.add('opacity-60');
        btnScan.innerHTML = `${icon('scan', 'h-8 w-8')} Sin permiso de escaneo`;
      }
      btnMobileScan?.classList.add('hidden');
    } else {
      btnScan?.addEventListener('click', goScan);
      btnMobileScan?.addEventListener('click', goScan);
    }

    const gestiónLink = document.getElementById('operacion-nav-gestion');
    if (!access.can('dashboard.manage') && gestiónLink) gestiónLink.classList.add('hidden');

    await paintStatus();
    await paintRecentTickets();

    btnRefresh?.addEventListener('click', async () => {
      await paintStatus();
      await paintRecentTickets();
    });

    window.addEventListener('online', () => void paintStatus());
    window.addEventListener('offline', () => void paintStatus());
  }
};

export default OperacionDashboard;
