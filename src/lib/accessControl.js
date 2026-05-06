import { getUserAccessResolved } from './permissionsProvider.js';
import { waitForAuthUser as waitForAuthUserProvider } from './authProvider.js';
import { getCanonicalAuthUser } from './authCanonical.js';
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, uniquePermissions } from './permissionsConstants.js';

export {
  PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_LABELS,
  normalizeRole,
  labelRole,
  uniquePermissions
} from './permissionsConstants.js';

export const AUTH_WAIT_TIMEOUT_MS = 6000;

export function waitForAuthUser(timeoutMs = AUTH_WAIT_TIMEOUT_MS) {
  return waitForAuthUserProvider(timeoutMs);
}

export async function getUserAccess(user) {
  const u = user !== undefined ? user : getCanonicalAuthUser();
  return getUserAccessResolved(u ?? null);
}
