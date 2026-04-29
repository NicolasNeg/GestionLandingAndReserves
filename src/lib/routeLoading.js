/** Overlay global durante cambios de ruta (router SPA). */
export function setRouteLoading(active) {
  const el = document.getElementById('app-route-loading');
  if (!el) return;
  if (active) {
    el.classList.remove('opacity-0', 'pointer-events-none');
    el.setAttribute('aria-busy', 'true');
    el.setAttribute('aria-hidden', 'false');
  } else {
    el.classList.add('opacity-0', 'pointer-events-none');
    el.setAttribute('aria-busy', 'false');
    el.setAttribute('aria-hidden', 'true');
  }
}
