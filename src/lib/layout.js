import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase-config.js';
import { getUserAccess } from './accessControl.js';
import { icon } from './icons.js';
import { readThemeConfig, applyTheme } from './theme.js';
import { cartCount } from './cart.js';

let navigate = (url) => {
  window.history.pushState(null, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
};
let lastPath = window.location.pathname;
let themeCache = null;
let renderToken = 0;

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
  const publicLinks = [
    navLink({ href: '/home', label: 'Inicio', iconName: 'home', active: path === '/home' }),
    `<a href="/checkout" data-link class="app-nav-link ${path === '/checkout' ? 'is-active' : ''}" title="Carrito">
      ${icon('ticket', 'h-4 w-4')}
      <span>Carrito ${count > 0 ? `(${count})` : ''}</span>
    </a>`,
    navLink({ href: '/login', label: 'Login', iconName: 'login', active: path === '/login' })
  ].join('');

  const loggedLinks = [
    navLink({ href: '/home', label: 'Inicio', iconName: 'home', active: path === '/home' }),
    `<a href="/checkout" data-link class="app-nav-link ${path === '/checkout' ? 'is-active' : ''}" title="Carrito">
      ${icon('ticket', 'h-4 w-4')}
      <span>Carrito ${count > 0 ? `(${count})` : ''}</span>
    </a>`,
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
}

export function refreshAppTheme(theme) {
  themeCache = applyTheme(theme);
  updateAppShell(lastPath);
}

export function initAppShell(options = {}) {
  navigate = options.navigateTo || navigate;

  document.body.addEventListener('click', async (event) => {
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
    if (event.key === 'balneario_cart_v1') updateAppShell(lastPath);
  });
  window.addEventListener('cart:changed', () => {
    updateAppShell(lastPath);
  });

  updateAppShell(lastPath);
}
