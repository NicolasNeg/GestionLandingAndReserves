import { getCurrentUser, onAuthChange } from '../lib/authProvider.js';
import { navigateTo } from '../router.js';
import {
  getLandingPage,
  listMesaReservasActivasPorFecha,
  listMisMesaReservas,
  checkMesaReservaLibre,
  createMesaReservaMonetizable,
  cancelarMesaReserva
} from '../lib/dataLayer.js';
import { addToCart } from '../lib/cart.js';
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
import { getBackendErrorMessage, isBackendOperationUnavailable, isPermissionError } from '../lib/backendErrors.js';

const LANDING_PAGE_ID = 'main';

const isBackendUnavailable = isBackendOperationUnavailable;

const TABLE_STATUS_META = {
  libre: {
    label: 'Libre',
    className: 'bg-emerald-50 text-emerald-800 ring-emerald-100'
  },
  apartada_mia: {
    label: 'Apartada por mi',
    className: 'bg-amber-50 text-amber-800 ring-amber-100'
  },
  apartada: {
    label: 'Apartada por otro',
    className: 'bg-rose-50 text-rose-800 ring-rose-100'
  },
  ocupada: {
    label: 'Ocupada',
    className: 'bg-indigo-50 text-indigo-800 ring-indigo-100'
  },
  no_reservable: {
    label: 'No reservable',
    className: 'bg-slate-100 text-slate-700 ring-slate-200'
  }
};

const moneyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN'
});

function parsePersistedExtrasJson(raw) {
  try {
    const x = JSON.parse(typeof raw === 'string' && raw.trim() ? raw : '[]');
    return Array.isArray(x) ? x : [];
  } catch {
    return [];
  }
}

function labelMetodoReserva(v) {
  if (v === 'taquilla') return 'Pagar en taquilla';
  if (v === 'checkout_later') return 'Agregar a checkout / pagar después';
  return 'Por confirmar';
}

function isMesaItem(item) {
  return item?.kind === 'mesa' || item?.kind === 'table' || item?.type === 'table';
}

