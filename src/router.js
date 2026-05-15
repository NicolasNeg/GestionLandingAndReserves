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
import OperacionDashboard from './views/OperacionDashboard.js';
import VentaFisica from './views/VentaFisica.js';
import RecuperarTicket from './views/RecuperarTicket.js';
import { getUserAccess, normalizeRole, waitForAuthUser } from './lib/accessControl.js';
import { resolvePostLoginPath } from './lib/postLoginRoute.js';
import { initAppShell, updateAppShell, closeUserMenu } from './lib/layout.js';
import { setRouteLoading } from './lib/routeLoading.js';
import { showAlert } from './lib/appDialog.js';
import { initRealtimeSync } from './lib/realtimeSync.js';

/** Limpieza de la vista anterior (p. ej. desmontar React) antes de reemplazar `#app`. */
let routeViewUnmount = null;

// Listado de rutas mapeadas a componentes/funciones
const routes = {
    '/home': Landing,
    '/login': Login,
    '/reservar': Reservar,
    '/checkout': Checkout,
    '/recuperar-ticket': RecuperarTicket,
    '/cliente': ClienteDashboard,
    '/cliente/dashboard': ClienteDashboard,
    '/cliente/configuracion': ClienteDashboard,
    '/cliente/tickets': ClienteDashboard,
    '/operacion': OperacionDashboard,
    '/operacion/venta': VentaFisica,
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
    path.startsWith('/cliente') ||
    ['/admin/dashboard', '/escaner', '/operacion'].includes(path) ||
    path.startsWith('/operacion/') ||
    path.startsWith('/programador');

const guardPath = async (path, user) => {
    if (path.startsWith('/cliente')) return true;
    const access = await getUserAccess(user);

    if (path === '/operacion' || path.startsWith('/operacion/')) {
        if (path === '/operacion/venta') {
            const allowedPos =
                access.can('sales.physical') ||
                access.can('admin.panel') ||
                access.can('programador.access');
            if (allowedPos) return true;
            await showAlert('Acceso denegado. Se requiere permiso de ventas físicas.', {
                title: 'Sin permiso',
                variant: 'danger'
            });
            return false;
        }
        const allowed =
            access.can('tickets.scan') ||
            access.can('parking.manage') ||
            access.can('sales.physical') ||
            access.can('admin.panel') ||
            access.can('programador.access');
        if (allowed) return true;
        await showAlert('Acceso denegado. Se requiere rol operativo (escaneo, parking o ventas físicas).', {
            title: 'Sin permiso',
            variant: 'danger'
        });
        return false;
    }

    if (path === '/admin/dashboard') {
        if (access.can('dashboard.manage')) return true;
        if (normalizeRole(access.role) === 'cliente') {
            await showAlert('Las cuentas cliente no tienen acceso al panel interno de Gestión.', {
                title: 'Sin permiso',
                variant: 'danger'
            });
            return false;
        }
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
        if (access.isProgramador || access.can('programador.access')) return true;
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
                const access = await getUserAccess(activeUser);
                const dest = resolvePostLoginPath(access);
                window.history.replaceState(null, '', dest);
                path = dest.split('?')[0];
            }
        }

        await updateAppShell(path);
        let view = resolveView(path);

        // Auth Guards
        const isProtected = isProtectedPath(path);

        if (isProtected) {
            // Esperar sesión Supabase Auth antes de evaluar el guard
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
            if (typeof routeViewUnmount === 'function') {
                try {
                    routeViewUnmount();
                } catch (_) {
                    /* ignore */
                }
                routeViewUnmount = null;
            }
            // Soporte para funciones simples o para objetos con render() y mount()
            if (typeof view === 'function') {
                appElement.innerHTML = await view();
            } else if (typeof view === 'object' && view.render) {
                appElement.innerHTML = await view.render();
                if (view.mount) {
                    setTimeout(() => {
                        view.mount();
                        if (typeof view.unmount === 'function') {
                            routeViewUnmount = () => view.unmount();
                        }
                    }, 0);
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
        return (
          path.startsWith('/cliente') ||
          path === '/admin/dashboard' ||
          path.startsWith('/operacion') ||
          path === '/escaner' ||
          path === '/checkout'
        );
      }
      if (scope === 'sales') {
        return (
          path === '/checkout' ||
          path === '/admin/dashboard' ||
          path.startsWith('/operacion') ||
          path.startsWith('/cliente')
        );
      }
      if (scope === 'inventory') {
        return path === '/checkout' || path === '/admin/dashboard' || path.startsWith('/operacion');
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
