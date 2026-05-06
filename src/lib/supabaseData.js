import { supabase } from '../supabase/client.js';
import { getCanonicalUserId } from './authCanonical.js';

function requireClient() {
  if (!supabase) throw new Error('Supabase no inicializado');
  return supabase;
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

export async function listRecentTickets() {
  const sb = requireClient();
  const { data, error } = await sb
    .from('tickets')
    .select('*')
    .order('fecha_creacion', { ascending: false })
    .limit(10);
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

export async function scanTicketOnline({ ticketId, rawQr, deviceId, scannedBy }) {
  const sb = requireClient();
  const lookup = await getTicketById({ id: ticketId });
  const ticket = lookup.data?.ticket;
  if (!ticket) return scanInvalid('not_found');
  if (ticket.estadoTicket === 'escaneado') return scanInvalid('already_scanned', ticket);
  if (ticket.estadoTicket === 'cancelado') return scanInvalid('cancelled', ticket);

  const now = new Date().toISOString();
  const { data: updated, error: updErr } = await sb
    .from('tickets')
    .update({ estado_ticket: 'escaneado', fecha_escaneo: now })
    .eq('id', ticketId)
    .eq('estado_ticket', 'valido')
    .select('*')
    .maybeSingle();
  if (updErr) throw updErr;

  if (!updated) {
    const after = await getTicketById({ id: ticketId });
    const t2 = after.data?.ticket;
    if (!t2) return scanInvalid('not_found');
    if (t2.estadoTicket === 'escaneado') return scanInvalid('already_scanned', t2);
    if (t2.estadoTicket === 'cancelado') return scanInvalid('cancelled', t2);
    return scanInvalid('not_valid_state', t2);
  }

  const updatedTicket = mapTicketRow(updated);
  try {
    await sb.from('ticket_scans').insert({
      ticket_id: ticketId,
      scanned_by: scannedBy || getCanonicalUserId() || null,
      scanned_at: now,
      device_id: deviceId || null,
      mode: 'online',
      result: 'valid',
      raw_qr: String(rawQr || ''),
      metadata: {}
    });
  } catch {
    // Auditoria opcional; no bloquear validacion canonica del ticket.
  }

  return { data: { result: 'valid', reason: 'ok', ticket: updatedTicket } };
}

export async function syncPendingTicketScan(scan) {
  const res = await scanTicketOnline({
    ticketId: scan.ticketId,
    rawQr: scan.rawQr,
    deviceId: scan.deviceId,
    scannedBy: scan.scannedBy
  });
  return res;
}

export async function listRecentTicketScans({ limit = 50 } = {}) {
  const sb = requireClient();
  const { data, error } = await sb
    .from('ticket_scans')
    .select('*')
    .order('scanned_at', { ascending: false })
    .limit(Math.max(1, Math.min(200, Number(limit || 50))));
  if (error) throw error;
  return { data: { scans: (data || []).map(mapTicketScanRow) } };
}

export async function createAnonymousTicket(variables) {
  const sb = requireClient();
  const { data, error } = await sb
    .from('tickets')
    .insert({
      cliente_nombre: variables.clienteNombre,
      cliente_email: variables.clienteEmail,
      metodo_pago: variables.metodoPago,
      estado_pago: variables.estadoPago,
      estado_ticket: 'valido',
      precio_total: variables.precioTotal
    })
    .select('id')
    .single();
  if (error) throw error;
  return { data: { ticket_insert: { id: data.id } } };
}

export async function createUserTicket(variables) {
  const sb = requireClient();
  const uid = getCanonicalUserId();
  if (!uid) throw new Error('Sesion requerida para ticket de usuario');
  const { data, error } = await sb
    .from('tickets')
    .insert({
      user_id: uid,
      cliente_nombre: variables.clienteNombre,
      cliente_email: variables.clienteEmail,
      metodo_pago: variables.metodoPago,
      estado_pago: variables.estadoPago,
      estado_ticket: 'valido',
      precio_total: variables.precioTotal
    })
    .select('id')
    .single();
  if (error) throw error;
  return { data: { ticket_insert: { id: data.id } } };
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
  const { data, error } = await sb
    .from('mesa_reservas')
    .select('*')
    .eq('user_id', userId)
    .order('creado_en', { ascending: false })
    .limit(80);
  if (error) throw error;
  return { data: { mesaReservas: (data || []).map(mapMesaRow) } };
}

export async function createMesaReserva({ fechaDia, mapItemId }) {
  const sb = requireClient();
  const uid = getCanonicalUserId();
  if (!uid) throw new Error('Debes iniciar sesion para reservar mesa');
  const { error } = await sb.from('mesa_reservas').insert({
    fecha_dia: fechaDia,
    map_item_id: mapItemId,
    estado: 'apartada',
    user_id: uid
  });
  if (error) throw error;
  return { data: {} };
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
  if (findErr) throw findErr;
  if (prior?.id) {
    const { data, error } = await sb.from('mesa_reservas').update(row).eq('id', prior.id).select('id').single();
    if (error) throw error;
    return { data: { mesaReserva_insert: { id: data.id } } };
  }
  const { data, error } = await sb.from('mesa_reservas').insert(row).select('id').single();
  if (error) throw error;
  return { data: { mesaReserva_insert: { id: data.id } } };
}

export async function listMesaReservasByFecha({ fechaDia }) {
  const sb = requireClient();
  const { data, error } = await sb
    .from('mesa_reservas')
    .select('*')
    .eq('fecha_dia', fechaDia)
    .order('creado_en', { ascending: false })
    .limit(500);
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
