/**
 * Destino tras iniciar sesión (landing pública sigue en /home si el usuario la abre directo).
 */
import { isDevBootstrapActive } from './devBootstrap.js';

export function resolvePostLoginPath(access) {
  if (!access?.user) return '/home';
  try {
    if (import.meta.env.DEV && isDevBootstrapActive()) {
      return '/admin/dashboard?section=sitio';
    }
  } catch {
    /* no import.meta en tests */
  }
  if (access.isProgramador) return '/programador';
  if (access.can('admin.panel')) return '/admin/dashboard';
  if (access.can('programador.access')) return '/programador';
  if (
    access.can('tickets.scan') ||
    access.can('parking.manage') ||
    access.can('sales.physical')
  ) {
    return '/operacion';
  }
  return '/cliente';
}
