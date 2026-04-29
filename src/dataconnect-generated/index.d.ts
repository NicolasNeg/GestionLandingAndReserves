import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface Configuracion_Key {
  id: string;
  __typename?: 'Configuracion_Key';
}

export interface CreateAnonymousTicketData {
  ticket_insert: Ticket_Key;
}

export interface CreateAnonymousTicketVariables {
  clienteNombre: string;
  clienteEmail: string;
  metodoPago: string;
  estadoPago: string;
  precioTotal: number;
}

export interface CreateMovimientoInventarioData {
  movimientoInventario_insert: MovimientoInventario_Key;
}

export interface CreateMovimientoInventarioVariables {
  productoId: UUIDString;
  tipo: string;
  cantidad: number;
  nota: string;
}

export interface CreatePaqueteData {
  paquete_insert: Paquete_Key;
}

export interface CreatePaqueteVariables {
  nombre: string;
  descripcion: string;
  precioBase: number;
  incluyePersonas: number;
}

export interface CreateProductoData {
  producto_insert: Producto_Key;
}

export interface CreateProductoVariables {
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  precio: number;
  stockActual: number;
  reservadoAprox: number;
  activo: boolean;
}

export interface CreateServicioData {
  servicio_insert: Servicio_Key;
}

export interface CreateServicioVariables {
  titulo: string;
  descripcion: string;
  orden: number;
  activo: boolean;
}

export interface CreateUserTicketData {
  ticket_insert: Ticket_Key;
}

export interface CreateUserTicketVariables {
  clienteNombre: string;
  clienteEmail: string;
  metodoPago: string;
  estadoPago: string;
  precioTotal: number;
}

export interface Descuento_Key {
  id: UUIDString;
  __typename?: 'Descuento_Key';
}

export interface GetLandingPageData {
  landingPage?: {
    id: string;
    descripcionParque: string;
    mapaDistribucionJson: string;
    imagenSatelitalUrl: string;
    googleMapsUrl: string;
    horariosTexto: string;
    abiertoAhora: boolean;
    ocupacionTexto: string;
    estacionamientoTexto: string;
    botonesJson: string;
  } & LandingPage_Key;
}

export interface GetLandingPageVariables {
  id: string;
}

export interface GetTicketByIdData {
  ticket?: {
    id: UUIDString;
    clienteNombre: string;
    clienteEmail: string;
    metodoPago: string;
    estadoPago: string;
    estadoTicket: string;
    precioTotal: number;
    fechaCreacion: TimestampString;
    fechaEscaneo?: TimestampString | null;
    user?: {
      id: string;
      nombre?: string | null;
      email?: string | null;
    } & User_Key;
  } & Ticket_Key;
}

export interface GetTicketByIdVariables {
  id: UUIDString;
}

export interface GetUserProfileData {
  user?: {
    id: string;
    email?: string | null;
    nombre?: string | null;
    rol?: string | null;
  } & User_Key;
}

export interface GetUserProfileVariables {
  id: string;
}

export interface LandingPage_Key {
  id: string;
  __typename?: 'LandingPage_Key';
}

export interface ListMovimientosInventarioData {
  movimientoInventarios: ({
    id: UUIDString;
    tipo: string;
    cantidad: number;
    nota: string;
    fechaCreacion: TimestampString;
    creadoPor?: {
      id: string;
      nombre?: string | null;
      email?: string | null;
    } & User_Key;
  } & MovimientoInventario_Key)[];
}

export interface ListMovimientosInventarioVariables {
  productoId: UUIDString;
}

export interface ListPaquetesData {
  paquetes: ({
    id: UUIDString;
    nombre: string;
    descripcion: string;
    precioBase: number;
    incluyePersonas: number;
    activo: boolean;
  } & Paquete_Key)[];
}

export interface ListProductosAdminData {
  productos: ({
    id: UUIDString;
    titulo: string;
    descripcion: string;
    imagenUrl: string;
    precio: number;
    stockActual: number;
    reservadoAprox: number;
    activo: boolean;
    fechaCreacion: TimestampString;
  } & Producto_Key)[];
}

