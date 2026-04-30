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
  updateServicio,
  deleteServicio,
  deleteProducto,
  updateTicketStatus,
  getConfiguracion,
  upsertConfiguracion,
  listDescuentosAdmin,
  createDescuento,
  updateDescuento,
  deleteUserRecord,
  deleteConfiguracion,
  deletePaquete,
  deleteMovimientoInventario,
  deleteLandingPage,
  deleteDescuento,
  deleteTicket,
  deleteMesaReserva
} from '../dataconnect-generated';
import {
  createDistribucionEditor,
  DEFAULT_MAPA_JSON,
  MAP_ITEM_KINDS,
  drawDistribucionCanvas,
  getMapKind,
  parseDistribucionJson
} from '../lib/distribucionMapa.js';
import { getUserAccess } from '../lib/accessControl.js';
import { icon } from '../lib/icons.js';
import { showAlert } from '../lib/appDialog.js';
import { subscribeParkingSpots, upsertParkingSpot, updateParkingSpot, removeParkingSpot } from '../lib/parkingRealtime.js';
import { defaultScheduleConfig, parseScheduleConfig, serializeScheduleConfig, scheduleDays } from '../lib/schedule.js';
import { publishAppUpdate } from '../lib/realtimeSync.js';
import { openImageCropModal } from '../lib/imageCropModal.js';
import { uploadProductImage, uploadServiceImage } from '../lib/uploadProductImage.js';

const LANDING_PAGE_ID = 'main';
const TICKET_CONFIG_ID = 'precios_base';

