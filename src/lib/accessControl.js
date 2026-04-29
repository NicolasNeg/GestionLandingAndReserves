import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase-config.js';
import { getUserProfile } from '../dataconnect-generated';

export const PERMISSIONS = [
  { key: 'dashboard.manage', label: 'Gestion' },
  { key: 'tickets.monitor', label: 'Monitor tickets' },
  { key: 'tickets.scan', label: 'Escaner' },
  { key: 'packages.manage', label: 'Paquetes' },
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
  trabajador: ['dashboard.manage', 'tickets.monitor', 'tickets.scan'],
  jefe: [
    'dashboard.manage',
    'tickets.monitor',
    'tickets.scan',
    'packages.manage',
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

const byPriority = ['programador', 'jefe', 'trabajador', 'cliente'];

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

export function waitForAuthUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

function pickRole(dataConnectRole, firestoreRole) {
  const roles = [normalizeRole(dataConnectRole), normalizeRole(firestoreRole)].filter(Boolean);
  for (const role of byPriority) {
    if (roles.includes(role)) return role;
  }
  return roles.find((role) => role !== 'cliente') || roles[0] || 'cliente';
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
    console.warn('Perfil Data Connect no disponible para permisos:', error);
  }

  try {
    firestoreUser = await readDocData('users', user.uid);
  } catch (error) {
    console.warn('Perfil Firestore no disponible para permisos:', error);
  }

  const role = pickRole(dataConnectUser?.rol, firestoreUser?.rol);

  try {
    const direct = await readDocData('userPermissions', user.uid);
    directPermissions = Array.isArray(direct?.permissions) ? direct.permissions : [];
  } catch (error) {
    console.warn('Permisos directos no disponibles:', error);
  }

  try {
    const roleDoc = await readDocData('roles', role);
    customRolePermissions = Array.isArray(roleDoc?.permissions) ? roleDoc.permissions : [];
  } catch (error) {
    console.warn('Permisos de rol no disponibles:', error);
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
  const snap = await getDoc(ref);
  const base = {
    email: user.email || profile.email || '',
    nombre: profile.nombre || user.displayName || 'Usuario',
    photoURL: user.photoURL || '',
    providerId: user.providerData?.[0]?.providerId || 'password',
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp()
  };

  if (!snap.exists()) {
    await setDoc(ref, {
      ...base,
      rol: 'cliente',
      permissions: [],
      createdAt: serverTimestamp()
    });
    return;
  }

  await setDoc(ref, base, { merge: true });
}