export interface ListRecentTicketsData {
  tickets: ({
    id: UUIDString;
    clienteNombre: string;
    clienteEmail: string;
    estadoPago: string;
    estadoTicket: string;
    precioTotal: number;
    fechaCreacion: TimestampString;
  } & Ticket_Key)[];
}

export interface ListServiciosAdminData {
  servicios: ({
    id: UUIDString;
    titulo: string;
    descripcion: string;
    orden: number;
    activo: boolean;
  } & Servicio_Key)[];
}

export interface ListServiciosLandingData {
  servicios: ({
    id: UUIDString;
    titulo: string;
    descripcion: string;
    orden: number;
    activo: boolean;
  } & Servicio_Key)[];
}

export interface ListUserTicketsData {
  tickets: ({
    id: UUIDString;
    clienteNombre: string;
    clienteEmail: string;
    metodoPago: string;
    estadoPago: string;
    estadoTicket: string;
    precioTotal: number;
    fechaCreacion: TimestampString;
    fechaEscaneo?: TimestampString | null;
  } & Ticket_Key)[];
}

export interface ListUserTicketsVariables {
  userId: string;
}

export interface MovimientoInventario_Key {
  id: UUIDString;
  __typename?: 'MovimientoInventario_Key';
}

export interface Paquete_Key {
  id: UUIDString;
  __typename?: 'Paquete_Key';
}

export interface Producto_Key {
  id: UUIDString;
  __typename?: 'Producto_Key';
}

export interface Servicio_Key {
  id: UUIDString;
  __typename?: 'Servicio_Key';
}

export interface Ticket_Key {
  id: UUIDString;
  __typename?: 'Ticket_Key';
}

export interface UpdateProductoData {
  producto_update?: Producto_Key | null;
}

export interface UpdateProductoStockData {
  producto_update?: Producto_Key | null;
}

export interface UpdateProductoStockVariables {
  id: UUIDString;
  stockActual: number;
  reservadoAprox: number;
}

export interface UpdateProductoVariables {
  id: UUIDString;
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  precio: number;
  activo: boolean;
}

export interface UpdateServicioData {
  servicio_update?: Servicio_Key | null;
}

export interface UpdateServicioVariables {
  id: UUIDString;
  titulo: string;
  descripcion: string;
  orden: number;
  activo: boolean;
}

export interface UpdateTicketStatusData {
  ticket_update?: Ticket_Key | null;
}

export interface UpdateTicketStatusVariables {
  id: UUIDString;
  estadoTicket: string;
  estadoPago: string;
}

export interface UpsertLandingPageData {
  landingPage_upsert: LandingPage_Key;
}

export interface UpsertLandingPageVariables {
  id: string;
  descripcionParque: string;
  mapaDistribucionJson: string;
  imagenSatelitalUrl: string;
  googleMapsUrl: string;
  horariosTexto: string;
  abiertoAhora: boolean;
  ocupacionTexto: string;
  estacionamientoTexto: string;
  botonesJson: string;
}

export interface UpsertUserData {
  user_upsert: User_Key;
}

export interface UpsertUserVariables {
  id: string;
  email: string;
  nombre: string;
  rol: string;
}

export interface User_Key {
  id: string;
  __typename?: 'User_Key';
}

interface CreateAnonymousTicketRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAnonymousTicketVariables): MutationRef<CreateAnonymousTicketData, CreateAnonymousTicketVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateAnonymousTicketVariables): MutationRef<CreateAnonymousTicketData, CreateAnonymousTicketVariables>;
  operationName: string;
}
export const createAnonymousTicketRef: CreateAnonymousTicketRef;

