import html2pdf from 'html2pdf.js';
import { getCurrentUser } from '../lib/authProvider.js';
import { getUserAccess } from '../lib/accessControl.js';
import {
  listSellableItems,
  findSellableItemByCode,
  createPhysicalSale,
  ensureProductCode
} from '../lib/dataLayer.js';
import { showAlert } from '../lib/appDialog.js';
import { logAuditEvent } from '../lib/auditLog.js';

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const money = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0));

function canUseCortesia(access) {
  return Boolean(access?.can?.('admin.panel') || access?.can?.('programador.access'));
}

function downloadCsvReceipt(sale) {
  const rows = ['fecha,tipo,concepto,cantidad,metodo_pago,total'];
  const created = sale?.createdAt ? new Date(sale.createdAt).toISOString() : new Date().toISOString();
  for (const item of sale?.items || []) {
    rows.push(
      [
        created,
        item.itemType || 'item',
        `"${String(item.name || '').replace(/"/g, '""')}"`,
        Number(item.qty || 0),
        sale.paymentMethod || '',
        Number(item.subtotal || 0).toFixed(2)
      ].join(',')
    );
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `venta_fisica_${String(sale?.id || '').slice(0, 8)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadPdfReceipt(sale) {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-9999px;top:0;width:680px;background:#fff;padding:20px;';
  const itemLines = (sale?.items || [])
    .map(
      (x) =>
        `<tr><td>${escapeHtml(x.name)}</td><td style="text-align:center">${Number(x.qty || 0)}</td><td style="text-align:right">${money(
          x.price
        )}</td><td style="text-align:right">${money(x.subtotal)}</td></tr>`
    )
    .join('');
  host.innerHTML = `
    <div style="font-family:sans-serif;color:#111">
      <h2 style="margin:0 0 8px">Balneario San Antonio</h2>
      <p style="margin:0 0 14px;color:#444">Recibo de venta física</p>
      <p style="margin:0"><strong>Folio:</strong> ${escapeHtml(String(sale?.id || '').slice(0, 8).toUpperCase())}</p>
      <p style="margin:0"><strong>Método:</strong> ${escapeHtml(sale?.paymentMethod || '')}</p>
      <p style="margin:0 0 8px"><strong>Fecha:</strong> ${new Date(sale?.createdAt || Date.now()).toLocaleString('es-MX')}</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #ddd;font-size:12px">
        <thead><tr style="background:#f3f4f6"><th style="text-align:left;padding:6px">Item</th><th style="padding:6px">Cant.</th><th style="padding:6px;text-align:right">Precio</th><th style="padding:6px;text-align:right">Subtotal</th></tr></thead>
        <tbody>${itemLines || '<tr><td colspan="4" style="padding:8px">Sin items.</td></tr>'}</tbody>
      </table>
      <p style="text-align:right;font-size:18px;margin-top:12px"><strong>Total: ${money(sale?.total || 0)}</strong></p>
    </div>
  `;
  document.body.appendChild(host);
  try {
    await html2pdf()
      .set({
        margin: 8,
        filename: `recibo_venta_${String(sale?.id || '').slice(0, 8)}.pdf`,
        html2canvas: { scale: 2, backgroundColor: '#fff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      })
      .from(host.firstElementChild)
      .save();
  } finally {
    document.body.removeChild(host);
  }
}

const VentaFisica = {
  render: () => `
    <div class="min-h-[calc(100vh-92px)] bg-slate-100 pb-10">
      <div class="mx-auto max-w-6xl px-4 py-6">
        <header class="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-black uppercase tracking-wide text-slate-500">Operación</p>
          <h1 class="text-2xl font-black text-slate-900">Venta rápida</h1>
          <p id="pos-status" class="mt-1 text-sm font-semibold text-slate-600">Listo para cobrar.</p>
        </header>
        <div class="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <section class="space-y-4">
            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label class="text-xs font-black uppercase tracking-wide text-slate-500">Escanear o buscar</label>
              <div class="mt-2 flex gap-2">
                <input id="pos-code-input" type="text" placeholder="Escanea o escribe código" class="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm font-semibold" />
                <button type="button" id="pos-add-code-btn" class="rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white">Agregar</button>
              </div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="mb-2 flex items-center justify-between">
                <h2 class="text-sm font-black uppercase tracking-wide text-slate-500">Catálogo rápido</h2>
                <button type="button" id="pos-refresh-catalog" class="rounded-full border border-slate-300 px-3 py-1 text-xs font-black">Actualizar</button>
              </div>
              <div id="pos-catalog" class="grid gap-2 sm:grid-cols-2"></div>
            </div>
          </section>
          <aside class="space-y-4">
            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="mb-3 flex items-center justify-between">
                <h2 class="text-sm font-black uppercase tracking-wide text-slate-500">Carrito POS</h2>
                <button type="button" id="pos-clear-btn" class="text-xs font-bold text-rose-600">Limpiar</button>
              </div>
              <div id="pos-cart" class="space-y-2"></div>
              <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p class="text-xs text-slate-500">Total</p>
                <p id="pos-total" class="text-2xl font-black text-slate-900">$0.00</p>
              </div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label class="text-xs font-black uppercase tracking-wide text-slate-500">Método de pago</label>
              <select id="pos-payment-method" class="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold">
                <option value="efectivo">Efectivo</option>
                <option value="terminal">Terminal</option>
                <option value="transferencia">Transferencia</option>
                <option value="cortesia">Cortesía</option>
              </select>
              <textarea id="pos-notes" rows="2" class="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Notas de venta"></textarea>
              <button type="button" id="pos-charge-btn" class="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700">Cobrar</button>
            </div>
            <div id="pos-receipt" class="hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-4"></div>
          </aside>
        </div>
      </div>
    </div>
  `,
  mount: async () => {
    const access = await getUserAccess(getCurrentUser());
    const allowed =
      access.can('sales.physical') || access.can('admin.panel') || access.can('programador.access');
    if (!allowed) {
      await showAlert('No tienes permiso para venta física.', { title: 'Sin permiso', variant: 'danger' });
      return;
    }
    const inputEl = document.getElementById('pos-code-input');
    const addBtn = document.getElementById('pos-add-code-btn');
    const catalogEl = document.getElementById('pos-catalog');
    const cartEl = document.getElementById('pos-cart');
    const totalEl = document.getElementById('pos-total');
    const chargeBtn = document.getElementById('pos-charge-btn');
    const clearBtn = document.getElementById('pos-clear-btn');
    const payEl = document.getElementById('pos-payment-method');
    const notesEl = document.getElementById('pos-notes');
    const receiptEl = document.getElementById('pos-receipt');
    const statusEl = document.getElementById('pos-status');
    const refreshCatalogBtn = document.getElementById('pos-refresh-catalog');

    if (!canUseCortesia(access) && payEl) {
      const opt = payEl.querySelector('option[value="cortesia"]');
      if (opt) opt.remove();
    }

    const state = { items: [], catalog: [] };
    const setStatus = (msg, ok = false) => {
      if (!statusEl) return;
      statusEl.textContent = msg || '';
      statusEl.className = `mt-1 text-sm font-semibold ${ok ? 'text-emerald-700' : 'text-slate-600'}`;
    };

    const renderCart = () => {
      if (!cartEl || !totalEl) return;
      const total = state.items.reduce((s, x) => s + Number(x.qty || 0) * Number(x.price || 0), 0);
      totalEl.textContent = money(total);
      if (!state.items.length) {
        cartEl.innerHTML = '<p class="text-sm text-slate-500">Sin items en la venta.</p>';
        return;
      }
      cartEl.innerHTML = state.items
        .map(
          (it, idx) => `<article class="rounded-xl border border-slate-200 bg-slate-50 p-2">
          <div class="flex items-center justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate text-sm font-bold text-slate-900">${escapeHtml(it.name)}</p>
              <p class="text-xs text-slate-500">${escapeHtml(it.itemType)} · ${money(it.price)} ${it.code ? `· ${escapeHtml(it.code)}` : ''}</p>
            </div>
            <button type="button" data-pos-remove="${idx}" class="rounded-full border border-rose-200 px-2 py-1 text-xs font-bold text-rose-700">Quitar</button>
          </div>
          <div class="mt-2 flex items-center gap-2">
            <button type="button" data-pos-minus="${idx}" class="rounded-md border px-2">−</button>
            <span class="min-w-8 text-center text-sm font-black">${Number(it.qty || 1)}</span>
            <button type="button" data-pos-plus="${idx}" class="rounded-md border px-2">+</button>
            <p class="ml-auto text-sm font-black">${money(Number(it.qty || 0) * Number(it.price || 0))}</p>
          </div>
        </article>`
        )
        .join('');
      cartEl.querySelectorAll('[data-pos-remove]').forEach((el) =>
        el.addEventListener('click', () => {
          const idx = Number(el.getAttribute('data-pos-remove'));
          state.items.splice(idx, 1);
          renderCart();
        })
      );
      cartEl.querySelectorAll('[data-pos-minus]').forEach((el) =>
        el.addEventListener('click', () => {
          const idx = Number(el.getAttribute('data-pos-minus'));
          state.items[idx].qty = Math.max(1, Number(state.items[idx].qty || 1) - 1);
          renderCart();
        })
      );
      cartEl.querySelectorAll('[data-pos-plus]').forEach((el) =>
        el.addEventListener('click', () => {
          const idx = Number(el.getAttribute('data-pos-plus'));
          const line = state.items[idx];
          if (line.itemType === 'producto' && Number(line.stockActual || 0) <= Number(line.qty || 0)) {
            setStatus('Stock insuficiente para aumentar cantidad.');
            return;
          }
          state.items[idx].qty = Number(state.items[idx].qty || 1) + 1;
          renderCart();
        })
      );
    };

    const addItem = (rawItem) => {
      if (!rawItem) return;
      if (rawItem.itemType === 'producto' && Number(rawItem.stockActual || 0) <= 0) {
        setStatus(`Sin stock: ${rawItem.name}`);
        return;
      }
      const idx = state.items.findIndex((x) => x.itemType === rawItem.itemType && x.itemId === rawItem.itemId);
      if (idx >= 0) {
        const line = state.items[idx];
        if (line.itemType === 'producto' && Number(line.stockActual || 0) <= Number(line.qty || 0)) {
          setStatus(`Stock insuficiente para ${line.name}.`);
          return;
        }
        line.qty += 1;
      } else {
        state.items.push({ ...rawItem, qty: 1 });
      }
      renderCart();
      setStatus('Item agregado.', true);
    };

    const loadCatalog = async () => {
      if (!catalogEl) return;
      catalogEl.innerHTML = '<p class="text-sm text-slate-500">Cargando...</p>';
      try {
        const res = await listSellableItems();
        const rows = (res.data?.items || []).filter((x) => x?.activo);
        state.catalog = rows;
        for (const item of rows.filter((x) => x.itemType === 'producto' && !x.code)) {
          try {
            const codeRes = await ensureProductCode(item.itemId);
            item.code = codeRes?.data?.codigo || '';
          } catch {
            // noop
          }
        }
        if (!rows.length) {
          catalogEl.innerHTML = '<p class="text-sm text-slate-500">Sin items disponibles.</p>';
          return;
        }
        catalogEl.innerHTML = rows
          .slice(0, 120)
          .map(
            (it, idx) => `<button type="button" data-pos-cat="${idx}" class="rounded-xl border border-slate-200 bg-slate-50 p-2 text-left">
              <p class="truncate text-sm font-black text-slate-900">${escapeHtml(it.name)}</p>
              <p class="text-xs text-slate-600">${money(it.price)} ${it.code ? `· ${escapeHtml(it.code)}` : ''}</p>
              ${
                it.itemType === 'producto'
                  ? `<p class="text-[11px] font-semibold ${Number(it.stockActual || 0) <= 0 ? 'text-rose-600' : 'text-slate-500'}">Stock: ${Number(it.stockActual || 0)}</p>`
                  : ''
              }
            </button>`
          )
          .join('');
        catalogEl.querySelectorAll('[data-pos-cat]').forEach((el) =>
          el.addEventListener('click', () => addItem(state.catalog[Number(el.getAttribute('data-pos-cat'))]))
        );
      } catch (e) {
        catalogEl.innerHTML = `<p class="text-sm text-rose-600">${escapeHtml(e?.message || 'No se pudo cargar catálogo.')}</p>`;
      }
    };

    const handleCodeAdd = async () => {
      const code = String(inputEl?.value || '').trim();
      if (!code) return;
      try {
        const res = await findSellableItemByCode(code);
        const item = res?.data?.item;
        if (!item) {
          setStatus('Código no encontrado.');
          return;
        }
        addItem(item);
      } catch (e) {
        setStatus(e?.message || 'No se pudo agregar por código.');
      } finally {
        if (inputEl) inputEl.value = '';
        inputEl?.focus();
      }
    };

    const renderReceipt = (sale) => {
      if (!receiptEl) return;
      receiptEl.classList.remove('hidden');
      receiptEl.innerHTML = `
        <h3 class="text-lg font-black text-emerald-900">Venta registrada</h3>
        <p class="mt-1 text-sm text-emerald-900">Folio: <span class="font-mono">${escapeHtml(String(sale.id).slice(0, 8).toUpperCase())}</span></p>
        <p class="text-sm text-emerald-900">Método: ${escapeHtml(sale.paymentMethod || '')} · Total: <strong>${money(sale.total || 0)}</strong></p>
        <div class="mt-2 rounded-xl bg-white p-3 text-xs text-slate-700">
          ${(sale.items || [])
            .map((it) => `<p>${escapeHtml(String(it.qty))} x ${escapeHtml(it.name)} · ${money(it.subtotal)}</p>`)
            .join('')}
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" id="pos-receipt-new" class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold">Nueva venta</button>
          <button type="button" id="pos-receipt-pdf" class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold">Descargar recibo PDF</button>
          <button type="button" id="pos-receipt-csv" class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold">Exportar CSV</button>
          <button type="button" id="pos-receipt-copy" class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold">Copiar resumen</button>
        </div>
      `;
      document.getElementById('pos-receipt-new')?.addEventListener('click', () => {
        receiptEl.classList.add('hidden');
        state.items = [];
        renderCart();
        setStatus('Nueva venta lista.', true);
      });
      document.getElementById('pos-receipt-pdf')?.addEventListener('click', () =>
        downloadPdfReceipt(sale).catch(() => setStatus('No se pudo generar PDF del recibo.'))
      );
      document.getElementById('pos-receipt-csv')?.addEventListener('click', () => downloadCsvReceipt(sale));
      document.getElementById('pos-receipt-copy')?.addEventListener('click', async () => {
        const txt = `Venta ${String(sale.id).slice(0, 8).toUpperCase()} · ${sale.paymentMethod} · ${money(sale.total)}`;
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(txt);
        setStatus('Resumen copiado.', true);
      });
    };

    addBtn?.addEventListener('click', () => void handleCodeAdd());
    inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') void handleCodeAdd();
    });
    clearBtn?.addEventListener('click', () => {
      state.items = [];
      renderCart();
      setStatus('Venta limpiada.');
    });
    refreshCatalogBtn?.addEventListener('click', () => void loadCatalog());
    chargeBtn?.addEventListener('click', async () => {
      if (!state.items.length) {
        setStatus('Agrega al menos un item para cobrar.');
        return;
      }
      const paymentMethod = String(payEl?.value || 'efectivo');
      chargeBtn.disabled = true;
      setStatus('Registrando venta...');
      try {
        const res = await createPhysicalSale({
          items: state.items,
          paymentMethod,
          notes: String(notesEl?.value || '')
        });
        const sale = res?.data?.sale;
        if (!sale) throw new Error('No se pudo registrar la venta.');
        void logAuditEvent({
          eventType: 'venta_fisica_creada',
          entityType: 'physical_sale',
          entityId: sale.id,
          severity: 'success',
          title: 'Venta física creada',
          description: `Se registró venta física por ${money(sale.total)} (${paymentMethod}).`,
          metadata: { saleId: sale.id, paymentMethod, total: sale.total }
        });
        for (const line of sale.items || []) {
          void logAuditEvent({
            eventType: 'producto_vendido',
            entityType: line.itemType,
            entityId: line.itemId || sale.id,
            title: 'Item vendido',
            description: `${line.qty} x ${line.name} vendido en caja.`,
            metadata: { saleId: sale.id, qty: line.qty, subtotal: line.subtotal }
          });
        }
        state.items = [];
        renderCart();
        renderReceipt(sale);
        setStatus('Venta registrada correctamente.', true);
        if (notesEl) notesEl.value = '';
      } catch (e) {
        setStatus(e?.message || 'No se pudo registrar la venta.');
      } finally {
        chargeBtn.disabled = false;
      }
    });
    renderCart();
    await loadCatalog();
    inputEl?.focus();
  }
};

export default VentaFisica;
