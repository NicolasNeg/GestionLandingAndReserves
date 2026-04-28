import { listPaquetes } from '../dataconnect-generated';

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 2
});

const renderPaqueteCard = (paquete) => `
  <article class="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
    <div class="mb-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
      Paquete especial
    </div>
    <h3 class="text-xl font-bold text-gray-900">${paquete.nombre}</h3>
    <p class="mt-2 min-h-18 text-sm text-gray-600">${paquete.descripcion}</p>
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

export default {
  async render() {
    return `
      <main class="w-full bg-gradient-to-b from-blue-950 via-blue-900 to-sky-900 text-white">
        <section class="mx-auto flex w-full max-w-7xl flex-col px-6 pb-16 pt-20 md:px-10">
          <span class="mb-5 inline-flex w-fit rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider">
            Balneario San Antonio Texas
          </span>
          <h1 class="max-w-4xl text-4xl font-black leading-tight md:text-6xl">
            Vive una experiencia premium de descanso, familia y diversion.
          </h1>
          <p class="mt-6 max-w-3xl text-base text-blue-100 md:text-lg">
            Reserva en minutos, consulta paquetes exclusivos y asegura tu lugar para disfrutar de albercas, cabanas y el mejor ambiente del fin de semana.
          </p>
          <div class="mt-8 flex flex-wrap gap-4">
            <a href="/reservar" data-link class="rounded-xl bg-amber-400 px-6 py-3 font-bold text-slate-900 transition hover:bg-amber-300">
              Reservar ahora
            </a>
            <a href="/checkout" data-link class="rounded-xl border border-white/40 px-6 py-3 font-semibold transition hover:bg-white/15">
              Compra rapida
            </a>
          </div>
        </section>

        <section class="bg-white/95 py-12 text-gray-800 backdrop-blur">
          <div class="mx-auto grid w-full max-w-7xl gap-6 px-6 md:grid-cols-3 md:px-10">
            <article class="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
              <h2 class="text-lg font-bold text-blue-800">Reservas en linea</h2>
              <p class="mt-2 text-sm text-gray-600">Confirma tu acceso sin filas y recibe ticket con QR listo para escanear.</p>
            </article>
            <article class="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
              <h2 class="text-lg font-bold text-blue-800">Paquetes flexibles</h2>
              <p class="mt-2 text-sm text-gray-600">Opciones para familias, grupos y eventos empresariales con precios claros.</p>
            </article>
            <article class="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
              <h2 class="text-lg font-bold text-blue-800">Control y seguridad</h2>
              <p class="mt-2 text-sm text-gray-600">Validacion por QR y trazabilidad de tickets para evitar fraudes.</p>
            </article>
          </div>
        </section>

        <section class="bg-slate-50 py-14 text-gray-800">
          <div class="mx-auto w-full max-w-7xl px-6 md:px-10">
            <div class="mb-7 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p class="text-sm font-semibold uppercase tracking-wider text-blue-700">Promociones del balneario</p>
                <h2 class="mt-1 text-3xl font-black text-slate-900">Paquetes disponibles</h2>
              </div>
              <a href="/admin/dashboard" data-link class="text-sm font-semibold text-blue-700 hover:text-blue-900">
                Ver panel de gestion
              </a>
            </div>
            <div id="landing-paquetes" class="min-h-32 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
              <p class="text-sm text-gray-500">Cargando paquetes...</p>
            </div>
          </div>
        </section>

        <section class="bg-white py-14 text-gray-800">
          <div class="mx-auto w-full max-w-7xl px-6 md:px-10">
            <h2 class="text-3xl font-black text-slate-900">Lo que dicen nuestros visitantes</h2>
            <div class="mt-8 grid gap-5 md:grid-cols-3">
              <blockquote class="rounded-2xl border border-gray-100 bg-slate-50 p-5 shadow-sm">
                <p class="text-sm text-gray-700">"Excelente ambiente familiar y proceso de compra super rapido."</p>
                <footer class="mt-3 text-xs font-semibold uppercase tracking-wider text-blue-700">- Familia Martinez</footer>
              </blockquote>
              <blockquote class="rounded-2xl border border-gray-100 bg-slate-50 p-5 shadow-sm">
                <p class="text-sm text-gray-700">"El QR en la entrada agilizo todo. Muy buena organizacion."</p>
                <footer class="mt-3 text-xs font-semibold uppercase tracking-wider text-blue-700">- Carlos R.</footer>
              </blockquote>
              <blockquote class="rounded-2xl border border-gray-100 bg-slate-50 p-5 shadow-sm">
                <p class="text-sm text-gray-700">"Reservamos para empresa y el paquete especial valio totalmente la pena."</p>
                <footer class="mt-3 text-xs font-semibold uppercase tracking-wider text-blue-700">- Team Soluciones MX</footer>
              </blockquote>
            </div>
          </div>
        </section>
      </main>
    `;
  },

  async mount() {
    const paquetesContainer = document.getElementById('landing-paquetes');
    if (!paquetesContainer) return;

    try {
      const response = await listPaquetes();
      const paquetes = response.data?.paquetes || [];
      paquetesContainer.outerHTML = renderPaquetes(paquetes);
    } catch (error) {
      console.error('No se pudieron cargar los paquetes de la landing:', error);
      paquetesContainer.innerHTML = `
        <div class="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
          No fue posible cargar los paquetes en este momento. Intenta nuevamente en unos minutos.
        </div>
      `;
    }
  }
};
