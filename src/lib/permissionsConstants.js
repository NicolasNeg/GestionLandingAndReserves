/** Constantes y utilidades de rol/permiso (sin acoplar al cliente HTTP; evita ciclos de import). */

export const PERMISSIONS = [
  { key: 'dashboard.manage', label: 'Gestion' },
  { key: 'tickets.monitor', label: 'Monitor tickets' },
  { key: 'tickets.scan', label: 'Escaner' },
  { key: 'packages.manage', label: 'Paquetes' },
  { key: 'inventory.manage', label: 'Inventario productos' },
  { key: 'inventory.adjust', label: 'Ajustes stock' },
  { key: 'sales.physical', label: 'Ventas fisicas caja' },
  { key: 'parking.manage', label: 'Estacionamiento en tiempo real' },
  { key: 'landing.manage', label: 'Landing' },
  { key: 'finance.view', label: 'Finanzas' },
  { key: 'admin.panel', label: 'Panel administracion' },
  { key: 'theme.manage', label: 'Paleta' },
  { key: 'roles.manage', label: 'Roles' },
  { key: 'users.permissions', label: 'Permisos usuarios' },
  { key: 'programador.access', label: 'Dashboard programador' }
];

export const DEFAULT_ROLE_PERMISSIONS = {
  cliente: [],
  trabajador: [
    'dashboard.manage',
    'tickets.monitor',
    'tickets.scan',
    'inventory.adjust',
    'sales.physical',
    'parking.manage'
  ],
  jefe: [
    'dashboard.manage',
    'tickets.monitor',
    'tickets.scan',
    'packages.manage',
    'inventory.manage',
    'inventory.adjust',
    'sales.physical',
    'parking.manage',
    'landing.manage',
    'finance.view',
    'admin.panel'
  ],
  programador: PERMISSIONS.map((p) => p.key)
};

export const ROLE_LABELS = {
  cliente: 'Cliente',
  trabajador: 'Trabajador',
  jefe: 'Jefe',
  programador: 'Programador'
};

export function normalizeRole(role) {
  const normalized = String(role || 'cliente').trim().toLowerCase().replace(/\s+/g, '-');
  return normalized || 'cliente';
}

export function labelRole(role) {
  const normalized = normalizeRole(role);
  return ROLE_LABELS[normalized] || normalized.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function uniquePermissions(...groups) {
  return [...new Set(groups.flat().filter(Boolean))];
}