export function createAnonymousTicket(vars: CreateAnonymousTicketVariables): MutationPromise<CreateAnonymousTicketData, CreateAnonymousTicketVariables>;
export function createAnonymousTicket(dc: DataConnect, vars: CreateAnonymousTicketVariables): MutationPromise<CreateAnonymousTicketData, CreateAnonymousTicketVariables>;

interface CreateUserTicketRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateUserTicketVariables): MutationRef<CreateUserTicketData, CreateUserTicketVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateUserTicketVariables): MutationRef<CreateUserTicketData, CreateUserTicketVariables>;
  operationName: string;
}
export const createUserTicketRef: CreateUserTicketRef;

export function createUserTicket(vars: CreateUserTicketVariables): MutationPromise<CreateUserTicketData, CreateUserTicketVariables>;
export function createUserTicket(dc: DataConnect, vars: CreateUserTicketVariables): MutationPromise<CreateUserTicketData, CreateUserTicketVariables>;

interface UpdateTicketStatusRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateTicketStatusVariables): MutationRef<UpdateTicketStatusData, UpdateTicketStatusVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateTicketStatusVariables): MutationRef<UpdateTicketStatusData, UpdateTicketStatusVariables>;
  operationName: string;
}
export const updateTicketStatusRef: UpdateTicketStatusRef;

export function updateTicketStatus(vars: UpdateTicketStatusVariables): MutationPromise<UpdateTicketStatusData, UpdateTicketStatusVariables>;
export function updateTicketStatus(dc: DataConnect, vars: UpdateTicketStatusVariables): MutationPromise<UpdateTicketStatusData, UpdateTicketStatusVariables>;

interface CreatePaqueteRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreatePaqueteVariables): MutationRef<CreatePaqueteData, CreatePaqueteVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreatePaqueteVariables): MutationRef<CreatePaqueteData, CreatePaqueteVariables>;
  operationName: string;
}
export const createPaqueteRef: CreatePaqueteRef;

export function createPaquete(vars: CreatePaqueteVariables): MutationPromise<CreatePaqueteData, CreatePaqueteVariables>;
export function createPaquete(dc: DataConnect, vars: CreatePaqueteVariables): MutationPromise<CreatePaqueteData, CreatePaqueteVariables>;

interface UpsertUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertUserVariables): MutationRef<UpsertUserData, UpsertUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertUserVariables): MutationRef<UpsertUserData, UpsertUserVariables>;
  operationName: string;
}
export const upsertUserRef: UpsertUserRef;

export function upsertUser(vars: UpsertUserVariables): MutationPromise<UpsertUserData, UpsertUserVariables>;
export function upsertUser(dc: DataConnect, vars: UpsertUserVariables): MutationPromise<UpsertUserData, UpsertUserVariables>;

interface UpsertLandingPageRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertLandingPageVariables): MutationRef<UpsertLandingPageData, UpsertLandingPageVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertLandingPageVariables): MutationRef<UpsertLandingPageData, UpsertLandingPageVariables>;
  operationName: string;
}
export const upsertLandingPageRef: UpsertLandingPageRef;

export function upsertLandingPage(vars: UpsertLandingPageVariables): MutationPromise<UpsertLandingPageData, UpsertLandingPageVariables>;
export function upsertLandingPage(dc: DataConnect, vars: UpsertLandingPageVariables): MutationPromise<UpsertLandingPageData, UpsertLandingPageVariables>;

interface CreateServicioRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateServicioVariables): MutationRef<CreateServicioData, CreateServicioVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateServicioVariables): MutationRef<CreateServicioData, CreateServicioVariables>;
  operationName: string;
}
export const createServicioRef: CreateServicioRef;

export function createServicio(vars: CreateServicioVariables): MutationPromise<CreateServicioData, CreateServicioVariables>;
export function createServicio(dc: DataConnect, vars: CreateServicioVariables): MutationPromise<CreateServicioData, CreateServicioVariables>;

interface UpdateServicioRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateServicioVariables): MutationRef<UpdateServicioData, UpdateServicioVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateServicioVariables): MutationRef<UpdateServicioData, UpdateServicioVariables>;
  operationName: string;
}
export const updateServicioRef: UpdateServicioRef;

