const DB_NAME = 'balneario_scanner_offline_v1';
const DB_VERSION = 1;
const STORE_CACHED = 'cachedTickets';
const STORE_PENDING = 'pendingScans';
const STORE_HISTORY = 'scanHistory';
const STORE_SETTINGS = 'scannerSettings';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CACHED)) {
        const store = db.createObjectStore(STORE_CACHED, { keyPath: 'id' });
        store.createIndex('byFechaDia', 'fechaDia', { unique: false });
        store.createIndex('byUpdatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_PENDING)) {
        const store = db.createObjectStore(STORE_PENDING, { keyPath: 'localId' });
        store.createIndex('byStatus', 'status', { unique: false });
        store.createIndex('byScannedAt', 'scannedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        const store = db.createObjectStore(STORE_HISTORY, { keyPath: 'localId' });
        store.createIndex('byScannedAt', 'scannedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function withStore(storeName, mode, runner) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    try {
      result = runner(store, tx);
    } catch (error) {
      reject(error);
      return;
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
  }));
}

function uid(prefix = 'scan') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeDate(dateLike = new Date()) {
  if (typeof dateLike === 'string') return dateLike.slice(0, 10);
  return new Date(dateLike).toISOString().slice(0, 10);
}

export function getScannerDeviceId() {
  const key = 'scanner_device_id_v1';
  let value = localStorage.getItem(key);
  if (!value) {
    value = `device_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
    localStorage.setItem(key, value);
  }
  return value;
}

export async function upsertCachedTickets(tickets = []) {
  const now = new Date().toISOString();
  await withStore(STORE_CACHED, 'readwrite', (store) => {
    for (const row of tickets) {
      if (!row?.id) continue;
      store.put({
        id: row.id,
        clienteNombre: row.clienteNombre || '',
        clienteEmail: row.clienteEmail || '',
        estadoPago: row.estadoPago || '',
        estadoTicket: row.estadoTicket || '',
        precioTotal: Number(row.precioTotal || 0),
        fechaCreacion: row.fechaCreacion || null,
        fechaEscaneo: row.fechaEscaneo || null,
        fechaDia: row.fechaDia || normalizeDate(row.fechaCreacion || now),
        metadata: row.metadata || {},
        updatedAt: now
      });
    }
  });
}

export async function getCachedTicket(ticketId) {
  return withStore(STORE_CACHED, 'readonly', (store) => new Promise((resolve, reject) => {
    const req = store.get(ticketId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  }));
}

export async function markTicketScannedLocal(ticketId, scan) {
  const ticket = await getCachedTicket(ticketId);
  if (!ticket) return null;
  const updated = {
    ...ticket,
    estadoTicket: 'escaneado',
    fechaEscaneo: scan?.scannedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await withStore(STORE_CACHED, 'readwrite', (store) => {
    store.put(updated);
  });
  return updated;
}

export async function addPendingScan(scan) {
  const record = {
    localId: scan.localId || uid('pending'),
    ticketId: scan.ticketId || null,
    scannedAt: scan.scannedAt || new Date().toISOString(),
    scannedBy: scan.scannedBy || '',
    deviceId: scan.deviceId || getScannerDeviceId(),
    mode: scan.mode || 'offline',
    status: scan.status || 'pending',
    rawQr: scan.rawQr || '',
    resultSnapshot: scan.resultSnapshot || {},
    syncResult: null
  };
  await withStore(STORE_PENDING, 'readwrite', (store) => {
    store.put(record);
  });
  return record;
}

export async function listPendingScans() {
  return withStore(STORE_PENDING, 'readonly', (store) => new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const rows = (req.result || []).sort((a, b) => String(a.scannedAt).localeCompare(String(b.scannedAt)));
      resolve(rows.filter((row) => row.status === 'pending' || row.status === 'conflict'));
    };
    req.onerror = () => reject(req.error);
  }));
}

export async function markPendingScanSynced(localId, result) {
  await withStore(STORE_PENDING, 'readwrite', (store) => {
    const req = store.get(localId);
    req.onsuccess = () => {
      const row = req.result;
      if (!row) return;
      store.put({ ...row, status: 'synced', syncResult: result || {}, syncedAt: new Date().toISOString() });
    };
  });
}

export async function markPendingScanConflict(localId, error) {
  await withStore(STORE_PENDING, 'readwrite', (store) => {
    const req = store.get(localId);
    req.onsuccess = () => {
      const row = req.result;
      if (!row) return;
      store.put({
        ...row,
        status: 'conflict',
        syncResult: { error: error?.message || String(error || 'conflict') },
        syncedAt: new Date().toISOString()
      });
    };
  });
}

export async function addRecentScan(scan) {
  const record = {
    localId: scan.localId || uid('history'),
    ticketId: scan.ticketId || null,
    scannedAt: scan.scannedAt || new Date().toISOString(),
    mode: scan.mode || 'online',
    status: scan.status || 'accepted',
    rawQr: scan.rawQr || '',
    message: scan.message || '',
    result: scan.result || {}
  };
  await withStore(STORE_HISTORY, 'readwrite', (store) => {
    store.put(record);
  });
  return record;
}

export async function listRecentScans(limit = 25) {
  return withStore(STORE_HISTORY, 'readonly', (store) => new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const rows = (req.result || [])
        .sort((a, b) => String(b.scannedAt).localeCompare(String(a.scannedAt)))
        .slice(0, limit);
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  }));
}

export async function cacheTicketsForDay(date, tickets = []) {
  const fechaDia = normalizeDate(date);
  const normalized = tickets.map((row) => ({ ...row, fechaDia }));
  await upsertCachedTickets(normalized);
  await withStore(STORE_SETTINGS, 'readwrite', (store) => {
    store.put({ key: 'lastCache', value: { fechaDia, count: normalized.length, at: new Date().toISOString() } });
  });
  return normalized.length;
}

export async function clearOldCache(days = 3) {
  const minTs = Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000;
  await withStore(STORE_CACHED, 'readwrite', (store) => {
    const req = store.getAll();
    req.onsuccess = () => {
      for (const row of req.result || []) {
        const updatedAt = new Date(row.updatedAt || 0).getTime();
        if (!updatedAt || updatedAt < minTs) store.delete(row.id);
      }
    };
  });
  await withStore(STORE_HISTORY, 'readwrite', (store) => {
    const req = store.getAll();
    req.onsuccess = () => {
      for (const row of req.result || []) {
        const ts = new Date(row.scannedAt || 0).getTime();
        if (!ts || ts < minTs) store.delete(row.localId);
      }
    };
  });
}
