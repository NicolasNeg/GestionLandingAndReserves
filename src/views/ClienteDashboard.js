import { navigateTo } from '../router.js';
import { getCurrentUser, onAuthChange, logout, updateCurrentUserProfile } from '../lib/authProvider.js';
import { listUserTickets, getUserProfile, upsertUser, getClienteDashboardData } from '../lib/dataLayer.js';
import { formatFechaDia } from '../lib/fechaDiaMexico.js';
import { cartCount } from '../lib/cart.js';
import QRCode from 'qrcode';
import { downloadTicketPdf } from '../lib/ticketPdf.js';
import { showAlert } from '../lib/appDialog.js';
import { getUserAccess } from '../lib/accessControl.js';
import { icon } from '../lib/icons.js';
import { openImageCropModal } from '../lib/imageCropModal.js';
import { uploadAvatarImage } from '../lib/storageProvider.js';

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function activeSection() {
  const p = window.location.pathname;
  if (p === '/cliente' || p === '/cliente/') return 'inicio';
  if (p.startsWith('/cliente/dashboard')) return 'inicio';
  if (p.startsWith('/cliente/configuracion')) return 'configuracion';
  if (p.startsWith('/cliente/tickets')) return 'tickets';
  try {
    const prefs = JSON.parse(localStorage.getItem('cliente-preferences-v1') || '{}');
    if (prefs.defaultSection === 'configuracion') return 'configuracion';
    if (prefs.defaultSection === 'tickets') return 'tickets';
    return 'inicio';
  } catch {
    return 'inicio';
  }
}

