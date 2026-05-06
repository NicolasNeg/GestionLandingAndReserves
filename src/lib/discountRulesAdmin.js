/**
 * Admin UI helpers for discount conditions (reglas_json array).
 * Does not change how rules are applied at checkout — only authoring UX.
 */

export function parseDiscountRulesJson(str) {
  try {
    const parsed = JSON.parse(str || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function splitDiscountRules(rules) {
  const unknown = [];
  const fields = {
    minSubtotal: { enabled: false, value: '' },
    minTotalQty: { enabled: false, value: '' },
    dateRange: { enabled: false, start: '', end: '' },
    oncePerUser: { enabled: false },
    paymentMethod: { enabled: false, value: '' }
  };

  for (const r of rules || []) {
    if (!r || typeof r !== 'object') continue;
    switch (r.type) {
      case 'minSubtotal':
        fields.minSubtotal = {
          enabled: true,
          value: r.value != null && r.value !== '' ? String(r.value) : ''
        };
        break;
      case 'minTotalQty':
        fields.minTotalQty = {
          enabled: true,
          value: r.value != null && r.value !== '' ? String(r.value) : ''
        };
        break;
      case 'dateRange':
        fields.dateRange = {
          enabled: true,
          start: String(r.start || '').slice(0, 10),
          end: String(r.end || '').slice(0, 10)
        };
        break;
      case 'oncePerUser':
        fields.oncePerUser = { enabled: r.value !== false };
        break;
      case 'paymentMethod':
        fields.paymentMethod = {
          enabled: true,
          value: r.value === 'taquilla' ? 'taquilla' : r.value === 'online' ? 'online' : ''
        };
        break;
      default:
        unknown.push(r);
    }
  }

  return { fields, unknown };
}

export function readDiscountRulesFromDom(root) {
  if (!root) return splitDiscountRules([]).fields;
  const q = (sel) => root.querySelector(sel);
  return {
    minSubtotal: {
      enabled: Boolean(q('[data-dr-min-sub-enabled]')?.checked),
      value: q('[data-dr-min-sub-value]')?.value ?? ''
    },
    minTotalQty: {
      enabled: Boolean(q('[data-dr-qty-enabled]')?.checked),
      value: q('[data-dr-qty-value]')?.value ?? ''
    },
    dateRange: {
      enabled: Boolean(q('[data-dr-date-enabled]')?.checked),
      start: q('[data-dr-date-start]')?.value ?? '',
      end: q('[data-dr-date-end]')?.value ?? ''
    },
    oncePerUser: {
      enabled: Boolean(q('[data-dr-once-enabled]')?.checked)
    },
    paymentMethod: {
      enabled: Boolean(q('[data-dr-pay-enabled]')?.checked),
      value: q('[data-dr-pay-select]')?.value ?? ''
    }
  };
}

export function writeDiscountRulesToDom(root, fields) {
  if (!root || !fields) return;
  const q = (sel) => root.querySelector(sel);
  const minSub = q('[data-dr-min-sub-enabled]');
  const minSubVal = q('[data-dr-min-sub-value]');
  if (minSub) minSub.checked = fields.minSubtotal.enabled;
  if (minSubVal) minSubVal.value = fields.minSubtotal.value != null ? String(fields.minSubtotal.value) : '';

  const qtyEn = q('[data-dr-qty-enabled]');
  const qtyVal = q('[data-dr-qty-value]');
  if (qtyEn) qtyEn.checked = fields.minTotalQty.enabled;
  if (qtyVal) qtyVal.value = fields.minTotalQty.value != null ? String(fields.minTotalQty.value) : '';

  const dateEn = q('[data-dr-date-enabled]');
  const dateStart = q('[data-dr-date-start]');
  const dateEnd = q('[data-dr-date-end]');
  if (dateEn) dateEn.checked = fields.dateRange.enabled;
  if (dateStart) dateStart.value = fields.dateRange.start || '';
  if (dateEnd) dateEnd.value = fields.dateRange.end || '';

  const once = q('[data-dr-once-enabled]');
  if (once) once.checked = fields.oncePerUser.enabled;

  const payEn = q('[data-dr-pay-enabled]');
  const paySel = q('[data-dr-pay-select]');
  if (payEn) payEn.checked = fields.paymentMethod.enabled;
  if (paySel) paySel.value = fields.paymentMethod.value || '';

  updateDiscountRulesConditionalVisibility(root);
}

export function updateDiscountRulesConditionalVisibility(root) {
  if (!root) return;
  const fields = readDiscountRulesFromDom(root);
  const show = (wrapSel, on) => {
    const el = root.querySelector(wrapSel);
    if (el) el.classList.toggle('hidden', !on);
  };
  show('[data-dr-min-sub-wrap]', fields.minSubtotal.enabled);
  show('[data-dr-qty-wrap]', fields.minTotalQty.enabled);
  show('[data-dr-date-wrap]', fields.dateRange.enabled);
  show('[data-dr-pay-wrap]', fields.paymentMethod.enabled);
}

export function validateDiscountRulesFields(fields) {
  const errors = [];
  if (fields.minSubtotal.enabled) {
    const raw = String(fields.minSubtotal.value ?? '').trim();
    const n = Number(raw);
    if (raw === '' || Number.isNaN(n) || n < 0) {
      errors.push('El monto mínimo debe ser un número mayor o igual a 0.');
    }
  }
  if (fields.minTotalQty.enabled) {
    const raw = String(fields.minTotalQty.value ?? '').trim();
    const n = Math.floor(Number(raw));
    if (raw === '' || Number.isNaN(n) || !Number.isFinite(n) || n < 1) {
      errors.push('La cantidad mínima debe ser un número entero de al menos 1.');
    }
  }
  if (fields.dateRange.enabled) {
    const start = String(fields.dateRange.start || '').trim();
    const end = String(fields.dateRange.end || '').trim();
    if (!start || !end) {
      errors.push('Si activas vigencia, indica fecha de inicio y fecha de fin.');
    } else if (start > end) {
      errors.push('La fecha fin no puede ser anterior a la fecha de inicio.');
    }
  }
  if (fields.paymentMethod.enabled) {
    const v = fields.paymentMethod.value;
    if (!v || (v !== 'online' && v !== 'taquilla')) {
      errors.push('Selecciona un método de pago o desactiva esa condición.');
    }
  }
  return errors;
}

export function buildDiscountRulesArray(fields, unknownRules = []) {
  const rules = [];
  if (fields.minSubtotal.enabled) {
    rules.push({ type: 'minSubtotal', value: Number(fields.minSubtotal.value) });
  }
  if (fields.minTotalQty.enabled) {
    rules.push({ type: 'minTotalQty', value: Math.floor(Number(fields.minTotalQty.value)) });
  }
  if (fields.dateRange.enabled) {
    rules.push({
      type: 'dateRange',
      start: String(fields.dateRange.start || '').slice(0, 10),
      end: String(fields.dateRange.end || '').slice(0, 10)
    });
  }
  if (fields.oncePerUser.enabled) {
    rules.push({ type: 'oncePerUser', value: true });
  }
  if (fields.paymentMethod.enabled && fields.paymentMethod.value) {
    rules.push({ type: 'paymentMethod', value: fields.paymentMethod.value });
  }
  return [...rules, ...(Array.isArray(unknownRules) ? unknownRules : [])];
}

export function stringifyDiscountRules(fields, unknownRules) {
  return JSON.stringify(buildDiscountRulesArray(fields, unknownRules));
}

export function humanDiscountRulesSummary(fields, hasUnknownRules) {
  const parts = [];
  if (fields.minSubtotal.enabled && String(fields.minSubtotal.value ?? '').trim() !== '') {
    parts.push(`la compra sea mayor a $${Number(fields.minSubtotal.value).toFixed(2)}`);
  }
  if (fields.minTotalQty.enabled && String(fields.minTotalQty.value ?? '').trim() !== '') {
    parts.push(`haya al menos ${Math.floor(Number(fields.minTotalQty.value))} artículos o boletos`);
  }
  if (fields.dateRange.enabled && fields.dateRange.start && fields.dateRange.end) {
    parts.push(`la fecha esté entre ${fields.dateRange.start} y ${fields.dateRange.end}`);
  }
  if (fields.oncePerUser.enabled) {
    parts.push('el cliente no haya usado ya este código antes');
  }
  if (fields.paymentMethod.enabled && fields.paymentMethod.value === 'online') {
    parts.push('el pago sea en línea');
  }
  if (fields.paymentMethod.enabled && fields.paymentMethod.value === 'taquilla') {
    parts.push('el pago sea en taquilla');
  }

  let text =
    parts.length === 0
      ? 'Sin condiciones adicionales: el código puede aplicarse según los usos y la configuración general del sistema.'
      : `Este descuento aplica cuando ${parts.join(' y ')}.`;

  if (hasUnknownRules) {
    text +=
      ' Además, este descuento tiene condiciones avanzadas definidas previamente que se siguen respetando.';
  }

  return text;
}

export function discountRulesEditorMarkup(showTechnicalSection, rootId = '') {
  const techClass = showTechnicalSection ? '' : 'hidden';
  const idAttr = rootId ? ` id="${rootId}"` : '';
  return `
    <div data-dr-root${idAttr} class="discount-rules-editor space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
      <div>
        <h3 class="text-sm font-black text-slate-900">Condiciones del descuento</h3>
        <p class="mt-1 text-xs text-slate-600">Estas condiciones limitan cuándo se puede usar el descuento.</p>
      </div>

      <p data-dr-unknown-note class="hidden rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900"></p>

      <div class="space-y-3">
        <div class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <label class="flex cursor-pointer items-start gap-2 text-sm font-bold text-slate-800">
            <input type="checkbox" data-dr-min-sub-enabled class="mt-1 h-4 w-4 shrink-0 rounded border-slate-300" />
            <span>Requiere compra mínima</span>
          </label>
          <div data-dr-min-sub-wrap class="mt-3 hidden space-y-2 border-l-2 border-teal-200 pl-3">
            <label class="block text-xs font-semibold text-slate-600">Monto mínimo ($)
              <input type="number" data-dr-min-sub-value min="0" step="0.01" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" placeholder="500" />
            </label>
            <p class="text-xs text-slate-500">Ejemplo: aplica si el carrito supera $500.</p>
          </div>
        </div>

        <div class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <label class="flex cursor-pointer items-start gap-2 text-sm font-bold text-slate-800">
            <input type="checkbox" data-dr-qty-enabled class="mt-1 h-4 w-4 shrink-0 rounded border-slate-300" />
            <span>Requiere cantidad mínima</span>
          </label>
          <div data-dr-qty-wrap class="mt-3 hidden space-y-2 border-l-2 border-teal-200 pl-3">
            <label class="block text-xs font-semibold text-slate-600">Cantidad mínima de artículos o boletos
              <input type="number" data-dr-qty-value min="1" step="1" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" placeholder="2" />
            </label>
            <p class="text-xs text-slate-500">Ejemplo: aplica si compra 2 o más.</p>
          </div>
        </div>

        <div class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <label class="flex cursor-pointer items-start gap-2 text-sm font-bold text-slate-800">
            <input type="checkbox" data-dr-date-enabled class="mt-1 h-4 w-4 shrink-0 rounded border-slate-300" />
            <span>Tiene fecha de inicio y fin</span>
          </label>
          <div data-dr-date-wrap class="mt-3 hidden grid gap-3 border-l-2 border-teal-200 pl-3 sm:grid-cols-2">
            <label class="block text-xs font-semibold text-slate-600">Fecha inicio
              <input type="date" data-dr-date-start class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
            </label>
            <label class="block text-xs font-semibold text-slate-600">Fecha fin
              <input type="date" data-dr-date-end class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
            </label>
          </div>
        </div>

        <div class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <label class="flex cursor-pointer items-start gap-2 text-sm font-bold text-slate-800">
            <input type="checkbox" data-dr-once-enabled class="mt-1 h-4 w-4 shrink-0 rounded border-slate-300" />
            <span>Solo una vez por cliente</span>
          </label>
        </div>

        <div class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <label class="flex cursor-pointer items-start gap-2 text-sm font-bold text-slate-800">
            <input type="checkbox" data-dr-pay-enabled class="mt-1 h-4 w-4 shrink-0 rounded border-slate-300" />
            <span>Solo para un método de pago</span>
          </label>
          <div data-dr-pay-wrap class="mt-3 hidden border-l-2 border-teal-200 pl-3">
            <label class="block text-xs font-semibold text-slate-600">Método de pago
              <select data-dr-pay-select class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm">
                <option value="">Selecciona método…</option>
                <option value="online">Pago en línea</option>
                <option value="taquilla">Pago en taquilla</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div data-dr-human-summary class="rounded-lg border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-800"></div>
      <div data-dr-error class="hidden whitespace-pre-wrap rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800"></div>

      <details data-dr-tech class="${techClass} rounded-lg border border-slate-200 bg-white p-3 text-xs">
        <summary class="cursor-pointer font-bold text-slate-700">Ver reglas técnicas</summary>
        <pre data-dr-tech-json class="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-slate-900 p-2 font-mono text-emerald-100"></pre>
      </details>
    </div>
  `;
}

export function refreshDiscountRulesEditorUi(root, unknownRules) {
  if (!root) return;
  const unknown = Array.isArray(unknownRules) ? unknownRules : root.__discountUnknownRules || [];
  root.__discountUnknownRules = unknown;

  const fields = readDiscountRulesFromDom(root);
  const note = root.querySelector('[data-dr-unknown-note]');
  const hasUnknown = unknown.length > 0;
  if (note) {
    note.textContent =
      'Este descuento tiene condiciones avanzadas creadas previamente. Se conservan al guardar.';
    note.classList.toggle('hidden', !hasUnknown);
  }

  const summaryEl = root.querySelector('[data-dr-human-summary]');
  if (summaryEl) {
    summaryEl.textContent = humanDiscountRulesSummary(fields, hasUnknown);
  }

  const techJson = root.querySelector('[data-dr-tech-json]');
  if (techJson) {
    try {
      const arr = buildDiscountRulesArray(fields, unknown);
      techJson.textContent = JSON.stringify(arr, null, 2);
    } catch {
      techJson.textContent = '';
    }
  }
}

export function wireDiscountRulesEditor(root, { showTechnical } = {}) {
  if (!root) return;

  const onAny = () => {
    updateDiscountRulesConditionalVisibility(root);
    refreshDiscountRulesEditorUi(root, root.__discountUnknownRules);
  };

  root.addEventListener('change', (e) => {
    if (
      e.target.matches(
        '[data-dr-min-sub-enabled],[data-dr-qty-enabled],[data-dr-date-enabled],[data-dr-once-enabled],[data-dr-pay-enabled],[data-dr-pay-select],[data-dr-date-start],[data-dr-date-end]'
      )
    ) {
      onAny();
    }
  });
  root.addEventListener('input', (e) => {
    if (
      e.target.matches(
        '[data-dr-min-sub-value],[data-dr-qty-value],[data-dr-date-start],[data-dr-date-end],[data-dr-pay-select]'
      )
    ) {
      onAny();
    }
  });

  const tech = root.querySelector('[data-dr-tech]');
  if (tech) {
    tech.classList.toggle('hidden', !showTechnical);
  }

  onAny();
}

export function showDiscountRulesValidationError(root, messages) {
  const box = root?.querySelector('[data-dr-error]');
  if (!box) return;
  if (!messages?.length) {
    box.classList.add('hidden');
    box.textContent = '';
    return;
  }
  box.textContent = messages.join('\n');
  box.classList.remove('hidden');
}
