import {
  listPaquetes,
  listProductosPublic,
  getLandingPage,
  listServiciosLanding
} from '../dataconnect-generated';
import { drawDistribucionCanvas, DEFAULT_MAPA_JSON, MAP_ITEM_KINDS } from '../lib/distribucionMapa.js';
import { getUserAccess, waitForAuthUser } from '../lib/accessControl.js';
import { icon } from '../lib/icons.js';
import heroImageUrl from '../assets/hero.png';
import { addToCart } from '../lib/cart.js';
import { showAlert } from '../lib/appDialog.js';
import { subscribeParkingSpots } from '../lib/parkingRealtime.js';
import { parseScheduleConfig, scheduleDays } from '../lib/schedule.js';

const LANDING_PAGE_ID = 'main';

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 2
});

const defaultLanding = () => ({
  descripcionParque:
    'Balneario San Antonio Texas: espacios para la familia, albercas, areas verdes y atencion cercana. Configura este texto desde el panel de personal.',
  mapaDistribucionJson: DEFAULT_MAPA_JSON,
  imagenSatelitalUrl: '',
  googleMapsUrl: '',
  horariosTexto: 'Horario habitual: consulta en taquilla o actualiza este texto desde el panel.',
  abiertoAhora: true,
  ocupacionTexto: 'Ocupacion: informacion manual (proximamente automatica).',
  estacionamientoTexto: 'Estacionamiento: disponibilidad segun temporada.',
  botonesJson: '[]'
});

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseBotones(jsonStr) {
  try {
    const arr = JSON.parse(jsonStr || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function buildButtonHref(btn) {
  const type = (btn.type || '').toLowerCase();
  if (type === 'whatsapp') {
    const digits = String(btn.value || '').replace(/\D/g, '');
    if (!digits) return '#';
    return `https://wa.me/${digits}`;
  }
  if (type === 'mail') {
    const mail = String(btn.value || '').trim();
    if (!mail) return '#';
    return `mailto:${mail}`;
  }
  if (type === 'custom') {
    const href = String(btn.href || btn.value || '').trim();
    if (!href) return '#';
    return href;
  }
  return '#';
}

function todayIsoLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todaySchedule(schedule) {
  const jsDayToKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = jsDayToKey[new Date().getDay()];
  const todaySpecial = (schedule.specials || []).find((s) => s.date === todayIsoLocal());
  const todayDay = scheduleDays().find((d) => d.key === todayKey);
  const slot = todaySpecial || schedule.days?.[todayKey] || {};
  return {
    key: todayKey,
    label: todaySpecial?.label || todayDay?.label || 'Hoy',
    open: slot.open || '09:00',
    close: slot.close || '18:00',
    closed: Boolean(slot.closed),
    special: Boolean(todaySpecial)
  };
}

function renderScheduleRows(schedule) {
  const today = todaySchedule(schedule);
  const rows = scheduleDays()
    .map((day) => {
      const item = schedule.days?.[day.key] || {};
      const isToday = day.key === today.key && !today.special;
      const closed = Boolean(item.closed);
      const hours = closed ? 'Cerrado' : `${item.open || '09:00'} - ${item.close || '18:00'}`;
      return `
        <div class="flex items-center justify-between gap-3 rounded-xl px-3 py-2 ${isToday ? 'bg-cyan-50 ring-1 ring-cyan-200' : 'bg-white/70'}">
          <span class="min-w-0 font-bold text-slate-800">${escapeHtml(day.label)}</span>
          <span class="shrink-0 rounded-full px-3 py-1 text-xs font-black ${closed ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}">${escapeHtml(hours)}</span>
        </div>
      `;
    })
    .join('');

  const specials = (schedule.specials || [])
    .filter((s) => s.date)
    .slice(0, 3)
    .map((s) => {
      const hours = s.closed ? 'Cerrado' : `${s.open || '09:00'} - ${s.close || '18:00'}`;
      return `
        <div class="flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-100">
          <span class="min-w-0 text-xs font-black text-amber-900">${escapeHtml(s.date)}${s.label ? ` - ${escapeHtml(s.label)}` : ''}</span>
          <span class="shrink-0 text-xs font-black text-amber-800">${escapeHtml(hours)}</span>
        </div>
      `;
    })
    .join('');

  return `${rows}${specials ? `<div class="mt-3 space-y-2">${specials}</div>` : ''}`;
}

function renderMapLegend() {
  return MAP_ITEM_KINDS.map(
    (kind) => `
      <span class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">
        <span class="h-3 w-3 rounded-sm border" style="background:${escapeHtml(kind.fill)}; border-color:${escapeHtml(kind.stroke)}"></span>
        ${escapeHtml(kind.label)}
      </span>
    `
  ).join('');
}

function googleMapsEmbedUrl(rawUrl) {
  const raw = String(rawUrl || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    if (parsed.pathname.includes('/maps/embed')) return raw;
    if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(`${parsed.hostname}${parsed.pathname}`)) {
      return `https://www.google.com/maps?q=${encodeURIComponent('Balneario San Antonio Texas')}&output=embed`;
    }

    const queryParam = parsed.searchParams.get('q') || parsed.searchParams.get('query');
    const coordMatch = raw.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?)z)?/i);
    if (coordMatch) {
      const [, lat, lng, zoom] = coordMatch;
      return `https://www.google.com/maps?q=${lat},${lng}&z=${zoom || '17'}&output=embed`;
    }

    if (queryParam) {
      return `https://www.google.com/maps?q=${encodeURIComponent(queryParam)}&output=embed`;
    }

    const placeMatch = decodeURIComponent(parsed.pathname).match(/\/place\/([^/]+)/);
    if (placeMatch?.[1]) {
      return `https://www.google.com/maps?q=${encodeURIComponent(placeMatch[1].replace(/\+/g, ' '))}&output=embed`;
    }
  } catch {
    // Si el panel guarda solo una direccion o nombre, tambien se puede buscar.
  }

  return `https://www.google.com/maps?q=${encodeURIComponent(raw)}&output=embed`;
}

