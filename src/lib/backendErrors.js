function collectErrorText(error) {
  const parts = [
    error?.code,
    error?.status,
    error?.message,
    error?.details,
    error?.name,
    typeof error === 'string' ? error : ''
  ];
  return parts.filter(Boolean).map(String).join(' ');
}

export function getBackendErrorMessage(error) {
  return collectErrorText(error) || 'Error desconocido de backend.';
}

export function isBackendOperationMissing(error) {
  const msg = getBackendErrorMessage(error);
  return (
    /\bNOT_FOUND\b/i.test(msg) ||
    /operation\s+"[^"]+"\s+not found/i.test(msg) ||
    /operation.+not found/i.test(msg) ||
    /not found/i.test(msg)
  );
}

/** Operación o recurso no disponible en el backend (p. ej. RPC ausente, 404). */
export function isBackendOperationUnavailable(error) {
  return isBackendOperationMissing(error);
}

export function isPermissionError(error) {
  const msg = getBackendErrorMessage(error);
  return (
    error?.code === 'permission-denied' ||
    error?.code === 'PERMISSION_DENIED' ||
    error?.code === '42501' ||
    /\bPERMISSION_DENIED\b/i.test(msg) ||
    /permission-denied/i.test(msg) ||
    /missing or insufficient permissions/i.test(msg) ||
    /insufficient permissions/i.test(msg)
  );
}
