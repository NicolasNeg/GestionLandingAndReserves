import { supabase } from '../supabase/client.js';
import { getCanonicalUserId } from './authCanonical.js';
import { addCalendarDaysMexico, formatFechaDia } from './fechaDiaMexico.js';
import { parseDiscountRules } from './discountRules.js';

function requireClient() {
  if (!supabase) throw new Error('Supabase no inicializado');
  return supabase;
}

/** Solo intentar RPC get_executive_dashboard si está explícitamente activado (evita 404 en producción). */
const USE_EXECUTIVE_DASHBOARD_RPC = import.meta.env.VITE_USE_EXECUTIVE_DASHBOARD_RPC === 'true';

let warnedExecutiveRpcMissing = false;
let warnedTicketScansMissing = false;

function isTicketScansRelationMissing(err) {
  const m = String(err?.message || err?.details || err?.hint || '');
  return /ticket_scans|schema cache|Could not find the table|does not exist|relation/i.test(m);
}

function newUuidForTicket() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isMesaReservaRlsError(err) {
  const code = String(err?.code || '').trim();
  if (code === '42501') return true;
  const msg = String(err?.message || err?.details || err?.hint || '');
  return /row-level security|violates row-level security|permission denied|not allowed/i.test(msg);
}

function normalizeStoredPermissions(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') {
    try {
      return Array.from(val);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Inserta o actualiza fila `users` desde la sesión Supabase Auth sin pisar rol/permisos elevados.
 */
export async function mergeUserProfileFromAuth(userLike) {
  const sb = requireClient();
  const id = userLike?.uid ?? userLike?.id;
  if (!id) return;

  const email = String(userLike.email || '').trim();
  const nombre = String(userLike.displayName ?? userLike.name ?? '').trim() || 'Usuario';
  const avatar_url = userLike.photoURL || null;

  const { data: row, error: readErr } = await sb.from('users').select('*').eq('id', id).maybeSingle();
  if (readErr) throw readErr;

  const now = new Date().toISOString();

  if (!row) {
    /** Nunca promover a programador/admin por email (Fase 5C); usar SQL o panel cuando exista. */
    const rol = 'cliente';
    const permissions = [];
    const { error } = await sb.from('users').upsert(
      {
        id,
        email,
        nombre,
        rol,
        permissions,
        avatar_url,
        updated_at: now
      },
      { onConflict: 'id' }
    );
    if (error) throw error;
    return;
  }

  const permissions = normalizeStoredPermissions(row.permissions);
  const { error } = await sb.from('users').upsert(
    {
      id,
      email: email || row.email || '',
      nombre: nombre || row.nombre || 'Usuario',
      rol: row.rol,
      permissions,
      avatar_url: avatar_url ?? row.avatar_url ?? null,
      updated_at: now
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
}

/** Lista usuarios para panel programador (requiere RLS que permita lectura a jefe/programador). */
export async function listUsersProgramadorView() {
  const sb = requireClient();
  const { data, error } = await sb
    .from('users')
    .select('id,nombre,email,rol,permissions,avatar_url')
    .order('nombre', { ascending: true })
    .limit(800);
  if (error) throw error;
  return data || [];
}

/** Mapa rol -> lista de permisos desde public.role_permissions. */
export async function fetchRolePermissionsMatrix() {
  const sb = requireClient();
  const { data, error } = await sb.from('role_permissions').select('role,permission').order('role');
  if (error) throw error;
  const map = {};
  for (const row of data || []) {
    if (!map[row.role]) map[row.role] = [];
    map[row.role].push(row.permission);
  }
  return map;
}

export async function updateUserRolPermissionsPg({ id, rol, permissions }) {
  const sb = requireClient();
  const { error } = await sb
    .from('users')
    .update({
      rol,
      permissions: Array.isArray(permissions) ? permissions : [],
      updated_at: new Date().toISOString()
    })
    .eq('id', id);
  if (error) throw error;
}

function mapUserRow(r) {
  if (!r) return null;
  let permissions = [];
  const raw = r.permissions;
  if (Array.isArray(raw)) permissions = raw;
  else if (raw && typeof raw === 'object') {
    try {
      permissions = Array.from(raw);
    } catch {
      permissions = [];
    }
  }
  return {
    id: r.id,
    nombre: r.nombre,
    email: r.email,
    rol: r.rol,
    permissions,
    photoURL: r.avatar_url || ''
  };
}

function mapLandingRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    descripcionParque: r.descripcion_parque,
    mapaDistribucionJson: r.mapa_distribucion_json,
    mapaMesasJson: r.mapa_mesas_json,
    mapaEstacionamientoJson: r.mapa_estacionamiento_json,
    imagenSatelitalUrl: r.imagen_satelital_url,
    googleMapsUrl: r.google_maps_url,
    horariosTexto: r.horarios_texto,
    abiertoAhora: r.abierto_ahora,
    ocupacionTexto: r.ocupacion_texto,
    estacionamientoTexto: r.estacionamiento_texto,
    botonesJson: r.botones_json
  };
}

function mapProductoRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    titulo: r.titulo,
    descripcion: r.descripcion,
    imagenUrl: r.imagen_url,
    precio: Number(r.precio),
    stockActual: r.stock_actual,
    reservadoAprox: r.reservado_aprox,
    activo: r.activo,
    fechaCreacion: r.fecha_creacion
  };
}

function mapServicioRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    titulo: r.titulo,
    descripcion: r.descripcion,
    imagenUrl: r.imagen_url,
    precio: Number(r.precio),
    orden: r.orden,
    activo: r.activo
  };
}

function mapPaqueteRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    precioBase: Number(r.precio_base),
    incluyePersonas: r.incluye_personas,
    activo: r.activo
  };
}

function mapTicketRow(r, userRow = null) {
  if (!r) return null;
  return {
    id: r.id,
    clienteNombre: r.cliente_nombre,
    clienteEmail: r.cliente_email,
    metodoPago: r.metodo_pago,
    estadoPago: r.estado_pago,
    estadoTicket: r.estado_ticket,
    precioTotal: Number(r.precio_total),
    fechaCreacion: r.fecha_creacion,
    fechaEscaneo: r.fecha_escaneo,
    metadata:
      r.metadata != null && typeof r.metadata === 'object' && !Array.isArray(r.metadata)
        ? r.metadata
        : {},
    user: userRow
      ? { id: userRow.id, nombre: userRow.nombre, email: userRow.email }
      : undefined
  };
}

function mapMesaRow(r) {
  if (!r) return null;
  const nestedUser =
    r.users && typeof r.users === 'object' && !Array.isArray(r.users) ? r.users : null;
  return {
    id: r.id,
    fechaDia: r.fecha_dia,
    mapItemId: r.map_item_id,
    estado: r.estado,
    creadoEn: r.creado_en,
    ticket: r.ticket_id ? { id: r.ticket_id } : undefined,
    user: nestedUser?.id
      ? { id: nestedUser.id, nombre: nestedUser.nombre, email: nestedUser.email }
      : r.user_id
        ? { id: r.user_id }
        : undefined,
    mesaLabel: r.mesa_label ?? null,
    mesaZona: r.mesa_zona ?? null,
    mesaCapacidad: r.mesa_capacidad != null ? Number(r.mesa_capacidad) : null,
    mesaPrecio: r.mesa_precio != null ? Number(r.mesa_precio) : null,
    extrasJson: r.extras_json ?? null,
    subtotalMesa: r.subtotal_mesa != null ? Number(r.subtotal_mesa) : null,
    totalExtras: r.total_extras != null ? Number(r.total_extras) : null,
    totalReserva: r.total_reserva != null ? Number(r.total_reserva) : null,
    estadoPago: r.estado_pago ?? null,
    metodoPago: r.metodo_pago ?? null,
    notasCliente: r.notas_cliente ?? null
  };
}

function mapMovRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    tipo: r.tipo,
    cantidad: r.cantidad,
    nota: r.nota,
    fechaCreacion: r.fecha_creacion,
    creadoPor: r.creado_por
      ? { id: r.creado_por }
      : undefined
  };
}

function mapTicketScanRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    ticketId: r.ticket_id,
    scannedBy: r.scanned_by,
    scannedAt: r.scanned_at,
    deviceId: r.device_id,
    mode: r.mode,
    result: r.result,
    rawQr: r.raw_qr,
    metadata: r.metadata || {},
    createdAt: r.created_at
  };
}

function mapDescuentoRow(r) {
  if (!r) return null;
  const rules =
    typeof r.reglas_json === 'string'
      ? r.reglas_json
      : JSON.stringify(r.reglas_json ?? []);
  return {
    id: r.id,
    codigo: r.codigo,
    descuento: Number(r.descuento),
    tipo: r.tipo,
    usosRestantes: r.usos_restantes,
    activo: r.activo,
    reglasJson: rules
  };
}

function mapTicketTypeRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion || '',
    incluye: r.incluye || '',
    precio: Number(r.precio || 0),
    categoria: r.categoria || '',
    orden: Number(r.orden || 0),
    activo: Boolean(r.activo),
    especial: Boolean(r.especial),
    metadata: r.metadata || {},
    createdAt: r.created_at || null,
    updatedAt: r.updated_at || null
  };
}

export async function getLandingPage({ id }) {
  const sb = requireClient();
  const { data, error } = await sb.from('landing_page').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return { data: { landingPage: mapLandingRow(data) } };
}

export async function listPaquetes() {
  const sb = requireClient();
  const { data, error } = await sb
    .from('paquetes')
    .select('*')
    .eq('activo', true)
    .order('precio_base', { ascending: true });
  if (error) throw error;
  return { data: { paquetes: (data || []).map(mapPaqueteRow) } };
}

export async function listProductosPublic() {
  const sb = requireClient();
  const { data, error } = await sb
    .from('productos')
    .select('*')
    .eq('activo', true)
    .order('fecha_creacion', { ascending: false });
  if (error) throw error;
  return { data: { productos: (data || []).map(mapProductoRow) } };
}

export async function listServiciosLanding() {
  const sb = requireClient();
  const { data, error } = await sb
    .from('servicios')
    .select('*')
    .eq('activo', true)
    .order('orden', { ascending: true });
  if (error) throw error;
  return { data: { servicios: (data || []).map(mapServicioRow) } };
}

export async function listServiciosAdmin() {
  const sb = requireClient();
  const { data, error } = await sb.from('servicios').select('*').order('orden', { ascending: true });
  if (error) throw error;
  return { data: { servicios: (data || []).map(mapServicioRow) } };
}

export async function listProductosAdmin() {
  const sb = requireClient();
  const { data, error } = await sb.from('productos').select('*').order('fecha_creacion', { ascending: false });
  if (error) throw error;
  return { data: { productos: (data || []).map(mapProductoRow) } };
}

export async function getConfiguracion({ id }) {
  const sb = requireClient();
  const { data, error } = await sb.from('configuracion').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  const row = data;
  return {
    data: {
      configuracion: row
        ? {
            id: row.id,
            precioAdulto: Number(row.precio_adulto),
            precioNino: Number(row.precio_nino),
            precioMayor: Number(row.precio_mayor)
          }
        : null
    }
  };
}

export async function upsertConfiguracion({ id, precioAdulto, precioNino, precioMayor }) {
  const sb = requireClient();
  const { error } = await sb.from('configuracion').upsert({
    id,
    precio_adulto: precioAdulto,
    precio_nino: precioNino,
    precio_mayor: precioMayor
  });
  if (error) throw error;
  return { data: {} };
}

export async function listDescuentosAdmin() {
  const sb = requireClient();
  const { data, error } = await sb.from('descuentos').select('*').order('codigo', { ascending: true });
  if (error) throw error;
  return { data: { descuentos: (data || []).map(mapDescuentoRow) } };
}

export async function getDescuentoByCodigo({ codigo }) {
  const sb = requireClient();
  const normalized = String(codigo || '').trim().toUpperCase();
  if (!normalized) return { data: { descuento: null } };
  const { data, error } = await sb.from('descuentos').select('*').eq('codigo', normalized).maybeSingle();
  if (error) throw error;
  return { data: { descuento: mapDescuentoRow(data) } };
}

export async function createDescuento({
  codigo,
  descuento,
  tipo,
  usosRestantes,
  activo,
  reglasJson
}) {
  const sb = requireClient();
  let reglas = [];
  try {
    reglas = JSON.parse(reglasJson || '[]');
  } catch {
    reglas = [];
  }
  const { data, error } = await sb
    .from('descuentos')
    .insert({
      codigo: String(codigo).trim().toUpperCase(),
      descuento,
      tipo,
      usos_restantes: usosRestantes,
      activo,
      reglas_json: reglas
    })
    .select('id')
    .single();
  if (error) throw error;
  return { data: { descuento_insert: { id: data.id } } };
}

export async function updateDescuento({
  id,
  codigo,
  descuento,
  tipo,
  usosRestantes,
  activo,
  reglasJson
}) {
  const sb = requireClient();
  let reglas = [];
  try {
    reglas = JSON.parse(reglasJson || '[]');
  } catch {
    reglas = [];
  }
  const { error } = await sb
    .from('descuentos')
    .update({
      codigo: String(codigo).trim().toUpperCase(),
      descuento,
      tipo,
      usos_restantes: usosRestantes,
      activo,
      reglas_json: reglas
    })
    .eq('id', id);
  if (error) throw error;
  return { data: {} };
}

export async function consumeDescuento({ id, usosRestantesNext }) {
  const sb = requireClient();
  const { error } = await sb.from('descuentos').update({ usos_restantes: usosRestantesNext }).eq('id', id);
  if (error) throw error;
  return { data: {} };
}

export async function deleteDescuento({ id }) {
  const sb = requireClient();
  const { error } = await sb.from('descuentos').delete().eq('id', id);
  if (error) throw error;
  return { data: {} };
}

export async function listTicketTypesPublic() {
  const sb = requireClient();
  const { data, error } = await sb
    .from('ticket_types')
    .select('*')
    .eq('activo', true)
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return { data: { ticketTypes: (data || []).map(mapTicketTypeRow) } };
}

export async function listTicketTypesAdmin() {
  const sb = requireClient();
  const { data, error } = await sb
    .from('ticket_types')
    .select('*')
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return { data: { ticketTypes: (data || []).map(mapTicketTypeRow) } };
}

export async function createTicketType({
  nombre,
  descripcion,
  incluye,
  precio,
  categoria,
  orden,
  activo,
  especial,
  metadata
}) {
  const sb = requireClient();
  const { data, error } = await sb
    .from('ticket_types')
    .insert({
      nombre: String(nombre || '').trim(),
      descripcion: String(descripcion || '').trim(),
      incluye: String(incluye || '').trim(),
      precio: Number(precio || 0),
      categoria: String(categoria || '').trim(),
      orden: Number(orden || 0),
      activo: Boolean(activo),
      especial: Boolean(especial),
      metadata: metadata && typeof metadata === 'object' ? metadata : {}
    })
    .select('*')
    .single();
  if (error) throw error;
  return { data: { ticketType: mapTicketTypeRow(data) } };
}

