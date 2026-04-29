import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase-config.js';
import { getUserAccess } from './accessControl.js';
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
          <div class="relative">
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
  drawer.className = 'fixed inset-0 z-[120] hidden';
  drawer.innerHTML = `
    <div class="absolute inset-0 bg-slate-900/45" data-app-cart-overlay></div>
    <aside class="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col">
      <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h3 class="text-lg font-black text-slate-900">Tu carrito</h3>
        <button type="button" data-app-cart-close class="rounded border border-slate-300 px-3 py-1 text-sm font-semibold hover:bg-slate-50">Cerrar</button>
      </div>
      <div id="app-cart-items" class="flex-1 overflow-y-auto p-4"></div>
      <div class="border-t border-slate-200 p-4">
        <div class="mb-3 flex items-center justify-between text-sm">
          <span class="text-slate-500">Subtotal</span>
          <strong id="app-cart-subtotal" class="text-slate-900">$0.00 MXN</strong>
        </div>
        <button type="button" data-app-cart-checkout class="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700">
          Completar compra
        </button>
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
  const items = listCartItems();
  if (!items.length) {
    itemsWrap.innerHTML = '<p class="text-sm text-slate-500">Tu carrito está vacío.</p>';
    subtotalEl.textContent = '$0.00 MXN';
    return;
  }
  itemsWrap.innerHTML = items
    .map((item) => `
      <article class="mb-3 rounded-xl border border-slate-200 p-3">
        <p class="font-semibold text-slate-900">${escapeHtml(item.name)}</p>
        <p class="text-xs text-slate-500">${escapeHtml(item.type)} · $${Number(item.price || 0).toFixed(2)} MXN</p>
        <div class="mt-2 flex items-center gap-2">
          <button type="button" data-app-cart-minus="${escapeHtml(item.key)}" class="rounded border px-2">-</button>
          <span class="w-6 text-center font-bold">${Number(item.qty || 1)}</span>
          <button type="button" data-app-cart-plus="${escapeHtml(item.key)}" class="rounded border px-2">+</button>
          <button type="button" data-app-cart-remove="${escapeHtml(item.key)}" class="ml-auto rounded border border-rose-200 px-2 text-rose-700">Quitar</button>
        </div>
      </article>
    `)
    .join('');
  subtotalEl.textContent = `$${cartSubtotal().toFixed(2)} MXN`;
}

function openCartDrawer() {
  const drawer = ensureCartDrawer();
  cartOpen = true;
  renderCartDrawer();
  drawer.classList.remove('hidden');
}

function closeCartDrawer() {
  const drawer = ensureCartDrawer();
  cartOpen = false;
  drawer.classList.add('hidden');
}

function closeUserMenu() {
  const menu = document.getElementById('app-user-menu');
  const toggle = document.querySelector('[data-app-user-menu-toggle]');
  menu?.classList.add('hidden');
  toggle?.setAttribute('aria-expanded', 'false');
}

export async function updateAppShell(path = window.location.pathname) {
  lastPath = path;
  const header = document.getElementById('app-header');
  if (!header) return;

  const token = ++renderToken;
  const [access, theme] = await Promise.all([
    getUserAccess(auth.currentUser),
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

    const menuToggle = event.target.closest('[data-app-user-menu-toggle]');
    if (menuToggle) {
      const menu = document.getElementById('app-user-menu');
      const isOpen = menu && !menu.classList.contains('hidden');
      menu?.classList.toggle('hidden', isOpen);
      menuToggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      return;
    }

    if (event.target.closest('[data-app-logout]')) {
      event.preventDefault();
      await signOut(auth);
      closeUserMenu();
      navigate('/login');
      return;
    }

    if (!event.target.closest('#app-user-menu')) {
      closeUserMenu();
    }
  });

  onAuthStateChanged(auth, () => {
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