const ClienteDashboard = {
  render: () => {
    const section = activeSection();
    return `
      <div class="min-h-[calc(100vh-92px)] bg-slate-50">
        <div class="mx-auto flex w-full max-w-6xl gap-6 p-4 sm:p-6">
          <aside class="hidden w-64 shrink-0 lg:flex lg:flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-100 p-4">
              <p class="text-xs font-black uppercase tracking-wider text-teal-700">Panel Cliente</p>
              <p class="text-sm text-slate-500">Navega tus opciones</p>
            </div>
            <nav class="flex flex-col gap-1 p-3">
              <a href="/cliente" data-link class="rounded-xl px-3 py-2 font-semibold ${section === 'inicio' ? 'bg-teal-100 text-teal-900' : 'text-slate-700 hover:bg-slate-100'}">Inicio</a>
              <a href="/cliente/tickets" data-link class="rounded-xl px-3 py-2 font-semibold ${section === 'tickets' ? 'bg-teal-100 text-teal-900' : 'text-slate-700 hover:bg-slate-100'}">Mis tickets</a>
              <a href="/cliente/configuracion" data-link class="rounded-xl px-3 py-2 font-semibold ${section === 'configuracion' ? 'bg-teal-100 text-teal-900' : 'text-slate-700 hover:bg-slate-100'}">Ajustes</a>
            </nav>
            <div class="mt-auto border-t border-slate-100 p-3">
              <button id="btn-logout" class="w-full rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100">Cerrar sesión</button>
            </div>
          </aside>

          <main class="min-w-0 flex-1 space-y-4">
            <div class="lg:hidden grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 sm:grid-cols-4">
              <a href="/cliente" data-link class="rounded-lg px-2 py-2 text-center text-xs font-semibold ${section === 'inicio' ? 'bg-teal-100 text-teal-900' : 'text-slate-700'}">Inicio</a>
              <a href="/cliente/tickets" data-link class="rounded-lg px-2 py-2 text-center text-xs font-semibold ${section === 'tickets' ? 'bg-teal-100 text-teal-900' : 'text-slate-700'}">Tickets</a>
              <a href="/cliente/configuracion" data-link class="rounded-lg px-2 py-2 text-center text-xs font-semibold ${section === 'configuracion' ? 'bg-teal-100 text-teal-900' : 'text-slate-700'}">Ajustes</a>
              <button id="btn-logout-mobile" type="button" class="rounded-lg bg-rose-50 px-2 py-2 text-xs font-bold text-rose-700">Salir</button>
            </div>

            <section id="cliente-section-inicio" class="${section === 'inicio' ? '' : 'hidden'} space-y-4">
              <div class="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-700 to-cyan-800 p-6 text-white shadow-md">
                <p class="text-xs font-black uppercase tracking-wide text-teal-100">Tu espacio</p>
                <h1 class="mt-1 text-2xl font-black leading-tight">Hola, <span id="cliente-home-name">…</span></h1>
                <p id="cliente-home-upcoming" class="mt-2 text-sm font-semibold text-teal-50">Cargando próxima visita…</p>
                <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <a href="/reservar" data-link class="flex items-center justify-center gap-2 rounded-xl bg-white/95 px-4 py-4 text-sm font-black text-teal-900 shadow transition hover:bg-white">
                    ${icon('map', 'h-5 w-5')} Mapa de mesas
                  </a>
                  <a href="/checkout" data-link class="flex items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-4 text-sm font-black text-white ring-1 ring-white/30 transition hover:bg-white/25">
                    ${icon('ticket', 'h-5 w-5')} Comprar tickets
                  </a>
                  <button type="button" id="cliente-home-cart" class="flex items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-4 text-sm font-black text-slate-900 shadow transition hover:bg-amber-200">
                    ${icon('shoppingCart', 'h-5 w-5')} Ver carrito (<span id="cliente-home-cart-count">0</span>)
                  </button>
                </div>
              </div>

              <div class="grid gap-4 lg:grid-cols-2">
                <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div class="flex items-center justify-between gap-2">
                    <h2 class="text-lg font-black text-slate-900">Tickets activos</h2>
                    <a href="/cliente/tickets" data-link class="text-xs font-black text-teal-700 hover:underline">Ver todos</a>
                  </div>
                  <div id="cliente-home-active-tickets" class="mt-3 space-y-2 text-sm text-slate-600">Cargando…</div>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div class="flex items-center justify-between gap-2">
                    <h2 class="text-lg font-black text-slate-900">Mis reservas de mesa</h2>
                    <a href="/reservar" data-link class="text-xs font-black text-teal-700 hover:underline">Reservar</a>
                  </div>
                  <div id="cliente-home-mesas" class="mt-3 space-y-2 text-sm text-slate-600">Cargando…</div>
                </div>
              </div>

              <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 class="text-lg font-black text-slate-900">Historial reciente</h2>
                <div id="cliente-home-history" class="mt-3 divide-y divide-slate-100 text-sm"></div>
              </div>
            </section>

            <section id="cliente-section-configuracion" class="${section === 'configuracion' ? '' : 'hidden'} rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p class="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-teal-700">${icon('settings', 'h-4 w-4')} Cuenta</p>
                  <h1 class="text-2xl font-black text-slate-900">Configuración</h1>
                  <p class="mt-1 text-sm text-slate-500">Administra tu perfil, preferencias y accesos.</p>
                </div>
                <span id="profile-role" class="inline-flex w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase text-blue-800">Cliente</span>
              </div>

              <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
                <section class="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-white p-5">
                  <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div class="h-24 w-24 shrink-0 overflow-hidden rounded-3xl bg-teal-100 text-teal-700 text-4xl font-black flex items-center justify-center ring-4 ring-white shadow-sm" id="profile-initial">--</div>
                    <div class="min-w-0">
                      <p class="text-xs font-black uppercase tracking-wide text-teal-700">Mi perfil</p>
                      <h2 id="profile-name" class="truncate text-2xl font-black text-slate-900">Cargando...</h2>
                      <p id="profile-email" class="truncate text-sm font-semibold text-slate-500">---</p>
                    </div>
                  </div>

                  <form id="profile-inline-form" class="mt-5 grid gap-4">
                    <label class="block text-sm font-black text-slate-700">Nombre visible
                      <input id="profile-name-input" type="text" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-teal-500" placeholder="Tu nombre" autocomplete="name" />
                    </label>
                    <label class="block text-sm font-black text-slate-700">Correo
                      <input id="profile-email-input" type="email" class="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500" readonly />
                    </label>
                    <input type="hidden" id="profile-photo-url" value="" />
                    <label class="block text-sm font-black text-slate-700">Foto de perfil
                      <div class="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <input id="profile-photo-file" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" />
                        <button type="button" id="profile-photo-pick" class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-500">
                          ${icon('image', 'h-4 w-4')} Elegir y recortar
                        </button>
                        <span class="text-xs font-semibold text-slate-500">Cuadrada recomendada; max. 6 MB.</span>
                      </div>
                    </label>
                    <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <button id="btn-save-profile" type="submit" class="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-black text-white transition hover:bg-teal-800">
                        ${icon('check', 'h-4 w-4')} Guardar perfil
                      </button>
                      <p id="profile-form-msg" class="text-sm font-semibold text-slate-500"></p>
                    </div>
                  </form>
                </section>

                <div class="grid gap-5">
                  <section class="rounded-3xl border border-slate-200 bg-white p-5">
                    <div class="mb-4 flex items-center gap-3">
                      <div class="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">${icon('settings', 'h-5 w-5')}</div>
                      <div>
                        <p class="text-xs font-black uppercase tracking-wide text-slate-500">Configuraciones</p>
                        <h2 class="font-black text-slate-900">Preferencias</h2>
                      </div>
                    </div>
                    <div class="space-y-3">
                      <label class="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm font-bold text-slate-700">
                        <input id="pref-email-copy" type="checkbox" class="mt-1 h-4 w-4 rounded border-slate-300" />
                        <span><strong class="block text-slate-900">Copias por correo</strong>Intentar enviar copia del ticket cuando sea posible.</span>
                      </label>
                      <label class="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm font-bold text-slate-700">
                        <input id="pref-compact-tickets" type="checkbox" class="mt-1 h-4 w-4 rounded border-slate-300" />
                        <span><strong class="block text-slate-900">Tickets compactos</strong>Reducir texto visible en tarjetas de tickets.</span>
                      </label>
                      <label class="block text-sm font-black text-slate-700">Vista preferida
                        <select id="pref-default-section" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900">
                          <option value="inicio">Inicio</option>
                          <option value="tickets">Mis tickets</option>
                          <option value="configuracion">Configuración</option>
                        </select>
                      </label>
                      <button id="btn-save-preferences" type="button" class="w-full rounded-xl border border-slate-200 bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-black">Guardar configuraciones</button>
                      <p id="preferences-msg" class="text-sm font-semibold text-slate-500"></p>
                    </div>
                  </section>

                  <section id="cliente-scanner-card" class="rounded-3xl border border-slate-200 bg-white p-5 hidden">
                    <div class="mb-3 flex items-center gap-3">
                      <div class="grid h-10 w-10 place-items-center rounded-2xl bg-amber-50 text-amber-700">${icon('scan', 'h-5 w-5')}</div>
                      <div>
                        <p class="text-xs font-black uppercase tracking-wide text-slate-500">Personal</p>
                        <h2 class="font-black text-slate-900">Escáner QR</h2>
                      </div>
                    </div>
                    <p id="scan-status-text" class="text-sm font-semibold text-slate-500">Verificando permisos...</p>
                    <button id="btn-open-scanner" type="button" class="mt-3 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-black">Abrir escáner</button>
                  </section>
                </div>
              </div>
            </section>

            <section id="cliente-section-tickets" class="${section === 'tickets' ? '' : 'hidden'} space-y-4">
              <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h1 class="text-2xl font-black text-slate-900">Mis tickets</h1>
                <p class="mt-1 text-sm text-slate-500">Consulta estado, QR y descarga de tus entradas.</p>
                <div id="tickets-role-breakdown" class="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                  Desglose de tickets cargando...
                </div>
              </div>
              <div id="tickets-container" class="space-y-4">
                <div class="text-center py-10 bg-white rounded-xl border border-slate-200">
                  <div class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-slate-400">${icon('clock', 'h-7 w-7 animate-spin')}</div>
                  <p class="text-slate-500">Cargando tickets...</p>
                </div>
              </div>
            </section>
          </main>
        </div>

        <div id="modal-qr" class="fixed inset-0 bg-black/60 hidden flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col items-center shadow-2xl">
            <h2 class="text-xl font-bold text-gray-800 mb-2">Tu Código de Acceso</h2>
            <p class="text-sm text-gray-500 mb-6 text-center">Muestra este código en taquilla o escáner.</p>
            <div class="bg-white p-2 rounded-xl shadow-inner border mb-6"><canvas id="qr-canvas"></canvas></div>
            <p class="font-mono text-gray-400 text-xs mb-6" id="qr-ticket-id">---</p>
            <button id="btn-close-qr" class="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition">Cerrar</button>
          </div>
        </div>

      </div>
    `;
  },

  mount: () => {
    const btnLogout = document.getElementById('btn-logout');
    const btnLogoutMobile = document.getElementById('btn-logout-mobile');
    const ticketsContainer = document.getElementById('tickets-container');
    const modalQr = document.getElementById('modal-qr');
    const btnCloseQr = document.getElementById('btn-close-qr');
    const qrCanvas = document.getElementById('qr-canvas');
    const qrTicketId = document.getElementById('qr-ticket-id');
    const profileForm = document.getElementById('profile-inline-form');
    const profileNameInput = document.getElementById('profile-name-input');
    const profileEmailInput = document.getElementById('profile-email-input');
    const profilePhotoUrl = document.getElementById('profile-photo-url');
    const profilePhotoFile = document.getElementById('profile-photo-file');
    const profilePhotoPick = document.getElementById('profile-photo-pick');
    const btnSaveProfile = document.getElementById('btn-save-profile');
    const profileFormMsg = document.getElementById('profile-form-msg');
    const prefEmailCopy = document.getElementById('pref-email-copy');
    const prefCompactTickets = document.getElementById('pref-compact-tickets');
    const prefDefaultSection = document.getElementById('pref-default-section');
    const btnSavePreferences = document.getElementById('btn-save-preferences');
    const preferencesMsg = document.getElementById('preferences-msg');
    const btnOpenScanner = document.getElementById('btn-open-scanner');
    const scanStatusText = document.getElementById('scan-status-text');
    const pInitial = document.getElementById('profile-initial');
    const pName = document.getElementById('profile-name');
    const pEmail = document.getElementById('profile-email');
    const pRole = document.getElementById('profile-role');
    const ticketsRoleBreakdown = document.getElementById('tickets-role-breakdown');

    let user = getCurrentUser();
    const ticketById = new Map();
    let profileSnapshot = { nombre: '', email: '', rol: 'cliente', photoURL: '' };
    let accessSnapshot = null;
    let preferences = {
      emailCopy: true,
      compactTickets: false,
      defaultSection: 'tickets'
    };

    const renderAvatar = (name, photoURL) => {
      if (!pInitial) return;
      pInitial.innerHTML = '';
      if (photoURL) {
        const img = document.createElement('img');
        img.src = photoURL;
        img.alt = name || 'Perfil';
        img.referrerPolicy = 'no-referrer';
        img.className = 'h-full w-full object-cover';
        img.addEventListener('error', () => {
          pInitial.innerHTML = '';
          pInitial.textContent = (name || 'U').charAt(0).toUpperCase();
        });
        pInitial.appendChild(img);
      } else {
        pInitial.textContent = (name || 'U').charAt(0).toUpperCase();
      }
    };

    const readPreferences = () => {
      try {
        const saved = JSON.parse(localStorage.getItem('cliente-preferences-v1') || '{}');
        const ds = saved.defaultSection;
        preferences = {
          emailCopy: saved.emailCopy !== false,
          compactTickets: Boolean(saved.compactTickets),
          defaultSection: ds === 'configuracion' || ds === 'tickets' || ds === 'inicio' ? ds : 'inicio'
        };
      } catch {
        preferences = { emailCopy: true, compactTickets: false, defaultSection: 'inicio' };
      }
      if (prefEmailCopy) prefEmailCopy.checked = preferences.emailCopy;
      if (prefCompactTickets) prefCompactTickets.checked = preferences.compactTickets;
      if (prefDefaultSection) prefDefaultSection.value = preferences.defaultSection;
    };

    const writePreferences = () => {
      preferences = {
        emailCopy: prefEmailCopy?.checked !== false,
        compactTickets: Boolean(prefCompactTickets?.checked),
        defaultSection:
          prefDefaultSection?.value === 'configuracion'
            ? 'configuracion'
            : prefDefaultSection?.value === 'tickets'
              ? 'tickets'
              : 'inicio'
      };
      localStorage.setItem('cliente-preferences-v1', JSON.stringify(preferences));
      if (preferencesMsg) {
        preferencesMsg.textContent = 'Configuraciones guardadas en este dispositivo.';
        preferencesMsg.className = 'text-sm font-semibold text-emerald-700';
      }
      showAlert('Configuraciones guardadas.', { title: 'Preferencias', variant: 'success' });
      loadTickets();
    };

    const runLogout = async () => {
      try {
        await logout();
        navigateTo('/login');
      } catch (error) {
        console.error('Error al cerrar sesión', error);
      }
    };

    const loadProfile = async () => {
      if (!user) return;
      try {
        const profileRes = await getUserProfile({ id: user.uid ?? user.id });
        const userData = profileRes.data?.user;
        const name = userData?.nombre || user.displayName || 'Sin Nombre';
        profileSnapshot = {
          nombre: name,
          email: userData?.email || user.email || '',
          rol: userData?.rol || 'cliente',
          photoURL: user.photoURL || ''
        };
        if (pName) pName.textContent = name;
        if (pEmail) pEmail.textContent = profileSnapshot.email;
        if (pRole) pRole.textContent = profileSnapshot.rol;
        if (profileNameInput) profileNameInput.value = name;
        if (profileEmailInput) profileEmailInput.value = profileSnapshot.email;
        if (profilePhotoUrl) profilePhotoUrl.value = profileSnapshot.photoURL;
        renderAvatar(name, profileSnapshot.photoURL);
      } catch (error) {
        console.error('Error al cargar perfil:', error);
      }
    };

    const loadAccess = async () => {
      accessSnapshot = await getUserAccess(user);
      const scannerCard = document.getElementById('cliente-scanner-card');
      if (accessSnapshot.can('tickets.scan')) {
        scannerCard?.classList.remove('hidden');
        if (scanStatusText) scanStatusText.textContent = 'Tienes permiso de escaneo.';
        if (btnOpenScanner) {
          btnOpenScanner.disabled = false;
          btnOpenScanner.className =
            'mt-3 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-black';
        }
      } else {
        scannerCard?.classList.add('hidden');
        if (scanStatusText) scanStatusText.textContent = 'No disponible en cuenta cliente.';
        if (btnOpenScanner) {
          btnOpenScanner.disabled = true;
          btnOpenScanner.className =
            'mt-3 w-full cursor-not-allowed rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-400';
        }
      }
    };

    const loadClienteHome = async () => {
      const nm = document.getElementById('cliente-home-name');
      const up = document.getElementById('cliente-home-upcoming');
      const act = document.getElementById('cliente-home-active-tickets');
      const mes = document.getElementById('cliente-home-mesas');
      const hist = document.getElementById('cliente-home-history');
      const cnt = document.getElementById('cliente-home-cart-count');
      if (!nm || !user) return;
      nm.textContent = profileSnapshot.nombre || user.displayName || 'Cliente';
      if (cnt) cnt.textContent = String(cartCount());
      try {
        const dash = await getClienteDashboardData(user.uid ?? user.id);
        if (up) {
          up.textContent =
            dash.upcomingHint ||
            `Sin visitas programadas (${formatFechaDia()}). Explora tickets o mesas.`;
        }
        if (act) {
          const at = dash.activeTickets || [];
          if (!at.length) act.innerHTML = '<p class="text-slate-500">Sin tickets vigentes.</p>';
          else {
            act.innerHTML = at
              .slice(0, 4)
              .map(
                (t) => `
              <div class="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p class="font-mono text-xs font-bold text-slate-800">#${String(t.id).slice(0, 8)}</p>
                <p class="text-xs text-slate-600">Total $${Number(t.precioTotal || 0).toFixed(2)} · ${escapeHtml(t.estadoTicket || '')}</p>
              </div>`
              )
              .join('');
          }
        }
        if (mes) {
          const mr = (dash.mesas || []).filter((m) => (m.estado || '') === 'apartada');
          if (!mr.length) mes.innerHTML = '<p class="text-slate-500">Sin mesas apartadas.</p>';
          else {
            mes.innerHTML = mr
              .slice(0, 5)
              .map(
                (m) => `
              <div class="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p class="font-bold text-slate-900">${escapeHtml(m.mesaLabel || m.mapItemId || 'Mesa')}</p>
                <p class="text-xs text-slate-600">${escapeHtml(m.fechaDia || '')} · $${Number(m.totalReserva ?? m.subtotalMesa ?? 0).toFixed(2)}</p>
              </div>`
              )
              .join('');
          }
        }
        if (hist) {
          const rt = dash.recentTickets || [];
          if (!rt.length) hist.innerHTML = '<p class="py-3 text-slate-500">Sin compras recientes.</p>';
          else {
            hist.innerHTML = rt
              .slice(0, 6)
              .map(
                (t) => `
              <div class="flex items-center justify-between gap-2 py-3">
                <div class="min-w-0">
                  <p class="truncate font-mono text-xs font-bold text-slate-800">#${String(t.id).slice(0, 8)}</p>
                  <p class="truncate text-xs text-slate-500">${new Date(t.fechaCreacion).toLocaleString()}</p>
                </div>
                <span class="text-xs font-black uppercase text-slate-600">${escapeHtml(t.estadoTicket || '')}</span>
              </div>`
              )
              .join('');
          }
        }
      } catch (e) {
        console.warn('Cliente home:', e);
        if (act) act.innerHTML = '<p class="text-rose-600 text-xs">No se pudieron cargar datos.</p>';
        if (mes) mes.innerHTML = '<p class="text-slate-500 text-xs">—</p>';
      }
    };

    const renderTickets = (tickets) => {
      if (!ticketsContainer) return;
      if (!tickets.length) {
        ticketsContainer.innerHTML = `
          <div class="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <h3 class="font-bold text-gray-700 mb-1">No tienes tickets</h3>
            <p class="text-gray-500 text-sm mb-6">Aún no has comprado accesos.</p>
            <a href="/checkout" data-link class="text-blue-600 font-bold hover:underline">Comprar ahora</a>
          </div>`;
        return;
      }
      const canScan = accessSnapshot?.can('tickets.scan');
      let html = '';
      ticketById.clear();
      tickets.forEach((ticket) => {
        ticketById.set(ticket.id, ticket);
        const isValido = ticket.estadoTicket === 'valido';
        const statusText = isValido ? 'Vigente' : ticket.estadoTicket === 'escaneado' ? 'Usado' : 'No válido';
        const statusBg = isValido ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700';
        const basicResume = preferences.compactTickets
          ? `
          <p><span class="font-medium">Estado:</span> ${statusText}</p>
          <p><span class="font-medium">Total:</span> $${ticket.precioTotal.toFixed(2)} MXN</p>
        `
          : `
          <p><span class="font-medium">Estado:</span> ${statusText}</p>
          <p><span class="font-medium">Total:</span> $${ticket.precioTotal.toFixed(2)} MXN</p>
          <p><span class="font-medium">Fecha:</span> ${new Date(ticket.fechaCreacion).toLocaleString()}</p>
        `;
        const staffExtra = canScan
          ? `
            <p><span class="font-medium">Pago:</span> ${ticket.estadoPago}</p>
            <p><span class="font-medium">Método:</span> ${ticket.metodoPago || 'online'}</p>
            <p><span class="font-medium">Escaneado:</span> ${ticket.fechaEscaneo ? new Date(ticket.fechaEscaneo).toLocaleString() : 'No'}</p>
          `
          : '';
        html += `
          <div class="bg-white rounded-xl shadow-sm border-l-4 ${isValido ? 'border-blue-500' : 'border-gray-300'} p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-3 mb-1 flex-wrap">
                <h3 class="text-lg font-bold text-gray-800">Ticket #${ticket.id.substring(0, 8)}</h3>
                <span class="${statusBg} text-xs font-bold px-2 py-0.5 rounded">${statusText}</span>
              </div>
              <div class="space-y-1 text-sm text-gray-600">${basicResume}${staffExtra}</div>
            </div>
            <div class="flex flex-col gap-2 min-w-[140px]">
              <button type="button" class="btn-download-pdf w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700" data-id="${ticket.id}">Descargar PDF</button>
              ${isValido ? `<button type="button" class="btn-show-qr w-full bg-gray-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-black" data-id="${ticket.id}">Ver QR</button>` : ''}
              ${canScan ? `<button type="button" class="btn-go-scan w-full bg-amber-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-amber-600" data-id="${ticket.id}">Escanear ingreso</button>` : ''}
            </div>
          </div>`;
      });
      ticketsContainer.innerHTML = html;
      if (ticketsRoleBreakdown) {
        const vigentes = tickets.filter((t) => t.estadoTicket === 'valido').length;
        const usados = tickets.filter((t) => t.estadoTicket === 'escaneado').length;
        const pendientes = tickets.filter((t) => t.estadoPago !== 'pagado').length;
        ticketsRoleBreakdown.innerHTML = `
          <strong>Usuario:</strong> Vigentes: ${vigentes} · Usados: ${usados} · Pendientes de pago: ${pendientes}.
          ${canScan ? '<br/><strong>Trabajador:</strong> también puedes abrir escáner y registrar entrada.' : ''}
        `;
      }
    };

    const loadTickets = async () => {
      if (!ticketsContainer || !user) return;
      try {
        const res = await listUserTickets({ userId: user.uid ?? user.id });
        renderTickets(res.data?.tickets || []);
        document.querySelectorAll('.btn-show-qr').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            qrTicketId.textContent = id;
            QRCode.toCanvas(qrCanvas, id, { width: 200, margin: 1 });
            modalQr.classList.remove('hidden');
          });
        });
        document.querySelectorAll('.btn-download-pdf').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            const t = ticketById.get(id);
            if (!t) return;
            btn.disabled = true;
            try {
              await downloadTicketPdf({
                ticketId: t.id,
                clienteNombre: t.clienteNombre,
                clienteEmail: t.clienteEmail || user.email || '',
                fechaCreacion: t.fechaCreacion,
                precioTotal: t.precioTotal,
                metodoPago: t.metodoPago || 'online',
                estadoPago: t.estadoPago
              });
            } catch {
              await showAlert('No se pudo generar el PDF. Intenta de nuevo.', { title: 'Error', variant: 'danger' });
            } finally {
              btn.disabled = false;
            }
          });
        });
        document.querySelectorAll('.btn-go-scan').forEach((btn) => {
          btn.addEventListener('click', (e) => navigateTo(`/escaner?ticket=${encodeURIComponent(e.currentTarget.dataset.id)}`));
        });
      } catch (error) {
        console.error('Error al cargar tickets:', error);
        ticketsContainer.innerHTML = '<p class="text-red-500 p-4">Hubo un error al cargar tus reservas.</p>';
      }
    };

    profilePhotoPick?.addEventListener('click', () => profilePhotoFile?.click());
    profilePhotoFile?.addEventListener('change', async () => {
      const f = profilePhotoFile?.files?.[0];
      const u = getCurrentUser();
      if (!f || !u) return;
      const prevHtml = profilePhotoPick?.innerHTML;
      if (profilePhotoPick) {
        profilePhotoPick.disabled = true;
        profilePhotoPick.innerHTML = `${icon('clock', 'h-4 w-4 animate-spin')} Procesando...`;
      }
      try {
        const blob = await openImageCropModal({
          file: f,
          aspectRatio: 1,
          title: 'Recortar foto de perfil'
        });
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
        const url = await uploadAvatarImage(file, u.uid ?? u.id);
        if (profilePhotoUrl) profilePhotoUrl.value = url;
        profileSnapshot.photoURL = url;
        const nombre = (profileNameInput?.value || profileSnapshot.nombre || '').trim() || 'Usuario';
        renderAvatar(nombre, url);
        if (profileFormMsg) {
          profileFormMsg.textContent = 'Foto lista. Pulsa Guardar perfil para aplicarla.';
          profileFormMsg.className = 'text-sm font-semibold text-emerald-700';
        }
      } catch (e) {
        if (e?.name !== 'AbortError') {
          console.error(e);
          if (profileFormMsg) {
            profileFormMsg.textContent = e?.message || 'No se pudo subir la foto.';
            profileFormMsg.className = 'text-sm font-semibold text-rose-700';
          }
          await showAlert(e?.message || 'No se pudo subir la foto.', { title: 'Foto', variant: 'danger' });
        }
      } finally {
        if (profilePhotoFile) profilePhotoFile.value = '';
        if (profilePhotoPick) {
          profilePhotoPick.disabled = false;
          profilePhotoPick.innerHTML = prevHtml || `${icon('image', 'h-4 w-4')} Elegir y recortar`;
        }
      }
    });

    profileForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const nombre = (profileNameInput?.value || '').trim();
      const photoURL = (profilePhotoUrl?.value || '').trim();
      if (!nombre) return showAlert('El nombre es obligatorio.', { title: 'Editar perfil', variant: 'warning' });
      btnSaveProfile.disabled = true;
      btnSaveProfile.innerHTML = `${icon('clock', 'h-4 w-4 animate-spin')} Guardando...`;
      if (profileFormMsg) {
        profileFormMsg.textContent = 'Guardando cambios...';
        profileFormMsg.className = 'text-sm font-semibold text-slate-500';
      }
      try {
        await upsertUser({
          id: user.uid ?? user.id,
          email: profileSnapshot.email || user.email || '',
          nombre,
          rol: profileSnapshot.rol || 'cliente'
        });
        await updateCurrentUserProfile({ displayName: nombre, photoURL: photoURL || null });
        user = getCurrentUser() || user;
        profileSnapshot.nombre = nombre;
        profileSnapshot.photoURL = photoURL;
        if (pName) pName.textContent = nombre;
        renderAvatar(nombre, photoURL);
        if (profileFormMsg) {
          profileFormMsg.textContent = 'Perfil actualizado.';
          profileFormMsg.className = 'text-sm font-semibold text-emerald-700';
        }
        await showAlert('Perfil actualizado correctamente.', { title: 'Listo', variant: 'success' });
      } catch (error) {
        console.error(error);
        if (profileFormMsg) {
          profileFormMsg.textContent = 'No se pudo actualizar el perfil.';
          profileFormMsg.className = 'text-sm font-semibold text-rose-700';
        }
        await showAlert('No se pudo actualizar el perfil.', { title: 'Error', variant: 'danger' });
      } finally {
        btnSaveProfile.disabled = false;
        btnSaveProfile.innerHTML = `${icon('check', 'h-4 w-4')} Guardar perfil`;
      }
    });

    btnSavePreferences?.addEventListener('click', writePreferences);
    btnCloseQr?.addEventListener('click', () => modalQr.classList.add('hidden'));
    btnOpenScanner?.addEventListener('click', () => accessSnapshot?.can('tickets.scan') && navigateTo('/escaner'));
    document.getElementById('cliente-home-cart')?.addEventListener('click', () => {
      document.querySelector('[data-app-cart-toggle]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    window.addEventListener('cart:changed', () => {
      const el = document.getElementById('cliente-home-cart-count');
      if (el) el.textContent = String(cartCount());
    });
    btnLogout?.addEventListener('click', runLogout);
    btnLogoutMobile?.addEventListener('click', runLogout);

    readPreferences();
    if (user) {
      Promise.all([loadProfile(), loadAccess()]).then(() => {
        loadTickets();
        if (activeSection() === 'inicio') void loadClienteHome();
      });
    } else {
      const unsubscribe = onAuthChange((u) => {
        if (u) {
          user = u;
          Promise.all([loadProfile(), loadAccess()]).then(() => {
            loadTickets();
            if (activeSection() === 'inicio') void loadClienteHome();
          });
        }
        unsubscribe();
      });
    }
  }
};

export default ClienteDashboard;
