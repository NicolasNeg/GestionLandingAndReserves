/**
 * Normaliza datos de ticket + mesas para la pantalla operativa del escáner.
 */

function shortId(id) {
  return String(id || '').slice(0, 8);
}

function moneyMx(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `$${v.toFixed(2)} MXN`;
}

function fmtWhen(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function coerceTicket(raw) {
  if (!raw) return null;
  const meta = raw.metadata;
  return {
    id: raw.id,
    clienteNombre: raw.clienteNombre ?? raw.cliente_nombre ?? '',
    clienteEmail: raw.clienteEmail ?? raw.cliente_email ?? '',
    metodoPago: raw.metodoPago ?? raw.metodo_pago ?? '',
    estadoPago: raw.estadoPago ?? raw.estado_pago ?? '',
    estadoTicket: raw.estadoTicket ?? raw.estado_ticket ?? '',
    precioTotal: Number(raw.precioTotal ?? raw.precio_total ?? 0),
    fechaCreacion: raw.fechaCreacion ?? raw.fecha_creacion ?? null,
    fechaEscaneo: raw.fechaEscaneo ?? raw.fecha_escaneo ?? null,
    metadata: meta && typeof meta === 'object' ? meta : {}
  };
}

function parseExtrasJson(extrasJson) {
  if (!extrasJson || typeof extrasJson !== 'string') return [];
  try {
    const parsed = JSON.parse(extrasJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x, i) => {
      if (typeof x === 'string') {
        return { type: 'extra', label: x, description: '', qty: 1, price: null, notes: '' };
      }
      const qty = Number(x.qty ?? x.cantidad ?? 1) || 1;
      const label = x.label ?? x.nombre ?? x.name ?? x.titulo ?? `Extra ${i + 1}`;
      const description = x.description ?? x.descripcion ?? '';
      return {
        type: 'extra',
        label,
        description,
        qty,
        price: x.price != null ? Number(x.price) : null,
        notes: x.notes ?? x.nota ?? ''
      };
    });
  } catch {
    return [{ type: 'extra', label: 'Extras de mesa', description: extrasJson.slice(0, 120), qty: 1, price: null, notes: '' }];
  }
}

function metadataCartItems(meta) {
  const items = [];
  const arrays = [meta.items, meta.cartItems, meta.lineItems, meta.lines, meta.cart_items];
  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    for (let i = 0; i < arr.length; i++) {
      const row = arr[i];
      if (!row || typeof row !== 'object') continue;
      const qty = Number(row.qty ?? row.quantity ?? row.cantidad ?? 1) || 1;
      const label =
        row.label ??
        row.name ??
        row.nombre ??
        row.title ??
        row.ticketTypeName ??
        row.productTitle ??
        row.typeLabel ??
        'Ítem';
      const typeRaw = String(row.type ?? row.kind ?? row.category ?? 'item').toLowerCase();
      let type = 'producto';
      if (typeRaw.includes('ticket')) type = 'ticket';
      else if (typeRaw.includes('paquete') || typeRaw.includes('package')) type = 'paquete';
      else if (typeRaw.includes('servicio') || typeRaw.includes('service')) type = 'servicio';
      else if (typeRaw.includes('mesa') || typeRaw.includes('table')) type = 'mesa';
      const price = row.price != null ? Number(row.price) : row.unitPrice != null ? Number(row.unitPrice) : null;
      items.push({
        type,
        label,
        description: row.description ?? row.descripcion ?? '',
        qty,
        price: Number.isFinite(price) ? price : null,
        notes: row.notes ?? row.nota ?? ''
      });
    }
    if (items.length) break;
  }

  const ticketTypeName = meta.ticketTypeName ?? meta.ticket_type_name ?? meta.nombreTipo;
  if (!items.length && ticketTypeName) {
    const qty = Number(meta.ticketQty ?? meta.qtyEntradas ?? meta.entries ?? 1) || 1;
    items.push({
      type: 'ticket',
      label: String(ticketTypeName),
      description: meta.ticketTypeDescription ?? '',
      qty,
      price: null,
      notes: ''
    });
  }

  return items;
}

function mesaRowsToItems(mesas) {
  const out = [];
  for (const m of mesas || []) {
    const labelParts = [];
    if (m.mesaLabel) labelParts.push(String(m.mesaLabel));
    else if (m.mapItemId) labelParts.push(`Mapa ${String(m.mapItemId).slice(0, 12)}`);
    if (m.mesaZona) labelParts.push(`Zona ${m.mesaZona}`);
    const label = labelParts.length ? `Mesa: ${labelParts.join(' · ')}` : 'Reserva de mesa';
    const cap = m.mesaCapacidad != null ? `Capacidad ${m.mesaCapacidad}` : '';
    const fecha = m.fechaDia ? `Día ${m.fechaDia}` : '';
    const description = [fecha, cap].filter(Boolean).join(' · ');
    out.push({
      type: 'mesa',
      label,
      description,
      qty: 1,
      price: m.mesaPrecio != null ? Number(m.mesaPrecio) : null,
      notes: m.notasCliente ? String(m.notasCliente) : ''
    });
    const extras = parseExtrasJson(m.extrasJson);
    out.push(...extras);
  }
  return out;
}

/**
 * @param {object|null} ticketRaw — fila ticket (mapTicketRow o cache IDB)
 * @param {{ mesaReservas?: object[], source?: 'online'|'cache', metadataExtra?: object }} [opts]
 */
