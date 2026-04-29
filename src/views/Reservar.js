import { auth } from '../firebase-config.js';
import { navigateTo } from '../router.js';
import {
  getLandingPage,
  listMesaReservasActivasPorFecha,
  listMisMesaReservas,
  checkMesaReservaLibre,
  createMesaReserva,
  cancelarMesaReserva
} from '../dataconnect-generated';
import { showAlert } from '../lib/appDialog.js';
import { icon } from '../lib/icons.js';
import {
  drawDistribucionCanvas,
  findMapItemIndexAtClientPoint,
  parseDistribucionJson
} from '../lib/distribucionMapa.js';
import { formatFechaDia, isValidFechaDia } from '../lib/fechaDiaMexico.js';

const LANDING_PAGE_ID = 'main';

function isDataConnectMissing(error) {
  const msg = String(error?.message || error || '');
  return (
    msg.includes('NOT_FOUND') ||
    msg.includes('not found') ||
    msg.includes('CreateMesaReserva') ||
    msg.includes('ListMesaReservasActivasPorFecha')
  );
}

export default {
  async render() {
    const hoy = formatFechaDia();
    return `
      <div class="mx-auto max-w-6xl px-4 py-8">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 class="text-3xl font-black text-slate-900">Mapa de mesas</h1>
            <p class="mt-1 text-sm font-semibold text-slate-600">
              Elige el día y toca una mesa disponible para apartarla (requiere cuenta).
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <label class="text-sm font-black text-slate-700">
              Día de visita
              <input id="reservar-fecha" type="date" value="${hoy}" min="${hoy}"
                class="ml-2 mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm" />
            </label>
          </div>
        </div>

        <p id="reservar-msg" class="mt-3 text-sm font-semibold text-slate-500" aria-live="polite"></p>

        <div class="mt-6 flex flex-wrap gap-4 text-xs font-bold text-slate-600">
          <span class="inline-flex items-center gap-2"><span class="h-3 w-3 rounded-full bg-emerald-500"></span> Libre</span>
          <span class="inline-flex items-center gap-2"><span class="h-3 w-3 rounded-full bg-red-500"></span> Apartada</span>
        </div>

        <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div id="reservar-canvas-wrap" class="relative overflow-auto p-4">
              <canvas id="reservar-canvas" width="800" height="440" class="mx-auto block max-w-full cursor-crosshair rounded-xl border border-slate-100 bg-slate-50"></canvas>
              <p id="reservar-canvas-placeholder" class="hidden py-16 text-center text-sm text-slate-500"></p>
            </div>
          </div>
          <aside class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p class="text-xs font-black uppercase tracking-wide text-teal-700">Mis apartados</p>
            <p class="mt-1 text-xs text-slate-500">Para el día seleccionado.</p>
            <div id="reservar-mis" class="mt-4 space-y-2 text-sm"></div>
            <p class="mt-4 text-xs text-slate-500">
              ${icon('info', 'h-4 w-4 inline-block')} Inicia sesión para apartar. El mapa coincide con el editor del personal.
            </p>
          </aside>
        </div>
      </div>
    `;
  },

  async mount() {
    const canvas = document.getElementById('reservar-canvas');
    const fechaInput = document.getElementById('reservar-fecha');
    const msgEl = document.getElementById('reservar-msg');
    const misEl = document.getElementById('reservar-mis');
    const placeholder = document.getElementById('reservar-canvas-placeholder');
    if (!canvas || !fechaInput) return;

    let mapJson = '';
    let currentFecha = (fechaInput.value || '').trim() || formatFechaDia();
    /** @type {Set<string>} */
    const apartadas = new Set();

    const setMsg = (text, variant = 'muted') => {
      if (!msgEl) return;
      msgEl.textContent = text || '';
      msgEl.className =
        variant === 'danger'
          ? 'mt-3 text-sm font-semibold text-rose-700'
          : variant === 'ok'
            ? 'mt-3 text-sm font-semibold text-emerald-700'
            : 'mt-3 text-sm font-semibold text-slate-500';
    };

    try {
      const lp = await getLandingPage({ id: LANDING_PAGE_ID });
      mapJson = lp.data?.landingPage?.mapaDistribucionJson || '';
    } catch (e) {
      console.warn(e);
      mapJson = '';
    }

    const parsedEmpty = !parseDistribucionJson(mapJson).items.length;

    const redraw = () => {
      const statusByMapItemId = {};
      apartadas.forEach((id) => {
        statusByMapItemId[id] = 'apartada';
      });
      if (!mapJson || parsedEmpty) {
        canvas.classList.add('hidden');
        if (placeholder) {
          placeholder.classList.remove('hidden');
          placeholder.textContent =
            'Aún no hay plano publicado. El personal puede definir mesas y zonas desde el panel (sitio / mapa).';
        }
        return;
      }
      canvas.classList.remove('hidden');
      if (placeholder) placeholder.classList.add('hidden');
      drawDistribucionCanvas(canvas, mapJson, { statusByMapItemId });
    };

    const loadApartadas = async () => {
      apartadas.clear();
      try {
        const res = await listMesaReservasActivasPorFecha({ fechaDia: currentFecha });
        const rows = res.data?.mesaReservas || [];
        rows.forEach((r) => {
          if (r.mapItemId) apartadas.add(r.mapItemId);
        });
      } catch (e) {
        if (isDataConnectMissing(e)) {
          setMsg(
            'Servicio de reservas no disponible: despliega Data Connect con el esquema actualizado (MesaReserva).',
            'danger'
          );
        } else {
          console.error(e);
          setMsg('No se pudieron cargar las reservas del día.', 'danger');
        }
      }
      redraw();
    };

    const renderMis = async () => {
      if (!misEl) return;
      const user = auth.currentUser;
      if (!user) {
        misEl.innerHTML =
          '<p class="text-slate-500">Inicia sesión para ver y gestionar tus mesas apartadas.</p>';
        return;
      }
      try {
        const res = await listMisMesaReservas({ userId: user.uid });
        const all = res.data?.mesaReservas || [];
        const mineToday = all.filter((r) => r.fechaDia === currentFecha && r.estado === 'apartada');
        if (!mineToday.length) {
          misEl.innerHTML = '<p class="text-slate-500">No tienes mesas apartadas en esta fecha.</p>';
          return;
        }
        misEl.innerHTML = mineToday
          .map(
            (r) => `
          <div class="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
            <span class="font-bold text-slate-800">${escapeHtml(r.mapItemId)}</span>
            <button type="button" data-cancel-r="${r.id}" class="shrink-0 rounded-lg border border-rose-200 px-2 py-1 text-xs font-black text-rose-700 hover:bg-rose-50">
              Cancelar
            </button>
          </div>`
          )
          .join('');
        misEl.querySelectorAll('[data-cancel-r]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-cancel-r');
            if (!id) return;
            try {
              await cancelarMesaReserva({ id });
              await showAlert('Apartado cancelado.', { title: 'Listo', variant: 'success' });
              await loadApartadas();
              await renderMis();
              setMsg('');
            } catch (e) {
              console.error(e);
              await showAlert(e?.message || 'No se pudo cancelar.', { title: 'Error', variant: 'danger' });
            }
          });
        });
      } catch (e) {
        if (isDataConnectMissing(e)) {
          misEl.innerHTML =
            '<p class="text-rose-600 text-xs">Data Connect sin tabla MesaReserva desplegada.</p>';
        } else {
          misEl.innerHTML = '<p class="text-rose-600 text-xs">No se pudo cargar tu lista.</p>';
        }
      }
    };

    fechaInput.addEventListener('change', async () => {
      const v = (fechaInput.value || '').trim();
      if (!isValidFechaDia(v)) return;
      currentFecha = v;
      setMsg('');
      await loadApartadas();
      await renderMis();
    });

    canvas.addEventListener('click', async (ev) => {
      if (!mapJson || parsedEmpty) return;
      const idx = findMapItemIndexAtClientPoint(canvas, mapJson, ev.clientX, ev.clientY);
      const data = parseDistribucionJson(mapJson);
      const item = data.items[idx];
      if (!item || item.kind !== 'mesa') {
        await showAlert('Selecciona una mesa del mapa.', { title: 'Mapa', variant: 'warning' });
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        await showAlert('Inicia sesión para apartar una mesa.', { title: 'Cuenta', variant: 'warning' });
        navigateTo('/login');
        return;
      }

      if (apartadas.has(item.id)) {
        const mine = await checkMine(item.id);
        if (mine) {
          await showAlert('Ya tienes esta mesa apartada para este día.', { title: 'Mesa', variant: 'success' });
        } else {
          await showAlert('Esta mesa ya está apartada por otro usuario.', { title: 'Mesa', variant: 'warning' });
        }
        return;
      }

      try {
        const chk = await checkMesaReservaLibre({
          fechaDia: currentFecha,
          mapItemId: item.id
        });
        if ((chk.data?.mesaReservas || []).length > 0) {
          await loadApartadas();
          await showAlert('Alguien acaba de apartar esta mesa. Actualiza e intenta otra.', {
            title: 'Mesa',
            variant: 'warning'
          });
          return;
        }

        await createMesaReserva({ fechaDia: currentFecha, mapItemId: item.id });
        await showAlert(`Mesa ${item.id} apartada para el ${currentFecha}.`, {
          title: 'Listo',
          variant: 'success'
        });
        await loadApartadas();
        await renderMis();
      } catch (e) {
        console.error(e);
        const msg = isDataConnectMissing(e)
          ? 'Despliega Data Connect con MesaReserva o revisa la consola.'
          : e?.message || 'No se pudo apartar.';
        await showAlert(msg, { title: 'Error', variant: 'danger' });
      }
    });

    async function checkMine(mapItemId) {
      const user = auth.currentUser;
      if (!user) return false;
      try {
        const res = await listMisMesaReservas({ userId: user.uid });
        const all = res.data?.mesaReservas || [];
        return all.some(
          (r) =>
            r.mapItemId === mapItemId &&
            r.fechaDia === currentFecha &&
            r.estado === 'apartada'
        );
      } catch {
        return false;
      }
    }

    await loadApartadas();
    await renderMis();

    auth.onAuthStateChanged(() => {
      renderMis();
    });
  }
};

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
