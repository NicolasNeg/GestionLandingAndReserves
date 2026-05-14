import { getCurrentUser } from '../lib/authProvider.js';
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
  listTicketTypesAdmin,
  createTicketType,
  updateTicketType,
  deactivateTicketType,
  deleteUserRecord,
  deleteConfiguracion,
  deletePaquete,
  deleteMovimientoInventario,
  deleteLandingPage,
  deleteDescuento,
  deleteTicketType,
  deleteTicket,
  deleteMesaReserva,
  listMesaReservasByFecha,
  getExecutiveDashboardData,
  searchTicketsForSupport,
  getTicketSupportDetails,
  listTicketDeliveryLogs,
  listAuditEvents,
  listAuditEventsForEntity,
  getDailyCloseSummary,
  listPhysicalSalesByDate,
  listCashMovementsByDate
} from '../lib/dataLayer.js';
import { listPendingScans } from '../lib/offlineScannerStore.js';
import {
  DEFAULT_MAPA_JSON,
  MAP_ITEM_KINDS,
  drawDistribucionCanvas,
  getMapKind,
  parseDistribucionJson
} from '../lib/distribucionMapa.js';
import { mountReactMapEditor } from '../react/mapEditorMount.tsx';
import { MAP_QUICK_PRESETS } from '../lib/mapEngine/mapPresets.js';
import { getUserAccess } from '../lib/accessControl.js';
import { icon } from '../lib/icons.js';
import { showAlert, showConfirm } from '../lib/appDialog.js';
import { subscribeParkingSpots, upsertParkingSpot, updateParkingSpot, removeParkingSpot } from '../lib/parkingRealtime.js';
import { defaultScheduleConfig, parseScheduleConfig, serializeScheduleConfig, scheduleDays } from '../lib/schedule.js';
import { publishAppUpdate } from '../lib/realtimeSync.js';
import { openImageCropModal } from '../lib/imageCropModal.js';
import { uploadMapBackgroundImage, uploadProductImage, uploadServiceImage } from '../lib/storageProvider.js';
import { isBackendOperationUnavailable } from '../lib/backendErrors.js';
import { formatFechaDia } from '../lib/fechaDiaMexico.js';
import {
  discountRulesEditorMarkup,
  parseDiscountRulesJson,
  splitDiscountRules,
  wireDiscountRulesEditor,
  writeDiscountRulesToDom,
  readDiscountRulesFromDom,
  validateDiscountRulesFields,
  stringifyDiscountRules,
  showDiscountRulesValidationError,
  refreshDiscountRulesEditorUi
} from '../lib/discountRulesAdmin.js';
import heroImageUrl from '../assets/hero.png';
import { splitBotonesJson, mergeBotonesJson } from '../lib/landingBotonesHero.js';
import { resendTicketEmail } from '../lib/ticketEmail.js';
import { downloadTicketPdfBestEffort } from '../lib/ticketPdf.js';
import { copyTicketCode } from '../lib/ticketShare.js';
import { logAuditEvent } from '../lib/auditLog.js';
import html2pdf from 'html2pdf.js';
import {
  buildFullBackupPayload,
  clearAllMapDrafts,
  clearMapDraftLocal,
  detectImportShape,
  downloadJsonFile,
  extractFullBackupStrings,
  loadMapDraftLocal,
  MAP_VIEW_KEYS,
  mapContextToViewKey,
  normalizeImportSingleDoc,
  saveLastSavedLocal,
  saveMapDraftLocal,
  suggestFilenameForView,
  suggestFilenameFullBackup,
  tryParseJsonFile,
  validateMapDocumentForSave
} from '../lib/mapEngine/mapBackup.js';
import { mapSidebarHint, renderMapToolAccordionsHtml } from '../lib/mapEditorViewConfig.js';

const LANDING_PAGE_ID = 'main';
const TICKET_CONFIG_ID = 'precios_base';

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderMapEditorPresetsSection() {
  return `<details class="mapa-tool-accordion border-b border-white/5 pb-2 open"><summary class="mapa-tool-accordion-summary">Plantillas / presets</summary><div class="mt-2 flex flex-col gap-1.5">
      <button type="button" id="mapa-preset-row" class="mapa-command-btn justify-start text-left" title="Tres piezas en fila del tipo activo">Fila x3</button>
      <button type="button" id="mapa-preset-fila-5" class="mapa-command-btn justify-start text-left" title="Cinco piezas en fila del tipo activo">Fila x5</button>
      <button type="button" id="mapa-preset-wide" class="mapa-command-btn justify-start text-left" title="Rectangulo ancho">Bloque ancho</button>
      <button type="button" id="mapa-preset-global-kit" class="mapa-command-btn justify-start text-left" title="Alberca, palapas, servicios, entrada">Kit global</button>
      <button type="button" id="mapa-preset-mesas-grid" class="mapa-command-btn justify-start text-left" title="Bloque 4x4 mesas">Mesas 4x4</button>
      <button type="button" id="mapa-preset-mesas-row" class="mapa-command-btn justify-start text-left" title="Fila de mesas">Fila mesas</button>
      <button type="button" id="mapa-preset-mesas-vip" class="mapa-command-btn justify-start text-left" title="Zona VIP">VIP</button>
      <button type="button" id="mapa-preset-mesas-area" class="mapa-command-btn justify-start text-left" title="Area familiar grande">Area familiar</button>
      <button type="button" id="mapa-preset-parking-row" class="mapa-command-btn justify-start text-left" title="Fila de cajones">Fila parking</button>
      <button type="button" id="mapa-preset-parking-block" class="mapa-command-btn justify-start text-left" title="Bloque de cajones">Bloque parking</button>
      <button type="button" id="mapa-preset-parking-entrada" class="mapa-command-btn justify-start text-left" title="Entrada de estacionamiento">Entrada estacionamiento</button>
      <button type="button" id="mapa-preset-parking-pasillo" class="mapa-command-btn justify-start text-left" title="Zona de circulacion">Pasillo circulacion</button>
      <button type="button" id="mapa-preset-parking-yard" class="mapa-command-btn justify-start text-left" title="Patios y taller">Taller/patio</button>
      <button type="button" id="mapa-add-quick" class="mapa-command-primary justify-center">+ Pieza rapida</button>
    </div></details>`;
}

function renderMapEditorFileSection() {
  return `<div class="mapa-file-card mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
    <p class="text-[10px] font-black uppercase tracking-widest text-slate-500">Archivo</p>
    <div class="mt-2 flex flex-col gap-1.5">
      <button type="button" id="mapa-export-view" class="mapa-command-btn justify-start text-left" title="Descargar solo esta vista en JSON">${icon('package', 'h-4 w-4')} Exportar vista</button>
      <button type="button" id="mapa-export-all" class="mapa-command-btn justify-start text-left" title="Descargar los tres mapas">${icon('package', 'h-4 w-4')} Exportar todo</button>
      <button type="button" id="mapa-import-btn" class="mapa-command-btn justify-start text-left" title="Importar JSON">${icon('cursor', 'h-4 w-4')} Importar JSON</button>
      <input type="file" id="mapa-import-file" accept=".json,application/json" class="hidden" aria-hidden="true" />
    </div>
  </div>`;
}

function relativeTimeEs(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Hace un momento';
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  return `Hace ${d} d`;
}

function fmtMxMoney(n) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2
  }).format(Number(n || 0));
}