export function normalizeTicketForScanDisplay(ticketRaw, opts = {}) {
  const t = coerceTicket(ticketRaw);
  const meta = { ...(opts.metadataExtra || {}), ...(t?.metadata || {}) };
  const mesas = opts.mesaReservas || [];

  const fromMeta = metadataCartItems(meta);
  const fromMesa = mesaRowsToItems(mesas);
  const merged = [...fromMeta];
  for (const row of fromMesa) {
    if (!merged.some((x) => x.label === row.label && x.type === row.type)) merged.push(row);
  }

  const stubId = opts.stubTicketId || t?.id || '';

  return {
    id: stubId,
    shortId: shortId(stubId),
    clienteNombre: t?.clienteNombre || '—',
    clienteEmail: t?.clienteEmail || '',
    estadoTicket: t?.estadoTicket || '—',
    estadoPago: t?.estadoPago || '—',
    metodoPago: t?.metodoPago || '—',
    precioTotal: t?.precioTotal ?? 0,
    fechaCreacion: t?.fechaCreacion || null,
    fechaEscaneo: t?.fechaEscaneo || null,
    items: merged,
    extras: merged.filter((x) => x.type === 'extra'),
    source: opts.source || 'online',
    tipoTicketLabel: meta.ticketTypeName ?? meta.nombreTipo ?? (merged.find((x) => x.type === 'ticket')?.label ?? '')
  };
}

/** Resultado visual operativo (sin textos técnicos tipo RPC). */
export function classifyOnlineScanOutcome(result, reason) {
  const r = String(reason || '').toLowerCase();
  const ok = result === 'valid' && r === 'accepted';

  if (ok) {
    return {
      key: 'accepted',
      variant: 'accepted',
      title: 'Entrada aceptada',
      subtitle: 'Ticket válido y marcado como usado'
    };
  }
  if (r === 'already_scanned') {
    return {
      key: 'already_scanned',
      variant: 'already_scanned',
      title: 'Ticket ya usado',
      subtitle: 'Este código ya fue utilizado en entrada.'
    };
  }
  if (r === 'cancelled') {
    return {
      key: 'cancelled',
      variant: 'cancelled',
      title: 'Ticket cancelado',
      subtitle: 'No admite acceso.'
    };
  }
  if (r === 'unpaid') {
    return {
      key: 'unpaid',
      variant: 'unpaid',
      title: 'Pago pendiente',
      subtitle: 'El cliente debe completar el pago antes de permitir acceso.'
    };
  }
  if (r === 'not_found') {
    return {
      key: 'not_found',
      variant: 'not_found',
      title: 'Ticket no encontrado',
      subtitle: 'No hay un ticket registrado con este código.'
    };
  }
  if (r === 'conflict') {
    return {
      key: 'conflict',
      variant: 'conflict',
      title: 'No se pudo registrar la entrada',
      subtitle: 'Hubo un conflicto al actualizar el ticket. Revisa en administración o intenta de nuevo.'
    };
  }
  return {
    key: 'rejected',
    variant: 'not_found',
    title: 'Ticket no encontrado',
    subtitle: 'No se pudo validar esta entrada.'
  };
}

export function classifyOfflineOutcome(kind) {
  if (kind === 'offline_pending') {
    return {
      key: 'offline_pending',
      variant: 'offline_pending',
      title: 'Entrada aceptada offline',
      subtitle: 'Pendiente de sincronizar'
    };
  }
  if (kind === 'not_cached') {
    return {
      key: 'not_cached',
      variant: 'not_found',
      title: 'No validable offline',
      subtitle: 'Este ticket no está en la memoria de este dispositivo. Conéctate o actualiza el cache.'
    };
  }
  if (kind === 'cancelled') {
    return {
      key: 'cancelled',
      variant: 'cancelled',
      title: 'Ticket cancelado',
      subtitle: 'Según datos locales.'
    };
  }
  if (kind === 'already_scanned') {
    return {
      key: 'already_scanned',
      variant: 'already_scanned',
      title: 'Ticket ya usado',
      subtitle: 'Ya constaba como escaneado en este dispositivo.'
    };
  }
  if (kind === 'invalid_state') {
    return {
      key: 'invalid_state',
      variant: 'conflict',
      title: 'Estado no válido',
      subtitle: 'Los datos locales del ticket no permiten acceso.'
    };
  }
  return {
    key: 'unknown',
    variant: 'not_found',
    title: 'Ticket no encontrado',
    subtitle: 'No se pudo validar esta entrada.'
  };
}

export function humanSummaryForHistory({
  outcomeKey,
  clienteNombre,
  shortId,
  offlinePending
}) {
  const name = (clienteNombre || '').trim();
  const tid = shortId || '—';
  const who = name ? ` — ${name}` : ` — Ticket #${tid}`;

  if (offlinePending || outcomeKey === 'offline_pending') {
    return name ? `Aceptado offline — pendiente de sincronizar${who}` : `Aceptado offline — pendiente de sincronizar — Ticket #${tid}`;
  }
  if (outcomeKey === 'accepted') return `Entrada aceptada${who}`;
  if (outcomeKey === 'already_scanned') return `Ya usado — Ticket #${tid}`;
  if (outcomeKey === 'cancelled') return `Cancelado — Ticket #${tid}`;
  if (outcomeKey === 'unpaid') return `Pago pendiente — Ticket #${tid}`;
  if (outcomeKey === 'not_cached') return `Sin datos offline — Ticket #${tid}`;
  if (outcomeKey === 'not_found') return `No encontrado — Ticket #${tid}`;
  if (outcomeKey === 'conflict') return `Conflicto — Ticket #${tid}`;
  if (outcomeKey === 'invalid_state') return `Estado no válido — Ticket #${tid}`;
  return `Rechazado — Ticket #${tid}`;
}

export { fmtWhen, moneyMx, shortId };