function isDataConnectNotDeployed(error) {
  const msg = String(error?.message || error || '');
  return msg.includes('NOT_FOUND') || msg.includes('not found') || msg.includes('operation ');
}

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
  mapaMesasJson: DEFAULT_MAPA_JSON,
  mapaEstacionamientoJson: DEFAULT_MAPA_JSON,
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
    mapaMesasJson: row.mapaMesasJson || row.mapaDistribucionJson || d.mapaMesasJson,
    mapaEstacionamientoJson: row.mapaEstacionamientoJson || row.mapaDistribucionJson || d.mapaEstacionamientoJson,
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
    const canScan = access.can('tickets.scan');
    const canPackages = access.can('packages.manage');
    const canSitioPanel =
      access.can('landing.manage') ||
      access.can('admin.panel') ||
      access.isProgramador === true;
    const canAdminPanel = access.can('admin.panel');
    const canInventoryView = access.can('inventory.manage') || access.can('inventory.adjust') || access.can('sales.physical');
    const canParking = access.can('parking.manage');
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
                    ${canParking ? `<button type="button" data-admin-section="parking" class="admin-sidebar-item" title="Estacionamiento">${icon('parking', 'h-5 w-5')}<span class="admin-sidebar-label">Estacionamiento</span></button>` : ''}
                    ${canInventoryView ? `<button type="button" data-admin-section="inventario" class="admin-sidebar-item" title="Inventario y ventas">${icon('package', 'h-5 w-5')}<span class="admin-sidebar-label">Inventario / Ventas</span></button>` : ''}
                    ${canScan ? `<a href="/escaner" data-link class="admin-sidebar-item" title="Escaner">${icon('scan', 'h-5 w-5')}<span class="admin-sidebar-label">Escaner</span></a>` : ''}
                    ${canAdminPanel ? `<button type="button" data-admin-section="admin" class="admin-sidebar-item" title="Panel administracion">${icon('dashboard', 'h-5 w-5')}<span class="admin-sidebar-label">Panel administracion</span></button>` : ''}
                    ${canSitioPanel ? `<button type="button" data-admin-section="sitio" class="admin-sidebar-item" title="Sitio / Landing">${icon('palette', 'h-5 w-5')}<span class="admin-sidebar-label">Sitio / Landing</span></button>` : ''}
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
                <div class="mb-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  <strong>Desglose trabajador:</strong> monitorea tickets y usa <em>Registrar entrada</em> para marcar estado final <code>escaneado</code> en tiempo real.
                </div>

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

                ${canAdminPanel ? `<div class="grid grid-cols-1 gap-6 mb-8 xl:grid-cols-2">
                  <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    <h2 class="text-lg font-black text-slate-900">Precios de tickets</h2>
                    <p class="text-xs text-slate-500">Configura los precios base para Adulto, Niño y Mayor.</p>
                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <label class="text-xs font-semibold text-slate-600">Adulto
                        <input id="cfg-precio-adulto" type="number" min="0" step="0.01" class="mt-1 w-full rounded border p-2 text-sm" />
                      </label>
                      <label class="text-xs font-semibold text-slate-600">Niño
                        <input id="cfg-precio-nino" type="number" min="0" step="0.01" class="mt-1 w-full rounded border p-2 text-sm" />
                      </label>
                      <label class="text-xs font-semibold text-slate-600">Mayor
                        <input id="cfg-precio-mayor" type="number" min="0" step="0.01" class="mt-1 w-full rounded border p-2 text-sm" />
                      </label>
                    </div>
                    <div class="flex items-center gap-3">
                      <button type="button" id="cfg-save-prices" class="rounded bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Guardar precios</button>
                      <span id="cfg-prices-status" class="text-xs font-semibold text-slate-600"></span>
                    </div>
                  </section>
                  <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    <h2 class="text-lg font-black text-slate-900">Crear descuento</h2>
                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label class="text-xs font-semibold text-slate-600 sm:col-span-2">Código
                        <input id="disc-code" type="text" class="mt-1 w-full rounded border p-2 text-sm uppercase" placeholder="EJEMPLO10" />
                      </label>
                      <label class="text-xs font-semibold text-slate-600">Tipo
                        <select id="disc-type" class="mt-1 w-full rounded border p-2 text-sm">
                          <option value="porcentaje">Porcentaje</option>
                          <option value="monto">Monto fijo</option>
                        </select>
                      </label>
                      <label class="text-xs font-semibold text-slate-600">Valor
                        <input id="disc-value" type="number" min="0" step="0.01" class="mt-1 w-full rounded border p-2 text-sm" placeholder="10" />
                      </label>
                      <label class="text-xs font-semibold text-slate-600">Usos restantes
                        <input id="disc-uses" type="number" min="1" step="1" class="mt-1 w-full rounded border p-2 text-sm" value="1" />
                      </label>
                      <label class="flex items-center gap-2 text-xs font-semibold text-slate-700 mt-5">
                        <input id="disc-active" type="checkbox" class="h-4 w-4" checked />
                        Activo
                      </label>
                      <label class="text-xs font-semibold text-slate-600 sm:col-span-2">Reglas (JSON)
                        <textarea id="disc-rules-json" rows="2" class="mt-1 w-full rounded border p-2 text-xs font-mono" placeholder='[{"type":"minSubtotal","value":500},{"type":"minTotalQty","value":2}]'></textarea>
                      </label>
                    </div>
                    <div class="flex items-center gap-3">
                      <button type="button" id="disc-create-btn" class="rounded bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">Crear descuento</button>
                      <span id="disc-create-status" class="text-xs font-semibold text-slate-600"></span>
                    </div>
                  </section>
                  <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                    <div class="mb-3 flex items-center justify-between gap-3">
                      <h2 class="text-lg font-black text-slate-900">Descuentos existentes</h2>
                      <button type="button" id="disc-refresh-btn" class="text-sm font-semibold text-blue-600 hover:underline">Actualizar</button>
                    </div>
                    <div id="disc-list" class="space-y-3 text-sm text-slate-600">Cargando descuentos...</div>
                  </section>
                </div>` : ''}

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
                                ${canScan ? '<th class="p-4 border-b text-right">Acción</th>' : ''}
                            </tr>
                        </thead>
                        <tbody id="tickets-table-body">
                            <tr><td colspan="5" class="p-4 text-center text-gray-500">Cargando...</td></tr>
                        </tbody>
                    </table>
                    </div>
                </div>
                </div>

                ${canParking ? `<div id="admin-panel-parking" class="hidden space-y-5">
                  <div class="parking-hero">
                    <div>
                      <p class="text-xs font-black uppercase tracking-widest text-cyan-300">Tiempo real</p>
                      <h2 class="mt-1 text-2xl font-black text-white">Mapa operativo de estacionamiento</h2>
                      <p class="mt-2 max-w-3xl text-sm text-slate-300">Plano de patio con cajones, estado de unidades y movimiento por drag & drop para personal autorizado.</p>
                    </div>
                    <span class="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200">parking.manage</span>
                  </div>
                  <div id="parking-counters" class="grid gap-3 sm:grid-cols-3 xl:grid-cols-7"></div>
                  <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
                    <section class="parking-operational-card">
                      <div class="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 class="text-sm font-black uppercase tracking-wide text-slate-900">Plano del patio</h3>
                          <p class="text-xs text-slate-500">Arrastra una unidad para actualizar su ubicacion.</p>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                          <input id="parking-new-id" class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold" placeholder="ID spot (ej. P-01)" />
                          <button id="btn-parking-add" class="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-black text-white hover:bg-emerald-700">Agregar spot</button>
                        </div>
                      </div>
                      <div id="parking-editor-map" class="parking-operational-map relative h-[520px] overflow-hidden"></div>
                    </section>
                    <section class="parking-list-card">
                      <div class="mb-3 flex items-center justify-between gap-2">
                        <h3 class="text-lg font-black text-slate-900">Spots y estado</h3>
                        <span class="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500">Realtime</span>
                      </div>
                      <div id="parking-spots-list" class="space-y-2 text-sm text-slate-600">Cargando...</div>
                    </section>
                  </div>
                </div>` : ''}

                ${canInventoryView ? `<div id="admin-panel-inventario" class="hidden space-y-6">
                  <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 class="text-2xl font-black text-slate-900">Inventario y ventas físicas</h2>
                    <p class="mt-1 text-sm text-slate-600">Control de stock, reservados aproximados y ventas en caja.</p>
                  </div>
                  ${access.can('inventory.manage') ? `
                  <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div class="flex items-center justify-between"><h3 class="font-bold text-lg">Crear producto</h3><button type="button" id="prod-toggle-create" class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold hover:bg-slate-50">+ Nuevo</button></div>
                    <div id="prod-create-wrap" class="hidden grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input id="prod-title" class="rounded border p-2" placeholder="Titulo" />
                      <input id="prod-price" type="number" step="0.01" class="rounded border p-2" placeholder="Precio" />
                      <div class="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <label class="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Foto del producto</label>
                        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <input id="prod-image-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" />
                          <button type="button" id="prod-image-pick" class="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50">
                            ${icon('package', 'h-4 w-4')} Elegir foto del dispositivo
                          </button>
                          <button type="button" id="prod-image-clear" class="hidden text-sm font-semibold text-rose-600 hover:underline">Quitar imagen</button>
                          <div id="prod-image-preview-wrap" class="hidden sm:ml-auto">
                            <img id="prod-image-preview" src="" alt="Vista previa" class="h-28 w-28 rounded-lg border border-slate-200 object-cover shadow-sm" />
                          </div>
                        </div>
                        <p class="mt-2 text-xs text-slate-500">JPG, PNG o WebP hasta 6 MB. Se sube de forma segura al guardar.</p>
                      </div>
                      <textarea id="prod-desc" rows="2" class="rounded border p-2 sm:col-span-2" placeholder="Descripcion"></textarea>
                      <input id="prod-stock" type="number" class="rounded border p-2" placeholder="Stock inicial" />
                      <button id="btn-create-producto" class="rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700">Guardar producto</button>
                    </div>
                    <div
                      id="prod-edit-modal"
                      class="fixed inset-0 z-[240] hidden items-center justify-center p-4"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="prod-edit-title"
                    >
                      <div class="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" data-prod-edit-backdrop></div>
                      <div class="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
                        <div class="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                          <div class="min-w-0">
                            <h3 id="prod-edit-title" class="text-lg font-black text-slate-900">Editar producto</h3>
                            <p class="text-xs font-semibold text-slate-500">Actualiza titulo, descripcion, imagen y precio.</p>
                          </div>
                          <button type="button" id="prod-edit-cancel" class="grid h-9 w-9 place-items-center rounded-full border border-slate-300 bg-white text-slate-600 hover:bg-slate-50" aria-label="Cerrar">
                            ${icon('x', 'h-4 w-4')}
                          </button>
                        </div>

                        <div class="space-y-4 p-5">
                          <div id="prod-edit-error" class="hidden rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"></div>

                          <label class="block text-xs font-bold uppercase tracking-wide text-slate-600">
                            Titulo
                            <input id="prod-edit-titulo" type="text" class="mt-1 w-full rounded border border-slate-300 p-2 text-sm" />
                          </label>

                          <label class="block text-xs font-bold uppercase tracking-wide text-slate-600">
                            Descripcion
                            <textarea id="prod-edit-desc" rows="3" class="mt-1 w-full rounded border border-slate-300 p-2 text-sm"></textarea>
                          </label>

                          <label class="block text-xs font-bold uppercase tracking-wide text-slate-600">
                            Precio
                            <input id="prod-edit-precio" type="number" step="0.01" class="mt-1 w-full rounded border border-slate-300 p-2 text-sm" />
                          </label>

                          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p class="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">Imagen del producto</p>
                            <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                              <input id="prod-edit-image-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" />
                              <button type="button" id="prod-edit-image-pick" class="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50">
                                ${icon('image', 'h-4 w-4')} Elegir imagen
                              </button>
                              <button type="button" id="prod-edit-image-clear" class="hidden text-sm font-semibold text-rose-600 hover:underline">Quitar</button>
                              <div id="prod-edit-image-preview-wrap" class="hidden sm:ml-auto">
                                <img id="prod-edit-image-preview" src="" alt="Vista previa" class="h-24 w-24 rounded-lg border border-slate-200 object-cover shadow-sm" />
                              </div>
                            </div>
                            <p class="mt-2 text-xs text-slate-500">Se recorta antes de subir.</p>
                          </div>

                          <div class="flex gap-2 pt-2">
                            <button type="button" id="prod-edit-save" class="flex-1 rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700">Guardar</button>
                            <button type="button" id="prod-edit-cancel-2" class="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700 hover:bg-slate-50">Cancelar</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      id="prod-delete-modal"
                      class="fixed inset-0 z-[250] hidden items-center justify-center p-4"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="prod-delete-title"
                    >
                      <div class="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" data-prod-delete-backdrop></div>
                      <div class="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
                        <div class="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
                          <div class="min-w-0">
                            <h3 id="prod-delete-title" class="text-lg font-black text-slate-900">Eliminar producto</h3>
                            <p class="text-sm text-slate-600 mt-1" id="prod-delete-msg">Esta accion no se puede deshacer.</p>
                          </div>
                          <button type="button" id="prod-delete-cancel" class="grid h-9 w-9 place-items-center rounded-full border border-slate-300 bg-white text-slate-600 hover:bg-slate-50" aria-label="Cerrar">
                            ${icon('x', 'h-4 w-4')}
                          </button>
                        </div>
                        <div class="p-5 flex gap-2">
                          <button type="button" id="prod-delete-confirm" class="flex-1 rounded-xl bg-rose-600 px-4 py-2 font-bold text-white hover:bg-rose-700">Eliminar</button>
                          <button type="button" id="prod-delete-cancel-2" class="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700 hover:bg-slate-50">Cancelar</button>
                        </div>
                      </div>
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
                        ${canSitioPanel ? `<button type="button" class="admin-resource-card" data-admin-section="sitio">
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
                    ${access.isProgramador ? `<section class="rounded-2xl border border-rose-300 bg-rose-50/70 p-5 shadow-sm">
                        <div class="flex items-start gap-3">
                            <span class="mt-0.5 text-rose-700">${icon('warning', 'h-5 w-5')}</span>
                            <div class="min-w-0">
                                <h3 class="text-base font-black text-rose-900">Zona de borrado global</h3>
                                <p class="text-xs text-rose-800">Elimina cualquier registro por entidad + ID. Esta accion es permanente y no usa alertas del navegador.</p>
                            </div>
                        </div>
                        <div class="mt-4 grid gap-3 sm:grid-cols-12">
                            <label class="sm:col-span-4 text-xs font-semibold text-rose-900">Entidad
                                <select id="admin-db-entity" class="mt-1 w-full rounded-lg border border-rose-300 bg-white p-2 text-sm">
                                    <option value="ticket">Ticket (UUID)</option>
                                    <option value="mesaReserva">MesaReserva (UUID)</option>
                                    <option value="producto">Producto (UUID)</option>
                                    <option value="servicio">Servicio (UUID)</option>
                                    <option value="paquete">Paquete (UUID)</option>
                                    <option value="descuento">Descuento (UUID)</option>
                                    <option value="movimientoInventario">MovimientoInventario (UUID)</option>
                                    <option value="configuracion">Configuracion (String ID)</option>
                                    <option value="landingPage">LandingPage (String ID)</option>
                                    <option value="user">User (UID String)</option>
                                </select>
                            </label>
                            <label class="sm:col-span-5 text-xs font-semibold text-rose-900">ID del registro
                                <input id="admin-db-record-id" type="text" class="mt-1 w-full rounded-lg border border-rose-300 bg-white p-2 text-sm" placeholder="Ej: 4b7f... o main o UID" />
                            </label>
                            <label class="sm:col-span-3 text-xs font-semibold text-rose-900">Confirmacion
                                <input id="admin-db-confirm" type="text" class="mt-1 w-full rounded-lg border border-rose-300 bg-white p-2 text-sm" placeholder="Escribe BORRAR" />
                            </label>
                        </div>
                        <div class="mt-3 flex flex-wrap items-center gap-2">
                            <button type="button" id="admin-db-delete-btn" class="rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:bg-rose-800">Eliminar registro</button>
                            <button type="button" id="admin-db-clear-btn" class="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100">Limpiar</button>
                            <span id="admin-db-delete-status" class="text-xs font-semibold text-slate-600"></span>
                        </div>
                        <p class="mt-2 text-[11px] text-rose-800">Nota: borrar usuario puede fallar si tiene relaciones activas. En ese caso limpia relaciones primero o usa mantenimiento SQL controlado.</p>
                    </section>` : ''}
                </div>` : ''}

                ${canSitioPanel ? `<div id="admin-panel-sitio" class="hidden space-y-8">
                    <h1 class="text-3xl font-bold text-gray-800">Contenido del sitio (/home)</h1>
                    <p class="text-sm text-slate-600">Textos, horarios, estado, mapa tipo lienzo, vista aerea, Google Maps y botones de contacto. Guarda al final.</p>

                    <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
                        <h2 class="font-bold text-lg">Descripcion del parque</h2>
                        <textarea id="lp-descripcion" rows="6" class="w-full rounded border p-3 text-sm"></textarea>
                    </div>

                    <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
                        <h2 class="font-bold text-lg">Horarios y estado (manual)</h2>
                        <p class="text-xs text-slate-500">Configura 7 dias de la semana y excepciones por fecha especial (festivos, eventos, etc.).</p>
                        <div id="lp-weekly-grid" class="grid gap-2 sm:grid-cols-2"></div>
                        <div class="rounded-lg border border-slate-200 p-3">
                          <div class="mb-2 flex items-center justify-between">
                            <h3 class="text-sm font-bold text-slate-700">Fechas especiales</h3>
                            <button type="button" id="lp-special-add" class="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">+ Agregar fecha</button>
                          </div>
                          <div id="lp-specials" class="space-y-2"></div>
                        </div>
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

                    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
                        <p class="text-sm text-slate-600">El mapa se guarda con el boton <strong>Guardar contenido del sitio</strong> al final de esta pagina. Vista previa en vivo en el lienzo.</p>

                        <div class="mapa-editor-shell overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 shadow-xl ring-1 ring-white/10">
                          <header class="mapa-editor-topbar flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
                            <div class="flex min-w-0 flex-1 items-start gap-3">
                              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">${icon('map', 'h-6 w-6')}</span>
                              <div class="min-w-0">
                                <h2 class="text-base font-black tracking-tight text-white">Editor del mapa del parque</h2>
                                <p class="text-xs text-slate-400">Un motor, tres vistas. Dibuja, selecciona, arrastra y ajusta sin salir del panel.</p>
                              </div>
                            </div>
                            <div class="mapa-command-bar flex flex-wrap gap-2">
                              <label class="sr-only" for="map-context-select">Vista del mapa</label>
                              <select id="map-context-select" class="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-100">
                                <option value="parque">Mapa Global</option>
                                <option value="mesas">Mapa Mesas</option>
                                <option value="estacionamiento">Mapa Estacionamiento</option>
                              </select>
                              <button type="button" id="mapa-save-shortcut" class="mapa-command-primary" title="Guardar contenido del sitio">${icon('check', 'h-4 w-4')} Guardar</button>
                              <button type="button" data-map-mode="select" class="mapa-mode-btn mapa-command-btn is-active" title="Seleccionar">${icon('cursor', 'h-4 w-4')} Seleccionar</button>
                              <button type="button" data-map-mode="pan" class="mapa-mode-btn mapa-command-btn" title="Mano / pan">${icon('move', 'h-4 w-4')} Mano</button>
                              <button type="button" id="mapa-undo" class="mapa-command-btn" title="Deshacer">${icon('undo', 'h-4 w-4')} Undo</button>
                              <button type="button" id="mapa-redo" class="mapa-command-btn" title="Rehacer">${icon('redo', 'h-4 w-4')} Redo</button>
                              <a id="mapa-preview-link" href="/home#mapa" data-link class="mapa-command-btn" title="Vista previa publica">${icon('eye', 'h-4 w-4')} Preview</a>
                            </div>
                          </header>

                          <div class="mapa-tool-strip flex flex-wrap gap-2 border-b border-white/5 bg-black/25 px-4 py-2">
                            ${MAP_ITEM_KINDS.map(
                              (kind) => `
                              <button type="button" class="mapa-tool-btn inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-300 hover:bg-white/10"
                                data-map-tool="${kind.value}" title="${escapeHtml(kind.label)}">
                                <span class="h-2 w-2 shrink-0 rounded-full" style="background:${kind.stroke}"></span>
                                ${kind.label}
                              </button>`
                            ).join('')}
                            <span class="grow"></span>
                            <button type="button" id="mapa-preset-row" class="mapa-command-btn" title="Tres piezas en fila del tipo activo">Fila x3</button>
                            <button type="button" id="mapa-preset-wide" class="mapa-command-btn" title="Rectangulo ancho">Bloque ancho</button>
                            <button type="button" id="mapa-add-quick" class="mapa-command-primary">+ Pieza rapida</button>
                          </div>

                          <p id="mapa-draw-hint" class="hidden border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-[11px] font-semibold text-amber-200">Modo dibujo activo: arrastra sobre el lienzo para crear el rectangulo.</p>

                          <div class="grid gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
                            <div class="relative border-b border-white/10 lg:border-b-0 lg:border-r">
                              <div class="mapa-zoom-bar absolute right-3 top-3 z-20 flex items-center gap-1 rounded-lg border border-white/10 bg-slate-950/90 px-1 py-1 text-slate-200 shadow-lg backdrop-blur">
                                <button type="button" id="mapa-zoom-out" class="h-8 w-8 rounded-md text-lg font-bold hover:bg-white/10" title="Alejar">−</button>
                                <span id="mapa-zoom-label" class="min-w-[3rem] text-center text-[11px] font-bold text-slate-400">100%</span>
                                <button type="button" id="mapa-zoom-in" class="h-8 w-8 rounded-md text-lg font-bold hover:bg-white/10" title="Acercar">+</button>
                                <button type="button" id="mapa-zoom-reset" class="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 hover:bg-white/10" title="Zoom 100%">1:1</button>
                              </div>
                              <div id="mapa-viewport-outer" class="mapa-viewport-outer max-h-[min(70vh,680px)] overflow-auto bg-slate-950/80 p-4">
                                <div id="mapa-viewport-inner" class="inline-block origin-top-left transition-transform duration-150">
                                  <canvas id="admin-mapa-canvas" width="800" height="440" class="block rounded-lg shadow-2xl ring-1 ring-white/10"></canvas>
                                </div>
                              </div>
                              <div class="flex flex-wrap items-end gap-3 border-t border-white/10 bg-black/20 px-4 py-3 text-slate-300">
                                <label class="flex flex-col text-[10px] font-bold uppercase tracking-wide text-slate-500">Ancho lienzo (px)
                                  <input id="mapa-doc-w" type="number" min="400" max="2800" step="10" class="mt-1 w-28 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm font-semibold text-white" />
                                </label>
                                <label class="flex flex-col text-[10px] font-bold uppercase tracking-wide text-slate-500">Alto lienzo (px)
                                  <input id="mapa-doc-h" type="number" min="280" max="2000" step="10" class="mt-1 w-28 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm font-semibold text-white" />
                                </label>
                                <button type="button" id="mapa-doc-apply" class="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-black text-cyan-200 hover:bg-cyan-500/20">Aplicar tamaño</button>
                              </div>
                            </div>

                            <aside class="mapa-inspector flex flex-col bg-slate-900/90 p-4">
                              <div class="mb-3 flex items-center justify-between gap-2">
                                <div>
                                  <p class="text-[10px] font-black uppercase tracking-widest text-slate-500">Inspector</p>
                                  <h3 class="text-sm font-black text-white">Seleccion</h3>
                                </div>
                                <span id="mapa-selected-kind-pill" class="rounded-full bg-slate-700 px-2 py-1 text-[10px] font-bold text-slate-300">Sin seleccion</span>
                              </div>
                              <p id="mapa-empty-state" class="rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-xs leading-relaxed text-slate-400">Haz clic en una pieza del lienzo. Flechas del teclado mueven 1px (Shift = 10px).</p>
                              <div id="mapa-multi-state" class="hidden rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-xs leading-relaxed text-cyan-100">
                                <p class="font-black uppercase tracking-wide">Seleccion multiple</p>
                                <p id="mapa-multi-count" class="mt-1 text-cyan-100/80">0 piezas seleccionadas.</p>
                                <div class="mt-3 grid grid-cols-2 gap-2">
                                  <button type="button" id="mapa-multi-duplicate" class="mapa-command-btn justify-center">Duplicar</button>
                                  <button type="button" id="mapa-multi-delete" class="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-500/20">Eliminar</button>
                                  <button type="button" id="mapa-multi-front" class="mapa-command-btn justify-center">Frente</button>
                                  <button type="button" id="mapa-multi-back" class="mapa-command-btn justify-center">Atras</button>
                                </div>
                              </div>
                              <div id="mapa-editor-fields" class="hidden flex-1 space-y-3">
                                <section class="mapa-inspector-section">
                                  <p class="mapa-inspector-section-title">Identidad</p>
                                <label class="block text-[10px] font-bold uppercase text-slate-500">ID unico
                                  <input id="mapa-item-id" type="text" class="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-600" placeholder="mesa-01" />
                                </label>
                                <label class="block text-[10px] font-bold uppercase text-slate-500">Tipo
                                  <select id="mapa-item-kind" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white">
                                    ${MAP_ITEM_KINDS.map((kind) => `<option value="${kind.value}">${kind.label}</option>`).join('')}
                                  </select>
                                </label>
                                <label class="block text-[10px] font-bold uppercase text-slate-500">Etiqueta visible
                                  <input id="mapa-item-label" type="text" class="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" placeholder="Zona sombra" />
                                </label>
                                </section>
                                <section class="mapa-inspector-section">
                                  <p class="mapa-inspector-section-title">Posicion y tamaño</p>
                                <div class="grid grid-cols-2 gap-2">
                                  <label class="text-[10px] font-bold uppercase text-slate-500">X<input id="mapa-item-x" type="number" class="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white" /></label>
                                  <label class="text-[10px] font-bold uppercase text-slate-500">Y<input id="mapa-item-y" type="number" class="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white" /></label>
                                  <label class="text-[10px] font-bold uppercase text-slate-500">Ancho<input id="mapa-item-width" type="number" min="20" class="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white" /></label>
                                  <label class="text-[10px] font-bold uppercase text-slate-500">Alto<input id="mapa-item-height" type="number" min="20" class="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white" /></label>
                                  <label class="text-[10px] font-bold uppercase text-slate-500">Rotacion<input id="mapa-item-rotation" type="number" step="1" class="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white" /></label>
                                  <label class="text-[10px] font-bold uppercase text-slate-500">Opacidad<input id="mapa-item-opacity" type="number" min="0.05" max="1" step="0.05" class="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white" /></label>
                                  <label class="text-[10px] font-bold uppercase text-slate-500">Relleno<input id="mapa-item-fill" type="color" class="mt-1 h-9 w-full rounded-lg border border-white/10 bg-white/5 p-1" /></label>
                                  <label class="text-[10px] font-bold uppercase text-slate-500">Borde<input id="mapa-item-stroke" type="color" class="mt-1 h-9 w-full rounded-lg border border-white/10 bg-white/5 p-1" /></label>
                                </div>
                                </section>
                                <section class="mapa-inspector-section">
                                  <p class="mapa-inspector-section-title">Metadata especifica</p>
                                <div id="mapa-item-metadata" class="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
                                  <label class="text-[10px] font-bold uppercase text-slate-500">Capacidad<input id="mapa-meta-capacidad" type="number" min="1" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white" /></label>
                                  <label class="text-[10px] font-bold uppercase text-slate-500">Precio<input id="mapa-meta-precio" type="number" min="0" step="1" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white" /></label>
                                  <label class="flex items-center gap-2 text-xs font-semibold text-slate-300"><input id="mapa-meta-vip" type="checkbox" /> VIP</label>
                                  <label class="flex items-center gap-2 text-xs font-semibold text-slate-300"><input id="mapa-meta-reservable" type="checkbox" /> Reservable</label>
                                  <label class="text-[10px] font-bold uppercase text-slate-500">Codigo spot<input id="mapa-meta-spot" type="text" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white" /></label>
                                  <label class="text-[10px] font-bold uppercase text-slate-500">Zona<input id="mapa-meta-zone" type="text" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white" /></label>
                                  <label class="text-[10px] font-bold uppercase text-slate-500 sm:col-span-2">Descripcion publica<input id="mapa-meta-description" type="text" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white" /></label>
                                </div>
                                </section>
                                <section class="mapa-inspector-section">
                                  <p class="mapa-inspector-section-title">Comportamiento</p>
                                <div>
                                  <p class="mb-1 text-[10px] font-bold uppercase text-slate-500">Ajuste fino</p>
                                  <div class="grid max-w-[140px] grid-cols-3 gap-1">
                                    <span></span>
                                    <button type="button" data-map-nudge data-dx="0" data-dy="-10" class="mapa-nudge-btn flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm hover:bg-white/10">↑</button>
                                    <span></span>
                                    <button type="button" data-map-nudge data-dx="-10" data-dy="0" class="mapa-nudge-btn flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm hover:bg-white/10">←</button>
                                    <span class="flex h-9 items-center justify-center text-slate-600">${icon('package', 'h-4 w-4')}</span>
                                    <button type="button" data-map-nudge data-dx="10" data-dy="0" class="mapa-nudge-btn flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm hover:bg-white/10">→</button>
                                    <span></span>
                                    <button type="button" data-map-nudge data-dx="0" data-dy="10" class="mapa-nudge-btn flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm hover:bg-white/10">↓</button>
                                    <span></span>
                                  </div>
                                </div>
                                <label class="flex items-center gap-2 text-xs font-semibold text-slate-300">
                                  <input id="mapa-item-locked" type="checkbox" class="h-4 w-4 rounded border-white/20 bg-white/5" />
                                  Bloquear posicion
                                </label>
                                <label class="flex items-center gap-2 text-xs font-semibold text-slate-300">
                                  <input id="mapa-item-visible" type="checkbox" class="h-4 w-4 rounded border-white/20 bg-white/5" />
                                  Visible
                                </label>
                                <label class="block text-[10px] font-bold uppercase text-slate-500">Notas internas
                                  <textarea id="mapa-item-notes" rows="2" class="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-600"></textarea>
                                </label>
                                </section>
                                <section class="mapa-inspector-section">
                                  <p class="mapa-inspector-section-title">Acciones rapidas</p>
                                <div class="grid grid-cols-2 gap-2 pt-1">
                                  <button type="button" id="mapa-duplicate" class="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white hover:bg-white/10">Duplicar</button>
                                  <button type="button" id="mapa-delete" class="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20">Eliminar</button>
                                  <button type="button" id="mapa-layer-back" class="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10">Atras</button>
                                  <button type="button" id="mapa-layer-front" class="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10">Frente</button>
                                </div>
                                <div class="grid grid-cols-3 gap-2 pt-1">
                                  <button type="button" data-map-align="left" class="rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-slate-300 hover:bg-white/10">Izq</button>
                                  <button type="button" data-map-align="center" class="rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-slate-300 hover:bg-white/10">Centro</button>
                                  <button type="button" data-map-align="right" class="rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-slate-300 hover:bg-white/10">Der</button>
                                  <button type="button" data-map-align="top" class="rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-slate-300 hover:bg-white/10">Arriba</button>
                                  <button type="button" data-map-align="middle" class="rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-slate-300 hover:bg-white/10">Medio</button>
                                  <button type="button" data-map-align="bottom" class="rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-slate-300 hover:bg-white/10">Abajo</button>
                                  <button type="button" data-map-distribute="horizontal" class="rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-slate-300 hover:bg-white/10">Dist H</button>
                                  <button type="button" data-map-distribute="vertical" class="rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-slate-300 hover:bg-white/10">Dist V</button>
                                  <label class="flex items-center justify-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-slate-300"><input id="mapa-snap-grid" type="checkbox" checked /> Snap</label>
                                </div>
                                </section>
                              </div>
                              <div class="mt-4 border-t border-white/10 pt-4">
                                <div class="mb-2 flex items-center justify-between">
                                  <p class="text-[10px] font-black uppercase tracking-widest text-slate-500">Capas e items</p>
                                  <span id="mapa-layer-count" class="text-[10px] font-bold text-slate-500">0</span>
                                </div>
                                <div id="mapa-layers-list" class="max-h-56 space-y-1 overflow-auto pr-1 text-xs"></div>
                              </div>
                            </aside>
                          </div>

                          <footer class="flex flex-wrap items-center gap-2 border-t border-white/10 bg-black/30 px-4 py-3">
                            <span class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Estado</span>
                            <span class="rounded-full bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-400">Ctrl/Cmd+Z deshace</span>
                            <span class="rounded-full bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-400">Shift + click suma seleccion</span>
                            ${MAP_ITEM_KINDS.map((kind) => `<span class="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-400"><i style="background:${kind.stroke}" class="h-2 w-2 rounded-full"></i>${kind.label}</span>`).join('')}
                          </footer>
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
                          <table class="w-full text-left text-sm border-collapse min-w-[680px]">
                            <thead><tr class="bg-gray-50 text-gray-500">
                              <th class="p-2 border-b">Imagen</th><th class="p-2 border-b">Titulo</th><th class="p-2 border-b">Precio</th><th class="p-2 border-b">Orden</th><th class="p-2 border-b">Activo</th><th class="p-2 border-b"></th>
                            </tr></thead>
                            <tbody id="servicios-admin-body"></tbody>
                          </table>
                        </div>
                        <button type="button" id="svc-toggle-create" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold hover:bg-slate-50">+ Crear servicio</button>
                        <div id="svc-create-wrap" class="hidden grid gap-3 rounded-lg border border-dashed border-slate-200 p-4 sm:grid-cols-2">
                          <input type="text" id="svc-new-title" placeholder="Nuevo servicio - titulo" class="rounded border p-2" />
                          <input type="number" id="svc-new-price" placeholder="Precio" class="rounded border p-2" step="0.01" />
                          <input type="number" id="svc-new-order" placeholder="Orden" class="rounded border p-2" />
                          <div class="flex items-center gap-2">
                            <input id="svc-new-image-file" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" />
                            <button type="button" id="svc-new-image-pick" class="rounded border px-3 py-2 text-xs font-semibold">Elegir imagen</button>
                            <button type="button" id="svc-new-image-clear" class="hidden text-xs font-semibold text-rose-600">Quitar</button>
                            <img id="svc-new-image-preview" class="hidden h-12 w-12 rounded object-cover border" alt="" />
                          </div>
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
    const panelParking = document.getElementById('admin-panel-parking');
    const panelInventario = document.getElementById('admin-panel-inventario');
    const panelAdmin = document.getElementById('admin-panel-admin');
    const panelSitio = document.getElementById('admin-panel-sitio');
    const hint = document.getElementById('admin-rol-hint');
    const statsWrap = document.getElementById('admin-stats-wrap');
    const sidebar = document.getElementById('admin-sidebar');
    const collapse = document.getElementById('admin-sidebar-collapse');
    const access = await getUserAccess(auth.currentUser);
    const canScan = access.can('tickets.scan');
    const dangerousDeleteMutations = {
      ticket: deleteTicket,
      mesaReserva: deleteMesaReserva,
      producto: deleteProducto,
      servicio: deleteServicio,
      paquete: deletePaquete,
      descuento: deleteDescuento,
      movimientoInventario: deleteMovimientoInventario,
      configuracion: deleteConfiguracion,
      landingPage: deleteLandingPage,
      user: deleteUserRecord
    };

    const dangerousDeleteEntity = document.getElementById('admin-db-entity');
    const dangerousDeleteId = document.getElementById('admin-db-record-id');
    const dangerousDeleteConfirm = document.getElementById('admin-db-confirm');
    const dangerousDeleteStatus = document.getElementById('admin-db-delete-status');
    const dangerousDeleteBtn = document.getElementById('admin-db-delete-btn');
    const dangerousDeleteClearBtn = document.getElementById('admin-db-clear-btn');

    const setDangerousDeleteStatus = (msg, tone = 'neutral') => {
      if (!dangerousDeleteStatus) return;
      dangerousDeleteStatus.textContent = msg || '';
      dangerousDeleteStatus.className = 'text-xs font-semibold';
      if (tone === 'ok') dangerousDeleteStatus.classList.add('text-emerald-700');
      else if (tone === 'err') dangerousDeleteStatus.classList.add('text-rose-700');
      else dangerousDeleteStatus.classList.add('text-slate-600');
    };

    dangerousDeleteClearBtn?.addEventListener('click', () => {
      if (dangerousDeleteId) dangerousDeleteId.value = '';
      if (dangerousDeleteConfirm) dangerousDeleteConfirm.value = '';
      setDangerousDeleteStatus('');
    });
    dangerousDeleteBtn?.addEventListener('click', async () => {
      const entity = String(dangerousDeleteEntity?.value || '');
      const id = String(dangerousDeleteId?.value || '').trim();
      const confirmation = String(dangerousDeleteConfirm?.value || '').trim().toUpperCase();
      if (!entity || !dangerousDeleteMutations[entity]) {
        setDangerousDeleteStatus('Entidad no soportada.', 'err');
        return;
      }
      if (!id) {
        setDangerousDeleteStatus('Captura un ID para borrar.', 'err');
        return;
      }
      if (confirmation !== 'BORRAR') {
        setDangerousDeleteStatus('Escribe BORRAR para confirmar.', 'err');
        return;
      }
      try {
        dangerousDeleteBtn.disabled = true;
        setDangerousDeleteStatus('Eliminando registro...', 'neutral');
        await dangerousDeleteMutations[entity]({ id });
        setDangerousDeleteStatus(`Registro eliminado en ${entity}.`, 'ok');
        if (dangerousDeleteConfirm) dangerousDeleteConfirm.value = '';
        await publishAppUpdate('general', `admin-delete:${entity}:${id}`);
      } catch (error) {
        console.error('Error eliminando registro global:', error);
        const msg = String(error?.message || '');
        if (msg.includes('operation') && msg.includes('not found')) {
          setDangerousDeleteStatus('Operacion no desplegada en Data Connect. Ejecuta deploy de dataconnect.', 'err');
        } else if (msg.toLowerCase().includes('insufficient permissions')) {
          setDangerousDeleteStatus('Permisos insuficientes para esta operacion.', 'err');
        } else {
          setDangerousDeleteStatus(error?.message || 'No se pudo eliminar el registro.', 'err');
        }
      } finally {
        dangerousDeleteBtn.disabled = false;
      }
    });

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
      if (name === 'parking' && !panelParking) return;
      if (panelTickets) panelTickets.classList.toggle('hidden', name !== 'tickets');
      if (panelParking) panelParking.classList.toggle('hidden', name !== 'parking');
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
        if (sec === 'parking') initParkingPanel();
        if (sec === 'inventario') initInventarioPanel();
      });
    });
    const adminUrlParams = new URLSearchParams(window.location.search);
    const requestedInitialSection = adminUrlParams.get('section') || 'tickets';
    const mapEditorFocus = adminUrlParams.get('mapfocus') === '1';

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

      let scheduleConfig = parseScheduleConfig(landing.horariosTexto || serializeScheduleConfig(defaultScheduleConfig()));
      const weeklyWrap = document.getElementById('lp-weekly-grid');
      const specialsWrap = document.getElementById('lp-specials');
      const renderSpecials = () => {
        if (!specialsWrap) return;
        if (!scheduleConfig.specials.length) {
          specialsWrap.innerHTML = '<p class="text-xs text-slate-500">Sin fechas especiales.</p>';
          return;
        }
        specialsWrap.innerHTML = scheduleConfig.specials
          .map((s, idx) => `
            <div class="grid gap-2 rounded border border-slate-200 p-2 sm:grid-cols-12 sm:items-center">
              <input data-sp-date="${idx}" type="date" value="${escapeHtml(s.date)}" class="rounded border p-1 text-xs sm:col-span-3" />
              <input data-sp-label="${idx}" value="${escapeHtml(s.label || '')}" placeholder="Motivo" class="rounded border p-1 text-xs sm:col-span-3" />
              <input data-sp-open="${idx}" type="time" value="${escapeHtml(s.open)}" class="rounded border p-1 text-xs sm:col-span-2" />
              <input data-sp-close="${idx}" type="time" value="${escapeHtml(s.close)}" class="rounded border p-1 text-xs sm:col-span-2" />
              <label class="text-xs font-semibold sm:col-span-1"><input data-sp-closed="${idx}" type="checkbox" ${s.closed ? 'checked' : ''} /> Cerrado</label>
              <button type="button" data-sp-del="${idx}" class="rounded border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 sm:col-span-1">Quitar</button>
            </div>
          `)
          .join('');
        specialsWrap.querySelectorAll('[data-sp-date],[data-sp-label],[data-sp-open],[data-sp-close],[data-sp-closed]').forEach((node) => {
          node.addEventListener('change', () => {
            scheduleConfig.specials = scheduleConfig.specials.map((item, idx) => ({
              ...item,
              date: specialsWrap.querySelector(`[data-sp-date="${idx}"]`)?.value || '',
              label: specialsWrap.querySelector(`[data-sp-label="${idx}"]`)?.value || '',
              open: specialsWrap.querySelector(`[data-sp-open="${idx}"]`)?.value || '09:00',
              close: specialsWrap.querySelector(`[data-sp-close="${idx}"]`)?.value || '18:00',
              closed: specialsWrap.querySelector(`[data-sp-closed="${idx}"]`)?.checked || false
            }));
          });
        });
        specialsWrap.querySelectorAll('[data-sp-del]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-sp-del') || '-1', 10);
            scheduleConfig.specials.splice(idx, 1);
            renderSpecials();
          });
        });
      };
      const renderWeekly = () => {
        if (!weeklyWrap) return;
        weeklyWrap.innerHTML = scheduleDays()
          .map((d) => {
            const x = scheduleConfig.days[d.key];
            return `
              <div class="rounded border border-slate-200 p-2">
                <p class="text-xs font-bold text-slate-700">${d.label}</p>
                <div class="mt-1 grid grid-cols-2 gap-2">
                  <input data-day-open="${d.key}" type="time" value="${escapeHtml(x.open)}" class="rounded border p-1 text-xs" />
                  <input data-day-close="${d.key}" type="time" value="${escapeHtml(x.close)}" class="rounded border p-1 text-xs" />
                </div>
                <label class="mt-1 inline-flex items-center gap-1 text-xs"><input data-day-closed="${d.key}" type="checkbox" ${x.closed ? 'checked' : ''} /> Cerrado</label>
              </div>
            `;
          })
          .join('');
        weeklyWrap.querySelectorAll('[data-day-open],[data-day-close],[data-day-closed]').forEach((node) => {
          node.addEventListener('change', () => {
            scheduleDays().forEach((d) => {
              scheduleConfig.days[d.key] = {
                open: weeklyWrap.querySelector(`[data-day-open="${d.key}"]`)?.value || '09:00',
                close: weeklyWrap.querySelector(`[data-day-close="${d.key}"]`)?.value || '18:00',
                closed: weeklyWrap.querySelector(`[data-day-closed="${d.key}"]`)?.checked || false
              };
            });
          });
        });
      };
      renderWeekly();
      renderSpecials();
      document.getElementById('lp-special-add')?.addEventListener('click', () => {
        scheduleConfig.specials.push({ date: '', label: '', open: '09:00', close: '18:00', closed: false });
        renderSpecials();
      });

      const setVal = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.value = v;
      };
      setVal('lp-descripcion', landing.descripcionParque);
      setVal('lp-ocupacion', landing.ocupacionTexto);
      setVal('lp-estacionamiento', landing.estacionamientoTexto);
      setVal('lp-satelite', landing.imagenSatelitalUrl);
      setVal('lp-maps', landing.googleMapsUrl);
      let mapContext = 'parque';
      const getMapByContext = () =>
        mapContext === 'mesas'
          ? (landing.mapaMesasJson || landing.mapaDistribucionJson)
          : mapContext === 'estacionamiento'
            ? (landing.mapaEstacionamientoJson || landing.mapaDistribucionJson)
            : landing.mapaDistribucionJson;
      const mapViewForContext = () =>
        mapContext === 'mesas'
          ? 'mesas'
          : mapContext === 'estacionamiento'
            ? 'estacionamiento'
            : 'global';
      const parsedMapDims = parseDistribucionJson(getMapByContext());
      setVal('mapa-doc-w', parsedMapDims.w);
      setVal('mapa-doc-h', parsedMapDims.h);
      const abierto = document.getElementById('lp-abierto');
      if (abierto) abierto.checked = landing.abiertoAhora;

      setBotonesUi(landing.botonesJson);

      const wireMapEditorUi = () => {
        const fieldsWrap = document.getElementById('mapa-editor-fields');
        const emptyState = document.getElementById('mapa-empty-state');
        const multiState = document.getElementById('mapa-multi-state');
        const multiCount = document.getElementById('mapa-multi-count');
        const pill = document.getElementById('mapa-selected-kind-pill');
        const layersList = document.getElementById('mapa-layers-list');
        const layerCount = document.getElementById('mapa-layer-count');
        const previewLink = document.getElementById('mapa-preview-link');
        const fieldIds = {
          id: 'mapa-item-id',
          kind: 'mapa-item-kind',
          label: 'mapa-item-label',
          x: 'mapa-item-x',
          y: 'mapa-item-y',
          width: 'mapa-item-width',
          height: 'mapa-item-height',
          rotation: 'mapa-item-rotation',
          opacity: 'mapa-item-opacity',
          fill: 'mapa-item-fill',
          stroke: 'mapa-item-stroke',
          locked: 'mapa-item-locked',
          visible: 'mapa-item-visible',
          notes: 'mapa-item-notes',
          capacidad: 'mapa-meta-capacidad',
          precio: 'mapa-meta-precio',
          vip: 'mapa-meta-vip',
          reservable: 'mapa-meta-reservable',
          spotCode: 'mapa-meta-spot',
          zone: 'mapa-meta-zone',
          description: 'mapa-meta-description'
        };
        let syncing = false;

        const el = (key) => document.getElementById(fieldIds[key]);
        const toColorValue = (value, fallback = '#0f766e') => {
          const raw = String(value || '').trim();
          if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;
          const rgba = raw.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
          if (!rgba) return fallback;
          return `#${[rgba[1], rgba[2], rgba[3]].map((n) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0')).join('')}`;
        };
        const updatePreviewLink = () => {
          if (!previewLink) return;
          previewLink.setAttribute('href', mapContext === 'mesas' ? '/reservar' : '/home#mapa');
          previewLink.setAttribute('title', mapContext === 'mesas' ? 'Vista previa de reservas' : 'Vista previa publica');
        };
        const setInspectorMode = (mode) => {
          const disabled = mode !== 'single';
          fieldsWrap?.classList.toggle('hidden', mode !== 'single');
          emptyState?.classList.toggle('hidden', mode !== 'empty');
          multiState?.classList.toggle('hidden', mode !== 'multi');
          document.querySelectorAll('#mapa-editor-fields input, #mapa-editor-fields select, #mapa-editor-fields textarea, #mapa-editor-fields button').forEach((node) => {
            node.disabled = disabled;
          });
        };
        const fillFields = (item, _index, selection = []) => {
          syncing = true;
          const drawHint = document.getElementById('mapa-draw-hint');
          if (drawHint && item) drawHint.classList.add('hidden');
          if (selection.length > 1) {
            setInspectorMode('multi');
            if (multiCount) multiCount.textContent = `${selection.length} piezas seleccionadas. Puedes moverlas juntas, duplicarlas, ordenarlas o eliminarlas.`;
            if (pill) {
              pill.textContent = `${selection.length} piezas`;
              pill.className = 'rounded-full bg-cyan-500/20 px-2 py-1 text-[10px] font-bold text-cyan-100';
              pill.removeAttribute('style');
            }
            renderLayers();
            syncing = false;
            return;
          }
          if (!item) {
            setInspectorMode('empty');
            if (pill) {
              pill.textContent = 'Sin seleccion';
              pill.className = 'rounded-full bg-slate-700 px-2 py-1 text-[10px] font-bold text-slate-300';
              pill.removeAttribute('style');
            }
            renderLayers();
            syncing = false;
            return;
          }
          setInspectorMode('single');
          const kind = getMapKind(item.kind);
          if (pill) {
            pill.textContent = kind.label;
            pill.className = 'rounded-full px-2 py-1 text-[10px] font-bold text-white';
            pill.style.background = kind.stroke;
          }
          el('id').value = item.id || '';
          el('kind').value = item.kind || 'area';
          el('label').value = item.label || '';
          el('x').value = item.x ?? 0;
          el('y').value = item.y ?? 0;
          el('width').value = item.width ?? 100;
          el('height').value = item.height ?? 80;
          el('rotation').value = item.rotation ?? 0;
          el('opacity').value = item.opacity ?? 1;
          el('fill').value = toColorValue(item.fill, toColorValue(kind.fill));
          el('stroke').value = toColorValue(item.stroke, toColorValue(kind.stroke));
          el('locked').checked = Boolean(item.locked);
          el('visible').checked = item.visible !== false;
          el('notes').value = item.notes || '';
          el('capacidad').value = item.metadata?.capacidad ?? '';
          el('precio').value = item.metadata?.precio ?? '';
          el('vip').checked = Boolean(item.metadata?.vip);
          el('reservable').checked = item.metadata?.reservable !== false;
          el('spotCode').value = item.metadata?.spotCode || '';
          el('zone').value = item.metadata?.zone || '';
          el('description').value = item.metadata?.description || '';
          renderLayers();
          syncing = false;
        };

        const collectPatch = () => {
          const kindValue = el('kind')?.value || 'area';
          const kind = getMapKind(kindValue);
          return {
            id: el('id')?.value || '',
            kind: kindValue,
            label: el('label')?.value || kind.label,
            x: parseInt(el('x')?.value || '0', 10) || 0,
            y: parseInt(el('y')?.value || '0', 10) || 0,
            width: parseInt(el('width')?.value || '100', 10) || 100,
            height: parseInt(el('height')?.value || '80', 10) || 80,
            rotation: parseInt(el('rotation')?.value || '0', 10) || 0,
            opacity: Math.max(0.05, Math.min(1, parseFloat(el('opacity')?.value || '1') || 1)),
            locked: el('locked')?.checked || false,
            visible: el('visible')?.checked ?? true,
            notes: el('notes')?.value || '',
            fill: el('fill')?.value || kind.fill,
            stroke: el('stroke')?.value || kind.stroke,
            metadata: {
              capacidad: parseInt(el('capacidad')?.value || '0', 10) || undefined,
              precio: parseFloat(el('precio')?.value || '0') || 0,
              vip: el('vip')?.checked || false,
              reservable: el('reservable')?.checked ?? true,
              spotCode: el('spotCode')?.value || '',
              zone: el('zone')?.value || '',
              description: el('description')?.value || ''
            }
          };
        };

        const renderLayers = () => {
          if (!layersList) return;
          const items = mapEditor?.getItems?.() || [];
          const selectedIds = new Set((mapEditor?.getSelection?.() || []).map((item) => item.id));
          if (layerCount) layerCount.textContent = `${items.length}`;
          if (!items.length) {
            layersList.innerHTML = '<p class="rounded-lg border border-dashed border-white/10 p-3 text-slate-500">Sin items en esta vista.</p>';
            return;
          }
          layersList.innerHTML = [...items]
            .reverse()
            .map((item) => {
              const kind = getMapKind(item.kind);
              const active = selectedIds.has(item.id);
              return `
              <div class="mapa-layer-row ${active ? 'is-active' : ''}">
                <span class="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/10" style="background:${kind.stroke}"></span>
                <button type="button" data-layer-select="${escapeHtml(item.id)}" class="min-w-0 flex-1 text-left">
                  <span class="block truncate font-bold text-slate-100">${escapeHtml(item.label || kind.label)}</span>
                  <small class="block truncate text-[10px] font-semibold text-slate-500">${escapeHtml(kind.label)}</small>
                </button>
                <button type="button" data-layer-lock="${escapeHtml(item.id)}" class="mapa-layer-icon ${item.locked ? 'is-locked' : ''}" title="${item.locked ? 'Desbloquear' : 'Bloquear'}">${item.locked ? 'L' : 'U'}</button>
                <button type="button" data-layer-visible="${escapeHtml(item.id)}" class="mapa-layer-icon ${item.visible === false ? 'is-hidden' : ''}" title="${item.visible === false ? 'Mostrar' : 'Ocultar'}">${item.visible === false ? 'Off' : 'On'}</button>
              </div>
            `;
            })
            .join('');
          layersList.querySelectorAll('[data-layer-select]').forEach((btn) => {
            btn.addEventListener('click', () => mapEditor?.selectItemById?.(btn.getAttribute('data-layer-select') || ''));
          });
          layersList.querySelectorAll('[data-layer-lock]').forEach((btn) => {
            btn.addEventListener('click', () => mapEditor?.toggleItemLocked?.(btn.getAttribute('data-layer-lock') || ''));
          });
          layersList.querySelectorAll('[data-layer-visible]').forEach((btn) => {
            btn.addEventListener('click', () => mapEditor?.toggleItemVisible?.(btn.getAttribute('data-layer-visible') || ''));
          });
        };

        Object.values(fieldIds).forEach((id) => {
          const node = document.getElementById(id);
          if (!node) return;
          node.oninput = () => {
            if (syncing) return;
            mapEditor?.updateSelected(collectPatch());
          };
          node.onchange = () => {
            if (syncing) return;
            mapEditor?.updateSelected(collectPatch());
          };
        });

        const setClick = (id, handler) => {
          const node = document.getElementById(id);
          if (node) node.onclick = handler;
        };
        setClick('mapa-delete', () => mapEditor?.deleteSelected());
        setClick('mapa-duplicate', () => mapEditor?.duplicateSelected());
        setClick('mapa-layer-back', () => mapEditor?.moveSelectedLayer(-1));
        setClick('mapa-layer-front', () => mapEditor?.moveSelectedLayer(1));
        setClick('mapa-multi-delete', () => mapEditor?.deleteSelected());
        setClick('mapa-multi-duplicate', () => mapEditor?.duplicateSelected());
        setClick('mapa-multi-front', () => mapEditor?.bringToFront?.());
        setClick('mapa-multi-back', () => mapEditor?.sendToBack?.());
        setClick('mapa-save-shortcut', () => document.getElementById('lp-save')?.click());
        setClick('mapa-undo', () => mapEditor?.undo?.());
        setClick('mapa-redo', () => mapEditor?.redo?.());
        document.querySelectorAll('[data-map-mode]').forEach((btn) => {
          btn.onclick = () => {
            const mode = btn.getAttribute('data-map-mode') || 'select';
            mapEditor?.setTool?.(mode);
            document.querySelectorAll('[data-map-mode]').forEach((node) => node.classList.toggle('is-active', node === btn));
          };
        });
        document.querySelectorAll('[data-map-align]').forEach((btn) => {
          btn.onclick = () => mapEditor?.alignSelected?.(btn.getAttribute('data-map-align') || 'left');
        });
        document.querySelectorAll('[data-map-distribute]').forEach((btn) => {
          btn.onclick = () => mapEditor?.distributeSelected?.(btn.getAttribute('data-map-distribute') || 'horizontal');
        });
        const snapGrid = document.getElementById('mapa-snap-grid');
        if (snapGrid) {
          snapGrid.onchange = (ev) => {
            mapEditor?.setSnap?.(ev.currentTarget.checked);
          };
        }
        document.querySelectorAll('[data-map-nudge]').forEach((btn) => {
          btn.onclick = () => {
            if (syncing) return;
            const dx = parseInt(btn.getAttribute('data-dx') || '0', 10);
            const dy = parseInt(btn.getAttribute('data-dy') || '0', 10);
            const cur = mapEditor?.getSelected();
            if (!cur || cur.locked) return;
            mapEditor?.updateSelected({ x: cur.x + dx, y: cur.y + dy });
          };
        });
        updatePreviewLink();
        mapEditor?.onSelectionChange(fillFields);
        mapEditor?.onDocumentChange?.(renderLayers);
        renderLayers();
        fillFields(null);
      };

      const canvas = document.getElementById('admin-mapa-canvas');
      if (canvas) {
        if (mapEditor) mapEditor.destroy();
        mapEditor = createDistribucionEditor(canvas, getMapByContext(), () => {}, { view: mapViewForContext() });
        wireMapEditorUi();
      }

      const mapContextSelect = document.getElementById('map-context-select');
      mapContextSelect?.addEventListener('change', () => {
        if (mapEditor) {
          const prev = mapEditor.getJson();
          if (mapContext === 'parque') landing.mapaDistribucionJson = prev;
          if (mapContext === 'mesas') landing.mapaMesasJson = prev;
          if (mapContext === 'estacionamiento') landing.mapaEstacionamientoJson = prev;
        }
        mapContext = mapContextSelect.value || 'parque';
        const nextJson = getMapByContext();
        mapEditor?.destroy();
        const canvas = document.getElementById('admin-mapa-canvas');
        if (canvas) {
          mapEditor = createDistribucionEditor(canvas, nextJson, () => {}, { view: mapViewForContext() });
          wireMapEditorUi();
          const dims = parseDistribucionJson(nextJson);
          setVal('mapa-doc-w', dims.w);
          setVal('mapa-doc-h', dims.h);
        }
      });

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

      let activeMapKind = 'area';
      let mapZoom = 1;
      const viewportInner = document.getElementById('mapa-viewport-inner');
      const zoomLabel = document.getElementById('mapa-zoom-label');

      const applyMapZoom = (next, reset = false) => {
        mapZoom = reset ? 1 : Math.min(2.2, Math.max(0.35, next));
        if (viewportInner) {
          viewportInner.style.transform = `scale(${mapZoom})`;
          viewportInner.style.transformOrigin = 'top left';
        }
        if (zoomLabel) zoomLabel.textContent = `${Math.round(mapZoom * 100)}%`;
      };

      document.getElementById('mapa-zoom-in')?.addEventListener('click', () => applyMapZoom(mapZoom + 0.12));
      document.getElementById('mapa-zoom-out')?.addEventListener('click', () => applyMapZoom(mapZoom - 0.12));
      document.getElementById('mapa-zoom-reset')?.addEventListener('click', () => applyMapZoom(1, true));

      document.getElementById('mapa-doc-apply')?.addEventListener('click', () => {
        const w = parseInt(document.getElementById('mapa-doc-w')?.value || '800', 10);
        const h = parseInt(document.getElementById('mapa-doc-h')?.value || '440', 10);
        mapEditor?.setDocumentSize(w, h);
        if (mapEditor && typeof mapEditor.getDocumentSize === 'function') {
          const s = mapEditor.getDocumentSize();
          setVal('mapa-doc-w', s.w);
          setVal('mapa-doc-h', s.h);
        }
      });

      document.querySelectorAll('[data-map-tool]').forEach((btn) => {
        btn.addEventListener('click', () => {
          activeMapKind = btn.getAttribute('data-map-tool') || 'area';
          document.querySelectorAll('[data-map-tool]').forEach((b) => {
            const on = b === btn;
            b.classList.toggle('ring-2', on);
            b.classList.toggle('ring-cyan-400/80', on);
            b.classList.toggle('bg-cyan-500/15', on);
          });
          mapEditor?.setAdding(true, activeMapKind);
          document.getElementById('mapa-draw-hint')?.classList.remove('hidden');
        });
      });

      document.getElementById('mapa-add-quick')?.addEventListener('click', () => {
        mapEditor?.addItem(activeMapKind);
        document.getElementById('mapa-draw-hint')?.classList.add('hidden');
      });

      document.getElementById('mapa-preset-row')?.addEventListener('click', () => {
        mapEditor?.addPresetRow(activeMapKind, 3);
      });

      document.getElementById('mapa-preset-wide')?.addEventListener('click', () => {
        mapEditor?.addPresetWideBlock(activeMapKind);
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
              <td class="p-2">${s.imagenUrl ? `<img src="${escapeHtml(s.imagenUrl)}" class="h-10 w-10 rounded object-cover border" alt=""/>` : '<span class="text-xs text-slate-400">Sin imagen</span>'}</td>
              <td class="p-2"><input data-svc-field="titulo" class="w-full rounded border p-1 text-xs" value="${String(s.titulo).replace(/"/g, '&quot;')}" /></td>
              <td class="p-2 w-24"><input data-svc-field="precio" type="number" step="0.01" class="w-full rounded border p-1 text-xs" value="${Number(s.precio || 0).toFixed(2)}" /></td>
              <td class="p-2 w-24"><input data-svc-field="orden" type="number" class="w-full rounded border p-1 text-xs" value="${s.orden}" /></td>
              <td class="p-2"><input data-svc-field="activo" type="checkbox" ${s.activo ? 'checked' : ''} /></td>
              <td class="p-2 whitespace-nowrap">
                <button type="button" data-svc-save class="text-blue-600 text-xs font-bold hover:underline">Guardar</button>
                <button type="button" data-svc-del class="ml-2 text-rose-600 text-xs font-bold hover:underline">Eliminar</button>
              </td>
            </tr>
            <tr class="border-b border-slate-200 bg-slate-50/80" data-svc-id="${s.id}">
              <td colspan="6" class="p-2 pb-4"><textarea data-svc-field="descripcion" rows="2" class="w-full rounded border p-1 text-xs">${String(s.descripcion).replace(/</g, '&lt;')}</textarea></td>
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
              const precio = parseFloat(row.querySelector('[data-svc-field="precio"]')?.value || '0') || 0;
              const orden = parseInt(row.querySelector('[data-svc-field="orden"]')?.value || '0', 10);
              const activo = row.querySelector('[data-svc-field="activo"]')?.checked ?? true;
              const descripcion = nextRow?.querySelector('[data-svc-field="descripcion"]')?.value || '';
              btn.setAttribute('disabled', 'true');
              try {
                const source = list.find((x) => x.id === id);
                await updateServicio({
                  id,
                  titulo,
                  descripcion,
                  imagenUrl: source?.imagenUrl || '',
                  precio,
                  orden,
                  activo
                });
                await publishAppUpdate('landing', 'Servicio actualizado');
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
          body.querySelectorAll('[data-svc-del]').forEach((btn) => {
            btn.addEventListener('click', async () => {
              const row = btn.closest('tr');
              const id = row?.getAttribute('data-svc-id');
              if (!id) return;
              if (!window.confirm('Eliminar servicio?')) return;
              await deleteServicio({ id });
              await publishAppUpdate('landing', 'Servicio eliminado');
              await loadServicios();
            });
          });
        } catch (e) {
          console.error(e);
          body.innerHTML = '<tr><td colspan="4" class="p-3 text-rose-600">Error cargando servicios.</td></tr>';
        }
      };

      let croppedServiceFile = null;
      const svcPick = document.getElementById('svc-new-image-pick');
      const svcFile = document.getElementById('svc-new-image-file');
      const svcClear = document.getElementById('svc-new-image-clear');
      const svcPrev = document.getElementById('svc-new-image-preview');
      const svcToggleCreate = document.getElementById('svc-toggle-create');
      const svcCreateWrap = document.getElementById('svc-create-wrap');
      svcToggleCreate?.addEventListener('click', () => svcCreateWrap?.classList.toggle('hidden'));
      svcPick?.addEventListener('click', () => svcFile?.click());
      svcFile?.addEventListener('change', async () => {
        const f = svcFile?.files?.[0];
        if (!f) return;
        try {
          const blob = await openImageCropModal({ file: f, aspectRatio: Number.NaN, title: 'Recortar imagen del servicio' });
          croppedServiceFile = new File([blob], 'servicio.jpg', { type: 'image/jpeg' });
          svcPrev.src = URL.createObjectURL(croppedServiceFile);
          svcPrev.classList.remove('hidden');
          svcClear?.classList.remove('hidden');
        } catch {}
      });
      svcClear?.addEventListener('click', () => {
        croppedServiceFile = null;
        if (svcFile) svcFile.value = '';
        svcPrev?.classList.add('hidden');
        svcClear?.classList.add('hidden');
      });

      document.getElementById('svc-new-btn')?.addEventListener('click', async () => {
        const titulo = document.getElementById('svc-new-title')?.value?.trim();
        const descripcion = document.getElementById('svc-new-desc')?.value?.trim() || '';
        const precio = parseFloat(document.getElementById('svc-new-price')?.value || '0') || 0;
        const orden = parseInt(document.getElementById('svc-new-order')?.value || '0', 10) || 0;
        if (!titulo) {
          await showAlert('Titulo requerido.', { title: 'Campo obligatorio', variant: 'warning' });
          return;
        }
        try {
          const user = auth.currentUser;
          if (!user?.uid) throw new Error('Sesion no valida.');
          let imagenUrl = '';
          if (croppedServiceFile) imagenUrl = await uploadServiceImage(croppedServiceFile, user.uid);
          await createServicio({ titulo, descripcion, imagenUrl, precio, orden, activo: true });
          await publishAppUpdate('landing', 'Servicio creado');
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
        const editedMapJson = mapEditor ? mapEditor.getJson() : getMapByContext();
        if (mapContext === 'parque') landing.mapaDistribucionJson = editedMapJson;
        if (mapContext === 'mesas') landing.mapaMesasJson = editedMapJson;
        if (mapContext === 'estacionamiento') landing.mapaEstacionamientoJson = editedMapJson;
        const botonesJson = JSON.stringify(collectBotonesFromDom());
        const payload = {
          id: LANDING_PAGE_ID,
          descripcionParque: document.getElementById('lp-descripcion')?.value || '',
          mapaDistribucionJson: landing.mapaDistribucionJson || DEFAULT_MAPA_JSON,
          mapaMesasJson: landing.mapaMesasJson || landing.mapaDistribucionJson || DEFAULT_MAPA_JSON,
          mapaEstacionamientoJson: landing.mapaEstacionamientoJson || landing.mapaDistribucionJson || DEFAULT_MAPA_JSON,
          imagenSatelitalUrl: document.getElementById('lp-satelite')?.value?.trim() || '',
          googleMapsUrl: document.getElementById('lp-maps')?.value?.trim() || '',
          horariosTexto: serializeScheduleConfig(scheduleConfig),
          abiertoAhora: document.getElementById('lp-abierto')?.checked ?? false,
          ocupacionTexto: document.getElementById('lp-ocupacion')?.value || '',
          estacionamientoTexto: document.getElementById('lp-estacionamiento')?.value || '',
          botonesJson
        };
        if (msg) msg.textContent = 'Guardando...';
        try {
          await upsertLandingPage(payload);
          await publishAppUpdate('landing', 'Contenido landing actualizado');
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

    let parkingReady = false;
    let parkingUnsub = null;
    const initParkingPanel = async () => {
      if (parkingReady) return;
      parkingReady = true;
      const mapEl = document.getElementById('parking-editor-map');
      const listEl = document.getElementById('parking-spots-list');
      const addBtn = document.getElementById('btn-parking-add');
      const idInput = document.getElementById('parking-new-id');
      const countersEl = document.getElementById('parking-counters');
      if (!mapEl || !listEl) return;

      let current = [];
      let parkingMapJson = DEFAULT_MAPA_JSON;
      try {
        const res = await getLandingPage({ id: LANDING_PAGE_ID });
        const landing = mergeLandingRow(res.data?.landingPage);
        parkingMapJson = landing.mapaEstacionamientoJson || landing.mapaDistribucionJson || DEFAULT_MAPA_JSON;
      } catch (error) {
        console.warn('Mapa de estacionamiento no disponible:', error);
      }

      const parkingStateMeta = (spot = {}) => {
        const state = ['libre', 'reservado', 'ocupado', 'sucio', 'mantenimiento', 'taller'].includes(spot.estado)
          ? spot.estado
          : 'ocupado';
        const labels = {
          libre: 'Libre',
          reservado: 'Reservado',
          ocupado: 'Ocupado',
          sucio: 'Sucio',
          mantenimiento: 'Mantenimiento',
          taller: 'Taller'
        };
        return { state, label: labels[state] || 'Ocupado' };
      };

      const renderCounters = () => {
        if (!countersEl) return;
        const total = current.length;
        const libres = current.filter((s) => s.estado === 'libre').length;
        const ocupados = current.filter((s) => s.estado === 'ocupado').length;
        const reservados = current.filter((s) => s.estado === 'reservado').length;
        const mantenimiento = current.filter((s) => s.estado === 'mantenimiento' || s.estado === 'sucio').length;
        const patio = current.filter((s) => (s.ubicacion || 'patio') === 'patio').length;
        const taller = current.filter((s) => s.estado === 'taller' || s.ubicacion === 'taller').length;
        const cards = [
          ['Totales', total, 'total'],
          ['Libres/listos', libres, 'free'],
          ['Ocupados', ocupados, 'busy'],
          ['Reservados', reservados, 'reserved'],
          ['Mantenimiento', mantenimiento, 'maintenance'],
          ['En patio', patio, 'yard'],
          ['En taller', taller, 'shop']
        ];
        countersEl.innerHTML = cards
          .map(([label, value, tone]) => `
            <article class="parking-counter-card is-${tone}">
              <p class="text-[11px] font-black uppercase tracking-wide text-slate-500">${label}</p>
              <p class="mt-1 text-2xl font-black">${value}</p>
            </article>
          `)
          .join('');
      };

      const render = () => {
        renderCounters();
        mapEl.innerHTML = `
          <canvas id="parking-editor-canvas" width="1000" height="620" class="absolute inset-0 h-full w-full"></canvas>
          <div class="parking-map-label left-4 top-4">Plano operativo</div>
          <div class="parking-map-label right-4 top-4">Entrada / Salida</div>
          <div class="parking-map-zone bottom-4 left-4">Patio</div>
          <div class="parking-map-zone bottom-4 right-4">Taller</div>
          <div class="parking-map-legend">
            <span><i class="state-libre"></i>Libre</span>
            <span><i class="state-reservado"></i>Reservado</span>
            <span><i class="state-ocupado"></i>Ocupado</span>
            <span><i class="state-mantenimiento"></i>Mantenimiento</span>
          </div>
          ${current
          .map((s) => {
            const x = Math.max(0, Math.min(95, Number(s.x || 0)));
            const y = Math.max(0, Math.min(90, Number(s.y || 0)));
            const meta = parkingStateMeta(s);
            const vehicle = s.placas || s.modelo
              ? `<span class="parking-chip-vehicle">${escapeHtml(s.placas || s.modelo)}</span>`
              : '<span class="parking-chip-vehicle is-empty">Sin unidad</span>';
            return `<button type="button" data-park-node="${escapeHtml(s.id)}" class="parking-vehicle-chip state-${meta.state}" style="left:${x}%;top:${y}%">
              <span class="parking-chip-id">${escapeHtml(s.id)}</span>
              <span class="parking-chip-state">${meta.label}</span>
              ${vehicle}
            </button>`;
          })
          .join('')}
        `;
        const bgCanvas = document.getElementById('parking-editor-canvas');
        if (bgCanvas) {
          drawDistribucionCanvas(bgCanvas, parkingMapJson, { view: 'estacionamiento', showItemIds: false, showKindBadge: false });
          bgCanvas.style.width = '100%';
          bgCanvas.style.height = '100%';
        }

        listEl.innerHTML = current
          .map((s) => {
            const meta = parkingStateMeta(s);
            const vehicleLabel = s.placas || s.modelo || 'Sin unidad';
            return `
            <div class="parking-spot-row">
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="parking-state-dot state-${meta.state}"></span>
                    <span class="font-black text-slate-900">${escapeHtml(s.id)}</span>
                  </div>
                  <p class="truncate text-xs text-slate-500">${escapeHtml(vehicleLabel)} · ${escapeHtml(s.ubicacion || 'patio')}</p>
                </div>
                <span class="parking-state-badge state-${meta.state}">${meta.label}</span>
              </div>
              <div class="parking-spot-grid mt-3">
                <select data-park-status="${escapeHtml(s.id)}" class="rounded-lg border border-slate-300 p-2 text-xs font-semibold">
                  <option value="libre" ${s.estado === 'libre' ? 'selected' : ''}>Libre</option>
                  <option value="reservado" ${s.estado === 'reservado' ? 'selected' : ''}>Reservado</option>
                  <option value="ocupado" ${s.estado === 'ocupado' ? 'selected' : ''}>Ocupado</option>
                  <option value="sucio" ${s.estado === 'sucio' ? 'selected' : ''}>Sucio</option>
                  <option value="mantenimiento" ${s.estado === 'mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
                  <option value="taller" ${s.estado === 'taller' ? 'selected' : ''}>Taller</option>
                </select>
                <input data-park-placas="${escapeHtml(s.id)}" class="rounded-lg border border-slate-300 p-2 text-xs" placeholder="Placas" value="${escapeHtml(s.placas || '')}" />
                <input data-park-modelo="${escapeHtml(s.id)}" class="rounded-lg border border-slate-300 p-2 text-xs" placeholder="Modelo" value="${escapeHtml(s.modelo || '')}" />
                <input data-park-resby="${escapeHtml(s.id)}" class="rounded-lg border border-slate-300 p-2 text-xs" placeholder="Reservado por" value="${escapeHtml(s.reservadoPor || '')}" />
                <select data-park-ubicacion="${escapeHtml(s.id)}" class="rounded-lg border border-slate-300 p-2 text-xs font-semibold">
                  <option value="patio" ${(s.ubicacion || 'patio') === 'patio' ? 'selected' : ''}>Patio</option>
                  <option value="taller" ${s.ubicacion === 'taller' ? 'selected' : ''}>Taller</option>
                  <option value="entrada" ${s.ubicacion === 'entrada' ? 'selected' : ''}>Entrada</option>
                </select>
                <div class="flex gap-1">
                  <button data-park-save="${escapeHtml(s.id)}" class="rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-700">Guardar</button>
                  <button data-park-del="${escapeHtml(s.id)}" class="rounded-lg bg-rose-600 px-3 py-2 text-xs font-black text-white hover:bg-rose-700">Eliminar</button>
                </div>
              </div>
            </div>
          `;
          })
          .join('');

        document.querySelectorAll('[data-park-save]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-park-save');
            const estado = document.querySelector(`[data-park-status="${id}"]`)?.value || 'libre';
            const placas = document.querySelector(`[data-park-placas="${id}"]`)?.value || '';
            const modelo = document.querySelector(`[data-park-modelo="${id}"]`)?.value || '';
            const reservadoPor = document.querySelector(`[data-park-resby="${id}"]`)?.value || '';
            const ubicacion = document.querySelector(`[data-park-ubicacion="${id}"]`)?.value || 'patio';
            await updateParkingSpot(id, { estado, placas, modelo, reservadoPor, ubicacion });
            await publishAppUpdate('parking', `Spot ${id} actualizado`);
          });
        });
        document.querySelectorAll('[data-park-del]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-park-del');
            await removeParkingSpot(id);
            await publishAppUpdate('parking', `Spot ${id} eliminado`);
          });
        });

        document.querySelectorAll('[data-park-node]').forEach((node) => {
          node.addEventListener('mousedown', (ev) => {
            ev.preventDefault();
            const id = node.getAttribute('data-park-node');
            const rect = mapEl.getBoundingClientRect();
            const onMove = (mev) => {
              const nx = ((mev.clientX - rect.left) / rect.width) * 100;
              const ny = ((mev.clientY - rect.top) / rect.height) * 100;
              node.style.left = `${Math.max(0, Math.min(95, nx))}%`;
              node.style.top = `${Math.max(0, Math.min(90, ny))}%`;
            };
            const onUp = async (uev) => {
              const nx = ((uev.clientX - rect.left) / rect.width) * 100;
              const ny = ((uev.clientY - rect.top) / rect.height) * 100;
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
              await updateParkingSpot(id, { x: Math.max(0, Math.min(95, nx)), y: Math.max(0, Math.min(90, ny)) });
              await publishAppUpdate('parking', `Spot ${id} movido`);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          });
        });
      };

      parkingUnsub = subscribeParkingSpots(
        (spots) => {
          current = spots;
          render();
        },
        (error) => {
          if (error?.code === 'permission-denied') {
            listEl.innerHTML =
              '<span class="text-amber-700">Sin permiso de lectura de estacionamiento. Revisa tu rol o las reglas Firestore.</span>';
            return;
          }
          console.warn('Estacionamiento:', error);
          listEl.innerHTML = '<span class="text-rose-600">No se pudo cargar estacionamiento.</span>';
        }
      );

      addBtn?.addEventListener('click', async () => {
        const id = (idInput?.value || '').trim().toUpperCase();
        if (!id) return;
        await upsertParkingSpot({ id, x: 10, y: 10, estado: 'libre' });
        await publishAppUpdate('parking', `Spot ${id} creado`);
        idInput.value = '';
      });
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

      // Modal de edición/eliminación de productos (sin prompts nativos)
      let croppedProductEditFile = null;
      let prodEditImageShouldClear = false;
      let prodEditPreviewObjectUrl = null;
      let prodEditTarget = null;
      let prodDeleteTarget = null;

      const prodEditModal = document.getElementById('prod-edit-modal');
      const prodEditError = document.getElementById('prod-edit-error');
      const prodEditTitulo = document.getElementById('prod-edit-titulo');
      const prodEditDesc = document.getElementById('prod-edit-desc');
      const prodEditPrecio = document.getElementById('prod-edit-precio');
      const prodEditImageFile = document.getElementById('prod-edit-image-file');
      const prodEditImagePick = document.getElementById('prod-edit-image-pick');
      const prodEditImageClear = document.getElementById('prod-edit-image-clear');
      const prodEditImagePreviewWrap = document.getElementById('prod-edit-image-preview-wrap');
      const prodEditImagePreview = document.getElementById('prod-edit-image-preview');
      const prodEditSaveBtn = document.getElementById('prod-edit-save');
      const prodEditCancelBtn = document.getElementById('prod-edit-cancel');
      const prodEditCancelBtn2 = document.getElementById('prod-edit-cancel-2');

      const prodDeleteModal = document.getElementById('prod-delete-modal');
      const prodDeleteMsg = document.getElementById('prod-delete-msg');
      const prodDeleteConfirmBtn = document.getElementById('prod-delete-confirm');
      const prodDeleteCancelBtn = document.getElementById('prod-delete-cancel');
      const prodDeleteCancelBtn2 = document.getElementById('prod-delete-cancel-2');

      const closeProdEdit = () => {
        prodEditModal?.classList.add('hidden');
        prodEditError?.classList.add('hidden');
        prodEditError && (prodEditError.textContent = '');
        prodEditTarget = null;
        croppedProductEditFile = null;
        prodEditImageShouldClear = false;
        if (prodEditPreviewObjectUrl) {
          try {
            URL.revokeObjectURL(prodEditPreviewObjectUrl);
          } catch {
            /* noop */
          }
        }
        prodEditPreviewObjectUrl = null;
        if (prodEditImagePreview) prodEditImagePreview.src = '';
        if (prodEditImagePreviewWrap) prodEditImagePreviewWrap.classList.add('hidden');
        if (prodEditImageClear) prodEditImageClear.classList.add('hidden');
        if (prodEditImageFile) prodEditImageFile.value = '';
      };

      const openProdEdit = (p) => {
        prodEditTarget = p;
        prodEditError?.classList.add('hidden');
        prodEditError && (prodEditError.textContent = '');
        croppedProductEditFile = null;
        prodEditImageShouldClear = false;

        if (prodEditPreviewObjectUrl) {
          try {
            URL.revokeObjectURL(prodEditPreviewObjectUrl);
          } catch {
            /* noop */
          }
        }
        prodEditPreviewObjectUrl = null;

        if (prodEditTitulo) prodEditTitulo.value = p.titulo || '';
        if (prodEditDesc) prodEditDesc.value = p.descripcion || '';
        if (prodEditPrecio) prodEditPrecio.value = Number(p.precio || 0);

        const hasImg = Boolean(p.imagenUrl);
        if (prodEditImagePreviewWrap) prodEditImagePreviewWrap.classList.toggle('hidden', !hasImg);
        if (prodEditImageClear) prodEditImageClear.classList.toggle('hidden', !hasImg);
        if (prodEditImagePreview) prodEditImagePreview.src = hasImg ? p.imagenUrl : '';
        if (prodEditImageFile) prodEditImageFile.value = '';
      };

      const closeProdDelete = () => {
        prodDeleteModal?.classList.add('hidden');
        prodDeleteTarget = null;
      };

      const openProdDelete = (p) => {
        prodDeleteTarget = p;
        if (prodDeleteMsg) prodDeleteMsg.textContent = `¿Eliminar "${p.titulo}"? Esta accion no se puede deshacer.`;
        prodDeleteModal?.classList.remove('hidden');
      };

      if (prodEditModal) {
        prodEditModal.addEventListener('click', (ev) => {
          if (ev.target?.getAttribute('data-prod-edit-backdrop') != null) closeProdEdit();
        });
        prodEditCancelBtn?.addEventListener('click', closeProdEdit);
        prodEditCancelBtn2?.addEventListener('click', closeProdEdit);

        prodEditImagePick?.addEventListener('click', () => prodEditImageFile?.click());
        prodEditImageClear?.addEventListener('click', () => {
          prodEditImageShouldClear = true;
          croppedProductEditFile = null;
          if (prodEditPreviewObjectUrl) {
            try {
              URL.revokeObjectURL(prodEditPreviewObjectUrl);
            } catch {
              /* noop */
            }
          }
          prodEditPreviewObjectUrl = null;
          prodEditImagePreview && (prodEditImagePreview.src = '');
          prodEditImagePreviewWrap?.classList.add('hidden');
          prodEditImageClear?.classList.add('hidden');
          if (prodEditImageFile) prodEditImageFile.value = '';
        });

        prodEditImageFile?.addEventListener('change', async () => {
          const f = prodEditImageFile?.files?.[0];
          if (!f) return;
          if (!prodEditImagePreview || !prodEditImagePreviewWrap) return;
          try {
            const blob = await openImageCropModal({
              file: f,
              aspectRatio: Number.NaN,
              title: 'Recortar imagen del producto'
            });
            const nameBase = (f.name && f.name.replace(/\.\w+$/, '')) || 'producto';
            croppedProductEditFile = new File([blob], `${nameBase}.jpg`, { type: 'image/jpeg' });
            prodEditImageShouldClear = false;

            if (prodEditPreviewObjectUrl) {
              try {
                URL.revokeObjectURL(prodEditPreviewObjectUrl);
              } catch {
                /* noop */
              }
            }
            prodEditPreviewObjectUrl = URL.createObjectURL(croppedProductEditFile);
            prodEditImagePreview.src = prodEditPreviewObjectUrl;
            prodEditImagePreviewWrap.classList.remove('hidden');
            prodEditImageClear?.classList.remove('hidden');
          } catch (e) {
            if (e?.name === 'AbortError') return;
            console.error(e);
            if (prodEditError) {
              prodEditError.textContent = e?.message || 'No se pudo procesar la imagen.';
              prodEditError.classList.remove('hidden');
            }
          }
        });

        prodEditSaveBtn?.addEventListener('click', async () => {
          if (!prodEditTarget) return;
          const titulo = prodEditTitulo?.value?.trim() || '';
          const descripcion = prodEditDesc?.value?.trim() || '';
          const precio = parseFloat(prodEditPrecio?.value || '0');

          if (!titulo || !(precio > 0)) {
            if (prodEditError) {
              prodEditError.textContent = 'Titulo y precio valido son obligatorios.';
              prodEditError.classList.remove('hidden');
            }
            return;
          }

          const user = auth.currentUser;
          if (!user?.uid) {
            if (prodEditError) {
              prodEditError.textContent = 'Sesion no valida. Vuelve a iniciar sesion.';
              prodEditError.classList.remove('hidden');
            }
            return;
          }

          try {
            let imagenUrl = prodEditTarget.imagenUrl || '';
            if (prodEditImageShouldClear) imagenUrl = '';
            if (croppedProductEditFile) {
              imagenUrl = await uploadProductImage(croppedProductEditFile, user.uid);
            }

            await updateProducto({
              id: prodEditTarget.id,
              titulo,
              descripcion,
              imagenUrl,
              precio,
              activo: Boolean(prodEditTarget.activo)
            });
            await publishAppUpdate('inventory', `Producto ${prodEditTarget.id} editado`);
            closeProdEdit();
            await loadProductos();
          } catch (e) {
            console.error(e);
            if (prodEditError) {
              prodEditError.textContent = e?.message || 'No se pudo guardar el producto.';
              prodEditError.classList.remove('hidden');
            }
          }
        });
      }

      if (prodDeleteModal) {
        prodDeleteModal.addEventListener('click', (ev) => {
          if (ev.target?.getAttribute('data-prod-delete-backdrop') != null) closeProdDelete();
        });
        prodDeleteCancelBtn?.addEventListener('click', closeProdDelete);
        prodDeleteCancelBtn2?.addEventListener('click', closeProdDelete);

        prodDeleteConfirmBtn?.addEventListener('click', async () => {
          if (!prodDeleteTarget) return;
          try {
            await deleteProducto({ id: prodDeleteTarget.id });
            await publishAppUpdate('inventory', `Producto ${prodDeleteTarget.id} eliminado`);
            closeProdDelete();
            await loadProductos();
          } catch (e) {
            console.error(e);
            closeProdDelete();
            await loadProductos();
          }
        });
      }

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
        await publishAppUpdate('inventory', `${tipo} ${producto.id}`);
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
                  <div class="flex min-w-0 flex-1 gap-3">
                    ${
                      p.imagenUrl
                        ? `<img src="${escapeHtml(p.imagenUrl)}" alt="" class="h-20 w-20 flex-shrink-0 rounded-lg border border-slate-200 object-cover" loading="lazy" />`
                        : ''
                    }
                    <div class="min-w-0">
                    <h4 class="font-bold text-slate-900">${escapeHtml(p.titulo)}</h4>
                    <p class="text-xs text-slate-500">${escapeHtml(p.descripcion || '')}</p>
                    <p class="mt-1 text-sm font-semibold text-slate-700">$${(p.precio || 0).toFixed(2)}</p>
                    <div class="mt-2 flex flex-wrap gap-2 text-xs">
                      <span class="rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-800">Stock: ${p.stockActual}</span>
                      <span class="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-800">Reservados: ${p.reservadoAprox}</span>
                    </div>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button data-prod-show-mov="${p.id}" class="rounded border border-slate-300 px-3 py-1 text-xs font-semibold hover:bg-white">Historial</button>
                    ${canManage ? `<button data-prod-edit="${p.id}" class="rounded border border-cyan-300 px-3 py-1 text-xs font-semibold text-cyan-700 hover:bg-cyan-50">Editar</button>` : ""}
                    ${canManage ? `<button data-prod-del="${p.id}" class="rounded border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50">Eliminar</button>` : ""}
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
          if (canManage) {
            document.querySelectorAll('[data-prod-edit]').forEach((btn) =>
              btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-prod-edit');
                const p = byId.get(id);
                if (!p) return;
                openProdEdit(p);
              })
            );
            document.querySelectorAll('[data-prod-del]').forEach((btn) =>
              btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-prod-del');
                const p = byId.get(id);
                if (!p) return;
                openProdDelete(p);
              })
            );
          }

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
          if (isDataConnectNotDeployed(error)) {
            wrap.innerHTML = `<p class="text-sm text-amber-800">El servicio de inventario no esta desplegado o no esta actualizado. En el proyecto ejecuta: <code class="rounded bg-amber-100 px-1">npx firebase-tools@latest dataconnect:sql:migrate</code> (si aplica) y luego <code class="rounded bg-amber-100 px-1">npx firebase-tools@latest deploy --only dataconnect</code>, y vuelve a publicar la web.</p>`;
            return;
          }
          console.error(error);
          wrap.innerHTML = '<p class="text-rose-600">Error cargando inventario.</p>';
        }
      };

      const fileInput = document.getElementById('prod-image-file');
      const pickBtn = document.getElementById('prod-image-pick');
      const prodToggleCreate = document.getElementById('prod-toggle-create');
      const prodCreateWrap = document.getElementById('prod-create-wrap');
      prodToggleCreate?.addEventListener('click', () => prodCreateWrap?.classList.toggle('hidden'));
      const clearBtn = document.getElementById('prod-image-clear');
      const previewWrap = document.getElementById('prod-image-preview-wrap');
      const previewImg = document.getElementById('prod-image-preview');
      let croppedProductFile = null;

      const clearProdImageUi = () => {
        croppedProductFile = null;
        if (previewImg?.src?.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(previewImg.src);
          } catch {
            /* noop */
          }
        }
        if (fileInput) fileInput.value = '';
        if (previewImg) {
          previewImg.removeAttribute('src');
        }
        previewWrap?.classList.add('hidden');
        clearBtn?.classList.add('hidden');
      };

      pickBtn?.addEventListener('click', () => fileInput?.click());
      fileInput?.addEventListener('change', async () => {
        const f = fileInput?.files?.[0];
        if (!f) {
          clearProdImageUi();
          return;
        }
        if (!previewImg || !previewWrap) return;
        let blob;
        try {
          blob = await openImageCropModal({
            file: f,
            aspectRatio: Number.NaN,
            title: 'Recortar imagen del producto'
          });
        } catch (e) {
          if (e?.name === 'AbortError') {
            clearProdImageUi();
            return;
          }
          console.error(e);
          await showAlert(e?.message || 'No se pudo procesar la imagen.', { title: 'Imagen', variant: 'danger' });
          clearProdImageUi();
          return;
        }
        const nameBase = (f.name && f.name.replace(/\.\w+$/, '')) || 'producto';
        croppedProductFile = new File([blob], `${nameBase}.jpg`, { type: 'image/jpeg' });
        if (previewImg.src?.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(previewImg.src);
          } catch {
            /* noop */
          }
        }
        previewImg.src = URL.createObjectURL(croppedProductFile);
        previewWrap.classList.remove('hidden');
        clearBtn?.classList.remove('hidden');
      });
      clearBtn?.addEventListener('click', () => clearProdImageUi());

      document.getElementById('btn-create-producto')?.addEventListener('click', async () => {
        if (!canManage) return;
        const titulo = document.getElementById('prod-title')?.value?.trim();
        const descripcion = document.getElementById('prod-desc')?.value?.trim() || '';
        const precio = parseFloat(document.getElementById('prod-price')?.value || '0');
        const stockActual = parseInt(document.getElementById('prod-stock')?.value || '0', 10) || 0;
        const imageFile = croppedProductFile || fileInput?.files?.[0] || null;
        if (!titulo || precio <= 0) {
          await showAlert('Completa titulo y precio del producto.', { title: 'Producto', variant: 'warning' });
          return;
        }
        const user = auth.currentUser;
        if (!user?.uid) {
          await showAlert('Sesion no valida. Vuelve a iniciar sesion.', { title: 'Sesion', variant: 'danger' });
          return;
        }
        try {
          let imagenUrl = '';
          if (imageFile) {
            imagenUrl = await uploadProductImage(imageFile, user.uid);
          }
          await createProducto({
            titulo,
            descripcion,
            imagenUrl,
            precio,
            stockActual,
            reservadoAprox: 0,
            activo: true
          });
          await publishAppUpdate('inventory', `Producto ${titulo} creado`);
          document.getElementById('prod-title').value = '';
          document.getElementById('prod-desc').value = '';
          document.getElementById('prod-price').value = '';
          document.getElementById('prod-stock').value = '';
          clearProdImageUi();
          await loadProductos();
          await showAlert('Producto creado correctamente.', { title: 'Inventario', variant: 'success' });
        } catch (e) {
          console.error(e);
          const msg = isDataConnectNotDeployed(e)
            ? 'Data Connect no tiene las operaciones de inventario desplegadas. Ejecuta deploy de dataconnect desde la carpeta del proyecto.'
            : e?.message || 'No se pudo crear el producto.';
          await showAlert(msg, { title: 'Error', variant: 'danger' });
        }
      });

      document.getElementById('btn-refresh-inventory')?.addEventListener('click', loadProductos);
      await loadProductos();
    };

    const initialSection =
      requestedInitialSection === 'admin' && panelAdmin
        ? 'admin'
        : requestedInitialSection === 'parking' && panelParking
          ? 'parking'
        : requestedInitialSection === 'inventario' && panelInventario
          ? 'inventario'
        : requestedInitialSection === 'sitio' && panelSitio
          ? 'sitio'
          : 'tickets';
    showSection(initialSection);
    if (requestedInitialSection === 'parking' && panelParking) initParkingPanel();
    if (requestedInitialSection === 'inventario' && panelInventario) initInventarioPanel();
    if (requestedInitialSection === 'sitio' && panelSitio) {
      await initSitioPanel();
      if (mapEditorFocus) {
        requestAnimationFrame(() => {
          document.querySelector('.mapa-editor-shell')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
    }

    const cfgAdulto = document.getElementById('cfg-precio-adulto');
    const cfgNino = document.getElementById('cfg-precio-nino');
    const cfgMayor = document.getElementById('cfg-precio-mayor');
    const cfgSaveBtn = document.getElementById('cfg-save-prices');
    const cfgStatus = document.getElementById('cfg-prices-status');
    const discCreateBtn = document.getElementById('disc-create-btn');
    const discRefreshBtn = document.getElementById('disc-refresh-btn');
    const discList = document.getElementById('disc-list');
    const discCreateStatus = document.getElementById('disc-create-status');
    const discCode = document.getElementById('disc-code');
    const discType = document.getElementById('disc-type');
    const discValue = document.getElementById('disc-value');
    const discUses = document.getElementById('disc-uses');
    const discActive = document.getElementById('disc-active');
    const discRulesJson = document.getElementById('disc-rules-json');

    const setCfgStatus = (msg, ok = false) => {
      if (!cfgStatus) return;
      cfgStatus.textContent = msg || '';
      cfgStatus.className = `text-xs font-semibold ${ok ? 'text-emerald-700' : 'text-slate-600'}`;
    };
    const setDiscStatus = (msg, ok = false) => {
      if (!discCreateStatus) return;
      discCreateStatus.textContent = msg || '';
      discCreateStatus.className = `text-xs font-semibold ${ok ? 'text-emerald-700' : 'text-slate-600'}`;
    };
    const safeRulesJson = (value) => {
      try {
        const parsed = JSON.parse(value || '[]');
        return JSON.stringify(Array.isArray(parsed) ? parsed : []);
      } catch {
        throw new Error('Reglas JSON invalido.');
      }
    };
    const renderDescuentos = async () => {
      if (!discList) return;
      discList.innerHTML = 'Cargando descuentos...';
      try {
        const res = await listDescuentosAdmin();
        const rows = res.data?.descuentos || [];
        if (!rows.length) {
          discList.innerHTML = '<p class="text-slate-500">Sin descuentos configurados.</p>';
          return;
        }
        discList.innerHTML = rows
          .map((d) => `
            <article class="rounded-lg border border-slate-200 p-3" data-disc-row="${d.id}">
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-6">
                <input data-disc-code type="text" value="${escapeHtml(d.codigo)}" class="rounded border p-2 text-sm uppercase" />
                <select data-disc-type class="rounded border p-2 text-sm">
                  <option value="porcentaje" ${d.tipo === 'porcentaje' ? 'selected' : ''}>Porcentaje</option>
                  <option value="monto" ${d.tipo === 'monto' ? 'selected' : ''}>Monto</option>
                </select>
                <input data-disc-value type="number" min="0" step="0.01" value="${Number(d.descuento || 0)}" class="rounded border p-2 text-sm" />
                <input data-disc-uses type="number" min="0" step="1" value="${Number(d.usosRestantes || 0)}" class="rounded border p-2 text-sm" />
                <label class="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm font-semibold"><input data-disc-active type="checkbox" ${d.activo ? 'checked' : ''} /> Activo</label>
                <div class="flex items-center justify-end gap-2">
                  <button type="button" data-disc-save class="rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">Guardar</button>
                  <button type="button" data-disc-del class="rounded bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700">Eliminar</button>
                </div>
              </div>
              <textarea data-disc-rules rows="2" class="mt-2 w-full rounded border p-2 text-xs font-mono">${escapeHtml(d.reglasJson || '[]')}</textarea>
              <p data-disc-status class="mt-2 text-xs font-semibold text-slate-500"></p>
            </article>
          `)
          .join('');

        discList.querySelectorAll('[data-disc-save]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const row = btn.closest('[data-disc-row]');
            if (!row) return;
            const id = row.getAttribute('data-disc-row');
            const status = row.querySelector('[data-disc-status]');
            const setStatus = (msg, ok = false) => {
              if (!status) return;
              status.textContent = msg || '';
              status.className = `mt-2 text-xs font-semibold ${ok ? 'text-emerald-700' : 'text-slate-500'}`;
            };
            try {
              const reglas = safeRulesJson(row.querySelector('[data-disc-rules]')?.value || '[]');
              await updateDescuento({
                id,
                codigo: String(row.querySelector('[data-disc-code]')?.value || '').trim().toUpperCase(),
                tipo: String(row.querySelector('[data-disc-type]')?.value || 'porcentaje'),
                descuento: Number(row.querySelector('[data-disc-value]')?.value || 0),
                usosRestantes: Math.max(0, Number(row.querySelector('[data-disc-uses]')?.value || 0)),
                activo: Boolean(row.querySelector('[data-disc-active]')?.checked),
                reglasJson: reglas
              });
              setStatus('Descuento actualizado.', true);
              await publishAppUpdate('sales', `discount-update:${id}`);
            } catch (e) {
              setStatus(e?.message || 'No se pudo guardar.');
            }
          });
        });
        discList.querySelectorAll('[data-disc-del]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const row = btn.closest('[data-disc-row]');
            if (!row) return;
            const id = row.getAttribute('data-disc-row');
            const status = row.querySelector('[data-disc-status]');
            try {
              await deleteDescuento({ id });
              if (status) status.textContent = 'Eliminado.';
              await publishAppUpdate('sales', `discount-delete:${id}`);
              await renderDescuentos();
            } catch (e) {
              if (status) status.textContent = e?.message || 'No se pudo eliminar.';
            }
          });
        });
      } catch (e) {
        discList.innerHTML = `<p class="text-rose-600">${escapeHtml(e?.message || 'No se pudieron cargar descuentos.')}</p>`;
      }
    };

    if (cfgSaveBtn && cfgAdulto && cfgNino && cfgMayor) {
      try {
        const cfg = await getConfiguracion({ id: TICKET_CONFIG_ID });
        const row = cfg.data?.configuracion;
        if (row) {
          cfgAdulto.value = String(Number(row.precioAdulto || 0));
          cfgNino.value = String(Number(row.precioNino || 0));
          cfgMayor.value = String(Number(row.precioMayor || 0));
        }
      } catch (e) {
        setCfgStatus('Sin configuracion previa, completa y guarda.');
      }
      cfgSaveBtn.addEventListener('click', async () => {
        try {
          cfgSaveBtn.disabled = true;
          setCfgStatus('Guardando...');
          await upsertConfiguracion({
            id: TICKET_CONFIG_ID,
            precioAdulto: Number(cfgAdulto.value || 0),
            precioNino: Number(cfgNino.value || 0),
            precioMayor: Number(cfgMayor.value || 0)
          });
          setCfgStatus('Precios guardados.', true);
          await publishAppUpdate('sales', 'ticket-prices-updated');
        } catch (e) {
          setCfgStatus(e?.message || 'No se pudo guardar precios.');
        } finally {
          cfgSaveBtn.disabled = false;
        }
      });
    }
    if (discCreateBtn) {
      discCreateBtn.addEventListener('click', async () => {
        try {
          discCreateBtn.disabled = true;
          setDiscStatus('Creando...');
          const reglas = safeRulesJson(discRulesJson?.value || '[]');
          await createDescuento({
            codigo: String(discCode?.value || '').trim().toUpperCase(),
            tipo: String(discType?.value || 'porcentaje'),
            descuento: Number(discValue?.value || 0),
            usosRestantes: Math.max(1, Number(discUses?.value || 1)),
            activo: Boolean(discActive?.checked),
            reglasJson: reglas
          });
          setDiscStatus('Descuento creado.', true);
          if (discCode) discCode.value = '';
          if (discValue) discValue.value = '';
          if (discUses) discUses.value = '1';
          if (discRulesJson) discRulesJson.value = '';
          if (discActive) discActive.checked = true;
          await publishAppUpdate('sales', 'discount-created');
          await renderDescuentos();
        } catch (e) {
          setDiscStatus(e?.message || 'No se pudo crear descuento.');
        } finally {
          discCreateBtn.disabled = false;
        }
      });
    }
    discRefreshBtn?.addEventListener('click', renderDescuentos);
    if (discList) await renderDescuentos();

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
                            ${canScan
                              ? `<td class="p-4 border-b text-right">
                                  ${
                                    data.estadoTicket === 'valido'
                                      ? `<button type="button" data-ticket-register="${data.id}" class="rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">Registrar entrada</button>`
                                      : '<span class="text-xs font-semibold text-slate-400">Sin acción</span>'
                                  }
                                </td>`
                              : ''}
                        </tr>
                    `;
        });
        tableBody.innerHTML = html;
        if (canScan) {
          tableBody.querySelectorAll('[data-ticket-register]').forEach((btn) => {
            btn.addEventListener('click', async () => {
              const id = btn.getAttribute('data-ticket-register');
              if (!id) return;
              btn.setAttribute('disabled', 'true');
              btn.textContent = 'Registrando...';
              try {
                await updateTicketStatus({ id, estadoTicket: 'escaneado', estadoPago: 'pagado' });
                await publishAppUpdate('tickets', `entrada:${id}`);
                await loadTickets();
              } catch (err) {
                console.error('No se pudo registrar entrada:', err);
                btn.removeAttribute('disabled');
                btn.textContent = 'Reintentar';
              }
            });
          });
        }
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
        await publishAppUpdate('packages', `Paquete ${name} creado`);
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