export function updateServicio(vars: UpdateServicioVariables): MutationPromise<UpdateServicioData, UpdateServicioVariables>;
export function updateServicio(dc: DataConnect, vars: UpdateServicioVariables): MutationPromise<UpdateServicioData, UpdateServicioVariables>;

interface CreateProductoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateProductoVariables): MutationRef<CreateProductoData, CreateProductoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateProductoVariables): MutationRef<CreateProductoData, CreateProductoVariables>;
  operationName: string;
}
export const createProductoRef: CreateProductoRef;

export function createProducto(vars: CreateProductoVariables): MutationPromise<CreateProductoData, CreateProductoVariables>;
export function createProducto(dc: DataConnect, vars: CreateProductoVariables): MutationPromise<CreateProductoData, CreateProductoVariables>;

interface UpdateProductoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateProductoVariables): MutationRef<UpdateProductoData, UpdateProductoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateProductoVariables): MutationRef<UpdateProductoData, UpdateProductoVariables>;
  operationName: string;
}
export const updateProductoRef: UpdateProductoRef;

export function updateProducto(vars: UpdateProductoVariables): MutationPromise<UpdateProductoData, UpdateProductoVariables>;
export function updateProducto(dc: DataConnect, vars: UpdateProductoVariables): MutationPromise<UpdateProductoData, UpdateProductoVariables>;

interface UpdateProductoStockRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateProductoStockVariables): MutationRef<UpdateProductoStockData, UpdateProductoStockVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateProductoStockVariables): MutationRef<UpdateProductoStockData, UpdateProductoStockVariables>;
  operationName: string;
}
export const updateProductoStockRef: UpdateProductoStockRef;

export function updateProductoStock(vars: UpdateProductoStockVariables): MutationPromise<UpdateProductoStockData, UpdateProductoStockVariables>;
export function updateProductoStock(dc: DataConnect, vars: UpdateProductoStockVariables): MutationPromise<UpdateProductoStockData, UpdateProductoStockVariables>;

interface CreateMovimientoInventarioRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMovimientoInventarioVariables): MutationRef<CreateMovimientoInventarioData, CreateMovimientoInventarioVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateMovimientoInventarioVariables): MutationRef<CreateMovimientoInventarioData, CreateMovimientoInventarioVariables>;
  operationName: string;
}
export const createMovimientoInventarioRef: CreateMovimientoInventarioRef;

export function createMovimientoInventario(vars: CreateMovimientoInventarioVariables): MutationPromise<CreateMovimientoInventarioData, CreateMovimientoInventarioVariables>;
export function createMovimientoInventario(dc: DataConnect, vars: CreateMovimientoInventarioVariables): MutationPromise<CreateMovimientoInventarioData, CreateMovimientoInventarioVariables>;

interface GetTicketByIdRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetTicketByIdVariables): QueryRef<GetTicketByIdData, GetTicketByIdVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetTicketByIdVariables): QueryRef<GetTicketByIdData, GetTicketByIdVariables>;
  operationName: string;
}
export const getTicketByIdRef: GetTicketByIdRef;

export function getTicketById(vars: GetTicketByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetTicketByIdData, GetTicketByIdVariables>;
export function getTicketById(dc: DataConnect, vars: GetTicketByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetTicketByIdData, GetTicketByIdVariables>;

interface ListRecentTicketsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListRecentTicketsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListRecentTicketsData, undefined>;
  operationName: string;
}
export const listRecentTicketsRef: ListRecentTicketsRef;

export function listRecentTickets(options?: ExecuteQueryOptions): QueryPromise<ListRecentTicketsData, undefined>;
export function listRecentTickets(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListRecentTicketsData, undefined>;

interface GetUserProfileRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserProfileVariables): QueryRef<GetUserProfileData, GetUserProfileVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetUserProfileVariables): QueryRef<GetUserProfileData, GetUserProfileVariables>;
  operationName: string;
}
export const getUserProfileRef: GetUserProfileRef;

