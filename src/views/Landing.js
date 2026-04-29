import {
  listPaquetes,
  getLandingPage,
  listServiciosLanding
} from '../dataconnect-generated';
import { drawDistribucionCanvas, DEFAULT_MAPA_JSON } from '../lib/distribucionMapa.js';

const LANDING_PAGE_ID = 'main';

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 2
});

const defaultLanding = () => ({
  descripcionParque:
    'Balneario San Antonio Texas: espacios para la familia, albercas, areas verdes y atencion cercana. Configura este texto desde el panel de personal.',
  mapaDistribucionJson: DEFAULT_MAPA_JSON,
  imagenSatelitalUrl: '',
  googleMapsUrl: '',
  horariosTexto: 'Horario habitual: consulta en taquilla o actualiza este texto desde el panel.',
  abiertoAhora: true,
  ocupacionTexto: 'Ocupacion: informacion manual (proximamente automatica).',
  estacionamientoTexto: 'Estacionamiento: disponibilidad segun temporada.',
  botonesJson: '[]'
});

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseBotones(jsonStr) {
  try {
    const arr = JSON.parse(jsonStr || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function buildButtonHref(btn) {
  const type = (btn.type || '').toLowerCase();
  if (type === 'whatsapp') {
    const digits = String(btn.value || '').replace(/\D/g, '');
    if (!digits) return '#';
    return `https://wa.me/${digits}`;
  }
  if (type === 'mail') {
    const mail = String(btn.value || '').trim();
    if (!mail) return '#';
    return `mailto:${mail}`;
  }
  if (type === 'custom') {
    const href = String(btn.href || btn.value || '').trim();
    if (!href) return '#';
    return href;
  }
  return '#';
}

function renderBotones(botones) {
  if (!botones.length) {
    return '<p class="text-sm text-slate-500">Los accesos rapidos se configuran desde el panel del personal.</p>';
  }
  return botones
    .map((btn, i) => {
      const label = escapeHtml(btn.label || 'Enlace');
      const href = buildButtonHref(btn);
      const type = (btn.type || '').toLowerCase();
      const external =
        type === 'custom' &&
        (btn.external === true ||
          /^https?:\/\//i.test(href));
      if (external && href !== '#') {
        return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">${label}</a>`;
      }
      const path = href.startsWith('/') ? href : `/${href.replace(/^\//, '')}`;
      return `<a href="${escapeHtml(path)}" data-link class="inline-flex items-center justify-center rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">${label}</a>`;
    })
    .join('');
}

const renderPaqueteCard = (paquete) => `
  <article class="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
    <div class="mb-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
      Paquete especial
    </div>
    <h3 class="text-xl font-bold text-gray-900">${escapeHtml(paquete.nombre)}</h3>
    <p class="mt-2 min-h-18 text-sm text-gray-600">${escapeHtml(paquete.descripcion)}</p>
    <div class="mt-4 flex items-end justify-between">
      <div>
        <p class="text-xs text-gray-500">Desde</p>
        <p class="text-2xl font-extrabold text-blue-700">${currencyFormatter.format(paquete.precioBase)}</p>
      </div>
      <p class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        Incluye ${paquete.incluyePersonas} personas
      </p>
    </div>
    <a href="/checkout" data-link class="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700">
      Reservar este paquete
    </a>
  </article>
`;

const renderPaquetes = (paquetes) => {
  if (!paquetes.length) {
    return `
      <div class="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-6 text-center text-sm text-blue-700">
        Aun no hay paquetes especiales publicados. Vuelve pronto para ver nuevas promociones.
      </div>
    `;
  }
  return `
    <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      ${paquetes.map(renderPaqueteCard).join('')}
    </div>
  `;
};

const navItems = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'descripcion', label: 'El parque' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'estado', label: 'Horario y estado' },
  { id: 'mapa', label: 'Mapa' },
  { id: 'vista-aerea', label: 'Vista aerea' },
  { id: 'paquetes', label: 'Paquetes' },
  { id: 'contacto', label: 'Contacto' }
];

export default {
  async render() {
    const navDesktop = navItems
      .map(
        (n) =>
          `<a href="#${n.id}" class="home-nav-link block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-800">${n.label}</a>`
      )
      .join('');

    return `
      <div class="relative flex min-h-[calc(100vh-64px)] w-full bg-slate-50 text-slate-900">
        <!-- Overlay mobile -->
        <div id="home-nav-overlay" class="fixed inset-0 z-40 hidden bg-black/40 lg:hidden" aria-hidden="true"></div>

        <!-- Sidebar desktop -->
        <aside class="sticky top-[64px] z-30 hidden h-[calc(100vh-64px)] w-56 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <div class="border-b border-slate-100 p-4">
            <p class="text-xs font-bold uppercase tracking-wider text-blue-600">Explorar</p>
            <p class="mt-1 text-sm text-slate-500">Navega por la pagina</p>
          </div>
          <nav class="flex flex-col gap-1 overflow-y-auto p-3" id="home-nav-desktop" aria-label="Secciones">
            ${navDesktop}
          </nav>
        </aside>

        <!-- Sidebar mobile drawer -->
        <aside id="home-nav-drawer" class="fixed left-0 top-[64px] z-50 h-[calc(100vh-64px)] w-72 max-w-[85vw] -translate-x-full transform border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 lg:hidden" aria-hidden="true">
          <div class="border-b border-slate-100 p-4">
            <p class="text-xs font-bold uppercase tracking-wider text-blue-600">Menu</p>
          </div>
          <nav class="flex flex-col gap-1 overflow-y-auto p-3" id="home-nav-mobile">
            ${navDesktop}
          </nav>
        </aside>

        <div class="flex min-w-0 flex-1 flex-col">
          <button type="button" id="home-nav-toggle" class="fixed left-4 top-20 z-40 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-md lg:hidden" aria-expanded="false" aria-controls="home-nav-drawer">
            <span>Menu</span>
          </button>

          <main class="flex-1 pb-16 pt-14 lg:pt-6">
            <section id="inicio" class="scroll-mt-24 bg-gradient-to-br from-blue-950 via-blue-900 to-sky-900 px-4 py-16 text-white sm:px-8">
              <div class="mx-auto max-w-5xl">
                <p class="mb-3 text-xs font-bold uppercase tracking-widest text-amber-200/90">Balneario San Antonio Texas</p>
                <h1 class="text-4xl font-black leading-tight sm:text-5xl">Tu dia perfecto empieza aqui</h1>
                <p class="mt-5 max-w-2xl text-base text-blue-100 sm:text-lg">
                  Reserva en linea, revisa paquetes y conoce el parque. Todo el contenido de esta pagina puede actualizarlo el personal desde el panel administrativo.
                </p>
                <div class="mt-8 flex flex-wrap gap-3">
                  <a href="/reservar" data-link class="rounded-xl bg-amber-400 px-6 py-3 font-bold text-slate-900 shadow transition hover:bg-amber-300">Mapa de mesas</a>
                  <a href="/checkout" data-link class="rounded-xl border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10">Compra rapida</a>
                </div>
              </div>
            </section>

            <section id="descripcion" class="scroll-mt-24 border-b border-slate-200 bg-white px-4 py-14 sm:px-8">
              <div class="mx-auto max-w-5xl">
                <h2 class="text-2xl font-black text-slate-900 sm:text-3xl">Sobre nuestro parque</h2>
                <div id="landing-descripcion" class="prose prose-slate mt-6 max-w-none whitespace-pre-wrap text-slate-600"></div>
              </div>
            </section>

            <section id="servicios" class="scroll-mt-24 bg-slate-50 px-4 py-14 sm:px-8">
              <div class="mx-auto max-w-5xl">
                <h2 class="text-2xl font-black text-slate-900 sm:text-3xl">Servicios</h2>
                <p class="mt-2 text-sm text-slate-500">Gestionados desde el panel del personal.</p>
                <div id="landing-servicios" class="mt-8 grid gap-6 sm:grid-cols-2">
                  <p class="text-sm text-slate-500">Cargando servicios...</p>
                </div>
              </div>
            </section>

            <section id="estado" class="scroll-mt-24 border-y border-slate-200 bg-white px-4 py-14 sm:px-8">
              <div class="mx-auto max-w-5xl">
                <h2 class="text-2xl font-black text-slate-900 sm:text-3xl">Horario y estado</h2>
                <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div class="rounded-2xl border border-slate-100 bg-slate-50 p-5 shadow-sm">
                    <p class="text-xs font-bold uppercase text-slate-500">Horarios</p>
                    <p id="landing-horarios" class="mt-2 text-sm font-medium text-slate-800 whitespace-pre-wrap"></p>
                  </div>
                  <div class="rounded-2xl border border-slate-100 bg-slate-50 p-5 shadow-sm">
                    <p class="text-xs font-bold uppercase text-slate-500">Abierto ahora</p>
                    <p id="landing-abierto" class="mt-2 text-lg font-black"></p>
                  </div>
                  <div class="rounded-2xl border border-slate-100 bg-slate-50 p-5 shadow-sm">
                    <p class="text-xs font-bold uppercase text-slate-500">Ocupacion</p>
                    <p id="landing-ocupacion" class="mt-2 text-sm font-medium text-slate-800 whitespace-pre-wrap"></p>
                  </div>
                  <div class="rounded-2xl border border-slate-100 bg-slate-50 p-5 shadow-sm">
                    <p class="text-xs font-bold uppercase text-slate-500">Estacionamiento</p>
                    <p id="landing-estacionamiento" class="mt-2 text-sm font-medium text-slate-800 whitespace-pre-wrap"></p>
                  </div>
                </div>
              </div>
            </section>

            <section id="mapa" class="scroll-mt-24 bg-slate-50 px-4 py-14 sm:px-8">
              <div class="mx-auto max-w-5xl">
                <h2 class="text-2xl font-black text-slate-900 sm:text-3xl">Distribucion del parque</h2>
                <p class="mt-2 max-w-2xl text-sm text-slate-600">Mapa editable por el personal (zonas rectangulares). Proximamente mas automatizacion.</p>
                <div class="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <canvas id="landing-mapa-canvas" width="800" height="440" class="mx-auto block max-w-full rounded-lg border border-slate-100"></canvas>
                </div>
              </div>
            </section>

            <section id="vista-aerea" class="scroll-mt-24 bg-white px-4 py-14 sm:px-8">
              <div class="mx-auto max-w-5xl">
                <h2 class="text-2xl font-black text-slate-900 sm:text-3xl">Vista aerea</h2>
                <p class="mt-2 text-sm text-slate-500">Imagen satelital o aerea y enlace a Google Maps (actualizables desde el panel).</p>
                <div id="landing-satelite-wrap" class="mt-8 hidden">
                  <img id="landing-satelite-img" src="" alt="Vista aerea del parque" class="max-h-[480px] w-full rounded-2xl border border-slate-200 object-cover shadow-md" loading="lazy" />
                </div>
                <div id="landing-maps-link-wrap" class="mt-6 hidden">
                  <a id="landing-maps-link" href="#" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700">Abrir en Google Maps</a>
                </div>
                <p id="landing-satelite-placeholder" class="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Aun no hay imagen ni enlace configurados. El personal puede agregarlos desde el panel.
                </p>
              </div>
            </section>

            <section id="paquetes" class="scroll-mt-24 border-t border-slate-200 bg-slate-50 px-4 py-14 sm:px-8">
              <div class="mx-auto max-w-5xl">
                <h2 class="text-2xl font-black text-slate-900 sm:text-3xl">Paquetes disponibles</h2>
                <div id="landing-paquetes" class="mt-8 min-h-24 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
                  <p class="text-sm text-gray-500">Cargando paquetes...</p>
                </div>
              </div>
            </section>

            <section id="contacto" class="scroll-mt-24 bg-white px-4 py-14 sm:px-8">
              <div class="mx-auto max-w-5xl">
                <h2 class="text-2xl font-black text-slate-900 sm:text-3xl">Contacto y enlaces</h2>
                <div id="landing-botones" class="mt-6 flex flex-wrap gap-3"></div>
                <p class="mt-8 text-sm text-slate-500">
                  <a href="/politicas" data-link class="font-semibold text-blue-700 hover:underline">Politicas de privacidad</a>
                </p>
              </div>
            </section>
          </main>
        </div>
      </div>
    `;
  },

  async mount() {
    const mergeLanding = (row) => {
      const d = defaultLanding();
      if (!row) return d;
      return {
        descripcionParque: row.descripcionParque ?? d.descripcionParque,
        mapaDistribucionJson: row.mapaDistribucionJson || d.mapaDistribucionJson,
        imagenSatelitalUrl: row.imagenSatelitalUrl ?? '',
        googleMapsUrl: row.googleMapsUrl ?? '',
        horariosTexto: row.horariosTexto ?? d.horariosTexto,
        abiertoAhora: Boolean(row.abiertoAhora),
        ocupacionTexto: row.ocupacionTexto ?? d.ocupacionTexto,
        estacionamientoTexto: row.estacionamientoTexto ?? d.estacionamientoTexto,
        botonesJson: row.botonesJson != null && row.botonesJson !== '' ? row.botonesJson : d.botonesJson
      };
    };

    let landing = defaultLanding();
    try {
      const res = await getLandingPage({ id: LANDING_PAGE_ID });
      landing = mergeLanding(res.data?.landingPage);
    } catch (e) {
      console.warn('Landing page no disponible aun (despliega Data Connect y crea fila main):', e);
    }

    const descEl = document.getElementById('landing-descripcion');
    if (descEl) descEl.textContent = landing.descripcionParque;

    const horarios = document.getElementById('landing-horarios');
    if (horarios) horarios.textContent = landing.horariosTexto;

    const abierto = document.getElementById('landing-abierto');
    if (abierto) {
      abierto.textContent = landing.abiertoAhora ? 'Si, abierto' : 'Cerrado por hoy';
      abierto.className = `mt-2 text-lg font-black ${landing.abiertoAhora ? 'text-emerald-600' : 'text-rose-600'}`;
    }

    const oc = document.getElementById('landing-ocupacion');
    if (oc) oc.textContent = landing.ocupacionTexto;

    const est = document.getElementById('landing-estacionamiento');
    if (est) est.textContent = landing.estacionamientoTexto;

    const mapCanvas = document.getElementById('landing-mapa-canvas');
    if (mapCanvas) drawDistribucionCanvas(mapCanvas, landing.mapaDistribucionJson);

    const satWrap = document.getElementById('landing-satelite-wrap');
    const satImg = document.getElementById('landing-satelite-img');
    const ph = document.getElementById('landing-satelite-placeholder');
    const mapsWrap = document.getElementById('landing-maps-link-wrap');
    const mapsLink = document.getElementById('landing-maps-link');
    const urlSat = (landing.imagenSatelitalUrl || '').trim();
    const urlMaps = (landing.googleMapsUrl || '').trim();
    if (urlSat && satImg && satWrap) {
      satImg.src = urlSat;
      satWrap.classList.remove('hidden');
      ph?.classList.add('hidden');
    }
    if (urlMaps && mapsLink && mapsWrap) {
      mapsLink.href = urlMaps;
      mapsWrap.classList.remove('hidden');
      ph?.classList.add('hidden');
    }

    const botWrap = document.getElementById('landing-botones');
    if (botWrap) botWrap.innerHTML = renderBotones(parseBotones(landing.botonesJson));

    const serviciosEl = document.getElementById('landing-servicios');
    if (serviciosEl) {
      try {
        const sres = await listServiciosLanding();
        const servicios = sres.data?.servicios || [];
        if (!servicios.length) {
          serviciosEl.innerHTML =
            '<p class="text-sm text-slate-500">No hay servicios publicados. El personal puede crearlos en el panel.</p>';
        } else {
          serviciosEl.innerHTML = servicios
            .map(
              (s) => `
            <article class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 class="text-lg font-bold text-slate-900">${escapeHtml(s.titulo)}</h3>
              <p class="mt-2 text-sm text-slate-600 whitespace-pre-wrap">${escapeHtml(s.descripcion)}</p>
            </article>`
            )
            .join('');
        }
      } catch (e) {
        console.error(e);
        serviciosEl.innerHTML =
          '<p class="text-sm text-rose-600">No se pudieron cargar los servicios.</p>';
      }
    }

    const paquetesContainer = document.getElementById('landing-paquetes');
    if (paquetesContainer) {
      try {
        const response = await listPaquetes();
        const paquetes = response.data?.paquetes || [];
        paquetesContainer.outerHTML = `<div id="landing-paquetes" class="mt-8">${renderPaquetes(paquetes)}</div>`;
      } catch (error) {
        console.error('Paquetes landing:', error);
        paquetesContainer.innerHTML = `
        <div class="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
          No fue posible cargar los paquetes en este momento.
        </div>`;
      }
    }

    const drawer = document.getElementById('home-nav-drawer');
    const overlay = document.getElementById('home-nav-overlay');
    const toggle = document.getElementById('home-nav-toggle');
    const closeNav = () => {
      drawer?.classList.add('-translate-x-full');
      overlay?.classList.add('hidden');
      toggle?.setAttribute('aria-expanded', 'false');
    };
    const openNav = () => {
      drawer?.classList.remove('-translate-x-full');
      overlay?.classList.remove('hidden');
      toggle?.setAttribute('aria-expanded', 'true');
    };

    toggle?.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      if (open) closeNav();
      else openNav();
    });
    overlay?.addEventListener('click', closeNav);

    const scrollToId = (hash) => {
      if (!hash || hash === '#') return;
      const id = hash.replace(/^#/, '');
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      closeNav();
    };

    document.querySelectorAll('.home-nav-link').forEach((a) => {
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        scrollToId(a.getAttribute('href'));
      });
    });
  }
};
