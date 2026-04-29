import { auth } from '../firebase-config.js';
import {
  listRecentTickets,
  createPaquete,
  listProductosAdmin,
  listMovimientosInventario,
  createProducto,
  updateProducto,
  updateProductoStock,
  createMovimientoInventario,
  getLandingPage,
  listServiciosAdmin,
  upsertLandingPage,
  createServicio,
  updateServicio
} from '../dataconnect-generated';
import { createDistribucionEditor, DEFAULT_MAPA_JSON } from '../lib/distribucionMapa.js';
import { getUserAccess } from '../lib/accessControl.js';
import { icon } from '../lib/icons.js';
import { showAlert } from '../lib/appDialog.js';

const LANDING_PAGE_ID = 'main';

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const defaultLandingForm = () => ({
  descripcionParque:
    'Describe aqui tu parque: instalaciones, reglas breves y ambiente. Este texto se muestra en /home.',
  mapaDistribucionJson: DEFAULT_MAPA_JSON,
  imagenSatelitalUrl: '',
  googleMapsUrl: '',
  horariosTexto: 'Ejemplo: Lunes a domingo 9:00 - 18:00',
  abiertoAhora: true,
  ocupacionTexto: 'Ejemplo: Ocupacion moderada hoy.',
  estacionamientoTexto: 'Ejemplo: Hay lugares en zona general.',
  botonesJson: '[]'
});

