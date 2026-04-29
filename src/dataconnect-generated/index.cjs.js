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
