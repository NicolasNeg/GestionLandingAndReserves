const { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'gestionlandingandreserves',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

const createAnonymousTicketRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateAnonymousTicket', inputVars);
}
createAnonymousTicketRef.operationName = 'CreateAnonymousTicket';
exports.createAnonymousTicketRef = createAnonymousTicketRef;

exports.createAnonymousTicket = function createAnonymousTicket(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createAnonymousTicketRef(dcInstance, inputVars));
}
;

const createUserTicketRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateUserTicket', inputVars);
}
createUserTicketRef.operationName = 'CreateUserTicket';
exports.createUserTicketRef = createUserTicketRef;

exports.createUserTicket = function createUserTicket(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createUserTicketRef(dcInstance, inputVars));
}
;

const updateTicketStatusRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateTicketStatus', inputVars);
}
updateTicketStatusRef.operationName = 'UpdateTicketStatus';
exports.updateTicketStatusRef = updateTicketStatusRef;

exports.updateTicketStatus = function updateTicketStatus(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateTicketStatusRef(dcInstance, inputVars));
}
;

const createPaqueteRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreatePaquete', inputVars);
}
createPaqueteRef.operationName = 'CreatePaquete';
exports.createPaqueteRef = createPaqueteRef;

exports.createPaquete = function createPaquete(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createPaqueteRef(dcInstance, inputVars));
}
;

const upsertUserRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertUser', inputVars);
}
upsertUserRef.operationName = 'UpsertUser';
exports.upsertUserRef = upsertUserRef;

exports.upsertUser = function upsertUser(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(upsertUserRef(dcInstance, inputVars));
}
;

const upsertLandingPageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertLandingPage', inputVars);
}
upsertLandingPageRef.operationName = 'UpsertLandingPage';
exports.upsertLandingPageRef = upsertLandingPageRef;

exports.upsertLandingPage = function upsertLandingPage(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(upsertLandingPageRef(dcInstance, inputVars));
}
;

const createServicioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateServicio', inputVars);
}
createServicioRef.operationName = 'CreateServicio';
exports.createServicioRef = createServicioRef;

exports.createServicio = function createServicio(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createServicioRef(dcInstance, inputVars));
}
;

const updateServicioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateServicio', inputVars);
}
updateServicioRef.operationName = 'UpdateServicio';
exports.updateServicioRef = updateServicioRef;

exports.updateServicio = function updateServicio(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateServicioRef(dcInstance, inputVars));
}
;

const createProductoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateProducto', inputVars);
}
createProductoRef.operationName = 'CreateProducto';
exports.createProductoRef = createProductoRef;

exports.createProducto = function createProducto(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createProductoRef(dcInstance, inputVars));
}
;

const updateProductoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateProducto', inputVars);
}
updateProductoRef.operationName = 'UpdateProducto';
exports.updateProductoRef = updateProductoRef;

exports.updateProducto = function updateProducto(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateProductoRef(dcInstance, inputVars));
}
;

const updateProductoStockRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateProductoStock', inputVars);
}
updateProductoStockRef.operationName = 'UpdateProductoStock';
exports.updateProductoStockRef = updateProductoStockRef;

exports.updateProductoStock = function updateProductoStock(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateProductoStockRef(dcInstance, inputVars));
}
;

const createMovimientoInventarioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateMovimientoInventario', inputVars);
}
createMovimientoInventarioRef.operationName = 'CreateMovimientoInventario';
exports.createMovimientoInventarioRef = createMovimientoInventarioRef;

exports.createMovimientoInventario = function createMovimientoInventario(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createMovimientoInventarioRef(dcInstance, inputVars));
}
;

const createMesaReservaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateMesaReserva', inputVars);
}
createMesaReservaRef.operationName = 'CreateMesaReserva';
exports.createMesaReservaRef = createMesaReservaRef;

exports.createMesaReserva = function createMesaReserva(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createMesaReservaRef(dcInstance, inputVars));
}
;

const createMesaReservaMonetizableRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateMesaReservaMonetizable', inputVars);
}
createMesaReservaMonetizableRef.operationName = 'CreateMesaReservaMonetizable';
exports.createMesaReservaMonetizableRef = createMesaReservaMonetizableRef;

exports.createMesaReservaMonetizable = function createMesaReservaMonetizable(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createMesaReservaMonetizableRef(dcInstance, inputVars));
}
;

const cancelarMesaReservaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CancelarMesaReserva', inputVars);
}
cancelarMesaReservaRef.operationName = 'CancelarMesaReserva';
exports.cancelarMesaReservaRef = cancelarMesaReservaRef;

exports.cancelarMesaReserva = function cancelarMesaReserva(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(cancelarMesaReservaRef(dcInstance, inputVars));
}
;

const deleteServicioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteServicio', inputVars);
}
deleteServicioRef.operationName = 'DeleteServicio';
exports.deleteServicioRef = deleteServicioRef;

exports.deleteServicio = function deleteServicio(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deleteServicioRef(dcInstance, inputVars));
}
;

const deleteProductoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteProducto', inputVars);
}
deleteProductoRef.operationName = 'DeleteProducto';
exports.deleteProductoRef = deleteProductoRef;

exports.deleteProducto = function deleteProducto(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deleteProductoRef(dcInstance, inputVars));
}
;

const deleteUserRecordRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteUserRecord', inputVars);
}
deleteUserRecordRef.operationName = 'DeleteUserRecord';
exports.deleteUserRecordRef = deleteUserRecordRef;

exports.deleteUserRecord = function deleteUserRecord(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deleteUserRecordRef(dcInstance, inputVars));
}
;

const deleteConfiguracionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteConfiguracion', inputVars);
}
deleteConfiguracionRef.operationName = 'DeleteConfiguracion';
exports.deleteConfiguracionRef = deleteConfiguracionRef;

exports.deleteConfiguracion = function deleteConfiguracion(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deleteConfiguracionRef(dcInstance, inputVars));
}
;

const deletePaqueteRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeletePaquete', inputVars);
}
deletePaqueteRef.operationName = 'DeletePaquete';
exports.deletePaqueteRef = deletePaqueteRef;

exports.deletePaquete = function deletePaquete(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deletePaqueteRef(dcInstance, inputVars));
}
;

const deleteMovimientoInventarioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteMovimientoInventario', inputVars);
}
deleteMovimientoInventarioRef.operationName = 'DeleteMovimientoInventario';
exports.deleteMovimientoInventarioRef = deleteMovimientoInventarioRef;

exports.deleteMovimientoInventario = function deleteMovimientoInventario(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deleteMovimientoInventarioRef(dcInstance, inputVars));
}
;

const deleteLandingPageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteLandingPage', inputVars);
}
deleteLandingPageRef.operationName = 'DeleteLandingPage';
exports.deleteLandingPageRef = deleteLandingPageRef;

exports.deleteLandingPage = function deleteLandingPage(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deleteLandingPageRef(dcInstance, inputVars));
}
;

const deleteDescuentoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteDescuento', inputVars);
}
deleteDescuentoRef.operationName = 'DeleteDescuento';
exports.deleteDescuentoRef = deleteDescuentoRef;

exports.deleteDescuento = function deleteDescuento(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deleteDescuentoRef(dcInstance, inputVars));
}
;

const deleteTicketRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteTicket', inputVars);
}
deleteTicketRef.operationName = 'DeleteTicket';
exports.deleteTicketRef = deleteTicketRef;

exports.deleteTicket = function deleteTicket(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deleteTicketRef(dcInstance, inputVars));
}
;

const deleteMesaReservaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteMesaReserva', inputVars);
}
deleteMesaReservaRef.operationName = 'DeleteMesaReserva';
exports.deleteMesaReservaRef = deleteMesaReservaRef;

