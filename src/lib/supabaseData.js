import { supabase } from '../supabase/client.js';
import { auth as firebaseAuth } from '../firebase-config.js';

function requireClient() {
  if (!supabase) throw new Error('Supabase no inicializado');
  return supabase;
}

function mapUserRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    nombre: r.nombre,
    email: r.email,
    rol: r.rol
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
  const uid = firebaseAuth?.currentUser?.uid;
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
  const uid = firebaseAuth?.currentUser?.uid || null;
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
    .select('id')
    .eq('fecha_dia', fechaDia)
    .eq('map_item_id', mapItemId)
    .eq('estado', 'apartada')
    .limit(1);
  if (error) throw error;
  return { data: { mesaReservas: data || [] } };
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
  const uid = firebaseAuth?.currentUser?.uid;
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
  const uid = firebaseAuth?.currentUser?.uid;
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
