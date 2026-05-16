import {
  listPaquetes,
  listProductosPublic,
  getLandingPage,
  listServiciosLanding,
  listTicketTypesPublic
} from '../lib/dataLayer.js';
import { getCurrentUser } from '../lib/authProvider.js';
import {
  DEFAULT_MAPA_JSON,
  MAP_ITEM_KINDS,
  createMapViewer,
  parseDistribucionJson
} from '../lib/distribucionMapa.js';
import { getUserAccess, waitForAuthUser } from '../lib/accessControl.js';
import { icon } from '../lib/icons.js';
import heroImageUrl from '../assets/hero.png';
import { addToCart } from '../lib/cart.js';
import { showAlert } from '../lib/appDialog.js';
import { subscribeParkingSpots } from '../lib/parkingRealtime.js';
import { parseScheduleConfig, scheduleDays } from '../lib/schedule.js';
import { splitBotonesJson, filterPublicBotones } from '../lib/landingBotonesHero.js';
import { computeRouteToMapItem } from '../lib/mapEngine/mapPathfinding.js';
import { buildPublicMapFilterChips } from '../lib/mapEngine/mapPublicFilters.js';
import { mountPublicParkMap } from '../react/publicParkMapMount.tsx';
import { isAquamapSiteJson } from '../aquamap/siteEnvelope.ts';
import { mountAquamapLandingMap } from '../react/aquaMapLandingMount.tsx';
import { googleMapsEmbedUrl, googleMapsOpenUrl } from '../lib/googleMapsEmbed.js';

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
  mapaMesasJson: DEFAULT_MAPA_JSON,
  mapaEstacionamientoJson: DEFAULT_MAPA_JSON,
  imagenSatelitalUrl: '',
  googleMapsUrl: '',
  googleMapsAddress: '',
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
  const publicKinds = ['area', 'mesa', 'estacionamiento', 'alberca', 'palapa', 'servicio', 'entrada', 'limitacion'];
  return MAP_ITEM_KINDS.filter((kind) => publicKinds.includes(kind.value)).map(
    (kind) => `
      <span class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm">
        <span class="h-3 w-3 shrink-0 rounded-sm border border-slate-300/80" style="background:${escapeHtml(kind.fill)}; border-color:${escapeHtml(kind.stroke)}"></span>
        ${escapeHtml(kind.label)}
      </span>
    `
  ).join('');
}

function renderParkingLegend() {
  const items = [
    { label: 'Libre', fill: 'rgba(34,197,94,0.35)', stroke: '#15803d' },
    { label: 'Reservado', fill: 'rgba(245,158,11,0.28)', stroke: '#b45309' },
    { label: 'Ocupado', fill: 'rgba(239,68,68,0.26)', stroke: '#b91c1c' },
    { label: 'Mantenimiento', fill: 'rgba(100,116,139,0.28)', stroke: '#475569' }
  ];
  return items
    .map(
      (it) => `
      <span class="inline-flex items-center gap-2 rounded-full border border-slate-600/50 bg-slate-900/55 px-2.5 py-1 text-[11px] font-black text-slate-100 backdrop-blur-sm">
        <span class="h-2.5 w-2.5 shrink-0 rounded-sm border border-white/20" style="background:${it.fill}; border-color:${it.stroke}"></span>
        ${escapeHtml(it.label)}
      </span>`
    )
    .join('');
}

function getPublicKindLabel(kindValue) {
  return MAP_ITEM_KINDS.find((kind) => kind.value === kindValue)?.label || 'Zona';
}

