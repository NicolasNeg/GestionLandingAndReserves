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

export function getDataConnectErrorMessage(error) {
  return collectErrorText(error) || 'Error desconocido de backend.';
}

export function isDataConnectOperationMissing(error) {
  const msg = getDataConnectErrorMessage(error);
  return (
    /\bNOT_FOUND\b/i.test(msg) ||
    /operation\s+"[^"]+"\s+not found/i.test(msg) ||
    /operation.+not found/i.test(msg) ||
    /not found/i.test(msg)
  );
}

export function isDataConnectNotDeployed(error) {
  return isDataConnectOperationMissing(error);
}

export function isDataConnectConnectorStale(error) {
  return isDataConnectNotDeployed(error);
}

export function isPermissionError(error) {
  const msg = getDataConnectErrorMessage(error);
  return (
    error?.code === 'permission-denied' ||
    error?.code === 'PERMISSION_DENIED' ||
    /\bPERMISSION_DENIED\b/i.test(msg) ||
    /permission-denied/i.test(msg) ||
    /missing or insufficient permissions/i.test(msg) ||
    /insufficient permissions/i.test(msg)
  );
}
