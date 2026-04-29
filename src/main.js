import './style.css';
import { initRouter } from './router.js';
import { initAppDialog } from './lib/appDialog.js';

// Inicializar el router SPA cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  initAppDialog();
  initRouter();
});