function renderBotones(botones) {
  if (!botones.length) {
    return '<p class="text-sm text-slate-500">Los accesos rapidos se configuran desde el panel del personal.</p>';
  }
  return botones
    .map((btn, i) => {
      const label = escapeHtml(btn.label || 'Enlace');
      const href = buildButtonHref(btn);
      const type = (btn.type || '').toLowerCase();
      const external =
        type === 'custom' &&
        (btn.external === true ||
          /^https?:\/\//i.test(href));
      if (external && href !== '#') {
        return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">${label}</a>`;
      }
      const path = href.startsWith('/') ? href : `/${href.replace(/^\//, '')}`;
      return `<a href="${escapeHtml(path)}" data-link class="inline-flex items-center justify-center rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">${label}</a>`;
    })
    .join('');
}

const renderPaqueteCard = (paquete) => `
  <article class="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
    <div class="mb-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
      Paquete especial
    </div>
    <h3 class="text-xl font-bold text-gray-900">${escapeHtml(paquete.nombre)}</h3>
    <p class="mt-2 min-h-18 text-sm text-gray-600">${escapeHtml(paquete.descripcion)}</p>
    <div class="mt-4 flex items-end justify-between">
      <div>
        <p class="text-xs text-gray-500">Desde</p>
        <p class="text-2xl font-extrabold text-blue-700">${currencyFormatter.format(paquete.precioBase)}</p>
      </div>
      <p class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        Incluye ${paquete.incluyePersonas} personas
      </p>
    </div>
    <div class="mt-5 flex gap-2">
      <button type="button" class="btn-add-paquete inline-flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700" data-paquete-id="${paquete.id}" data-paquete-name="${escapeHtml(paquete.nombre)}" data-paquete-price="${paquete.precioBase}">
        Agregar al carrito
      </button>
      <a href="/checkout" data-link class="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50">
        Ir
      </a>
    </div>
  </article>
`;

const renderPaquetes = (paquetes) => {
  if (!paquetes.length) {
    return `
      <div class="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-6 text-center text-sm text-blue-700">
        Aun no hay paquetes especiales publicados. Vuelve pronto para ver nuevas promociones.
      </div>
    `;
  }
  return `
    <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      ${paquetes.map(renderPaqueteCard).join('')}
    </div>
  `;
};

const renderProductos = (productos) => {
  if (!productos.length) {
    return `<p class="text-sm text-slate-500">Aun no hay productos publicados.</p>`;
  }
  return `
    <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      ${productos
        .map((p) => `
          <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <img src="${escapeHtml(p.imagenUrl || '')}" alt="${escapeHtml(p.titulo)}" class="h-36 w-full rounded-lg object-cover border border-slate-100 mb-3" />
            <h3 class="font-bold text-slate-900">${escapeHtml(p.titulo)}</h3>
            <p class="mt-1 text-sm text-slate-600 min-h-10">${escapeHtml(p.descripcion || '')}</p>
            <p class="mt-2 font-extrabold text-blue-700">${currencyFormatter.format(p.precio || 0)}</p>
            <button type="button" class="btn-add-producto mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
              data-producto-id="${p.id}" data-producto-name="${escapeHtml(p.titulo)}" data-producto-price="${p.precio}">
              Agregar al carrito
            </button>
          </article>
        `)
        .join('')}
    </div>
  `;
};

const navItems = [
  { id: 'inicio', label: 'Inicio', iconName: 'home' },
  { id: 'descripcion', label: 'El parque', iconName: 'info' },
  { id: 'servicios', label: 'Servicios', iconName: 'sparkles' },
  { id: 'estado', label: 'Horario y estado', iconName: 'clock' },
  { id: 'mapa', label: 'Mapa', iconName: 'map' },
  { id: 'vista-aerea', label: 'Vista aerea', iconName: 'image' },
  { id: 'paquetes', label: 'Paquetes', iconName: 'package' },
  { id: 'productos', label: 'Productos', iconName: 'package' },
  { id: 'estacionamiento', label: 'Estacionamiento', iconName: 'parking' },
  { id: 'contacto', label: 'Contacto', iconName: 'phone' }
];

function renderHomeNavItems(access) {
  const sectionItems = navItems
    .map(
      (n) =>
        `<a href="#${n.id}" class="home-nav-link home-sidebar-item" title="${escapeHtml(n.label)}">
          ${icon(n.iconName, 'home-sidebar-icon')}
          <span class="home-sidebar-label">${escapeHtml(n.label)}</span>
        </a>`
    )
    .join('');

  const actionItems = [
    access.can('dashboard.manage')
      ? {
          href: '/admin/dashboard?section=tickets',
          label: 'Gestion',
          iconName: 'briefcase',
          badge: 'Personal'
        }
      : null,
    access.can('admin.panel')
      ? {
          href: '/admin/dashboard?section=admin',
          label: 'Panel administracion',
          iconName: 'dashboard',
          badge: 'Jefe'
        }
      : null,
    access.isProgramador
      ? {
          href: '/programador/theme',
          label: 'Dashboard programador',
          iconName: 'code',
          badge: 'Dev'
        }
      : null
  ].filter(Boolean);

  const actions = actionItems.length
    ? `
      <div class="home-sidebar-separator"></div>
      ${actionItems
        .map(
          (n) => `
          <a href="${n.href}" data-link class="home-sidebar-item home-nav-route" title="${escapeHtml(n.label)}">
            ${icon(n.iconName, 'home-sidebar-icon')}
            <span class="home-sidebar-label">${escapeHtml(n.label)}</span>
            <span class="home-sidebar-badge">${escapeHtml(n.badge)}</span>
          </a>`
        )
        .join('')}
    `
    : '';

  return `${sectionItems}${actions}`;
}

function renderHomeMobileQuickNav() {
  const quickItems = [
    { id: 'inicio', label: 'Inicio', iconName: 'home' },
    { id: 'estado', label: 'Estado', iconName: 'clock' },
    { id: 'mapa', label: 'Mapa', iconName: 'map' },
    { id: 'paquetes', label: 'Paquetes', iconName: 'package' }
  ];

  return `
    ${quickItems
      .map(
        (item) => `
        <a href="#${item.id}" class="home-mobile-nav-link flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[0.68rem] font-black text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-800" title="${escapeHtml(item.label)}">
          ${icon(item.iconName, 'h-5 w-5')}
          <span class="truncate">${escapeHtml(item.label)}</span>
        </a>`
      )
      .join('')}
    <button type="button" id="home-nav-more" class="flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[0.68rem] font-black text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-800" aria-expanded="false" aria-controls="home-nav-drawer">
      ${icon('menu', 'h-5 w-5')}
      <span>Mas</span>
    </button>
  `;
}

export default {
  async render() {
    const user = await waitForAuthUser();
    const access = await getUserAccess(user);
    const navDesktop = renderHomeNavItems(access);
    const navMobile = renderHomeNavItems(access);
    const navQuickMobile = renderHomeMobileQuickNav();

    return `
      <div class="relative flex min-h-[calc(100vh-64px)] w-full bg-slate-50 text-slate-900">
        <!-- Overlay mobile -->
        <div id="home-nav-overlay" class="fixed inset-0 z-40 hidden bg-black/40 lg:hidden" aria-hidden="true"></div>

        <!-- Sidebar desktop -->
        <aside id="home-sidebar" class="home-sidebar sticky top-[92px] z-30 hidden h-[calc(100vh-92px)] shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <div class="home-sidebar-head">
            <div class="min-w-0">
              <p class="home-sidebar-kicker home-sidebar-label">Explorar</p>
              <p class="home-sidebar-subtitle home-sidebar-label">Navega por la pagina</p>
            </div>
            <button type="button" id="home-nav-collapse" class="sidebar-icon-button" title="Contraer menu" aria-label="Contraer menu">
              ${icon('collapse', 'h-5 w-5')}
            </button>
          </div>
          <nav class="home-sidebar-nav" id="home-nav-desktop" aria-label="Secciones">
            ${navDesktop}
          </nav>
        </aside>

        <!-- Sidebar mobile drawer -->
        <aside id="home-nav-drawer" class="fixed left-0 top-[92px] z-50 h-[calc(100vh-92px)] w-72 max-w-[85vw] -translate-x-full transform border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 lg:hidden" aria-hidden="true">
          <div class="border-b border-slate-100 p-4">
            <p class="text-xs font-black uppercase tracking-wider text-cyan-700">Menu</p>
            <p class="text-sm font-semibold text-slate-500">Navegacion de la landing</p>
          </div>
          <nav class="flex flex-col gap-1 overflow-y-auto p-3" id="home-nav-mobile">
            ${navMobile}
          </nav>
        </aside>

        <div class="flex min-w-0 flex-1 flex-col">
          <button type="button" id="home-nav-toggle" class="fixed left-4 top-[5.5rem] z-40 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-md lg:hidden" aria-expanded="false" aria-controls="home-nav-drawer">
            ${icon('menu', 'h-4 w-4')}
            <span>Menu</span>
          </button>

          <nav id="home-mobile-quicknav" class="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 grid grid-cols-5 gap-1 rounded-3xl border border-slate-200 bg-white/95 p-2 shadow-2xl shadow-slate-900/15 backdrop-blur lg:hidden" aria-label="Navegacion rapida">
            ${navQuickMobile}
          </nav>

          <main class="flex-1 pb-28 pt-14 lg:pb-16 lg:pt-6">
            <section id="inicio" class="landing-hero scroll-mt-24 px-4 py-16 text-white sm:px-8" style="background-image: linear-gradient(115deg, rgba(12, 74, 110, 0.92), rgba(13, 148, 136, 0.76)), url('${heroImageUrl}')">
              <div class="landing-hero-content mx-auto max-w-5xl">
                <p class="mb-3 text-xs font-bold uppercase tracking-widest text-amber-200/90">Balneario San Antonio Texas</p>
                <h1 class="text-4xl font-black leading-tight sm:text-5xl">Tu dia perfecto empieza aqui</h1>
                <p class="mt-5 max-w-2xl text-base text-blue-100 sm:text-lg">
                  Reserva en linea, revisa paquetes y conoce el parque. Todo el contenido de esta pagina puede actualizarlo el personal desde el panel administrativo.
                </p>
                <div class="landing-resource-pills mt-6">
                  <span>${icon('waves', 'h-4 w-4')} Albercas</span>
                  <span>${icon('umbrella', 'h-4 w-4')} Palapas</span>
                  <span>${icon('parking', 'h-4 w-4')} Estacionamiento</span>
                  <span>${icon('ticket', 'h-4 w-4')} Tickets digitales</span>
                </div>
                <div class="mt-8 flex flex-wrap gap-3">
                  <a href="/reservar" data-link class="rounded-xl bg-amber-400 px-6 py-3 font-bold text-slate-900 shadow transition hover:bg-amber-300">Mapa de mesas</a>
                  <a href="/checkout" data-link class="rounded-xl border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10">Compra rapida</a>
                </div>
              </div>
            </section>

            <section id="descripcion" class="scroll-mt-24 border-b border-slate-200 bg-white px-4 py-14 sm:px-8">
              <div class="mx-auto max-w-5xl">
                <h2 class="text-2xl font-black text-slate-900 sm:text-3xl">Sobre nuestro parque</h2>
                <div id="landing-descripcion" class="prose prose-slate mt-6 max-w-none whitespace-pre-wrap text-slate-600"></div>
              </div>
            </section>

            <section id="servicios" class="scroll-mt-24 bg-slate-50 px-4 py-14 sm:px-8">
              <div class="mx-auto max-w-5xl">
                <h2 class="text-2xl font-black text-slate-900 sm:text-3xl">Servicios</h2>
                <p class="mt-2 text-sm text-slate-500">Gestionados desde el panel del personal.</p>
                <div id="landing-servicios" class="mt-8 grid gap-6 sm:grid-cols-2">
                  <p class="text-sm text-slate-500">Cargando servicios...</p>
                </div>
              </div>
            </section>

            <section id="estado" class="scroll-mt-24 border-y border-slate-200 bg-white px-4 py-14 sm:px-8">
              <div class="mx-auto max-w-5xl">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p class="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-cyan-700">${icon('clock', 'h-4 w-4')} Estado del dia</p>
                    <h2 class="text-2xl font-black text-slate-900 sm:text-3xl">Horario y estado</h2>
                  </div>
                  <p id="landing-today-pill" class="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-black text-cyan-900">
                    ${icon('info', 'h-4 w-4')} Cargando horario
                  </p>
                </div>
                <div class="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
                  <article class="rounded-3xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-white p-5 shadow-sm">
                    <div class="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p class="text-xs font-black uppercase tracking-wide text-cyan-700">Horarios</p>
                        <h3 class="text-lg font-black text-slate-900">Semana operativa</h3>
                      </div>
                      <div class="grid h-11 w-11 place-items-center rounded-2xl bg-white text-cyan-700 shadow-sm ring-1 ring-cyan-100">
                        ${icon('waves', 'h-6 w-6')}
                      </div>
                    </div>
                    <div id="landing-horarios" class="space-y-2 text-sm"></div>
                  </article>

                  <div class="grid gap-4">
                    <article id="landing-open-card" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div class="flex items-start justify-between gap-3">
                        <div>
                          <p class="text-xs font-black uppercase tracking-wide text-slate-500">Abierto ahora</p>
                          <p id="landing-abierto" class="mt-2 text-2xl font-black"></p>
                          <p id="landing-abierto-detalle" class="mt-1 text-sm font-semibold text-slate-500"></p>
                        </div>
                        <div id="landing-open-icon" class="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-600">
                          ${icon('clock', 'h-6 w-6')}
                        </div>
                      </div>
                    </article>

                    <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div class="mb-3 flex items-center gap-3">
                        <div class="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-700">${icon('users', 'h-5 w-5')}</div>
                        <p class="text-xs font-black uppercase tracking-wide text-slate-500">Ocupacion</p>
                      </div>
                      <p id="landing-ocupacion" class="text-sm font-semibold leading-6 text-slate-700 whitespace-pre-wrap"></p>
                    </article>

                    <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div class="mb-3 flex items-center gap-3">
                        <div class="grid h-10 w-10 place-items-center rounded-2xl bg-amber-50 text-amber-700">${icon('parking', 'h-5 w-5')}</div>
                        <p class="text-xs font-black uppercase tracking-wide text-slate-500">Estacionamiento</p>
                      </div>
                      <p id="landing-estacionamiento" class="text-sm font-semibold leading-6 text-slate-700 whitespace-pre-wrap"></p>
                    </article>
                  </div>
                </div>
              </div>
            </section>

            <section id="mapa" class="scroll-mt-24 bg-slate-50 px-4 py-14 sm:px-8">
              <div class="mx-auto max-w-5xl">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p class="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-cyan-700">${icon('map', 'h-4 w-4')} Plano del parque</p>
                    <h2 class="text-2xl font-black text-slate-900 sm:text-3xl">Distribucion del parque</h2>
                    <p class="mt-2 max-w-2xl text-sm text-slate-600">Zonas, mesas, albercas, palapas, servicios y accesos publicados por el personal.</p>
                  </div>
                  <p class="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700">
                    ${icon('settings', 'h-4 w-4')} Editable desde panel
                  </p>
                </div>
                <div class="mt-8 overflow-hidden rounded-3xl border border-cyan-100 bg-white shadow-sm">
                  <div class="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-blue-50 p-4">
                    <p class="text-sm font-black text-slate-800">Leyenda de espacios</p>
                    <div class="flex flex-wrap gap-2">${renderMapLegend()}</div>
                  </div>
                  <div class="overflow-x-auto p-4">
                    <canvas id="landing-mapa-canvas" width="800" height="440" class="mx-auto block max-w-full rounded-2xl border border-cyan-100 shadow-inner"></canvas>
                  </div>
                </div>
              </div>
            </section>

            <section id="vista-aerea" class="scroll-mt-24 bg-white px-4 py-14 sm:px-8">
              <div class="mx-auto max-w-5xl">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p class="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-cyan-700">${icon('compass', 'h-4 w-4')} Ubicacion</p>
                    <h2 class="text-2xl font-black text-slate-900 sm:text-3xl">Vista aerea</h2>
                    <p class="mt-2 text-sm text-slate-500">Mapa embebido y vista satelital configurables desde el panel.</p>
                  </div>
                  <p id="landing-maps-link-wrap" class="hidden text-sm font-black text-cyan-700">
                    <a id="landing-maps-link" href="#" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 transition hover:bg-cyan-100">
                      ${icon('map', 'h-4 w-4')} Abrir en Google Maps
                    </a>
                  </p>
                </div>
                <div id="landing-maps-embed-wrap" class="mt-8 hidden overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-md">
                  <iframe id="landing-maps-iframe" title="Mapa de Google Maps del balneario" class="h-[420px] w-full" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
                </div>
                <div id="landing-satelite-wrap" class="mt-5 hidden overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm">
                  <img id="landing-satelite-img" src="" alt="Vista aerea del parque" class="max-h-[460px] w-full object-cover" loading="lazy" />
                </div>
                <p id="landing-satelite-placeholder" class="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Aun no hay imagen ni enlace configurados. El personal puede agregarlos desde el panel.
                </p>
              </div>
            </section>

            <section id="paquetes" class="scroll-mt-24 border-t border-slate-200 bg-slate-50 px-4 py-14 sm:px-8">
              <div class="mx-auto max-w-5xl">
                <h2 class="text-2xl font-black text-slate-900 sm:text-3xl">Paquetes disponibles</h2>
                <div id="landing-paquetes" class="mt-8 min-h-24 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
                  <p class="text-sm text-gray-500">Cargando paquetes...</p>
                </div>
              </div>
            </section>

            <section id="productos" class="scroll-mt-24 border-t border-slate-200 bg-white px-4 py-14 sm:px-8">
              <div class="mx-auto max-w-5xl">
                <h2 class="text-2xl font-black text-slate-900 sm:text-3xl">Productos y extras</h2>
                <p class="mt-2 text-sm text-slate-500">Agrega bebidas, alimentos o extras (ej. estacionamiento) al carrito.</p>
                <div id="landing-productos" class="mt-6 min-h-24">
                  <p class="text-sm text-slate-500">Cargando productos...</p>
                </div>
              </div>
            </section>

            <section id="estacionamiento" class="scroll-mt-24 border-t border-slate-200 bg-slate-50 px-4 py-14 sm:px-8">
              <div class="mx-auto max-w-5xl">
                <h2 class="text-2xl font-black text-slate-900 sm:text-3xl">Estacionamiento en tiempo real</h2>
                <p class="mt-2 text-sm text-slate-500">Visualiza spots libres, reservados y ocupados.</p>
                <div class="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                  <div class="mb-2 text-sm text-slate-600" id="parking-summary">Cargando spots...</div>
                  <div id="landing-parking-map" class="relative h-[360px] overflow-hidden rounded-lg border border-slate-200 bg-slate-100"></div>
                </div>
              </div>
            </section>

            <section id="contacto" class="scroll-mt-24 bg-white px-4 py-14 sm:px-8">
              <div class="mx-auto max-w-5xl">
                <h2 class="text-2xl font-black text-slate-900 sm:text-3xl">Contacto y enlaces</h2>
                <div id="landing-botones" class="mt-6 flex flex-wrap gap-3"></div>
                <p class="mt-8 text-sm text-slate-500">
                  <a href="/politicas" data-link class="font-semibold text-blue-700 hover:underline">Politicas de privacidad</a>
                </p>
              </div>
            </section>
          </main>
        </div>
      </div>
    `;
  },

  async mount() {
    const mergeLanding = (row) => {
      const d = defaultLanding();
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
    };

    let landing = defaultLanding();
    try {
      const res = await getLandingPage({ id: LANDING_PAGE_ID });
      landing = mergeLanding(res.data?.landingPage);
    } catch (e) {
      console.warn('Landing page no disponible aun (despliega Data Connect y crea fila main):', e);
    }

    const descEl = document.getElementById('landing-descripcion');
    if (descEl) descEl.textContent = landing.descripcionParque;

    const horarios = document.getElementById('landing-horarios');
    let today = null;
    if (horarios) {
      const schedule = parseScheduleConfig(landing.horariosTexto);
      today = todaySchedule(schedule);
      horarios.innerHTML = renderScheduleRows(schedule);
      const todayPill = document.getElementById('landing-today-pill');
      if (todayPill) {
        const todayHours = today.closed ? 'Cerrado' : `${today.open} - ${today.close}`;
        todayPill.innerHTML = `${icon(today.closed ? 'x' : 'check', 'h-4 w-4')} Hoy: ${escapeHtml(today.label)} - ${escapeHtml(todayHours)}`;
      }
    }

    const abierto = document.getElementById('landing-abierto');
    if (abierto) {
      abierto.textContent = landing.abiertoAhora ? 'Si, abierto' : 'Cerrado por hoy';
      abierto.className = `mt-2 text-2xl font-black ${landing.abiertoAhora ? 'text-emerald-700' : 'text-rose-700'}`;
      const openCard = document.getElementById('landing-open-card');
      const openIcon = document.getElementById('landing-open-icon');
      const openDetail = document.getElementById('landing-abierto-detalle');
      if (openCard) {
        openCard.className = `rounded-3xl border p-5 shadow-sm ${landing.abiertoAhora ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`;
      }
      if (openIcon) {
        openIcon.className = `grid h-11 w-11 place-items-center rounded-2xl ${landing.abiertoAhora ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`;
        openIcon.innerHTML = icon(landing.abiertoAhora ? 'check' : 'x', 'h-6 w-6');
      }
      if (openDetail && today) {
        openDetail.textContent = today.closed ? 'Sin horario de apertura para hoy.' : `Horario de hoy: ${today.open} - ${today.close}`;
      }
    }

    const oc = document.getElementById('landing-ocupacion');
    if (oc) oc.textContent = landing.ocupacionTexto;

    const est = document.getElementById('landing-estacionamiento');
    if (est) est.textContent = landing.estacionamientoTexto;

    const mapCanvas = document.getElementById('landing-mapa-canvas');
    if (mapCanvas) drawDistribucionCanvas(mapCanvas, landing.mapaDistribucionJson);

    const satWrap = document.getElementById('landing-satelite-wrap');
    const satImg = document.getElementById('landing-satelite-img');
    const ph = document.getElementById('landing-satelite-placeholder');
    const mapsWrap = document.getElementById('landing-maps-link-wrap');
    const mapsLink = document.getElementById('landing-maps-link');
    const mapsEmbedWrap = document.getElementById('landing-maps-embed-wrap');
    const mapsIframe = document.getElementById('landing-maps-iframe');
    const urlSat = (landing.imagenSatelitalUrl || '').trim();
    const urlMaps = (landing.googleMapsUrl || '').trim();
    if (urlMaps && mapsIframe && mapsEmbedWrap) {
      mapsIframe.src = googleMapsEmbedUrl(urlMaps);
      mapsEmbedWrap.classList.remove('hidden');
      ph?.classList.add('hidden');
    }
    if (urlSat && satImg && satWrap) {
      satImg.src = urlSat;
      satWrap.classList.remove('hidden');
      ph?.classList.add('hidden');
    }
    if (urlMaps && mapsLink && mapsWrap) {
      mapsLink.href = urlMaps;
      mapsWrap.classList.remove('hidden');
      ph?.classList.add('hidden');
    }

    const botWrap = document.getElementById('landing-botones');
    if (botWrap) botWrap.innerHTML = renderBotones(parseBotones(landing.botonesJson));

    const serviciosEl = document.getElementById('landing-servicios');
    if (serviciosEl) {
      try {
        const sres = await listServiciosLanding();
        const servicios = sres.data?.servicios || [];
        if (!servicios.length) {
          serviciosEl.innerHTML =
            '<p class="text-sm text-slate-500">No hay servicios publicados. El personal puede crearlos en el panel.</p>';
        } else {
          serviciosEl.innerHTML = servicios
            .map(
              (s) => `
            <article class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 class="text-lg font-bold text-slate-900">${escapeHtml(s.titulo)}</h3>
              <p class="mt-2 text-sm text-slate-600 whitespace-pre-wrap">${escapeHtml(s.descripcion)}</p>
            </article>`
            )
            .join('');
        }
      } catch (e) {
        console.error(e);
        serviciosEl.innerHTML =
          '<p class="text-sm text-rose-600">No se pudieron cargar los servicios.</p>';
      }
    }

    const paquetesContainer = document.getElementById('landing-paquetes');
    if (paquetesContainer) {
      try {
        const response = await listPaquetes();
        const paquetes = response.data?.paquetes || [];
        paquetesContainer.outerHTML = `<div id="landing-paquetes" class="mt-8">${renderPaquetes(paquetes)}</div>`;
      } catch (error) {
        console.error('Paquetes landing:', error);
        paquetesContainer.innerHTML = `
        <div class="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
          No fue posible cargar los paquetes en este momento.
        </div>`;
      }
    }

    const productosWrap = document.getElementById('landing-productos');
    if (productosWrap) {
      try {
        const res = await listProductosPublic();
        const productos = res.data?.productos || [];
        productosWrap.innerHTML = renderProductos(productos);
      } catch (e) {
        const msg = e?.message || '';
        const notDeployed =
          msg.includes('not found') ||
          msg.includes('NOT_FOUND') ||
          msg.includes('ListProductosPublic');
        if (notDeployed) {
          productosWrap.innerHTML =
            '<p class="text-sm text-slate-600">Los productos del catalogo estaran visibles despues de desplegar Data Connect en Firebase (<code class="text-xs">firebase deploy --only dataconnect</code>).</p>';
        } else {
          console.error('Productos landing:', e);
          productosWrap.innerHTML =
            '<p class="text-sm text-rose-600">No se pudieron cargar productos. Revisa la conexion.</p>';
        }
      }
    }

    document.querySelectorAll('.btn-add-paquete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        addToCart({
          key: `paquete:${btn.dataset.paqueteId}`,
          type: 'paquete',
          id: btn.dataset.paqueteId,
          name: btn.dataset.paqueteName,
          price: Number(btn.dataset.paquetePrice || 0),
          qty: 1
        });
        await showAlert('Paquete agregado al carrito.', { title: 'Carrito', variant: 'success' });
      });
    });

    document.querySelectorAll('.btn-add-producto').forEach((btn) => {
      btn.addEventListener('click', async () => {
        addToCart({
          key: `producto:${btn.dataset.productoId}`,
          type: 'producto',
          id: btn.dataset.productoId,
          name: btn.dataset.productoName,
          price: Number(btn.dataset.productoPrice || 0),
          qty: 1
        });
        await showAlert('Producto agregado al carrito.', { title: 'Carrito', variant: 'success' });
      });
    });

    const parkingMap = document.getElementById('landing-parking-map');
    const parkingSummary = document.getElementById('parking-summary');
    if (parkingMap && parkingSummary) {
      subscribeParkingSpots(
        (spots) => {
          const libres = spots.filter((s) => s.estado === 'libre').length;
          const reservados = spots.filter((s) => s.estado === 'reservado').length;
          const ocupados = spots.filter((s) => s.estado === 'ocupado').length;
          parkingSummary.textContent = `Libres: ${libres} · Reservados: ${reservados} · Ocupados: ${ocupados}`;
          parkingMap.innerHTML = spots
            .map((s) => {
              const x = Math.max(0, Math.min(95, Number(s.x || 0)));
              const y = Math.max(0, Math.min(90, Number(s.y || 0)));
              const cls =
                s.estado === 'libre'
                  ? 'bg-emerald-500'
                  : s.estado === 'reservado'
                    ? 'bg-amber-500'
                    : 'bg-rose-600';
              const title = `${s.id} · ${s.estado}${s.placas ? ` · ${s.placas}` : ''}${s.modelo ? ` · ${s.modelo}` : ''}`;
              return `<div title="${escapeHtml(title)}" class="absolute h-7 min-w-7 rounded px-2 text-[11px] font-bold text-white ${cls} flex items-center justify-center" style="left:${x}%; top:${y}%">${escapeHtml(s.id)}</div>`;
            })
            .join('');
        },
        (error) => {
          if (error?.code === 'permission-denied') {
            parkingSummary.textContent = 'Estacionamiento: sin permisos de lectura (revisa reglas Firestore).';
            return;
          }
          console.warn('Parking realtime:', error);
          parkingSummary.textContent = 'No fue posible cargar estacionamiento en tiempo real.';
        }
      );
    }

    const drawer = document.getElementById('home-nav-drawer');
    const overlay = document.getElementById('home-nav-overlay');
    const toggle = document.getElementById('home-nav-toggle');
    const mobileMore = document.getElementById('home-nav-more');
    const sidebar = document.getElementById('home-sidebar');
    const collapse = document.getElementById('home-nav-collapse');
    const setCollapsed = (collapsed) => {
      sidebar?.classList.toggle('is-collapsed', collapsed);
      if (collapse) {
        collapse.innerHTML = icon(collapsed ? 'expand' : 'collapse', 'h-5 w-5');
        collapse.title = collapsed ? 'Expandir menu' : 'Contraer menu';
      }
      localStorage.setItem('home-sidebar-collapsed', collapsed ? '1' : '0');
    };
    setCollapsed(localStorage.getItem('home-sidebar-collapsed') === '1');
    collapse?.addEventListener('click', () => {
      setCollapsed(!sidebar?.classList.contains('is-collapsed'));
    });

    const closeNav = () => {
      drawer?.classList.add('-translate-x-full');
      overlay?.classList.add('hidden');
      toggle?.setAttribute('aria-expanded', 'false');
      mobileMore?.setAttribute('aria-expanded', 'false');
      drawer?.setAttribute('aria-hidden', 'true');
    };
    const openNav = () => {
      drawer?.classList.remove('-translate-x-full');
      overlay?.classList.remove('hidden');
      toggle?.setAttribute('aria-expanded', 'true');
      mobileMore?.setAttribute('aria-expanded', 'true');
      drawer?.setAttribute('aria-hidden', 'false');
    };

    toggle?.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      if (open) closeNav();
      else openNav();
    });
    mobileMore?.addEventListener('click', () => {
      const open = mobileMore.getAttribute('aria-expanded') === 'true';
      if (open) closeNav();
      else openNav();
    });
    overlay?.addEventListener('click', closeNav);

    const scrollToId = (hash) => {
      if (!hash || hash === '#') return;
      const id = hash.replace(/^#/, '');
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      closeNav();
    };

    document.querySelectorAll('.home-nav-link, .home-mobile-nav-link').forEach((a) => {
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        scrollToId(a.getAttribute('href'));
      });
    });

    const quickLinks = Array.from(document.querySelectorAll('.home-mobile-nav-link'));
    const setQuickActive = (id) => {
      quickLinks.forEach((link) => {
        const active = link.getAttribute('href') === `#${id}`;
        link.classList.toggle('bg-cyan-50', active);
        link.classList.toggle('text-cyan-800', active);
        link.classList.toggle('text-slate-600', !active);
      });
    };
    const observedSections = quickLinks
      .map((link) => document.getElementById((link.getAttribute('href') || '').replace('#', '')))
      .filter(Boolean);
    if ('IntersectionObserver' in window && observedSections.length) {
      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (visible?.target?.id) setQuickActive(visible.target.id);
        },
        { rootMargin: '-35% 0px -50% 0px', threshold: [0.1, 0.35, 0.65] }
      );
      observedSections.forEach((section) => observer.observe(section));
    } else {
      setQuickActive('inicio');
    }
  }
};
