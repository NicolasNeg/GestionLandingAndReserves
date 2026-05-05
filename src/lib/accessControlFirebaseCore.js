/**
 * Resolución de permisos Firebase legacy (Data Connect + Firestore).
 * Separado de accessControl.js para evitar dependencias circulares con permissionsProvider.
 */
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase-config.js';
import { getCurrentUser } from './authProvider.js';
import { getUserProfile } from './dataLayer.js';
import { isDataConnectNotDeployed, isPermissionError } from './dataConnectErrors.js';
import {
  DEFAULT_ROLE_PERMISSIONS,
  isBootstrapProgramadorEmail,
  labelRole,
  normalizeRole,
  PERMISSIONS,
  uniquePermissions
} from './permissionsConstants.js';

function isPermissionDenied(error) {
  return isPermissionError(error);
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

function uidOf(user) {
  return user?.uid ?? user?.id ?? null;
}

export async function getUserAccessFirebase(user) {
  const u = user !== undefined ? user : getCurrentUser();
  if (!u) {
    return {
      user: null,
      userId: null,
      uid: null,
      name: 'Invitado',
      email: '',
      photoURL: '',
      role: 'invitado',
      roleLabel: 'Invitado',
      permissions: [],
      can: () => false,
      isProgramador: false,
      isAdmin: false,
      isStaff: false
    };
  }

  const uid = uidOf(u);
  let dataConnectUser = null;
  let firestoreUser = null;
  let directPermissions = [];
  let customRolePermissions = [];

  try {
    const profile = await getUserProfile({ id: uid });
    dataConnectUser = profile.data?.user || null;
  } catch (error) {
    if (!isPermissionDenied(error) && !isDataConnectNotDeployed(error)) {
      console.warn('Perfil Data Connect no disponible para permisos:', error);
    }
  }

  try {
    firestoreUser = await readDocData('users', uid);
  } catch (error) {
    if (!isPermissionDenied(error)) {
      console.warn('Perfil Firestore no disponible para permisos:', error);
    }
  }

  const role = roleForUser(u, dataConnectUser?.rol, firestoreUser?.rol);

  try {
    const direct = await readDocData('userPermissions', uid);
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
  const permissions =
    role === 'programador'
      ? PERMISSIONS.map((p) => p.key)
      : uniquePermissions(roleDefaults, customRolePermissions, ownPermissions, directPermissions);

  const name = dataConnectUser?.nombre || firestoreUser?.nombre || u.displayName || 'Usuario';
  const email = dataConnectUser?.email || firestoreUser?.email || u.email || '';
  const photoURL = firestoreUser?.photoURL || u.photoURL || '';

  return {
    user: u,
    userId: uid,
    uid,
    name,
    email,
    photoURL,
    role,
    roleLabel: labelRole(role),
    permissions,
    can: (permission) => role === 'programador' || permissions.includes(permission),
    isProgramador: role === 'programador',
    isAdmin: role === 'jefe',
    isStaff: role === 'trabajador'
  };
}
