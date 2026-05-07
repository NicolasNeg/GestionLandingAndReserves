const STORE_KEY = 'guestTickets:v1';

function readRaw() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(rows) {
  localStorage.setItem(STORE_KEY, JSON.stringify(rows));
}

export function listGuestTickets() {
  return readRaw();
}

export function saveGuestTicket(record) {
  if (!record?.id) return;
  const rows = readRaw();
  const next = [
    {
      id: record.id,
      shortId: String(record.id).slice(0, 8),
      createdAt: record.createdAt || new Date().toISOString(),
      email: record.email || '',
      clienteNombre: record.clienteNombre || '',
      qrData: record.qrData || record.id,
      resumen: record.resumen || '',
      metadataItems: Array.isArray(record.metadataItems) ? record.metadataItems : [],
      total: Number(record.total || 0),
      metodoPago: record.metodoPago || '',
      estadoPago: record.estadoPago || '',
      metadata: record.metadata && typeof record.metadata === 'object' ? record.metadata : {}
    },
    ...rows.filter((x) => x.id !== record.id)
  ].slice(0, 20);
  writeRaw(next);
}