function execDashCardClass(tone) {
  if (tone === 'danger') return 'exec-dash-card is-danger';
  if (tone === 'warning') return 'exec-dash-card is-warn';
  if (tone === 'info') return 'exec-dash-card is-info';
  return 'exec-dash-card';
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
    const access = await getUserAccess(getCurrentUser());
    const canScan = access.can('tickets.scan');
    const canPackages = access.can('packages.manage');
    const canSitioPanel =
      access.can('landing.manage') ||
      access.can('admin.panel') ||
      access.isProgramador === true;
    const canAdminPanel = access.can('admin.panel');
    const canInventoryView = access.can('inventory.manage') || access.can('inventory.adjust') || access.can('sales.physical');
    const canParking = access.can('parking.manage');
    const canProgramadorTools =
      access.isProgramador === true || access.can('programador.access');
    const canBitacora =
      access.can('dashboard.manage') ||
      access.can('admin.panel') ||
      access.can('programador.access') ||
      access.can('users.permissions');
    const canSupport =
      canBitacora ||
      access.can('tickets.scan') ||
      access.can('sales.physical');
    const canCorteDia =
      access.can('sales.physical') ||
      access.can('finance.view') ||
      access.can('dashboard.manage') ||
      access.can('admin.panel') ||
      access.can('programador.access');
    const canTicketTypesPanel = canPackages || canAdminPanel;
    const showDiscountTechnical =
      access.isProgramador === true || access.can('programador.access');
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
                    <button type="button" data-admin-section="tickets" class="admin-sidebar-item is-active" title="Resumen operativo">
                        ${icon('ticket', 'h-5 w-5')}
                        <span class="admin-sidebar-label">Resumen</span>
                    </button>
                    ${canTicketTypesPanel ? `<button type="button" data-admin-section="ticket-types" class="admin-sidebar-item" title="Tickets del catalogo">${icon('ticket', 'h-5 w-5')}<span class="admin-sidebar-label">Tickets</span></button>` : ''}
                    ${canParking ? `<button type="button" data-admin-section="parking" class="admin-sidebar-item" title="Estacionamiento">${icon('parking', 'h-5 w-5')}<span class="admin-sidebar-label">Estacionamiento</span></button>` : ''}
                    ${canInventoryView ? `<button type="button" data-admin-section="inventario" class="admin-sidebar-item" title="Inventario y ventas">${icon('package', 'h-5 w-5')}<span class="admin-sidebar-label">Inventario / Ventas</span></button>` : ''}
                    ${canCorteDia ? `<button type="button" data-admin-section="corte-dia" class="admin-sidebar-item" title="Corte del día">${icon('clock', 'h-5 w-5')}<span class="admin-sidebar-label">Corte del día</span></button>` : ''}
                    ${canSupport ? `<button type="button" data-admin-section="soporte" class="admin-sidebar-item" title="Soporte clientes">${icon('users', 'h-5 w-5')}<span class="admin-sidebar-label">Soporte</span></button>` : ''}
                    ${canBitacora ? `<button type="button" data-admin-section="bitacora" class="admin-sidebar-item" title="Bitacora operativa">${icon('clock', 'h-5 w-5')}<span class="admin-sidebar-label">Bitácora</span></button>` : ''}
                    ${canScan ? `<a href="/escaner" data-link class="admin-sidebar-item" title="Escaner">${icon('scan', 'h-5 w-5')}<span class="admin-sidebar-label">Escaner</span></a>` : ''}
                    ${canAdminPanel ? `<button type="button" data-admin-section="admin" class="admin-sidebar-item" title="Panel administracion">${icon('dashboard', 'h-5 w-5')}<span class="admin-sidebar-label">Panel administracion</span></button>` : ''}
                    ${canSitioPanel ? `<button type="button" data-admin-section="sitio" class="admin-sidebar-item" title="Landing, mapa y servicios">${icon('palette', 'h-5 w-5')}<span class="admin-sidebar-label">Sitio</span></button>` : ''}
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
                <div id="exec-dash-root" class="exec-dash mb-8">
                  <header class="exec-dash-header mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div class="min-w-0">
                      <p class="exec-dash-kicker text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700">Operación</p>
                      <h1 class="mt-1 text-3xl font-black tracking-tight text-slate-900">Resumen ejecutivo</h1>
                      <p id="exec-dash-date-line" class="mt-1 text-sm font-semibold text-slate-500"></p>
                      <p id="admin-rol-hint" class="mt-2 text-sm text-slate-500"></p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <button type="button" id="exec-dash-refresh" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-800 shadow-sm hover:bg-slate-50">
                        Actualizar métricas
                      </button>
                      ${canScan ? `<a href="/escaner" data-link class="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white shadow hover:bg-slate-800">Abrir escáner</a>` : ''}
                    </div>
                  </header>

                  <div id="exec-dash-worker-strip" class="${canScan && !canAdminPanel ? '' : 'hidden'} mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
                    Vista compacta para operación en campo: sincroniza pendientes offline cuando recuperes red.
                  </div>

                  <div id="exec-dash-quick" class="exec-dash-quick mb-6"></div>

                  <div id="exec-dash-skeleton" class="exec-dash-skeleton exec-dash-skeleton-grid" aria-hidden="true">
                    ${Array.from({ length: 8 })
                      .map(
                        () =>
                          '<div class="exec-dash-skel-cell"><span class="exec-dash-skel-line w-2/3"></span><span class="exec-dash-skel-line w-1/2 mt-3"></span><span class="exec-dash-skel-line w-1/3 mt-6"></span></div>'
                      )
                      .join('')}
                  </div>

                  <div id="exec-dash-body" class="exec-dash-body hidden">
                    <div id="exec-dash-kpis" class="exec-dash-kpi-grid mb-6" aria-live="polite"></div>
                    <div class="exec-dash-split mb-6">
                      <section class="exec-dash-panel">
                        <div class="exec-dash-panel-head">
                          <h2 class="exec-dash-panel-title">Alertas de operación</h2>
                          <p class="exec-dash-panel-sub">Prioriza lo que necesita atención hoy</p>
                        </div>
                        <div id="exec-dash-alerts" class="exec-dash-alert-list mt-4 space-y-3"></div>
                      </section>
                      <section class="exec-dash-panel">
                        <div class="exec-dash-panel-head">
                          <h2 class="exec-dash-panel-title">Actividad reciente</h2>
                          <p class="exec-dash-panel-sub">Últimos movimientos del sistema</p>
                        </div>
                        <ul id="exec-dash-activity" class="exec-dash-activity mt-4 space-y-3"></ul>
                      </section>
                    </div>
                  </div>
                </div>

                <div id="admin-mesa-reservas-operativas" class="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 class="text-lg font-black text-slate-900">Reservas de mesa del día</h2>
                    <div class="flex flex-wrap items-center gap-2">
                      <label class="text-xs font-semibold text-slate-600">Fecha
                        <input type="date" id="admin-mesa-fecha" class="mt-1 rounded border border-slate-300 p-1 text-sm" />
                      </label>
                      <button type="button" id="admin-mesa-refresh" class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-800 hover:bg-slate-50">Actualizar</button>
                    </div>
                  </div>
                  <div id="admin-mesa-reservas-body" class="text-sm text-slate-600">Cargando...</div>
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
                      ${discountRulesEditorMarkup(showDiscountTechnical, 'disc-create-rules-root')}
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

                ${canTicketTypesPanel ? `<div id="admin-panel-ticket-types" class="hidden flex flex-col gap-6">
                  <header class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
                    <div class="min-w-0">
                      <p class="text-[10px] font-black uppercase tracking-widest text-cyan-700">Catalogo</p>
                      <h1 class="mt-1 text-2xl font-black text-slate-900">Tickets de entrada</h1>
                      <p class="mt-1 max-w-2xl text-sm text-slate-600">Crea y edita tipos de ticket publicados en la landing y en checkout. Los cambios se reflejan al guardar.</p>
                    </div>
                    <div class="mt-4 flex flex-wrap gap-2 sm:mt-0">
                      <button type="button" id="ticket-admin-refresh" class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50">Actualizar lista</button>
                      <a href="/home#tickets-individuales" data-link class="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-black text-white shadow hover:bg-cyan-500">Ver en sitio</a>
                    </div>
                  </header>
                  <div class="grid gap-6 lg:grid-cols-[minmax(260px,34%)_minmax(0,1fr)]">
                    <aside class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto">
                      <div class="flex items-center justify-between gap-2">
                        <p class="text-xs font-black uppercase tracking-wide text-slate-500">Lista</p>
                        <button type="button" id="ticket-admin-new" class="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-black text-white hover:bg-slate-800">+ Nuevo</button>
                      </div>
                      <div id="ticket-admin-list" class="mt-3 space-y-2 text-sm">Cargando...</div>
                    </aside>
                    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <input type="hidden" id="ticket-edit-id" value="" />
                      <div class="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p class="text-[10px] font-black uppercase tracking-wide text-slate-500">Editor</p>
                          <h2 id="ticket-edit-heading" class="text-lg font-black text-slate-900">Selecciona un ticket</h2>
                          <p id="ticket-edit-sub" class="mt-1 text-xs text-slate-500">O pulsa Nuevo para crear uno desde cero.</p>
                        </div>
                        <span id="ticket-edit-status" class="text-xs font-semibold text-slate-500"></span>
                      </div>
                      <div id="ticket-edit-fields" class="mt-5 hidden space-y-4">
                        <div class="grid gap-3 sm:grid-cols-2">
                          <label class="text-xs font-semibold text-slate-600 sm:col-span-2">Nombre
                            <input id="ticket-edit-nombre" type="text" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" placeholder="Ticket general" />
                          </label>
                          <label class="text-xs font-semibold text-slate-600">Precio (MXN)
                            <input id="ticket-edit-precio" type="number" min="0" step="0.01" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
                          </label>
                          <label class="text-xs font-semibold text-slate-600">Orden
                            <input id="ticket-edit-orden" type="number" min="0" step="1" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
                          </label>
                          <label class="text-xs font-semibold text-slate-600 sm:col-span-2">Categoria
                            <input id="ticket-edit-categoria" type="text" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" placeholder="General / VIP" />
                          </label>
                          <label class="text-xs font-semibold text-slate-600 sm:col-span-2">Descripcion
                            <textarea id="ticket-edit-desc" rows="3" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"></textarea>
                          </label>
                          <label class="text-xs font-semibold text-slate-600 sm:col-span-2">Que incluye
                            <textarea id="ticket-edit-incluye" rows="3" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"></textarea>
                          </label>
                          <label class="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <input id="ticket-edit-activo" type="checkbox" class="h-4 w-4 rounded border-slate-300" checked />
                            Activo en web y checkout
                          </label>
                          <label class="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <input id="ticket-edit-especial" type="checkbox" class="h-4 w-4 rounded border-slate-300" />
                            Marcar como especial
                          </label>
                        </div>
                        <div class="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                          <button type="button" id="ticket-edit-save" class="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white shadow hover:bg-slate-800">Guardar cambios</button>
                          <button type="button" id="ticket-edit-dup" class="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50">Duplicar</button>
                          <button type="button" id="ticket-edit-toggle" class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-900 hover:bg-amber-100">Activar / desactivar</button>
                          <button type="button" id="ticket-edit-del" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-800 hover:bg-rose-100">Eliminar</button>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>` : ''}

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
                          <p id="parking-drag-hint" class="text-xs text-slate-500">Arrastra una unidad para actualizar su ubicacion.</p>
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
                      <input id="parking-filter" placeholder="Buscar spot, placa o modelo..." class="mb-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800" />
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

                ${canCorteDia ? `<div id="admin-panel-corte-dia" class="hidden space-y-6">
                  <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 class="text-xl font-black text-slate-900">Corte del día</h2>
                        <p class="mt-1 text-sm text-slate-600">Resumen de ventas físicas, online y movimientos de caja.</p>
                      </div>
                      <div class="flex items-center gap-2">
                        <input id="corte-dia-fecha" type="date" value="${formatFechaDia()}" class="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                        <button type="button" id="corte-dia-refresh" class="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black text-slate-700">Actualizar</button>
                      </div>
                    </div>
                    <p id="corte-dia-msg" class="mt-3 text-xs font-semibold text-slate-600"></p>
                    <div id="corte-dia-kpis" class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"></div>
                    <div class="mt-4 flex flex-wrap gap-2">
                      <button type="button" id="corte-dia-export-csv" class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700">Exportar CSV</button>
                      <button type="button" id="corte-dia-export-pdf" class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700">Exportar PDF</button>
                      <button type="button" id="corte-dia-print" class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700">Imprimir resumen</button>
                    </div>
                    <div class="mt-4 grid gap-4 lg:grid-cols-2">
                      <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <h3 class="text-sm font-black text-slate-800">Ventas físicas</h3>
                        <div id="corte-dia-sales-list" class="mt-2 space-y-2 text-xs text-slate-700"></div>
                      </div>
                      <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <h3 class="text-sm font-black text-slate-800">Movimientos de caja</h3>
                        <div id="corte-dia-cash-list" class="mt-2 space-y-2 text-xs text-slate-700"></div>
                      </div>
                    </div>
                  </section>
                </div>` : ''}

                ${canSupport ? `<div id="admin-panel-soporte" class="hidden space-y-6">
                  <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 class="text-xl font-black text-slate-900">Soporte de clientes</h2>
                    <p class="mt-1 text-sm text-slate-600">Busca por correo, nombre, folio, ticket ID o teléfono.</p>
                    <div class="mt-4 flex flex-col gap-2 sm:flex-row">
                      <input id="support-query" type="text" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Buscar por correo, nombre, folio, ticket ID o teléfono" />
                      <select id="support-status-filter" class="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                        <option value="todos">Todos</option>
                        <option value="vigentes">Vigentes</option>
                        <option value="usados">Usados</option>
                        <option value="pendientes">Pendientes de pago</option>
                        <option value="cancelados">Cancelados</option>
                      </select>
                      <button id="support-search-btn" type="button" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white">Buscar</button>
                    </div>
                    <p id="support-msg" class="mt-3 text-xs font-semibold text-slate-600"></p>
                    <div id="support-results" class="mt-4 space-y-3"></div>
                    <div id="support-detail" class="mt-4 hidden rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div id="support-detail-body" class="text-sm text-slate-700"></div>
                    </div>
                  </section>
                </div>` : ''}

                ${canBitacora ? `<div id="admin-panel-bitacora" class="hidden space-y-6">
                  <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 class="text-xl font-black text-slate-900">Bitácora</h2>
                    <p class="mt-1 text-sm text-slate-600">Revisa eventos importantes del sistema y operación del parque.</p>
                    <div class="mt-4 grid gap-2 sm:grid-cols-4">
                      <select id="audit-range" class="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                        <option value="today">Hoy</option>
                        <option value="yesterday">Ayer</option>
                        <option value="week">Esta semana</option>
                        <option value="all">Todos</option>
                      </select>
                      <input id="audit-type" type="text" class="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Tipo de evento" />
                      <select id="audit-severity" class="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                        <option value="">Todas severidades</option>
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                      </select>
                      <input id="audit-query" type="text" class="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Buscar texto" />
                    </div>
                    <div class="mt-3 flex justify-end">
                      <button id="audit-refresh-btn" type="button" class="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black text-slate-800">Actualizar</button>
                    </div>
                    <div id="audit-list" class="mt-3 space-y-3"></div>
                  </section>
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

                ${canSitioPanel ? `<div id="admin-panel-sitio" class="hidden flex flex-col gap-5">
                    <header class="sticky top-0 z-20 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                      <div class="min-w-0">
                        <p class="text-[10px] font-black uppercase tracking-widest text-cyan-700">Sitio publico</p>
                        <h1 class="text-xl font-black text-slate-900 sm:text-2xl">Editor visual de la landing</h1>
                        <p id="admin-sitio-workspace-sub" class="mt-0.5 text-xs text-slate-500">Landing, mapa del parque y servicios en pestañas. Los cambios son locales hasta guardar.</p>
                      </div>
                      <div class="flex flex-wrap items-center gap-2">
                        <span id="lp-preview-dirty" class="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">Sin cambios</span>
                        <button type="button" id="lp-discard" class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50">Descartar</button>
                        <button type="button" id="lp-save" class="rounded-xl bg-slate-900 px-5 py-2 text-sm font-black text-white shadow hover:bg-slate-800">Guardar cambios del sitio</button>
                        <a href="/home" data-link class="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-black text-cyan-900 hover:bg-cyan-100">Abrir sitio</a>
                      </div>
                      <p id="lp-save-msg" class="w-full text-xs font-semibold text-slate-600 sm:text-right"></p>
                    </header>

                    <div class="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                      <button type="button" class="sitio-subtab rounded-full px-4 py-2 text-xs font-black is-active" data-sitio-tab="landing">Landing</button>
                      <button type="button" class="sitio-subtab rounded-full px-4 py-2 text-xs font-black text-slate-600" data-sitio-tab="mapa">Mapa</button>
                      <button type="button" class="sitio-subtab rounded-full px-4 py-2 text-xs font-black text-slate-600" data-sitio-tab="extras">Servicios y enlaces</button>
                    </div>

                    <div id="sitio-tab-landing" class="sitio-tab-panel space-y-4">
                      <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p class="text-xs font-semibold text-slate-600"><span class="font-black text-slate-900">Vista previa</span> · clic en un bloque para inspeccionarlo</p>
                        <div class="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-inner">
                          <button type="button" class="lp-preview-size rounded-md px-3 py-1.5 text-xs font-black shadow-sm" data-preview-size="desktop">Desktop</button>
                          <button type="button" class="lp-preview-size rounded-md px-3 py-1.5 text-xs font-black text-slate-500" data-preview-size="tablet">Tablet</button>
                          <button type="button" class="lp-preview-size rounded-md px-3 py-1.5 text-xs font-black text-slate-500" data-preview-size="mobile">Mobile</button>
                        </div>
                      </div>

                      <div class="admin-lb-grid grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
                        <aside class="lb-structure rounded-2xl border border-slate-200 bg-white p-3 shadow-sm xl:max-h-[calc(100vh-220px)] xl:overflow-y-auto">
                          <p class="text-[10px] font-black uppercase tracking-wide text-slate-500">Estructura</p>
                          <div class="mt-2 space-y-1" id="lb-structure-list">
                            ${['hero:Hero / encabezado', 'estado:Estado y horarios', 'descripcion:Descripcion', 'tickets:Tickets', 'servicios:Servicios', 'mapa:Mapa', 'botones:Botones / CTA', 'contacto:Contacto / ubicacion']
                              .map((pair) => {
                                const [k, label] = pair.split(':');
                                return `<button type="button" class="lb-structure-item w-full rounded-lg border border-transparent px-3 py-2 text-left text-xs font-bold text-slate-700 hover:border-slate-200 hover:bg-slate-50" data-lb-block="${k}">${label}</button>`;
                              })
                              .join('')}
                          </div>
                        </aside>

                        <div class="lb-canvas-column flex min-h-[480px] flex-col gap-2">
                          <div id="lb-selection-chip" class="hidden rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-black text-cyan-900"></div>
                          <div id="lp-preview-frame" class="lb-preview-frame flex-1 rounded-2xl border border-slate-200 bg-slate-100 p-3 transition-[max-width] duration-200">
                            <div id="lb-canvas-root" class="lb-canvas-root mx-auto min-h-[420px] rounded-xl bg-white shadow-lg ring-1 ring-slate-200/80"></div>
                          </div>
                        </div>

                        <aside id="lb-inspector" class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:max-h-[calc(100vh-220px)] xl:overflow-y-auto">
                          <p class="text-[10px] font-black uppercase tracking-wide text-slate-500">Propiedades</p>
                          <p id="lb-inspector-hint" class="mt-2 text-sm font-bold text-slate-900">Selecciona un bloque</p>

                          <div id="lb-inspector-hero" class="lb-inspector-panel mt-4 hidden space-y-3">
                            <label class="block text-xs font-semibold text-slate-600">Kicker
                              <input id="lp-hero-kicker" type="text" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
                            </label>
                            <label class="block text-xs font-semibold text-slate-600">Titulo
                              <input id="lp-hero-title" type="text" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
                            </label>
                            <label class="block text-xs font-semibold text-slate-600">Subtitulo
                              <textarea id="lp-hero-subtitle" rows="4" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"></textarea>
                            </label>
                            <p class="text-[11px] text-slate-500">Doble clic en el hero del lienzo para editar texto inline.</p>
                          </div>

                          <div id="lb-inspector-estado" class="lb-inspector-panel mt-4 hidden space-y-3">
                            <label class="flex items-center gap-2 text-sm font-semibold text-slate-800">
                              <input type="checkbox" id="lp-abierto" class="h-4 w-4 rounded border-gray-300" />
                              Abierto ahora
                            </label>
                            <label class="block text-xs font-semibold text-slate-600">Ocupacion
                              <textarea id="lp-ocupacion" rows="3" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"></textarea>
                            </label>
                            <label class="block text-xs font-semibold text-slate-600">Estacionamiento (texto landing)
                              <textarea id="lp-estacionamiento" rows="3" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"></textarea>
                            </label>
                            <div>
                              <p class="text-xs font-bold text-slate-700">Horario semanal</p>
                              <p class="mb-2 text-[11px] text-slate-500">Configura 7 dias y fechas especiales.</p>
                              <div id="lp-weekly-grid" class="grid max-h-52 gap-2 overflow-y-auto sm:grid-cols-2"></div>
                            </div>
                            <div class="rounded-lg border border-slate-200 p-3">
                              <div class="mb-2 flex items-center justify-between">
                                <h3 class="text-xs font-bold text-slate-700">Fechas especiales</h3>
                                <button type="button" id="lp-special-add" class="rounded border border-slate-300 px-2 py-1 text-[11px] font-semibold hover:bg-slate-50">+ Agregar</button>
                              </div>
                              <div id="lp-specials" class="space-y-2"></div>
                            </div>
                          </div>

                          <div id="lb-inspector-descripcion" class="lb-inspector-panel mt-4 hidden space-y-2">
                            <label class="block text-xs font-semibold text-slate-600">Descripcion del parque
                              <textarea id="lp-descripcion" rows="10" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"></textarea>
                            </label>
                            <p class="text-[11px] text-slate-500">Recomendado: varios parrafos cortos (la landing usa texto plano).</p>
                          </div>

                          <div id="lb-inspector-tickets" class="lb-inspector-panel mt-4 hidden space-y-3">
                            <p class="text-sm text-slate-600">Los tickets mostrados abajo salen del catalogo activo.</p>
                            <div id="lb-tickets-mini-list" class="max-h-40 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs text-slate-700"></div>
                            <button type="button" id="lb-jump-tickets-admin" class="w-full rounded-xl bg-slate-900 py-2 text-xs font-black text-white hover:bg-slate-800">Editar tickets</button>
                          </div>

                          <div id="lb-inspector-servicios" class="lb-inspector-panel mt-4 hidden space-y-2">
                            <p class="text-sm text-slate-600">La tabla de servicios esta en la pestaña Servicios y enlaces.</p>
                            <button type="button" class="lb-tab-jump w-full rounded-xl border border-slate-300 py-2 text-xs font-black text-slate-800 hover:bg-slate-50" data-sitio-tab-jump="extras">Ir a servicios</button>
                          </div>

                          <div id="lb-inspector-mapa" class="lb-inspector-panel mt-4 hidden space-y-2">
                            <p class="text-sm text-slate-600">Editor de plano interactivo del parque.</p>
                            <button type="button" class="lb-tab-jump w-full rounded-xl border border-slate-300 py-2 text-xs font-black text-slate-800 hover:bg-slate-50" data-sitio-tab-jump="mapa">Abrir editor de mapa</button>
                          </div>

                          <div id="lb-inspector-botones" class="lb-inspector-panel mt-4 hidden space-y-2">
                            <p class="text-sm text-slate-600">WhatsApp, correo y enlaces personalizados.</p>
                            <button type="button" class="lb-tab-jump w-full rounded-xl border border-slate-300 py-2 text-xs font-black text-slate-800 hover:bg-slate-50" data-sitio-tab-jump="extras">Ir a enlaces</button>
                          </div>

                          <div id="lb-inspector-contacto" class="lb-inspector-panel mt-4 hidden space-y-3">
                            <label class="block text-xs font-semibold text-slate-600">URL imagen (satelital / drone)
                              <input type="url" id="lp-satelite" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" placeholder="https://..." />
                            </label>
                            <label class="block text-xs font-semibold text-slate-600">Google Maps (enlace)
                              <input type="url" id="lp-maps" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" placeholder="https://maps.google.com/..." />
                            </label>
                          </div>
                        </aside>
                      </div>
                    </div>

                    <div id="sitio-tab-mapa" class="sitio-tab-panel hidden space-y-3">
                      <div id="mapa-editor-mobile-block" class="relative z-[8] isolate hidden max-[1023px]:flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-8 text-center shadow-lg">
                        <div class="mx-auto max-w-md">
                          <span class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">${icon('map', 'h-8 w-8')}</span>
                          <h2 class="mt-4 text-xl font-black text-slate-900">Vista bloqueada</h2>
                          <p class="mt-3 text-sm font-semibold leading-relaxed text-slate-600">Este editor de mapas solo se puede usar desde computadora para evitar errores de edición.</p>
                          <div class="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                            <button type="button" id="mapa-mobile-back" class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm">Volver</button>
                            <a href="/home" data-link class="rounded-xl bg-cyan-600 px-4 py-3 text-sm font-black text-white shadow-md">Abrir sitio</a>
                            <a href="/home#mapa" data-link class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm">Ver mapa público</a>
                            <a href="/admin/dashboard" data-link class="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-900">Ir al panel</a>
                          </div>
                        </div>
                      </div>
                      <div id="mapa-editor-desktop" class="hidden min-[1024px]:block space-y-3">
                      <div id="mapa-draft-banner" class="hidden rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
                        <p class="font-black">Encontramos un borrador local sin guardar.</p>
                        <p id="mapa-draft-banner-detail" class="mt-1 text-xs font-semibold text-amber-900/90"></p>
                        <div class="mt-3 flex flex-wrap gap-2">
                          <button type="button" id="mapa-draft-restore" class="rounded-lg bg-amber-700 px-4 py-2 text-xs font-black text-white hover:bg-amber-800">Restaurar borrador</button>
                          <button type="button" id="mapa-draft-discard" class="rounded-lg border border-amber-400 bg-white px-4 py-2 text-xs font-black text-amber-900 hover:bg-amber-100">Descartar borrador</button>
                        </div>
                      </div>
                      <p class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Usa <strong>Guardar cambios del sitio</strong> en la cabecera para persistir mapas y textos. El atajo Guardar del lienzo dispara el mismo guardado.</p>
                      <p class="rounded-lg border border-cyan-100 bg-cyan-50/90 px-4 py-2 text-xs font-semibold text-cyan-950">Editor de mapa: lienzo React + Konva (única versión). Guarda con <strong>Guardar cambios del sitio</strong> en la cabecera.</p>
                      <p id="mapa-context-usage" class="rounded-lg border border-cyan-100 bg-cyan-50/80 px-4 py-2 text-xs font-semibold text-cyan-950"></p>
                      <div id="mapa-editor-shell" class="mapa-editor-shell mapa-ws overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 shadow-xl ring-1 ring-white/10">
                          <header class="mapa-editor-topbar min-h-[56px] border-b border-white/10 px-3 py-2.5">
                            <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                              <div class="flex min-w-0 flex-shrink-0 items-center gap-3">
                                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">${icon('map', 'h-6 w-6')}</span>
                                <div class="min-w-0">
                                  <h2 class="text-base font-black tracking-tight text-white">Editor del parque</h2>
                                  <p class="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                                    <span id="mapa-editor-save-status" class="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-300">Guardado</span>
                                    <span class="hidden sm:inline">·</span>
                                    <span class="hidden text-slate-500 sm:inline">Lienzo y herramientas según la vista activa</span>
                                  </p>
                                </div>
                              </div>
                              <div class="flex flex-1 flex-wrap items-center justify-center gap-2 xl:px-4">
                                <label class="sr-only" for="map-context-select">Vista del mapa</label>
                                <div id="map-view-tabs" class="inline-flex flex-wrap items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
                                  <button type="button" data-map-view-tab="parque" class="mapa-view-tab mapa-view-tab--global is-active">Global</button>
                                  <button type="button" data-map-view-tab="mesas" class="mapa-view-tab mapa-view-tab--mesas">Mesas</button>
                                  <button type="button" data-map-view-tab="estacionamiento" class="mapa-view-tab mapa-view-tab--estacionamiento">Estacionamiento</button>
                                  <button type="button" data-map-view-tab="albercas" class="mapa-view-tab mapa-view-tab--albercas">Albercas</button>
                                </div>
                                <select id="map-context-select" class="hidden rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-100">
                                  <option value="parque">Mapa Global</option>
                                  <option value="mesas">Mapa Mesas</option>
                                  <option value="estacionamiento">Mapa Estacionamiento</option>
                                  <option value="albercas">Mapa Albercas</option>
                                </select>
                              </div>
                              <div class="flex flex-wrap items-center justify-end gap-2">
                                <button type="button" id="mapa-save-shortcut" class="mapa-command-primary" title="Guardar contenido del sitio">${icon('check', 'h-4 w-4')} Guardar</button>
                                <button type="button" id="mapa-undo" class="mapa-command-btn" title="Deshacer">${icon('undo', 'h-4 w-4')} Deshacer</button>
                                <button type="button" id="mapa-redo" class="mapa-command-btn" title="Rehacer">${icon('redo', 'h-4 w-4')} Rehacer</button>
                                <button type="button" id="mapa-preview-canvas" class="mapa-command-btn" title="Vista previa solo lectura. Pulsa Esc para salir.">${icon('eye', 'h-4 w-4')} Vista previa</button>
                                <a id="mapa-preview-link" href="/home#mapa" data-link class="mapa-command-btn" title="Abrir vista publica">${icon('home', 'h-4 w-4')} Vista previa web</a>
                                <button type="button" id="mapa-focus-toggle" class="mapa-command-btn" title="Modo enfoque">${icon('eye', 'h-4 w-4')} Modo enfoque</button>
                              </div>
                            </div>
                            <div class="mt-2 flex flex-wrap items-center gap-2 border-t border-white/5 pt-2">
                              <span class="hidden text-[10px] font-black uppercase text-slate-500 sm:inline">Herramienta</span>
                              <button type="button" data-map-mode="select" class="mapa-mode-btn mapa-command-btn is-active" title="Seleccionar">${icon('cursor', 'h-4 w-4')} Seleccionar</button>
                              <button type="button" data-map-mode="pan" class="mapa-mode-btn mapa-command-btn" title="Mano / pan">${icon('move', 'h-4 w-4')} Mano</button>
                              <span class="mx-0.5 hidden h-5 w-px bg-white/10 sm:block" aria-hidden="true"></span>
                              <label class="mapa-command-btn cursor-pointer select-none"><input id="mapa-show-grid" type="checkbox" class="mr-1 align-middle" checked /> Grid</label>
                            </div>
                          </header>

                          <div id="mapa-editor-react-host" class="mapa-editor-react-host hidden min-h-[min(64vh,600px)] w-full shrink-0 bg-white"></div>

                          <p id="mapa-draw-hint" class="hidden border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-[11px] font-semibold text-amber-200">Modo dibujo activo: arrastra sobre el lienzo para crear el rectangulo.</p>

                          <div class="mapa-ws-main grid min-h-[min(520px,78vh)] grid-cols-1 lg:grid-cols-[minmax(200px,228px)_minmax(0,1fr)_minmax(260px,300px)]">
                            <aside class="mapa-ws-sidebar flex max-h-[min(78vh,760px)] flex-col overflow-hidden border-b border-white/10 bg-black/25 lg:max-h-none lg:border-b-0 lg:border-r lg:border-white/10">
                              <div class="border-b border-white/5 px-3 py-2">
                                <p class="text-[10px] font-black uppercase tracking-widest text-slate-500">Herramientas</p>
                                <p id="mapa-sidebar-view-hint" class="mt-0.5 px-1 text-[10px] font-semibold leading-snug text-slate-400"></p>
                              </div>
                              <div class="mapa-ws-sidebar-scroll flex-1 space-y-1 overflow-y-auto px-2 py-3">
                                <div id="mapa-tool-accordions" class="space-y-1"></div>
                                ${renderMapEditorPresetsSection()}
                                ${renderMapEditorFileSection()}
                              </div>
                            </aside>
                            <div class="relative min-w-0 border-b border-white/10 lg:border-b-0 lg:border-r lg:border-white/10">
                              <div class="mapa-zoom-bar absolute right-3 top-3 z-20 flex items-center gap-1 rounded-lg border border-white/10 bg-slate-950/90 px-1 py-1 text-slate-200 shadow-lg backdrop-blur">
                                <button type="button" id="mapa-zoom-out" class="h-8 w-8 rounded-md text-lg font-bold hover:bg-white/10" title="Alejar">−</button>
                                <span id="mapa-zoom-label" class="min-w-[3rem] text-center text-[11px] font-bold text-slate-400">100%</span>
                                <button type="button" id="mapa-zoom-in" class="h-8 w-8 rounded-md text-lg font-bold hover:bg-white/10" title="Acercar">+</button>
                                <button type="button" id="mapa-zoom-reset" class="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 hover:bg-white/10" title="Zoom 100%">1:1</button>
                              </div>
                              <div id="mapa-viewport-outer" class="mapa-viewport-outer relative max-h-[min(70vh,680px)] overflow-auto bg-slate-950/80 p-4">
                                <div id="mapa-viewport-inner" class="inline-block origin-top-left transition-transform duration-150">
                                  <canvas id="admin-mapa-canvas" width="800" height="440" class="mapa-editor-canvas-surface block rounded-xl shadow-2xl ring-1 ring-white/10"></canvas>
                                </div>
                                <div id="mapa-empty-overlay" class="pointer-events-none absolute inset-0 z-[25] hidden flex-col items-center justify-center gap-3 rounded-lg bg-slate-950/88 p-5 text-center">
                                  <p id="mapa-empty-title" class="pointer-events-auto text-sm font-black text-white">Aún no hay elementos en esta vista.</p>
                                  <p id="mapa-empty-hint" class="pointer-events-auto max-w-sm text-xs font-semibold text-slate-300"></p>
                                  <div class="pointer-events-auto flex flex-wrap justify-center gap-2">
                                    <button type="button" id="mapa-empty-preset" class="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-black text-white hover:bg-cyan-500">Agregar plantilla</button>
                                    <button type="button" id="mapa-empty-import" class="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-black text-white hover:bg-white/15">Importar JSON</button>
                                  </div>
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
                              <div class="flex flex-col gap-3 border-t border-white/10 bg-black/25 px-4 py-3 text-slate-300">
                                <div class="flex items-center justify-between gap-3">
                                  <div>
                                    <p class="text-xs font-black uppercase tracking-wide text-cyan-300">Fondo del mapa</p>
                                    <p class="text-[11px] font-semibold text-slate-400">Usa una imagen aérea, plano o render del parque como guía para dibujar encima.</p>
                                  </div>
                                  <button type="button" id="mapa-bg-apply" class="rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15">Aplicar fondo</button>
                                </div>
                                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                  <label class="text-[10px] font-bold uppercase text-slate-500">Tipo fondo
                                  <select id="mapa-bg-type" class="mt-1 block w-full min-w-[140px] rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white sm:w-40">
                                    <option value="park">Parque (degradado)</option>
                                    <option value="color">Color plano</option>
                                    <option value="image">Imagen</option>
                                    <option value="none">Sin fondo</option>
                                  </select>
                                </label>
                                <label class="text-[10px] font-bold uppercase text-slate-500">Color base
                                  <input id="mapa-bg-fill" type="color" class="mt-1 h-9 w-full max-w-[120px] rounded border border-white/10 bg-white/5 p-1 sm:w-28" />
                                </label>
                                <label class="text-[10px] font-bold uppercase text-slate-500">Ajuste
                                  <select id="mapa-bg-fit" class="mt-1 block w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white sm:w-32">
                                    <option value="cover">cover</option>
                                    <option value="contain">contain</option>
                                    <option value="stretch">stretch</option>
                                  </select>
                                </label>
                                <label class="text-[10px] font-bold uppercase text-slate-500">Opacidad
                                  <input id="mapa-bg-opacity" type="number" min="0" max="1" step="0.05" value="1" class="mt-1 w-24 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white" />
                                </label>
                                  <div class="min-w-[170px]">
                                    <p class="text-[10px] font-bold uppercase text-slate-500">Imagen de fondo</p>
                                    <input id="mapa-bg-file" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" />
                                    <div class="mt-1 flex flex-wrap gap-2">
                                      <button type="button" id="mapa-bg-upload-btn" class="rounded border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/15">Subir imagen</button>
                                      <button type="button" id="mapa-bg-replace-btn" class="rounded border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/15">Reemplazar</button>
                                      <button type="button" id="mapa-bg-remove-btn" class="rounded border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-500/20">Quitar</button>
                                    </div>
                                  </div>
                                </div>
                                <div class="flex flex-wrap items-center gap-3">
                                  <label class="flex items-center gap-2 pb-1 text-xs font-semibold text-slate-300"><input id="mapa-bg-visible" type="checkbox" checked /> Mostrar fondo</label>
                                  <label class="flex items-center gap-2 pb-1 text-xs font-semibold text-slate-300"><input id="mapa-bg-locked" type="checkbox" checked /> Bloquear fondo</label>
                                  <span id="mapa-bg-upload-status" class="text-xs font-semibold text-slate-400"></span>
                                </div>
                                <div class="flex flex-wrap items-start gap-3">
                                  <div id="mapa-bg-preview" class="hidden h-16 w-24 overflow-hidden rounded border border-white/10 bg-slate-800">
                                    <img id="mapa-bg-preview-img" src="" alt="Preview imagen de fondo" class="h-full w-full object-cover" />
                                  </div>
                                  <div class="min-w-[180px] text-[11px] text-slate-400">
                                    <p id="mapa-bg-file-name" class="font-semibold text-slate-300">Sin imagen cargada.</p>
                                  </div>
                                  ${
                                    canProgramadorTools
                                      ? `<details class="rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-400"><summary class="cursor-pointer font-bold text-slate-300">Datos técnicos</summary><p id="mapa-bg-tech-url" class="mt-1 break-all"></p><p id="mapa-bg-tech-path" class="break-all"></p></details>`
                                      : ''
                                  }
                                </div>
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
                              <div class="mb-3 grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
                                <button type="button" class="mapa-inspector-tab is-active" data-map-inspector-tab="propiedades">Propiedades</button>
                                <button type="button" class="mapa-inspector-tab" data-map-inspector-tab="visibilidad">Visibilidad por vista</button>
                                <button type="button" class="mapa-inspector-tab" data-map-inspector-tab="capas">Capas</button>
                              </div>
                              <p id="mapa-empty-state" class="rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-xs leading-relaxed text-slate-400">Haz clic en una pieza del lienzo. Flechas del teclado mueven 1px (Shift = 10px).</p>
                              <div id="mapa-multi-state" class="hidden rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-xs leading-relaxed text-cyan-100">
                                <p class="font-black uppercase tracking-wide">Seleccion multiple</p>
                                <p id="mapa-multi-count" class="mt-1 text-cyan-100/80">0 piezas seleccionadas.</p>
                                <div class="mt-3 grid grid-cols-2 gap-2">
                                  <button type="button" id="mapa-multi-duplicate" class="mapa-command-btn justify-center">Duplicar</button>
                                  <button type="button" id="mapa-multi-delete" class="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-500/20">Eliminar</button>
                                  <button type="button" id="mapa-multi-lock" class="mapa-command-btn justify-center">Bloquear</button>
                                  <button type="button" id="mapa-multi-unlock" class="mapa-command-btn justify-center">Desbloquear</button>
                                  <button type="button" id="mapa-multi-hide" class="mapa-command-btn justify-center">Ocultar</button>
                                  <button type="button" id="mapa-multi-show" class="mapa-command-btn justify-center">Mostrar</button>
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
                                  <label class="text-[10px] font-bold uppercase text-slate-500 sm:col-span-2">Rotacion<input id="mapa-item-rotation" type="number" step="1" class="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white" /></label>
                                </div>
                                </section>
                                <section class="mapa-inspector-section">
                                  <p class="mapa-inspector-section-title">Apariencia</p>
                                <div class="grid grid-cols-2 gap-2">
                                  <label class="text-[10px] font-bold uppercase text-slate-500 sm:col-span-2">Opacidad<input id="mapa-item-opacity" type="number" min="0.05" max="1" step="0.05" class="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white" /></label>
                                  <label class="text-[10px] font-bold uppercase text-slate-500">Relleno<input id="mapa-item-fill" type="color" class="mt-1 h-9 w-full rounded-lg border border-white/10 bg-white/5 p-1" /></label>
                                  <label class="text-[10px] font-bold uppercase text-slate-500">Borde<input id="mapa-item-stroke" type="color" class="mt-1 h-9 w-full rounded-lg border border-white/10 bg-white/5 p-1" /></label>
                                </div>
                                </section>
                                <section class="mapa-inspector-section">
                                  <p class="mapa-inspector-section-title">Metadata especifica</p>
                                <div id="mapa-item-metadata" class="space-y-3 rounded-xl border border-white/10 bg-white/5 p-2">
                                  <div id="mapa-table-metadata" class="grid grid-cols-2 gap-2">
                                    <label class="text-[10px] font-bold uppercase text-slate-500 sm:col-span-2">Nombre publico<input id="mapa-meta-public-name" type="text" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white" placeholder="Mesa VIP 01" /></label>
                                    <label class="text-[10px] font-bold uppercase text-slate-500">Capacidad<input id="mapa-meta-capacidad" type="number" min="1" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white" /></label>
                                    <label class="text-[10px] font-bold uppercase text-slate-500">Precio base<input id="mapa-meta-precio" type="number" min="0" step="1" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white" /></label>
                                    <label class="flex items-center gap-2 text-xs font-semibold text-slate-300"><input id="mapa-meta-vip" type="checkbox" /> Mesa VIP</label>
                                    <label class="flex items-center gap-2 text-xs font-semibold text-slate-300"><input id="mapa-meta-reservable" type="checkbox" /> Reservable</label>
                                    <label class="flex items-center gap-2 text-xs font-semibold text-slate-300"><input id="mapa-meta-extras-allowed" type="checkbox" /> Extras permitidos</label>
                                    <label class="text-[10px] font-bold uppercase text-slate-500">Estado visual
                                      <select id="mapa-meta-visual-state" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white">
                                        <option value="">Automatico</option>
                                        <option value="libre">Libre</option>
                                        <option value="apartada_mia">Apartada por mi</option>
                                        <option value="apartada">Apartada por otro</option>
                                        <option value="ocupada">Ocupada</option>
                                        <option value="no_reservable">No reservable</option>
                                      </select>
                                    </label>
                                    <label class="text-[10px] font-bold uppercase text-slate-500 sm:col-span-2">Zona<input id="mapa-meta-zone" type="text" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white" placeholder="Alberca de olas" /></label>
                                    <label class="text-[10px] font-bold uppercase text-slate-500 sm:col-span-2">Tags separados por coma<input id="mapa-meta-tags" type="text" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white" placeholder="VIP, Sombra, Familiar" /></label>
                                    <label class="text-[10px] font-bold uppercase text-slate-500 sm:col-span-2">Descripcion publica<input id="mapa-meta-description" type="text" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white" /></label>
                                    <label class="text-[10px] font-bold uppercase text-slate-500 sm:col-span-2">Extras disponibles
                                      <textarea id="mapa-meta-extras" rows="3" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white placeholder:text-slate-600" placeholder="asador | Asador portatil | 150&#10;hielera | Hielera con hielos | 120"></textarea>
                                    </label>
                                  </div>
                                  <div id="mapa-parking-metadata" class="hidden grid grid-cols-2 gap-2">
                                    <label class="text-[10px] font-bold uppercase text-slate-500 sm:col-span-2">Codigo del cajon
                                      <input id="mapa-meta-parking-code" type="text" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white" placeholder="A-12" />
                                    </label>
                                    <label class="text-[10px] font-bold uppercase text-slate-500 sm:col-span-2">Estado base (plano)
                                      <select id="mapa-meta-parking-status" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white">
                                        <option value="libre">Libre</option>
                                        <option value="ocupado">Ocupado</option>
                                        <option value="reservado">Reservado</option>
                                        <option value="mantenimiento">Mantenimiento</option>
                                        <option value="taller">Taller</option>
                                        <option value="sucio">Sucio</option>
                                      </select>
                                    </label>
                                    <label class="text-[10px] font-bold uppercase text-slate-500 sm:col-span-2">Zona operativa<input id="mapa-meta-parking-zone" type="text" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white" /></label>
                                    <label class="text-[10px] font-bold uppercase text-slate-500 sm:col-span-2">Reservado por (nota interna)<input id="mapa-meta-parking-reserved" type="text" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white" placeholder="Opcional" /></label>
                                  </div>
                                  <div id="mapa-pool-metadata" class="hidden grid grid-cols-2 gap-2">
                                    <label class="text-[10px] font-bold uppercase text-slate-500 sm:col-span-2">Nombre publico<input id="mapa-meta-pool-public" type="text" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white" /></label>
                                    <label class="text-[10px] font-bold uppercase text-slate-500 sm:col-span-2">Tipo
                                      <select id="mapa-meta-pool-type" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white">
                                        <option value="alberca">Alberca</option>
                                        <option value="chapoteadero">Chapoteadero</option>
                                        <option value="olas">Olas</option>
                                        <option value="zona_libre">Zona libre</option>
                                        <option value="waterarea">Area acuatica</option>
                                      </select>
                                    </label>
                                    <label class="text-[10px] font-bold uppercase text-slate-500">Capacidad aprox.<input id="mapa-meta-pool-cap" type="number" min="0" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white" /></label>
                                    <label class="text-[10px] font-bold uppercase text-slate-500 sm:col-span-2">Reglas o avisos publicos<input id="mapa-meta-pool-rules" type="text" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white" /></label>
                                  </div>
                                  <div id="mapa-generic-metadata" class="grid grid-cols-2 gap-2">
                                    <label class="text-[10px] font-bold uppercase text-slate-500">Codigo spot<input id="mapa-meta-spot" type="text" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white" /></label>
                                    <label class="text-[10px] font-bold uppercase text-slate-500">Zona<input id="mapa-meta-generic-zone" type="text" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white" /></label>
                                    <label class="text-[10px] font-bold uppercase text-slate-500 sm:col-span-2">Descripcion publica<input id="mapa-meta-generic-description" type="text" class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm text-white" /></label>
                                  </div>
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
                                <div class="grid grid-cols-2 gap-2 pt-1">
                                  <button type="button" id="mapa-dup-row" class="rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-slate-300 hover:bg-white/10" title="Duplicar seleccion hacia abajo">Dup. fila</button>
                                  <button type="button" id="mapa-dup-col" class="rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-slate-300 hover:bg-white/10" title="Duplicar seleccion a la derecha">Dup. columna</button>
                                  <button type="button" id="mapa-dup-grid" class="rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-slate-300 hover:bg-white/10" title="Cuadricula 2x2 de copias">Dup. cuadricula</button>
                                  <button type="button" id="mapa-flip-h" class="rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-slate-300 hover:bg-white/10" title="Voltear horizontal">Voltear H</button>
                                  <button type="button" id="mapa-flip-v" class="rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-slate-300 hover:bg-white/10" title="Voltear vertical">Voltear V</button>
                                  <button type="button" id="mapa-mesa-vip" class="rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-amber-200 hover:bg-white/10" title="Marcar mesa como VIP">VIP</button>
                                  <button type="button" id="mapa-mesa-nores" class="rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-slate-300 hover:bg-white/10" title="No reservable">No reservable</button>
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
                              <div id="mapa-inspector-visibility-panel" class="hidden space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
                                <p class="text-[10px] font-black uppercase tracking-widest text-cyan-200">Visible en</p>
                                <p class="text-[11px] font-semibold text-slate-400">Elige en qué vistas se mostrará este elemento.</p>
                                <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200"><span>Global</span><input id="mapa-visible-global" type="checkbox" /></label>
                                <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200"><span>Mesas</span><input id="mapa-visible-mesas" type="checkbox" /></label>
                                <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200"><span>Estacionamiento</span><input id="mapa-visible-estacionamiento" type="checkbox" /></label>
                                <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200"><span>Albercas</span><input id="mapa-visible-albercas" type="checkbox" /></label>
                                <label class="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-400"><input id="mapa-show-context" type="checkbox" checked /> Mostrar contexto atenuado</label>
                              </div>
                              <div id="mapa-inspector-layers-panel" class="mt-4 border-t border-white/10 pt-4">
                                <div class="mb-2 flex items-center justify-between">
                                  <p class="text-[10px] font-black uppercase tracking-widest text-slate-500">Capas e items</p>
                                  <span id="mapa-layer-count" class="text-[10px] font-bold text-slate-500">0</span>
                                </div>
                                <div class="mb-2 grid grid-cols-1 gap-2">
                                  <input id="mapa-layers-search" type="text" class="rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white" placeholder="Buscar por nombre..." />
                                  <select id="mapa-layers-kind-filter" class="rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white">
                                    <option value="">Todos los tipos</option>
                                    <option value="mesa">Mesas</option>
                                    <option value="parkingSpot">Parking</option>
                                    <option value="alberca">Albercas</option>
                                    <option value="area">Áreas</option>
                                    <option value="servicio">Servicios</option>
                                  </select>
                                </div>
                                <div id="mapa-layers-list" class="max-h-56 space-y-1 overflow-auto pr-1 text-xs"></div>
                              </div>
                            </aside>
                          </div>

                          <footer class="mapa-ws-footer flex flex-wrap items-center gap-3 border-t border-white/10 bg-black/30 px-4 py-2.5">
                            <span class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Barra de estado</span>
                            <label class="flex cursor-pointer items-center gap-2 rounded-full bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-300">
                              <input id="mapa-show-context-footer" type="checkbox" checked class="rounded border-white/30" />
                              Mostrar contexto en lienzo
                            </label>
                            <span class="hidden h-4 w-px bg-white/10 sm:block" aria-hidden="true"></span>
                            <span class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Atajos</span>
                            <span class="rounded-full bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-400">Ctrl+Z / Ctrl+Shift+Z</span>
                            <span class="rounded-full bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-400">Shift+clic multiseleccion</span>
                            <span class="rounded-full bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-400">Ctrl+D duplicar</span>
                          </footer>
                        </div>
                      </div>
                    </div>

                    <div id="sitio-tab-extras" class="sitio-tab-panel hidden space-y-6">
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
                    </div>
                </div>` : ''}
            </div>
        </div>
    `;
  },

  mount: async () => {
    const panelTickets = document.getElementById('admin-panel-tickets');
    const panelParking = document.getElementById('admin-panel-parking');
    const panelInventario = document.getElementById('admin-panel-inventario');
    const panelCorteDia = document.getElementById('admin-panel-corte-dia');
    const panelSoporte = document.getElementById('admin-panel-soporte');
    const panelBitacora = document.getElementById('admin-panel-bitacora');
    const panelAdmin = document.getElementById('admin-panel-admin');
    const panelSitio = document.getElementById('admin-panel-sitio');
    const panelTicketTypes = document.getElementById('admin-panel-ticket-types');
    const hint = document.getElementById('admin-rol-hint');
    const sidebar = document.getElementById('admin-sidebar');
    const collapse = document.getElementById('admin-sidebar-collapse');
    const access = await getUserAccess(getCurrentUser());
    const showDiscountTechnical =
      access.isProgramador === true || access.can('programador.access');
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
          setDangerousDeleteStatus('Operacion no disponible en Postgres (RPC/tablas). Revisa supabase/schema.sql y despliegue.', 'err');
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

    if (hint) hint.textContent = `Sesión: ${access.roleLabel}.`;

    const showMoneyKpis =
      access.can('finance.view') || access.can('admin.panel') || access.isProgramador === true;
    const showInventoryKpis =
      access.can('inventory.manage') ||
      access.can('inventory.adjust') ||
      access.can('admin.panel') ||
      access.isProgramador === true;
    const showDiscountKpis =
      access.can('admin.panel') ||
      access.can('finance.view') ||
      access.isProgramador === true ||
      access.can('programador.access');
    const showParkingKpi =
      access.can('parking.manage') ||
      access.can('admin.panel') ||
      access.isProgramador === true ||
      access.can('programador.access');
    const canProgramadorTools =
      access.isProgramador === true || access.can('programador.access');
    const canBitacoraQuick =
      access.can('dashboard.manage') ||
      access.can('admin.panel') ||
      access.can('programador.access') ||
      access.can('users.permissions');
    const canSupportQuick =
      canBitacoraQuick ||
      access.can('tickets.scan') ||
      access.can('sales.physical');
    const canCorteDia =
      access.can('sales.physical') ||
      access.can('finance.view') ||
      access.can('dashboard.manage') ||
      access.can('admin.panel') ||
      access.can('programador.access');
    const showLandingQuick =
      access.can('landing.manage') ||
      access.can('admin.panel') ||
      canProgramadorTools;

    const renderExecQuickLinks = () => {
      const ql = document.getElementById('exec-dash-quick');
      if (!ql) return;
      const links = [];
      if (access.can('tickets.scan')) {
        links.push({
          href: '/escaner',
          label: 'Escanear ticket',
          icon: 'scan',
          primary: true
        });
      }
      if (showLandingQuick) {
        links.push({ href: '/admin/dashboard?section=sitio', label: 'Editar landing', icon: 'palette' });
        links.push({
          href: '/admin/dashboard?section=sitio&mapfocus=1',
          label: 'Editar mapa',
          icon: 'map'
        });
      }
      if (access.can('packages.manage') || access.can('admin.panel') || canProgramadorTools) {
        links.push({
          href: '/admin/dashboard?section=ticket-types',
          label: 'Catálogo tickets',
          icon: 'ticket'
        });
      }
      if (access.can('admin.panel') || access.can('finance.view') || canProgramadorTools) {
        links.push({
          href: '/admin/dashboard?section=tickets',
          label: 'Descuentos',
          icon: 'sparkles'
        });
      }
      if (access.can('inventory.manage') || access.can('admin.panel') || canProgramadorTools) {
        links.push({
          href: '/admin/dashboard?section=inventario',
          label: 'Inventario',
          icon: 'package'
        });
      }
      if (access.can('parking.manage') || access.can('admin.panel') || canProgramadorTools) {
        links.push({
          href: '/admin/dashboard?section=parking',
          label: 'Parking',
          icon: 'parking'
        });
      }
      if (access.can('dashboard.manage')) {
        links.push({
          href: '/admin/dashboard?section=tickets#admin-mesa-reservas-operativas',
          label: 'Reservas mesas',
          icon: 'clock'
        });
      }
      if (access.can('users.permissions') || access.can('roles.manage') || canProgramadorTools) {
        links.push({ href: '/programador', label: 'Usuarios y roles', icon: 'code' });
      }
      if (canSupportQuick) {
        links.push({ href: '/admin/dashboard?section=soporte', label: 'Buscar ticket', icon: 'users' });
      }
      if (canBitacoraQuick) {
        links.push({ href: '/admin/dashboard?section=bitacora', label: 'Ver bitácora', icon: 'clock' });
      }
      if (canCorteDia) {
        links.push({ href: '/admin/dashboard?section=corte-dia', label: 'Corte del día', icon: 'clock' });
      }
      if (access.can('sales.physical') || access.can('admin.panel') || canProgramadorTools) {
        links.push({ href: '/operacion/venta', label: 'Venta física', icon: 'package' });
      }
      ql.innerHTML = links
        .map((l) => {
          const cls = l.primary ? 'exec-quick-btn exec-quick-btn--primary' : 'exec-quick-btn';
          return `<a href="${escapeHtml(l.href)}" data-link class="${cls}">${icon(l.icon, 'h-5 w-5')}<span>${escapeHtml(l.label)}</span></a>`;
        })
        .join('');
    };

    const loadExecutiveDashboard = async () => {
      const sk = document.getElementById('exec-dash-skeleton');
      const body = document.getElementById('exec-dash-body');
      const dateLine = document.getElementById('exec-dash-date-line');
      if (dateLine) {
        dateLine.textContent = `Fecha operativa (MX): ${formatFechaDia()} · Actualizado: —`;
      }
      sk?.classList.remove('hidden');
      body?.classList.add('hidden');
      try {
        const pendingRows = await listPendingScans().catch(() => []);
        const pendingOffline = pendingRows.length;
        const payload = await getExecutiveDashboardData({
          includeTechnicalAlerts:
            access.isProgramador === true || access.can('programador.access')
        });
        const {
          sales,
          tickets,
          mesaReservas,
          parking,
          inventory,
          discounts,
          scanner,
          landing,
          ticketTypes,
          alerts,
          recentActivity,
          feeds
        } = payload;

        if (dateLine) {
          dateLine.textContent = `Fecha operativa (MX): ${formatFechaDia()} · Actualizado: ${new Date(
            payload.loadedAt
          ).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
        }

        const kpis = document.getElementById('exec-dash-kpis');
        if (kpis) {
          const cards = [];

          if (showMoneyKpis) {
            let sub = `${sales.paidCount || 0} pagos · ${sales.ticketsCount || 0} ventas registradas`;
            if (sales.compareVsYesterday && sales.hasYesterdaySlice) {
              const d = Number(sales.compareVsYesterday.deltaPaid || 0);
              const sign = d >= 0 ? '+' : '';
              sub += ` · vs ayer ${sign}${fmtMxMoney(d)}`;
            }
            cards.push({
              title: 'Ventas del día (pagado)',
              value: fmtMxMoney(sales.totalPaid || 0),
              sub,
              cta: { label: 'Ver tickets', href: '/admin/dashboard?section=tickets' },
              tone: 'normal'
            });
            cards.push({
              title: 'Ingreso estimado (hoy)',
              value: fmtMxMoney(sales.estimatedRevenue || 0),
              sub: `Pendiente taquilla ${fmtMxMoney(sales.pendingAmount || 0)}`,
              tone: 'normal'
            });
          }

          cards.push({
            title: 'Tickets vendidos hoy',
            value: String(tickets.soldToday ?? '—'),
            sub: `${tickets.validOutstanding ?? 0} pendientes de escanear · ${tickets.cancelledToday ?? 0} cancelados`,
            cta: canScan ? { label: 'Abrir escáner', href: '/escaner' } : null,
            tone: Number(tickets.validOutstanding) > 5 ? 'warning' : 'normal'
          });

          cards.push({
            title: 'Escaneados hoy',
            value: String(tickets.scannedToday ?? '—'),
            sub:
              Number(tickets.soldToday) > 0
                ? `de ${tickets.soldToday} vendidos hoy`
                : 'Sin ventas registradas hoy',
            cta: canScan ? { label: 'Auditar escaneos', href: '/escaner' } : null,
            tone: 'info'
          });

          if (canScan) {
            cards.push({
              title: 'Cola offline (este dispositivo)',
              value: String(pendingOffline),
              sub: 'Pendientes de sincronizar cuando haya red',
              tone: pendingOffline > 0 ? 'warning' : 'normal'
            });
          }

          cards.push({
            title: 'Mesas (hoy)',
            value: String(mesaReservas.total ?? 0),
            sub: showMoneyKpis
              ? `${mesaReservas.apartadas ?? 0} apartadas · ingreso pagado ${fmtMxMoney(
                  mesaReservas.ingresoPagadoEstimado || 0
                )}`
              : `${mesaReservas.apartadas ?? 0} apartadas`,
            cta: {
              label: 'Ver reservas',
              href: '/admin/dashboard?section=tickets#admin-mesa-reservas-operativas'
            },
            tone: Number(mesaReservas.pagadasPendientes) > 0 ? 'warning' : 'normal'
          });

          if (showParkingKpi && parking.ok && parking.total > 0) {
            cards.push({
              title: 'Parking',
              value:
                parking.ocupacionPct != null ? `${parking.ocupacionPct}% ocup.` : `${parking.libres}/${parking.total}`,
              sub: `${parking.libres} libres · ${parking.ocupados} ocup. · ${parking.reservados} res. · mant. ${(parking.mantenimiento || 0) + (parking.taller || 0)}`,
              cta: { label: 'Gestionar', href: '/admin/dashboard?section=parking' },
              tone:
                parking.ocupacionPct != null && parking.ocupacionPct >= 85 ? 'warning' : 'normal'
            });
          }

          if (showInventoryKpis) {
            cards.push({
              title: 'Inventario activo',
              value: String(inventory.activeProductsCount ?? '—'),
              sub: `${inventory.lowStockCount ?? 0} bajo stock · ${inventory.zeroStockCount ?? 0} sin stock`,
              cta: { label: 'Ver inventario', href: '/admin/dashboard?section=inventario' },
              tone:
                Number(inventory.zeroStockCount) > 0
                  ? 'danger'
                  : Number(inventory.lowStockCount) > 0
                    ? 'warning'
                    : 'normal'
            });
            if (Number(inventory.reservedApproxTotal) > 0) {
              cards.push({
                title: 'Stock reservado (aprox.)',
                value: String(inventory.reservedApproxTotal),
                sub: 'Unidades comprometidas en catálogo',
                tone: 'info'
              });
            }
          }

          if (showDiscountKpis) {
            cards.push({
              title: 'Descuentos',
              value: String(discounts.activeUsefulCount ?? 0),
              sub: `${discounts.exhaustedActiveCount ?? 0} activos sin usos · ${discounts.expiringSoonCount ?? 0} vigencias próximas`,
              cta: { label: 'Ir a descuentos', href: '/admin/dashboard?section=tickets' },
              tone: Number(discounts.brokenRulesDiscountCount) > 0 ? 'warning' : 'normal'
            });
          }

          if (showLandingQuick) {
            cards.push({
              title: 'Sitio público',
              value: landing.ok ? (landing.abierto ? 'Abierto' : 'Cerrado') : '—',
              sub: landing.ok
                ? landing.descripcionOk
                  ? 'Descripción lista'
                  : 'Descripción corta o vacía'
                : 'Sin datos',
              cta: { label: 'Editar landing', href: '/admin/dashboard?section=sitio' },
              tone: landing.ok && !landing.descripcionOk ? 'warning' : 'normal'
            });
          }

          if (ticketTypes.ok) {
            cards.push({
              title: 'Tickets en catálogo',
              value: String(ticketTypes.activeCount ?? 0),
              sub: `${ticketTypes.total ?? 0} tipos totales`,
              cta: { label: 'Editor tickets', href: '/admin/dashboard?section=ticket-types' },
              tone: Number(ticketTypes.activeCount) === 0 ? 'danger' : 'normal'
            });
          }

          cards.push({
            title: 'Último escaneo',
            value: scanner.lastScanAt ? relativeTimeEs(scanner.lastScanAt) : '—',
            sub: feeds?.scansPreview?.length
              ? `Últimos: ${feeds.scansPreview
                  .slice(0, 3)
                  .map((s) => String(s.result || '').slice(0, 14))
                  .join(', ')}`
              : 'Sin auditoría reciente visible',
            cta: canScan ? { label: 'Escáner', href: '/escaner' } : null,
            tone: 'info'
          });

          kpis.innerHTML = cards
            .map((c) => {
              const ctaHtml = c.cta
                ? `<a href="${escapeHtml(c.cta.href)}" data-link class="exec-dash-card-cta">${escapeHtml(c.cta.label)} →</a>`
                : '';
              return `
              <div class="${execDashCardClass(c.tone)}">
                <p class="exec-dash-card-kicker">${escapeHtml(c.title)}</p>
                <p class="exec-dash-card-value">${escapeHtml(String(c.value))}</p>
                <p class="exec-dash-card-sub">${escapeHtml(c.sub)}</p>
                ${ctaHtml}
              </div>`;
            })
            .join('');
        }

        const alRoot = document.getElementById('exec-dash-alerts');
        if (alRoot) {
          if (!alerts.length) {
            alRoot.innerHTML =
              '<p class="text-sm font-semibold text-slate-500">Sin alertas críticas. Operación dentro de parámetros.</p>';
          } else {
            alRoot.innerHTML = alerts
              .map((a) => {
                const btn =
                  a.actionLabel && a.href
                    ? `<a href="${escapeHtml(a.href)}" data-link class="exec-dash-alert-btn">${escapeHtml(a.actionLabel)}</a>`
                    : '';
                const sev =
                  a.severity === 'danger'
                    ? 'exec-dash-alert is-danger'
                    : a.severity === 'warning'
                      ? 'exec-dash-alert is-warn'
                      : 'exec-dash-alert is-info';
                return `<div class="${sev}"><p class="exec-dash-alert-title">${escapeHtml(a.title)}</p><p class="exec-dash-alert-body">${escapeHtml(a.body)}</p>${btn}</div>`;
              })
              .join('');
          }
        }

        const actRoot = document.getElementById('exec-dash-activity');
        if (actRoot) {
          if (!recentActivity.length) {
            actRoot.innerHTML =
              '<li class="text-sm font-semibold text-slate-500">Todavía no hay actividad reciente.</li>';
          } else {
            actRoot.innerHTML = recentActivity
              .map((row) => {
                const link = row.href
                  ? `<a href="${escapeHtml(row.href)}" data-link class="exec-dash-act-link">Ver</a>`
                  : '';
                return `<li class="exec-dash-act-row">
                  <div class="exec-dash-act-icon">${icon(row.icon || 'sparkles', 'h-5 w-5')}</div>
                  <div class="min-w-0 flex-1">
                    <p class="exec-dash-act-title">${escapeHtml(row.title)}</p>
                    <p class="exec-dash-act-body">${escapeHtml(row.body)}</p>
                  </div>
                  <div class="exec-dash-act-meta">
                    <span>${escapeHtml(relativeTimeEs(row.at))}</span>
                    ${link}
                  </div>
                </li>`;
              })
              .join('');
          }
        }

        sk?.classList.add('hidden');
        body?.classList.remove('hidden');
      } catch (e) {
        console.warn('[exec dashboard]', e);
        sk?.classList.add('hidden');
        body?.classList.remove('hidden');
        const kpisErr = document.getElementById('exec-dash-kpis');
        if (kpisErr)
          kpisErr.innerHTML =
            '<div class="exec-dash-card is-danger sm:col-span-2 lg:col-span-4"><p class="exec-dash-card-kicker">Métricas</p><p class="exec-dash-card-value">Parcial</p><p class="exec-dash-card-sub">No se pudieron cargar todas las métricas. Revisa permisos o la conexión.</p></div>';
      }
    };

    renderExecQuickLinks();
    document.getElementById('exec-dash-refresh')?.addEventListener('click', () => void loadExecutiveDashboard());
    void loadExecutiveDashboard();

    const showSection = (name) => {
      if (name === 'sitio' && !panelSitio) return;
      if (name === 'ticket-types' && !panelTicketTypes) return;
      if (name === 'admin' && !panelAdmin) return;
      if (name === 'inventario' && !panelInventario) return;
      if (name === 'corte-dia' && !panelCorteDia) return;
      if (name === 'parking' && !panelParking) return;
      if (name === 'soporte' && !panelSoporte) return;
      if (name === 'bitacora' && !panelBitacora) return;
      if (panelTickets) panelTickets.classList.toggle('hidden', name !== 'tickets');
      if (panelParking) panelParking.classList.toggle('hidden', name !== 'parking');
      if (panelInventario) panelInventario.classList.toggle('hidden', name !== 'inventario');
      if (panelCorteDia) panelCorteDia.classList.toggle('hidden', name !== 'corte-dia');
      if (panelSoporte) panelSoporte.classList.toggle('hidden', name !== 'soporte');
      if (panelBitacora) panelBitacora.classList.toggle('hidden', name !== 'bitacora');
      if (panelAdmin) panelAdmin.classList.toggle('hidden', name !== 'admin');
      if (panelSitio) panelSitio.classList.toggle('hidden', name !== 'sitio');
      if (panelTicketTypes) panelTicketTypes.classList.toggle('hidden', name !== 'ticket-types');
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
        if (sec === 'ticket-types') initTicketTypesPanel();
        if (sec === 'parking') initParkingPanel();
        if (sec === 'inventario') initInventarioPanel();
        if (sec === 'corte-dia') initCorteDiaPanel();
        if (sec === 'soporte') initSupportPanel();
        if (sec === 'bitacora') initBitacoraPanel();
      });
    });
    const adminUrlParams = new URLSearchParams(window.location.search);
    const requestedInitialSection = adminUrlParams.get('section') || 'tickets';
    const mapEditorFocus = adminUrlParams.get('mapfocus') === '1';

    let mapEditor = null;
    let sitioReady = false;
    let bumpLandingUiRef = null;

    const wireBotonRemove = () => {
      document.querySelectorAll('[data-boton-remove]').forEach((b) => {
        b.onclick = () => {
          b.closest('[data-botom-fila]')?.remove();
          bumpLandingUiRef?.();
        };
      });
    };

    const setBotonesUi = (jsonStr) => {
      const wrap = document.getElementById('lp-botones-rows');
      if (!wrap) return;
      const { buttons } = splitBotonesJson(jsonStr);
      wrap.innerHTML = renderBotonRows(buttons);
      wireBotonRemove();
    };

    let ticketTypesPanelReady = false;
    let ticketTypesCache = [];

    const mountTicketTypesWorkspace = async () => {
      const listEl = document.getElementById('ticket-admin-list');
      const idEl = document.getElementById('ticket-edit-id');
      const headingEl = document.getElementById('ticket-edit-heading');
      const subEl = document.getElementById('ticket-edit-sub');
      const fieldsWrap = document.getElementById('ticket-edit-fields');
      const statusEl = document.getElementById('ticket-edit-status');
      const nombre = document.getElementById('ticket-edit-nombre');
      const precio = document.getElementById('ticket-edit-precio');
      const orden = document.getElementById('ticket-edit-orden');
      const categoria = document.getElementById('ticket-edit-categoria');
      const desc = document.getElementById('ticket-edit-desc');
      const incluye = document.getElementById('ticket-edit-incluye');
      const activo = document.getElementById('ticket-edit-activo');
      const especial = document.getElementById('ticket-edit-especial');
      const fmtMoney = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 2
      });

      const setStatus = (msg, tone = 'muted') => {
        if (!statusEl) return;
        statusEl.textContent = msg || '';
        statusEl.className =
          tone === 'ok'
            ? 'text-xs font-semibold text-emerald-700'
            : tone === 'err'
              ? 'text-xs font-semibold text-rose-700'
              : 'text-xs font-semibold text-slate-500';
      };

      const fillForm = (row, mode) => {
        const isNew = mode === 'new';
        if (idEl) idEl.value = isNew ? '' : row?.id || '';
        if (headingEl) headingEl.textContent = isNew ? 'Nuevo ticket' : `Editando · ${row?.nombre || ''}`;
        if (subEl)
          subEl.textContent = isNew
            ? 'Completa los campos y guarda.'
            : `${row?.activo ? 'Activo' : 'Inactivo'} · ${row?.especial ? 'Especial' : 'General'}`;
        if (fieldsWrap) fieldsWrap.classList.remove('hidden');
        if (nombre) nombre.value = isNew ? '' : row?.nombre || '';
        if (precio) precio.value = isNew ? '' : String(Number(row?.precio || 0));
        if (orden) orden.value = isNew ? '0' : String(Number(row?.orden ?? 0));
        if (categoria) categoria.value = isNew ? '' : row?.categoria || '';
        if (desc) desc.value = isNew ? '' : row?.descripcion || '';
        if (incluye) incluye.value = isNew ? '' : row?.incluye || '';
        if (activo) activo.checked = isNew ? true : Boolean(row?.activo);
        if (especial) especial.checked = isNew ? false : Boolean(row?.especial);
        setStatus('');
      };

      const renderList = () => {
        if (!listEl) return;
        if (!ticketTypesCache.length) {
          listEl.innerHTML = '<p class="text-xs text-slate-500">No hay tickets. Pulsa Nuevo.</p>';
          return;
        }
        listEl.innerHTML = ticketTypesCache
          .slice()
          .sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0))
          .map((t) => {
            const sum = (t.descripcion || '').slice(0, 72);
            return `
            <button type="button" class="ticket-admin-card w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-cyan-300 hover:bg-white"
              data-ticket-select="${escapeHtml(t.id)}">
              <div class="flex items-start justify-between gap-2">
                <span class="font-black text-slate-900">${escapeHtml(t.nombre)}</span>
                <span class="shrink-0 text-xs font-black text-slate-700">${escapeHtml(fmtMoney.format(Number(t.precio || 0)))}</span>
              </div>
              <div class="mt-1 flex flex-wrap gap-1">
                ${t.activo ? '<span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">Activo</span>' : '<span class="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-600">Off</span>'}
                ${t.especial ? '<span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900">Especial</span>' : '<span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">General</span>'}
              </div>
              ${sum ? `<p class="mt-1 line-clamp-2 text-[11px] text-slate-600">${escapeHtml(sum)}${(t.descripcion || '').length > 72 ? '…' : ''}</p>` : ''}
            </button>`;
          })
          .join('');
        listEl.querySelectorAll('[data-ticket-select]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const tid = btn.getAttribute('data-ticket-select');
            const row = ticketTypesCache.find((x) => x.id === tid);
            if (row) fillForm(row, 'edit');
          });
        });
      };

      const reload = async () => {
        if (!listEl) return;
        listEl.innerHTML = '<p class="text-xs text-slate-500">Cargando...</p>';
        try {
          const res = await listTicketTypesAdmin();
          ticketTypesCache = res.data?.ticketTypes || [];
          renderList();
        } catch (e) {
          listEl.innerHTML = `<p class="text-xs text-rose-600">${escapeHtml(e?.message || 'Error al cargar.')}</p>`;
        }
      };

      document.getElementById('ticket-admin-new')?.addEventListener('click', () => fillForm(null, 'new'));
      document.getElementById('ticket-admin-refresh')?.addEventListener('click', reload);

      document.getElementById('ticket-edit-save')?.addEventListener('click', async () => {
        const saveBtn = document.getElementById('ticket-edit-save');
        const rawNombre = String(nombre?.value || '').trim();
        const p = Number(precio?.value || 0);
        if (!rawNombre) {
          setStatus('El nombre es obligatorio.', 'err');
          return;
        }
        if (p < 0) {
          setStatus('Precio invalido.', 'err');
          return;
        }
        const payload = {
          nombre: rawNombre,
          descripcion: String(desc?.value || ''),
          incluye: String(incluye?.value || ''),
          precio: p,
          categoria: String(categoria?.value || ''),
          orden: Number(orden?.value || 0),
          activo: Boolean(activo?.checked),
          especial: Boolean(especial?.checked),
          metadata: {}
        };
        setStatus('Guardando...');
        if (saveBtn) saveBtn.disabled = true;
        try {
          const existingId = String(idEl?.value || '').trim();
          if (existingId) {
            await updateTicketType({ id: existingId, ...payload });
            void logAuditEvent({
              eventType: 'ticket_type_editado',
              entityType: 'ticket_type',
              entityId: existingId,
              title: 'Ticket type editado',
              description: `Se actualizó ${payload.nombre}.`,
              metadata: { id: existingId, payload }
            });
            setStatus('Guardado.', 'ok');
          } else {
            await createTicketType(payload);
            void logAuditEvent({
              eventType: 'ticket_type_creado',
              entityType: 'ticket_type',
              title: 'Ticket type creado',
              description: `Se creó ${payload.nombre}.`,
              metadata: { payload }
            });
            setStatus('Ticket creado.', 'ok');
            if (idEl) idEl.value = '';
          }
          await publishAppUpdate('sales', 'ticket-types-updated');
          await reload();
        } catch (e) {
          const m = String(e?.message || '').toLowerCase();
          const isRls =
            e?.code === '42501' ||
            e?.status === 403 ||
            m.includes('permission denied') ||
            m.includes('row-level security');
          setStatus(isRls ? 'Sin permiso (RLS). Revisa rol en Supabase.' : e?.message || 'Error al guardar.', 'err');
        } finally {
          if (saveBtn) saveBtn.disabled = false;
        }
      });

      document.getElementById('ticket-edit-dup')?.addEventListener('click', async () => {
        const existingId = String(idEl?.value || '').trim();
        const row = ticketTypesCache.find((x) => x.id === existingId);
        if (!row) {
          setStatus('Selecciona un ticket para duplicar.', 'err');
          return;
        }
        setStatus('Duplicando...');
        try {
          await createTicketType({
            nombre: `${row.nombre} (copia)`.slice(0, 120),
            descripcion: row.descripcion || '',
            incluye: row.incluye || '',
            precio: Number(row.precio || 0),
            categoria: row.categoria || '',
            orden: Number(row.orden ?? 0) + 1,
            activo: Boolean(row.activo),
            especial: Boolean(row.especial),
            metadata: row.metadata || {}
          });
          await publishAppUpdate('sales', 'ticket-types-duplicated');
          await reload();
          setStatus('Duplicado.', 'ok');
        } catch (e) {
          setStatus(e?.message || 'No se pudo duplicar.', 'err');
        }
      });

      document.getElementById('ticket-edit-toggle')?.addEventListener('click', async () => {
        const existingId = String(idEl?.value || '').trim();
        if (!existingId) {
          setStatus('Selecciona un ticket.', 'err');
          return;
        }
        const row = ticketTypesCache.find((x) => x.id === existingId);
        if (!row) return;
        setStatus('Actualizando estado...');
        try {
          await deactivateTicketType({ id: existingId, activo: !row.activo });
          void logAuditEvent({
            eventType: 'ticket_type_desactivado',
            entityType: 'ticket_type',
            entityId: existingId,
            title: 'Ticket type desactivado',
            description: `Se cambió estado de ${row.nombre || existingId} a ${row.activo ? 'inactivo' : 'activo'}.`,
            metadata: { id: existingId, activeNext: !row.activo }
          });
          await reload();
          const fresh = ticketTypesCache.find((x) => x.id === existingId);
          if (fresh) fillForm(fresh, 'edit');
          setStatus('Estado actualizado.', 'ok');
        } catch (e) {
          setStatus(e?.message || 'No se pudo cambiar estado.', 'err');
        }
      });

      document.getElementById('ticket-edit-del')?.addEventListener('click', async () => {
        const existingId = String(idEl?.value || '').trim();
        if (!existingId) {
          setStatus('Selecciona un ticket.', 'err');
          return;
        }
        if (!window.confirm('Eliminar este tipo de ticket de forma permanente?')) return;
        setStatus('Eliminando...');
        try {
          await deleteTicketType({ id: existingId });
          await publishAppUpdate('sales', 'ticket-types-deleted');
          await reload();
          fillForm(null, 'new');
          setStatus('Eliminado.', 'ok');
        } catch (e) {
          const raw = String(e?.message || '');
          const low = raw.toLowerCase();
          const code = e?.code;
          const fk =
            code === '23503' ||
            low.includes('foreign key') ||
            low.includes('llave for') ||
            low.includes('referencia') ||
            low.includes('still referenced');
          const rls =
            code === '42501' ||
            e?.status === 403 ||
            low.includes('permission denied') ||
            low.includes('row-level security');
          setStatus(
            fk
              ? 'No se puede eliminar: hay ventas u otras referencias a este ticket. Usa Activar/desactivar para ocultarlo.'
              : rls
                ? 'Sin permiso para eliminar (RLS). Prueba desactivar el ticket.'
                : raw || 'No se pudo eliminar. Prueba desactivar.',
            'err'
          );
        }
      });

      await reload();
    };

    const initTicketTypesPanel = async () => {
      if (ticketTypesPanelReady) return;
      ticketTypesPanelReady = true;
      await mountTicketTypesWorkspace();
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
      let baselineLanding = JSON.parse(JSON.stringify(landing));
      const weeklyWrap = document.getElementById('lp-weekly-grid');
      const specialsWrap = document.getElementById('lp-specials');

      const previewFrame = document.getElementById('lp-preview-frame');
      const previewDirty = document.getElementById('lp-preview-dirty');
      let selectedLbBlock = 'hero';
      let ticketTypesPreview = [];

      const LB_LABELS = {
        hero: 'Hero',
        estado: 'Estado del parque',
        descripcion: 'Descripcion',
        tickets: 'Tickets',
        servicios: 'Servicios',
        mapa: 'Mapa',
        botones: 'Botones / CTA',
        contacto: 'Contacto'
      };

      const fmtLbMoney = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 2
      });

      const paintMapEditorSaveStatus = () => {
        const st = document.getElementById('mapa-editor-save-status');
        if (!st || !previewDirty) return;
        const t = previewDirty.textContent || '';
        if (t.includes('sin guardar')) {
          st.textContent = 'Cambios sin guardar';
          st.className =
            'rounded-full bg-amber-500/25 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-100';
        } else {
          st.textContent = 'Guardado';
          st.className =
            'rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-200';
        }
      };

      const markDirty = () => {
        if (!previewDirty) return;
        previewDirty.textContent = 'Cambios sin guardar';
        previewDirty.className =
          'rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900';
        paintMapEditorSaveStatus();
      };

      const setDirtySaved = () => {
        if (!previewDirty) return;
        previewDirty.textContent = 'Guardado';
        previewDirty.className =
          'rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800';
        paintMapEditorSaveStatus();
      };

      const syncHeroInputsFromCe = (kind, text) => {
        const id =
          kind === 'kicker' ? 'lp-hero-kicker' : kind === 'title' ? 'lp-hero-title' : 'lp-hero-subtitle';
        const el = document.getElementById(id);
        if (el) el.value = text;
      };

      const paintLandingCanvas = () => {
        const root = document.getElementById('lb-canvas-root');
        if (!root) return;
        const hk = document.getElementById('lp-hero-kicker')?.value ?? '';
        const ht = document.getElementById('lp-hero-title')?.value ?? '';
        const hs = document.getElementById('lp-hero-subtitle')?.value ?? '';
        const desc = document.getElementById('lp-descripcion')?.value ?? '';
        const openNow = document.getElementById('lp-abierto')?.checked ?? false;
        const ocup = document.getElementById('lp-ocupacion')?.value ?? '';
        const park = document.getElementById('lp-estacionamiento')?.value ?? '';
        const sat = document.getElementById('lp-satelite')?.value?.trim() ?? '';
        const maps = document.getElementById('lp-maps')?.value?.trim() ?? '';

        const botRows = collectBotonesFromDom();
        const botPills = botRows
          .slice(0, 4)
          .map((b) => `<span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">${escapeHtml(b.label || 'Boton')}</span>`)
          .join(' ');

        const ticketsActive = ticketTypesPreview.filter((t) => t.activo).sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0));
        const ticketLines = ticketsActive.slice(0, 5).map((t) => {
          const tag = t.especial ? '★ ' : '';
          return `<li class="flex justify-between gap-2 border-b border-slate-100 py-1 text-[11px] text-slate-700"><span>${escapeHtml(tag + (t.nombre || ''))}</span><span class="font-mono text-slate-500">${escapeHtml(fmtLbMoney.format(Number(t.precio || 0)))}</span></li>`;
        });

        root.innerHTML = `
          <section data-lb-canvas-block="hero" tabindex="0" class="lb-canvas-block lb-canvas-hero rounded-t-xl border-b border-white/10 px-4 py-8 text-white sm:px-6 sm:py-10" style="background-image: linear-gradient(115deg, rgba(12, 74, 110, 0.92), rgba(13, 148, 136, 0.76)), url('${heroImageUrl}'); background-size: cover; background-position: center;">
            <div class="mx-auto max-w-3xl">
              <p data-lb-ce="kicker" contenteditable="true" spellcheck="false" class="lb-ce mb-2 text-[10px] font-black uppercase tracking-widest text-amber-200/90 outline-none">${escapeHtml(hk)}</p>
              <h2 data-lb-ce="title" contenteditable="true" spellcheck="false" class="lb-ce text-2xl font-black leading-tight outline-none sm:text-3xl">${escapeHtml(ht)}</h2>
              <p data-lb-ce="subtitle" contenteditable="true" spellcheck="false" class="lb-ce mt-3 max-w-xl text-sm leading-relaxed text-blue-100/95 outline-none">${escapeHtml(hs)}</p>
              <p class="mt-4 text-[10px] font-semibold text-white/70">Doble clic para editar · cambios en vivo</p>
            </div>
          </section>
          <section data-lb-canvas-block="estado" class="lb-canvas-block border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
            <p class="text-[10px] font-black uppercase text-cyan-700">Estado del dia</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <span class="rounded-lg px-2 py-1 text-xs font-black ${openNow ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}">${openNow ? 'Abierto ahora' : 'Cerrado'}</span>
              <span class="rounded-lg bg-cyan-50 px-2 py-1 text-xs font-bold text-cyan-900">Horario en inspector</span>
            </div>
            <p class="mt-2 whitespace-pre-wrap text-xs text-slate-600">${escapeHtml(ocup || 'Ocupacion (sin texto)')}</p>
            <p class="mt-1 whitespace-pre-wrap text-xs text-slate-600">${escapeHtml(park || 'Estacionamiento (sin texto)')}</p>
          </section>
          <section data-lb-canvas-block="descripcion" class="lb-canvas-block border-b border-slate-100 bg-slate-50 px-4 py-4 sm:px-6">
            <p class="text-[10px] font-black uppercase text-slate-500">Sobre el parque</p>
            <p class="mt-2 whitespace-pre-wrap text-sm text-slate-700">${escapeHtml(desc.slice(0, 420))}${desc.length > 420 ? '…' : ''}</p>
          </section>
          <section data-lb-canvas-block="tickets" class="lb-canvas-block border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
            <p class="text-[10px] font-black uppercase text-teal-800">Tickets</p>
            <ul class="mt-2">${ticketLines.length ? ticketLines.join('') : '<li class="text-xs text-slate-500">Sin tickets activos (catalogo).</li>'}</ul>
          </section>
          <section data-lb-canvas-block="servicios" class="lb-canvas-block border-b border-slate-100 bg-slate-50 px-4 py-4 sm:px-6">
            <p class="text-[10px] font-black uppercase text-slate-500">Servicios</p>
            <p class="mt-2 text-xs text-slate-600">Tarjetas gestionadas en la pestaña Servicios y enlaces.</p>
          </section>
          <section data-lb-canvas-block="mapa" class="lb-canvas-block border-b border-slate-100 bg-white px-4 py-6 sm:px-6">
            <p class="text-[10px] font-black uppercase text-cyan-800">Mapa del parque</p>
            <div class="mt-3 grid h-28 place-items-center rounded-xl border border-dashed border-cyan-200 bg-cyan-50/50 text-xs font-semibold text-cyan-900">Plano interactivo · editor en pestaña Mapa</div>
          </section>
          <section data-lb-canvas-block="botones" class="lb-canvas-block border-b border-slate-100 bg-slate-50 px-4 py-4 sm:px-6">
            <p class="text-[10px] font-black uppercase text-slate-500">Enlaces rapidos</p>
            <div class="mt-2 flex flex-wrap gap-1">${botPills || '<span class="text-xs text-slate-400">Sin botones</span>'}</div>
          </section>
          <section data-lb-canvas-block="contacto" class="lb-canvas-block rounded-b-xl bg-white px-4 py-4 sm:px-6">
            <p class="text-[10px] font-black uppercase text-slate-500">Ubicacion</p>
            <p class="mt-2 break-all text-xs text-slate-600">${sat ? `Imagen: ${escapeHtml(sat.slice(0, 48))}…` : 'Sin imagen satelital'}</p>
            <p class="mt-1 break-all text-xs text-slate-600">${maps ? `Maps: ${escapeHtml(maps.slice(0, 48))}…` : 'Sin enlace Maps'}</p>
          </section>
        `;

        root.querySelectorAll('[data-lb-ce]').forEach((el) => {
          el.addEventListener('paste', (ev) => {
            ev.preventDefault();
            const text = ev.clipboardData?.getData('text/plain') ?? '';
            if (typeof document.execCommand === 'function' && document.execCommand('insertText', false, text)) return;
            const sel = window.getSelection();
            if (!sel?.rangeCount) return;
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const node = document.createTextNode(text);
            range.insertNode(node);
            range.setStartAfter(node);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            syncHeroInputsFromCe(el.getAttribute('data-lb-ce') || '', el.textContent || '');
            markDirty();
          });
          el.addEventListener('input', () => {
            syncHeroInputsFromCe(el.getAttribute('data-lb-ce') || '', el.textContent || '');
            markDirty();
          });
          el.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter' && el.getAttribute('data-lb-ce') !== 'subtitle') {
              ev.preventDefault();
            }
          });
        });

        root.querySelectorAll('[data-lb-canvas-block]').forEach((el) => {
          el.addEventListener('click', (ev) => {
            const t = ev.target;
            if (t && t.closest && t.closest('[contenteditable="true"]')) return;
            selectLbBlock(el.getAttribute('data-lb-canvas-block') || 'hero');
          });
        });

        root.querySelectorAll('[data-lb-canvas-block]').forEach((el) => {
          el.classList.toggle(
            'lb-canvas-block--selected',
            el.getAttribute('data-lb-canvas-block') === selectedLbBlock
          );
        });
      };

      const selectLbBlock = (key) => {
        selectedLbBlock = key;
        document.querySelectorAll('.lb-structure-item').forEach((b) => {
          const on = b.getAttribute('data-lb-block') === key;
          b.classList.toggle('lb-structure-item--active', on);
        });
        document.querySelectorAll('[data-lb-canvas-block]').forEach((el) => {
          el.classList.toggle(
            'lb-canvas-block--selected',
            el.getAttribute('data-lb-canvas-block') === key
          );
        });
        document.querySelectorAll('.lb-inspector-panel').forEach((p) => p.classList.add('hidden'));
        document.getElementById(`lb-inspector-${key}`)?.classList.remove('hidden');
        const hint = document.getElementById('lb-inspector-hint');
        if (hint) hint.classList.add('hidden');
        const chip = document.getElementById('lb-selection-chip');
        if (chip) {
          chip.textContent = `${LB_LABELS[key] || key}`;
          chip.classList.remove('hidden');
        }
        const canvasEl = document.querySelector(`[data-lb-canvas-block="${key}"]`);
        canvasEl?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
      };

      const switchSitioTab = (tab) => {
        document.querySelectorAll('.sitio-subtab').forEach((b) => {
          const on = b.getAttribute('data-sitio-tab') === tab;
          b.classList.toggle('is-active', on);
          b.classList.toggle('text-slate-600', !on);
        });
        document.querySelectorAll('.sitio-tab-panel').forEach((p) => p.classList.add('hidden'));
        document.getElementById(`sitio-tab-${tab}`)?.classList.remove('hidden');
      };

      document.querySelectorAll('[data-sitio-tab]').forEach((btn) => {
        btn.addEventListener('click', () => switchSitioTab(btn.getAttribute('data-sitio-tab') || 'landing'));
      });
      document.querySelectorAll('[data-sitio-tab-jump]').forEach((btn) => {
        btn.addEventListener('click', () =>
          switchSitioTab(btn.getAttribute('data-sitio-tab-jump') || 'extras')
        );
      });

      document.querySelectorAll('.lb-structure-item').forEach((btn) => {
        btn.addEventListener('click', () =>
          selectLbBlock(btn.getAttribute('data-lb-block') || 'hero')
        );
      });

      document.getElementById('lb-jump-tickets-admin')?.addEventListener('click', () => {
        showSection('ticket-types');
        void initTicketTypesPanel();
      });

      const setVal = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.value = v;
      };

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
            bumpLandingUi();
          });
        });
        specialsWrap.querySelectorAll('[data-sp-del]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-sp-del') || '-1', 10);
            scheduleConfig.specials.splice(idx, 1);
            renderSpecials();
            bumpLandingUi();
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
            bumpLandingUi();
          });
        });
      };

      renderWeekly();
      renderSpecials();
      document.getElementById('lp-special-add')?.addEventListener('click', () => {
        scheduleConfig.specials.push({ date: '', label: '', open: '09:00', close: '18:00', closed: false });
        renderSpecials();
        bumpLandingUi();
      });

      const splitHeroLoad = splitBotonesJson(landing.botonesJson);
      setVal('lp-descripcion', landing.descripcionParque);
      setVal('lp-ocupacion', landing.ocupacionTexto);
      setVal('lp-estacionamiento', landing.estacionamientoTexto);
      setVal('lp-satelite', landing.imagenSatelitalUrl);
      setVal('lp-maps', landing.googleMapsUrl);
      setVal('lp-hero-kicker', splitHeroLoad.hero.kicker);
      setVal('lp-hero-title', splitHeroLoad.hero.title);
      setVal('lp-hero-subtitle', splitHeroLoad.hero.subtitle);

      try {
        const tres = await listTicketTypesAdmin();
        ticketTypesPreview = tres.data?.ticketTypes || [];
      } catch {
        ticketTypesPreview = [];
      }
      const mini = document.getElementById('lb-tickets-mini-list');
      if (mini) {
        const active = ticketTypesPreview.filter((t) => t.activo).sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0));
        mini.innerHTML = active.length
          ? active
              .slice(0, 12)
              .map(
                (t) =>
                  `<div class="flex justify-between gap-2 border-b border-slate-100 py-1"><span>${escapeHtml(t.nombre)}</span><span class="font-mono text-[10px]">${escapeHtml(fmtLbMoney.format(Number(t.precio || 0)))}</span></div>`
              )
              .join('')
          : '<p class="text-xs text-slate-400">Sin tickets activos.</p>';
      }

      const bumpLandingUi = () => {
        markDirty();
        paintLandingCanvas();
      };
      bumpLandingUiRef = bumpLandingUi;

      ['lp-descripcion', 'lp-ocupacion', 'lp-estacionamiento', 'lp-abierto', 'lp-satelite', 'lp-maps'].forEach((id) => {
        document.getElementById(id)?.addEventListener('input', bumpLandingUi);
        document.getElementById(id)?.addEventListener('change', bumpLandingUi);
      });
      ['lp-hero-kicker', 'lp-hero-title', 'lp-hero-subtitle'].forEach((id) => {
        document.getElementById(id)?.addEventListener('input', bumpLandingUi);
      });

      document.querySelectorAll('.lp-preview-size').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.lp-preview-size').forEach((x) => {
            x.classList.remove('bg-white', 'shadow-sm', 'text-slate-900');
            x.classList.add('text-slate-500');
          });
          btn.classList.add('bg-white', 'shadow-sm', 'text-slate-900');
          btn.classList.remove('text-slate-500');
          const size = btn.getAttribute('data-preview-size');
          if (!previewFrame) return;
          if (size === 'mobile') previewFrame.style.maxWidth = '420px';
          else if (size === 'tablet') previewFrame.style.maxWidth = '820px';
          else previewFrame.style.maxWidth = '100%';
        });
      });

      let mapContext = 'parque';
      let mapDraftTimer = null;
      const scheduleMapPersistDraft = (jsonStr) => {
        window.clearTimeout(mapDraftTimer);
        mapDraftTimer = window.setTimeout(() => {
          saveMapDraftLocal(mapContextToViewKey(mapContext), jsonStr);
        }, 420);
      };
      const handleMapEditorChange = (jsonStr) => {
        scheduleMapPersistDraft(jsonStr);
        bumpLandingUi();
      };
      const getMapByContext = () =>
        mapContext === 'mesas'
          ? (landing.mapaMesasJson || landing.mapaDistribucionJson)
          : mapContext === 'estacionamiento'
            ? (landing.mapaEstacionamientoJson || landing.mapaDistribucionJson)
            : mapContext === 'albercas'
              ? (landing.mapaDistribucionJson || DEFAULT_MAPA_JSON)
            : landing.mapaDistribucionJson;
      const mapViewForContext = () =>
        mapContext === 'mesas'
          ? 'mesas'
          : mapContext === 'estacionamiento'
            ? 'estacionamiento'
            : mapContext === 'albercas'
              ? 'albercas'
            : 'global';
      const mountAdminMapEditor = (_canvasEl, json) => {
        const shell = document.getElementById('mapa-editor-shell');
        const host = document.getElementById('mapa-editor-react-host');
        if (shell && host) {
          shell.classList.add('mapa-shell--react');
          host.classList.remove('hidden');
          return mountReactMapEditor(host, {
            initialJson: json || DEFAULT_MAPA_JSON,
            view: mapViewForContext(),
            onChangeJson: handleMapEditorChange,
            onSaveSite: () => document.getElementById('lp-save')?.click(),
            onPreviewPublic: () => {
              const a = document.getElementById('mapa-preview-link');
              if (a) a.click();
              else window.location.assign('/home#mapa');
            }
          });
        }
        shell?.classList.remove('mapa-shell--react');
        host?.classList.add('hidden');
        return null;
      };
      const updateMapContextUsageHint = () => {
        const el = document.getElementById('mapa-context-usage');
        if (!el) return;
        if (mapContext === 'mesas') {
          el.textContent =
            'Este mapa se usa en /reservar (reserva de mesas). Si no hay piezas, la app puede usar el mapa global como respaldo.';
        } else if (mapContext === 'estacionamiento') {
          el.textContent =
            'Este mapa alimenta la vista de estacionamiento y el panel operativo de parking.';
        } else if (mapContext === 'albercas') {
          el.textContent =
            'Vista Albercas: usa el mapa global y destaca zonas acuáticas sin romper compatibilidad actual.';
        } else {
          el.textContent =
            'Este mapa es el plano público del parque en /home (#mapa).';
        }
      };
      const refreshMapComposerSidebar = () => {
        const mount = document.getElementById('mapa-tool-accordions');
        const hint = document.getElementById('mapa-sidebar-view-hint');
        if (mount) mount.innerHTML = renderMapToolAccordionsHtml(mapContext, escapeHtml);
        if (hint) hint.textContent = mapSidebarHint(mapContext);
      };
      const updateMapEmptyOverlay = (docLike) => {
        const overlay = document.getElementById('mapa-empty-overlay');
        const title = document.getElementById('mapa-empty-title');
        const hint = document.getElementById('mapa-empty-hint');
        if (!overlay) return;
        const items = docLike?.items || [];
        const empty = items.length === 0;
        overlay.classList.toggle('hidden', !empty);
        overlay.classList.toggle('flex', empty);
        overlay.classList.toggle('pointer-events-none', !empty);
        overlay.classList.toggle('pointer-events-auto', empty);
        if (title && hint) {
          if (mapContext === 'mesas') {
            title.textContent = 'Aún no hay mapa de mesas.';
            hint.textContent =
              'Agrega un bloque de mesas con la herramienta Mesa o importa un JSON. Las mesas reservables necesitan ID estable.';
          } else if (mapContext === 'estacionamiento') {
            title.textContent = 'Aún no hay mapa de estacionamiento.';
            hint.textContent =
              'Agrega cajones con la herramienta Estacionamiento o importa JSON. Configura código en cada cajón.';
          } else if (mapContext === 'albercas') {
            title.textContent = 'Aún no hay albercas configuradas.';
            hint.textContent =
              'Agrega albercas o áreas acuáticas. Puedes usar una plantilla rápida para iniciar.';
          } else {
            title.textContent = 'Aún no hay mapa global.';
            hint.textContent =
              'El visitante verá este lienzo vacío en la landing hasta que agregues piezas o una plantilla.';
          }
        }
      };
      const checkMapDraftBanner = () => {
        const banner = document.getElementById('mapa-draft-banner');
        const detail = document.getElementById('mapa-draft-banner-detail');
        if (!banner) return;
        const vk = mapContextToViewKey(mapContext);
        const draft = loadMapDraftLocal(vk);
        const current = getMapByContext();
        if (draft?.json && String(draft.json).trim() && draft.json !== current) {
          banner.classList.remove('hidden');
          if (detail) {
            const when = draft.ts ? new Date(draft.ts).toLocaleString('es-MX') : '';
            detail.textContent = `Borrador local (${vk}) · ${when || 'sin fecha'}. No está publicado hasta Guardar.`;
          }
        } else {
          banner.classList.add('hidden');
        }
      };
      const syncCurrentMapJsonToLanding = () => {
        if (!mapEditor) return;
        const j = mapEditor.getJson();
        if (mapContext === 'parque') landing.mapaDistribucionJson = j;
        if (mapContext === 'mesas') landing.mapaMesasJson = j;
        if (mapContext === 'estacionamiento') landing.mapaEstacionamientoJson = j;
        if (mapContext === 'albercas') landing.mapaDistribucionJson = j;
      };
      const parsedMapDims = parseDistribucionJson(getMapByContext());
      setVal('mapa-doc-w', parsedMapDims.w);
      setVal('mapa-doc-h', parsedMapDims.h);
      const abierto = document.getElementById('lp-abierto');
      if (abierto) abierto.checked = landing.abiertoAhora;

      setBotonesUi(landing.botonesJson);

      const wireMapEditorUi = () => {
        const fieldsWrap = document.getElementById('mapa-editor-fields');
        const visibilityPanel = document.getElementById('mapa-inspector-visibility-panel');
        const layersPanel = document.getElementById('mapa-inspector-layers-panel');
        const emptyState = document.getElementById('mapa-empty-state');
        const multiState = document.getElementById('mapa-multi-state');
        const multiCount = document.getElementById('mapa-multi-count');
        const pill = document.getElementById('mapa-selected-kind-pill');
        const layersList = document.getElementById('mapa-layers-list');
        const layerCount = document.getElementById('mapa-layer-count');
        const previewLink = document.getElementById('mapa-preview-link');
        const tableMetadataWrap = document.getElementById('mapa-table-metadata');
        const parkingMetadataWrap = document.getElementById('mapa-parking-metadata');
        const poolMetadataWrap = document.getElementById('mapa-pool-metadata');
        const genericMetadataWrap = document.getElementById('mapa-generic-metadata');
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
          publicName: 'mapa-meta-public-name',
          capacidad: 'mapa-meta-capacidad',
          precio: 'mapa-meta-precio',
          vip: 'mapa-meta-vip',
          reservable: 'mapa-meta-reservable',
          extrasAllowed: 'mapa-meta-extras-allowed',
          visualState: 'mapa-meta-visual-state',
          tags: 'mapa-meta-tags',
          extras: 'mapa-meta-extras',
          spotCode: 'mapa-meta-spot',
          zone: 'mapa-meta-zone',
          genericZone: 'mapa-meta-generic-zone',
          description: 'mapa-meta-description',
          genericDescription: 'mapa-meta-generic-description'
        };
        let syncing = false;
        let mapShowContext = true;

        const el = (key) => document.getElementById(fieldIds[key]);
        const toColorValue = (value, fallback = '#0f766e') => {
          const raw = String(value || '').trim();
          if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;
          const rgba = raw.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
          if (!rgba) return fallback;
          return `#${[rgba[1], rgba[2], rgba[3]].map((n) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0')).join('')}`;
        };
        const isTableKind = (value) => value === 'mesa' || value === 'table';
        const isTableItem = (item) => isTableKind(item?.kind) || item?.type === 'table';
        const isParkingKind = (value) => value === 'estacionamiento' || value === 'parkingSpot';
        const isParkingItem = (item) => isParkingKind(item?.kind) || item?.type === 'parkingSpot';
        const isPoolKind = (value) => value === 'alberca' || value === 'pool';
        const isPoolItem = (item) => isPoolKind(item?.kind) || item?.type === 'pool';
        const defaultVisibilityByKind = (kindValue, typeValue = '') => {
          const k = String(kindValue || '').toLowerCase();
          const t = String(typeValue || '').toLowerCase();
          const isMesa = k === 'mesa' || k === 'table' || t === 'table';
          const isParking = k === 'estacionamiento' || k === 'parkingspot' || t === 'parkingspot';
          const isPool = k === 'alberca' || k === 'pool' || t === 'pool';
          return {
            global: true,
            mesas: isMesa,
            estacionamiento: isParking,
            albercas: isPool
          };
        };
        const readVisibilityByView = (item) => {
          const fallback = defaultVisibilityByKind(item?.kind, item?.type);
          const raw =
            item?.metadata && typeof item.metadata === 'object' && item.metadata.visibilityByView
              ? item.metadata.visibilityByView
              : null;
          return {
            global:
              raw && Object.prototype.hasOwnProperty.call(raw, 'global')
                ? raw.global !== false
                : fallback.global,
            mesas:
              raw && Object.prototype.hasOwnProperty.call(raw, 'mesas') ? raw.mesas !== false : fallback.mesas,
            estacionamiento:
              raw && Object.prototype.hasOwnProperty.call(raw, 'estacionamiento')
                ? raw.estacionamiento !== false
                : fallback.estacionamiento,
            albercas:
              raw && Object.prototype.hasOwnProperty.call(raw, 'albercas')
                ? raw.albercas !== false
                : fallback.albercas
          };
        };
        const syncInspectorTabs = () => {
          const active = document.querySelector('[data-map-inspector-tab].is-active')?.getAttribute(
            'data-map-inspector-tab'
          ) || 'propiedades';
          fieldsWrap?.classList.toggle('hidden', active !== 'propiedades');
          visibilityPanel?.classList.toggle('hidden', active !== 'visibilidad');
          layersPanel?.classList.toggle('hidden', active !== 'capas');
        };
        const splitTags = (value) =>
          String(value || '')
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);
        const formatTags = (value) => (Array.isArray(value) ? value.join(', ') : String(value || ''));
        const slugify = (value) =>
          String(value || '')
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        const formatExtras = (extras) => Array.isArray(extras)
          ? extras
              .map((extra) => `${extra.id || slugify(extra.label)} | ${extra.label || extra.id || 'Extra'} | ${Number(extra.price || 0)}`)
              .join('\n')
          : '';
        const parseExtras = (value) =>
          String(value || '')
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line, index) => {
              const parts = line.split('|').map((part) => part.trim());
              const twoPartPrice = parts.length === 2 && Number.isFinite(Number(parts[1]));
              const rawId = twoPartPrice ? slugify(parts[0]) : parts[0];
              const rawLabel = twoPartPrice ? parts[0] : parts[1];
              const rawPrice = twoPartPrice ? parts[1] : parts[2];
              const label = rawLabel || rawId || 'Extra';
              const id = rawId || slugify(label);
              return {
                id: slugify(id) || `extra-${index + 1}`,
                label,
                price: Math.max(0, parseFloat(rawPrice || '0') || 0)
              };
            });
        const updatePreviewLink = () => {
          if (!previewLink) return;
          previewLink.onclick = (ev) => {
            if (mapContext === 'estacionamiento') ev.preventDefault();
          };
          if (mapContext === 'mesas') {
            previewLink.setAttribute('href', '/reservar');
            previewLink.setAttribute('title', 'Abrir reservas en otra pestaña');
          } else if (mapContext === 'estacionamiento') {
            previewLink.setAttribute('href', '#');
            previewLink.setAttribute('title', 'Usa Preview lienzo para ver solo lectura; el plano publico de parking esta en la landing si aplica');
          } else if (mapContext === 'albercas') {
            previewLink.setAttribute('href', '/home#mapa');
            previewLink.setAttribute('title', 'Abrir vista pública general del mapa');
          } else {
            previewLink.setAttribute('href', '/home#mapa');
            previewLink.setAttribute('title', 'Abrir inicio en otra pestaña');
          }
        };
        const setInspectorMode = (mode) => {
          const disabled = mode !== 'single';
          fieldsWrap?.classList.toggle('hidden', mode !== 'single');
          emptyState?.classList.toggle('hidden', mode !== 'empty');
          multiState?.classList.toggle('hidden', mode !== 'multi');
          if (mode !== 'single') visibilityPanel?.classList.add('hidden');
          document.querySelectorAll('#mapa-editor-fields input, #mapa-editor-fields select, #mapa-editor-fields textarea, #mapa-editor-fields button').forEach((node) => {
            node.disabled = disabled;
          });
          document
            .querySelectorAll('#mapa-inspector-visibility-panel input')
            .forEach((node) => {
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
          const tableItem = isTableItem(item);
          const parkingItem = isParkingItem(item);
          const poolItem = isPoolItem(item);
          tableMetadataWrap?.classList.toggle('hidden', !tableItem);
          parkingMetadataWrap?.classList.toggle('hidden', !parkingItem);
          poolMetadataWrap?.classList.toggle('hidden', !poolItem);
          genericMetadataWrap?.classList.toggle('hidden', tableItem || parkingItem || poolItem);
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
          el('publicName').value = item.metadata?.publicName || item.label || '';
          el('capacidad').value = item.metadata?.capacity ?? item.metadata?.capacidad ?? '';
          el('precio').value = item.metadata?.price ?? item.metadata?.precio ?? '';
          el('vip').checked = Boolean(item.metadata?.vip);
          el('reservable').checked = item.metadata?.reservable !== false;
          el('extrasAllowed').checked = item.metadata?.extrasAllowed !== false;
          el('visualState').value = item.metadata?.estadoVisual || '';
          el('tags').value = formatTags(item.metadata?.tags);
          el('extras').value = formatExtras(item.metadata?.extras);
          el('spotCode').value = item.metadata?.spotCode || '';
          el('zone').value = item.metadata?.zone || '';
          el('genericZone').value = item.metadata?.zone || '';
          el('description').value = item.metadata?.description || '';
          el('genericDescription').value = item.metadata?.description || '';
          if (parkingItem) {
            document.getElementById('mapa-meta-parking-code').value = item.metadata?.spotCode || item.id || '';
            document.getElementById('mapa-meta-parking-status').value = item.metadata?.baseStatus || 'libre';
            document.getElementById('mapa-meta-parking-zone').value = item.metadata?.zone || '';
            document.getElementById('mapa-meta-parking-reserved').value = item.metadata?.reservadoPor || '';
          }
          if (poolItem) {
            document.getElementById('mapa-meta-pool-public').value = item.metadata?.publicName || item.label || '';
            document.getElementById('mapa-meta-pool-type').value = item.metadata?.poolType || 'alberca';
            document.getElementById('mapa-meta-pool-cap').value =
              item.metadata?.capacidadAprox != null && item.metadata?.capacidadAprox !== ''
                ? String(item.metadata.capacidadAprox)
                : '';
            document.getElementById('mapa-meta-pool-rules').value = item.metadata?.reglasPublicas || '';
          }
          const vis = readVisibilityByView(item);
          const vg = document.getElementById('mapa-visible-global');
          const vm = document.getElementById('mapa-visible-mesas');
          const ve = document.getElementById('mapa-visible-estacionamiento');
          const va = document.getElementById('mapa-visible-albercas');
          if (vg) vg.checked = vis.global;
          if (vm) vm.checked = vis.mesas;
          if (ve) ve.checked = vis.estacionamiento;
          if (va) va.checked = vis.albercas;
          renderLayers();
          syncing = false;
        };

        const collectPatch = () => {
          const kindValue = el('kind')?.value || 'area';
          const kind = getMapKind(kindValue);
          const tableItem = isTableKind(kindValue);
          const parkingItem = isParkingKind(kindValue);
          const poolItem = isPoolKind(kindValue);
          const capacity = Math.max(1, parseInt(el('capacidad')?.value || '4', 10) || 4);
          const price = Math.max(0, parseFloat(el('precio')?.value || '0') || 0);
          const metadataPatch = {
            spotCode: parkingItem
              ? (document.getElementById('mapa-meta-parking-code')?.value || '').trim().toUpperCase()
              : el('spotCode')?.value || '',
            zone: tableItem
              ? el('zone')?.value || ''
              : parkingItem
                ? document.getElementById('mapa-meta-parking-zone')?.value || ''
                : el('genericZone')?.value || '',
            description: tableItem ? el('description')?.value || '' : el('genericDescription')?.value || ''
          };
          if (tableItem) {
            Object.assign(metadataPatch, {
              publicName: el('publicName')?.value || '',
              capacity,
              capacidad: capacity,
              price,
              precio: price,
              vip: el('vip')?.checked || false,
              reservable: el('reservable')?.checked ?? true,
              extrasAllowed: el('extrasAllowed')?.checked ?? true,
              estadoVisual: el('visualState')?.value || '',
              tags: splitTags(el('tags')?.value || ''),
              extras: parseExtras(el('extras')?.value || '')
            });
          }
          if (parkingItem) {
            Object.assign(metadataPatch, {
              baseStatus: document.getElementById('mapa-meta-parking-status')?.value || 'libre',
              reservadoPor: document.getElementById('mapa-meta-parking-reserved')?.value || ''
            });
          }
          if (poolItem) {
            const capRaw = document.getElementById('mapa-meta-pool-cap')?.value;
            const capN = parseInt(capRaw || '0', 10);
            Object.assign(metadataPatch, {
              publicName: document.getElementById('mapa-meta-pool-public')?.value || '',
              poolType: document.getElementById('mapa-meta-pool-type')?.value || 'alberca',
              capacidadAprox: Number.isFinite(capN) && capN > 0 ? capN : 0,
              reglasPublicas: document.getElementById('mapa-meta-pool-rules')?.value || ''
            });
          }
          const visibilityByView = {
            global: document.getElementById('mapa-visible-global')?.checked !== false,
            mesas: document.getElementById('mapa-visible-mesas')?.checked === true,
            estacionamiento: document.getElementById('mapa-visible-estacionamiento')?.checked === true,
            albercas: document.getElementById('mapa-visible-albercas')?.checked === true
          };
          metadataPatch.visibilityByView = visibilityByView;
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
            metadata: metadataPatch
          };
        };

        const renderLayers = () => {
          if (!layersList) return;
          const allItems = mapEditor?.getItems?.() || [];
          const searchText = String(document.getElementById('mapa-layers-search')?.value || '')
            .trim()
            .toLowerCase();
          const kindFilter = String(document.getElementById('mapa-layers-kind-filter')?.value || '')
            .trim()
            .toLowerCase();
          const items = allItems.filter((item) => {
            const kindValue = String(item.kind || '').toLowerCase();
            const label = String(item.label || '').toLowerCase();
            const kindMatch =
              !kindFilter ||
              kindValue === kindFilter ||
              (kindFilter === 'mesa' && (kindValue === 'mesa' || kindValue === 'table')) ||
              (kindFilter === 'parkingspot' &&
                (kindValue === 'parkingspot' || kindValue === 'estacionamiento')) ||
              (kindFilter === 'alberca' && (kindValue === 'alberca' || kindValue === 'pool')) ||
              (kindFilter === 'servicio' && (kindValue === 'servicio' || kindValue === 'servicearea'));
            if (!kindMatch) return false;
            if (!searchText) return true;
            return label.includes(searchText) || kindValue.includes(searchText) || String(item.id || '').toLowerCase().includes(searchText);
          });
          const selectedIds = new Set((mapEditor?.getSelection?.() || []).map((item) => item.id));
          if (layerCount) layerCount.textContent = `${items.length}/${allItems.length}`;
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
        document.getElementById('mapa-layers-search')?.addEventListener('input', () => renderLayers());
        document.getElementById('mapa-layers-kind-filter')?.addEventListener('change', () => renderLayers());
        document.querySelectorAll('[data-map-inspector-tab]').forEach((btn) => {
          btn.addEventListener('click', () => {
            document
              .querySelectorAll('[data-map-inspector-tab]')
              .forEach((x) => x.classList.toggle('is-active', x === btn));
            syncInspectorTabs();
          });
        });
        const applyMapShowContextToCanvas = (checked) => {
          mapShowContext = !!checked;
          const a = document.getElementById('mapa-show-context');
          const b = document.getElementById('mapa-show-context-footer');
          if (a) a.checked = mapShowContext;
          if (b) b.checked = mapShowContext;
          mapEditor?.setRenderOptions?.({ showViewContext: mapShowContext });
        };
        document.getElementById('mapa-show-context')?.addEventListener('change', (ev) => {
          applyMapShowContextToCanvas(ev.currentTarget.checked);
        });
        document.getElementById('mapa-show-context-footer')?.addEventListener('change', (ev) => {
          applyMapShowContextToCanvas(ev.currentTarget.checked);
        });
        ['mapa-visible-global', 'mapa-visible-mesas', 'mapa-visible-estacionamiento', 'mapa-visible-albercas'].forEach((id) => {
          const node = document.getElementById(id);
          if (!node) return;
          node.addEventListener('change', () => {
            if (syncing) return;
            mapEditor?.updateSelected(collectPatch());
          });
        });

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
        [
          'mapa-meta-parking-code',
          'mapa-meta-parking-status',
          'mapa-meta-parking-zone',
          'mapa-meta-parking-reserved',
          'mapa-meta-pool-public',
          'mapa-meta-pool-type',
          'mapa-meta-pool-cap',
          'mapa-meta-pool-rules'
        ].forEach((id) => {
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
        setClick('mapa-multi-lock', () => mapEditor?.setSelectedLockedAll?.(true));
        setClick('mapa-multi-unlock', () => mapEditor?.setSelectedLockedAll?.(false));
        setClick('mapa-multi-hide', () => mapEditor?.setSelectedVisibility?.(false));
        setClick('mapa-multi-show', () => mapEditor?.setSelectedVisibility?.(true));
        setClick('mapa-save-shortcut', () => document.getElementById('lp-save')?.click());
        setClick('mapa-focus-toggle', () => {
          const shell = document.getElementById('mapa-editor-shell');
          if (!shell) return;
          const on = !shell.classList.contains('mapa-focus-mode');
          shell.classList.toggle('mapa-focus-mode', on);
          document.querySelector('.admin-shell')?.classList.toggle('admin-shell--map-focus', on);
          const btn = document.getElementById('mapa-focus-toggle');
          if (btn) btn.innerHTML = `${icon('eye', 'h-4 w-4')} ${on ? 'Salir enfoque' : 'Modo enfoque'}`;
        });
        setClick('mapa-undo', () => mapEditor?.undo?.());
        setClick('mapa-redo', () => mapEditor?.redo?.());
        setClick('mapa-dup-row', () => mapEditor?.duplicateSelectedRow?.(16));
        setClick('mapa-dup-col', () => mapEditor?.duplicateSelectedColumn?.(16));
        setClick('mapa-dup-grid', () => mapEditor?.duplicateSelectedGrid?.(2, 2, 16, 16));
        setClick('mapa-flip-h', () => mapEditor?.flipSelectedHorizontal?.());
        setClick('mapa-flip-v', () => mapEditor?.flipSelectedVertical?.());
        setClick('mapa-mesa-vip', () => {
          const sel = mapEditor?.getSelected?.();
          if (!sel || !isTableItem(sel)) return;
          mapEditor?.updateSelected?.({ metadata: { vip: true } });
        });
        setClick('mapa-mesa-nores', () => {
          const sel = mapEditor?.getSelected?.();
          if (!sel || !isTableItem(sel)) return;
          mapEditor?.updateSelected?.({ metadata: { reservable: false, estadoVisual: 'no_reservable' } });
        });
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
        const showGridEl = document.getElementById('mapa-show-grid');
        if (showGridEl) {
          showGridEl.onchange = (ev) => {
            mapEditor?.setGridVisible?.(ev.currentTarget.checked);
          };
        }

        let bgUploaded = { url: '', path: '', fileName: '' };
        const syncBgFormFromDoc = (d) => {
          const bg = d.background || {};
          const t = String(bg.type || 'park').toLowerCase();
          const typeEl = document.getElementById('mapa-bg-type');
          if (typeEl) typeEl.value = ['park', 'color', 'image', 'none'].includes(t) ? t : 'park';
          const fillEl = document.getElementById('mapa-bg-fill');
          if (fillEl) fillEl.value = toColorValue(bg.fill, '#ecfdf5');
          const fitEl = document.getElementById('mapa-bg-fit');
          if (fitEl) fitEl.value = ['cover', 'contain', 'stretch'].includes(String(bg.fit || '').toLowerCase()) ? String(bg.fit).toLowerCase() : 'cover';
          const opEl = document.getElementById('mapa-bg-opacity');
          if (opEl) opEl.value = String(Math.min(1, Math.max(0, Number(bg.opacity ?? 1))));
          const visEl = document.getElementById('mapa-bg-visible');
          if (visEl) visEl.checked = bg.visible !== false;
          const lockEl = document.getElementById('mapa-bg-locked');
          if (lockEl) lockEl.checked = bg.locked !== false;
          bgUploaded = {
            url: String(bg.url || ''),
            path: String(bg.storagePath || ''),
            fileName: String(bg.fileName || '')
          };
          const previewWrap = document.getElementById('mapa-bg-preview');
          const previewImg = document.getElementById('mapa-bg-preview-img');
          const fileNameEl = document.getElementById('mapa-bg-file-name');
          const techUrl = document.getElementById('mapa-bg-tech-url');
          const techPath = document.getElementById('mapa-bg-tech-path');
          if (previewWrap) previewWrap.classList.toggle('hidden', !bgUploaded.url);
          if (previewImg) previewImg.src = bgUploaded.url || '';
          if (fileNameEl) fileNameEl.textContent = bgUploaded.fileName || (bgUploaded.url ? 'Imagen actual cargada' : 'Sin imagen cargada.');
          if (techUrl) techUrl.textContent = bgUploaded.url ? `URL: ${bgUploaded.url}` : 'URL: —';
          if (techPath) techPath.textContent = bgUploaded.path ? `Path: ${bgUploaded.path}` : 'Path: —';
          if (showGridEl) showGridEl.checked = d.grid?.visible !== false;
          if (snapGrid) snapGrid.checked = d.grid?.snap !== false;
        };

        const previewCanvasBtn = document.getElementById('mapa-preview-canvas');
        if (previewCanvasBtn) {
          previewCanvasBtn.onclick = () => {
            const on = !mapEditor?.getPreviewMode?.();
            mapEditor?.setPreviewMode?.(on);
            previewCanvasBtn.innerHTML = `${icon('eye', 'h-4 w-4')} ${on ? 'Salir preview' : 'Preview lienzo'}`;
            previewCanvasBtn.classList.toggle('ring-2', on);
            previewCanvasBtn.classList.toggle('ring-cyan-400/80', on);
          };
        }

        const bgApplyBtn = document.getElementById('mapa-bg-apply');
        const bgUploadBtn = document.getElementById('mapa-bg-upload-btn');
        const bgReplaceBtn = document.getElementById('mapa-bg-replace-btn');
        const bgRemoveBtn = document.getElementById('mapa-bg-remove-btn');
        const bgFileInput = document.getElementById('mapa-bg-file');
        const bgStatusEl = document.getElementById('mapa-bg-upload-status');
        const setBgStatus = (msg = '', tone = 'muted') => {
          if (!bgStatusEl) return;
          bgStatusEl.textContent = msg;
          bgStatusEl.className =
            tone === 'ok'
              ? 'text-xs font-semibold text-emerald-300'
              : tone === 'err'
                ? 'text-xs font-semibold text-rose-300'
                : 'text-xs font-semibold text-slate-400';
        };
        const uploadMapBg = async () => {
          const file = bgFileInput?.files?.[0];
          if (!file) return;
          setBgStatus('Subiendo imagen...');
          try {
            const upload = await uploadMapBackgroundImage(file, { view: mapContext });
            bgUploaded = { url: upload.url, path: upload.path, fileName: upload.fileName };
            const fileNameEl = document.getElementById('mapa-bg-file-name');
            const previewWrap = document.getElementById('mapa-bg-preview');
            const previewImg = document.getElementById('mapa-bg-preview-img');
            const techUrl = document.getElementById('mapa-bg-tech-url');
            const techPath = document.getElementById('mapa-bg-tech-path');
            if (fileNameEl)
              fileNameEl.textContent = `${upload.fileName} · ${(upload.size / 1024 / 1024).toFixed(2)} MB`;
            if (previewWrap) previewWrap.classList.remove('hidden');
            if (previewImg) previewImg.src = upload.url;
            if (techUrl) techUrl.textContent = `URL: ${upload.url}`;
            if (techPath) techPath.textContent = `Path: ${upload.path}`;
            setBgStatus('Imagen subida. Pulsa "Aplicar fondo" para usarla.', 'ok');
          } catch (error) {
            setBgStatus(error?.message || 'No pudimos subir la imagen. Intenta de nuevo.', 'err');
          }
        };
        if (bgUploadBtn && bgFileInput) bgUploadBtn.onclick = () => bgFileInput.click();
        if (bgReplaceBtn && bgFileInput) bgReplaceBtn.onclick = () => bgFileInput.click();
        if (bgFileInput) bgFileInput.onchange = () => void uploadMapBg();
        if (bgRemoveBtn) {
          bgRemoveBtn.onclick = () => {
            bgUploaded = { url: '', path: '', fileName: '' };
            const fileNameEl = document.getElementById('mapa-bg-file-name');
            const previewWrap = document.getElementById('mapa-bg-preview');
            const previewImg = document.getElementById('mapa-bg-preview-img');
            if (fileNameEl) fileNameEl.textContent = 'Sin imagen cargada.';
            if (previewWrap) previewWrap.classList.add('hidden');
            if (previewImg) previewImg.src = '';
            setBgStatus('Imagen eliminada. Pulsa "Aplicar fondo" para guardar el cambio.');
          };
        }
        if (bgApplyBtn) {
          bgApplyBtn.onclick = () => {
            const type = document.getElementById('mapa-bg-type')?.value || 'park';
            const fill = document.getElementById('mapa-bg-fill')?.value || '#ecfdf5';
            const url = bgUploaded.url || '';
            const storagePath = bgUploaded.path || '';
            const fit = document.getElementById('mapa-bg-fit')?.value || 'cover';
            const opacity = Math.min(1, Math.max(0, parseFloat(document.getElementById('mapa-bg-opacity')?.value || '1') || 1));
            const visible = document.getElementById('mapa-bg-visible')?.checked !== false;
            const locked = document.getElementById('mapa-bg-locked')?.checked !== false;
            mapEditor?.updateDocumentBackground?.({
              type,
              fill,
              url,
              storagePath,
              fileName: bgUploaded.fileName || '',
              fit,
              opacity,
              visible,
              locked
            });
            setBgStatus('Fondo aplicado al mapa actual.', 'ok');
          };
        }

        const confirmPreset =
          (presetKey) =>
          () => {
            if (!window.confirm('¿Agregar plantilla al mapa actual? Los elementos existentes se conservan.')) return;
            mapEditor?.applyMapPreset?.(presetKey);
          };
        const bindPreset = (id, presetKey) => {
          const node = document.getElementById(id);
          if (node) node.onclick = confirmPreset(presetKey);
        };
        bindPreset('mapa-preset-global-kit', MAP_QUICK_PRESETS.GLOBAL_KIT);
        bindPreset('mapa-preset-mesas-grid', MAP_QUICK_PRESETS.MESAS_GRID_4);
        bindPreset('mapa-preset-mesas-row', MAP_QUICK_PRESETS.MESAS_ROW);
        bindPreset('mapa-preset-mesas-vip', MAP_QUICK_PRESETS.MESAS_VIP);
        bindPreset('mapa-preset-mesas-area', MAP_QUICK_PRESETS.MESAS_AREA_FAMILIAR);
        bindPreset('mapa-preset-parking-row', MAP_QUICK_PRESETS.PARKING_ROW);
        bindPreset('mapa-preset-parking-block', MAP_QUICK_PRESETS.PARKING_BLOCK);
        bindPreset('mapa-preset-parking-entrada', MAP_QUICK_PRESETS.PARKING_ENTRANCE);
        bindPreset('mapa-preset-parking-pasillo', MAP_QUICK_PRESETS.PARKING_PASILLO);
        bindPreset('mapa-preset-parking-yard', MAP_QUICK_PRESETS.PARKING_YARD);
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
        syncInspectorTabs();
        mapEditor?.onSelectionChange(fillFields);
        mapEditor?.onDocumentChange?.((d) => {
          syncBgFormFromDoc(d);
          renderLayers();
          updateMapEmptyOverlay(d);
        });
        syncBgFormFromDoc(mapEditor?.getDocument?.() || {});
        updateMapEmptyOverlay(mapEditor?.getDocument?.() || {});
        if (previewCanvasBtn && !mapEditor?.getPreviewMode?.()) {
          previewCanvasBtn.innerHTML = `${icon('eye', 'h-4 w-4')} Preview lienzo`;
          previewCanvasBtn.classList.remove('ring-2', 'ring-cyan-400/80');
        }
        renderLayers();
        applyMapShowContextToCanvas(document.getElementById('mapa-show-context')?.checked !== false);
        fillFields(null);
      };

      let mapImportExportWired = false;
      const wireMapImportExportAndDraft = () => {
        if (mapImportExportWired) return;
        mapImportExportWired = true;

        document.getElementById('mapa-export-view')?.addEventListener('click', () => {
          syncCurrentMapJsonToLanding();
          const vk = mapContextToViewKey(mapContext);
          const json = mapEditor?.getJson() || getMapByContext();
          downloadJsonFile(suggestFilenameForView(vk), json);
        });

        document.getElementById('mapa-export-all')?.addEventListener('click', () => {
          syncCurrentMapJsonToLanding();
          const payload = buildFullBackupPayload(landing);
          downloadJsonFile(suggestFilenameFullBackup(), payload);
        });

        document.getElementById('mapa-import-btn')?.addEventListener('click', () => {
          document.getElementById('mapa-import-file')?.click();
        });

        document.getElementById('mapa-empty-import')?.addEventListener('click', () => {
          document.getElementById('mapa-import-file')?.click();
        });

        document.getElementById('mapa-empty-preset')?.addEventListener('click', () => {
          if (mapContext === 'mesas') document.getElementById('mapa-preset-mesas-grid')?.click();
          else if (mapContext === 'estacionamiento') document.getElementById('mapa-preset-parking-row')?.click();
          else if (mapContext === 'albercas') document.getElementById('mapa-preset-global-kit')?.click();
          else document.getElementById('mapa-preset-global-kit')?.click();
        });

        const applyImportedJson = (jsonStr, viewKeyForParser) => {
          if (!mapEditor) return;
          const parsed = tryParseJsonFile(jsonStr);
          if (!parsed.ok) {
            void showAlert(parsed.error, { title: 'Importar mapa', variant: 'danger' });
            return;
          }
          const kind = detectImportShape(parsed.value);
          if (kind.kind === 'unknown') {
            void showAlert(kind.reason || 'No se reconoce el archivo.', { title: 'Importar mapa', variant: 'danger' });
            return;
          }
          if (kind.kind === 'single') {
            let normalized;
            try {
              normalized = normalizeImportSingleDoc(kind.payload, viewKeyForParser);
            } catch (e) {
              void showAlert(e?.message || 'No se pudo validar el mapa.', { title: 'Importar mapa', variant: 'danger' });
              return;
            }
            void (async () => {
              const ok = await showConfirm(
                'Se reemplazará el mapa de la vista actual. No se guarda en el servidor hasta que pulses Guardar cambios del sitio.',
                { title: 'Confirmar importación', variant: 'warning', confirmText: 'Reemplazar', cancelText: 'Cancelar' }
              );
              if (!ok) return;
              saveLastSavedLocal(mapContextToViewKey(mapContext), mapEditor.getJson());
              mapEditor.setJson(normalized);
              syncCurrentMapJsonToLanding();
              bumpLandingUi();
              void showAlert('Mapa importado. Revisa y presiona Guardar para publicar.', {
                title: 'Importación lista',
                variant: 'success'
              });
            })();
            return;
          }
          if (kind.kind === 'full') {
            const parts = extractFullBackupStrings(kind.payload);
            void (async () => {
              const all = await showConfirm('¿Importar los tres mapas (global, mesas y estacionamiento) del archivo?', {
                title: 'Backup completo',
                variant: 'warning',
                confirmText: 'Importar todo',
                cancelText: 'Elegir por partes'
              });
              if (all) {
                if (!parts.global || !parts.mesas || !parts.estacionamiento) {
                  void showAlert('El backup no incluye las tres secciones completas.', { title: 'Archivo incompleto', variant: 'warning' });
                  return;
                }
                const ok = await showConfirm('Se sobrescribirán los tres mapas en memoria (local). Confirma.', {
                  title: 'Confirmar',
                  variant: 'danger',
                  confirmText: 'Sí, reemplazar todo',
                  cancelText: 'Cancelar'
                });
                if (!ok) return;
                saveLastSavedLocal(MAP_VIEW_KEYS.global, landing.mapaDistribucionJson);
                saveLastSavedLocal(MAP_VIEW_KEYS.mesas, landing.mapaMesasJson);
                saveLastSavedLocal(MAP_VIEW_KEYS.estacionamiento, landing.mapaEstacionamientoJson);
                landing.mapaDistribucionJson = parts.global;
                landing.mapaMesasJson = parts.mesas;
                landing.mapaEstacionamientoJson = parts.estacionamiento;
                const next = getMapByContext();
                mapEditor?.destroy?.();
                const canvasEl = document.getElementById('admin-mapa-canvas');
                if (canvasEl) {
                  mapEditor = mountAdminMapEditor(canvasEl, next);
                  wireMapEditorUi();
                }
                bumpLandingUi();
                checkMapDraftBanner();
                void showAlert('Mapas importados desde backup. Revisa y presiona Guardar para publicar.', {
                  title: 'Listo',
                  variant: 'success'
                });
                return;
              }
              const g = await showConfirm('¿Importar mapa global desde el archivo?', {
                title: 'Sección global',
                confirmText: 'Sí',
                cancelText: 'No'
              });
              if (g && parts.global) landing.mapaDistribucionJson = parts.global;
              const m = await showConfirm('¿Importar mapa de mesas desde el archivo?', {
                title: 'Sección mesas',
                confirmText: 'Sí',
                cancelText: 'No'
              });
              if (m && parts.mesas) landing.mapaMesasJson = parts.mesas;
              const e = await showConfirm('¿Importar mapa de estacionamiento desde el archivo?', {
                title: 'Sección estacionamiento',
                confirmText: 'Sí',
                cancelText: 'No'
              });
              if (e && parts.estacionamiento) landing.mapaEstacionamientoJson = parts.estacionamiento;
              if (g || m || e) {
                const next = getMapByContext();
                mapEditor?.destroy?.();
                const canvasEl = document.getElementById('admin-mapa-canvas');
                if (canvasEl) {
                  mapEditor = mountAdminMapEditor(canvasEl, next);
                  wireMapEditorUi();
                }
                bumpLandingUi();
                checkMapDraftBanner();
                void showAlert('Mapa importado. Revisa y presiona Guardar para publicar.', { title: 'Listo', variant: 'success' });
              }
            })();
          }
        };

        document.getElementById('mapa-import-file')?.addEventListener('change', (ev) => {
          const file = ev.target.files?.[0];
          ev.target.value = '';
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const text = String(reader.result || '');
            applyImportedJson(text, mapContextToViewKey(mapContext));
          };
          reader.onerror = () => {
            void showAlert('No se pudo leer el archivo.', { title: 'Error', variant: 'danger' });
          };
          reader.readAsText(file, 'UTF-8');
        });

        document.getElementById('mapa-draft-restore')?.addEventListener('click', () => {
          const vk = mapContextToViewKey(mapContext);
          const draft = loadMapDraftLocal(vk);
          if (!draft?.json) return;
          mapEditor?.setJson(draft.json);
          syncCurrentMapJsonToLanding();
          bumpLandingUi();
          checkMapDraftBanner();
          void showAlert('Borrador aplicado al lienzo. Pulsa Guardar para publicar.', { title: 'Borrador', variant: 'info' });
        });

        document.getElementById('mapa-draft-discard')?.addEventListener('click', () => {
          clearMapDraftLocal(mapContextToViewKey(mapContext));
          checkMapDraftBanner();
        });

        document.getElementById('mapa-mobile-back')?.addEventListener('click', () => {
          if (window.history.length > 1) window.history.back();
          else window.location.assign('/admin/dashboard');
        });
      };

      refreshMapComposerSidebar();
      const canvas = document.getElementById('admin-mapa-canvas');
      if (canvas) {
        if (mapEditor) mapEditor.destroy();
        mapEditor = mountAdminMapEditor(canvas, getMapByContext());
        wireMapEditorUi();
        wireMapImportExportAndDraft();
        updateMapContextUsageHint();
        checkMapDraftBanner();
      }

      const mapContextSelect = document.getElementById('map-context-select');
      const syncMapViewTabs = () => {
        document.querySelectorAll('[data-map-view-tab]').forEach((btn) => {
          const on = btn.getAttribute('data-map-view-tab') === mapContext;
          btn.classList.toggle('is-active', on);
        });
      };
      document.querySelectorAll('[data-map-view-tab]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const value = btn.getAttribute('data-map-view-tab') || 'parque';
          if (mapContextSelect) {
            mapContextSelect.value = value;
            mapContextSelect.dispatchEvent(new Event('change'));
          }
        });
      });
      mapContextSelect?.addEventListener('change', () => {
        if (mapEditor) {
          const prev = mapEditor.getJson();
          if (mapContext === 'parque') landing.mapaDistribucionJson = prev;
          if (mapContext === 'mesas') landing.mapaMesasJson = prev;
          if (mapContext === 'estacionamiento') landing.mapaEstacionamientoJson = prev;
          if (mapContext === 'albercas') landing.mapaDistribucionJson = prev;
        }
        mapContext = mapContextSelect.value || 'parque';
        const nextJson = getMapByContext();
        mapEditor?.destroy();
        const canvas = document.getElementById('admin-mapa-canvas');
        if (canvas) {
          mapEditor = mountAdminMapEditor(canvas, nextJson);
          wireMapEditorUi();
          const dims = parseDistribucionJson(nextJson);
          setVal('mapa-doc-w', dims.w);
          setVal('mapa-doc-h', dims.h);
        }
        syncMapViewTabs();
        updateMapContextUsageHint();
        checkMapDraftBanner();
        refreshMapComposerSidebar();
      });
      syncMapViewTabs();

      document.getElementById('btn-add-wa')?.addEventListener('click', () => {
        const wrap = document.getElementById('lp-botones-rows');
        if (!wrap) return;
        wrap.insertAdjacentHTML(
          'beforeend',
          renderBotonRows([{ type: 'whatsapp', label: 'WhatsApp', value: '' }])
        );
        wireBotonRemove();
        bumpLandingUi();
      });
      document.getElementById('btn-add-mail')?.addEventListener('click', () => {
        const wrap = document.getElementById('lp-botones-rows');
        if (!wrap) return;
        wrap.insertAdjacentHTML(
          'beforeend',
          renderBotonRows([{ type: 'mail', label: 'Correo', value: '' }])
        );
        wireBotonRemove();
        bumpLandingUi();
      });
      document.getElementById('btn-add-custom')?.addEventListener('click', () => {
        const wrap = document.getElementById('lp-botones-rows');
        if (!wrap) return;
        wrap.insertAdjacentHTML(
          'beforeend',
          renderBotonRows([{ type: 'custom', label: 'Enlace', href: '/reservar', external: false }])
        );
        wireBotonRemove();
        bumpLandingUi();
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

      const sidebarToolsRoot = document.getElementById('mapa-ws-sidebar-scroll');
      if (sidebarToolsRoot && !sidebarToolsRoot.dataset.mapToolDelegated) {
        sidebarToolsRoot.dataset.mapToolDelegated = '1';
        sidebarToolsRoot.addEventListener('click', (ev) => {
          const btn = ev.target.closest('[data-map-tool]');
          if (!btn) return;
          activeMapKind = btn.getAttribute('data-map-tool') || 'area';
          sidebarToolsRoot.querySelectorAll('[data-map-tool]').forEach((b) => {
            const on = b === btn;
            b.classList.toggle('ring-2', on);
            b.classList.toggle('ring-cyan-400/80', on);
            b.classList.toggle('bg-cyan-500/15', on);
          });
          mapEditor?.setAdding(true, activeMapKind);
          document.getElementById('mapa-draw-hint')?.classList.remove('hidden');
        });
      }

      document.getElementById('mapa-add-quick')?.addEventListener('click', () => {
        mapEditor?.addItem(activeMapKind);
        document.getElementById('mapa-draw-hint')?.classList.add('hidden');
      });

      document.getElementById('mapa-preset-row')?.addEventListener('click', () => {
        mapEditor?.addPresetRow(activeMapKind, 3);
      });

      document.getElementById('mapa-preset-fila-5')?.addEventListener('click', () => {
        mapEditor?.addPresetRow(activeMapKind, 5);
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
                void logAuditEvent({
                  eventType: 'servicio_editado',
                  entityType: 'servicio',
                  entityId: id,
                  title: 'Servicio editado',
                  description: `Se actualizó el servicio ${titulo || id}.`,
                  metadata: { id, titulo, precio, activo }
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
          const user = getCurrentUser();
          if (!(user?.uid ?? user?.id)) throw new Error('Sesion no valida.');
          let imagenUrl = '';
          if (croppedServiceFile) imagenUrl = await uploadServiceImage(croppedServiceFile, user.uid ?? user.id);
          await createServicio({ titulo, descripcion, imagenUrl, precio, orden, activo: true });
          void logAuditEvent({
            eventType: 'servicio_creado',
            entityType: 'servicio',
            title: 'Servicio creado',
            description: `Se creó el servicio ${titulo}.`,
            metadata: { titulo, precio, orden }
          });
          await publishAppUpdate('landing', 'Servicio creado');
          document.getElementById('svc-new-title').value = '';
          document.getElementById('svc-new-desc').value = '';
          document.getElementById('svc-new-order').value = '';
          await loadServicios();
        } catch (err) {
          console.error(err);
          await showAlert(err?.message || 'No se pudo crear el servicio.', { title: 'Error', variant: 'danger' });
        }
      });

      await loadServicios();

      document.getElementById('lp-save')?.addEventListener('click', async () => {
        const msg = document.getElementById('lp-save-msg');
        const lpSaveBtn = document.getElementById('lp-save');
        const lpDiscardBtn = document.getElementById('lp-discard');
        const mapSavePill = document.getElementById('mapa-editor-save-status');
        const editedMapJson = mapEditor ? mapEditor.getJson() : getMapByContext();
        if (mapContext === 'parque') landing.mapaDistribucionJson = editedMapJson;
        if (mapContext === 'mesas') landing.mapaMesasJson = editedMapJson;
        if (mapContext === 'estacionamiento') landing.mapaEstacionamientoJson = editedMapJson;
        if (mapContext === 'albercas') landing.mapaDistribucionJson = editedMapJson;

        const vP = validateMapDocumentForSave(landing.mapaDistribucionJson || DEFAULT_MAPA_JSON, 'parque');
        const vM = validateMapDocumentForSave(
          landing.mapaMesasJson || landing.mapaDistribucionJson || DEFAULT_MAPA_JSON,
          'mesas'
        );
        const vE = validateMapDocumentForSave(
          landing.mapaEstacionamientoJson || landing.mapaDistribucionJson || DEFAULT_MAPA_JSON,
          'estacionamiento'
        );
        const vA = validateMapDocumentForSave(
          landing.mapaDistribucionJson || DEFAULT_MAPA_JSON,
          'albercas'
        );
        const mapErrors = [...new Set([...vP.errors, ...vM.errors, ...vE.errors, ...vA.errors])];
        const mapWarnings = [...new Set([...vP.warnings, ...vM.warnings, ...vE.warnings, ...vA.warnings])];
        if (mapErrors.length) {
          await showAlert(mapErrors.slice(0, 14).join('\n'), {
            title: 'Corrige el mapa antes de guardar',
            variant: 'danger'
          });
          return;
        }
        if (mapWarnings.length) {
          const proceed = await showConfirm(
            `${mapWarnings.slice(0, 18).join('\n')}\n\n¿Deseas guardar de todas formas?`,
            { title: 'Advertencias en los planos', variant: 'warning', confirmText: 'Guardar', cancelText: 'Cancelar' }
          );
          if (!proceed) return;
        }

        const heroMerge = {
          kicker: document.getElementById('lp-hero-kicker')?.value ?? '',
          title: document.getElementById('lp-hero-title')?.value ?? '',
          subtitle: document.getElementById('lp-hero-subtitle')?.value ?? ''
        };
        landing.botonesJson = mergeBotonesJson(heroMerge, collectBotonesFromDom());
        const botonesJson = landing.botonesJson;
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
        if (mapSavePill) {
          mapSavePill.textContent = 'Guardando…';
          mapSavePill.className =
            'rounded-full bg-cyan-500/25 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-cyan-100';
        }
        if (lpSaveBtn) lpSaveBtn.disabled = true;
        if (lpDiscardBtn) lpDiscardBtn.disabled = true;
        try {
          await upsertLandingPage(payload);
          void logAuditEvent({
            eventType: 'landing_editada',
            entityType: 'landing',
            entityId: LANDING_PAGE_ID,
            title: 'Landing editada',
            description: 'Se actualizó contenido público de la landing.',
            metadata: { mapContext, hasMapErrors: mapErrors.length > 0 }
          });
          void logAuditEvent({
            eventType: 'mapa_guardado',
            entityType: 'mapa',
            entityId: mapContext || 'parque',
            title: 'Mapa guardado',
            description: `Se guardó el mapa de ${mapContext || 'parque'}.`,
            metadata: { mapContext, hasMapErrors: mapErrors.length > 0 }
          });
          await publishAppUpdate('landing', 'Contenido landing actualizado');
          if (msg) msg.textContent = 'Guardado correctamente.';
          Object.assign(landing, {
            descripcionParque: payload.descripcionParque,
            imagenSatelitalUrl: payload.imagenSatelitalUrl,
            googleMapsUrl: payload.googleMapsUrl,
            horariosTexto: payload.horariosTexto,
            abiertoAhora: payload.abiertoAhora,
            ocupacionTexto: payload.ocupacionTexto,
            estacionamientoTexto: payload.estacionamientoTexto,
            botonesJson: payload.botonesJson,
            mapaDistribucionJson: payload.mapaDistribucionJson,
            mapaMesasJson: payload.mapaMesasJson,
            mapaEstacionamientoJson: payload.mapaEstacionamientoJson
          });
          baselineLanding = JSON.parse(JSON.stringify(landing));
          setDirtySaved();
          clearAllMapDrafts();
          checkMapDraftBanner();
          saveLastSavedLocal(MAP_VIEW_KEYS.global, landing.mapaDistribucionJson);
          saveLastSavedLocal(MAP_VIEW_KEYS.mesas, landing.mapaMesasJson);
          saveLastSavedLocal(MAP_VIEW_KEYS.estacionamiento, landing.mapaEstacionamientoJson);
        } catch (err) {
          console.error(err);
          if (mapSavePill) {
            mapSavePill.textContent = 'Error al guardar';
            mapSavePill.className =
              'rounded-full bg-rose-500/25 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose-100';
          }
          if (msg) msg.textContent = '';
          const code = err?.code;
          const status = err?.status ?? err?.statusCode;
          const m = String(err?.message || '').toLowerCase();
          const isRls =
            code === '42501' ||
            status === 403 ||
            m.includes('permission denied') ||
            m.includes('row-level security') ||
            m.includes('violates row-level');
          await showAlert(
            isRls
              ? 'No tienes permiso para guardar el mapa. Revisa tu rol o las políticas RLS.'
              : 'Error al guardar. Verifica Postgres en Supabase (schema aplicado y RLS).',
            { title: 'Error', variant: 'danger' }
          );
        } finally {
          if (lpSaveBtn) lpSaveBtn.disabled = false;
          if (lpDiscardBtn) lpDiscardBtn.disabled = false;
          if (msg && msg.textContent === 'Guardando...') msg.textContent = '';
        }
      });

      const restoreLandingBaseline = () => {
        landing = mergeLandingRow(JSON.parse(JSON.stringify(baselineLanding)));
        scheduleConfig = parseScheduleConfig(landing.horariosTexto || serializeScheduleConfig(defaultScheduleConfig()));
        renderWeekly();
        renderSpecials();
        const sb = splitBotonesJson(landing.botonesJson);
        setVal('lp-descripcion', landing.descripcionParque);
        setVal('lp-ocupacion', landing.ocupacionTexto);
        setVal('lp-estacionamiento', landing.estacionamientoTexto);
        setVal('lp-satelite', landing.imagenSatelitalUrl);
        setVal('lp-maps', landing.googleMapsUrl);
        setVal('lp-hero-kicker', sb.hero.kicker);
        setVal('lp-hero-title', sb.hero.title);
        setVal('lp-hero-subtitle', sb.hero.subtitle);
        const abOpen = document.getElementById('lp-abierto');
        if (abOpen) abOpen.checked = landing.abiertoAhora;
        setBotonesUi(landing.botonesJson);
        const sel = document.getElementById('map-context-select');
        mapContext = sel?.value || mapContext;
        const canvasEl = document.getElementById('admin-mapa-canvas');
        const nextJson = getMapByContext();
        mapEditor?.destroy?.();
        if (canvasEl) {
          mapEditor = mountAdminMapEditor(canvasEl, nextJson);
          wireMapEditorUi();
          const dims = parseDistribucionJson(nextJson);
          setVal('mapa-doc-w', dims.w);
          setVal('mapa-doc-h', dims.h);
        }
        checkMapDraftBanner();
        void (async () => {
          try {
            const tres = await listTicketTypesAdmin();
            ticketTypesPreview = tres.data?.ticketTypes || [];
          } catch {
            ticketTypesPreview = [];
          }
          const ticketsMini = document.getElementById('lb-tickets-mini-list');
          if (ticketsMini) {
            const active = ticketTypesPreview.filter((t) => t.activo).sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0));
            ticketsMini.innerHTML = active.length
              ? active
                  .slice(0, 12)
                  .map(
                    (t) =>
                      `<div class="flex justify-between gap-2 border-b border-slate-100 py-1"><span>${escapeHtml(t.nombre)}</span><span class="font-mono text-[10px]">${escapeHtml(fmtLbMoney.format(Number(t.precio || 0)))}</span></div>`
                  )
                  .join('')
              : '<p class="text-xs text-slate-400">Sin tickets activos.</p>';
          }
          paintLandingCanvas();
          selectLbBlock(selectedLbBlock);
          setDirtySaved();
        })();
      };

      document.getElementById('lp-discard')?.addEventListener('click', () => restoreLandingBaseline());

      paintLandingCanvas();
      selectLbBlock('hero');
      switchSitioTab('landing');
      if (mapEditorFocus) {
        switchSitioTab('mapa');
        requestAnimationFrame(() => {
          const shell = document.getElementById('mapa-editor-shell');
          if (shell) {
            shell.classList.add('mapa-focus-mode');
            document.querySelector('.admin-shell')?.classList.add('admin-shell--map-focus');
            const btn = document.getElementById('mapa-focus-toggle');
            if (btn) btn.innerHTML = `${icon('eye', 'h-4 w-4')} Salir enfoque`;
          }
          document.querySelector('.mapa-editor-shell')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
      setDirtySaved();

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
      const filterInput = document.getElementById('parking-filter');
      const dragHint = document.getElementById('parking-drag-hint');
      if (!mapEl || !listEl) return;
      const canDragParking = access.can('parking.manage') || access.can('admin.panel') || access.isProgramador === true;
      if (!canDragParking) {
        if (dragHint) dragHint.textContent = 'Modo solo lectura: no tienes permisos para mover unidades.';
        if (addBtn) addBtn.setAttribute('disabled', 'true');
        if (idInput) idInput.setAttribute('disabled', 'true');
      }

      let current = [];
      let parkingMapJson = DEFAULT_MAPA_JSON;
      let parkingFilter = '';
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
        const visible = current.filter((s) => {
          if (!parkingFilter) return true;
          const needle = parkingFilter.toLowerCase();
          return (
            String(s.id || '').toLowerCase().includes(needle) ||
            String(s.placas || '').toLowerCase().includes(needle) ||
            String(s.modelo || '').toLowerCase().includes(needle) ||
            String(s.reservadoPor || '').toLowerCase().includes(needle)
          );
        });
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
          ${visible
          .map((s) => {
            const x = Math.max(0, Math.min(95, Number(s.x || 0)));
            const y = Math.max(0, Math.min(90, Number(s.y || 0)));
            const meta = parkingStateMeta(s);
            const vehicle = s.placas || s.modelo
              ? `<span class="parking-chip-vehicle">${escapeHtml(s.placas || s.modelo)}</span>`
              : '<span class="parking-chip-vehicle is-empty">Sin unidad</span>';
            return `<button type="button" data-park-node="${escapeHtml(s.id)}" class="parking-vehicle-chip state-${meta.state} ${canDragParking ? '' : 'cursor-default'}" style="left:${x}%;top:${y}%">
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

        listEl.innerHTML = visible.length
          ? visible
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
                <select data-park-status="${escapeHtml(s.id)}" class="rounded-lg border border-slate-300 p-2 text-xs font-semibold" ${canDragParking ? '' : 'disabled'}>
                  <option value="libre" ${s.estado === 'libre' ? 'selected' : ''}>Libre</option>
                  <option value="reservado" ${s.estado === 'reservado' ? 'selected' : ''}>Reservado</option>
                  <option value="ocupado" ${s.estado === 'ocupado' ? 'selected' : ''}>Ocupado</option>
                  <option value="sucio" ${s.estado === 'sucio' ? 'selected' : ''}>Sucio</option>
                  <option value="mantenimiento" ${s.estado === 'mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
                  <option value="taller" ${s.estado === 'taller' ? 'selected' : ''}>Taller</option>
                </select>
                <input data-park-placas="${escapeHtml(s.id)}" class="rounded-lg border border-slate-300 p-2 text-xs" placeholder="Placas" value="${escapeHtml(s.placas || '')}" ${canDragParking ? '' : 'disabled'} />
                <input data-park-modelo="${escapeHtml(s.id)}" class="rounded-lg border border-slate-300 p-2 text-xs" placeholder="Modelo" value="${escapeHtml(s.modelo || '')}" ${canDragParking ? '' : 'disabled'} />
                <input data-park-resby="${escapeHtml(s.id)}" class="rounded-lg border border-slate-300 p-2 text-xs" placeholder="Reservado por" value="${escapeHtml(s.reservadoPor || '')}" ${canDragParking ? '' : 'disabled'} />
                <select data-park-ubicacion="${escapeHtml(s.id)}" class="rounded-lg border border-slate-300 p-2 text-xs font-semibold" ${canDragParking ? '' : 'disabled'}>
                  <option value="patio" ${(s.ubicacion || 'patio') === 'patio' ? 'selected' : ''}>Patio</option>
                  <option value="taller" ${s.ubicacion === 'taller' ? 'selected' : ''}>Taller</option>
                  <option value="entrada" ${s.ubicacion === 'entrada' ? 'selected' : ''}>Entrada</option>
                </select>
                <div class="flex gap-1">
                  <button data-park-save="${escapeHtml(s.id)}" class="rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-700" ${canDragParking ? '' : 'disabled'}>Guardar</button>
                  <button data-park-del="${escapeHtml(s.id)}" class="rounded-lg bg-rose-600 px-3 py-2 text-xs font-black text-white hover:bg-rose-700" ${canDragParking ? '' : 'disabled'}>Eliminar</button>
                </div>
              </div>
            </div>
          `;
          })
          .join('')
          : '<div class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs font-semibold text-slate-500">Sin resultados para el filtro actual.</div>';

        document.querySelectorAll('[data-park-save]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            if (!canDragParking) return;
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
            if (!canDragParking) return;
            const id = btn.getAttribute('data-park-del');
            await removeParkingSpot(id);
            await publishAppUpdate('parking', `Spot ${id} eliminado`);
          });
        });

        document.querySelectorAll('[data-park-node]').forEach((node) => {
          node.addEventListener('mousedown', (ev) => {
            if (!canDragParking) return;
            ev.preventDefault();
            const id = node.getAttribute('data-park-node');
            const rect = mapEl.getBoundingClientRect();
            const onMove = (mev) => {
              const nx = ((mev.clientX - rect.left) / rect.width) * 100;
              const ny = ((mev.clientY - rect.top) / rect.height) * 100;
              node.classList.add('is-dragging');
              node.style.left = `${Math.max(0, Math.min(95, nx))}%`;
              node.style.top = `${Math.max(0, Math.min(90, ny))}%`;
            };
            const onUp = async (uev) => {
              const nx = ((uev.clientX - rect.left) / rect.width) * 100;
              const ny = ((uev.clientY - rect.top) / rect.height) * 100;
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
              node.classList.remove('is-dragging');
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
              '<span class="text-amber-700">Sin permiso de lectura de estacionamiento. Revisa tu rol y políticas RLS en Supabase.</span>';
            return;
          }
          console.warn('Estacionamiento:', error);
          listEl.innerHTML = '<span class="text-rose-600">No se pudo cargar estacionamiento.</span>';
        }
      );

      addBtn?.addEventListener('click', async () => {
        if (!canDragParking) return;
        const id = (idInput?.value || '').trim().toUpperCase();
        if (!id) return;
        await upsertParkingSpot({ id, x: 10, y: 10, estado: 'libre' });
        await publishAppUpdate('parking', `Spot ${id} creado`);
        idInput.value = '';
      });
      filterInput?.addEventListener('input', () => {
        parkingFilter = String(filterInput.value || '').trim();
        render();
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

          const user = getCurrentUser();
          if (!(user?.uid ?? user?.id)) {
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
              imagenUrl = await uploadProductImage(croppedProductEditFile, user.uid ?? user.id);
            }

            await updateProducto({
              id: prodEditTarget.id,
              titulo,
              descripcion,
              imagenUrl,
              precio,
              activo: Boolean(prodEditTarget.activo)
            });
            void logAuditEvent({
              eventType: 'producto_editado',
              entityType: 'producto',
              entityId: prodEditTarget.id,
              title: 'Producto editado',
              description: `Se actualizó ${titulo}.`,
              metadata: { id: prodEditTarget.id, titulo, precio }
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
          if (isBackendOperationUnavailable(error)) {
            wrap.innerHTML =
              '<p class="text-sm text-amber-800">Inventario no disponible: aplica <code class="rounded bg-amber-100 px-1">supabase/schema.sql</code>, revisa RLS y variables <code class="rounded bg-amber-100 px-1">VITE_SUPABASE_*</code>.</p>';
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
        const user = getCurrentUser();
        if (!(user?.uid ?? user?.id)) {
          await showAlert('Sesion no valida. Vuelve a iniciar sesion.', { title: 'Sesion', variant: 'danger' });
          return;
        }
        try {
          let imagenUrl = '';
          if (imageFile) {
            imagenUrl = await uploadProductImage(imageFile, user.uid ?? user.id);
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
          void logAuditEvent({
            eventType: 'producto_creado',
            entityType: 'producto',
            title: 'Producto creado',
            description: `Se creó ${titulo}.`,
            metadata: { titulo, precio, stockActual }
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
          const msg = isBackendOperationUnavailable(e)
            ? 'Postgres no expone las operaciones de inventario esperadas. Revisa supabase/schema.sql y RLS.'
            : e?.message || 'No se pudo crear el producto.';
          await showAlert(msg, { title: 'Error', variant: 'danger' });
        }
      });

      document.getElementById('btn-refresh-inventory')?.addEventListener('click', loadProductos);
      await loadProductos();
    };

    let supportReady = false;
    const initSupportPanel = () => {
      if (supportReady) return;
      supportReady = true;
      const queryEl = document.getElementById('support-query');
      const statusEl = document.getElementById('support-status-filter');
      const btnEl = document.getElementById('support-search-btn');
      const msgEl = document.getElementById('support-msg');
      const listEl = document.getElementById('support-results');
      const detailWrap = document.getElementById('support-detail');
      const detailBody = document.getElementById('support-detail-body');
      if (!queryEl || !btnEl || !listEl || !msgEl || !detailWrap || !detailBody) return;
      const setMsg = (msg = '', tone = 'muted') => {
        msgEl.textContent = msg;
        msgEl.className =
          tone === 'ok'
            ? 'mt-3 text-xs font-semibold text-emerald-700'
            : tone === 'err'
              ? 'mt-3 text-xs font-semibold text-rose-700'
              : 'mt-3 text-xs font-semibold text-slate-600';
      };
      const renderDeliveryHistory = (logs = []) => {
        if (!logs.length) return '<p class="text-xs text-slate-500">Sin historial de entrega todavía.</p>';
        return logs
          .map((row) => {
            const state =
              row.status === 'failed'
                ? 'Error al enviar correo'
                : row.status === 'resent'
                  ? 'Correo reenviado'
                  : row.status === 'sent'
                    ? `Correo enviado${row.email ? ` a ${row.email}` : ''}`
                    : row.status === 'downloaded'
                      ? row.channel === 'pdf'
                        ? 'PDF descargado'
                        : 'Imagen QR guardada'
                      : row.status === 'shared'
                        ? 'Ticket compartido'
                        : row.status === 'copied'
                          ? 'Código copiado'
                          : `${row.channel || 'canal'} · ${row.status || 'evento'}`;
            return `<li class="rounded-lg bg-white px-3 py-2 text-xs text-slate-700">${escapeHtml(state)} · ${escapeHtml(relativeTimeEs(row.created_at))}</li>`;
          })
          .join('');
      };
      const renderSupportCard = (ticket) => {
        const shortId = String(ticket.id || '').slice(0, 8).toUpperCase();
        const paid = ticket.estadoPago || 'pendiente';
        const st = ticket.estadoTicket || 'valido';
        return `<article class="rounded-xl border border-slate-200 bg-white p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-black uppercase tracking-wide text-slate-500">Folio ${escapeHtml(shortId)}</p>
              <h4 class="text-base font-black text-slate-900">${escapeHtml(ticket.clienteNombre || 'Cliente')}</h4>
              <p class="text-xs text-slate-600">${escapeHtml(ticket.clienteEmail || 'Sin correo')} · ${escapeHtml(ticket.metodoPago || '—')}</p>
            </div>
            <div class="text-right text-xs">
              <p><span class="font-bold">Pago:</span> ${escapeHtml(paid)}</p>
              <p><span class="font-bold">Ticket:</span> ${escapeHtml(st)}</p>
              <p><span class="font-bold">Total:</span> ${escapeHtml(fmtMxMoney(ticket.precioTotal || 0))}</p>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <button type="button" data-support-action="detail" data-ticket-id="${escapeHtml(ticket.id)}" class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700">Ver detalles</button>
            <button type="button" data-support-action="resend" data-ticket-id="${escapeHtml(ticket.id)}" data-ticket-email="${escapeHtml(ticket.clienteEmail || '')}" class="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white">Reenviar correo</button>
            <button type="button" data-support-action="pdf" data-ticket-id="${escapeHtml(ticket.id)}" data-ticket-name="${escapeHtml(ticket.clienteNombre || '')}" data-ticket-email="${escapeHtml(ticket.clienteEmail || '')}" data-ticket-total="${escapeHtml(String(ticket.precioTotal || 0))}" data-ticket-pay="${escapeHtml(ticket.metodoPago || '')}" data-ticket-pay-status="${escapeHtml(ticket.estadoPago || '')}" class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700">Descargar PDF</button>
            <button type="button" data-support-action="copy" data-ticket-id="${escapeHtml(ticket.id)}" class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700">Copiar folio</button>
            <button type="button" data-support-action="copy-summary" data-ticket-id="${escapeHtml(ticket.id)}" data-ticket-name="${escapeHtml(ticket.clienteNombre || '')}" data-ticket-total="${escapeHtml(String(ticket.precioTotal || 0))}" class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700">Copiar resumen</button>
            <button type="button" data-support-action="copy-link" data-ticket-id="${escapeHtml(ticket.id)}" class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700">Copiar link</button>
            <button type="button" data-support-action="audit" data-ticket-id="${escapeHtml(ticket.id)}" class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700">Ver bitácora</button>
          </div>
        </article>`;
      };
      const wireSupportActions = () => {
        listEl.querySelectorAll('[data-support-action]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const action = btn.getAttribute('data-support-action');
            const ticketId = btn.getAttribute('data-ticket-id') || '';
            if (!ticketId) return;
            if (action === 'copy') {
              await copyTicketCode(ticketId);
              setMsg('Folio copiado.', 'ok');
              return;
            }
            if (action === 'copy-link') {
              const link = `${window.location.origin}/recuperar-ticket`;
              if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(link);
              setMsg('Link copiado.', 'ok');
              return;
            }
            if (action === 'copy-summary') {
              const summary = `Ticket ${String(ticketId).slice(0, 8).toUpperCase()} · ${btn.getAttribute('data-ticket-name') || 'Cliente'} · ${fmtMxMoney(
                Number(btn.getAttribute('data-ticket-total') || 0)
              )}`;
              if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(summary);
              setMsg('Resumen copiado.', 'ok');
              return;
            }
            if (action === 'pdf') {
              await downloadTicketPdfBestEffort({
                ticketId,
                clienteNombre: btn.getAttribute('data-ticket-name') || '',
                clienteEmail: btn.getAttribute('data-ticket-email') || '',
                fechaCreacion: new Date(),
                precioTotal: Number(btn.getAttribute('data-ticket-total') || 0),
                metodoPago: btn.getAttribute('data-ticket-pay') || '',
                estadoPago: btn.getAttribute('data-ticket-pay-status') || ''
              });
              setMsg('PDF descargado.', 'ok');
              return;
            }
            if (action === 'resend') {
              const email = btn.getAttribute('data-ticket-email') || '';
              setMsg('Reenviando correo...');
              try {
                await resendTicketEmail({ ticketId, email }, { timeoutMs: 10000 });
                await logAuditEvent({
                  eventType: 'ticket_reenviado',
                  entityType: 'ticket',
                  entityId: ticketId,
                  title: 'Ticket reenviado',
                  description: `Se reenvió el ticket ${String(ticketId).slice(0, 8)} a ${email || 'correo del ticket'}.`,
                  metadata: { ticketId, email }
                });
                setMsg('Correo reenviado correctamente.', 'ok');
              } catch (e) {
                setMsg(`No se pudo reenviar: ${e?.message || 'configuración de correo.'}`, 'err');
              }
              return;
            }
            if (action === 'audit') {
              try {
                const res = await listAuditEventsForEntity({ entityType: 'ticket', entityId: ticketId, limit: 20 });
                const events = res?.data?.events || [];
                detailWrap.classList.remove('hidden');
                detailBody.innerHTML = `<h5 class="mb-2 text-sm font-black text-slate-900">Bitácora relacionada</h5>${
                  events.length
                    ? `<ul class="space-y-2">${events
                        .map(
                          (ev) =>
                            `<li class="rounded-lg bg-white px-3 py-2 text-xs"><p class="font-bold text-slate-800">${escapeHtml(ev.title || 'Evento')}</p><p class="text-slate-600">${escapeHtml(ev.description || '')}</p></li>`
                        )
                        .join('')}</ul>`
                    : '<p class="text-xs text-slate-500">Sin eventos relacionados.</p>'
                }`;
              } catch {
                setMsg('No se pudo cargar la bitácora relacionada.', 'err');
              }
              return;
            }
            try {
              const [ticketRes, logsRes] = await Promise.all([
                getTicketSupportDetails({ ticketId }),
                listTicketDeliveryLogs({ ticketId, limit: 40 })
              ]);
              const t = ticketRes?.data?.ticket;
              const items = Array.isArray(t?.metadata?.items) ? t.metadata.items : [];
              const logs = logsRes?.data?.logs || [];
              detailWrap.classList.remove('hidden');
              detailBody.innerHTML = `
                <h5 class="text-sm font-black text-slate-900">Detalle del ticket</h5>
                <p class="mt-1 text-xs text-slate-700">${escapeHtml(t?.clienteNombre || 'Cliente')} · ${escapeHtml(t?.clienteEmail || 'Sin correo')}</p>
                <p class="mt-1 text-xs text-slate-700">Compra: ${escapeHtml(t?.fechaCreacion ? new Date(t.fechaCreacion).toLocaleString('es-MX') : '—')} · Escaneo: ${escapeHtml(t?.fechaEscaneo ? new Date(t.fechaEscaneo).toLocaleString('es-MX') : 'No escaneado')}</p>
                <div class="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                  <p class="text-xs font-black uppercase tracking-wide text-slate-500">Este ticket incluye</p>
                  ${
                    items.length
                      ? `<ul class="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">${items
                          .map((it) => `<li>${escapeHtml(String(it?.cantidad || 1))} x ${escapeHtml(it?.nombre || it?.label || 'Item')}</li>`)
                          .join('')}</ul>`
                      : '<p class="mt-2 text-xs text-slate-500">Sin desglose disponible.</p>'
                  }
                </div>
                <div class="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p class="text-xs font-black uppercase tracking-wide text-slate-500">Historial de entrega</p>
                  <ul class="mt-2 space-y-1">${renderDeliveryHistory(logs)}</ul>
                </div>`;
            } catch {
              setMsg('No se pudo cargar el detalle del ticket.', 'err');
            }
          });
        });
      };
      const doSearch = async () => {
        const q = String(queryEl.value || '').trim();
        if (!q) {
          setMsg('Escribe un término de búsqueda.', 'err');
          listEl.innerHTML = '';
          detailWrap.classList.add('hidden');
          return;
        }
        setMsg('Buscando...');
        btnEl.disabled = true;
        try {
          const res = await searchTicketsForSupport({
            query: q,
            status: String(statusEl?.value || 'todos'),
            limit: 25
          });
          const rows = res?.data?.tickets || [];
          if (!rows.length) {
            listEl.innerHTML = '<p class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">No encontramos tickets con ese criterio.</p>';
            setMsg('Sin resultados.');
            return;
          }
          listEl.innerHTML = rows.map(renderSupportCard).join('');
          wireSupportActions();
          setMsg(`${rows.length} resultado(s).`, 'ok');
        } catch (e) {
          listEl.innerHTML = '';
          const msg = String(e?.message || '');
          const forbidden = /permission|forbidden|rls|not allowed|insufficient|42501/i.test(msg);
          setMsg(forbidden ? 'No tienes permiso para buscar tickets.' : e?.message || 'No se pudo buscar tickets.', 'err');
        } finally {
          btnEl.disabled = false;
        }
      };
      btnEl.addEventListener('click', () => void doSearch());
      queryEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') void doSearch();
      });
    };

    let bitacoraReady = false;
    const initBitacoraPanel = () => {
      if (bitacoraReady) return;
      bitacoraReady = true;
      const listEl = document.getElementById('audit-list');
      const btnEl = document.getElementById('audit-refresh-btn');
      const rangeEl = document.getElementById('audit-range');
      const typeEl = document.getElementById('audit-type');
      const sevEl = document.getElementById('audit-severity');
      const queryEl = document.getElementById('audit-query');
      if (!listEl || !btnEl || !rangeEl || !typeEl || !sevEl || !queryEl) return;
      const render = async () => {
        listEl.innerHTML = '<p class="text-sm text-slate-600">Cargando bitácora...</p>';
        try {
          const res = await listAuditEvents({
            range: rangeEl.value || 'today',
            eventType: String(typeEl.value || '').trim(),
            severity: String(sevEl.value || '').trim(),
            query: String(queryEl.value || '').trim(),
            limit: 80
          });
          const rows = res?.data?.events || [];
          if (!rows.length) {
            listEl.innerHTML = '<p class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">Todavía no hay eventos registrados.</p>';
            return;
          }
          listEl.innerHTML = rows
            .map((ev) => {
              const sevClass =
                ev.severity === 'error'
                  ? 'bg-rose-100 text-rose-700'
                  : ev.severity === 'warning'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-700';
              return `<article class="rounded-xl border border-slate-200 bg-white p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-sm font-black text-slate-900">${escapeHtml(ev.title || 'Evento')}</p>
                    <p class="mt-1 text-xs text-slate-600">${escapeHtml(ev.description || 'Sin descripción.')}</p>
                    <p class="mt-2 text-xs text-slate-500">${escapeHtml(relativeTimeEs(ev.created_at))}${ev.actor_email ? ` · ${escapeHtml(ev.actor_email)}` : ''}${ev.entity_id ? ` · ${escapeHtml(ev.entity_type || 'entidad')} ${escapeHtml(String(ev.entity_id).slice(0, 12))}` : ''}</p>
                  </div>
                  <span class="rounded-full px-2 py-1 text-[10px] font-black uppercase ${sevClass}">${escapeHtml(ev.severity || 'info')}</span>
                </div>
              </article>`;
            })
            .join('');
        } catch (e) {
          const msg = String(e?.message || '');
          const forbidden = /permission|forbidden|rls|not allowed|insufficient|42501/i.test(msg);
          listEl.innerHTML = `<p class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">${escapeHtml(
            forbidden ? 'No tienes permiso para ver la bitácora.' : e?.message || 'No se pudo cargar la bitácora.'
          )}</p>`;
        }
      };
      btnEl.addEventListener('click', () => void render());
      [rangeEl, sevEl].forEach((el) => el.addEventListener('change', () => void render()));
      [typeEl, queryEl].forEach((el) =>
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') void render();
        })
      );
      void render();
    };

    let corteDiaReady = false;
    const initCorteDiaPanel = () => {
      if (corteDiaReady) return;
      corteDiaReady = true;
      const fechaEl = document.getElementById('corte-dia-fecha');
      const refreshBtn = document.getElementById('corte-dia-refresh');
      const msgEl = document.getElementById('corte-dia-msg');
      const kpisEl = document.getElementById('corte-dia-kpis');
      const salesEl = document.getElementById('corte-dia-sales-list');
      const cashEl = document.getElementById('corte-dia-cash-list');
      const csvBtn = document.getElementById('corte-dia-export-csv');
      const pdfBtn = document.getElementById('corte-dia-export-pdf');
      const printBtn = document.getElementById('corte-dia-print');
      if (!fechaEl || !refreshBtn || !kpisEl || !salesEl || !cashEl || !msgEl || !csvBtn || !pdfBtn || !printBtn)
        return;
      let lastPayload = null;
      const setMsg = (msg, ok = false) => {
        msgEl.textContent = msg || '';
        msgEl.className = `mt-3 text-xs font-semibold ${ok ? 'text-emerald-700' : 'text-slate-600'}`;
      };
      const buildCsv = (summary, sales, cash) => {
        const rows = [['fecha', 'tipo', 'concepto', 'cantidad', 'metodo_pago', 'total']];
        for (const s of sales) {
          rows.push([
            summary.fecha,
            'venta_fisica',
            `Venta ${String(s.id).slice(0, 8)}`,
            String(s.metadata?.items || 0),
            s.paymentMethod || '',
            Number(s.total || 0).toFixed(2)
          ]);
        }
        for (const c of cash) {
          rows.push([
            summary.fecha,
            'movimiento_caja',
            c.type || '',
            '1',
            c.method || '',
            Number(c.amount || 0).toFixed(2)
          ]);
        }
        return rows.map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      };
      const downloadCsv = () => {
        if (!lastPayload) return;
        const csv = buildCsv(lastPayload.summary, lastPayload.sales, lastPayload.cash);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `corte_dia_${lastPayload.summary.fecha}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        void logAuditEvent({
          eventType: 'corte_exportado',
          entityType: 'daily_close',
          entityId: lastPayload.summary.fecha,
          title: 'Corte exportado CSV',
          description: `Se exportó corte del día ${lastPayload.summary.fecha} en CSV.`,
          metadata: { fecha: lastPayload.summary.fecha, format: 'csv' }
        });
      };
      const downloadPdf = async () => {
        if (!lastPayload) return;
        const host = document.createElement('div');
        host.style.cssText = 'position:fixed;left:-9999px;top:0;width:700px;background:#fff;padding:20px;';
        host.innerHTML = `
          <div style="font-family:sans-serif;color:#111">
            <h2 style="margin:0 0 6px">Balneario San Antonio</h2>
            <p style="margin:0 0 12px;color:#444">Corte del día · ${escapeHtml(lastPayload.summary.fecha)}</p>
            <p style="margin:0"><strong>Total ventas físicas:</strong> ${fmtMxMoney(lastPayload.summary.physicalTotal || 0)}</p>
            <p style="margin:0"><strong>Ventas físicas:</strong> ${Number(lastPayload.summary.physicalSalesCount || 0)}</p>
            <p style="margin:0"><strong>Tickets vendidos:</strong> ${Number(lastPayload.summary.ticketsSold || 0)}</p>
            <p style="margin:0 0 10px"><strong>Pagos pendientes:</strong> ${Number(lastPayload.summary.ticketsPending || 0)}</p>
            <ul style="padding-left:18px;font-size:12px">
              <li>Efectivo: ${fmtMxMoney(lastPayload.summary.byMethod?.efectivo || 0)}</li>
              <li>Terminal: ${fmtMxMoney(lastPayload.summary.byMethod?.terminal || 0)}</li>
              <li>Transferencia: ${fmtMxMoney(lastPayload.summary.byMethod?.transferencia || 0)}</li>
              <li>Cortesía: ${fmtMxMoney(lastPayload.summary.byMethod?.cortesia || 0)}</li>
            </ul>
          </div>`;
        document.body.appendChild(host);
        try {
          await html2pdf()
            .set({
              margin: 8,
              filename: `corte_dia_${lastPayload.summary.fecha}.pdf`,
              html2canvas: { scale: 2, backgroundColor: '#fff' },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            })
            .from(host.firstElementChild)
            .save();
          void logAuditEvent({
            eventType: 'corte_exportado',
            entityType: 'daily_close',
            entityId: lastPayload.summary.fecha,
            title: 'Corte exportado PDF',
            description: `Se exportó corte del día ${lastPayload.summary.fecha} en PDF.`,
            metadata: { fecha: lastPayload.summary.fecha, format: 'pdf' }
          });
        } finally {
          document.body.removeChild(host);
        }
      };
      const render = async () => {
        const fecha = String(fechaEl.value || formatFechaDia()).trim();
        setMsg('Cargando corte...');
        try {
          const [summaryRes, salesRes, cashRes] = await Promise.all([
            getDailyCloseSummary(fecha),
            listPhysicalSalesByDate(fecha),
            listCashMovementsByDate(fecha)
          ]);
          const summary = summaryRes?.data?.summary || {};
          const sales = salesRes?.data?.sales || [];
          const cash = cashRes?.data?.movements || [];
          lastPayload = { summary, sales, cash };
          const cards = [
            ['Ventas del día', String(summary.physicalSalesCount || 0), fmtMxMoney(summary.physicalTotal || 0)],
            ['Efectivo', fmtMxMoney(summary.byMethod?.efectivo || 0), ''],
            ['Terminal', fmtMxMoney(summary.byMethod?.terminal || 0), ''],
            ['Transferencia', fmtMxMoney(summary.byMethod?.transferencia || 0), ''],
            ['Cortesías', fmtMxMoney(summary.byMethod?.cortesia || 0), ''],
            ['Tickets vendidos', String(summary.ticketsSold || 0), `${summary.ticketsPending || 0} pendientes`],
            ['Reservas de mesas', String(summary.reservasMesas || 0), ''],
            ['Movimientos de caja', String(summary.cashMovementsCount || 0), '']
          ];
          kpisEl.innerHTML = cards
            .map(
              (card) => `<article class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p class="text-[10px] font-black uppercase tracking-wide text-slate-500">${escapeHtml(card[0])}</p>
                <p class="mt-1 text-xl font-black text-slate-900">${escapeHtml(card[1])}</p>
                <p class="text-xs text-slate-500">${escapeHtml(card[2] || '')}</p>
              </article>`
            )
            .join('');
          salesEl.innerHTML = sales.length
            ? sales
                .slice(0, 100)
                .map(
                  (s) =>
                    `<article class="rounded-lg border border-slate-200 bg-white px-3 py-2"><p class="font-black text-slate-800">#${escapeHtml(
                      String(s.id).slice(0, 8)
                    )} · ${escapeHtml(s.paymentMethod || '')}</p><p>${fmtMxMoney(s.total || 0)} · ${escapeHtml(
                      relativeTimeEs(s.createdAt)
                    )}</p></article>`
                )
                .join('')
            : '<p class="text-slate-500">Sin ventas físicas en esta fecha.</p>';
          cashEl.innerHTML = cash.length
            ? cash
                .slice(0, 120)
                .map(
                  (c) =>
                    `<article class="rounded-lg border border-slate-200 bg-white px-3 py-2"><p class="font-black text-slate-800">${escapeHtml(
                      c.type || ''
                    )} · ${escapeHtml(c.method || '')}</p><p>${fmtMxMoney(c.amount || 0)} · ${escapeHtml(
                      relativeTimeEs(c.createdAt)
                    )}</p></article>`
                )
                .join('')
            : '<p class="text-slate-500">Sin movimientos de caja en esta fecha.</p>';
          setMsg('Corte actualizado.', true);
        } catch (e) {
          setMsg(e?.message || 'No se pudo cargar corte del día.');
        }
      };
      refreshBtn.addEventListener('click', () => void render());
      fechaEl.addEventListener('change', () => void render());
      csvBtn.addEventListener('click', () => downloadCsv());
      pdfBtn.addEventListener('click', () => void downloadPdf());
      printBtn.addEventListener('click', () => window.print());
      void render();
    };

    const initialSection =
      requestedInitialSection === 'admin' && panelAdmin
        ? 'admin'
        : requestedInitialSection === 'parking' && panelParking
          ? 'parking'
        : requestedInitialSection === 'inventario' && panelInventario
          ? 'inventario'
        : requestedInitialSection === 'corte-dia' && panelCorteDia
          ? 'corte-dia'
        : requestedInitialSection === 'soporte' && panelSoporte
          ? 'soporte'
        : requestedInitialSection === 'bitacora' && panelBitacora
          ? 'bitacora'
        : requestedInitialSection === 'ticket-types' && panelTicketTypes
          ? 'ticket-types'
          : requestedInitialSection === 'sitio' && panelSitio
            ? 'sitio'
            : 'tickets';
    showSection(initialSection);
    if (requestedInitialSection === 'parking' && panelParking) initParkingPanel();
    if (requestedInitialSection === 'inventario' && panelInventario) initInventarioPanel();
    if (requestedInitialSection === 'corte-dia' && panelCorteDia) initCorteDiaPanel();
    if (requestedInitialSection === 'soporte' && panelSoporte) initSupportPanel();
    if (requestedInitialSection === 'bitacora' && panelBitacora) initBitacoraPanel();
    if (requestedInitialSection === 'ticket-types' && panelTicketTypes) await initTicketTypesPanel();
    if (requestedInitialSection === 'sitio' && panelSitio) {
      await initSitioPanel();
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
    const collectReglasJsonFromEditor = (root) => {
      if (!root) throw new Error('Condiciones del descuento no disponibles.');
      const unknown = root.__discountUnknownRules || [];
      const fields = readDiscountRulesFromDom(root);
      const errs = validateDiscountRulesFields(fields);
      showDiscountRulesValidationError(root, errs);
      if (errs.length) throw new Error(errs[0]);
      showDiscountRulesValidationError(root, []);
      return stringifyDiscountRules(fields, unknown);
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
              ${discountRulesEditorMarkup(showDiscountTechnical)}
              <p data-disc-status class="mt-2 text-xs font-semibold text-slate-500"></p>
            </article>
          `)
          .join('');

        rows.forEach((d) => {
          const article = discList.querySelector(`[data-disc-row="${CSS.escape(d.id)}"]`);
          const root = article?.querySelector('[data-dr-root]');
          if (!article || !root) return;
          const split = splitDiscountRules(parseDiscountRulesJson(d.reglasJson));
          root.__discountUnknownRules = split.unknown;
          writeDiscountRulesToDom(root, split.fields);
          wireDiscountRulesEditor(root, { showTechnical: showDiscountTechnical });
        });

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
              const rulesRoot = row.querySelector('[data-dr-root]');
              const reglas = collectReglasJsonFromEditor(rulesRoot);
              await updateDescuento({
                id,
                codigo: String(row.querySelector('[data-disc-code]')?.value || '').trim().toUpperCase(),
                tipo: String(row.querySelector('[data-disc-type]')?.value || 'porcentaje'),
                descuento: Number(row.querySelector('[data-disc-value]')?.value || 0),
                usosRestantes: Math.max(0, Number(row.querySelector('[data-disc-uses]')?.value || 0)),
                activo: Boolean(row.querySelector('[data-disc-active]')?.checked),
                reglasJson: reglas
              });
              void logAuditEvent({
                eventType: 'descuento_editado',
                entityType: 'descuento',
                entityId: id,
                title: 'Descuento editado',
                description: `Se actualizó descuento ${String(row.querySelector('[data-disc-code]')?.value || id).trim().toUpperCase()}.`,
                metadata: { id }
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
    const discCreateRulesRoot = document.getElementById('disc-create-rules-root');
    if (discCreateRulesRoot) {
      discCreateRulesRoot.__discountUnknownRules = [];
      writeDiscountRulesToDom(discCreateRulesRoot, splitDiscountRules([]).fields);
      wireDiscountRulesEditor(discCreateRulesRoot, { showTechnical: showDiscountTechnical });
    }

    if (discCreateBtn) {
      discCreateBtn.addEventListener('click', async () => {
        try {
          discCreateBtn.disabled = true;
          setDiscStatus('Creando...');
          const reglas = collectReglasJsonFromEditor(discCreateRulesRoot);
          await createDescuento({
            codigo: String(discCode?.value || '').trim().toUpperCase(),
            tipo: String(discType?.value || 'porcentaje'),
            descuento: Number(discValue?.value || 0),
            usosRestantes: Math.max(1, Number(discUses?.value || 1)),
            activo: Boolean(discActive?.checked),
            reglasJson: reglas
          });
          void logAuditEvent({
            eventType: 'descuento_creado',
            entityType: 'descuento',
            title: 'Descuento creado',
            description: `Se creó descuento ${String(discCode?.value || '').trim().toUpperCase()}.`,
            metadata: { codigo: String(discCode?.value || '').trim().toUpperCase() }
          });
          setDiscStatus('Descuento creado.', true);
          if (discCode) discCode.value = '';
          if (discValue) discValue.value = '';
          if (discUses) discUses.value = '1';
          if (discCreateRulesRoot) {
            discCreateRulesRoot.__discountUnknownRules = [];
            writeDiscountRulesToDom(discCreateRulesRoot, splitDiscountRules([]).fields);
            refreshDiscountRulesEditorUi(discCreateRulesRoot, []);
            showDiscountRulesValidationError(discCreateRulesRoot, []);
          }
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
    const adminMesaBody = document.getElementById('admin-mesa-reservas-body');
    const adminMesaFecha = document.getElementById('admin-mesa-fecha');
    const adminMesaRefresh = document.getElementById('admin-mesa-refresh');

    const fmtMesaMoney = (n) =>
      new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0));

    const parseMesaExtrasJson = (raw) => {
      try {
        const x = JSON.parse(typeof raw === 'string' && raw.trim() ? raw : '[]');
        return Array.isArray(x) ? x : [];
      } catch {
        return [];
      }
    };

    const labelMesaMetodo = (v) => {
      if (v === 'taquilla') return 'Taquilla';
      if (v === 'checkout_later') return 'Checkout después';
      return 'Por confirmar';
    };

    const loadMesaReservasOperativas = async () => {
      if (!adminMesaBody) return;
      if (!getCurrentUser()) {
        adminMesaBody.innerHTML = '<p class="text-slate-500 text-xs">Inicia sesión para listar reservas de mesa.</p>';
        return;
      }
      const fecha = (adminMesaFecha?.value || formatFechaDia()).trim();
      adminMesaBody.innerHTML = '<p class="text-slate-500">Cargando...</p>';
      try {
        const res = await listMesaReservasByFecha({ fechaDia: fecha });
        const rows = (res.data?.mesaReservas || []).filter((r) =>
          ['apartada', 'ocupada'].includes(String(r.estado || ''))
        );
        if (!rows.length) {
          adminMesaBody.innerHTML = `<p class="text-slate-500">No hay reservas de mesa activas para <span class="font-mono">${escapeHtml(fecha)}</span>.</p>`;
          return;
        }
        const table = `
          <div class="overflow-x-auto">
            <table class="w-full min-w-[720px] border-collapse text-left text-xs">
              <thead>
                <tr class="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th class="p-2">Mesa</th>
                  <th class="p-2">Cliente</th>
                  <th class="p-2">Estado</th>
                  <th class="p-2">Total</th>
                  <th class="p-2">Método</th>
                  <th class="p-2">Pago</th>
                  <th class="p-2">Extras</th>
                  <th class="p-2">Ticket</th>
                </tr>
              </thead>
              <tbody>
                ${rows
                  .map((r) => {
                    const mesa = escapeHtml(r.mesaLabel || r.mapItemId || '—');
                    const u = r.user || {};
                    const cliente = escapeHtml(
                      u.nombre || u.email || (u.id ? `Usuario ${String(u.id).slice(0, 8)}…` : '—')
                    );
                    const extras = parseMesaExtrasJson(r.extrasJson);
                    const extrasPlain = extras.length
                      ? extras.map((e) => `${e.label || e.id} (${fmtMesaMoney(e.price)})`).join('; ')
                      : '—';
                    const extrasTxt = escapeHtml(extrasPlain);
                    const totalStr =
                      r.totalReserva != null && Number.isFinite(Number(r.totalReserva))
                        ? fmtMesaMoney(r.totalReserva)
                        : 'Por confirmar';
                    const ticketId = r.ticket?.id ? escapeHtml(String(r.ticket.id).slice(0, 8)) : '—';
                    return `<tr class="border-b border-slate-100 hover:bg-slate-50/80">
                      <td class="p-2 font-semibold text-slate-900">${mesa}</td>
                      <td class="p-2">${cliente}</td>
                      <td class="p-2 font-bold uppercase">${escapeHtml(r.estado || '')}</td>
                      <td class="p-2">${escapeHtml(totalStr)}</td>
                      <td class="p-2">${escapeHtml(labelMesaMetodo(r.metodoPago))}</td>
                      <td class="p-2">${escapeHtml(r.estadoPago || 'pendiente')}</td>
                      <td class="p-2 max-w-[220px] truncate" title="${escapeHtml(extrasPlain)}">${extrasTxt}</td>
                      <td class="p-2 font-mono text-[11px]">${ticketId}</td>
                    </tr>`;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>`;
        adminMesaBody.innerHTML = table;
      } catch (e) {
        const msg = isBackendOperationUnavailable(e)
          ? 'Operación no encontrada o backend Postgres desactualizado (schema Supabase).'
          : e?.message || 'Error al cargar reservas de mesa.';
        adminMesaBody.innerHTML = `<p class="text-rose-600 text-xs">${escapeHtml(msg)}</p>`;
      }
    };

    if (adminMesaFecha) adminMesaFecha.value = formatFechaDia();
    adminMesaRefresh?.addEventListener('click', () => {
      loadMesaReservasOperativas();
    });
    adminMesaFecha?.addEventListener('change', () => {
      loadMesaReservasOperativas();
    });
    loadMesaReservasOperativas();

    const loadTickets = async () => {
      if (!tableBody) return;
      tableBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">Cargando...</td></tr>';
      try {
        const res = await listRecentTickets();
        const tickets = res.data?.tickets || [];
        if (tickets.length === 0) {
          tableBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">No hay tickets recientes</td></tr>';
          void loadExecutiveDashboard();
          return;
        }

        let html = '';
        tickets.forEach((data) => {
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
        void loadExecutiveDashboard();
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