exports.deleteMesaReserva = function deleteMesaReserva(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deleteMesaReservaRef(dcInstance, inputVars));
}
;

const upsertConfiguracionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertConfiguracion', inputVars);
}
upsertConfiguracionRef.operationName = 'UpsertConfiguracion';
exports.upsertConfiguracionRef = upsertConfiguracionRef;

exports.upsertConfiguracion = function upsertConfiguracion(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(upsertConfiguracionRef(dcInstance, inputVars));
}
;

const createDescuentoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateDescuento', inputVars);
}
createDescuentoRef.operationName = 'CreateDescuento';
exports.createDescuentoRef = createDescuentoRef;

exports.createDescuento = function createDescuento(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createDescuentoRef(dcInstance, inputVars));
}
;

const updateDescuentoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateDescuento', inputVars);
}
updateDescuentoRef.operationName = 'UpdateDescuento';
exports.updateDescuentoRef = updateDescuentoRef;

exports.updateDescuento = function updateDescuento(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateDescuentoRef(dcInstance, inputVars));
}
;

const consumeDescuentoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'ConsumeDescuento', inputVars);
}
consumeDescuentoRef.operationName = 'ConsumeDescuento';
exports.consumeDescuentoRef = consumeDescuentoRef;

exports.consumeDescuento = function consumeDescuento(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(consumeDescuentoRef(dcInstance, inputVars));
}
;

const updateMesaReservaEstadoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateMesaReservaEstado', inputVars);
}
updateMesaReservaEstadoRef.operationName = 'UpdateMesaReservaEstado';
exports.updateMesaReservaEstadoRef = updateMesaReservaEstadoRef;

exports.updateMesaReservaEstado = function updateMesaReservaEstado(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateMesaReservaEstadoRef(dcInstance, inputVars));
}
;

const vincularTicketMesaReservaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'VincularTicketMesaReserva', inputVars);
}
vincularTicketMesaReservaRef.operationName = 'VincularTicketMesaReserva';
exports.vincularTicketMesaReservaRef = vincularTicketMesaReservaRef;

exports.vincularTicketMesaReserva = function vincularTicketMesaReserva(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(vincularTicketMesaReservaRef(dcInstance, inputVars));
}
;

const getTicketByIdRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTicketById', inputVars);
}
getTicketByIdRef.operationName = 'GetTicketById';
exports.getTicketByIdRef = getTicketByIdRef;

exports.getTicketById = function getTicketById(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getTicketByIdRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const listRecentTicketsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListRecentTickets');
}
listRecentTicketsRef.operationName = 'ListRecentTickets';
exports.listRecentTicketsRef = listRecentTicketsRef;

exports.listRecentTickets = function listRecentTickets(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listRecentTicketsRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const getUserProfileRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetUserProfile', inputVars);
}
getUserProfileRef.operationName = 'GetUserProfile';
exports.getUserProfileRef = getUserProfileRef;

exports.getUserProfile = function getUserProfile(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getUserProfileRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const listUserTicketsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListUserTickets', inputVars);
}
listUserTicketsRef.operationName = 'ListUserTickets';
exports.listUserTicketsRef = listUserTicketsRef;

exports.listUserTickets = function listUserTickets(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listUserTicketsRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const listPaquetesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListPaquetes');
}
listPaquetesRef.operationName = 'ListPaquetes';
exports.listPaquetesRef = listPaquetesRef;

exports.listPaquetes = function listPaquetes(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listPaquetesRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const getLandingPageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetLandingPage', inputVars);
}
getLandingPageRef.operationName = 'GetLandingPage';
exports.getLandingPageRef = getLandingPageRef;

exports.getLandingPage = function getLandingPage(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getLandingPageRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const listServiciosLandingRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListServiciosLanding');
}
listServiciosLandingRef.operationName = 'ListServiciosLanding';
exports.listServiciosLandingRef = listServiciosLandingRef;