function normalizeBoolean(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  if (value === false || value === 'false') return false;
  return Boolean(value);
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map((tag) => String(tag || '').trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeExtras(value) {
  const source = Array.isArray(value)
    ? value
    : String(value || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const parts = line.split('|').map((part) => part.trim());
          const twoPartPrice = parts.length === 2 && Number.isFinite(Number(parts[1]));
          return {
            id: twoPartPrice ? slugify(parts[0]) : parts[0],
            label: twoPartPrice ? parts[0] : parts[1],
            price: twoPartPrice ? parts[1] : parts[2]
          };
        });
  return source
    .map((extra, index) => {
      const label = String(extra?.label || extra?.nombre || extra?.id || '').trim();
      if (!label) return null;
      return {
        id: slugify(extra?.id || label) || `extra-${index + 1}`,
        label,
        price: Math.max(0, Number(extra?.price ?? extra?.precio ?? 0) || 0)
      };
    })
    .filter(Boolean);
}

function getMesaMetadata(item) {
  const metadata = item?.metadata || {};
  const rawCapacity = metadata.capacity ?? metadata.capacidad;
  const rawPrice = metadata.price ?? metadata.precio;
  const hasPrice = rawPrice !== undefined && rawPrice !== null && String(rawPrice).trim() !== '';
  const price = hasPrice ? Math.max(0, Number(rawPrice) || 0) : null;
  const tags = normalizeTags(metadata.tags);
  if (metadata.vip && !tags.some((tag) => tag.toLowerCase() === 'vip')) tags.unshift('VIP');
  return {
    name: metadata.publicName || metadata.nombrePublico || item?.label || item?.id || 'Mesa',
    capacity: Math.max(1, parseInt(rawCapacity || '4', 10) || 4),
    hasPrice,
    price,
    priceLabel: hasPrice ? moneyFormatter.format(price) : 'Precio por confirmar',
    vip: Boolean(metadata.vip),
    reservable: normalizeBoolean(metadata.reservable, true) && metadata.estadoVisual !== 'no_reservable',
    zone: metadata.zone || metadata.zona || '',
    description: metadata.description || metadata.descripcion || item?.notes || '',
    tags,
    extrasAllowed: normalizeBoolean(metadata.extrasAllowed, true),
    extras: normalizeExtras(metadata.extras)
  };
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
          <span><i class="bg-slate-500"></i> No reservable</span>
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
    let selectedMesaId = '';
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
    let mapData = parseDistribucionJson('');
    const getMesaItemById = (id) => mapData.items.find((item) => item.id === id && isMesaItem(item));
    const getMesaStatus = (item) => {
      const meta = getMesaMetadata(item);
      if (!meta.reservable) return 'no_reservable';
      const liveState = stateByMapItemId.get(item.id);
      if (liveState === 'ocupada') return 'ocupada';
      if (apartadas.has(item.id) || liveState === 'apartada') {
        const ses = getCurrentUser();
        const myId = ses?.uid ?? ses?.id ?? null;
        return ownerByMapItemId.get(item.id) === myId ? 'apartada_mia' : 'apartada';
      }
      return 'libre';
    };

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
      if (!item || !isMesaItem(item) || !pointer || window.matchMedia('(max-width: 640px)').matches) {
        mapTooltip.classList.add('hidden');
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const meta = getMesaMetadata(item);
      const state = getMesaStatus(item);
      mapTooltip.innerHTML = `
        <strong>${escapeHtml(meta.name)}</strong>
        <span>${escapeHtml(TABLE_STATUS_META[state]?.label || 'Mesa')}</span>
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

    mapData = parseDistribucionJson(mapJson);
    const parsedEmpty = !mapData.items.length;

    const redraw = () => {
      const statusByMapItemId = {};
      mapData.items.filter(isMesaItem).forEach((item) => {
        const state = getMesaStatus(item);
        if (state !== 'libre') statusByMapItemId[item.id] = state;
      });
      apartadas.forEach((id) => {
        const item = getMesaItemById(id);
        if (!item) return;
        statusByMapItemId[id] = getMesaStatus(item);
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
        if (isBackendUnavailable(e)) {
          setMsg(
            'Servicio de reservas no disponible: aplica supabase/schema.sql y revisa que existan mesas_reservas / políticas RLS.',
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
          if (selectedMesaId) openMesaDetail(getMesaItemById(selectedMesaId));
          setMsg('Sincronizado en vivo.', 'ok');
          setLivePill('En vivo', 'ok');
        },
        (e) => {
          if (!isPermissionError(e)) {
            console.warn('mesa realtime', getBackendErrorMessage(e));
          }
          setMsg('Sin realtime; mostrando último estado.', 'danger');
          setLivePill('Sin realtime', 'danger');
        }
      );
    };

    const renderMis = async () => {
      if (!misEl) return;
      const user = getCurrentUser();
      if (!user) {
        misEl.innerHTML =
          '<p class="text-slate-500">Inicia sesión para ver y gestionar tus mesas apartadas.</p>';
        return;
      }
      try {
        const res = await listMisMesaReservas({ userId: user.uid ?? user.id });
        const all = res.data?.mesaReservas || [];
        const mineToday = all.filter((r) => r.fechaDia === currentFecha && r.estado === 'apartada');
        if (!mineToday.length) {
          misEl.innerHTML = '<p class="text-slate-500">No tienes mesas apartadas en esta fecha.</p>';
          return;
        }
        misEl.innerHTML = mineToday
          .map(
            (r) => {
              const item = getMesaItemById(r.mapItemId);
              const meta = item ? getMesaMetadata(item) : null;
              const name = (r.mesaLabel && String(r.mesaLabel).trim()) || meta?.name || r.mapItemId;
              const zone = (r.mesaZona && String(r.mesaZona).trim()) || meta?.zone || '';
              const hasSnapPrice = r.mesaPrecio != null && Number(r.mesaPrecio) > 0;
              const mesaPrecioLabel = hasSnapPrice
                ? moneyFormatter.format(Number(r.mesaPrecio))
                : meta?.hasPrice
                  ? escapeHtml(meta.priceLabel)
                  : 'Precio por confirmar';
              const extrasList = parsePersistedExtrasJson(r.extrasJson);
              const extrasLine =
                extrasList.length > 0
                  ? extrasList.map((ex) => `${escapeHtml(ex.label || ex.id || '')} (${moneyFormatter.format(Number(ex.price) || 0)})`).join(' · ')
                  : 'Sin extras';
              const totalLine =
                r.totalReserva != null && Number.isFinite(Number(r.totalReserva))
                  ? moneyFormatter.format(Number(r.totalReserva))
                  : meta?.hasPrice
                    ? moneyFormatter.format((meta.price || 0) + (Number(r.totalExtras) || 0))
                    : 'Por confirmar';
              const metodo = labelMetodoReserva(r.metodoPago || 'por_confirmar');
              const pagoEstado = r.estadoPago ? escapeHtml(r.estadoPago) : 'pendiente';
              return `
          <div class="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate font-black text-slate-900">${escapeHtml(name)}</p>
                <p class="mt-0.5 text-xs font-semibold text-slate-500">${escapeHtml(r.fechaDia || currentFecha)} · ${escapeHtml(r.estado || 'apartada')}</p>
                ${zone ? `<p class="mt-1 text-xs font-bold text-teal-700">${escapeHtml(zone)}</p>` : ''}
                <p class="mt-1 text-xs font-semibold text-slate-600">Precio mesa: ${mesaPrecioLabel}</p>
                <p class="mt-1 text-[11px] font-semibold leading-4 text-slate-600">Extras: ${extrasLine}</p>
                <p class="mt-1 text-xs font-black text-slate-900">Total reserva: ${totalLine}</p>
                <p class="mt-1 text-[11px] font-semibold text-slate-500">${escapeHtml(metodo)} · Pago: ${pagoEstado}</p>
              </div>
              <button type="button" data-cancel-r="${r.id}" data-cancel-map="${escapeHtml(r.mapItemId)}" class="shrink-0 rounded-lg border border-rose-200 px-2 py-1 text-xs font-black text-rose-700 hover:bg-rose-50">
                Cancelar
              </button>
            </div>
          </div>`;
            }
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
              if (selectedMesaId) openMesaDetail(getMesaItemById(selectedMesaId));
              setMsg('');
            } catch (e) {
              console.error(e);
              await showAlert(e?.message || 'No se pudo cancelar.', { title: 'Error', variant: 'danger' });
            }
          });
        });
      } catch (e) {
        if (isBackendUnavailable(e)) {
          misEl.innerHTML =
            '<p class="text-rose-600 text-xs">Postgres sin tabla mesas/reservas o sin permisos (RLS). Revisa Supabase.</p>';
        } else {
          misEl.innerHTML = '<p class="text-rose-600 text-xs">No se pudo cargar tu lista.</p>';
        }
      }
    };

    fechaInput.addEventListener('change', async () => {
      const v = (fechaInput.value || '').trim();
      if (!isValidFechaDia(v)) return;
      currentFecha = v;
      selectedMesaId = '';
      setMsg('');
      setPanelOpen(false);
      if (detailEl) detailEl.innerHTML = 'Toca una mesa libre para revisar detalles y confirmar.';
      await loadApartadasBase();
      connectLive();
      await renderMis();
    });

    function openMesaDetail(item) {
      if (!detailEl) return;
      if (!item || !isMesaItem(item)) {
        selectedMesaId = '';
        setPanelOpen(false);
        detailEl.innerHTML = '<p class="text-slate-500">Selecciona una mesa disponible del mapa.</p>';
        return;
      }
      selectedMesaId = item.id;
      setPanelOpen(true);
      const meta = getMesaMetadata(item);
      const status = getMesaStatus(item);
      const statusMeta = TABLE_STATUS_META[status] || TABLE_STATUS_META.libre;
      const user = getCurrentUser();
      const canReserve = status === 'libre' && meta.reservable && Boolean(user);
      const needsLogin = status === 'libre' && meta.reservable && !user;
      const tagsHtml = meta.tags.length
        ? `<div class="flex flex-wrap gap-1.5">${meta.tags.map((tag) => `<span class="rounded-full bg-teal-50 px-2 py-1 text-[11px] font-black text-teal-700">${escapeHtml(tag)}</span>`).join('')}</div>`
        : '<p class="text-xs font-semibold text-slate-400">Sin tags publicados.</p>';
      const extras = meta.extrasAllowed ? meta.extras : [];
      const extrasHtml = extras.length
        ? extras.map((extra) => `
            <label class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
              <span class="flex items-center gap-2">
                <input type="checkbox" data-reserva-extra="${escapeHtml(extra.id)}" data-extra-label="${escapeHtml(extra.label)}" data-extra-price="${extra.price}" class="h-4 w-4 rounded border-slate-300" />
                ${escapeHtml(extra.label)}
              </span>
              <span class="text-xs font-black text-slate-500">${moneyFormatter.format(extra.price)}</span>
            </label>
          `).join('')
        : `<p class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-500">${meta.extrasAllowed ? 'Sin extras publicados para esta mesa.' : 'Extras no habilitados para esta mesa.'}</p>`;
      detailEl.innerHTML = `
        <div class="space-y-4">
          <div>
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-xl font-black text-slate-900">${escapeHtml(meta.name)}</h2>
                <p class="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">${escapeHtml(currentFecha)}</p>
              </div>
              <span class="rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ring-1 ${statusMeta.className}">${escapeHtml(statusMeta.label)}</span>
            </div>
          </div>
          <dl class="grid grid-cols-2 gap-2 text-xs">
            <div class="rounded-xl border border-slate-100 bg-slate-50 p-3"><dt class="font-black uppercase tracking-wide text-slate-500">Capacidad</dt><dd class="mt-1 font-bold text-slate-900">${meta.capacity} personas</dd></div>
            <div class="rounded-xl border border-slate-100 bg-slate-50 p-3"><dt class="font-black uppercase tracking-wide text-slate-500">Precio base</dt><dd class="mt-1 font-bold text-slate-900">${escapeHtml(meta.priceLabel)}</dd></div>
            <div class="rounded-xl border border-slate-100 bg-slate-50 p-3"><dt class="font-black uppercase tracking-wide text-slate-500">Zona</dt><dd class="mt-1 font-bold text-slate-900">${escapeHtml(meta.zone || 'Por definir')}</dd></div>
            <div class="rounded-xl border border-slate-100 bg-slate-50 p-3"><dt class="font-black uppercase tracking-wide text-slate-500">Fecha</dt><dd class="mt-1 font-bold text-slate-900">${escapeHtml(currentFecha)}</dd></div>
          </dl>
          ${meta.description ? `<p class="rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-xs font-semibold leading-5 text-cyan-950">${escapeHtml(meta.description)}</p>` : ''}
          <div>
            <p class="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Tags</p>
            ${tagsHtml}
          </div>
          ${needsLogin ? '<p class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">Inicia sesion para confirmar esta mesa. Puedes revisar los detalles antes de entrar.</p>' : ''}
          <div>
            <p class="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Extras visuales</p>
            <div class="space-y-2">${extrasHtml}</div>
            <p class="mt-2 text-[11px] font-semibold leading-4 text-slate-500">Extras sujetos a confirmacion/pago en taquilla o checkout segun configuracion.</p>
          </div>
          <div>
            <p class="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Forma de pago (sin cargo online en esta fase)</p>
            <div class="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
              <label class="flex cursor-pointer items-start gap-2 text-sm font-semibold text-slate-800">
                <input type="radio" name="reserva-metodo-pago" value="taquilla" class="mt-1" checked />
                <span>Pagar en taquilla</span>
              </label>
              <label class="flex cursor-pointer items-start gap-2 text-sm font-semibold text-slate-800">
                <input type="radio" name="reserva-metodo-pago" value="checkout_later" class="mt-1" />
                <span>Agregar al carrito y pagar después en checkout</span>
              </label>
              <label class="flex cursor-pointer items-start gap-2 text-sm font-semibold text-slate-800">
                <input type="radio" name="reserva-metodo-pago" value="por_confirmar" class="mt-1" />
                <span>Por confirmar con el personal</span>
              </label>
            </div>
          </div>
          <div id="reservar-total" class="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"></div>
          <div class="grid gap-2">
            ${needsLogin ? '<button type="button" id="reservar-login-mesa" class="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white hover:bg-slate-700">Iniciar sesion para apartar</button>' : ''}
            ${canReserve ? '<button type="button" id="reservar-confirmar-mesa" class="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700">Confirmar apartado</button>' : (needsLogin ? '' : `<button type="button" disabled class="w-full rounded-xl bg-slate-300 px-4 py-3 text-sm font-black text-white">${escapeHtml(statusMeta.label)}</button>`)}
            <button type="button" id="reservar-cerrar-detalle" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Cerrar</button>
          </div>
        </div>
      `;
      const totalEl = document.getElementById('reservar-total');
      const updateTotal = () => {
        const extraTotal = [...document.querySelectorAll('[data-reserva-extra]:checked')]
          .reduce((sum, input) => sum + (Number(input.getAttribute('data-extra-price') || 0) || 0), 0);
        if (!totalEl) return;
        totalEl.innerHTML = `
          <div class="flex justify-between gap-3"><span>Subtotal mesa</span><strong>${meta.hasPrice ? escapeHtml(meta.priceLabel) : 'Precio por confirmar'}</strong></div>
          <div class="flex justify-between gap-3"><span>Extras seleccionados</span><strong>${moneyFormatter.format(extraTotal)}</strong></div>
          <div class="mt-2 flex justify-between gap-3 border-t border-slate-200 pt-2 text-base font-black text-slate-900"><span>Total estimado</span><strong>${meta.hasPrice ? moneyFormatter.format((meta.price || 0) + extraTotal) : 'Por confirmar'}</strong></div>
        `;
      };
      document.querySelectorAll('[data-reserva-extra]').forEach((input) => {
        input.addEventListener('change', updateTotal);
      });
      updateTotal();
      document.getElementById('reservar-login-mesa')?.addEventListener('click', () => navigateTo('/login'));
      document.getElementById('reservar-cerrar-detalle')?.addEventListener('click', () => setPanelOpen(false));
      document.getElementById('reservar-confirmar-mesa')?.addEventListener('click', () => reserveMesa(item));
    }

    async function reserveMesa(item) {
      const user = getCurrentUser();
      if (!user) {
        await showAlert('Inicia sesión para apartar una mesa.', { title: 'Cuenta', variant: 'warning' });
        navigateTo('/login');
        return;
      }
      const currentItem = getMesaItemById(item?.id);
      if (!currentItem) {
        await showAlert('La mesa ya no existe en el plano publicado.', { title: 'Mesa', variant: 'warning' });
        return;
      }
      if (!isMesaItem(currentItem)) {
        await showAlert('Selecciona una mesa valida del mapa.', { title: 'Mesa', variant: 'warning' });
        return;
      }
      const meta = getMesaMetadata(currentItem);
      if (!meta.reservable) {
        await showAlert('Esta mesa no esta disponible para apartado en linea.', { title: 'Mesa', variant: 'warning' });
        openMesaDetail(currentItem);
        return;
      }
      item = currentItem;

      if (apartadas.has(item.id)) {
        if (stateByMapItemId.get(item.id) === 'ocupada') {
          await showAlert('Esta mesa ya está ocupada para esta fecha.', { title: 'Mesa', variant: 'warning' });
          return;
        }
        const mine =
          ownerByMapItemId.get(item.id) === (user.uid ?? user.id) || (await checkMine(item.id));
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
          userId: user.uid ?? user.id
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
        const blockers = chkAfter.data?.mesaReservas || [];
        const myId = user.uid ?? user.id;
        const blockedByOther = blockers.some((row) => row.userId && row.userId !== myId);
        if (blockedByOther) {
          const live = await getMesaReservaLive(currentFecha, item.id);
          if (!live || live.userId !== myId) {
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

        const metodoEl = detailEl?.querySelector('input[name="reserva-metodo-pago"]:checked');
        const metodoPago = metodoEl ? String(metodoEl.value || 'por_confirmar') : 'por_confirmar';
        const extrasSelected = [];
        detailEl?.querySelectorAll('[data-reserva-extra]:checked').forEach((input) => {
          const id = input.getAttribute('data-reserva-extra') || '';
          const label = input.getAttribute('data-extra-label') || id;
          const price = Number(input.getAttribute('data-extra-price') || 0) || 0;
          if (id) extrasSelected.push({ id, label, price });
        });
        const totalExtras = extrasSelected.reduce((s, x) => s + (Number(x.price) || 0), 0);
        const subtotalMesa = meta.hasPrice ? Number(meta.price || 0) : 0;
        const totalReserva = subtotalMesa + totalExtras;
        const extrasJson = JSON.stringify(extrasSelected);
        const insertRes = await createMesaReservaMonetizable({
          fechaDia: currentFecha,
          mapItemId: item.id,
          mesaLabel: meta.name || item.id,
          mesaZona: meta.zone || '',
          mesaCapacidad: meta.capacity || 0,
          mesaPrecio: meta.hasPrice ? Number(meta.price || 0) : 0,
          extrasJson,
          subtotalMesa,
          totalExtras,
          totalReserva,
          estadoPago: 'pendiente',
          metodoPago,
          notasCliente: ''
        });
        const newId = insertRes?.data?.mesaReserva_insert?.id;
        if (metodoPago === 'checkout_later' && newId) {
          try {
            addToCart({
              key: `mesa_reserva:${newId}`,
              type: 'mesa_reserva',
              id: String(newId),
              name: `Mesa · ${meta.name} · ${currentFecha}`,
              price: totalReserva,
              qty: 1,
              meta: { mesaReservaId: newId, fechaDia: currentFecha, mapItemId: item.id }
            });
          } catch (cartErr) {
            console.warn('Carrito mesa_reserva:', cartErr);
          }
        }
        const liveSync = await upsertMesaReservaLive({
          fechaDia: currentFecha,
          mapItemId: item.id,
          userId: user.uid ?? user.id,
          estado: 'apartada'
        });
        if (liveSync?.skipped) {
          console.warn('Reserva creada; realtime omitido:', liveSync.reason || 'no disponible');
          setMsg('Apartado guardado en servidor; aviso en vivo no disponible.', 'danger');
        } else {
          setMsg('');
        }
        let okMsg = `${meta.name} apartada para el ${currentFecha}.`;
        if (metodoPago === 'checkout_later' && newId) {
          okMsg += ' Revisa el carrito en Checkout para pagar después.';
        }
        await showAlert(okMsg, {
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
          if (live?.userId === (user.uid ?? user.id)) await clearMesaReservaLive(currentFecha, item.id);
        } catch {
          // noop
        }
        const msg = isBackendUnavailable(e)
          ? 'Revisa Supabase (schema, tablas mesas/reservas, RLS) o la consola.'
          : e?.message || 'No se pudo apartar.';
        await showAlert(msg, { title: 'Error', variant: 'danger' });
      }
    }

    canvas.addEventListener('click', async (ev) => {
      if (!mapJson || parsedEmpty || mesaViewer) return;
      const idx = findMapItemIndexAtClientPoint(canvas, mapJson, ev.clientX, ev.clientY);
      openMesaDetail(mapData.items[idx]);
    });

    async function checkMine(mapItemId) {
      const user = getCurrentUser();
      if (!user) return false;
      try {
        const res = await listMisMesaReservas({ userId: user.uid ?? user.id });
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

    onAuthChange(() => {
      renderMis();
      redraw();
      if (selectedMesaId) openMesaDetail(getMesaItemById(selectedMesaId));
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
