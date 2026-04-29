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
import {
  createDistribucionEditor,
  DEFAULT_MAPA_JSON,
  MAP_ITEM_KINDS,
  getMapKind,
  parseDistribucionJson
} from '../lib/distribucionMapa.js';
import { getUserAccess } from '../lib/accessControl.js';
import { icon } from '../lib/icons.js';
import { showAlert } from '../lib/appDialog.js';
import { subscribeParkingSpots, upsertParkingSpot, updateParkingSpot, removeParkingSpot } from '../lib/parkingRealtime.js';
import { defaultScheduleConfig, parseScheduleConfig, serializeScheduleConfig, scheduleDays } from '../lib/schedule.js';
import { publishAppUpdate } from '../lib/realtimeSync.js';
import { uploadProductImage } from '../lib/uploadProductImage.js';

const LANDING_PAGE_ID = 'main';

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

                ${canParking ? `<div id="admin-panel-parking" class="hidden space-y-6">
                  <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 class="text-2xl font-black text-slate-900">Mapa de estacionamiento (tiempo real)</h2>
                    <p class="mt-1 text-sm text-slate-600">Arrastra spots para ubicarlos y actualiza estado/vehículo en vivo.</p>
                  </div>
                  <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
                    <div class="flex flex-wrap items-center gap-2">
                      <input id="parking-new-id" class="rounded border p-2 text-sm" placeholder="ID spot (ej. P-01)" />
                      <button id="btn-parking-add" class="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Agregar spot</button>
                    </div>
                    <div id="parking-editor-map" class="relative h-[420px] overflow-hidden rounded-lg border border-slate-200 bg-slate-100"></div>
                  </div>
                  <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 class="font-bold text-lg mb-3">Spots y estado</h3>
                    <div id="parking-spots-list" class="space-y-2 text-sm text-slate-600">Cargando...</div>
                  </div>
                </div>` : ''}

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
                          <header class="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
                            <div class="flex min-w-0 flex-1 items-start gap-3">
                              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">${icon('map', 'h-6 w-6')}</span>
                              <div class="min-w-0">
                                <h2 class="text-base font-black tracking-tight text-white">Editor del mapa del parque</h2>
                                <p class="text-xs text-slate-400">Elige tipo → <strong class="text-cyan-300">Dibujar</strong> en el lienzo (arrastra) · mueve y redimensiona con el raton · <kbd class="rounded bg-white/10 px-1">Esc</kbd> cancela dibujo</p>
                              </div>
                            </div>
                            <div class="flex flex-wrap gap-2">
                              <button type="button" id="mapa-preset-row" class="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10" title="Tres piezas en fila del tipo activo">Fila ×3</button>
                              <button type="button" id="mapa-preset-wide" class="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10" title="Rectangulo ancho">Bloque ancho</button>
                              <button type="button" id="mapa-add-quick" class="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-black text-white hover:bg-cyan-500">+ Pieza rapida</button>
                            </div>
                          </header>

                          <div class="flex flex-wrap gap-2 border-b border-white/5 bg-black/25 px-4 py-2">
                            ${MAP_ITEM_KINDS.map(
                              (kind) => `
                              <button type="button" class="mapa-tool-btn inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-300 hover:bg-white/10"
                                data-map-tool="${kind.value}" title="${escapeHtml(kind.label)}">
                                <span class="h-2 w-2 shrink-0 rounded-full" style="background:${kind.stroke}"></span>
                                ${kind.label}
                              </button>`
                            ).join('')}
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
                              <div id="mapa-editor-fields" class="hidden flex-1 space-y-3">
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
                                <div class="grid grid-cols-2 gap-2">
                                  <label class="text-[10px] font-bold uppercase text-slate-500">X<input id="mapa-item-x" type="number" class="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white" /></label>
                                  <label class="text-[10px] font-bold uppercase text-slate-500">Y<input id="mapa-item-y" type="number" class="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white" /></label>
                                  <label class="text-[10px] font-bold uppercase text-slate-500">Ancho<input id="mapa-item-width" type="number" min="20" class="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white" /></label>
                                  <label class="text-[10px] font-bold uppercase text-slate-500">Alto<input id="mapa-item-height" type="number" min="20" class="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white" /></label>
                                </div>
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
                                <label class="block text-[10px] font-bold uppercase text-slate-500">Notas internas
                                  <textarea id="mapa-item-notes" rows="2" class="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-600"></textarea>
                                </label>
                                <div class="grid grid-cols-2 gap-2 pt-1">
                                  <button type="button" id="mapa-duplicate" class="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white hover:bg-white/10">Duplicar</button>
                                  <button type="button" id="mapa-delete" class="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20">Eliminar</button>
                                  <button type="button" id="mapa-layer-back" class="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10">Atras</button>
                                  <button type="button" id="mapa-layer-front" class="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10">Frente</button>
                                </div>
                              </div>
                            </aside>
                          </div>

                          <footer class="flex flex-wrap gap-2 border-t border-white/10 bg-black/30 px-4 py-3">
                            <span class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Leyenda</span>
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
    const panelParking = document.getElementById('admin-panel-parking');
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
      const parsedMapDims = parseDistribucionJson(landing.mapaDistribucionJson);
      setVal('mapa-doc-w', parsedMapDims.w);
      setVal('mapa-doc-h', parsedMapDims.h);
      const abierto = document.getElementById('lp-abierto');
      if (abierto) abierto.checked = landing.abiertoAhora;

      setBotonesUi(landing.botonesJson);

      const wireMapEditorUi = () => {
        const fieldsWrap = document.getElementById('mapa-editor-fields');
        const emptyState = document.getElementById('mapa-empty-state');
        const pill = document.getElementById('mapa-selected-kind-pill');
        const fieldIds = {
          id: 'mapa-item-id',
          kind: 'mapa-item-kind',
          label: 'mapa-item-label',
          x: 'mapa-item-x',
          y: 'mapa-item-y',
          width: 'mapa-item-width',
          height: 'mapa-item-height',
          locked: 'mapa-item-locked',
          notes: 'mapa-item-notes'
        };
        let syncing = false;

        const el = (key) => document.getElementById(fieldIds[key]);
        const setDisabled = (disabled) => {
          fieldsWrap?.classList.toggle('hidden', disabled);
          emptyState?.classList.toggle('hidden', !disabled);
          document.querySelectorAll('#mapa-editor-fields input, #mapa-editor-fields select, #mapa-editor-fields textarea, #mapa-editor-fields button').forEach((node) => {
            node.disabled = disabled;
          });
        };
        const fillFields = (item) => {
          syncing = true;
          const drawHint = document.getElementById('mapa-draw-hint');
          if (drawHint && item) drawHint.classList.add('hidden');
          if (!item) {
            setDisabled(true);
            if (pill) {
              pill.textContent = 'Sin seleccion';
              pill.className = 'rounded-full bg-slate-700 px-2 py-1 text-[10px] font-bold text-slate-300';
            }
            syncing = false;
            return;
          }
          setDisabled(false);
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
          el('locked').checked = Boolean(item.locked);
          el('notes').value = item.notes || '';
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
            locked: el('locked')?.checked || false,
            notes: el('notes')?.value || '',
            fill: kind.fill,
            stroke: kind.stroke
          };
        };

        Object.values(fieldIds).forEach((id) => {
          const node = document.getElementById(id);
          node?.addEventListener('input', () => {
            if (syncing) return;
            mapEditor?.updateSelected(collectPatch());
          });
          node?.addEventListener('change', () => {
            if (syncing) return;
            mapEditor?.updateSelected(collectPatch());
          });
        });

        document.getElementById('mapa-delete')?.addEventListener('click', () => mapEditor?.deleteSelected());
        document.getElementById('mapa-duplicate')?.addEventListener('click', () => mapEditor?.duplicateSelected());
        document.getElementById('mapa-layer-back')?.addEventListener('click', () => mapEditor?.moveSelectedLayer(-1));
        document.getElementById('mapa-layer-front')?.addEventListener('click', () => mapEditor?.moveSelectedLayer(1));
        document.querySelectorAll('[data-map-nudge]').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (syncing) return;
            const dx = parseInt(btn.getAttribute('data-dx') || '0', 10);
            const dy = parseInt(btn.getAttribute('data-dy') || '0', 10);
            const cur = mapEditor?.getSelected();
            if (!cur || cur.locked) return;
            mapEditor?.updateSelected({ x: cur.x + dx, y: cur.y + dy });
          });
        });
        mapEditor?.onSelectionChange(fillFields);
        fillFields(null);
      };

      const canvas = document.getElementById('admin-mapa-canvas');
      if (canvas) {
        if (mapEditor) mapEditor.destroy();
        mapEditor = createDistribucionEditor(canvas, landing.mapaDistribucionJson, () => {});
        wireMapEditorUi();
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
        const mapJson = mapEditor ? mapEditor.getJson() : landing.mapaDistribucionJson;
        const botonesJson = JSON.stringify(collectBotonesFromDom());
        const payload = {
          id: LANDING_PAGE_ID,
          descripcionParque: document.getElementById('lp-descripcion')?.value || '',
          mapaDistribucionJson: mapJson,
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
      if (!mapEl || !listEl) return;

      let current = [];
      const render = () => {
        mapEl.innerHTML = current
          .map((s) => {
            const x = Math.max(0, Math.min(95, Number(s.x || 0)));
            const y = Math.max(0, Math.min(90, Number(s.y || 0)));
            const color = s.estado === 'libre' ? 'bg-emerald-500' : s.estado === 'reservado' ? 'bg-amber-500' : 'bg-rose-600';
            return `<button type="button" data-park-node="${escapeHtml(s.id)}" class="absolute ${color} rounded px-2 py-1 text-[11px] font-bold text-white cursor-move" style="left:${x}%;top:${y}%">${escapeHtml(s.id)}</button>`;
          })
          .join('');

        listEl.innerHTML = current
          .map((s) => `
            <div class="rounded border border-slate-200 p-2">
              <div class="font-semibold">${escapeHtml(s.id)}</div>
              <div class="mt-1 grid gap-2 sm:grid-cols-5">
                <select data-park-status="${escapeHtml(s.id)}" class="rounded border p-1 text-xs">
                  <option value="libre" ${s.estado === 'libre' ? 'selected' : ''}>Libre</option>
                  <option value="reservado" ${s.estado === 'reservado' ? 'selected' : ''}>Reservado</option>
                  <option value="ocupado" ${s.estado === 'ocupado' ? 'selected' : ''}>Ocupado</option>
                </select>
                <input data-park-placas="${escapeHtml(s.id)}" class="rounded border p-1 text-xs" placeholder="Placas" value="${escapeHtml(s.placas || '')}" />
                <input data-park-modelo="${escapeHtml(s.id)}" class="rounded border p-1 text-xs" placeholder="Modelo (si no hay placas)" value="${escapeHtml(s.modelo || '')}" />
                <input data-park-resby="${escapeHtml(s.id)}" class="rounded border p-1 text-xs" placeholder="Auto de / reservado por" value="${escapeHtml(s.reservadoPor || '')}" />
                <div class="flex gap-1">
                  <button data-park-save="${escapeHtml(s.id)}" class="rounded bg-slate-900 px-2 py-1 text-xs font-semibold text-white">Guardar</button>
                  <button data-park-del="${escapeHtml(s.id)}" class="rounded bg-rose-600 px-2 py-1 text-xs font-semibold text-white">Eliminar</button>
                </div>
              </div>
            </div>
          `)
          .join('');

        document.querySelectorAll('[data-park-save]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-park-save');
            const estado = document.querySelector(`[data-park-status="${id}"]`)?.value || 'libre';
            const placas = document.querySelector(`[data-park-placas="${id}"]`)?.value || '';
            const modelo = document.querySelector(`[data-park-modelo="${id}"]`)?.value || '';
            const reservadoPor = document.querySelector(`[data-park-resby="${id}"]`)?.value || '';
            await updateParkingSpot(id, { estado, placas, modelo, reservadoPor });
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
      const clearBtn = document.getElementById('prod-image-clear');
      const previewWrap = document.getElementById('prod-image-preview-wrap');
      const previewImg = document.getElementById('prod-image-preview');

      const clearProdImageUi = () => {
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
      fileInput?.addEventListener('change', () => {
        const f = fileInput?.files?.[0];
        if (f && previewImg && previewWrap) {
          if (previewImg.src?.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(previewImg.src);
            } catch {
              /* noop */
            }
          }
          previewImg.src = URL.createObjectURL(f);
          previewWrap.classList.remove('hidden');
          clearBtn?.classList.remove('hidden');
        } else {
          clearProdImageUi();
        }
      });
      clearBtn?.addEventListener('click', () => clearProdImageUi());

      document.getElementById('btn-create-producto')?.addEventListener('click', async () => {
        if (!canManage) return;
        const titulo = document.getElementById('prod-title')?.value?.trim();
        const descripcion = document.getElementById('prod-desc')?.value?.trim() || '';
        const precio = parseFloat(document.getElementById('prod-price')?.value || '0');
        const stockActual = parseInt(document.getElementById('prod-stock')?.value || '0', 10) || 0;
        const imageFile = fileInput?.files?.[0] || null;
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