export async function updateTicketType({
  id,
  nombre,
  descripcion,
  incluye,
  precio,
  categoria,
  orden,
  activo,
  especial,
  metadata
}) {
  const sb = requireClient();
  const { data, error } = await sb
    .from('ticket_types')
    .update({
      nombre: String(nombre || '').trim(),
      descripcion: String(descripcion || '').trim(),
      incluye: String(incluye || '').trim(),
      precio: Number(precio || 0),
      categoria: String(categoria || '').trim(),
      orden: Number(orden || 0),
      activo: Boolean(activo),
      especial: Boolean(especial),
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return { data: { ticketType: mapTicketTypeRow(data) } };
}

export async function deactivateTicketType({ id, activo = false }) {
  const sb = requireClient();
  const { error } = await sb
    .from('ticket_types')
    .update({ activo: Boolean(activo), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  return { data: {} };
}

export async function deleteTicketType({ id }) {
  const sb = requireClient();
  const { error } = await sb.from('ticket_types').delete().eq('id', id);
  if (error) throw error;
  return { data: {} };
}

export async function listRecentTickets(opts = {}) {
  const lim = Math.max(1, Math.min(50, Number(opts.limit ?? 10) || 10));
  const sb = requireClient();
  const { data, error } = await sb
    .from('tickets')
    .select('*')
    .order('fecha_creacion', { ascending: false })
    .limit(lim);
  if (error) throw error;
  return { data: { tickets: (data || []).map((r) => mapTicketRow(r)) } };
}

export async function getTicketById({ id }) {
  const sb = requireClient();
  const { data: t, error } = await sb.from('tickets').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  let userRow = null;
  if (t?.user_id) {
    const u = await sb.from('users').select('id,nombre,email').eq('id', t.user_id).maybeSingle();
    if (!u.error && u.data) userRow = u.data;
  }
  return { data: { ticket: mapTicketRow(t, userRow) } };
}

export async function updateTicketStatus({ id, estadoTicket, estadoPago }) {
  const sb = requireClient();
  const { error } = await sb
    .from('tickets')
    .update({
      estado_ticket: estadoTicket,
      estado_pago: estadoPago,
      fecha_escaneo: new Date().toISOString()
    })
    .eq('id', id);
  if (error) throw error;
  return { data: {} };
}

export async function getTicketForScan(ticketId) {
  return getTicketById({ id: ticketId });
}

export async function createTicketDeliveryLog({
  ticketId,
  email = '',
  channel = 'email',
  status = 'sent',
  error = '',
  metadata = {}
}) {
  const sb = requireClient();
  const row = {
    ticket_id: String(ticketId || ''),
    email: String(email || ''),
    channel: String(channel || 'email'),
    status: String(status || 'sent'),
    error: String(error || ''),
    metadata: metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {}
  };
  const { error: insErr } = await sb.from('ticket_delivery_logs').insert(row);
  if (insErr) throw insErr;
  return { data: {} };
}

export async function listTicketDeliveryLogs({ ticketId, limit = 50 } = {}) {
  const sb = requireClient();
  if (!ticketId) return { data: { logs: [] } };
  const lim = Math.max(1, Math.min(200, Number(limit || 50)));
  const { data, error } = await sb
    .from('ticket_delivery_logs')
    .select('*')
    .eq('ticket_id', String(ticketId))
    .order('created_at', { ascending: false })
    .limit(lim);
  if (error) throw error;
  return { data: { logs: data || [] } };
}

export async function createAuditEvent({
  actorUserId = null,
  actorEmail = '',
  eventType,
  entityType = null,
  entityId = null,
  severity = 'info',
  title,
  description = '',
  metadata = {}
}) {
  const sb = requireClient();
  const row = {
    actor_user_id: actorUserId ? String(actorUserId) : null,
    actor_email: String(actorEmail || ''),
    event_type: String(eventType || 'system_event'),
    entity_type: entityType ? String(entityType) : null,
    entity_id: entityId ? String(entityId) : null,
    severity: String(severity || 'info'),
    title: String(title || 'Evento'),
    description: String(description || ''),
    metadata: metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {}
  };
  const { error } = await sb.from('audit_events').insert(row);
  if (error) throw error;
  return { data: {} };
}

export async function listAuditEvents({
  range = 'today',
  eventType = '',
  severity = '',
  query = '',
  limit = 50
} = {}) {
  const sb = requireClient();
  const lim = Math.max(1, Math.min(200, Number(limit || 50)));
  let q = sb.from('audit_events').select('*').order('created_at', { ascending: false }).limit(lim);
  if (eventType) q = q.eq('event_type', String(eventType));
  if (severity) q = q.eq('severity', String(severity));
  const now = new Date();
  if (range === 'today' || range === 'yesterday' || range === 'week') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    if (range === 'yesterday') {
      start.setDate(start.getDate() - 1);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      q = q.gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
    } else if (range === 'week') {
      start.setDate(start.getDate() - 6);
      q = q.gte('created_at', start.toISOString());
    } else {
      q = q.gte('created_at', start.toISOString());
    }
  }
  const queryClean = String(query || '').trim();
  if (queryClean) {
    q = q.or(
      `title.ilike.%${queryClean}%,description.ilike.%${queryClean}%,actor_email.ilike.%${queryClean}%,entity_id.ilike.%${queryClean}%`
    );
  }
  const { data, error } = await q;
  if (error) throw error;
  return { data: { events: data || [] } };
}

export async function listAuditEventsForEntity({ entityType, entityId, limit = 30 } = {}) {
  const sb = requireClient();
  if (!entityType || !entityId) return { data: { events: [] } };
  const lim = Math.max(1, Math.min(200, Number(limit || 30)));
  const { data, error } = await sb
    .from('audit_events')
    .select('*')
    .eq('entity_type', String(entityType))
    .eq('entity_id', String(entityId))
    .order('created_at', { ascending: false })
    .limit(lim);
  if (error) throw error;
  return { data: { events: data || [] } };
}

export async function searchTicketsForSupport(queryOrOptions, maybeFilters = {}) {
  const sb = requireClient();
  const options =
    typeof queryOrOptions === 'string'
      ? { query: queryOrOptions, ...(maybeFilters || {}) }
      : queryOrOptions && typeof queryOrOptions === 'object'
        ? queryOrOptions
        : {};
  const qText = String(options.query || '').trim();
  if (!qText) return { data: { tickets: [] } };
  const lim = Math.max(1, Math.min(50, Number(options.limit || 25)));
  const statusFilter = String(options.status || '').trim().toLowerCase();
  const exact = await sb.from('tickets').select('*').eq('id', qText).limit(1);
  let rows = exact.data || [];
  if (!rows.length) {
    const like = `%${qText}%`;
    const runLookup = async (withPhone = true) =>
      sb
        .from('tickets')
        .select('*')
        .or(
          withPhone
            ? `cliente_email.ilike.${like},cliente_nombre.ilike.${like},id.ilike.${like},codigo_corto.ilike.${like},cliente_telefono.ilike.${like}`
            : `cliente_email.ilike.${like},cliente_nombre.ilike.${like},id.ilike.${like},codigo_corto.ilike.${like}`
        )
        .order('fecha_creacion', { ascending: false })
        .limit(lim);
    let lookup = await runLookup(true);
    if (lookup.error && /cliente_telefono|column/i.test(String(lookup.error?.message || ''))) {
      lookup = await runLookup(false);
    }
    if (lookup.error) throw lookup.error;
    rows = lookup.data || [];
  } else if (exact.error) {
    throw exact.error;
  }
  if (statusFilter && statusFilter !== 'todos') {
    rows = rows.filter((r) => {
      const ticketStatus = String(r.estado_ticket || '').toLowerCase();
      const payStatus = String(r.estado_pago || '').toLowerCase();
      if (statusFilter === 'vigentes') return ticketStatus === 'valido';
      if (statusFilter === 'usados') return ticketStatus === 'escaneado' || ticketStatus === 'usado';
      if (statusFilter === 'pendientes') return payStatus !== 'pagado';
      if (statusFilter === 'cancelados') return ticketStatus === 'cancelado';
      return true;
    });
  }
  return { data: { tickets: rows.map((r) => mapTicketRow(r)) } };
}

export async function getTicketSupportDetails({ ticketId }) {
  const { data } = await getTicketById({ id: ticketId });
  return { data: { ticket: data?.ticket || null } };
}

export async function listMesaReservasByTicketId({ ticketId }) {
  const sb = requireClient();
  if (!ticketId) return { data: { mesaReservas: [] } };
  const { data, error } = await sb
    .from('mesa_reservas')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('creado_en', { ascending: false })
    .limit(25);
  if (error) throw error;
  return { data: { mesaReservas: (data || []).map(mapMesaRow) } };
}

/** Ticket completo + mesas vinculadas para UI operativa del escáner. */
export async function getTicketSnapshotForScan(ticketId) {
  if (!ticketId) return { ticket: null, mesaReservas: [] };
  try {
    const [tr, mr] = await Promise.all([
      getTicketById({ id: ticketId }),
      listMesaReservasByTicketId({ ticketId }).catch(() => ({ data: { mesaReservas: [] } }))
    ]);
    return {
      ticket: tr?.data?.ticket || null,
      mesaReservas: mr?.data?.mesaReservas || []
    };
  } catch {
    return { ticket: null, mesaReservas: [] };
  }
}

export async function listTicketsForScannerCache({ date }) {
  const sb = requireClient();
  const fecha = String(date || new Date().toISOString().slice(0, 10));
  const start = `${fecha}T00:00:00.000Z`;
  const end = `${fecha}T23:59:59.999Z`;
  const { data, error } = await sb
    .from('tickets')
    .select('*')
    .gte('fecha_creacion', start)
    .lte('fecha_creacion', end)
    .order('fecha_creacion', { ascending: false })
    .limit(2000);
  if (error) throw error;
  return { data: { tickets: (data || []).map((r) => mapTicketRow(r)) } };
}

function scanInvalid(reason, ticket = null) {
  return { data: { result: 'invalid', reason, ticket } };
}

function isScanTicketRpcMissing(error) {
  const code = String(error?.code || '');
  const msg = String(error?.message || '').toLowerCase();
  return (
    code === 'PGRST202' ||
    code === '42883' ||
    msg.includes('scan_ticket') && (msg.includes('could not find') || msg.includes('does not exist'))
  );
}

export async function scanTicketOnline({ ticketId, rawQr, deviceId, scannedBy }) {
  const sb = requireClient();
  try {
    const { data, error } = await sb.rpc('scan_ticket', {
      p_ticket_id: String(ticketId || ''),
      p_raw_qr: String(rawQr || ''),
      p_device_id: deviceId || null,
      p_offline_local_id: null
    });
    if (error) throw error;
    const rawTicket = data?.ticket || null;
    return {
      data: {
        result: data?.result || 'invalid',
        reason: data?.reason || 'unknown',
        ticket: rawTicket ? mapTicketRow(rawTicket) : null
      }
    };
  } catch (error) {
    if (isScanTicketRpcMissing(error)) {
      throw new Error('Funcion scan_ticket no desplegada');
    }
    throw error;
  }
}

export async function syncPendingTicketScan(scan) {
  const sb = requireClient();
  try {
    const { data, error } = await sb.rpc('scan_ticket', {
      p_ticket_id: String(scan?.ticketId || ''),
      p_raw_qr: String(scan?.rawQr || ''),
      p_device_id: scan?.deviceId || null,
      p_offline_local_id: scan?.localId || null
    });
    if (error) throw error;
    const rawTicket = data?.ticket || null;
    return {
      data: {
        result: data?.result || 'invalid',
        reason: data?.reason || 'unknown',
        ticket: rawTicket ? mapTicketRow(rawTicket) : null
      }
    };
  } catch (error) {
    if (isScanTicketRpcMissing(error)) {
      throw new Error('Funcion scan_ticket no desplegada');
    }
    throw error;
  }
}

export async function listRecentTicketScans({ limit = 50 } = {}) {
  const sb = requireClient();
  const { data, error } = await sb
    .from('ticket_scans')
    .select('*')
    .order('scanned_at', { ascending: false })
    .limit(Math.max(1, Math.min(200, Number(limit || 50))));
  if (error) {
    if (isTicketScansRelationMissing(error)) {
      if (!warnedTicketScansMissing) {
        console.warn(
          '[ticket_scans] Tabla no encontrada o fuera del schema cache. Ejecuta supabase/patch_scan_ticket_rpc.sql en el SQL Editor de Supabase.'
        );
        warnedTicketScansMissing = true;
      }
      return { data: { scans: [] } };
    }
    throw error;
  }
  return { data: { scans: (data || []).map(mapTicketScanRow) } };
}

export async function createAnonymousTicket(variables) {
  const sb = requireClient();
  const id = newUuidForTicket();
  const { error } = await sb.from('tickets').insert({
    id,
    cliente_nombre: variables.clienteNombre,
    cliente_email: variables.clienteEmail,
    metodo_pago: variables.metodoPago,
    estado_pago: variables.estadoPago,
    estado_ticket: 'valido',
    precio_total: variables.precioTotal,
    metadata: variables.metadata && typeof variables.metadata === 'object' ? variables.metadata : {}
  });
  if (error) throw error;
  return { data: { ticket_insert: { id } } };
}

export async function createUserTicket(variables) {
  const sb = requireClient();
  const uid = getCanonicalUserId();
  if (!uid) throw new Error('Sesion requerida para ticket de usuario');
  const id = newUuidForTicket();
  const { error } = await sb.from('tickets').insert({
    id,
    user_id: uid,
    cliente_nombre: variables.clienteNombre,
    cliente_email: variables.clienteEmail,
    metodo_pago: variables.metodoPago,
    estado_pago: variables.estadoPago,
    estado_ticket: 'valido',
    precio_total: variables.precioTotal,
    metadata: variables.metadata && typeof variables.metadata === 'object' ? variables.metadata : {}
  });
  if (error) throw error;
  return { data: { ticket_insert: { id } } };
}

export async function listUserTickets({ userId }) {
  const sb = requireClient();
  const { data, error } = await sb
    .from('tickets')
    .select('*')
    .eq('user_id', userId)
    .order('fecha_creacion', { ascending: false });
  if (error) throw error;
  return { data: { tickets: (data || []).map((r) => mapTicketRow(r)) } };
}

export async function getUserProfile({ id }) {
  const sb = requireClient();
  const { data, error } = await sb.from('users').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return { data: { user: mapUserRow(data) } };
}

export async function upsertUser({ id, email, nombre, rol }) {
  const sb = requireClient();
  const { error } = await sb.from('users').upsert(
    {
      id,
      email,
      nombre,
      rol,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
  return { data: {} };
}

export async function createPaquete({ nombre, descripcion, precioBase, incluyePersonas }) {
  const sb = requireClient();
  const { error } = await sb.from('paquetes').insert({
    nombre,
    descripcion,
    precio_base: precioBase,
    incluye_personas: incluyePersonas,
    activo: true
  });
  if (error) throw error;
  return { data: {} };
}

export async function upsertLandingPage(vars) {
  const sb = requireClient();
  const { error } = await sb.from('landing_page').upsert(
    {
      id: vars.id,
      descripcion_parque: vars.descripcionParque,
      mapa_distribucion_json: vars.mapaDistribucionJson,
      mapa_mesas_json: vars.mapaMesasJson,
      mapa_estacionamiento_json: vars.mapaEstacionamientoJson,
      imagen_satelital_url: vars.imagenSatelitalUrl,
      google_maps_url: vars.googleMapsUrl,
      horarios_texto: vars.horariosTexto,
      abierto_ahora: vars.abiertoAhora,
      ocupacion_texto: vars.ocupacionTexto,
      estacionamiento_texto: vars.estacionamientoTexto,
      botones_json: vars.botonesJson
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
  return { data: {} };
}

export async function createServicio(vars) {
  const sb = requireClient();
  const { error } = await sb.from('servicios').insert({
    titulo: vars.titulo,
    descripcion: vars.descripcion,
    imagen_url: vars.imagenUrl,
    precio: vars.precio,
    orden: vars.orden,
    activo: vars.activo
  });
  if (error) throw error;
  return { data: {} };
}

export async function updateServicio(vars) {
  const sb = requireClient();
  const { error } = await sb
    .from('servicios')
    .update({
      titulo: vars.titulo,
      descripcion: vars.descripcion,
      imagen_url: vars.imagenUrl,
      precio: vars.precio,
      orden: vars.orden,
      activo: vars.activo
    })
    .eq('id', vars.id);
  if (error) throw error;
  return { data: {} };
}

export async function deleteServicio({ id }) {
  const sb = requireClient();
  const { error } = await sb.from('servicios').delete().eq('id', id);
  if (error) throw error;
  return { data: {} };
}

export async function createProducto(vars) {
  const sb = requireClient();
  const { error } = await sb.from('productos').insert({
    titulo: vars.titulo,
    descripcion: vars.descripcion,
    imagen_url: vars.imagenUrl,
    precio: vars.precio,
    stock_actual: vars.stockActual,
    reservado_aprox: vars.reservadoAprox,
    activo: vars.activo
  });
  if (error) throw error;
  return { data: {} };
}

export async function updateProducto(vars) {
  const sb = requireClient();
  const { error } = await sb
    .from('productos')
    .update({
      titulo: vars.titulo,
      descripcion: vars.descripcion,
      imagen_url: vars.imagenUrl,
      precio: vars.precio,
      activo: vars.activo
    })
    .eq('id', vars.id);
  if (error) throw error;
  return { data: {} };
}

export async function updateProductoStock({ id, stockActual, reservadoAprox }) {
  const sb = requireClient();
  const { error } = await sb
    .from('productos')
    .update({
      stock_actual: stockActual,
      reservado_aprox: reservadoAprox
    })
    .eq('id', id);
  if (error) throw error;
  return { data: {} };
}

export async function deleteProducto({ id }) {
  const sb = requireClient();
  const { error } = await sb.from('productos').delete().eq('id', id);
  if (error) throw error;
  return { data: {} };
}

export async function createMovimientoInventario({ productoId, tipo, cantidad, nota }) {
  const sb = requireClient();
  const uid = getCanonicalUserId();
  const { error } = await sb.from('movimiento_inventarios').insert({
    producto_id: productoId,
    tipo,
    cantidad,
    nota,
    creado_por: uid
  });
  if (error) throw error;
  return { data: {} };
}

export async function listMovimientosInventario({ productoId }) {
  const sb = requireClient();
  const { data, error } = await sb
    .from('movimiento_inventarios')
    .select('*')
    .eq('producto_id', productoId)
    .order('fecha_creacion', { ascending: false })
    .limit(30);
  if (error) throw error;
  return { data: { movimientoInventarios: (data || []).map(mapMovRow) } };
}

function mapMovRowJoined(r) {
  const base = mapMovRow(r);
  let productoTitulo = null;
  const nested = r.productos;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    productoTitulo = nested.titulo ?? null;
  }
  return { ...base, productoTitulo };
}

export async function listRecentMovimientosForDashboard({ limit = 12 } = {}) {
  const sb = requireClient();
  const lim = Math.max(1, Math.min(40, Number(limit) || 12));
  const { data, error } = await sb
    .from('movimiento_inventarios')
    .select('id,tipo,cantidad,nota,fecha_creacion,producto_id,productos(titulo)')
    .order('fecha_creacion', { ascending: false })
    .limit(lim);
  if (error) throw error;
  return { data: { movimientos: (data || []).map(mapMovRowJoined) } };
}

export async function listMesaReservasActivasPorFecha({ fechaDia }) {
  const sb = requireClient();
  const { data, error } = await sb
    .from('mesa_reservas')
    .select('map_item_id')
    .eq('fecha_dia', fechaDia)
    .eq('estado', 'apartada');
  if (error) throw error;
  return { data: { mesaReservas: (data || []).map((r) => ({ mapItemId: r.map_item_id })) } };
}

export async function checkMesaReservaLibre({ fechaDia, mapItemId }) {
  const sb = requireClient();
  const { data, error } = await sb
    .from('mesa_reservas')
    .select('id,user_id')
    .eq('fecha_dia', fechaDia)
    .eq('map_item_id', mapItemId)
    .eq('estado', 'apartada')
    .limit(5);
  if (error) throw error;
  const rows = (data || []).map((r) => ({
    id: r.id,
    userId: r.user_id || ''
  }));
  return { data: { mesaReservas: rows } };
}

export async function listMisMesaReservas({ userId }) {
  const sb = requireClient();
  const uid = getCanonicalUserId() || String(userId || '').trim();
  if (!uid) return { data: { mesaReservas: [] } };
  const { data, error } = await sb
    .from('mesa_reservas')
    .select('*')
    .eq('user_id', uid)
    .order('creado_en', { ascending: false })
    .limit(80);
  if (error) {
    if (isMesaReservaRlsError(error)) {
      throw new Error('No tienes permiso para consultar tus reservas de mesa. Inicia sesión y vuelve a intentar.');
    }
    throw error;
  }
  return { data: { mesaReservas: (data || []).map(mapMesaRow) } };
}

export async function createMesaReserva({ fechaDia, mapItemId }) {
  const sb = requireClient();
  const uid = getCanonicalUserId();
  if (!uid) throw new Error('Debes iniciar sesion para reservar mesa');
  const id = newUuidForTicket();
  const { error } = await sb.from('mesa_reservas').insert({
    id,
    fecha_dia: fechaDia,
    map_item_id: mapItemId,
    estado: 'apartada',
    user_id: uid
  });
  if (error) {
    if (isMesaReservaRlsError(error)) {
      throw new Error('No tienes permiso para reservar esta mesa. Inicia sesión o revisa tu cuenta.');
    }
    throw error;
  }
  return { data: { mesaReserva_insert: { id } } };
}

export async function createMesaReservaMonetizable(vars) {
  const sb = requireClient();
  const uid = getCanonicalUserId();
  if (!uid) throw new Error('Debes iniciar sesion para reservar mesa');
  const row = {
    fecha_dia: vars.fechaDia,
    map_item_id: vars.mapItemId,
    estado: 'apartada',
    user_id: uid,
    mesa_label: vars.mesaLabel,
    mesa_zona: vars.mesaZona,
    mesa_capacidad: vars.mesaCapacidad,
    mesa_precio: vars.mesaPrecio,
    extras_json: vars.extrasJson,
    subtotal_mesa: vars.subtotalMesa,
    total_extras: vars.totalExtras,
    total_reserva: vars.totalReserva,
    estado_pago: vars.estadoPago,
    metodo_pago: vars.metodoPago,
    notas_cliente: vars.notasCliente
  };
  const { data: prior, error: findErr } = await sb
    .from('mesa_reservas')
    .select('id')
    .eq('fecha_dia', vars.fechaDia)
    .eq('map_item_id', vars.mapItemId)
    .eq('user_id', uid)
    .eq('estado', 'apartada')
    .maybeSingle();
  if (findErr) {
    if (isMesaReservaRlsError(findErr)) {
      throw new Error('No tienes permiso para reservar esta mesa. Inicia sesión o revisa tu cuenta.');
    }
    throw findErr;
  }
  if (prior?.id) {
    const { error } = await sb.from('mesa_reservas').update(row).eq('id', prior.id);
    if (error) {
      if (isMesaReservaRlsError(error)) {
        throw new Error('No tienes permiso para reservar esta mesa. Inicia sesión o revisa tu cuenta.');
      }
      throw error;
    }
    return { data: { mesaReserva_insert: { id: prior.id } } };
  }
  const id = newUuidForTicket();
  const { error } = await sb.from('mesa_reservas').insert({ ...row, id });
  if (error) {
    if (isMesaReservaRlsError(error)) {
      throw new Error('No tienes permiso para reservar esta mesa. Inicia sesión o revisa tu cuenta.');
    }
    throw error;
  }
  return { data: { mesaReserva_insert: { id } } };
}

export async function listMesaReservasByFecha({ fechaDia }) {
  const sb = requireClient();
  const { data, error } = await sb
    .from('mesa_reservas')
    .select('*')
    .eq('fecha_dia', fechaDia)
    .order('creado_en', { ascending: false })
    .limit(500);
  if (error) {
    if (isMesaReservaRlsError(error)) {
      throw new Error('No tienes permiso para consultar reservas de mesa para esta fecha.');
    }
    throw error;
  }
  return { data: { mesaReservas: (data || []).map(mapMesaRow) } };
}

export async function listRecentMesaReservasAdmin({ limit = 12 } = {}) {
  const sb = requireClient();
  const lim = Math.max(1, Math.min(40, Number(limit) || 12));
  const { data, error } = await sb
    .from('mesa_reservas')
    .select('*')
    .order('creado_en', { ascending: false })
    .limit(lim);
  if (error) throw error;
  return { data: { mesaReservas: (data || []).map(mapMesaRow) } };
}

export async function cancelarMesaReserva({ id }) {
  const sb = requireClient();
  const { error } = await sb.from('mesa_reservas').update({ estado: 'cancelada' }).eq('id', id);
  if (error) throw error;
  return { data: {} };
}

export async function listMesaReservasVencibles({ fechaDia }) {
  const sb = requireClient();
  const { data, error } = await sb
    .from('mesa_reservas')
    .select('*')
    .lt('fecha_dia', fechaDia)
    .eq('estado', 'apartada')
    .order('creado_en', { ascending: false })
    .limit(800);
  if (error) throw error;
  return { data: { mesaReservas: (data || []).map(mapMesaRow) } };
}

export async function updateMesaReservaEstado({ id, estado }) {
  const sb = requireClient();
  const { error } = await sb.from('mesa_reservas').update({ estado }).eq('id', id);
  if (error) throw error;
  return { data: {} };
}

export async function vincularTicketMesaReserva({ id, ticketId }) {
  const sb = requireClient();
  const { error } = await sb.from('mesa_reservas').update({ ticket_id: ticketId }).eq('id', id);
  if (error) throw error;
  return { data: {} };
}

export async function deleteUserRecord({ id }) {
  const sb = requireClient();
  const { error } = await sb.from('users').delete().eq('id', id);
  if (error) throw error;
  return { data: {} };
}

export async function deleteConfiguracion({ id }) {
  const sb = requireClient();
  const { error } = await sb.from('configuracion').delete().eq('id', id);
  if (error) throw error;
  return { data: {} };
}

export async function deletePaquete({ id }) {
  const sb = requireClient();
  const { error } = await sb.from('paquetes').delete().eq('id', id);
  if (error) throw error;
  return { data: {} };
}

export async function deleteMovimientoInventario({ id }) {
  const sb = requireClient();
  const { error } = await sb.from('movimiento_inventarios').delete().eq('id', id);
  if (error) throw error;
  return { data: {} };
}

export async function deleteLandingPage({ id }) {
  const sb = requireClient();
  const { error } = await sb.from('landing_page').delete().eq('id', id);
  if (error) throw error;
  return { data: {} };
}

export async function deleteTicket({ id }) {
  const sb = requireClient();
  const { error } = await sb.from('tickets').delete().eq('id', id);
  if (error) throw error;
  return { data: {} };
}

export async function deleteMesaReserva({ id }) {
  const sb = requireClient();
  const { error } = await sb.from('mesa_reservas').delete().eq('id', id);
  if (error) throw error;
  return { data: {} };
}

export async function getAppThemeRow() {
  const sb = requireClient();
  const { data, error } = await sb.from('app_theme').select('payload,updated_at').eq('id', 'global').maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertAppThemePayload(payload) {
  const sb = requireClient();
  const { error } = await sb.from('app_theme').upsert(
    {
      id: 'global',
      payload,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
}

export async function listParkingSpotsRows() {
  const sb = requireClient();
  const { data, error } = await sb
    .from('parking_spots')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
}

// --- Dashboard metrics (RLS-safe: errores → fallback sin romper UI) ---

const KNOWN_DISCOUNT_RULE_TYPES = new Set([
  'minSubtotal',
  'minTotalQty',
  'dateRange',
  'oncePerUser',
  'paymentMethod'
]);

function warnDashboardMetric(tag, err) {
  console.warn(`[dashboardMetric:${tag}]`, err?.message || err);
}

function ticketCreatedMexicoDay(row) {
  if (!row?.fecha_creacion) return null;
  try {
    return formatFechaDia(new Date(row.fecha_creacion));
  } catch {
    return null;
  }
}

function ticketScannedMexicoDay(row) {
  if (!row?.fecha_escaneo) return null;
  try {
    return formatFechaDia(new Date(row.fecha_escaneo));
  } catch {
    return null;
  }
}

async function fetchTicketsRecentForMetrics(limit = 2500) {
  const sb = requireClient();
  const { data, error } = await sb
    .from('tickets')
    .select('id,precio_total,estado_pago,estado_ticket,fecha_creacion,fecha_escaneo')
    .order('fecha_creacion', { ascending: false })
    .limit(Math.max(50, Math.min(5000, Number(limit) || 2500)));
  if (error) throw error;
  return data || [];
}

function summarizeSalesDay(rows, dayStr) {
  const dayRows = rows.filter((r) => ticketCreatedMexicoDay(r) === dayStr);
  const paid = dayRows.filter((r) => r.estado_pago === 'pagado');
  const totalPaid = paid.reduce((s, r) => s + Number(r.precio_total || 0), 0);
  const pendingAmount = dayRows
    .filter((r) => r.estado_pago !== 'pagado')
    .reduce((s, r) => s + Number(r.precio_total || 0), 0);
  return {
    ticketsCount: dayRows.length,
    paidCount: paid.length,
    totalPaid,
    pendingAmount,
    estimatedRevenue: totalPaid + pendingAmount
  };
}

export async function getTodaySalesSummary(opts = {}) {
  const includeYesterday = opts.includeYesterday === true;
  const empty = () => ({
    ok: false,
    fechaDia: formatFechaDia(),
    ticketsCount: 0,
    paidCount: 0,
    totalPaid: 0,
    pendingAmount: 0,
    estimatedRevenue: 0,
    yesterdayTicketsCount: 0,
    yesterdayPaidCount: 0,
    yesterdayTotalPaid: 0,
    compareVsYesterday: null,
    hasYesterdaySlice: false
  });
  try {
    const rows = await fetchTicketsRecentForMetrics();
    const today = formatFechaDia();
    const t = summarizeSalesDay(rows, today);
    const yesterdayStr = addCalendarDaysMexico(today, -1);
    const y = summarizeSalesDay(rows, yesterdayStr);
    const hasYesterdaySlice = rows.some((r) => ticketCreatedMexicoDay(r) === yesterdayStr);
    let compareVsYesterday = null;
    if (includeYesterday && hasYesterdaySlice) {
      const delta = Number(t.totalPaid || 0) - Number(y.totalPaid || 0);
      compareVsYesterday = {
        fechaReferencia: yesterdayStr,
        deltaPaid: delta,
        pctPaid:
          Number(y.totalPaid || 0) > 0
            ? Math.round(((Number(t.totalPaid || 0) - Number(y.totalPaid || 0)) / Number(y.totalPaid || 0)) * 1000) / 10
            : null
      };
    }
    return {
      ok: true,
      fechaDia: today,
      ticketsCount: t.ticketsCount,
      paidCount: t.paidCount,
      totalPaid: t.totalPaid,
      pendingAmount: t.pendingAmount,
      estimatedRevenue: t.estimatedRevenue,
      yesterdayTicketsCount: y.ticketsCount,
      yesterdayPaidCount: y.paidCount,
      yesterdayTotalPaid: y.totalPaid,
      compareVsYesterday,
      hasYesterdaySlice
    };
  } catch (e) {
    warnDashboardMetric('getTodaySalesSummary', e);
    return empty();
  }
}

export async function getTodayTicketsSummary() {
  const empty = () => ({
    ok: false,
    fechaDia: formatFechaDia(),
    soldToday: 0,
    scannedToday: 0,
    validOutstanding: 0,
    cancelledToday: 0
  });
  try {
    const rows = await fetchTicketsRecentForMetrics();
    const today = formatFechaDia();
    const soldToday = rows.filter((r) => ticketCreatedMexicoDay(r) === today).length;
    const scannedToday = rows.filter(
      (r) => r.estado_ticket === 'escaneado' && ticketScannedMexicoDay(r) === today
    ).length;
    const validOutstanding = rows.filter(
      (r) => ticketCreatedMexicoDay(r) === today && r.estado_ticket === 'valido'
    ).length;
    const cancelledToday = rows.filter(
      (r) => ticketCreatedMexicoDay(r) === today && r.estado_ticket === 'cancelado'
    ).length;
    return {
      ok: true,
      fechaDia: today,
      soldToday,
      scannedToday,
      validOutstanding,
      cancelledToday
    };
  } catch (e) {
    warnDashboardMetric('getTodayTicketsSummary', e);
    return empty();
  }
}

export async function getTodayMesaReservasSummary() {
  const fd = formatFechaDia();
  const empty = () => ({
    ok: false,
    fechaDia: fd,
    total: 0,
    apartadas: 0,
    ocupadasApartadas: 0,
    pagadasPendientes: 0,
    totalReservaEstimado: 0,
    ingresoPagadoEstimado: 0,
    proximas: []
  });
  try {
    const res = await listMesaReservasByFecha({ fechaDia: fd });
    const mesas = res.data?.mesaReservas || [];
    const apartadas = mesas.filter((m) => (m.estado || '') === 'apartada').length;
    const pagadasPendientes = mesas.filter((m) => (m.estadoPago || '') !== 'pagado').length;
    const totalReservaEstimado = mesas.reduce((s, m) => s + Math.max(0, Number(m.totalReserva || 0)), 0);
    const ingresoPagadoEstimado = mesas
      .filter((m) => (m.estadoPago || '') === 'pagado')
      .reduce((s, m) => s + Math.max(0, Number(m.totalReserva || 0)), 0);
    const proximas = mesas
      .filter((m) => (m.estado || '') === 'apartada')
      .slice()
      .sort((a, b) => String(b.creadoEn || '').localeCompare(String(a.creadoEn || '')))
      .slice(0, 5)
      .map((m) => ({
        id: m.id,
        label: m.mesaLabel || m.mapItemId || 'Mesa',
        zona: m.mesaZona || '',
        totalReserva: m.totalReserva != null ? Number(m.totalReserva) : null,
        estadoPago: m.estadoPago || ''
      }));
    return {
      ok: true,
      fechaDia: fd,
      total: mesas.length,
      apartadas,
      ocupadasApartadas: apartadas,
      pagadasPendientes,
      totalReservaEstimado,
      ingresoPagadoEstimado,
      proximas
    };
  } catch (e) {
    warnDashboardMetric('getTodayMesaReservasSummary', e);
    return empty();
  }
}

export async function getInventoryAlerts({ lowStockThreshold = 8 } = {}) {
  const thr = Math.max(0, Number(lowStockThreshold) || 8);
  try {
    const { data: { productos } = { productos: [] } } = await listProductosAdmin();
    const active = (productos || []).filter((p) => p.activo);
    const zeroStockCount = active.filter((p) => Number(p.stockActual) <= 0).length;
    const low = active.filter((p) => Number(p.stockActual) > 0 && Number(p.stockActual) <= thr);
    const reservedApproxTotal = active.reduce((s, p) => s + Math.max(0, Number(p.reservadoAprox || 0)), 0);
    return {
      ok: true,
      threshold: thr,
      activeProductsCount: active.length,
      lowStockCount: low.length,
      zeroStockCount,
      reservedApproxTotal,
      samples: [...active.filter((p) => Number(p.stockActual) <= 0), ...low]
        .slice(0, 10)
        .map((p) => ({
          id: p.id,
          titulo: p.titulo,
          stockActual: p.stockActual
        }))
    };
  } catch (e) {
    warnDashboardMetric('getInventoryAlerts', e);
    return {
      ok: false,
      threshold: thr,
      activeProductsCount: 0,
      lowStockCount: 0,
      zeroStockCount: 0,
      reservedApproxTotal: 0,
      samples: []
    };
  }
}

export async function getActiveDiscountsSummary() {
  try {
    const { data: { descuentos } = { descuentos: [] } } = await listDescuentosAdmin();
    const active = (descuentos || []).filter((d) => d.activo && Number(d.usosRestantes) > 0);
    return {
      ok: true,
      activeCount: active.length,
      codes: active.slice(0, 12).map((d) => d.codigo)
    };
  } catch (e) {
    warnDashboardMetric('getActiveDiscountsSummary', e);
    return { ok: false, activeCount: 0, codes: [] };
  }
}

function analyzeDiscountRowIssues(d) {
  let broken = false;
  let expiringSoonRule = false;
  const today = formatFechaDia();
  const in7 = addCalendarDaysMexico(today, 7);
  let rules = [];
  try {
    rules = parseDiscountRules(d.reglasJson);
  } catch {
    return { broken: true, expiringSoonRule: false };
  }
  for (const rule of rules) {
    if (!rule || typeof rule !== 'object') {
      broken = true;
      continue;
    }
    const ty = String(rule.type || '');
    if (!KNOWN_DISCOUNT_RULE_TYPES.has(ty)) broken = true;
    if (ty === 'dateRange') {
      const start = String(rule.start || '').slice(0, 10);
      const end = String(rule.end || '').slice(0, 10);
      if (start && end && start > end) broken = true;
      if (end && end >= today && end <= in7) expiringSoonRule = true;
    }
  }
  return { broken, expiringSoonRule };
}

export async function getDiscountExecutiveSummary() {
  try {
    const { data: { descuentos } = { descuentos: [] } } = await listDescuentosAdmin();
    const list = descuentos || [];
    let activeUseful = 0;
    let exhaustedActive = 0;
    let inactive = 0;
    let expiringSoonCount = 0;
    let brokenRulesDiscountCount = 0;
    for (const d of list) {
      const ur = Number(d.usosRestantes || 0);
      if (!d.activo) inactive++;
      else if (ur <= 0) exhaustedActive++;
      else activeUseful++;
      const { broken, expiringSoonRule } = analyzeDiscountRowIssues(d);
      if (broken) brokenRulesDiscountCount++;
      if (expiringSoonRule) expiringSoonCount++;
    }
    return {
      ok: true,
      total: list.length,
      activeUsefulCount: activeUseful,
      exhaustedActiveCount: exhaustedActive,
      inactiveCount: inactive,
      expiringSoonCount,
      brokenRulesDiscountCount
    };
  } catch (e) {
    warnDashboardMetric('getDiscountExecutiveSummary', e);
    return {
      ok: false,
      total: 0,
      activeUsefulCount: 0,
      exhaustedActiveCount: 0,
      inactiveCount: 0,
      expiringSoonCount: 0,
      brokenRulesDiscountCount: 0
    };
  }
}

export async function getParkingSummary() {
  try {
    const rows = await listParkingSpotsRows();
    const spots = rows || [];
    const countState = (st) => spots.filter((s) => (s.estado || 'libre') === st).length;
    const mantenimiento = countState('mantenimiento');
    const taller = countState('taller');
    const sucio = countState('sucio');
    const ocupados = countState('ocupado');
    const reservados = countState('reservado');
    const libres = countState('libre');
    const otros = spots.filter((s) =>
      ['mantenimiento', 'taller', 'sucio'].includes(String(s.estado || ''))
    ).length;
    const total = spots.length;
    const denom = Math.max(0, total - mantenimiento - taller);
    const ocupacionPct =
      denom > 0 ? Math.round(((ocupados + reservados) / denom) * 1000) / 10 : total > 0 ? 0 : null;
    return {
      ok: true,
      total,
      libres,
      ocupados,
      reservados,
      mantenimiento,
      taller,
      sucio,
      otros,
      ocupacionPct
    };
  } catch (e) {
    warnDashboardMetric('getParkingSummary', e);
    return {
      ok: false,
      total: 0,
      libres: 0,
      ocupados: 0,
      reservados: 0,
      mantenimiento: 0,
      taller: 0,
      sucio: 0,
      otros: 0,
      ocupacionPct: null
    };
  }
}

export async function getScannerSummary() {
  const empty = () => ({
    ok: false,
    fechaDia: formatFechaDia(),
    scansToday: 0,
    lastScanAt: null,
    lastTicketId: null
  });
  try {
    const { data: { scans } = { scans: [] } } = await listRecentTicketScans({ limit: 220 });
    const today = formatFechaDia();
    const todayScans = (scans || []).filter((s) => {
      if (!s.scannedAt) return false;
      try {
        return formatFechaDia(new Date(s.scannedAt)) === today;
      } catch {
        return false;
      }
    });
    const last = scans?.[0];
    return {
      ok: true,
      fechaDia: today,
      scansToday: todayScans.length,
      lastScanAt: last?.scannedAt || null,
      lastTicketId: last?.ticketId || null
    };
  } catch (e) {
    if (isTicketScansRelationMissing(e)) {
      if (!warnedTicketScansMissing) {
        console.warn(
          '[ticket_scans] Tabla no disponible; resumen de escáner en cero. Ejecuta supabase/patch_scan_ticket_rpc.sql.'
        );
        warnedTicketScansMissing = true;
      }
      return empty();
    }
    warnDashboardMetric('getScannerSummary', e);
    return empty();
  }
}

export async function getClienteDashboardData(userId) {
  const blank = {
    ok: false,
    tickets: [],
    activeTickets: [],
    mesas: [],
    upcomingMesa: null,
    recentTickets: [],
    upcomingHint: null
  };
  if (!userId) return blank;
  try {
    const [tRes, mRes] = await Promise.all([
      listUserTickets({ userId }),
      listMisMesaReservas({ userId })
    ]);
    const tickets = tRes.data?.tickets || [];
    const mesas = mRes.data?.mesaReservas || [];
    const activeTickets = tickets.filter((t) => t.estadoTicket === 'valido');
    const today = formatFechaDia();
    const upcomingMesa =
      mesas.find((m) => (m.estado || '') === 'apartada' && String(m.fechaDia || '') >= today) ||
      null;
    let upcomingHint = null;
    if (upcomingMesa?.fechaDia) {
      upcomingHint = `Mesa ${upcomingMesa.mesaLabel || upcomingMesa.mapItemId || ''} · ${upcomingMesa.fechaDia}`;
    } else if (activeTickets[0]?.fechaCreacion) {
      upcomingHint = `Ticket vigente · ${new Date(activeTickets[0].fechaCreacion).toLocaleString()}`;
    }
    return {
      ok: true,
      tickets,
      activeTickets,
      mesas,
      upcomingMesa,
      recentTickets: tickets.slice(0, 10),
      upcomingHint
    };
  } catch (e) {
    warnDashboardMetric('getClienteDashboardData', e);
    return { ...blank, ok: false };
  }
}

export async function getOperacionDashboardData() {
  const settled = await Promise.allSettled([
    getTodaySalesSummary(),
    getTodayTicketsSummary(),
    getTodayMesaReservasSummary(),
    getParkingSummary(),
    getScannerSummary()
  ]);
  const val = (i, fb) => (settled[i]?.status === 'fulfilled' ? settled[i].value : fb);
  return {
    sales: val(0, { ok: false }),
    tickets: val(1, { ok: false }),
    mesas: val(2, { ok: false }),
    parking: val(3, { ok: false }),
    scanner: val(4, { ok: false })
  };
}

export async function getLandingExecutiveSnapshot() {
  try {
    const { data } = await getLandingPage({ id: 'main' });
    const lp = data?.landingPage;
    const desc = String(lp?.descripcionParque || '').trim();
    return {
      ok: true,
      abierto: Boolean(lp?.abiertoAhora),
      descripcionOk: desc.length >= 24
    };
  } catch (e) {
    warnDashboardMetric('getLandingExecutiveSnapshot', e);
    return { ok: false, abierto: null, descripcionOk: false };
  }
}

export async function listTicketTypesExecutiveSafe() {
  try {
    const { data } = await listTicketTypesAdmin();
    const tt = data?.ticketTypes || [];
    return {
      ok: true,
      activeCount: tt.filter((t) => t.activo).length,
      total: tt.length
    };
  } catch (e) {
    warnDashboardMetric('listTicketTypesExecutiveSafe', e);
    return { ok: false, activeCount: null, total: 0 };
  }
}

function mergeRecentActivityFeeds({ scans, tickets, mesas, movimientos }) {
  const items = [];
  for (const s of scans || []) {
    if (!s?.scannedAt) continue;
    items.push({
      at: s.scannedAt,
      kind: 'scan',
      icon: 'scan',
      title: 'Escaneo de entrada',
      body: `${s.mode === 'offline' ? 'Offline' : 'Online'} · ${String(s.result || '—')}`,
      href: '/escaner'
    });
  }
  for (const t of tickets || []) {
    if (!t?.fechaCreacion) continue;
    items.push({
      at: t.fechaCreacion,
      kind: 'ticket',
      icon: 'ticket',
      title: 'Ticket registrado',
      body: `${t.clienteNombre || 'Cliente'} · ${t.estadoTicket || '—'}`,
      href: '/admin/dashboard?section=tickets'
    });
  }
  for (const m of mesas || []) {
    if (!m?.creadoEn) continue;
    items.push({
      at: m.creadoEn,
      kind: 'mesa',
      icon: 'map',
      title: 'Reserva de mesa',
      body: `${m.mesaLabel || m.mapItemId || 'Mesa'} · ${m.fechaDia || ''}`,
      href: '/admin/dashboard?section=tickets#admin-mesa-reservas-operativas'
    });
  }
  for (const mv of movimientos || []) {
    if (!mv?.fechaCreacion) continue;
    const prodTit = mv.productoTitulo || 'Producto';
    items.push({
      at: mv.fechaCreacion,
      kind: 'inventory',
      icon: 'package',
      title: 'Movimiento de inventario',
      body: `${mv.tipo || 'mov'} · ${mv.cantidad ?? ''} u · ${prodTit}`,
      href: '/admin/dashboard?section=inventario'
    });
  }
  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return items.slice(0, 12);
}

export function buildOperationalAlerts(exec) {
  const alerts = [];
  const inv = exec.inventory || {};
  if (Number(inv.zeroStockCount || 0) > 0) {
    alerts.push({
      severity: 'danger',
      title: 'Sin stock',
      body: `Hay ${inv.zeroStockCount} producto(s) activos sin existencias.`,
      actionLabel: 'Ver inventario',
      href: '/admin/dashboard?section=inventario'
    });
  }
  if (Number(inv.lowStockCount || 0) > 0) {
    alerts.push({
      severity: 'warning',
      title: 'Stock bajo',
      body: `Hay ${inv.lowStockCount} producto(s) bajo el umbral configurado.`,
      actionLabel: 'Ver inventario',
      href: '/admin/dashboard?section=inventario'
    });
  }
  const disc = exec.discounts || {};
  if (Number(disc.exhaustedActiveCount || 0) > 0) {
    alerts.push({
      severity: 'warning',
      title: 'Cupones agotados',
      body: `${disc.exhaustedActiveCount} código(s) siguen activos pero sin usos disponibles.`,
      actionLabel: 'Revisar descuentos',
      href: '/admin/dashboard?section=tickets'
    });
  }
  if (Number(disc.brokenRulesDiscountCount || 0) > 0) {
    alerts.push({
      severity: 'warning',
      title: 'Reglas de descuento',
      body: `${disc.brokenRulesDiscountCount} cupón(es) tienen reglas inconsistentes o tipos desconocidos.`,
      actionLabel: 'Revisar descuentos',
      href: '/admin/dashboard?section=tickets'
    });
  }
  if (Number(disc.expiringSoonCount || 0) > 0) {
    alerts.push({
      severity: 'info',
      title: 'Cupones por vencer',
      body: `${disc.expiringSoonCount} regla(s) de vigencia terminan en los próximos 7 días.`,
      actionLabel: 'Ver descuentos',
      href: '/admin/dashboard?section=tickets'
    });
  }
  const tix = exec.tickets || {};
  if (Number(tix.validOutstanding || 0) > 0) {
    alerts.push({
      severity: 'info',
      title: 'Pendientes de escanear',
      body: `${tix.validOutstanding} entrada(s) vendidas hoy siguen sin escanear.`,
      actionLabel: 'Abrir escáner',
      href: '/escaner'
    });
  }
  const mesa = exec.mesaReservas || {};
  if (Number(mesa.total || 0) > 0) {
    alerts.push({
      severity: 'info',
      title: 'Mesas con movimiento hoy',
      body: `${mesa.total} reserva(s) registradas para la fecha operativa.`,
      actionLabel: 'Ver reservas',
      href: '/admin/dashboard?section=tickets#admin-mesa-reservas-operativas'
    });
  }
  const park = exec.parking || {};
  if (park.ok && park.total > 0 && park.ocupacionPct != null && park.ocupacionPct >= 85) {
    alerts.push({
      severity: 'warning',
      title: 'Parking casi lleno',
      body: `Ocupación aproximada ${park.ocupacionPct}% (cajones útiles).`,
      actionLabel: 'Ver parking',
      href: '/admin/dashboard?section=parking'
    });
  }
  const land = exec.landing || {};
  if (land.ok && land.descripcionOk === false) {
    alerts.push({
      severity: 'warning',
      title: 'Landing incompleta',
      body: 'La descripción del sitio está vacía o es muy corta.',
      actionLabel: 'Editar sitio',
      href: '/admin/dashboard?section=sitio'
    });
  }
  const tt = exec.ticketTypes || {};
  if (tt.ok === true && tt.activeCount === 0) {
    alerts.push({
      severity: 'danger',
      title: 'Sin tickets activos',
      body: 'No hay tipos de ticket activos para checkout ni landing.',
      actionLabel: 'Catálogo de tickets',
      href: '/admin/dashboard?section=ticket-types'
    });
  }
  return alerts;
}

async function probeExecutiveMetricsRpc() {
  if (!USE_EXECUTIVE_DASHBOARD_RPC) {
    return { rpcOk: false, rpcNoise: null };
  }
  try {
    const sb = requireClient();
    const { error } = await sb.rpc('get_executive_dashboard', { p_fecha: formatFechaDia() });
    if (!error) return { rpcOk: true, rpcNoise: null };
    const msg = String(error.message || error.details || '');
    if (/does not exist|42883|PGRST202|404|schema cache|function/i.test(msg)) {
      if (!warnedExecutiveRpcMissing) {
        console.warn(
          '[executive] RPC get_executive_dashboard no desplegada; usando métricas locales. Desactiva VITE_USE_EXECUTIVE_DASHBOARD_RPC o aplica patch_executive_metrics.sql.'
        );
        warnedExecutiveRpcMissing = true;
      }
      return { rpcOk: false, rpcNoise: null };
    }
    warnDashboardMetric('getExecutiveDashboard.rpc', error);
    return { rpcOk: false, rpcNoise: msg.slice(0, 180) };
  } catch (e) {
    return { rpcOk: false, rpcNoise: null };
  }
}

export async function getExecutiveDashboardData(opts = {}) {
  const includeTechnicalAlerts = opts.includeTechnicalAlerts === true;
  const { rpcNoise } = await probeExecutiveMetricsRpc();

  const settled = await Promise.allSettled([
    getTodaySalesSummary({ includeYesterday: true }),
    getTodayTicketsSummary(),
    getTodayMesaReservasSummary(),
    getParkingSummary(),
    getInventoryAlerts({ lowStockThreshold: 8 }),
    getDiscountExecutiveSummary(),
    getScannerSummary(),
    listRecentTicketScans({ limit: 40 }),
    getLandingExecutiveSnapshot(),
    listTicketTypesExecutiveSafe(),
    listRecentTickets({ limit: 14 }),
    listRecentMesaReservasAdmin({ limit: 10 }),
    listRecentMovimientosForDashboard({ limit: 10 })
  ]);
  const val = (i, fb) => (settled[i]?.status === 'fulfilled' ? settled[i].value : fb);

  const sales = val(0, { ok: false });
  const tickets = val(1, { ok: false });
  const mesaReservas = val(2, { ok: false });
  const parking = val(3, { ok: false });
  const inventory = val(4, { ok: false });
  const discounts = val(5, { ok: false });
  const scanner = val(6, { ok: false });
  const scansRes = val(7, { data: { scans: [] } });
  const landing = val(8, { ok: false });
  const ticketTypes = val(9, { ok: false });
  const ticketsRecentRes = val(10, { data: { tickets: [] } });
  const mesasRecentRes = val(11, { data: { mesaReservas: [] } });
  const movRes = val(12, { data: { movimientos: [] } });

  const scans = scansRes?.data?.scans || [];
  const recentTickets = ticketsRecentRes?.data?.tickets || [];
  const recentMesas = mesasRecentRes?.data?.mesaReservas || [];
  const recentMovs = movRes?.data?.movimientos || [];

  const recentActivity = mergeRecentActivityFeeds({
    scans,
    tickets: recentTickets,
    mesas: recentMesas,
    movimientos: recentMovs
  });

  let alerts = buildOperationalAlerts({
    sales,
    tickets,
    mesaReservas,
    parking,
    inventory,
    discounts,
    scanner,
    landing,
    ticketTypes
  });

  if (includeTechnicalAlerts && rpcNoise) {
    alerts = [
      ...alerts,
      {
        severity: 'info',
        title: 'RPC de métricas',
        body: 'La función get_executive_dashboard respondió error; se usan consultas locales. Revisa el patch SQL opcional.',
        actionLabel: null,
        href: null
      }
    ];
  }

  return {
    ok: true,
    loadedAt: new Date().toISOString(),
    source: 'client',
    sales,
    tickets,
    mesaReservas,
    parking,
    inventory,
    discounts,
    scanner,
    landing,
    ticketTypes,
    alerts,
    recentActivity,
    feeds: {
      scansPreview: scans.slice(0, 6)
    }
  };
}

export async function getAdminQuickStats(opts) {
  const ex = await getExecutiveDashboardData(opts);
  return {
    ok: ex.ok,
    loadedAt: ex.loadedAt,
    sales: ex.sales,
    tickets: ex.tickets,
    mesaReservas: ex.mesaReservas,
    parking: ex.parking,
    scanner: ex.scanner,
    inventory: ex.inventory,
    discounts: ex.discounts
  };
}

export function getOperationalAlerts(executivePayload) {
  if (!executivePayload) return [];
  return Array.isArray(executivePayload.alerts) ? executivePayload.alerts : [];
}

export function getRecentActivity(executivePayload) {
  return executivePayload?.recentActivity || [];
}
