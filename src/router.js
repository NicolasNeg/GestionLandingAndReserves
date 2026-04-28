import Landing from './views/Landing.js';
import Login from './views/Login.js';
import Reservar from './views/Reservar.js';
import Checkout from './views/Checkout.js';
import ClienteDashboard from './views/ClienteDashboard.js';
import AdminDashboard from './views/AdminDashboard.js';
import Escaner from './views/Escaner.js';

// Listado de rutas mapeadas a componentes/funciones
const routes = {
    '/': Landing,
    '/login': Login,
    '/reservar': Reservar,
    '/checkout': Checkout,
    '/cliente/dashboard': ClienteDashboard,
    '/admin/dashboard': AdminDashboard,
    '/escaner': Escaner
};

// Componente por defecto para 404
const NotFound = () => `
    <div class="flex items-center justify-center h-full">
        <h1 class="text-4xl font-bold text-gray-500">404 - Página no encontrada</h1>
    </div>
`;

// Lógica de ruteo
const router = async () => {
    const path = window.location.pathname;
    const view = routes[path] || NotFound;
    
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