/** Adapta un elemento AquaMap al shape que usa el panel de detalle de la landing (mismo que Konva). */
function pseudoItemFromAquamapElement(el) {
  if (!el) return null;
  const kind =
    el.type === 'pool'
      ? 'pool'
      : el.type === 'mesa'
        ? 'mesa'
        : el.type === 'parking'
          ? 'estacionamiento'
          : el.type === 'tree'
            ? 'marker'
            : el.type === 'slide'
              ? 'rect'
              : 'servicio';
  return {
    kind,
    label: el.name,
    metadata: { publicName: el.name, description: el.description },
    notes: el.description || ''
  };
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

function normalizeBadgeFromProduct(producto) {
  const stock = Number(producto?.stockActual ?? 0);
  if (stock <= 0) return { label: 'Sin stock', tone: 'danger' };
  if (stock <= 5) return { label: 'Pocas piezas', tone: 'warn' };
  const metadataBadge =
    producto?.metadata?.badge ||
    producto?.badge ||
    producto?.nuevo ||
    producto?.esNuevo ||
    producto?.destacado;
  if (metadataBadge === true) return { label: 'Nuevo', tone: 'info' };
  if (typeof metadataBadge === 'string' && metadataBadge.trim()) {
    return { label: metadataBadge.trim().slice(0, 22), tone: 'info' };
  }
  const created = new Date(producto?.fechaCreacion || 0).getTime();
  if (Number.isFinite(created) && created > 0) {
    const ageDays = (Date.now() - created) / (1000 * 60 * 60 * 24);
    if (ageDays <= 14) return { label: 'Nuevo', tone: 'info' };
  }
  return null;
}

const renderProductos = (productos) => {
  if (!productos.length) {
    return '<article class="landing-products-empty"><p class="landing-products-empty-title">Todavía no hay productos disponibles.</p><p class="landing-products-empty-sub">Pronto encontrarás nuevos extras para complementar tu visita.</p></article>';
  }
  return `
    <div class="landing-products-grid">
      ${productos
        .map((p) => {
          const stock = Number(p.stockActual ?? 0);
          const canAdd = stock > 0;
          const badge = normalizeBadgeFromProduct(p);
          const badgeClass =
            badge?.tone === 'danger'
              ? 'landing-product-badge is-danger'
              : badge?.tone === 'warn'
                ? 'landing-product-badge is-warn'
                : 'landing-product-badge is-info';
          return `
          <article class="landing-product-card">
            <div class="landing-product-media-wrap">
              <img src="${escapeHtml(p.imagenUrl || heroImageUrl)}" alt="${escapeHtml(p.titulo || 'Producto')}" class="landing-product-media" loading="lazy" />
              ${badge ? `<span class="${badgeClass}">${escapeHtml(badge.label)}</span>` : ''}
            </div>
            <div class="landing-product-body">
              <h3 class="landing-product-title">${escapeHtml(p.titulo || 'Producto')}</h3>
              <p class="landing-product-desc">${escapeHtml(p.descripcion || '')}</p>
              <div class="landing-product-price-row">
                <p class="landing-product-price">${currencyFormatter.format(p.precio || 0)}</p>
                ${canAdd ? '' : '<p class="landing-product-unavailable">No disponible</p>'}
              </div>
              <button
                type="button"
                class="btn-add-producto landing-product-add"
                data-producto-id="${p.id}"
                data-producto-name="${escapeHtml(p.titulo)}"
                data-producto-price="${p.precio}"
                aria-label="${canAdd ? `Agregar ${escapeHtml(p.titulo)} al carrito` : 'Producto sin stock'}"
                ${canAdd ? '' : 'disabled'}
              >
                ${icon('shoppingCart', 'h-4 w-4')}
                ${canAdd ? 'Agregar al carrito' : 'Sin stock'}
              </button>
            </div>
          </article>
        `;
        })
        .join('')}
    </div>
  `;
};

const renderTicketTypes = (ticketTypes) => {
  if (!ticketTypes.length) {
    return `<p class="text-sm text-slate-500">No hay tickets configurados en este momento.</p>`;
  }
  return `
    <div class="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
      ${ticketTypes.map((t, i) => `
        <article class="bg-white rounded-2xl shadow-xl relative overflow-hidden border-t-[12px] ${t.especial ? 'border-amber-500' : 'border-teal-700'}">
          <div class="p-8">
            <div class="flex justify-between items-start gap-4 mb-6">
              <div>
                <h3 class="text-xl font-black ${t.especial ? 'text-amber-700' : 'text-teal-700'}">${escapeHtml(t.nombre)}</h3>
                <p class="text-sm text-slate-500">${escapeHtml(t.descripcion || 'Ticket configurable desde panel')}</p>
              </div>
              <span class="${t.especial ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-teal-50 text-teal-700 border-teal-200'} border px-4 py-2 rounded-full text-xs font-black">
                ${t.especial ? 'Especial' : 'General'}
              </span>
            </div>
            <ul class="space-y-3 text-sm text-slate-600">
              <li class="flex items-center gap-2">
                <span class="${t.especial ? 'text-amber-700' : 'text-teal-700'}">${icon('check', 'h-4 w-4')}</span>
                ${escapeHtml(t.incluye || 'Acceso segun configuracion del panel')}
              </li>
            </ul>
          </div>
          <div class="mt-auto bg-slate-50 border-t-2 border-dashed border-slate-200 p-8">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-slate-400 text-sm block">Precio por persona</p>
                <p class="text-4xl font-extrabold text-slate-900">${currencyFormatter.format(t.precio)}</p>
              </div>
              <button
                type="button"
                class="btn-add-ticket-individual rounded-xl ${t.especial ? 'bg-amber-500 hover:bg-amber-400' : 'bg-teal-700 hover:bg-teal-600'} px-8 py-4 text-sm font-black text-white transition active:scale-[0.99]"
                data-ticket-key="ticket:${escapeHtml(t.id)}"
                data-ticket-id="${escapeHtml(t.id)}"
                data-ticket-name="${escapeHtml(t.nombre)}"
                data-ticket-price="${Number(t.precio || 0)}"
              >
                Agregar al carrito
              </button>
            </div>
            <div class="mt-6 h-12 rounded-xl border border-slate-200 bg-white/60 flex items-center justify-center text-slate-400 text-xs font-bold">
              Codigo QR se genera al comprar
            </div>
          </div>
        </article>
      `).join('')}
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
    { id: 'tickets-individuales', label: 'Tickets', iconName: 'ticket' }
  ];

  return `
    ${quickItems
      .map(
        (item) => `
        <a href="#${item.id}" class="home-mobile-nav-link flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[0.68rem] font-black text-slate-700 transition hover:bg-white hover:text-cyan-800" title="${escapeHtml(item.label)}">
          <span class="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-700">${icon(item.iconName, 'h-4 w-4')}</span>
          <span class="truncate">${escapeHtml(item.label)}</span>
        </a>`
      )
      .join('')}
    <button type="button" id="home-nav-more" class="flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[0.68rem] font-black text-slate-700 transition hover:bg-white hover:text-cyan-800" aria-expanded="false" aria-controls="home-nav-drawer">
      <span class="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-700">${icon('menu', 'h-4 w-4')}</span>
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

          <nav id="home-mobile-quicknav" class="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 grid grid-cols-5 gap-1 rounded-3xl border border-cyan-100 bg-white/92 p-2 shadow-2xl shadow-cyan-900/20 backdrop-blur-md lg:hidden" aria-label="Navegacion rapida">
            ${navQuickMobile}
          </nav>

          <main class="flex-1 pb-28 pt-14 lg:pb-16 lg:pt-6">
            <section id="inicio" class="landing-hero scroll-mt-24 px-4 py-20 text-white sm:px-8 sm:py-24" style="background-image: linear-gradient(115deg, rgba(12, 74, 110, 0.92), rgba(13, 148, 136, 0.76)), url('${heroImageUrl}'); background-size: cover; background-position: center;">
              <div class="landing-hero-content mx-auto max-w-5xl">
                <p id="landing-hero-kicker" class="mb-3 text-xs font-bold uppercase tracking-widest text-amber-200/90">Balneario San Antonio Texas</p>
                <h1 id="landing-hero-title" class="text-balance text-4xl font-black leading-[1.12] sm:text-5xl lg:text-6xl">Tu dia perfecto empieza aqui</h1>
                <p id="landing-hero-subtitle" class="mt-5 max-w-2xl text-base leading-relaxed text-blue-100/95 sm:text-lg">
                  Reserva en linea, revisa paquetes y conoce el parque. Actualizado por el equipo desde un solo panel: horarios, mapa y catalogo.
                </p>
                <div class="landing-resource-pills mt-6">
                  <span>${icon('waves', 'h-4 w-4')} Albercas</span>
                  <span>${icon('umbrella', 'h-4 w-4')} Palapas</span>
                  <span>${icon('parking', 'h-4 w-4')} Estacionamiento</span>
                  <span>${icon('ticket', 'h-4 w-4')} Tickets digitales</span>
                </div>
                <div class="mt-8 flex flex-wrap gap-3">
                  <a href="/reservar" data-link class="rounded-xl bg-amber-400 px-6 py-3 font-bold text-slate-900 shadow transition hover:bg-amber-300">Mapa de mesas</a>
                  <a href="#tickets-individuales" data-link class="rounded-xl border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10">Tickets individuales</a>
                </div>
              </div>
            </section>

            <section id="tickets-individuales" class="landing-reveal scroll-mt-24 border-t border-slate-200 bg-slate-50 px-4 py-14 sm:px-8">
              <div class="mx-auto max-w-5xl">
                <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                  <div class="max-w-xl">
                    <h2 class="text-2xl font-black text-slate-900 sm:text-3xl">Tickets individuales</h2>
                    <p class="mt-2 text-sm text-slate-500">
                      Compra rápida para tu día de diversión. El carrito se actualiza al instante.
                    </p>
                  </div>
                  <div class="flex w-fit gap-2 bg-white p-2 rounded-full shadow-inner">
                    <button type="button" class="rounded-full bg-teal-700 px-6 py-2 text-xs font-black text-white">
                      Entrada 1 día
                    </button>
                  </div>
                </div>

                <div id="landing-ticket-types" class="mt-10">
                  <p class="text-sm text-slate-500">Cargando tickets configurados...</p>
                </div>
              </div>
            </section>

            <section id="descripcion" class="landing-reveal scroll-mt-24 border-b border-slate-200 bg-white px-4 py-14 sm:px-8">
              <div class="mx-auto max-w-5xl">
                <h2 class="text-2xl font-black text-slate-900 sm:text-3xl">Sobre nuestro parque</h2>
                <div id="landing-descripcion" class="prose prose-slate mt-6 max-w-none whitespace-pre-wrap text-slate-600"></div>
              </div>
            </section>

            <section id="servicios" class="landing-reveal scroll-mt-24 bg-slate-50 px-4 py-14 sm:px-8">
              <div class="mx-auto max-w-[1280px]">
                <div class="landing-services-head">
                  <div class="landing-services-copy">
                    <p class="landing-services-kicker">Servicios premium</p>
                    <h2 class="landing-services-title">Servicios Adicionales</h2>
                    <p class="landing-services-subtitle">
                      Mejora tu experiencia agregando estos servicios a tu visita. Selecciona los extras que necesites para complementar tu estancia.
                    </p>
                  </div>
                  <div id="landing-servicios-controls" class="landing-services-controls" aria-hidden="true">
                    <button type="button" id="landing-servicios-prev" class="landing-services-arrow" aria-label="Servicio anterior">
                      ${icon('chevronDown', 'h-5 w-5 -rotate-90')}
                    </button>
                    <button type="button" id="landing-servicios-next" class="landing-services-arrow landing-services-arrow--primary" aria-label="Servicio siguiente">
                      ${icon('chevronDown', 'h-5 w-5 rotate-90')}
                    </button>
                  </div>
                </div>
                <div id="landing-servicios" class="landing-services-track" aria-live="polite">
                  <p class="text-sm text-slate-500">Cargando servicios...</p>
                </div>
                <div class="landing-services-progress" aria-hidden="true">
                  <div id="landing-servicios-progress-bar" class="landing-services-progress-bar"></div>
                </div>
              </div>
            </section>

            <section id="estado" class="landing-reveal scroll-mt-24 border-y border-slate-200 bg-white px-4 py-14 sm:px-8">
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

            <section id="mapa" class="landing-reveal scroll-mt-24 bg-slate-50 px-4 py-16 sm:px-8">
              <div class="mx-auto max-w-5xl">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p class="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-cyan-700">${icon('map', 'h-4 w-4')} Plano interactivo</p>
                    <h2 class="text-2xl font-black text-slate-900 sm:text-3xl">Distribucion del parque</h2>
                    <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Explora zonas, albercas, palapas, servicios, accesos y referencias de mesas. Arrastra el plano, usa zoom y toca una zona para ver detalles.</p>
                  </div>
                  <div class="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                    <p class="${access.can('dashboard.manage') || access.can('admin.panel') || access.isProgramador ? 'inline-flex' : 'hidden'} w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700">
                      ${icon('settings', 'h-4 w-4')} Editable desde panel
                    </p>
                    <p id="landing-mapa-edit-wrap" class="hidden">
                      <a href="/admin/dashboard?section=sitio&mapfocus=1" data-link class="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-4 py-2 text-sm font-black text-white shadow-md transition hover:bg-cyan-500">
                        ${icon('map', 'h-4 w-4')} Editar plano del parque
                      </a>
                    </p>
                  </div>
                </div>
                <div class="public-map-card relative mt-8 ring-1 ring-cyan-100/70 shadow-[0_20px_45px_-28px_rgba(14,116,144,0.35)]">
                  <div class="flex flex-col gap-3 border-b border-slate-100 bg-white/92 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p class="text-sm font-black text-slate-900">Mapa del parque</p>
                      <p class="mt-0.5 text-xs font-semibold text-slate-500">Arrastra para explorar · rueda o pellizca para acercar · clic en una zona para ver detalle</p>
                    </div>
                    <div class="flex flex-wrap gap-2">${renderMapLegend()}</div>
                  </div>
                  <div id="landing-map-filters" class="public-map-filters flex flex-wrap gap-2 border-b border-slate-100 bg-white/95 px-4 py-2"></div>
                  <div class="public-map-stage relative h-[420px] overflow-hidden sm:h-[540px]">
                    <div id="landing-aqua-map-root" class="absolute inset-0"></div>
                    <div id="landing-map-tooltip" class="map-tooltip hidden"></div>
                    <div class="absolute left-3 top-3 z-10 hidden rounded-full border border-white/25 bg-slate-950/70 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-lg backdrop-blur sm:block">
                      ${icon('map', 'h-3.5 w-3.5 inline-block')} Arrastra para explorar
                    </div>
                    <div class="map-floating-toolbar absolute bottom-3 right-3 top-auto z-10 sm:bottom-auto sm:right-3 sm:top-3">
                      <button type="button" id="landing-map-zoom-out" class="map-icon-btn" title="Alejar" aria-label="Alejar mapa">−</button>
                      <button type="button" id="landing-map-center" class="map-reset-btn" title="Centrar mapa" aria-label="Centrar mapa">${icon('compass', 'h-3.5 w-3.5')}</button>
                      <button type="button" id="landing-map-reset" class="map-reset-btn" title="Resetear zoom y posición" aria-label="Resetear zoom y posición">Reset</button>
                      <button type="button" id="landing-map-zoom-in" class="map-icon-btn" title="Acercar" aria-label="Acercar mapa">+</button>
                    </div>
                    <div id="landing-map-sheet" class="public-map-sheet" aria-hidden="true">
                      <button type="button" id="landing-map-sheet-backdrop" class="public-map-sheet__backdrop" aria-label="Cerrar panel del mapa"></button>
                      <div class="public-map-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="landing-map-sheet-title">
                        <div class="public-map-sheet__handle" aria-hidden="true"></div>
                        <div id="landing-map-sheet-body" class="public-map-sheet__body"></div>
                      </div>
                    </div>
                  </div>
                  <div id="landing-map-info" class="public-map-info">
                    <div>
                      <p class="text-xs font-black uppercase tracking-wide text-cyan-700">Sin zona seleccionada</p>
                      <p class="mt-1 text-sm font-semibold text-slate-600">Haz clic en una zona del mapa para ver su descripcion publica.</p>
                    </div>
                  </div>
                  <div id="landing-map-info-mobile" class="hidden" aria-hidden="true"></div>
                </div>
              </div>
            </section>

            <section id="vista-aerea" class="landing-reveal scroll-mt-24 bg-white px-4 py-14 sm:px-8">
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

            <section id="paquetes" class="landing-reveal scroll-mt-24 border-t border-slate-200 bg-slate-50 px-4 py-14 sm:px-8">
              <div class="mx-auto max-w-5xl">
                <h2 class="text-2xl font-black text-slate-900 sm:text-3xl">Paquetes disponibles</h2>
                <div id="landing-paquetes" class="mt-8 min-h-24 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
                  <p class="text-sm text-gray-500">Cargando paquetes...</p>
                </div>
              </div>
            </section>

            <section id="productos" class="landing-reveal scroll-mt-24 border-t border-slate-200 bg-white px-4 py-14 sm:px-8">
              <div class="mx-auto max-w-[1280px]">
                <p class="landing-products-kicker">Catálogo</p>
                <h2 class="landing-products-title">Productos</h2>
                <p class="landing-products-subtitle">Explora productos disponibles para complementar tu visita.</p>
                <div id="landing-productos" class="mt-6 min-h-24">
                  <p class="text-sm text-slate-500">Cargando productos...</p>
                </div>
              </div>
            </section>

            <section id="estacionamiento" class="landing-reveal scroll-mt-24 border-t border-slate-200 bg-slate-50 px-4 py-14 sm:px-8">
              <div class="mx-auto max-w-5xl">
                <h2 class="text-2xl font-black text-slate-900 sm:text-3xl">Estacionamiento en tiempo real</h2>
                <p class="mt-2 text-sm text-slate-500">Visualiza spots libres, reservados y ocupados.</p>
                <div class="public-parking-card mt-5">
                  <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div class="text-sm font-bold text-slate-700" id="parking-summary">Cargando spots...</div>
                    <span class="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-700">Solo lectura</span>
                  </div>
                  <div class="mb-2 flex flex-wrap gap-2">${renderParkingLegend()}</div>
                  <div class="public-parking-map relative h-[380px] overflow-hidden sm:h-[420px]">
                    <canvas id="landing-parking-canvas" width="800" height="440" class="absolute inset-0 h-full w-full cursor-grab"></canvas>
                    <div class="map-floating-toolbar map-floating-toolbar--parking absolute bottom-3 right-3 top-auto z-10 sm:bottom-auto sm:right-3 sm:top-3">
                      <button type="button" id="landing-parking-zoom-out" class="map-icon-btn" title="Alejar" aria-label="Alejar mapa">−</button>
                      <button type="button" id="landing-parking-center" class="map-reset-btn" title="Centrar mapa" aria-label="Centrar mapa">${icon('compass', 'h-3.5 w-3.5')}</button>
                      <button type="button" id="landing-parking-reset" class="map-reset-btn" title="Resetear zoom" aria-label="Resetear zoom">Reset</button>
                      <button type="button" id="landing-parking-zoom-in" class="map-icon-btn" title="Acercar" aria-label="Acercar mapa">+</button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="contacto" class="landing-reveal scroll-mt-24 bg-white px-4 py-14 sm:px-8">
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
        mapaMesasJson: row.mapaMesasJson || row.mapaDistribucionJson || d.mapaMesasJson,
        mapaEstacionamientoJson: row.mapaEstacionamientoJson || row.mapaDistribucionJson || d.mapaEstacionamientoJson,
        imagenSatelitalUrl: row.imagenSatelitalUrl ?? '',
        googleMapsUrl: row.googleMapsUrl ?? '',
        googleMapsAddress: row.googleMapsAddress ?? '',
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
      console.warn('Landing page no disponible aun (Supabase: tabla landing_pages / RLS y fila main):', e);
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

    const mapStageRoot = document.getElementById('landing-aqua-map-root');
    let globalMapViewer = null;
    const mapInfo = document.getElementById('landing-map-info');
    const mapInfoMobile = document.getElementById('landing-map-info-mobile');
    const mapTooltip = document.getElementById('landing-map-tooltip');
    const mapFiltersEl = document.getElementById('landing-map-filters');
    const mapSheet = document.getElementById('landing-map-sheet');
    const mapSheetBody = document.getElementById('landing-map-sheet-body');
    const mapSheetBackdrop = document.getElementById('landing-map-sheet-backdrop');
    let publicMapFilter = 'all';

    const closeMapSheet = () => {
      mapSheet?.classList.remove('public-map-sheet--open');
      mapSheet?.setAttribute('aria-hidden', 'true');
    };

    const openMapSheetIfMobile = () => {
      if (window.matchMedia('(max-width: 640px)').matches) {
        mapSheet?.classList.add('public-map-sheet--open');
        mapSheet?.setAttribute('aria-hidden', 'false');
      } else {
        closeMapSheet();
      }
    };

    mapSheetBackdrop?.addEventListener('click', closeMapSheet);

    const setMapInfo = (item) => {
      const emptyHtml = `
        <div>
          <p class="text-xs font-black uppercase tracking-wide text-cyan-700">Sin zona seleccionada</p>
          <p class="mt-1 text-sm font-semibold text-slate-600">Haz clic en una zona del mapa para ver su descripcion publica.</p>
        </div>
      `;
      if (!item) {
        if (mapInfo) mapInfo.innerHTML = emptyHtml;
        if (mapInfoMobile) mapInfoMobile.innerHTML = emptyHtml;
        if (mapSheetBody) mapSheetBody.innerHTML = emptyHtml;
        closeMapSheet();
        return;
      }
      const publicDetail =
        item.metadata?.description ||
        item.notes ||
        item.metadata?.category ||
        '';
      const typeLabel = getPublicKindLabel(item.kind);
      const title = String(item.metadata?.publicName || item.label || typeLabel || 'Zona').trim();
      const cta =
        item.kind === 'mesa'
          ? '<a href="/reservar" data-link class="public-map-cta">Ver mesas</a>'
          : '';
      const html = `
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-xs font-black uppercase tracking-wide text-cyan-700">${escapeHtml(typeLabel)}</p>
            <h3 class="mt-0.5 text-base font-black text-slate-900">${escapeHtml(title)}</h3>
            <p class="mt-1 text-sm font-semibold leading-6 text-slate-600">${escapeHtml(publicDetail || 'Espacio publicado por el personal del parque.')}</p>
          </div>
          ${cta}
        </div>
      `;
      if (mapInfo) mapInfo.innerHTML = html;
      if (mapInfoMobile) mapInfoMobile.innerHTML = '';
      if (mapSheetBody) mapSheetBody.innerHTML = html;
      openMapSheetIfMobile();
    };
    const mapHitSurface = () => globalMapViewer?.getViewportElement?.() || mapStageRoot;

    const setMapTooltip = (item, _index, _point, pointer) => {
      if (!mapTooltip) return;
      if (!item || !pointer || window.matchMedia('(max-width: 640px)').matches) {
        mapTooltip.classList.add('hidden');
        return;
      }
      const rect = mapHitSurface()?.getBoundingClientRect();
      if (!rect) return;
      const tipTitle = String(item.metadata?.publicName || item.label || getPublicKindLabel(item.kind) || 'Zona').trim();
      mapTooltip.innerHTML = `
        <strong>${escapeHtml(tipTitle)}</strong>
        <span>${escapeHtml(getPublicKindLabel(item.kind))}</span>
      `;
      mapTooltip.style.left = `${Math.min(rect.width - 190, Math.max(10, pointer.clientX - rect.left + 14))}px`;
      mapTooltip.style.top = `${Math.min(rect.height - 74, Math.max(10, pointer.clientY - rect.top + 14))}px`;
      mapTooltip.classList.remove('hidden');
    };
    if (mapStageRoot) {
      const useAquaPublic = isAquamapSiteJson(landing.mapaDistribucionJson);
      let aquaElementCount = 0;
      if (useAquaPublic) {
        try {
          const o = JSON.parse(landing.mapaDistribucionJson || '{}');
          aquaElementCount = Array.isArray(o.elements) ? o.elements.length : 0;
        } catch {
          aquaElementCount = 0;
        }
      }
      const parsedPublicMap = parseDistribucionJson(landing.mapaDistribucionJson);
      if (useAquaPublic ? aquaElementCount === 0 : !parsedPublicMap.items.length) {
        mapStageRoot.classList.add('hidden');
        setMapInfo(null);
        const stage = mapStageRoot.closest('.public-map-stage');
        stage?.insertAdjacentHTML(
          'beforeend',
          `<div class="absolute inset-3 grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white/90 p-6 text-center">
            <div>
              <p class="text-sm font-black text-slate-800">Mapa en preparación</p>
              <p class="mt-2 text-xs font-semibold text-slate-500">El equipo puede publicar zonas desde el panel de sitio.</p>
            </div>
          </div>`
        );
      } else if (useAquaPublic) {
        globalMapViewer = mountAquamapLandingMap(mapStageRoot, landing.mapaDistribucionJson, {
          onSelectElement: (el) => {
            setMapInfo(el ? pseudoItemFromAquamapElement(el) : null);
          }
        });
        if (mapFiltersEl) mapFiltersEl.innerHTML = '';
      } else {
        globalMapViewer = mountPublicParkMap(mapStageRoot, landing.mapaDistribucionJson, {
          view: 'global',
          camera: 'client',
          publicMapFilter: 'all',
          onHover: setMapTooltip,
          onSelect: (item) => {
            setMapInfo(item);
            if (!globalMapViewer) return;
            const pts = item ? computeRouteToMapItem(globalMapViewer.getDocument(), item) : [];
            globalMapViewer.setDrawOptions({
              navigationPath: pts.length >= 2 ? pts : []
            });
          }
        });
        const renderMapFilterChips = () => {
          if (!mapFiltersEl || !globalMapViewer) return;
          const chips = buildPublicMapFilterChips(globalMapViewer.getDocument());
          if (chips.length <= 1) {
            mapFiltersEl.innerHTML = '';
            return;
          }
          mapFiltersEl.innerHTML = chips
            .map(
              (c) => `
            <button type="button" data-map-filter="${escapeHtml(c.id)}" class="public-map-filter-chip ${
                c.id === publicMapFilter ? 'is-active' : ''
              }">${escapeHtml(c.label)}</button>`
            )
            .join('');
          mapFiltersEl.querySelectorAll('[data-map-filter]').forEach((btn) => {
            btn.addEventListener('click', () => {
              publicMapFilter = btn.getAttribute('data-map-filter') || 'all';
              globalMapViewer.setDrawOptions({ publicMapFilter });
              renderMapFilterChips();
            });
          });
        };
        renderMapFilterChips();
      }
      document.getElementById('landing-map-zoom-in')?.addEventListener('click', () => globalMapViewer?.zoomIn());
      document.getElementById('landing-map-zoom-out')?.addEventListener('click', () => globalMapViewer?.zoomOut());
      document.getElementById('landing-map-reset')?.addEventListener('click', () => globalMapViewer?.reset());
      document.getElementById('landing-map-center')?.addEventListener('click', () => globalMapViewer?.fit());
    }

    const parkingMapCanvas = document.getElementById('landing-parking-canvas');
    let landingParkingViewer = null;
    const parkingViewerOptions = {
      view: 'estacionamiento',
      showItemIds: false,
      showKindBadge: false,
      viewerUi: true,
      viewerSelectionStyle: 'simple',
      parkingById: {},
      fitPaddingScale: 0.9
    };

    const mapEditWrap = document.getElementById('landing-mapa-edit-wrap');
    if (mapEditWrap && getCurrentUser()) {
      try {
        const access = await getUserAccess(getCurrentUser());
        const canEditPlano =
          access.can('dashboard.manage') &&
          (access.can('landing.manage') || access.can('admin.panel') || access.isProgramador);
        if (canEditPlano) mapEditWrap.classList.remove('hidden');
      } catch {
        /* noop */
      }
    }

    const satWrap = document.getElementById('landing-satelite-wrap');
    const satImg = document.getElementById('landing-satelite-img');
    const ph = document.getElementById('landing-satelite-placeholder');
    const mapsWrap = document.getElementById('landing-maps-link-wrap');
    const mapsLink = document.getElementById('landing-maps-link');
    const mapsEmbedWrap = document.getElementById('landing-maps-embed-wrap');
    const mapsIframe = document.getElementById('landing-maps-iframe');
    const urlSat = (landing.imagenSatelitalUrl || '').trim();
    const urlMaps = (landing.googleMapsUrl || '').trim();
    const addressMaps = (landing.googleMapsAddress || '').trim();
    const embedSrc = googleMapsEmbedUrl({ url: urlMaps, address: addressMaps });
    const openMaps = googleMapsOpenUrl({ url: urlMaps, address: addressMaps });
    if (embedSrc && mapsIframe && mapsEmbedWrap) {
      mapsIframe.src = embedSrc;
      mapsEmbedWrap.classList.remove('hidden');
      ph?.classList.add('hidden');
    }
    if (urlSat && satImg && satWrap) {
      satImg.src = urlSat;
      satWrap.classList.remove('hidden');
      ph?.classList.add('hidden');
    }
    if (openMaps && mapsLink && mapsWrap) {
      mapsLink.href = openMaps;
      mapsWrap.classList.remove('hidden');
      ph?.classList.add('hidden');
    }

    const { hero: heroFromLanding } = splitBotonesJson(landing.botonesJson);
    const hk = document.getElementById('landing-hero-kicker');
    const ht = document.getElementById('landing-hero-title');
    const hs = document.getElementById('landing-hero-subtitle');
    if (hk) hk.textContent = heroFromLanding.kicker;
    if (ht) ht.textContent = heroFromLanding.title;
    if (hs) hs.textContent = heroFromLanding.subtitle;

    const botWrap = document.getElementById('landing-botones');
    if (botWrap) botWrap.innerHTML = renderBotones(filterPublicBotones(parseBotones(landing.botonesJson)));

    const serviciosEl = document.getElementById('landing-servicios');
    const serviciosPrevBtn = document.getElementById('landing-servicios-prev');
    const serviciosNextBtn = document.getElementById('landing-servicios-next');
    const serviciosControls = document.getElementById('landing-servicios-controls');
    const serviciosProgressBar = document.getElementById('landing-servicios-progress-bar');
    if (serviciosEl) {
      try {
        const sres = await listServiciosLanding();
        const servicios = sres.data?.servicios || [];
        if (!servicios.length) {
          serviciosEl.innerHTML =
            '<article class="landing-services-empty"><p class="landing-services-empty-title">Todavía no hay servicios adicionales disponibles.</p><p class="landing-services-empty-sub">Vuelve pronto para descubrir nuevos extras para tu visita.</p></article>';
          if (serviciosControls) serviciosControls.classList.add('is-hidden');
          if (serviciosProgressBar) serviciosProgressBar.style.width = '0%';
        } else {
          serviciosEl.innerHTML = servicios
            .map(
              (s) => `
            <article class="landing-service-card">
              <div class="landing-service-media-wrap">
                ${
                  s.imagenUrl
                    ? `<img src="${escapeHtml(s.imagenUrl)}" alt="${escapeHtml(s.titulo)}" class="landing-service-media" loading="lazy" />`
                    : `<img src="${heroImageUrl}" alt="${escapeHtml(s.titulo)}" class="landing-service-media" loading="lazy" />`
                }
              </div>
              <div class="landing-service-body">
                <div class="landing-service-title-row">
                  <h3 class="landing-service-title">${escapeHtml(s.titulo)}</h3>
                  ${
                    Number(s.precio || 0) > 0
                      ? `<span class="landing-service-price">${currencyFormatter.format(s.precio)}</span>`
                      : ''
                  }
                </div>
                <p class="landing-service-desc">${escapeHtml(s.descripcion || '')}</p>
                <button type="button" class="btn-add-servicio landing-service-add"
                  data-servicio-id="${escapeHtml(s.id)}"
                  data-servicio-name="${escapeHtml(s.titulo)}"
                  data-servicio-price="${Number(s.precio || 0)}">
                  ${icon('shoppingCart', 'h-4 w-4')} Agregar al carrito
                </button>
              </div>
            </article>`
            )
            .join('');
          const updateServicesProgress = () => {
            if (!serviciosProgressBar) return;
            const maxScroll = Math.max(1, serviciosEl.scrollWidth - serviciosEl.clientWidth);
            const pct = Math.min(100, Math.max(0, (serviciosEl.scrollLeft / maxScroll) * 100));
            serviciosProgressBar.style.width = `${Math.max(10, pct)}%`;
          };
          const scrollByCard = (direction = 1) => {
            const card = serviciosEl.querySelector('.landing-service-card');
            const step = card ? card.getBoundingClientRect().width + 24 : serviciosEl.clientWidth * 0.9;
            serviciosEl.scrollBy({ left: direction * step, behavior: 'smooth' });
          };
          if (servicios.length <= 1 && serviciosControls) {
            serviciosControls.classList.add('is-hidden');
          } else {
            if (serviciosControls) serviciosControls.classList.remove('is-hidden');
            serviciosPrevBtn?.addEventListener('click', () => scrollByCard(-1));
            serviciosNextBtn?.addEventListener('click', () => scrollByCard(1));
          }
          serviciosEl.addEventListener('scroll', updateServicesProgress, { passive: true });
          requestAnimationFrame(updateServicesProgress);
        }
      } catch (e) {
        console.error(e);
        serviciosEl.innerHTML =
          '<p class="text-sm text-rose-600">No se pudieron cargar los servicios.</p>';
        if (serviciosControls) serviciosControls.classList.add('is-hidden');
      }
    }

    const paquetesContainer = document.getElementById('landing-paquetes');
    if (paquetesContainer) {
      try {
        const response = await listPaquetes();
        const paquetes = response.data?.paquetes || [];
        // Evitar outerHTML: en SPA a veces el nodo puede perder parent node
        // mientras el fetch está en vuelo, lo cual rompe el render de toda la landing.
        if (paquetesContainer.isConnected) {
          paquetesContainer.innerHTML = renderPaquetes(paquetes);
        } else {
          // Si ya no está en DOM, simplemente salimos para no romper el resto.
          return;
        }
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
            '<p class="text-sm text-slate-600">Los productos del catalogo dependen de Postgres (Supabase). Revisa RLS y datos en la tabla <code class="text-xs">productos</code>.</p>';
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
        if (btn.disabled) return;
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

    document.querySelectorAll('.btn-add-servicio').forEach((btn) => {
      btn.addEventListener('click', async () => {
        addToCart({
          key: `servicio:${btn.dataset.servicioId}`,
          type: 'servicio',
          id: btn.dataset.servicioId,
          name: btn.dataset.servicioName,
          price: Number(btn.dataset.servicioPrice || 0),
          qty: 1
        });
        await showAlert('Servicio agregado al carrito.', { title: 'Carrito', variant: 'success' });
      });
    });

    const bindTicketButtons = () => document.querySelectorAll('.btn-add-ticket-individual').forEach((btn) => {
      btn.addEventListener('click', async () => {
        addToCart({
          key: btn.dataset.ticketKey,
          type: 'ticket',
          id: btn.dataset.ticketId,
          name: btn.dataset.ticketName,
          price: Number(btn.dataset.ticketPrice || 0),
          qty: 1
        });
        await showAlert('Ticket agregado al carrito.', { title: 'Carrito', variant: 'success' });
      });
    });

    const ticketTypesWrap = document.getElementById('landing-ticket-types');
    if (ticketTypesWrap) {
      try {
        const res = await listTicketTypesPublic();
        const ticketTypes = res.data?.ticketTypes || [];
        ticketTypesWrap.innerHTML = renderTicketTypes(ticketTypes);
      } catch (e) {
        console.error('Ticket types landing:', e);
        ticketTypesWrap.innerHTML = '<p class="text-sm text-rose-600">No se pudieron cargar los tickets configurados.</p>';
      }
    }
    bindTicketButtons();

    const parkingSummary = document.getElementById('parking-summary');
    if (parkingMapCanvas && parkingSummary) {
      const parkingJson = landing.mapaEstacionamientoJson || landing.mapaDistribucionJson || DEFAULT_MAPA_JSON;
      const syncParkingIndex = (spots) => {
        const next = {};
        spots.forEach((s) => {
          if (s?.id) next[s.id] = s;
        });
        parkingViewerOptions.parkingById = next;
        landingParkingViewer?.redraw();
      };
      landingParkingViewer = createMapViewer(parkingMapCanvas, parkingJson, parkingViewerOptions);
      document.getElementById('landing-parking-zoom-in')?.addEventListener('click', () => landingParkingViewer?.zoomIn());
      document.getElementById('landing-parking-zoom-out')?.addEventListener('click', () => landingParkingViewer?.zoomOut());
      document.getElementById('landing-parking-reset')?.addEventListener('click', () => landingParkingViewer?.reset());
      document.getElementById('landing-parking-center')?.addEventListener('click', () => landingParkingViewer?.fit());
      subscribeParkingSpots(
        (spots) => {
          const libres = spots.filter((s) => s.estado === 'libre').length;
          const reservados = spots.filter((s) => s.estado === 'reservado').length;
          const ocupados = spots.filter((s) => s.estado === 'ocupado').length;
          const mantenimiento = spots.filter((s) => s.estado === 'mantenimiento' || s.estado === 'taller' || s.estado === 'sucio').length;
          parkingSummary.textContent = `Totales: ${spots.length} · Libres: ${libres} · Reservados: ${reservados} · Ocupados: ${ocupados} · Mantenimiento: ${mantenimiento}`;
          syncParkingIndex(spots);
        },
        (error) => {
          if (error?.code === 'permission-denied') {
            parkingSummary.textContent = 'Estacionamiento: sin permisos de lectura (revisa RLS de parking_spots).';
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
        const bubble = link.querySelector('span');
        if (bubble) {
          bubble.classList.toggle('bg-cyan-100', active);
          bubble.classList.toggle('text-cyan-700', active);
        }
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

    const revealObserver =
      'IntersectionObserver' in window
        ? new IntersectionObserver(
            (entries, obs) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  entry.target.classList.add('landing-reveal--visible');
                  obs.unobserve(entry.target);
                }
              });
            },
            { rootMargin: '0px 0px -6% 0px', threshold: 0.06 }
          )
        : null;
    document.querySelectorAll('.landing-reveal').forEach((el) => {
      if (revealObserver) revealObserver.observe(el);
      else el.classList.add('landing-reveal--visible');
    });
  }
};
