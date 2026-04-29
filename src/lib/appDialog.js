import { icon } from './icons.js';

/**
 * Alertas flotantes Balneario San Antonio Texas.
 * Mantiene showAlert/showConfirm para los módulos existentes y expone una API global.
 */

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const VARIANT_META = {
  info: {
    title: 'Aviso del balneario',
    iconName: 'info',
    shell: 'border-sky-200 bg-sky-50 text-sky-950',
    icon: 'bg-sky-100 text-sky-700',
    bar: 'bg-sky-500'
  },
  success: {
    title: 'Listo',
    iconName: 'check',
    shell: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    icon: 'bg-emerald-100 text-emerald-700',
    bar: 'bg-emerald-500'
  },
  warning: {
    title: 'Atención',
    iconName: 'alertTriangle',
    shell: 'border-amber-200 bg-amber-50 text-amber-950',
    icon: 'bg-amber-100 text-amber-700',
    bar: 'bg-amber-500'
  },
  danger: {
    title: 'No se pudo completar',
    iconName: 'x',
    shell: 'border-rose-200 bg-rose-50 text-rose-950',
    icon: 'bg-rose-100 text-rose-700',
    bar: 'bg-rose-500'
  }
};

/**
 * @param {'info'|'success'|'warning'|'danger'|string} variant
 */
function variantMeta(variant = 'info') {
  return VARIANT_META[variant] || VARIANT_META.info;
}

function ensureAlertHost() {
  let host = document.getElementById('balneario-alert-host');
  if (host) return host;

  host = document.createElement('div');
  host.id = 'balneario-alert-host';
  host.className =
    'pointer-events-none fixed inset-x-3 top-[calc(4.25rem+env(safe-area-inset-top))] z-[500] flex flex-col gap-3 sm:left-auto sm:right-4 sm:top-24 sm:w-[24rem]';
  host.setAttribute('aria-live', 'polite');
  host.setAttribute('aria-atomic', 'false');
  document.body.appendChild(host);
  return host;
}

function closeToast(node, onClose) {
  if (!node || node.dataset.closing === '1') return;
  node.dataset.closing = '1';
  node.classList.add('translate-y-2', 'opacity-0', 'scale-[0.98]');
  window.setTimeout(() => {
    node.remove();
    onClose?.();
  }, 180);
}

/**
 * Funcion principal para crear alertas flotantes.
 *
 * @param {string} message
 * @param {{
 *   title?: string,
 *   variant?: 'info'|'success'|'warning'|'danger',
 *   duration?: number,
 *   persistent?: boolean,
 *   actionText?: string,
 *   onAction?: () => void,
 *   iconName?: string
 * }} [options]
 */
export function notifyBalneario(message, options = {}) {
  const variant = options.variant || 'info';
  const meta = variantMeta(variant);
  const title = options.title || meta.title;
  const duration = Number(options.duration ?? 4200);
  const persistent = Boolean(options.persistent) || duration <= 0;
  const iconName = options.iconName || meta.iconName;
  const host = ensureAlertHost();
  const toast = document.createElement('article');
  toast.className = [
    'pointer-events-auto relative overflow-hidden rounded-2xl border p-4 pr-3 shadow-2xl shadow-slate-900/12 ring-1 ring-white/60',
    'translate-y-2 scale-[0.98] opacity-0 transition duration-200 ease-out',
    meta.shell
  ].join(' ');
  toast.setAttribute('role', variant === 'danger' || variant === 'warning' ? 'alert' : 'status');

  const actionHtml = options.actionText
    ? `<button type="button" data-balneario-alert-action class="mt-3 inline-flex rounded-xl bg-white/80 px-3 py-2 text-xs font-black text-slate-800 ring-1 ring-black/5 transition hover:bg-white">${escapeHtml(options.actionText)}</button>`
    : '';

  toast.innerHTML = `
    <div class="flex gap-3">
      <div class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${meta.icon}">
        ${icon(iconName, 'h-6 w-6')}
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[0.7rem] font-black uppercase tracking-wide opacity-70">Balneario San Antonio Texas</p>
            <h2 class="text-sm font-black leading-5">${escapeHtml(title)}</h2>
          </div>
          <button type="button" data-balneario-alert-close class="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/55 text-current opacity-70 transition hover:bg-white hover:opacity-100" aria-label="Cerrar alerta">
            ${icon('x', 'h-4 w-4')}
          </button>
        </div>
        <div class="mt-1 text-sm font-semibold leading-5 opacity-90 whitespace-pre-wrap">${escapeHtml(message)}</div>
        ${actionHtml}
      </div>
    </div>
    <div class="absolute inset-x-0 bottom-0 h-1 bg-black/5">
      <div data-balneario-alert-progress class="h-full ${meta.bar}" style="width:100%"></div>
    </div>
  `;

  host.appendChild(toast);
  const progress = toast.querySelector('[data-balneario-alert-progress]');
  let timer = null;

  const close = () => {
    if (timer) window.clearTimeout(timer);
    closeToast(toast);
  };

  toast.querySelector('[data-balneario-alert-close]')?.addEventListener('click', close);
  toast.querySelector('[data-balneario-alert-action]')?.addEventListener('click', () => {
    options.onAction?.();
    close();
  });

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'scale-[0.98]', 'opacity-0');
    if (!persistent && progress) {
      progress.style.transition = `width ${duration}ms linear`;
      requestAnimationFrame(() => {
        progress.style.width = '0%';
      });
    }
  });

  if (!persistent) {
    timer = window.setTimeout(close, duration);
  }

  return { el: toast, close };
}