function parseBotones(jsonStr) {
  try {
    const arr = JSON.parse(jsonStr || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function mergeLandingRow(row) {
  const d = defaultLandingForm();
  if (!row) return d;
  return {
    descripcionParque: row.descripcionParque ?? d.descripcionParque,
    mapaDistribucionJson: row.mapaDistribucionJson || d.mapaDistribucionJson,
    imagenSatelitalUrl: row.imagenSatelitalUrl ?? '',
    googleMapsUrl: row.googleMapsUrl ?? '',
    horariosTexto: row.horariosTexto ?? d.horariosTexto,
    abiertoAhora: Boolean(row.abiertoAhora),
    ocupacionTexto: row.ocupacionTexto ?? d.ocupacionTexto,
    estacionamientoTexto: row.estacionamientoTexto ?? d.estacionamientoTexto,
    botonesJson: row.botonesJson != null && row.botonesJson !== '' ? row.botonesJson : d.botonesJson
  };
}

function renderBotonRows(botones) {
  return botones
    .map((btn, idx) => {
      const type = btn.type || 'custom';
      const label = btn.label ?? '';
      const value = btn.value ?? '';
      const href = btn.href ?? '';
      const external = btn.external ? 'checked' : '';
      return `
      <div data-botom-fila="${idx}" class="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-12 sm:items-end">
        <label class="sm:col-span-3 text-xs font-semibold text-slate-600">Tipo
          <select data-boton-type class="mt-1 w-full rounded border p-2 text-sm">
            <option value="whatsapp" ${type === 'whatsapp' ? 'selected' : ''}>WhatsApp</option>
            <option value="mail" ${type === 'mail' ? 'selected' : ''}>Correo</option>
            <option value="custom" ${type === 'custom' ? 'selected' : ''}>Personalizado</option>
          </select>
        </label>
        <label class="sm:col-span-3 text-xs font-semibold text-slate-600">Texto del boton
          <input data-boton-label type="text" value="${String(label).replace(/"/g, '&quot;')}" class="mt-1 w-full rounded border p-2 text-sm" placeholder="Ej. WhatsApp" />
        </label>
        <label class="sm:col-span-3 text-xs font-semibold text-slate-600">Telefono / correo (WhatsApp y Mail)
          <input data-boton-value type="text" value="${String(value).replace(/"/g, '&quot;')}" class="mt-1 w-full rounded border p-2 text-sm" placeholder="+52..." />
        </label>
        <label class="sm:col-span-2 text-xs font-semibold text-slate-600">Ruta o URL (solo personalizado)
          <input data-boton-href type="text" value="${String(href).replace(/"/g, '&quot;')}" class="mt-1 w-full rounded border p-2 text-sm" placeholder="/reservar o https://..." />
        </label>
        <label class="sm:col-span-1 flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input data-boton-external type="checkbox" ${external} /> Externo
        </label>
        <div class="sm:col-span-12 flex justify-end">
          <button type="button" data-boton-remove class="text-sm text-rose-600 hover:underline">Quitar</button>
        </div>
      </div>`;
    })
    .join('');
}

function collectBotonesFromDom() {
  const filas = document.querySelectorAll('[data-botom-fila]');
  const out = [];
  filas.forEach((fila) => {
    const type = fila.querySelector('[data-boton-type]')?.value || 'custom';
    const label = fila.querySelector('[data-boton-label]')?.value?.trim() || 'Enlace';
    const value = fila.querySelector('[data-boton-value]')?.value?.trim() || '';
    const href = fila.querySelector('[data-boton-href]')?.value?.trim() || '';
    const external = fila.querySelector('[data-boton-external]')?.checked || false;
    if (type === 'custom') {
      out.push({ type: 'custom', label, href: href || '/', external });
    } else {
      out.push({ type, label, value });
    }
  });
  return out;
}

const AdminDashboard = {
  render: async () => {
    const access = await getUserAccess(auth.currentUser);
    const canPackages = access.can('packages.manage');
    const canLanding = access.can('landing.manage');
    const canScan = access.can('tickets.scan');
    const canAdminPanel = access.can('admin.panel');
    const canInventoryView = access.can('inventory.manage') || access.can('inventory.adjust') || access.can('sales.physical');
    const avatar = access.photoURL
      ? `<img src="${escapeHtml(access.photoURL)}" alt="${escapeHtml(access.name)}" class="h-10 w-10 rounded-full object-cover" referrerpolicy="no-referrer" />`
      : `<span class="app-avatar-initials h-10 w-10">${escapeHtml(access.name.slice(0, 1).toUpperCase())}</span>`;
    return `
        <div class="admin-shell">
            <aside id="admin-sidebar" class="admin-sidebar">
                <div class="admin-sidebar-head">
                    <div class="min-w-0">
                        <p class="admin-kicker">Panel</p>
                        <h2 class="admin-title">Gestion</h2>
                    </div>
                    <button type="button" id="admin-sidebar-collapse" class="sidebar-icon-button" title="Contraer menu" aria-label="Contraer menu">
                        ${icon('collapse', 'h-5 w-5')}
                    </button>
                </div>
                <nav class="admin-sidebar-nav" aria-label="Panel de gestion">
                    <button type="button" data-admin-section="tickets" class="admin-sidebar-item is-active" title="Gestion">
                        ${icon('ticket', 'h-5 w-5')}
                        <span class="admin-sidebar-label">Gestion</span>
                    </button>
                    ${canInventoryView ? `<button type="button" data-admin-section="inventario" class="admin-sidebar-item" title="Inventario y ventas">${icon('package', 'h-5 w-5')}<span class="admin-sidebar-label">Inventario / Ventas</span></button>` : ''}
                    ${canScan ? `<a href="/escaner" data-link class="admin-sidebar-item" title="Escaner">${icon('scan', 'h-5 w-5')}<span class="admin-sidebar-label">Escaner</span></a>` : ''}
                    ${canAdminPanel ? `<button type="button" data-admin-section="admin" class="admin-sidebar-item" title="Panel administracion">${icon('dashboard', 'h-5 w-5')}<span class="admin-sidebar-label">Panel administracion</span></button>` : ''}
                    ${canLanding ? `<button type="button" data-admin-section="sitio" class="admin-sidebar-item" title="Sitio / Landing">${icon('palette', 'h-5 w-5')}<span class="admin-sidebar-label">Sitio / Landing</span></button>` : ''}
                    ${access.isProgramador ? `<a href="/programador/theme" data-link class="admin-sidebar-item" title="Programador">${icon('code', 'h-5 w-5')}<span class="admin-sidebar-label">Programador</span></a>` : ''}
                </nav>
                <div class="admin-sidebar-footer">
                    ${avatar}
                    <div class="admin-sidebar-user">
                        <p class="truncate text-sm font-bold">${escapeHtml(access.name)}</p>
                        <p class="truncate text-xs text-slate-400">${escapeHtml(access.roleLabel)}</p>
                    </div>
                </div>
            </aside>

            <div class="flex-grow overflow-y-auto p-6 sm:p-8">
                <div id="admin-panel-tickets">
                <h1 class="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
                <p id="admin-rol-hint" class="mb-6 text-sm text-slate-500"></p>

                <div id="admin-stats-wrap" class="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2">
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <p class="text-gray-500 text-sm font-bold uppercase">Tickets recientes (muestra)</p>
                        <p class="text-3xl font-black text-slate-800" id="stat-scanned">--</p>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <p class="text-gray-500 text-sm font-bold uppercase">Ingresos de hoy (aprox.)</p>
                        <p class="text-3xl font-black text-green-600" id="stat-income">--</p>
                    </div>
                </div>

                ${canPackages ? `<div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8 p-6">
                    <h2 class="font-bold text-lg mb-4">Crear paquete especial</h2>
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <input type="text" id="pkg-name" placeholder="Nombre" class="border p-2 rounded">
                        <input type="number" id="pkg-price" placeholder="Precio base" class="border p-2 rounded">
                        <input type="number" id="pkg-capacity" placeholder="Personas incluidas" class="border p-2 rounded">
                        <input type="text" id="pkg-desc" placeholder="Descripcion" class="border p-2 rounded">
                    </div>
                    <button id="btn-create-pkg" class="mt-4 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">Guardar paquete</button>
                </div>` : ''}

                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="p-6 border-b border-gray-200 flex justify-between items-center">
                        <h2 class="font-bold text-lg">Ultimos tickets</h2>
                        <button type="button" id="btn-refresh" class="text-blue-600 hover:underline text-sm font-semibold">Actualizar</button>
                    </div>
                    <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse min-w-[640px]">
                        <thead>
                            <tr class="bg-gray-50 text-gray-500 text-sm">
                                <th class="p-4 border-b">ID</th>
                                <th class="p-4 border-b">Cliente</th>
                                <th class="p-4 border-b">Total</th>
                                <th class="p-4 border-b">Pago</th>
                                <th class="p-4 border-b">Ticket</th>
                            </tr>
                        </thead>
                        <tbody id="tickets-table-body">
                            <tr><td colspan="5" class="p-4 text-center text-gray-500">Cargando...</td></tr>
                        </tbody>
                    </table>
                    </div>
                </div>
                </div>

                ${canInventoryView ? `<div id="admin-panel-inventario" class="hidden space-y-6">
                  <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 class="text-2xl font-black text-slate-900">Inventario y ventas físicas</h2>
                    <p class="mt-1 text-sm text-slate-600">Control de stock, reservados aproximados y ventas en caja.</p>
                  </div>
                  ${access.can('inventory.manage') ? `
                  <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 class="font-bold text-lg mb-4">Crear producto</h3>
                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input id="prod-title" class="rounded border p-2" placeholder="Titulo" />
                      <input id="prod-price" type="number" step="0.01" class="rounded border p-2" placeholder="Precio" />
                      <input id="prod-image" class="rounded border p-2 sm:col-span-2" placeholder="URL imagen" />
                      <textarea id="prod-desc" rows="2" class="rounded border p-2 sm:col-span-2" placeholder="Descripcion"></textarea>
                      <input id="prod-stock" type="number" class="rounded border p-2" placeholder="Stock inicial" />
                      <button id="btn-create-producto" class="rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700">Guardar producto</button>
                    </div>
                  </div>` : ''}
                  <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div class="mb-4 flex items-center justify-between">
                      <h3 class="font-bold text-lg">Productos</h3>
                      <button type="button" id="btn-refresh-inventory" class="text-sm font-semibold text-blue-600 hover:underline">Actualizar</button>
                    </div>
                    <div id="inventario-productos" class="space-y-3"></div>
                  </div>
                  <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 class="font-bold text-lg mb-3">Movimientos recientes</h3>
                    <div id="inventario-movimientos" class="space-y-2 text-sm text-slate-600">Selecciona un producto para ver historial.</div>
                  </div>
                </div>` : ''}

                ${canAdminPanel ? `<div id="admin-panel-admin" class="hidden space-y-8">
                    <div class="admin-hero-panel">
                        <div>
                            <p class="admin-kicker">Administracion</p>
                            <h1 class="text-3xl font-black text-slate-900">Panel del admin</h1>
                            <p class="mt-2 max-w-2xl text-sm text-slate-600">Centro rapido para supervisar operacion, contenido, paquetes y accesos del balneario.</p>
                        </div>
                        <div class="admin-watermark">${icon('waves', 'h-12 w-12')}</div>
                    </div>
                    <div class="admin-resource-grid">
                        <button type="button" class="admin-resource-card" data-admin-section="tickets">
                            ${icon('ticket', 'h-6 w-6')}
                            <span>Monitor de tickets</span>
                            <small>Entradas recientes, pagos y escaneos.</small>
                        </button>
                        ${canPackages ? `<button type="button" class="admin-resource-card" data-admin-section="tickets">
                            ${icon('package', 'h-6 w-6')}
                            <span>Paquetes</span>
                            <small>Altas rapidas de promociones y accesos.</small>
                        </button>` : ''}
                        ${canInventoryView ? `<button type="button" class="admin-resource-card" data-admin-section="inventario">
                            ${icon('package', 'h-6 w-6')}
                            <span>Inventario</span>
                            <small>Productos, reservados aprox y ventas físicas.</small>
                        </button>` : ''}
                        ${canLanding ? `<button type="button" class="admin-resource-card" data-admin-section="sitio">
                            ${icon('map', 'h-6 w-6')}
                            <span>Landing y mapa</span>
                            <small>Horarios, servicios, vista aerea y zonas.</small>
                        </button>` : ''}
                        ${canScan ? `<a href="/escaner" data-link class="admin-resource-card">
                            ${icon('scan', 'h-6 w-6')}
                            <span>Escaner</span>
                            <small>Validacion de tickets en entrada.</small>
                        </a>` : ''}
                    </div>
                    <div class="admin-resource-grid">
                        <article class="admin-mini-stat">
                            <p>Rol activo</p>
                            <strong>${escapeHtml(access.roleLabel)}</strong>
                        </article>
                        <article class="admin-mini-stat">
                            <p>Permisos</p>
                            <strong>${access.permissions.length}</strong>
                        </article>
                        <article class="admin-mini-stat">
                            <p>Area</p>
                            <strong>Balneario</strong>
                        </article>
                    </div>
                </div>` : ''}

                ${canLanding ? `<div id="admin-panel-sitio" class="hidden space-y-8">
                    <h1 class="text-3xl font-bold text-gray-800">Contenido del sitio (/home)</h1>
                    <p class="text-sm text-slate-600">Textos, horarios, estado, mapa tipo lienzo, vista aerea, Google Maps y botones de contacto. Guarda al final.</p>

                    <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
                        <h2 class="font-bold text-lg">Descripcion del parque</h2>
                        <textarea id="lp-descripcion" rows="6" class="w-full rounded border p-3 text-sm"></textarea>
                    </div>

                    <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
                        <h2 class="font-bold text-lg">Horarios y estado (manual)</h2>
                        <label class="block text-xs font-semibold text-slate-600">Horarios (texto libre)
                          <textarea id="lp-horarios" rows="3" class="mt-1 w-full rounded border p-2 text-sm"></textarea>
                        </label>
                        <label class="flex items-center gap-2 text-sm font-medium">
                          <input type="checkbox" id="lp-abierto" class="h-4 w-4 rounded border-gray-300" />
                          Abierto ahora
                        </label>
                        <label class="block text-xs font-semibold text-slate-600">Ocupacion
                          <textarea id="lp-ocupacion" rows="2" class="mt-1 w-full rounded border p-2 text-sm"></textarea>
                        </label>
                        <label class="block text-xs font-semibold text-slate-600">Estacionamiento
                          <textarea id="lp-estacionamiento" rows="2" class="mt-1 w-full rounded border p-2 text-sm"></textarea>
                        </label>
                    </div>

                    <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
                        <h2 class="font-bold text-lg">Vista aerea y Google Maps</h2>
                        <label class="block text-xs font-semibold text-slate-600">URL de imagen (satelital o drone)
                          <input type="url" id="lp-satelite" class="mt-1 w-full rounded border p-2 text-sm" placeholder="https://..." />
                        </label>
                        <label class="block text-xs font-semibold text-slate-600">Enlace Google Maps
                          <input type="url" id="lp-maps" class="mt-1 w-full rounded border p-2 text-sm" placeholder="https://maps.google.com/..." />
                        </label>
                    </div>

                    <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
                        <h2 class="font-bold text-lg">Mapa de distribucion (lienzo)</h2>
                        <p class="text-sm text-slate-600">Arrastra zonas, doble clic para renombrar, Supr para borrar. Boton: dibujar un rectangulo nuevo.</p>
                        <div class="flex flex-wrap gap-2">
                          <button type="button" id="lp-mapa-add" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Dibujar zona (rectangulo)</button>
                        </div>
                        <div class="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                          <canvas id="admin-mapa-canvas" width="800" height="440" class="block max-w-full"></canvas>
                        </div>
                    </div>

                    <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
                        <h2 class="font-bold text-lg">Botones de contacto</h2>
                        <div class="flex flex-wrap gap-2">
                          <button type="button" id="btn-add-wa" class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50">+ WhatsApp</button>
                          <button type="button" id="btn-add-mail" class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50">+ Correo</button>
                          <button type="button" id="btn-add-custom" class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50">+ Personalizado</button>
                        </div>
                        <div id="lp-botones-rows" class="space-y-3"></div>
                    </div>

                    <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
                        <h2 class="font-bold text-lg">Servicios en la landing</h2>
                        <div class="overflow-x-auto">
                          <table class="w-full text-left text-sm border-collapse min-w-[520px]">
                            <thead><tr class="bg-gray-50 text-gray-500">
                              <th class="p-2 border-b">Titulo</th><th class="p-2 border-b">Orden</th><th class="p-2 border-b">Activo</th><th class="p-2 border-b"></th>
                            </tr></thead>
                            <tbody id="servicios-admin-body"></tbody>
                          </table>
                        </div>
                        <div class="grid gap-3 rounded-lg border border-dashed border-slate-200 p-4 sm:grid-cols-2">
                          <input type="text" id="svc-new-title" placeholder="Nuevo servicio - titulo" class="rounded border p-2" />
                          <input type="number" id="svc-new-order" placeholder="Orden" class="rounded border p-2" />
                          <textarea id="svc-new-desc" rows="2" placeholder="Descripcion" class="sm:col-span-2 rounded border p-2"></textarea>
                          <button type="button" id="svc-new-btn" class="rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 sm:col-span-2">Crear servicio</button>
                        </div>
                    </div>

                    <button type="button" id="lp-save" class="rounded-xl bg-slate-900 px-6 py-3 font-bold text-white shadow hover:bg-slate-800">Guardar contenido del sitio</button>
                    <p id="lp-save-msg" class="text-sm text-slate-500"></p>
                </div>` : ''}
            </div>
        </div>
    `;
  },

  mount: async () => {
    const panelTickets = document.getElementById('admin-panel-tickets');
    const panelInventario = document.getElementById('admin-panel-inventario');
    const panelAdmin = document.getElementById('admin-panel-admin');
    const panelSitio = document.getElementById('admin-panel-sitio');
    const hint = document.getElementById('admin-rol-hint');
    const statsWrap = document.getElementById('admin-stats-wrap');
    const sidebar = document.getElementById('admin-sidebar');
    const collapse = document.getElementById('admin-sidebar-collapse');
    const access = await getUserAccess(auth.currentUser);

    const setCollapsed = (collapsed) => {
      sidebar?.classList.toggle('is-collapsed', collapsed);
      if (collapse) {
        collapse.innerHTML = icon(collapsed ? 'expand' : 'collapse', 'h-5 w-5');
        collapse.title = collapsed ? 'Expandir menu' : 'Contraer menu';
      }
      localStorage.setItem('admin-sidebar-collapsed', collapsed ? '1' : '0');
    };
    setCollapsed(localStorage.getItem('admin-sidebar-collapsed') === '1');
    collapse?.addEventListener('click', () => setCollapsed(!sidebar?.classList.contains('is-collapsed')));

    const canFinanzas = access.can('finance.view');
    if (hint) hint.textContent = `Sesion: ${access.roleLabel}.`;
    if (!canFinanzas && statsWrap) {
      statsWrap.innerHTML =
        '<div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Resumen financiero visible solo para jefe o programador.</div>';
    }

    const showSection = (name) => {
      if (name === 'sitio' && !panelSitio) return;
      if (name === 'admin' && !panelAdmin) return;
      if (name === 'inventario' && !panelInventario) return;
      if (panelTickets) panelTickets.classList.toggle('hidden', name !== 'tickets');
      if (panelInventario) panelInventario.classList.toggle('hidden', name !== 'inventario');
      if (panelAdmin) panelAdmin.classList.toggle('hidden', name !== 'admin');
      if (panelSitio) panelSitio.classList.toggle('hidden', name !== 'sitio');
      document.querySelectorAll('[data-admin-section]').forEach((btn) => {
        const on = btn.getAttribute('data-admin-section') === name;
        btn.classList.toggle('is-active', on);
      });
      window.history.replaceState(null, '', `/admin/dashboard?section=${name}`);
    };

    document.querySelectorAll('[data-admin-section]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sec = btn.getAttribute('data-admin-section') || 'tickets';
        showSection(sec);
        if (sec === 'sitio') initSitioPanel();
        if (sec === 'inventario') initInventarioPanel();
      });
    });
    const requestedInitialSection = new URLSearchParams(window.location.search).get('section') || 'tickets';

    let mapEditor = null;
    let sitioReady = false;

    const wireBotonRemove = () => {
      document.querySelectorAll('[data-boton-remove]').forEach((b) => {
        b.onclick = () => {
          b.closest('[data-botom-fila]')?.remove();
        };
      });
    };

    const setBotonesUi = (jsonStr) => {
      const wrap = document.getElementById('lp-botones-rows');
      if (!wrap) return;
      wrap.innerHTML = renderBotonRows(parseBotones(jsonStr));
      wireBotonRemove();
    };

    const initSitioPanel = async () => {
      if (sitioReady) return;

      let landing = defaultLandingForm();
      try {
        const res = await getLandingPage({ id: LANDING_PAGE_ID });
        landing = mergeLandingRow(res.data?.landingPage);
      } catch (e) {
        console.warn(e);
      }

      const setVal = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.value = v;
      };
      setVal('lp-descripcion', landing.descripcionParque);
      setVal('lp-horarios', landing.horariosTexto);
      setVal('lp-ocupacion', landing.ocupacionTexto);
      setVal('lp-estacionamiento', landing.estacionamientoTexto);
      setVal('lp-satelite', landing.imagenSatelitalUrl);
      setVal('lp-maps', landing.googleMapsUrl);
      const abierto = document.getElementById('lp-abierto');
      if (abierto) abierto.checked = landing.abiertoAhora;

      setBotonesUi(landing.botonesJson);

      const canvas = document.getElementById('admin-mapa-canvas');
      if (canvas) {
        if (mapEditor) mapEditor.destroy();
        mapEditor = createDistribucionEditor(canvas, landing.mapaDistribucionJson, () => {});
      }

      document.getElementById('btn-add-wa')?.addEventListener('click', () => {
        const wrap = document.getElementById('lp-botones-rows');
        if (!wrap) return;
        wrap.insertAdjacentHTML(
          'beforeend',
          renderBotonRows([{ type: 'whatsapp', label: 'WhatsApp', value: '' }])
        );
        wireBotonRemove();
      });
      document.getElementById('btn-add-mail')?.addEventListener('click', () => {
        const wrap = document.getElementById('lp-botones-rows');
        if (!wrap) return;
        wrap.insertAdjacentHTML(
          'beforeend',
          renderBotonRows([{ type: 'mail', label: 'Correo', value: '' }])
        );
        wireBotonRemove();
      });
      document.getElementById('btn-add-custom')?.addEventListener('click', () => {
        const wrap = document.getElementById('lp-botones-rows');
        if (!wrap) return;
        wrap.insertAdjacentHTML(
          'beforeend',
          renderBotonRows([{ type: 'custom', label: 'Enlace', href: '/reservar', external: false }])
        );
        wireBotonRemove();
      });

      document.getElementById('lp-mapa-add')?.addEventListener('click', () => {
        mapEditor?.setAdding(true);
      });

      const loadServicios = async () => {
        const body = document.getElementById('servicios-admin-body');
        if (!body) return;
        body.innerHTML = '<tr><td colspan="4" class="p-3">Cargando...</td></tr>';
        try {
          const res = await listServiciosAdmin();
          const list = res.data?.servicios || [];
          if (!list.length) {
            body.innerHTML = '<tr><td colspan="4" class="p-3 text-slate-500">Sin servicios. Crea uno abajo.</td></tr>';
            return;
          }
          body.innerHTML = list
            .map(
              (s) => `
            <tr class="border-b border-slate-100" data-svc-id="${s.id}">
              <td class="p-2"><input data-svc-field="titulo" class="w-full rounded border p-1 text-xs" value="${String(s.titulo).replace(/"/g, '&quot;')}" /></td>
              <td class="p-2 w-24"><input data-svc-field="orden" type="number" class="w-full rounded border p-1 text-xs" value="${s.orden}" /></td>
              <td class="p-2"><input data-svc-field="activo" type="checkbox" ${s.activo ? 'checked' : ''} /></td>
              <td class="p-2 whitespace-nowrap">
                <button type="button" data-svc-save class="text-blue-600 text-xs font-bold hover:underline">Guardar</button>
              </td>
            </tr>
            <tr class="border-b border-slate-200 bg-slate-50/80" data-svc-id="${s.id}">
              <td colspan="4" class="p-2 pb-4"><textarea data-svc-field="descripcion" rows="2" class="w-full rounded border p-1 text-xs">${String(s.descripcion).replace(/</g, '&lt;')}</textarea></td>
            </tr>`
            )
            .join('');

          body.querySelectorAll('[data-svc-save]').forEach((btn) => {
            btn.addEventListener('click', async () => {
              const row = btn.closest('tr');
              const id = row?.getAttribute('data-svc-id');
              if (!id) return;
              const nextRow = row.nextElementSibling;
              const titulo = row.querySelector('[data-svc-field="titulo"]')?.value || '';
              const orden = parseInt(row.querySelector('[data-svc-field="orden"]')?.value || '0', 10);
              const activo = row.querySelector('[data-svc-field="activo"]')?.checked ?? true;
              const descripcion = nextRow?.querySelector('[data-svc-field="descripcion"]')?.value || '';
              btn.setAttribute('disabled', 'true');
              try {
                await updateServicio({
                  id,
                  titulo,
                  descripcion,
                  orden,
                  activo
                });
                const msg = document.getElementById('lp-save-msg');
                if (msg) msg.textContent = 'Servicio actualizado.';
              } catch (err) {
                console.error(err);
                await showAlert('No se pudo guardar el servicio.', { title: 'Error', variant: 'danger' });
              } finally {
                btn.removeAttribute('disabled');
              }
            });
          });
        } catch (e) {
          console.error(e);
          body.innerHTML = '<tr><td colspan="4" class="p-3 text-rose-600">Error cargando servicios.</td></tr>';
        }
      };

      document.getElementById('svc-new-btn')?.addEventListener('click', async () => {
        const titulo = document.getElementById('svc-new-title')?.value?.trim();
        const descripcion = document.getElementById('svc-new-desc')?.value?.trim() || '';
        const orden = parseInt(document.getElementById('svc-new-order')?.value || '0', 10) || 0;
        if (!titulo) {
          await showAlert('Titulo requerido.', { title: 'Campo obligatorio', variant: 'warning' });
          return;
        }
        try {
          await createServicio({ titulo, descripcion, orden, activo: true });
          document.getElementById('svc-new-title').value = '';
          document.getElementById('svc-new-desc').value = '';
          document.getElementById('svc-new-order').value = '';
          await loadServicios();
        } catch (err) {
          console.error(err);
          await showAlert('No se pudo crear el servicio.', { title: 'Error', variant: 'danger' });
        }
      });

      await loadServicios();

      document.getElementById('lp-save')?.addEventListener('click', async () => {
        const msg = document.getElementById('lp-save-msg');
        const mapJson = mapEditor ? mapEditor.getJson() : landing.mapaDistribucionJson;
        const botonesJson = JSON.stringify(collectBotonesFromDom());
        const payload = {
          id: LANDING_PAGE_ID,
          descripcionParque: document.getElementById('lp-descripcion')?.value || '',
          mapaDistribucionJson: mapJson,
          imagenSatelitalUrl: document.getElementById('lp-satelite')?.value?.trim() || '',
          googleMapsUrl: document.getElementById('lp-maps')?.value?.trim() || '',
          horariosTexto: document.getElementById('lp-horarios')?.value || '',
          abiertoAhora: document.getElementById('lp-abierto')?.checked ?? false,
          ocupacionTexto: document.getElementById('lp-ocupacion')?.value || '',
          estacionamientoTexto: document.getElementById('lp-estacionamiento')?.value || '',
          botonesJson
        };
        if (msg) msg.textContent = 'Guardando...';
        try {
          await upsertLandingPage(payload);
          if (msg) msg.textContent = 'Guardado correctamente.';
        } catch (err) {
          console.error(err);
          if (msg) msg.textContent = '';
          await showAlert(
            'Error al guardar. Verifica que Data Connect este desplegado con el esquema nuevo.',
            { title: 'Error', variant: 'danger' }
          );
        }
      });

      sitioReady = true;
    };

    let inventarioReady = false;
    let selectedProductoId = null;

    const initInventarioPanel = async () => {
      if (inventarioReady) return;
      inventarioReady = true;
      const canManage = access.can('inventory.manage');
      const canAdjust = access.can('inventory.adjust') || canManage;
      const canSales = access.can('sales.physical') || canManage;
      const wrap = document.getElementById('inventario-productos');
      const mvWrap = document.getElementById('inventario-movimientos');
      if (!wrap || !mvWrap) return;

      const renderMovs = async (productoId) => {
        if (!productoId) {
          mvWrap.innerHTML = 'Selecciona un producto para ver historial.';
          return;
        }
        selectedProductoId = productoId;
        mvWrap.innerHTML = 'Cargando movimientos...';
        try {
          const res = await listMovimientosInventario({ productoId });
          const rows = res.data?.movimientoInventarios || [];
          if (!rows.length) {
            mvWrap.innerHTML = 'Sin movimientos aún.';
            return;
          }
          mvWrap.innerHTML = rows
            .map((m) => `<div class="rounded border border-slate-200 bg-slate-50 px-3 py-2">
              <div class="font-semibold">${escapeHtml(m.tipo)} · ${m.cantidad}</div>
              <div class="text-xs text-slate-500">${escapeHtml(m.nota || '')}</div>
              <div class="text-xs text-slate-400">${new Date(m.fechaCreacion).toLocaleString()}</div>
            </div>`)
            .join('');
        } catch (e) {
          console.error(e);
          mvWrap.innerHTML = '<span class="text-rose-600">No se pudieron cargar movimientos.</span>';
        }
      };

      const applyMovimiento = async (producto, tipo, cantidad, nota, deltaStock, deltaReservado) => {
        if (!cantidad || cantidad < 0) return;
        const nextStock = Math.max(0, (producto.stockActual || 0) + deltaStock);
        const nextReservado = Math.max(0, (producto.reservadoAprox || 0) + deltaReservado);
        await updateProductoStock({
          id: producto.id,
          stockActual: nextStock,
          reservadoAprox: nextReservado
        });
        await createMovimientoInventario({
          productoId: producto.id,
          tipo,
          cantidad,
          nota
        });
      };

      const loadProductos = async () => {
        wrap.innerHTML = '<p class="text-slate-500">Cargando productos...</p>';
        try {
          const res = await listProductosAdmin();
          const productos = res.data?.productos || [];
          if (!productos.length) {
            wrap.innerHTML = '<p class="text-slate-500">No hay productos aún.</p>';
            return;
          }
          wrap.innerHTML = productos
            .map((p) => `
              <article class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 class="font-bold text-slate-900">${escapeHtml(p.titulo)}</h4>
                    <p class="text-xs text-slate-500">${escapeHtml(p.descripcion || '')}</p>
                    <p class="mt-1 text-sm font-semibold text-slate-700">$${(p.precio || 0).toFixed(2)}</p>
                    <div class="mt-2 flex flex-wrap gap-2 text-xs">
                      <span class="rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-800">Stock: ${p.stockActual}</span>
                      <span class="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-800">Reservados: ${p.reservadoAprox}</span>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button data-prod-show-mov="${p.id}" class="rounded border border-slate-300 px-3 py-1 text-xs font-semibold hover:bg-white">Historial</button>
                  </div>
                </div>
                <div class="mt-3 grid gap-2 sm:grid-cols-4">
                  ${canAdjust ? `<input data-prod-in="${p.id}" type="number" min="1" class="rounded border p-1 text-sm" placeholder="+ stock" />` : ''}
                  ${canAdjust ? `<input data-prod-res="${p.id}" type="number" min="1" class="rounded border p-1 text-sm" placeholder="reservar aprox" />` : ''}
                  ${canSales ? `<input data-prod-sale="${p.id}" type="number" min="1" class="rounded border p-1 text-sm" placeholder="venta física" />` : ''}
                  ${canManage ? `<input data-prod-note="${p.id}" class="rounded border p-1 text-sm sm:col-span-1" placeholder="nota" />` : '<input data-prod-note="' + p.id + '" class="rounded border p-1 text-sm sm:col-span-2" placeholder="nota" />'}
                </div>
                <div class="mt-2 flex flex-wrap gap-2">
                  ${canAdjust ? `<button data-prod-btn-in="${p.id}" class="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700">Agregar stock</button>` : ''}
                  ${canAdjust ? `<button data-prod-btn-res="${p.id}" class="rounded bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600">Reservar aprox</button>` : ''}
                  ${canAdjust ? `<button data-prod-btn-rel="${p.id}" class="rounded bg-slate-500 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-600">Liberar reserva</button>` : ''}
                  ${canSales ? `<button data-prod-btn-sale="${p.id}" class="rounded bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700">Registrar venta física</button>` : ''}
                </div>
              </article>
            `)
            .join('');

          const byId = new Map(productos.map((p) => [p.id, p]));
          const numFrom = (selector) => parseInt(document.querySelector(selector)?.value || '0', 10) || 0;
          const noteFrom = (id) => document.querySelector(`[data-prod-note="${id}"]`)?.value || '';

          document.querySelectorAll('[data-prod-show-mov]').forEach((btn) => {
            btn.addEventListener('click', () => renderMovs(btn.getAttribute('data-prod-show-mov')));
          });

          if (canAdjust) {
            document.querySelectorAll('[data-prod-btn-in]').forEach((btn) => btn.addEventListener('click', async () => {
              const id = btn.getAttribute('data-prod-btn-in');
              const p = byId.get(id);
              const qty = numFrom(`[data-prod-in="${id}"]`);
              if (!p || qty <= 0) return;
              await applyMovimiento(p, 'entrada', qty, noteFrom(id), qty, 0);
              await loadProductos();
              if (selectedProductoId === id) await renderMovs(id);
            }));
            document.querySelectorAll('[data-prod-btn-res]').forEach((btn) => btn.addEventListener('click', async () => {
              const id = btn.getAttribute('data-prod-btn-res');
              const p = byId.get(id);
              const qty = numFrom(`[data-prod-res="${id}"]`);
              if (!p || qty <= 0) return;
              await applyMovimiento(p, 'reserva_aprox', qty, noteFrom(id), 0, qty);
              await loadProductos();
              if (selectedProductoId === id) await renderMovs(id);
            }));
            document.querySelectorAll('[data-prod-btn-rel]').forEach((btn) => btn.addEventListener('click', async () => {
              const id = btn.getAttribute('data-prod-btn-rel');
              const p = byId.get(id);
              const qty = numFrom(`[data-prod-res="${id}"]`);
              if (!p || qty <= 0) return;
              await applyMovimiento(p, 'liberar_reserva', qty, noteFrom(id), 0, -qty);
              await loadProductos();
              if (selectedProductoId === id) await renderMovs(id);
            }));
          }

          if (canSales) {
            document.querySelectorAll('[data-prod-btn-sale]').forEach((btn) => btn.addEventListener('click', async () => {
              const id = btn.getAttribute('data-prod-btn-sale');
              const p = byId.get(id);
              const qty = numFrom(`[data-prod-sale="${id}"]`);
              if (!p || qty <= 0) return;
              await applyMovimiento(p, 'venta_fisica', qty, noteFrom(id), -qty, 0);
              await loadProductos();
              if (selectedProductoId === id) await renderMovs(id);
            }));
          }

          if (selectedProductoId) renderMovs(selectedProductoId);
        } catch (error) {
          console.error(error);
          wrap.innerHTML = '<p class="text-rose-600">Error cargando inventario.</p>';
        }
      };

      document.getElementById('btn-create-producto')?.addEventListener('click', async () => {
        if (!canManage) return;
        const titulo = document.getElementById('prod-title')?.value?.trim();
        const descripcion = document.getElementById('prod-desc')?.value?.trim() || '';
        const imagenUrl = document.getElementById('prod-image')?.value?.trim() || '';
        const precio = parseFloat(document.getElementById('prod-price')?.value || '0');
        const stockActual = parseInt(document.getElementById('prod-stock')?.value || '0', 10) || 0;
        if (!titulo || precio <= 0) {
          await showAlert('Completa titulo y precio del producto.', { title: 'Producto', variant: 'warning' });
          return;
        }
        try {
          await createProducto({
            titulo,
            descripcion,
            imagenUrl,
            precio,
            stockActual,
            reservadoAprox: 0,
            activo: true
          });
          document.getElementById('prod-title').value = '';
          document.getElementById('prod-desc').value = '';
          document.getElementById('prod-image').value = '';
          document.getElementById('prod-price').value = '';
          document.getElementById('prod-stock').value = '';
          await loadProductos();
          await showAlert('Producto creado correctamente.', { title: 'Inventario', variant: 'success' });
        } catch (e) {
          console.error(e);
          await showAlert('No se pudo crear el producto.', { title: 'Error', variant: 'danger' });
        }
      });

      document.getElementById('btn-refresh-inventory')?.addEventListener('click', loadProductos);
      await loadProductos();
    };

    const initialSection =
      requestedInitialSection === 'admin' && panelAdmin
        ? 'admin'
        : requestedInitialSection === 'inventario' && panelInventario
          ? 'inventario'
        : requestedInitialSection === 'sitio' && panelSitio
          ? 'sitio'
          : 'tickets';
    showSection(initialSection);
    if (requestedInitialSection === 'inventario' && panelInventario) initInventarioPanel();
    if (requestedInitialSection === 'sitio' && panelSitio) initSitioPanel();

    const btnCreatePkg = document.getElementById('btn-create-pkg');
    const btnRefresh = document.getElementById('btn-refresh');
    const tableBody = document.getElementById('tickets-table-body');

    const loadTickets = async () => {
      if (!tableBody) return;
      tableBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">Cargando...</td></tr>';
      try {
        const res = await listRecentTickets();
        const tickets = res.data?.tickets || [];
        if (tickets.length === 0) {
          tableBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">No hay tickets recientes</td></tr>';
          if (canFinanzas) {
            const st = document.getElementById('stat-scanned');
            const inc = document.getElementById('stat-income');
            if (st) st.textContent = '0';
            if (inc) inc.textContent = '$0.00';
          }
          return;
        }

        let scanned = 0;
        let income = 0;
        const today = new Date().toDateString();
        let html = '';
        tickets.forEach((data) => {
          if (data.estadoTicket === 'escaneado') scanned += 1;
          const d = new Date(data.fechaCreacion);
          if (d.toDateString() === today && data.estadoPago === 'pagado') {
            income += data.precioTotal || 0;
          }
          const pagoClase =
            data.estadoPago === 'pagado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
          const ticketClase =
            data.estadoTicket === 'valido'
              ? 'bg-blue-100 text-blue-700'
              : data.estadoTicket === 'escaneado'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-red-100 text-red-700';

          html += `
                        <tr class="hover:bg-gray-50">
                            <td class="p-4 border-b font-mono text-xs">#${data.id.substring(0, 8)}</td>
                            <td class="p-4 border-b">${data.clienteNombre || 'N/A'}</td>
                            <td class="p-4 border-b">$${(data.precioTotal || 0).toFixed(2)}</td>
                            <td class="p-4 border-b"><span class="${pagoClase} px-2 py-1 rounded text-xs font-bold uppercase">${data.estadoPago}</span></td>
                            <td class="p-4 border-b"><span class="${ticketClase} px-2 py-1 rounded text-xs font-bold uppercase">${data.estadoTicket}</span></td>
                        </tr>
                    `;
        });
        tableBody.innerHTML = html;
        if (canFinanzas) {
          const st = document.getElementById('stat-scanned');
          const inc = document.getElementById('stat-income');
          if (st) st.textContent = String(scanned);
          if (inc) inc.textContent = `$${income.toFixed(2)}`;
        }
      } catch (error) {
        console.error('Error cargando tickets:', error);
        tableBody.innerHTML =
          '<tr><td colspan="5" class="p-4 text-center text-red-500">Error cargando datos.</td></tr>';
      }
    };

    btnCreatePkg?.addEventListener('click', async () => {
      const name = document.getElementById('pkg-name')?.value;
      const price = document.getElementById('pkg-price')?.value;
      const cap = document.getElementById('pkg-capacity')?.value;
      const desc = document.getElementById('pkg-desc')?.value;

      if (!name || !price || !cap) {
        await showAlert('Llena nombre, precio y capacidad.', { title: 'Faltan datos', variant: 'warning' });
        return;
      }

      btnCreatePkg.disabled = true;
      btnCreatePkg.textContent = 'Guardando...';

      try {
        await createPaquete({
          nombre: name,
          descripcion: desc || '',
          precioBase: parseFloat(price),
          incluyePersonas: parseInt(cap, 10)
        });
        await showAlert('Paquete creado.', { title: 'Listo', variant: 'success' });
        document.getElementById('pkg-name').value = '';
        document.getElementById('pkg-price').value = '';
        document.getElementById('pkg-capacity').value = '';
        document.getElementById('pkg-desc').value = '';
      } catch (error) {
        console.error(error);
        await showAlert('Error al guardar paquete.', { title: 'Error', variant: 'danger' });
      } finally {
        btnCreatePkg.disabled = false;
        btnCreatePkg.textContent = 'Guardar paquete';
      }
    });

    btnRefresh?.addEventListener('click', loadTickets);
    loadTickets();
  }
};

export default AdminDashboard;
