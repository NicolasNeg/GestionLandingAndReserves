import Landing from './views/Landing.js';
import Login from './views/Login.js';
import Reservar from './views/Reservar.js';
import Checkout from './views/Checkout.js';
import ClienteDashboard from './views/ClienteDashboard.js';
import AdminDashboard from './views/AdminDashboard.js';
import Escaner from './views/Escaner.js';
import Politicas from './views/Politicas.js';

// Listado de rutas mapeadas a componentes/funciones
const routes = {
    '/': Landing,
    '/login': Login,
    '/reservar': Reservar,
    '/checkout': Checkout,
    '/cliente/dashboard': ClienteDashboard,
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

// Lógica de ruteo
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserProfile } from './dataconnect-generated';

// Helper para validar rol de Data Connect
const requireRole = async (user, allowedRoles) => {
    try {
        const profile = await getUserProfile({ id: user.uid });
        const rol = (profile.data && profile.data.user) ? profile.data.user.rol : 'cliente';
        return allowedRoles.includes(rol);
    } catch {
        return false;
    }
};

const router = async () => {
    const path = window.location.pathname;
    let view = routes[path] || NotFound;
    
    // Auth Guards
    const isProtected = ['/cliente/dashboard', '/admin/dashboard', '/escaner'].includes(path);
    
    if (isProtected) {
        // Promesa para esperar el estado de auth real (firebase init puede ser asíncrono)
        const user = await new Promise((resolve) => {
            const unsubscribe = onAuthStateChanged(auth, (u) => {
                unsubscribe();
                resolve(u);
            });
        });

        if (!user) {
            // No autenticado
            navigateTo('/login');
            return;
        }

        // Si va a rutas administrativas, verificar rol
        if (path === '/admin/dashboard') {
            const isAllowed = await requireRole(user, ['programador', 'jefe']);
            if (!isAllowed) {
                alert("Acceso denegado. Se requiere rol de Jefe o Programador.");
                navigateTo('/');
                return;
            }
        }

        if (path === '/escaner') {
            const isAllowed = await requireRole(user, ['programador', 'jefe', 'trabajador']);
            if (!isAllowed) {
                alert("Acceso denegado. Área exclusiva para personal del balneario.");
                navigateTo('/');
                return;
            }
        }
    }

    const appElement = document.getElementById('app');
    if(appElement) {
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
};

// Función útil para navegar por código
export const navigateTo = (url) => {
    window.history.pushState(null, null, url);
    router();
};

// Función de inicialización
export const initRouter = () => {
    window.addEventListener('popstate', router);
    document.body.addEventListener('click', e => {
        // Encontrar si el click provino de un enlace con atributo [data-link]
        const link = e.target.closest('[data-link]');
        if (link) {
            e.preventDefault();
            navigateTo(link.href);
        }
    });
    router();
};
