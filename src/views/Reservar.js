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
  claimMesaReservaLive,
  clearMesaReservaLive,
  getMesaReservaLive,
  subscribeMesaReservasByFecha,
  upsertMesaReservaLive
} from '../lib/mesaRealtime.js';
import {
  createMapViewer,
  drawDistribucionCanvas,
  findMapItemIndexAtClientPoint,
  parseDistribucionJson
} from '../lib/distribucionMapa.js';
import { formatFechaDia, isValidFechaDia } from '../lib/fechaDiaMexico.js';
import { sweepExpiredMesaReservas } from '../lib/mesaLifecycle.js';

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
      <div class="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <div class="reservation-hero">
          <div>
            <p class="text-xs font-black uppercase tracking-wide text-emerald-700">${icon('map', 'h-4 w-4 inline-block')} Reservas por plano</p>
            <h1 class="mt-1 text-3xl font-black text-slate-900">Mapa de mesas</h1>
            <p class="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">Elige fecha, revisa disponibilidad en vivo y toca una mesa libre para ver detalles antes de confirmar.</p>
          </div>
          <div class="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
            <span id="reservar-live-pill" class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
              <span class="h-2.5 w-2.5 rounded-full bg-slate-400"></span>
              Conectando
            </span>
            <label class="text-xs font-black uppercase tracking-wide text-slate-500">
              Día de visita
              <input id="reservar-fecha" type="date" value="${hoy}" min="${hoy}"
                class="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm" />
            </label>
          </div>
        </div>

        <p id="reservar-msg" class="mt-3 text-sm font-semibold text-slate-500" aria-live="polite"></p>

        <div class="reservation-legend mt-5">
          <span><i class="bg-emerald-500"></i> Libre</span>
          <span><i class="bg-amber-500"></i> Apartada por mí</span>
          <span><i class="bg-red-500"></i> Apartada</span>
          <span><i class="bg-indigo-600"></i> Ocupada</span>
        </div>

        <div class="reservation-layout mt-6">
          <div class="reservation-map-card">
            <div class="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <p class="text-xs font-black uppercase tracking-wide text-emerald-200">Plano de reservaciones</p>
                <p class="text-sm font-semibold text-white/80">Arrastra para explorar y usa zoom para acercarte.</p>
              </div>
              <span class="hidden rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black text-white sm:inline-flex">${icon('ticket', 'h-3.5 w-3.5')} Selección segura</span>
            </div>
            <div id="reservar-canvas-wrap" class="relative h-[430px] overflow-hidden sm:h-[560px]">
              <canvas id="reservar-canvas" width="1000" height="620" class="absolute inset-0 h-full w-full cursor-pointer"></canvas>
              <div id="reservar-map-tooltip" class="map-tooltip hidden"></div>
              <div class="map-floating-toolbar absolute right-3 top-3 z-10">
                <button type="button" id="reservar-map-zoom-out" class="map-icon-btn">−</button>
                <button type="button" id="reservar-map-reset" class="map-reset-btn">Reset</button>
                <button type="button" id="reservar-map-zoom-in" class="map-icon-btn">+</button>
              </div>
              <p id="reservar-canvas-placeholder" class="hidden py-16 text-center text-sm text-slate-500"></p>
            </div>
          </div>
          <aside class="reservation-side-panel space-y-4">
            <div id="reservar-mesa-panel" class="reservation-detail-card">
              <div class="flex items-center justify-between gap-3">
                <p class="text-xs font-black uppercase tracking-wide text-teal-700">Mesa seleccionada</p>
                <button type="button" id="reservar-close-panel" class="hidden rounded-full border border-slate-200 px-2 py-1 text-xs font-black text-slate-500 sm:hidden">Cerrar</button>
              </div>
              <div id="reservar-mesa-detail" class="mt-3 text-sm text-slate-600">
                Toca una mesa libre para revisar detalles y confirmar.
              </div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p class="text-xs font-black uppercase tracking-wide text-teal-700">Mis apartados</p>
            <p class="mt-1 text-xs text-slate-500">Para el día seleccionado.</p>
            <div id="reservar-mis" class="mt-4 space-y-2 text-sm"></div>
            <p class="mt-4 text-xs text-slate-500">
              ${icon('info', 'h-4 w-4 inline-block')} Inicia sesión para apartar. El mapa coincide con el editor del personal.
            </p>
            </div>
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
    const detailEl = document.getElementById('reservar-mesa-detail');
    const panelEl = document.getElementById('reservar-mesa-panel');
    const closePanelBtn = document.getElementById('reservar-close-panel');
    const livePill = document.getElementById('reservar-live-pill');
    const mapTooltip = document.getElementById('reservar-map-tooltip');
    if (!canvas || !fechaInput) return;

    let mapJson = '';
    let currentFecha = (fechaInput.value || '').trim() || formatFechaDia();
    let unsubscribeLive = null;
    let mesaViewer = null;
    const mesaViewerOptions = {
      view: 'mesas',
      showItemIds: false,
      showKindBadge: false,
      statusByMapItemId: {},
      onHover: setMapTooltip,
      onSelect: (item) => openMesaDetail(item)
    };
    const ownerByMapItemId = new Map();
    const stateByMapItemId = new Map();
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

    const setLivePill = (text, variant = 'muted') => {
      if (!livePill) return;
      const dot =
        variant === 'ok'
          ? 'bg-emerald-500'
          : variant === 'danger'
            ? 'bg-rose-500'
            : 'bg-amber-500';
      livePill.className = `inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${
        variant === 'ok'
          ? 'bg-emerald-50 text-emerald-800'
          : variant === 'danger'
            ? 'bg-rose-50 text-rose-800'
            : 'bg-amber-50 text-amber-800'
      }`;
      livePill.innerHTML = `<span class="h-2.5 w-2.5 rounded-full ${dot}"></span>${escapeHtml(text)}`;
    };

    const setPanelOpen = (open) => {
      panelEl?.classList.toggle('is-open', open);
      closePanelBtn?.classList.toggle('hidden', !open);
    };
    closePanelBtn?.addEventListener('click', () => setPanelOpen(false));

    function setMapTooltip(item, _index, _point, pointer) {
      if (!mapTooltip) return;
      if (!item || !pointer || window.matchMedia('(max-width: 640px)').matches) {
        mapTooltip.classList.add('hidden');
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const state = stateByMapItemId.get(item.id) || (apartadas.has(item.id) ? 'apartada' : 'libre');
      mapTooltip.innerHTML = `
        <strong>${escapeHtml(item.label || item.id || 'Mesa')}</strong>
        <span>${escapeHtml(state === 'libre' ? 'Disponible' : state === 'ocupada' ? 'Ocupada' : 'Apartada')}</span>
      `;
      mapTooltip.style.left = `${Math.min(rect.width - 190, Math.max(10, pointer.clientX - rect.left + 14))}px`;
      mapTooltip.style.top = `${Math.min(rect.height - 74, Math.max(10, pointer.clientY - rect.top + 14))}px`;
      mapTooltip.classList.remove('hidden');
    }

    try {
      const lp = await getLandingPage({ id: LANDING_PAGE_ID });
      const landing = lp.data?.landingPage;
      mapJson = landing?.mapaMesasJson || landing?.mapaDistribucionJson || '';
    } catch (e) {
      console.warn(e);
      mapJson = '';
    }

    const parsedEmpty = !parseDistribucionJson(mapJson).items.length;

    const redraw = () => {
      const me = auth.currentUser?.uid || '';
      const statusByMapItemId = {};
      apartadas.forEach((id) => {
        const state = stateByMapItemId.get(id) || 'apartada';
        if (state === 'ocupada') statusByMapItemId[id] = 'ocupada';
        else statusByMapItemId[id] = ownerByMapItemId.get(id) === me ? 'apartada_mia' : 'apartada';
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
      mesaViewerOptions.statusByMapItemId = statusByMapItemId;
      if (!mesaViewer) {
        mesaViewer = createMapViewer(canvas, mapJson, mesaViewerOptions);
        document.getElementById('reservar-map-zoom-in')?.addEventListener('click', () => mesaViewer?.zoomIn());
        document.getElementById('reservar-map-zoom-out')?.addEventListener('click', () => mesaViewer?.zoomOut());
        document.getElementById('reservar-map-reset')?.addEventListener('click', () => mesaViewer?.reset());
      } else {
        mesaViewer.redraw();
      }
    };

    const loadApartadasBase = async () => {
      apartadas.clear();
      ownerByMapItemId.clear();
      stateByMapItemId.clear();
      try {
        const res = await listMesaReservasActivasPorFecha({ fechaDia: currentFecha });
        const rows = res.data?.mesaReservas || [];
        rows.forEach((r) => {
          if (r.mapItemId) {
            apartadas.add(r.mapItemId);
            ownerByMapItemId.set(r.mapItemId, '');
            stateByMapItemId.set(r.mapItemId, 'apartada');
          }
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

    const connectLive = () => {
      if (unsubscribeLive) {
        unsubscribeLive();
        unsubscribeLive = null;
      }
      setMsg('Sincronizando en vivo...');
      setLivePill('Sincronizando', 'muted');
      unsubscribeLive = subscribeMesaReservasByFecha(
        currentFecha,
        (rows) => {
          apartadas.clear();
          ownerByMapItemId.clear();
          stateByMapItemId.clear();
          rows.forEach((r) => {
            if (r.mapItemId && (r.estado === 'apartada' || r.estado === 'ocupada')) {
              apartadas.add(r.mapItemId);
              ownerByMapItemId.set(r.mapItemId, String(r.userId || ''));
              stateByMapItemId.set(r.mapItemId, String(r.estado || 'apartada'));
            }
          });
          redraw();
          setMsg('Sincronizado en vivo.', 'ok');
          setLivePill('En vivo', 'ok');
        },
        (e) => {
          console.warn('mesa realtime', e);
          setMsg('Sin realtime; mostrando último estado.', 'danger');
          setLivePill('Sin realtime', 'danger');
        }
      );
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
            <button type="button" data-cancel-r="${r.id}" data-cancel-map="${escapeHtml(r.mapItemId)}" class="shrink-0 rounded-lg border border-rose-200 px-2 py-1 text-xs font-black text-rose-700 hover:bg-rose-50">
              Cancelar
            </button>
          </div>`
          )
          .join('');
        misEl.querySelectorAll('[data-cancel-r]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-cancel-r');
            const mapItemId = btn.getAttribute('data-cancel-map');
            if (!id) return;
            try {
              await cancelarMesaReserva({ id });
              if (mapItemId) await clearMesaReservaLive(currentFecha, mapItemId);
              await showAlert('Apartado cancelado.', { title: 'Listo', variant: 'success' });
              await loadApartadasBase();
              connectLive();
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
      setPanelOpen(false);
      if (detailEl) detailEl.innerHTML = 'Toca una mesa libre para revisar detalles y confirmar.';
      await loadApartadasBase();
      connectLive();
      await renderMis();
    });

    function openMesaDetail(item) {
      if (!detailEl) return;
      if (!item || item.kind !== 'mesa') {
        setPanelOpen(false);
        detailEl.innerHTML = '<p class="text-slate-500">Selecciona una mesa disponible del mapa.</p>';
        return;
      }
      setPanelOpen(true);
      const metadata = item.metadata || {};
      const capacidad = Number(metadata.capacidad || 4);
      const precio = Number(metadata.precio || 0);
      const estado = stateByMapItemId.get(item.id) || (apartadas.has(item.id) ? 'apartada' : 'libre');
      const mine = ownerByMapItemId.get(item.id) === auth.currentUser?.uid;
      const statusText =
        estado === 'ocupada'
          ? 'Ocupada'
          : apartadas.has(item.id)
            ? (mine ? 'Apartada por mi' : 'Apartada por otro usuario')
            : 'Disponible';
      const canReserve = estado !== 'ocupada' && !apartadas.has(item.id) && metadata.reservable !== false;
      const statusClass = canReserve
        ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
        : estado === 'ocupada'
          ? 'bg-indigo-50 text-indigo-800 ring-indigo-100'
          : mine
            ? 'bg-amber-50 text-amber-800 ring-amber-100'
            : 'bg-rose-50 text-rose-800 ring-rose-100';
      detailEl.innerHTML = `
        <div class="space-y-4">
          <div>
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-xl font-black text-slate-900">${escapeHtml(item.label || item.id)}</h2>
                <p class="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">${escapeHtml(currentFecha)}</p>
              </div>
              <span class="rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ring-1 ${statusClass}">${escapeHtml(statusText)}</span>
            </div>
          </div>
          <dl class="grid grid-cols-2 gap-2 text-xs">
            <div class="rounded-xl border border-slate-100 bg-slate-50 p-3"><dt class="font-black uppercase tracking-wide text-slate-500">Capacidad</dt><dd class="mt-1 font-bold text-slate-900">${capacidad} personas</dd></div>
            <div class="rounded-xl border border-slate-100 bg-slate-50 p-3"><dt class="font-black uppercase tracking-wide text-slate-500">Base</dt><dd class="mt-1 font-bold text-slate-900">${precio > 0 ? `$${precio.toFixed(2)}` : 'Incluida'}</dd></div>
          </dl>
          ${item.notes || metadata.description ? `<p class="rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-xs font-semibold leading-5 text-cyan-950">${escapeHtml(metadata.description || item.notes)}</p>` : ''}
          <label class="block text-xs font-black uppercase tracking-wide text-slate-500">Extras
            <select id="reservar-extra" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900">
              <option value="0">Sin extras</option>
              <option value="80">Hielera / apoyo $80</option>
              <option value="150">Decoracion sencilla $150</option>
            </select>
          </label>
          <label class="block text-xs font-black uppercase tracking-wide text-slate-500">Codigo de descuento
            <input id="reservar-descuento" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900" placeholder="Opcional" />
          </label>
          <label class="block text-xs font-black uppercase tracking-wide text-slate-500">Metodo de pago
            <select id="reservar-pago" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900">
              <option value="taquilla">Taquilla</option>
              <option value="online">Online</option>
            </select>
          </label>
          <div id="reservar-total" class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-black text-slate-900">Total estimado: $${precio.toFixed(2)}</div>
          <button type="button" id="reservar-confirmar-mesa" ${canReserve ? '' : 'disabled'} class="w-full rounded-xl ${canReserve ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300'} px-4 py-3 text-sm font-black text-white">
            ${canReserve ? 'Confirmar apartado' : 'No disponible'}
          </button>
        </div>
      `;
      const totalEl = document.getElementById('reservar-total');
      const updateTotal = () => {
        const extra = Number(document.getElementById('reservar-extra')?.value || 0);
        const code = String(document.getElementById('reservar-descuento')?.value || '').trim().toUpperCase();
        const discount = code ? Math.min(50, (precio + extra) * 0.1) : 0;
        if (totalEl) totalEl.textContent = `Total estimado: $${Math.max(0, precio + extra - discount).toFixed(2)}`;
      };
      document.getElementById('reservar-extra')?.addEventListener('change', updateTotal);
      document.getElementById('reservar-descuento')?.addEventListener('input', updateTotal);
      document.getElementById('reservar-confirmar-mesa')?.addEventListener('click', () => reserveMesa(item));
    }

    async function reserveMesa(item) {
      const user = auth.currentUser;
      if (!user) {
        await showAlert('Inicia sesión para apartar una mesa.', { title: 'Cuenta', variant: 'warning' });
        navigateTo('/login');
        return;
      }

      if (apartadas.has(item.id)) {
        if (stateByMapItemId.get(item.id) === 'ocupada') {
          await showAlert('Esta mesa ya está ocupada para esta fecha.', { title: 'Mesa', variant: 'warning' });
          return;
        }
        const mine = ownerByMapItemId.get(item.id) === user.uid || (await checkMine(item.id));
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
          await loadApartadasBase();
          connectLive();
          await showAlert('Alguien acaba de apartar esta mesa. Actualiza e intenta otra.', {
            title: 'Mesa',
            variant: 'warning'
          });
          return;
        }

        const claim = await claimMesaReservaLive({
          fechaDia: currentFecha,
          mapItemId: item.id,
          userId: user.uid
        });
        if (!claim.acquired) {
          await loadApartadasBase();
          connectLive();
          await showAlert('La mesa fue tomada por otro usuario justo ahora.', {
            title: 'Mesa',
            variant: 'warning'
          });
          return;
        }

        // doble verificacion contra fuente canonical
        const chkAfter = await checkMesaReservaLibre({
          fechaDia: currentFecha,
          mapItemId: item.id
        });
        if ((chkAfter.data?.mesaReservas || []).length > 0) {
          const live = await getMesaReservaLive(currentFecha, item.id);
          if (!live || live.userId !== user.uid) {
            await clearMesaReservaLive(currentFecha, item.id);
          }
          await loadApartadasBase();
          connectLive();
          await showAlert('La mesa ya estaba ocupada en servidor.', {
            title: 'Mesa',
            variant: 'warning'
          });
          return;
        }

        await createMesaReserva({ fechaDia: currentFecha, mapItemId: item.id });
        await upsertMesaReservaLive({
          fechaDia: currentFecha,
          mapItemId: item.id,
          userId: user.uid,
          estado: 'apartada'
        });
        await showAlert(`Mesa ${item.label || item.id} apartada para el ${currentFecha}.`, {
          title: 'Listo',
          variant: 'success'
        });
        await loadApartadasBase();
        connectLive();
        await renderMis();
        openMesaDetail(item);
      } catch (e) {
        console.error(e);
        try {
          const live = await getMesaReservaLive(currentFecha, item.id);
          if (live?.userId === user.uid) await clearMesaReservaLive(currentFecha, item.id);
        } catch {
          // noop
        }
        const msg = isDataConnectMissing(e)
          ? 'Despliega Data Connect con MesaReserva o revisa la consola.'
          : e?.message || 'No se pudo apartar.';
        await showAlert(msg, { title: 'Error', variant: 'danger' });
      }
    }

    canvas.addEventListener('click', async (ev) => {
      if (!mapJson || parsedEmpty || mesaViewer) return;
      const idx = findMapItemIndexAtClientPoint(canvas, mapJson, ev.clientX, ev.clientY);
      const data = parseDistribucionJson(mapJson);
      openMesaDetail(data.items[idx]);
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

    try {
      await sweepExpiredMesaReservas();
    } catch (e) {
      console.warn('sweep expired mesas', e);
    }
    await loadApartadasBase();
    connectLive();
    await renderMis();

    auth.onAuthStateChanged(() => {
      renderMis();
      redraw();
    });

    const onPopstate = () => {
      if (unsubscribeLive) unsubscribeLive();
    };
    window.addEventListener('popstate', onPopstate);
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
