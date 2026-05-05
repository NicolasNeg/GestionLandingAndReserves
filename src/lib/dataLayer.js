/**
 * Capa de datos: usa Supabase cuando VITE_BACKEND_PROVIDER=supabase,
 * si no delega en Data Connect (Firebase).
 */
import * as dc from '@dataconnect/generated';
import * as sb from './supabaseData.js';
import { isSupabaseBackend } from './backendProvider.js';

function route(fnName, supabaseFn, dataconnectFn) {
  return (...args) => (isSupabaseBackend() ? supabaseFn(...args) : dataconnectFn(...args));
}

export const getLandingPage = route('getLandingPage', sb.getLandingPage, dc.getLandingPage);
export const listPaquetes = route('listPaquetes', sb.listPaquetes, dc.listPaquetes);
export const listProductosPublic = route('listProductosPublic', sb.listProductosPublic, dc.listProductosPublic);
export const listServiciosLanding = route('listServiciosLanding', sb.listServiciosLanding, dc.listServiciosLanding);

export const listRecentTickets = route('listRecentTickets', sb.listRecentTickets, dc.listRecentTickets);
export const createPaquete = route('createPaquete', sb.createPaquete, dc.createPaquete);
export const listProductosAdmin = route('listProductosAdmin', sb.listProductosAdmin, dc.listProductosAdmin);
export const listMovimientosInventario = route(
  'listMovimientosInventario',
  sb.listMovimientosInventario,
  dc.listMovimientosInventario
);
export const createProducto = route('createProducto', sb.createProducto, dc.createProducto);
export const updateProducto = route('updateProducto', sb.updateProducto, dc.updateProducto);
export const updateProductoStock = route('updateProductoStock', sb.updateProductoStock, dc.updateProductoStock);
export const createMovimientoInventario = route(
  'createMovimientoInventario',
  sb.createMovimientoInventario,
  dc.createMovimientoInventario
);
export const listServiciosAdmin = route('listServiciosAdmin', sb.listServiciosAdmin, dc.listServiciosAdmin);
export const upsertLandingPage = route('upsertLandingPage', sb.upsertLandingPage, dc.upsertLandingPage);
export const createServicio = route('createServicio', sb.createServicio, dc.createServicio);
export const updateServicio = route('updateServicio', sb.updateServicio, dc.updateServicio);
export const deleteServicio = route('deleteServicio', sb.deleteServicio, dc.deleteServicio);
export const deleteProducto = route('deleteProducto', sb.deleteProducto, dc.deleteProducto);
export const updateTicketStatus = route('updateTicketStatus', sb.updateTicketStatus, dc.updateTicketStatus);
export const getConfiguracion = route('getConfiguracion', sb.getConfiguracion, dc.getConfiguracion);
export const upsertConfiguracion = route('upsertConfiguracion', sb.upsertConfiguracion, dc.upsertConfiguracion);
export const listDescuentosAdmin = route('listDescuentosAdmin', sb.listDescuentosAdmin, dc.listDescuentosAdmin);
export const createDescuento = route('createDescuento', sb.createDescuento, dc.createDescuento);
export const updateDescuento = route('updateDescuento', sb.updateDescuento, dc.updateDescuento);
export const deleteUserRecord = route('deleteUserRecord', sb.deleteUserRecord, dc.deleteUserRecord);
export const deleteConfiguracion = route('deleteConfiguracion', sb.deleteConfiguracion, dc.deleteConfiguracion);
export const deletePaquete = route('deletePaquete', sb.deletePaquete, dc.deletePaquete);
export const deleteMovimientoInventario = route(
  'deleteMovimientoInventario',
  sb.deleteMovimientoInventario,
  dc.deleteMovimientoInventario
);
export const deleteLandingPage = route('deleteLandingPage', sb.deleteLandingPage, dc.deleteLandingPage);
export const deleteDescuento = route('deleteDescuento', sb.deleteDescuento, dc.deleteDescuento);
export const deleteTicket = route('deleteTicket', sb.deleteTicket, dc.deleteTicket);
export const deleteMesaReserva = route('deleteMesaReserva', sb.deleteMesaReserva, dc.deleteMesaReserva);

export const createAnonymousTicket = route('createAnonymousTicket', sb.createAnonymousTicket, dc.createAnonymousTicket);
export const createUserTicket = route('createUserTicket', sb.createUserTicket, dc.createUserTicket);
export const getUserProfile = route('getUserProfile', sb.getUserProfile, dc.getUserProfile);
export const upsertUser = route('upsertUser', sb.upsertUser, dc.upsertUser);
export const listUserTickets = route('listUserTickets', sb.listUserTickets, dc.listUserTickets);

export const getTicketById = route('getTicketById', sb.getTicketById, dc.getTicketById);
export const listMisMesaReservas = route('listMisMesaReservas', sb.listMisMesaReservas, dc.listMisMesaReservas);
export const updateMesaReservaEstado = route(
  'updateMesaReservaEstado',
  sb.updateMesaReservaEstado,
  dc.updateMesaReservaEstado
);
export const vincularTicketMesaReserva = route(
  'vincularTicketMesaReserva',
  sb.vincularTicketMesaReserva,
  dc.vincularTicketMesaReserva
);

export const listMesaReservasActivasPorFecha = route(
  'listMesaReservasActivasPorFecha',
  sb.listMesaReservasActivasPorFecha,
  dc.listMesaReservasActivasPorFecha
);
export const listMesaReservasByFecha = route(
  'listMesaReservasByFecha',
  sb.listMesaReservasByFecha,
  dc.listMesaReservasByFecha
);
export const checkMesaReservaLibre = route('checkMesaReservaLibre', sb.checkMesaReservaLibre, dc.checkMesaReservaLibre);
export const createMesaReserva = route('createMesaReserva', sb.createMesaReserva, dc.createMesaReserva);
export const createMesaReservaMonetizable = route(
  'createMesaReservaMonetizable',
  sb.createMesaReservaMonetizable,
  dc.createMesaReservaMonetizable
);
export const cancelarMesaReserva = route('cancelarMesaReserva', sb.cancelarMesaReserva, dc.cancelarMesaReserva);

export const listMesaReservasVencibles = route(
  'listMesaReservasVencibles',
  sb.listMesaReservasVencibles,
  dc.listMesaReservasVencibles
);

export const consumeDescuento = route('consumeDescuento', sb.consumeDescuento, dc.consumeDescuento);
