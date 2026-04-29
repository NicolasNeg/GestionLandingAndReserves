import { getAuthActionParams } from './lib/authUrlParams.js';
import Landing from './views/Landing.js';
import Login from './views/Login.js';
import Reservar from './views/Reservar.js';
import Checkout from './views/Checkout.js';
import ClienteDashboard from './views/ClienteDashboard.js';
import AdminDashboard from './views/AdminDashboard.js';
import Escaner from './views/Escaner.js';
import Politicas from './views/Politicas.js';
import ProgramadorDashboard from './views/ProgramadorDashboard.js';
import { getUserAccess, waitForAuthUser } from './lib/accessControl.js';
import { initAppShell, updateAppShell, closeUserMenu } from './lib/layout.js';
import { setRouteLoading } from './lib/routeLoading.js';
import { showAlert } from './lib/appDialog.js';
import { initRealtimeSync } from './lib/realtimeSync.js';

// Listado de rutas mapeadas a componentes/funciones
const routes = {
    '/home': Landing,
    '/login': Login,
    '/reservar': Reservar,
    '/checkout': Checkout,
    '/cliente/dashboard': ClienteDashboard,
    '/cliente/configuracion': ClienteDashboard,
    '/cliente/tickets': ClienteDashboard,
    '/admin/dashboard': AdminDashboard,
    '/escaner': Escaner,
    '/politicas': Politicas
};

// Componente por defecto para 404
const NotFound = () => `
    <div class="flex items-center justify-center h-full">
        <h1 class="text-4xl font-bold text-gray-500">404 - Página no encontrada</h1>
    </div>
`;

const resolveView = (path) => {
    if (path.startsWith('/programador')) return ProgramadorDashboard;
    return routes[path] || NotFound;
};

const isProtectedPath = (path) =>
    path.startsWith('/cliente/') ||
    ['/admin/dashboard', '/escaner'].includes(path) ||
    path.startsWith('/programador');

const guardPath = async (path, user) => {
    if (path.startsWith('/cliente/')) return true;
    const access = await getUserAccess(user);

    if (path === '/admin/dashboard') {
        if (access.can('dashboard.manage')) return true;
        await showAlert('Acceso denegado. Se requiere permiso de gestion.', {
            title: 'Sin permiso',
            variant: 'danger'
        });
        return false;
    }

    if (path === '/escaner') {
        if (access.can('tickets.scan')) return true;
        await showAlert('Acceso denegado. Area exclusiva para personal con permiso de escaner.', {
            title: 'Sin permiso',
            variant: 'danger'
        });
        return false;
    }

    if (path.startsWith('/programador')) {
        if (access.isProgramador) return true;
        await showAlert('Acceso denegado. Ruta exclusiva para rol programador.', {
            title: 'Sin permiso',
            variant: 'danger'
        });
        return false;
    }

    return true;
};

const router = async () => {
    setRouteLoading(true);
    closeUserMenu();
    try {
        let path = window.location.pathname;
        const search = window.location.search;
        const hash = window.location.hash;
        const { mode, oobCode } = getAuthActionParams();

        // Enlaces de correo (verificar email / restablecer contraseña) deben abrir /login con los mismos parametros
        if (
            oobCode &&
            (mode === 'verifyEmail' || mode === 'resetPassword') &&
            path !== '/login'
        ) {
            const loginUrl = `/login?mode=${encodeURIComponent(mode)}&oobCode=${encodeURIComponent(oobCode)}`;
            window.history.replaceState(null, '', loginUrl);
            path = '/login';
        } else if (path === '/') {
            // Conservar ?mode= / &oobCode= al pasar de / a /home (evita perder la verificacion)
            window.history.replaceState(null, '', `/home${search}${hash}`);
            path = '/home';
        } else if (path === '/admin/mapa') {
            window.history.replaceState(null, '', '/admin/dashboard?section=sitio&mapfocus=1');
            path = '/admin/dashboard';
        }

        if (path === '/login') {
            const activeUser = await waitForAuthUser();
            if (activeUser) {
                window.history.replaceState(null, '', '/home');
                path = '/home';
            }
        }

        await updateAppShell(path);
        let view = resolveView(path);

        // Auth Guards
        const isProtected = isProtectedPath(path);

        if (isProtected) {
            // Promesa para esperar el estado de auth real (firebase init puede ser asíncrono)
            const user = await waitForAuthUser();

            if (!user) {
                // No autenticado
                navigateTo('/login');
                return;
            }

            const isAllowed = await guardPath(path, user);
            if (!isAllowed) {
                navigateTo('/home');
                return;
            }
        }

        const appElement = document.getElementById('app');
        if (appElement) {
            // Soporte para funciones simples o para objetos con render() y mount()
            if (typeof view === 'function') {
                appElement.innerHTML = await view();
            } else if (typeof view === 'object' && view.render) {
                appElement.innerHTML = await view.render();
                if (view.mount) {
                    setTimeout(() => view.mount(), 0); // Ejecutar después del renderizado del DOM
                }
            }
        }
    } finally {
        setRouteLoading(false);
    }
};

// Función útil para navegar por código
export const navigateTo = (url) => {
    window.history.pushState(null, null, url);
    router();
};

// Función de inicialización
export const initRouter = () => {
    initAppShell({ navigateTo });
    let refreshTimer = null;
    const shouldRefreshByScope = (scope, path) => {
      if (!scope || scope === 'general') return true;
      if (scope === 'tickets') {
        return path.startsWith('/cliente/') || path === '/admin/dashboard' || path === '/escaner' || path === '/checkout';
      }
      if (scope === 'sales') {
        return path === '/checkout' || path === '/admin/dashboard' || path.startsWith('/cliente/');
      }
      if (scope === 'inventory') {
        return path === '/checkout' || path === '/admin/dashboard';
      }
      return true;
    };
    initRealtimeSync((scope) => {
      if (!shouldRefreshByScope(scope, window.location.pathname)) return;
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        router();
      }, 120);
    });
    window.addEventListener('popstate', router);
    document.body.addEventListener('click', e => {
        // Encontrar si el click provino de un enlace con atributo [data-link]
        const link = e.target.closest('[data-link]');
        if (link) {
            const raw = link.getAttribute('href');
            if (!raw) return;
            const url = new URL(raw, window.location.origin);
            if (url.origin !== window.location.origin) return;
            e.preventDefault();
            navigateTo(`${url.pathname}${url.search}${url.hash}`);
        }
    });
    router();
};
