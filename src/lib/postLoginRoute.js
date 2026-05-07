/**
 * Destino tras iniciar sesión (landing pública sigue en /home si el usuario la abre directo).
 */
export function resolvePostLoginPath(access) {
  if (!access?.user) return '/home';
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
