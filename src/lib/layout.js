import { onAuthChange, logout, getCurrentUser } from './authProvider.js';
import { getUserAccess } from './accessControl.js';
import { syncAuthProfileAfterSession } from './syncSupabaseAuthProfile.js';
import { icon } from './icons.js';
import { readThemeConfig, applyTheme } from './theme.js';
import { cartCount, cartSubtotal, listCartItems, removeFromCart, setCartQty } from './cart.js';

let navigate = (url) => {
  window.history.pushState(null, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
};
let lastPath = window.location.pathname;
let themeCache = null;
let renderToken = 0;
let cartOpen = false;
const CART_TAX_RATE = 0.089;

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function initials(name) {
  return String(name || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'U';
}

function navLink({ href, label, iconName, active = false }) {
  return `
    <a href="${href}" data-link class="app-nav-link ${active ? 'is-active' : ''}" title="${escapeHtml(label)}">
      ${icon(iconName, 'h-4 w-4')}
      <span>${escapeHtml(label)}</span>
    </a>
  `;
}

function userAvatar(access, sizeClass = 'h-9 w-9') {
  if (access.photoURL) {
    return `<img src="${escapeHtml(access.photoURL)}" alt="${escapeHtml(access.name)}" class="${sizeClass} rounded-full object-cover" referrerpolicy="no-referrer" />`;
  }
  return `<span class="${sizeClass} app-avatar-initials">${escapeHtml(initials(access.name))}</span>`;
}

function renderHeader(access, theme) {
  const isLogged = Boolean(access.user);
  const path = lastPath;
  const count = cartCount();
  const cartButton = `
    <button type="button" class="app-nav-link ${cartOpen ? 'is-active' : ''}" data-app-cart-toggle title="Carrito">
      ${icon('ticket', 'h-4 w-4')}
      <span>Carrito ${count > 0 ? `(${count})` : ''}</span>
    </button>
  `;
  const publicLinks = [
    navLink({ href: '/home', label: 'Inicio', iconName: 'home', active: path === '/home' }),
    cartButton,
    navLink({ href: '/login', label: 'Login', iconName: 'login', active: path === '/login' })
  ].join('');

  const loggedLinks = [
    navLink({ href: '/home', label: 'Inicio', iconName: 'home', active: path === '/home' }),
    cartButton,
    access.can('dashboard.manage')
      ? navLink({ href: '/admin/dashboard?section=tickets', label: 'Gestion', iconName: 'briefcase', active: path === '/admin/dashboard' })
      : '',
    access.can('dashboard.manage') &&
    (access.can('landing.manage') || access.can('admin.panel') || access.isProgramador)
      ? navLink({ href: '/admin/mapa', label: 'Editor mapa', iconName: 'map', active: false })
      : '',
    access.can('admin.panel')
      ? navLink({ href: '/admin/dashboard?section=admin', label: 'Panel administracion', iconName: 'dashboard', active: path === '/admin/dashboard' })
      : ''
  ].join('');

  return `
    <div class="app-promo-strip">
      <marquee behavior="scroll" direction="left" scrollamount="4">${escapeHtml(theme.promoText)}</marquee>
    </div>
    <nav class="app-topbar" aria-label="Navegacion principal">
      <a href="/home" data-link class="app-brand" aria-label="Balneario San Antonio Texas">
        <span class="app-brand-mark">${icon('waves', 'h-5 w-5')}</span>
        <span>Balneario SA</span>
      </a>
      <div class="app-header-actions">
        ${isLogged ? loggedLinks : publicLinks}
        ${isLogged ? `
          <div class="app-user-wrap relative z-[100]">
            <div id="app-user-menu-backdrop" class="app-user-menu-backdrop" hidden data-app-user-menu-backdrop></div>
            <button type="button" class="app-user-button" data-app-user-menu-toggle aria-expanded="false" aria-controls="app-user-menu">
              ${userAvatar(access)}
              <span>Usuario</span>
              ${icon('chevronDown', 'h-4 w-4')}
            </button>
            <div id="app-user-menu" class="app-user-menu hidden">
              <a href="/cliente/tickets" data-link class="app-user-menu-item">
                ${icon('settings', 'h-4 w-4')}
                <span>Mi panel</span>
              </a>
              <a href="/home#contacto" data-link class="app-user-menu-item">
                ${icon('info', 'h-4 w-4')}
                <span>Ayuda y contacto</span>
              </a>
              <button type="button" class="app-user-menu-item text-rose-700" data-app-logout>
                ${icon('logout', 'h-4 w-4')}
                <span>Cerrar sesion</span>
              </button>
              <div class="app-user-menu-footer">
                ${userAvatar(access, 'h-10 w-10')}
                <div class="min-w-0">
                  <p class="truncate font-bold text-slate-900">${escapeHtml(access.name)}</p>
                  <p class="truncate text-xs text-slate-500">${escapeHtml(access.roleLabel)}</p>
                </div>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    </nav>
  `;
}

function ensureCartDrawer() {
  let drawer = document.getElementById('app-cart-drawer');
  if (drawer) return drawer;
  drawer = document.createElement('div');
  drawer.id = 'app-cart-drawer';
  // No usamos `hidden` para que las transiciones se vean siempre.
  // El drawer se controla con opacity + transform y pointer-events.
  drawer.className = 'fixed inset-0 z-[120] pointer-events-none opacity-0 transition-opacity duration-300 ease-out';
  drawer.innerHTML = `
    <div class="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px] opacity-0 transition-opacity duration-300 ease-out" data-app-cart-overlay></div>
    <aside class="absolute inset-y-0 right-0 flex h-full w-full max-w-md flex-col rounded-l-3xl border-l border-cyan-100 bg-slate-50 shadow-[-20px_0px_40px_rgba(0,104,95,0.14)] translate-x-full opacity-0 transition-transform transition-opacity duration-300 ease-out will-change-transform">
      <div class="flex items-center justify-between border-b border-cyan-100/80 px-5 py-4">
        <h3 class="text-xl font-black text-teal-700">Tu carrito</h3>
        <button type="button" data-app-cart-close class="grid h-9 w-9 place-items-center rounded-full border border-slate-300 bg-white text-slate-500 transition hover:text-teal-700 hover:bg-slate-100" aria-label="Cerrar carrito">
          ${icon('x', 'h-4 w-4')}
        </button>
      </div>
      <div id="app-cart-items" class="flex-1 overflow-y-auto p-5"></div>
      <div class="rounded-bl-3xl border-t border-cyan-100 bg-white/90 p-5">
        <div class="mb-4 space-y-2 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-slate-500">Subtotal</span>
            <strong id="app-cart-subtotal" class="text-slate-900">$0.00 MXN</strong>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-500">Impuestos y cargos</span>
            <strong id="app-cart-fees" class="text-slate-700">$0.00 MXN</strong>
          </div>
          <div class="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
            <span class="text-base font-black text-slate-900">Total</span>
            <strong id="app-cart-total" class="text-2xl font-black text-teal-700">$0.00 MXN</strong>
          </div>
        </div>
        <button type="button" data-app-cart-checkout class="w-full rounded-full bg-blue-700 px-4 py-3 font-black text-white transition hover:bg-blue-600">
          Completar compra
        </button>
        <p class="mt-3 text-center text-xs font-semibold text-slate-500">Pago seguro y validación inmediata de tickets.</p>
      </div>
    </aside>
  `;
  document.body.appendChild(drawer);
  return drawer;
}

function renderCartDrawer() {
  const drawer = ensureCartDrawer();
  const itemsWrap = drawer.querySelector('#app-cart-items');
  const subtotalEl = drawer.querySelector('#app-cart-subtotal');
  const feesEl = drawer.querySelector('#app-cart-fees');
  const totalEl = drawer.querySelector('#app-cart-total');
  const items = listCartItems();
  const fmtMoney = (value) => `$${Number(value || 0).toFixed(2)} MXN`;
  const itemCover = (item) => {
    const img = item?.meta?.imageUrl || item?.meta?.imagenUrl || '';
    if (img) {
      return `<img src="${escapeHtml(img)}" alt="${escapeHtml(item.name)}" class="h-16 w-16 rounded-2xl object-cover" loading="lazy" />`;
    }
    const tint =
      item.type === 'paquete'
        ? 'from-amber-200 to-orange-100 text-amber-700'
        : item.type === 'producto'
          ? 'from-cyan-200 to-blue-100 text-cyan-700'
          : 'from-emerald-200 to-teal-100 text-emerald-700';
    return `<div class="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br ${tint}">${icon('ticket', 'h-7 w-7')}</div>`;
  };
  const subtotal = cartSubtotal();
  const fees = subtotal * CART_TAX_RATE;
  const total = subtotal + fees;
  if (!items.length) {
    itemsWrap.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <p class="text-sm font-semibold text-slate-500">Tu carrito está vacío.</p>
      </div>
    `;
    subtotalEl.textContent = fmtMoney(0);
    feesEl.textContent = fmtMoney(0);
    totalEl.textContent = fmtMoney(0);
    return;
  }
  itemsWrap.innerHTML = items
    .map((item) => `
      <article class="mb-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-cyan-100">
        <div class="flex gap-3">
          ${itemCover(item)}
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <p class="truncate font-black text-slate-900">${escapeHtml(item.name)}</p>
              <button type="button" data-app-cart-remove="${escapeHtml(item.key)}" class="rounded-full p-1 text-rose-600 transition hover:bg-rose-50" aria-label="Quitar item">
                ${icon('x', 'h-4 w-4')}
              </button>
            </div>
            <p class="mt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500">${escapeHtml(item.type)}</p>
            <div class="mt-3 flex items-center justify-between gap-3">
              <div class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2 py-1">
                <button type="button" data-app-cart-minus="${escapeHtml(item.key)}" class="grid h-6 w-6 place-items-center rounded-full text-slate-700 hover:bg-slate-200">-</button>
                <span class="w-5 text-center text-sm font-black">${Number(item.qty || 1)}</span>
                <button type="button" data-app-cart-plus="${escapeHtml(item.key)}" class="grid h-6 w-6 place-items-center rounded-full text-slate-700 hover:bg-slate-200">+</button>
              </div>
              <span class="text-lg font-black text-teal-700">${fmtMoney(Number(item.price || 0) * Number(item.qty || 0))}</span>
            </div>
          </div>
        </div>
      </article>
    `)
    .join('');
  subtotalEl.textContent = fmtMoney(subtotal);
  feesEl.textContent = fmtMoney(fees);
  totalEl.textContent = fmtMoney(total);
}

function openCartDrawer() {
  const drawer = ensureCartDrawer();
  cartOpen = true;
  renderCartDrawer();
  const overlay = drawer.querySelector('[data-app-cart-overlay]');
  const aside = drawer.querySelector('aside');
  drawer.classList.remove('pointer-events-none', 'opacity-0');
  drawer.classList.add('pointer-events-auto', 'opacity-100');
  overlay?.classList.remove('opacity-0');
  overlay?.classList.add('opacity-100');
  aside?.classList.remove('translate-x-full', 'opacity-0');
  aside?.classList.add('translate-x-0', 'opacity-100');
}

function closeCartDrawer() {
  const drawer = ensureCartDrawer();
  cartOpen = false;
  const overlay = drawer.querySelector('[data-app-cart-overlay]');
  const aside = drawer.querySelector('aside');
  drawer.classList.remove('pointer-events-auto', 'opacity-100');
  drawer.classList.add('pointer-events-none', 'opacity-0');
  overlay?.classList.remove('opacity-100');
  overlay?.classList.add('opacity-0');
  aside?.classList.remove('translate-x-0', 'opacity-100');
  aside?.classList.add('translate-x-full', 'opacity-0');
}

export function closeUserMenu() {
  const menu = document.getElementById('app-user-menu');
  const toggle = document.querySelector('[data-app-user-menu-toggle]');
  const backdrop = document.getElementById('app-user-menu-backdrop');
  menu?.classList.add('hidden');
  backdrop?.setAttribute('hidden', '');
  document.body.classList.remove('overflow-hidden');
  toggle?.setAttribute('aria-expanded', 'false');
}

export async function updateAppShell(path = window.location.pathname) {
  lastPath = path;
  const header = document.getElementById('app-header');
  if (!header) return;

  const token = ++renderToken;
  const [access, theme] = await Promise.all([
    getUserAccess(getCurrentUser()),
    themeCache ? Promise.resolve(themeCache) : readThemeConfig()
  ]);
  if (token !== renderToken) return;

  themeCache = applyTheme(theme);
  header.innerHTML = renderHeader(access, themeCache);
  renderCartDrawer();
}

export function refreshAppTheme(theme) {
  themeCache = applyTheme(theme);
  updateAppShell(lastPath);
}

export function initAppShell(options = {}) {
  navigate = options.navigateTo || navigate;
  ensureCartDrawer();
  renderCartDrawer();

  document.body.addEventListener('click', async (event) => {
    const cartToggle = event.target.closest('[data-app-cart-toggle]');
    if (cartToggle) {
      event.preventDefault();
      if (cartOpen) closeCartDrawer();
      else openCartDrawer();
      updateAppShell(lastPath);
      return;
    }
    if (event.target.closest('[data-app-cart-close]') || event.target.closest('[data-app-cart-overlay]')) {
      closeCartDrawer();
      updateAppShell(lastPath);
      return;
    }
    if (event.target.closest('[data-app-cart-checkout]')) {
      closeCartDrawer();
      navigate('/checkout');
      return;
    }
    const minus = event.target.closest('[data-app-cart-minus]');
    if (minus) {
      const key = minus.getAttribute('data-app-cart-minus');
      const item = listCartItems().find((x) => x.key === key);
      setCartQty(key, (item?.qty || 1) - 1);
      renderCartDrawer();
      updateAppShell(lastPath);
      return;
    }
    const plus = event.target.closest('[data-app-cart-plus]');
    if (plus) {
      const key = plus.getAttribute('data-app-cart-plus');
      const item = listCartItems().find((x) => x.key === key);
      setCartQty(key, (item?.qty || 1) + 1);
      renderCartDrawer();
      updateAppShell(lastPath);
      return;
    }
    const remove = event.target.closest('[data-app-cart-remove]');
    if (remove) {
      const key = remove.getAttribute('data-app-cart-remove');
      removeFromCart(key);
      renderCartDrawer();
      updateAppShell(lastPath);
      return;
    }

    if (event.target.closest('[data-app-user-menu-backdrop]')) {
      closeUserMenu();
      return;
    }

    const menuToggle = event.target.closest('[data-app-user-menu-toggle]');
    if (menuToggle) {
      event.preventDefault();
      const menu = document.getElementById('app-user-menu');
      const backdrop = document.getElementById('app-user-menu-backdrop');
      const isOpen = menu && !menu.classList.contains('hidden');
      menu?.classList.toggle('hidden', isOpen);
      const nowOpen = Boolean(menu && !menu.classList.contains('hidden'));
      const isMobile = window.matchMedia('(max-width: 640px)').matches;
      if (backdrop) {
        if (nowOpen && isMobile) backdrop.removeAttribute('hidden');
        else backdrop.setAttribute('hidden', '');
      }
      if (nowOpen && isMobile) document.body.classList.add('overflow-hidden');
      else document.body.classList.remove('overflow-hidden');
      menuToggle.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
      return;
    }

    if (event.target.closest('[data-app-logout]')) {
      event.preventDefault();
      try {
        await logout();
      } catch (e) {
        console.error(e);
      }
      closeUserMenu();
      navigate('/login');
      return;
    }

    if (!event.target.closest('#app-user-menu')) {
      closeUserMenu();
    }
  });

  onAuthChange(async (user) => {
    if (user) await syncAuthProfileAfterSession(user);
    updateAppShell(lastPath);
  });

  window.addEventListener('storage', (event) => {
    if (event.key === 'balneario_cart_v1') {
      renderCartDrawer();
      updateAppShell(lastPath);
    }
  });
  window.addEventListener('cart:changed', () => {
    renderCartDrawer();
    updateAppShell(lastPath);
  });

  updateAppShell(lastPath);
}
