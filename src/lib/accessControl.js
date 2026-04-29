import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase-config.js';
import { getUserProfile } from '../dataconnect-generated';

export const BOOTSTRAP_PROGRAMADOR_EMAIL = 'angelarmentta@icloud.com';

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

const AUTH_WAIT_TIMEOUT_MS = 6000;

function isPermissionDenied(error) {
  return error?.code === 'permission-denied' || /insufficient permissions/i.test(String(error?.message || ''));
}

export function isBootstrapProgramadorEmail(email) {
  return String(email || '').trim().toLowerCase() === BOOTSTRAP_PROGRAMADOR_EMAIL;
}

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

export function waitForAuthUser(timeoutMs = AUTH_WAIT_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let done = false;
    let unsubscribe = () => {};
    const finish = (user) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      unsubscribe();
      resolve(user);
    };
    const timer = globalThis.setTimeout(() => {
      finish(auth.currentUser || null);
    }, timeoutMs);
    unsubscribe = onAuthStateChanged(auth, (user) => {
      finish(user);
    });
  });
}

function pickRole(dataConnectRole, firestoreRole) {
  const dcRole = normalizeRole(dataConnectRole);
  const fsRole = normalizeRole(firestoreRole);
  if (fsRole && fsRole !== 'cliente') return fsRole;
  if (dcRole && dcRole !== 'cliente') return dcRole;
  return fsRole || dcRole || 'cliente';
}

function roleForUser(user, dataConnectRole, firestoreRole) {
  if (isBootstrapProgramadorEmail(user?.email)) return 'programador';
  return pickRole(dataConnectRole, firestoreRole);
}

async function readDocData(path, id) {
  const snap = await getDoc(doc(db, path, id));
  return snap.exists() ? snap.data() : null;
}

export async function getUserAccess(user = auth.currentUser) {
  if (!user) {
    return {
      user: null,
      uid: null,
      name: 'Invitado',
      email: '',
      photoURL: '',
      role: 'invitado',
      roleLabel: 'Invitado',
      permissions: [],
      can: () => false,
      isProgramador: false
    };
  }

  let dataConnectUser = null;
  let firestoreUser = null;
  let directPermissions = [];
  let customRolePermissions = [];

  try {
    const profile = await getUserProfile({ id: user.uid });
    dataConnectUser = profile.data?.user || null;
  } catch (error) {
    if (!isPermissionDenied(error)) {
      console.warn('Perfil Data Connect no disponible para permisos:', error);
    }
  }

  try {
    firestoreUser = await readDocData('users', user.uid);
  } catch (error) {
    if (!isPermissionDenied(error)) {
      console.warn('Perfil Firestore no disponible para permisos:', error);
    }
  }

  const role = roleForUser(user, dataConnectUser?.rol, firestoreUser?.rol);

  try {
    const direct = await readDocData('userPermissions', user.uid);
    directPermissions = Array.isArray(direct?.permissions) ? direct.permissions : [];
  } catch (error) {
    if (!isPermissionDenied(error)) {
      console.warn('Permisos directos no disponibles:', error);
    }
  }

  try {
    const roleDoc = await readDocData('roles', role);
    customRolePermissions = Array.isArray(roleDoc?.permissions) ? roleDoc.permissions : [];
  } catch (error) {
    if (!isPermissionDenied(error)) {
      console.warn('Permisos de rol no disponibles:', error);
    }
  }

  const roleDefaults = DEFAULT_ROLE_PERMISSIONS[role] || [];
  const ownPermissions = Array.isArray(firestoreUser?.permissions) ? firestoreUser.permissions : [];
  const permissions = role === 'programador'
    ? PERMISSIONS.map((p) => p.key)
    : uniquePermissions(roleDefaults, customRolePermissions, ownPermissions, directPermissions);

  const name = dataConnectUser?.nombre || firestoreUser?.nombre || user.displayName || 'Usuario';
  const email = dataConnectUser?.email || firestoreUser?.email || user.email || '';
  const photoURL = firestoreUser?.photoURL || user.photoURL || '';

  return {
    user,
    uid: user.uid,
    name,
    email,
    photoURL,
    role,
    roleLabel: labelRole(role),
    permissions,
    can: (permission) => role === 'programador' || permissions.includes(permission),
    isProgramador: role === 'programador'
  };
}

export async function syncFirestoreUserProfile(user, profile = {}) {
  if (!user) return;
  const ref = doc(db, 'users', user.uid);
  const bootstrapProgramador = isBootstrapProgramadorEmail(user.email || profile.email);
  const base = {
    email: user.email || profile.email || '',
    nombre: profile.nombre || user.displayName || 'Usuario',
    photoURL: user.photoURL || '',
    providerId: user.providerData?.[0]?.providerId || 'password',
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp()
  };

  try {
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        ...base,
        rol: bootstrapProgramador ? 'programador' : 'cliente',
        permissions: bootstrapProgramador ? PERMISSIONS.map((p) => p.key) : [],
        createdAt: serverTimestamp()
      });
      return;
    }

    await setDoc(ref, {
      ...base,
      ...(bootstrapProgramador
        ? {
            rol: 'programador',
            permissions: PERMISSIONS.map((p) => p.key)
          }
        : {})
    }, { merge: true });
  } catch (error) {
    if (isPermissionDenied(error)) return;
    throw error;
  }
}
