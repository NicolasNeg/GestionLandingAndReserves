import './style.css';
import { initRouter } from './router.js';
import { initAppDialog } from './lib/appDialog.js';

function showPwaNotice(message, actionLabel, onAction) {
  const existing = document.getElementById('pwa-notice');
  if (existing) existing.remove();
  const wrap = document.createElement('div');
  wrap.id = 'pwa-notice';
  wrap.className = 'fixed bottom-4 left-1/2 z-[220] w-[min(94vw,420px)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur';
  wrap.innerHTML = `
    <p class="text-sm font-semibold text-slate-700">${message}</p>
    ${actionLabel ? `<button type="button" class="mt-2 w-full rounded-xl bg-teal-700 px-3 py-2 text-sm font-bold text-white">${actionLabel}</button>` : ''}
  `;
  if (actionLabel) {
    wrap.querySelector('button')?.addEventListener('click', () => {
      onAction?.();
      wrap.remove();
    });
  } else {
    setTimeout(() => wrap.remove(), 4600);
  }
  document.body.appendChild(wrap);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      if (registration.waiting) {
        showPwaNotice('Nueva versión disponible, recarga para actualizar.', 'Actualizar', () => {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        });
      }
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            showPwaNotice('Nueva versión disponible, recarga para actualizar.', 'Actualizar', () => {
              registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
            });
          }
        });
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
    } catch (error) {
      console.warn('SW registration failed', error);
    }
  });
}

function registerInstallPrompt() {
  let deferredPrompt = null;

  const ensureInstallFab = () => {
    let fab = document.getElementById('pwa-install-fab');
    if (fab) return fab;
    fab = document.createElement('button');
    fab.id = 'pwa-install-fab';
    fab.type = 'button';
    fab.className = 'pwa-install-fab';
    fab.setAttribute('aria-label', 'Instalar aplicación en este dispositivo');
    fab.hidden = true;
    fab.textContent = 'Instalar app';
    document.body.appendChild(fab);
    return fab;
  };

  const wireFabClick = (fab) => {
    fab.onclick = async () => {
      if (!deferredPrompt) return;
      try {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice.catch(() => {});
      } catch (_) {
        /* ignore */
      }
      deferredPrompt = null;
      fab.hidden = true;
    };
  };

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    const fab = ensureInstallFab();
    wireFabClick(fab);
    fab.hidden = false;
    showPwaNotice('Puedes instalar la app como acceso directo.', 'Instalar ahora', async () => {
      if (!deferredPrompt) return;
      try {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice.catch(() => {});
      } catch (_) {
        /* ignore */
      }
      deferredPrompt = null;
      const f = document.getElementById('pwa-install-fab');
      if (f) f.hidden = true;
    });
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    const fab = document.getElementById('pwa-install-fab');
    if (fab) fab.hidden = true;
  });
}

registerInstallPrompt();

// Inicializar el router SPA cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  initAppDialog();
  registerServiceWorker();
  initRouter();
});