export function getUserProfile(vars: GetUserProfileVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserProfileData, GetUserProfileVariables>;
export function getUserProfile(dc: DataConnect, vars: GetUserProfileVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserProfileData, GetUserProfileVariables>;

interface ListUserTicketsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListUserTicketsVariables): QueryRef<ListUserTicketsData, ListUserTicketsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListUserTicketsVariables): QueryRef<ListUserTicketsData, ListUserTicketsVariables>;
  operationName: string;
}
export const listUserTicketsRef: ListUserTicketsRef;

export function listUserTickets(vars: ListUserTicketsVariables, options?: ExecuteQueryOptions): QueryPromise<ListUserTicketsData, ListUserTicketsVariables>;
export function listUserTickets(dc: DataConnect, vars: ListUserTicketsVariables, options?: ExecuteQueryOptions): QueryPromise<ListUserTicketsData, ListUserTicketsVariables>;

interface ListPaquetesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListPaquetesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListPaquetesData, undefined>;
  operationName: string;
}
export const listPaquetesRef: ListPaquetesRef;

export function listPaquetes(options?: ExecuteQueryOptions): QueryPromise<ListPaquetesData, undefined>;
export function listPaquetes(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListPaquetesData, undefined>;

interface GetLandingPageRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetLandingPageVariables): QueryRef<GetLandingPageData, GetLandingPageVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetLandingPageVariables): QueryRef<GetLandingPageData, GetLandingPageVariables>;
  operationName: string;
}
export const getLandingPageRef: GetLandingPageRef;

export function getLandingPage(vars: GetLandingPageVariables, options?: ExecuteQueryOptions): QueryPromise<GetLandingPageData, GetLandingPageVariables>;
export function getLandingPage(dc: DataConnect, vars: GetLandingPageVariables, options?: ExecuteQueryOptions): QueryPromise<GetLandingPageData, GetLandingPageVariables>;

interface ListServiciosLandingRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListServiciosLandingData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListServiciosLandingData, undefined>;
  operationName: string;
}
export const listServiciosLandingRef: ListServiciosLandingRef;

export function listServiciosLanding(options?: ExecuteQueryOptions): QueryPromise<ListServiciosLandingData, undefined>;
export function listServiciosLanding(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListServiciosLandingData, undefined>;

interface ListServiciosAdminRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListServiciosAdminData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListServiciosAdminData, undefined>;
  operationName: string;
}
export const listServiciosAdminRef: ListServiciosAdminRef;

export function listServiciosAdmin(options?: ExecuteQueryOptions): QueryPromise<ListServiciosAdminData, undefined>;
export function listServiciosAdmin(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListServiciosAdminData, undefined>;

interface ListProductosAdminRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListProductosAdminData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListProductosAdminData, undefined>;
  operationName: string;
}
export const listProductosAdminRef: ListProductosAdminRef;

export function listProductosAdmin(options?: ExecuteQueryOptions): QueryPromise<ListProductosAdminData, undefined>;
export function listProductosAdmin(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListProductosAdminData, undefined>;

interface ListMovimientosInventarioRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListMovimientosInventarioVariables): QueryRef<ListMovimientosInventarioData, ListMovimientosInventarioVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListMovimientosInventarioVariables): QueryRef<ListMovimientosInventarioData, ListMovimientosInventarioVariables>;
  operationName: string;
}
export const listMovimientosInventarioRef: ListMovimientosInventarioRef;

export function listMovimientosInventario(vars: ListMovimientosInventarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListMovimientosInventarioData, ListMovimientosInventarioVariables>;
export function listMovimientosInventario(dc: DataConnect, vars: ListMovimientosInventarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListMovimientosInventarioData, ListMovimientosInventarioVariables>;

