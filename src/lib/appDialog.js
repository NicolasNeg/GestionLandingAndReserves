/**
 * Diálogos flotantes (reemplazo de alert/confirm nativos).
 */

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const VARIANT_RING = {
  info: 'ring-sky-200',
  success: 'ring-emerald-200',
  warning: 'ring-amber-200',
  danger: 'ring-rose-200'
};

const VARIANT_TITLE = {
  info: 'text-sky-900',
  success: 'text-emerald-900',
  warning: 'text-amber-900',
  danger: 'text-rose-900'
};

/**
 * @param {string} message
 * @param {{ title?: string, variant?: 'info'|'success'|'warning'|'danger', confirmText?: string }} [options]
 * @returns {Promise<void>}
 */
export function showAlert(message, options = {}) {
  const {
    title = 'Aviso',
    variant = 'info',
    confirmText = 'Aceptar'
  } = options;

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className =
      'fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px]';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'app-dialog-alert-title');

    const ring = VARIANT_RING[variant] || VARIANT_RING.info;
    const titleCls = VARIANT_TITLE[variant] || VARIANT_TITLE.info;

    overlay.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 ring-1 ${ring} ring-inset">
        <h2 id="app-dialog-alert-title" class="text-lg font-bold ${titleCls}">${escapeHtml(title)}</h2>
        <div class="mt-3 text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">${escapeHtml(message)}</div>
        <button type="button" data-app-dialog-ok
          class="mt-6 w-full rounded-xl bg-slate-900 text-white font-semibold py-3 px-4 hover:bg-slate-800 transition shadow-sm">
          ${escapeHtml(confirmText)}
        </button>
      </div>
    `;

    const done = () => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      resolve();
    };

    const onKey = (e) => {
      if (e.key === 'Escape') done();
    };

    overlay.querySelector('[data-app-dialog-ok]').addEventListener('click', done);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) done();
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    overlay.querySelector('[data-app-dialog-ok]').focus();
  });
}

/**
 * @param {string} message
 * @param {{ title?: string, variant?: string, confirmText?: string, cancelText?: string }} [options]
 * @returns {Promise<boolean>}
 */
export function showConfirm(message, options = {}) {
  const {
    title = 'Confirmar',
    confirmText = 'Aceptar',
    cancelText = 'Cancelar'
  } = options;

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className =
      'fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px]';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 ring-1 ring-slate-200 ring-inset">
        <h2 class="text-lg font-bold text-slate-900">${escapeHtml(title)}</h2>
        <div class="mt-3 text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">${escapeHtml(message)}</div>
        <div class="mt-6 flex gap-3">
          <button type="button" data-app-dialog-cancel
            class="flex-1 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold py-3 px-4 hover:bg-slate-50 transition">
            ${escapeHtml(cancelText)}
          </button>
          <button type="button" data-app-dialog-ok
            class="flex-1 rounded-xl bg-slate-900 text-white font-semibold py-3 px-4 hover:bg-slate-800 transition shadow-sm">
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

/** Sin-op si ya existe host (por si se llama dos veces). */
export function initAppDialog() {
  /* reservado para estilos globales futuros */
}