exports.listServiciosLanding = function listServiciosLanding(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listServiciosLandingRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const listServiciosAdminRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListServiciosAdmin');
}
listServiciosAdminRef.operationName = 'ListServiciosAdmin';
exports.listServiciosAdminRef = listServiciosAdminRef;

exports.listServiciosAdmin = function listServiciosAdmin(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listServiciosAdminRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const listProductosAdminRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListProductosAdmin');
}
listProductosAdminRef.operationName = 'ListProductosAdmin';
exports.listProductosAdminRef = listProductosAdminRef;

exports.listProductosAdmin = function listProductosAdmin(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listProductosAdminRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const listProductosPublicRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListProductosPublic');
}
listProductosPublicRef.operationName = 'ListProductosPublic';
exports.listProductosPublicRef = listProductosPublicRef;

exports.listProductosPublic = function listProductosPublic(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listProductosPublicRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const getConfiguracionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetConfiguracion', inputVars);
}
getConfiguracionRef.operationName = 'GetConfiguracion';
exports.getConfiguracionRef = getConfiguracionRef;

exports.getConfiguracion = function getConfiguracion(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getConfiguracionRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const getDescuentoByCodigoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetDescuentoByCodigo', inputVars);
}
getDescuentoByCodigoRef.operationName = 'GetDescuentoByCodigo';
exports.getDescuentoByCodigoRef = getDescuentoByCodigoRef;

exports.getDescuentoByCodigo = function getDescuentoByCodigo(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getDescuentoByCodigoRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const listDescuentosAdminRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDescuentosAdmin');
}
listDescuentosAdminRef.operationName = 'ListDescuentosAdmin';
exports.listDescuentosAdminRef = listDescuentosAdminRef;

exports.listDescuentosAdmin = function listDescuentosAdmin(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listDescuentosAdminRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const listMovimientosInventarioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMovimientosInventario', inputVars);
}
listMovimientosInventarioRef.operationName = 'ListMovimientosInventario';
exports.listMovimientosInventarioRef = listMovimientosInventarioRef;

exports.listMovimientosInventario = function listMovimientosInventario(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listMovimientosInventarioRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const listMesaReservasActivasPorFechaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMesaReservasActivasPorFecha', inputVars);
}
listMesaReservasActivasPorFechaRef.operationName = 'ListMesaReservasActivasPorFecha';
exports.listMesaReservasActivasPorFechaRef = listMesaReservasActivasPorFechaRef;

exports.listMesaReservasActivasPorFecha = function listMesaReservasActivasPorFecha(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listMesaReservasActivasPorFechaRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const checkMesaReservaLibreRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'CheckMesaReservaLibre', inputVars);
}
checkMesaReservaLibreRef.operationName = 'CheckMesaReservaLibre';
exports.checkMesaReservaLibreRef = checkMesaReservaLibreRef;

exports.checkMesaReservaLibre = function checkMesaReservaLibre(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(checkMesaReservaLibreRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const listMisMesaReservasRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMisMesaReservas', inputVars);
}
listMisMesaReservasRef.operationName = 'ListMisMesaReservas';
exports.listMisMesaReservasRef = listMisMesaReservasRef;

exports.listMisMesaReservas = function listMisMesaReservas(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listMisMesaReservasRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const listMesaReservasByFechaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMesaReservasByFecha', inputVars);
}
listMesaReservasByFechaRef.operationName = 'ListMesaReservasByFecha';
exports.listMesaReservasByFechaRef = listMesaReservasByFechaRef;

exports.listMesaReservasByFecha = function listMesaReservasByFecha(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listMesaReservasByFechaRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const listMesaReservasVenciblesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMesaReservasVencibles', inputVars);
}
listMesaReservasVenciblesRef.operationName = 'ListMesaReservasVencibles';
exports.listMesaReservasVenciblesRef = listMesaReservasVenciblesRef;

exports.listMesaReservasVencibles = function listMesaReservasVencibles(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listMesaReservasVenciblesRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;