/**
 * Reemplazo no bloqueante de alert(). Se conserva como Promise para compatibilidad.
 *
 * @param {string} message
 * @param {{ title?: string, variant?: 'info'|'success'|'warning'|'danger', duration?: number, persistent?: boolean }} [options]
 * @returns {Promise<void>}
 */
export function showAlert(message, options = {}) {
  notifyBalneario(message, options);
  return Promise.resolve();
}

function confirmButtonClass(variant) {
  if (variant === 'danger') return 'bg-rose-600 hover:bg-rose-700';
  if (variant === 'warning') return 'bg-amber-500 hover:bg-amber-600 text-slate-950';
  if (variant === 'success') return 'bg-emerald-600 hover:bg-emerald-700';
  return 'bg-slate-900 hover:bg-slate-800';
}

/**
 * @param {string} message
 * @param {{ title?: string, variant?: 'info'|'success'|'warning'|'danger', confirmText?: string, cancelText?: string }} [options]
 * @returns {Promise<boolean>}
 */
export function showConfirm(message, options = {}) {
  const {
    title = 'Confirmar',
    variant = 'info',
    confirmText = 'Aceptar',
    cancelText = 'Cancelar'
  } = options;
  const meta = variantMeta(variant);

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className =
      'fixed inset-0 z-[510] flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[3px]';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
      <div class="w-full max-w-md overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl">
        <div class="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-br from-cyan-50 to-white p-5">
          <div class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${meta.icon}">
            ${icon(meta.iconName, 'h-6 w-6')}
          </div>
          <div class="min-w-0">
            <p class="text-xs font-black uppercase tracking-wide text-cyan-700">Balneario San Antonio Texas</p>
            <h2 class="text-xl font-black text-slate-900">${escapeHtml(title)}</h2>
            <div class="mt-2 text-sm font-semibold leading-6 text-slate-600 whitespace-pre-wrap">${escapeHtml(message)}</div>
          </div>
        </div>
        <div class="flex gap-3 p-4">
          <button type="button" data-app-dialog-cancel
            class="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-700 transition hover:bg-slate-50">
            ${escapeHtml(cancelText)}
          </button>
          <button type="button" data-app-dialog-ok
            class="flex-1 rounded-xl px-4 py-3 font-black text-white transition ${confirmButtonClass(variant)}">
            ${escapeHtml(confirmText)}
          </button>
        </div>
      </div>
    `;

    const finish = (value) => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      resolve(value);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') finish(false);
    };

    overlay.querySelector('[data-app-dialog-cancel]').addEventListener('click', () => finish(false));
    overlay.querySelector('[data-app-dialog-ok]').addEventListener('click', () => finish(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) finish(false);
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    overlay.querySelector('[data-app-dialog-ok]').focus();
  });
}

export function initAppDialog() {
  ensureAlertHost();
  const api = {
    show: notifyBalneario,
    info: (message, options = {}) => notifyBalneario(message, { ...options, variant: 'info' }),
    success: (message, options = {}) => notifyBalneario(message, { ...options, variant: 'success' }),
    warning: (message, options = {}) => notifyBalneario(message, { ...options, variant: 'warning' }),
    error: (message, options = {}) => notifyBalneario(message, { ...options, variant: 'danger' }),
    danger: (message, options = {}) => notifyBalneario(message, { ...options, variant: 'danger' })
  };
  window.BalnearioAlert = api;
  window.showBalnearioAlert = notifyBalneario;
}
