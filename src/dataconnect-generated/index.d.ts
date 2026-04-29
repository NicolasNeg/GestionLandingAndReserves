import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface CancelarMesaReservaData {
  mesaReserva_update?: MesaReserva_Key | null;
}

export interface CancelarMesaReservaVariables {
  id: UUIDString;
}

export interface CheckMesaReservaLibreData {
  mesaReservas: ({
    id: UUIDString;
  } & MesaReserva_Key)[];
}

export interface CheckMesaReservaLibreVariables {
  fechaDia: string;
  mapItemId: string;
}

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

export interface CreateMesaReservaData {
  mesaReserva_insert: MesaReserva_Key;
}

export interface CreateMesaReservaVariables {
  fechaDia: string;
  mapItemId: string;
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
  imagenUrl: string;
  precio: number;
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

export interface DeleteProductoData {
  producto_delete?: Producto_Key | null;
}

export interface DeleteProductoVariables {
  id: UUIDString;
}

export interface DeleteServicioData {
  servicio_delete?: Servicio_Key | null;
}

export interface DeleteServicioVariables {
  id: UUIDString;
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
    mapaMesasJson: string;
    mapaEstacionamientoJson: string;
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

export interface ListMesaReservasActivasPorFechaData {
  mesaReservas: ({
    mapItemId: string;
  })[];
}

export interface ListMesaReservasActivasPorFechaVariables {
  fechaDia: string;
}

export interface ListMesaReservasByFechaData {
  mesaReservas: ({
    id: UUIDString;
    fechaDia: string;
    mapItemId: string;
    estado: string;
    user?: {
      id: string;
    } & User_Key;
      ticket?: {
        id: UUIDString;
      } & Ticket_Key;
        creadoEn: TimestampString;
  } & MesaReserva_Key)[];
}

export interface ListMesaReservasByFechaVariables {
  fechaDia: string;
}

export interface ListMesaReservasVenciblesData {
  mesaReservas: ({
    id: UUIDString;
    fechaDia: string;
    mapItemId: string;
    estado: string;
  } & MesaReserva_Key)[];
}

export interface ListMesaReservasVenciblesVariables {
  fechaDia: string;
}

export interface ListMisMesaReservasData {
  mesaReservas: ({
    id: UUIDString;
    fechaDia: string;
    mapItemId: string;
    estado: string;
    creadoEn: TimestampString;
    ticket?: {
      id: UUIDString;
    } & Ticket_Key;
  } & MesaReserva_Key)[];
}

export interface ListMisMesaReservasVariables {
  userId: string;
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

export interface ListProductosPublicData {
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
    imagenUrl: string;
    precio: number;
    orden: number;
    activo: boolean;
  } & Servicio_Key)[];
}

export interface ListServiciosLandingData {
  servicios: ({
    id: UUIDString;
    titulo: string;
    descripcion: string;
    imagenUrl: string;
    precio: number;
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

export interface MesaReserva_Key {
  id: UUIDString;
  __typename?: 'MesaReserva_Key';
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

export interface UpdateMesaReservaEstadoData {
  mesaReserva_update?: MesaReserva_Key | null;
}

export interface UpdateMesaReservaEstadoVariables {
  id: UUIDString;
  estado: string;
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
  imagenUrl: string;
  precio: number;
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
  mapaMesasJson: string;
  mapaEstacionamientoJson: string;
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

export interface VincularTicketMesaReservaData {
  mesaReserva_update?: MesaReserva_Key | null;
}

export interface VincularTicketMesaReservaVariables {
  id: UUIDString;
  ticketId: UUIDString;
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

interface CreateMesaReservaRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMesaReservaVariables): MutationRef<CreateMesaReservaData, CreateMesaReservaVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateMesaReservaVariables): MutationRef<CreateMesaReservaData, CreateMesaReservaVariables>;
  operationName: string;
}
export const createMesaReservaRef: CreateMesaReservaRef;

export function createMesaReserva(vars: CreateMesaReservaVariables): MutationPromise<CreateMesaReservaData, CreateMesaReservaVariables>;
export function createMesaReserva(dc: DataConnect, vars: CreateMesaReservaVariables): MutationPromise<CreateMesaReservaData, CreateMesaReservaVariables>;

interface CancelarMesaReservaRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CancelarMesaReservaVariables): MutationRef<CancelarMesaReservaData, CancelarMesaReservaVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CancelarMesaReservaVariables): MutationRef<CancelarMesaReservaData, CancelarMesaReservaVariables>;
  operationName: string;
}
export const cancelarMesaReservaRef: CancelarMesaReservaRef;

export function cancelarMesaReserva(vars: CancelarMesaReservaVariables): MutationPromise<CancelarMesaReservaData, CancelarMesaReservaVariables>;
export function cancelarMesaReserva(dc: DataConnect, vars: CancelarMesaReservaVariables): MutationPromise<CancelarMesaReservaData, CancelarMesaReservaVariables>;

interface DeleteServicioRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteServicioVariables): MutationRef<DeleteServicioData, DeleteServicioVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteServicioVariables): MutationRef<DeleteServicioData, DeleteServicioVariables>;
  operationName: string;
}
export const deleteServicioRef: DeleteServicioRef;

export function deleteServicio(vars: DeleteServicioVariables): MutationPromise<DeleteServicioData, DeleteServicioVariables>;
export function deleteServicio(dc: DataConnect, vars: DeleteServicioVariables): MutationPromise<DeleteServicioData, DeleteServicioVariables>;

interface DeleteProductoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteProductoVariables): MutationRef<DeleteProductoData, DeleteProductoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteProductoVariables): MutationRef<DeleteProductoData, DeleteProductoVariables>;
  operationName: string;
}
export const deleteProductoRef: DeleteProductoRef;

export function deleteProducto(vars: DeleteProductoVariables): MutationPromise<DeleteProductoData, DeleteProductoVariables>;
export function deleteProducto(dc: DataConnect, vars: DeleteProductoVariables): MutationPromise<DeleteProductoData, DeleteProductoVariables>;

interface UpdateMesaReservaEstadoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateMesaReservaEstadoVariables): MutationRef<UpdateMesaReservaEstadoData, UpdateMesaReservaEstadoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateMesaReservaEstadoVariables): MutationRef<UpdateMesaReservaEstadoData, UpdateMesaReservaEstadoVariables>;
  operationName: string;
}
export const updateMesaReservaEstadoRef: UpdateMesaReservaEstadoRef;

export function updateMesaReservaEstado(vars: UpdateMesaReservaEstadoVariables): MutationPromise<UpdateMesaReservaEstadoData, UpdateMesaReservaEstadoVariables>;
export function updateMesaReservaEstado(dc: DataConnect, vars: UpdateMesaReservaEstadoVariables): MutationPromise<UpdateMesaReservaEstadoData, UpdateMesaReservaEstadoVariables>;

interface VincularTicketMesaReservaRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: VincularTicketMesaReservaVariables): MutationRef<VincularTicketMesaReservaData, VincularTicketMesaReservaVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: VincularTicketMesaReservaVariables): MutationRef<VincularTicketMesaReservaData, VincularTicketMesaReservaVariables>;
  operationName: string;
}
export const vincularTicketMesaReservaRef: VincularTicketMesaReservaRef;

export function vincularTicketMesaReserva(vars: VincularTicketMesaReservaVariables): MutationPromise<VincularTicketMesaReservaData, VincularTicketMesaReservaVariables>;
export function vincularTicketMesaReserva(dc: DataConnect, vars: VincularTicketMesaReservaVariables): MutationPromise<VincularTicketMesaReservaData, VincularTicketMesaReservaVariables>;

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

interface ListProductosPublicRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListProductosPublicData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListProductosPublicData, undefined>;
  operationName: string;
}
export const listProductosPublicRef: ListProductosPublicRef;

export function listProductosPublic(options?: ExecuteQueryOptions): QueryPromise<ListProductosPublicData, undefined>;
export function listProductosPublic(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListProductosPublicData, undefined>;

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

interface ListMesaReservasActivasPorFechaRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListMesaReservasActivasPorFechaVariables): QueryRef<ListMesaReservasActivasPorFechaData, ListMesaReservasActivasPorFechaVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListMesaReservasActivasPorFechaVariables): QueryRef<ListMesaReservasActivasPorFechaData, ListMesaReservasActivasPorFechaVariables>;
  operationName: string;
}
export const listMesaReservasActivasPorFechaRef: ListMesaReservasActivasPorFechaRef;

export function listMesaReservasActivasPorFecha(vars: ListMesaReservasActivasPorFechaVariables, options?: ExecuteQueryOptions): QueryPromise<ListMesaReservasActivasPorFechaData, ListMesaReservasActivasPorFechaVariables>;
export function listMesaReservasActivasPorFecha(dc: DataConnect, vars: ListMesaReservasActivasPorFechaVariables, options?: ExecuteQueryOptions): QueryPromise<ListMesaReservasActivasPorFechaData, ListMesaReservasActivasPorFechaVariables>;

interface CheckMesaReservaLibreRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CheckMesaReservaLibreVariables): QueryRef<CheckMesaReservaLibreData, CheckMesaReservaLibreVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CheckMesaReservaLibreVariables): QueryRef<CheckMesaReservaLibreData, CheckMesaReservaLibreVariables>;
  operationName: string;
}
export const checkMesaReservaLibreRef: CheckMesaReservaLibreRef;

export function checkMesaReservaLibre(vars: CheckMesaReservaLibreVariables, options?: ExecuteQueryOptions): QueryPromise<CheckMesaReservaLibreData, CheckMesaReservaLibreVariables>;
export function checkMesaReservaLibre(dc: DataConnect, vars: CheckMesaReservaLibreVariables, options?: ExecuteQueryOptions): QueryPromise<CheckMesaReservaLibreData, CheckMesaReservaLibreVariables>;

interface ListMisMesaReservasRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListMisMesaReservasVariables): QueryRef<ListMisMesaReservasData, ListMisMesaReservasVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListMisMesaReservasVariables): QueryRef<ListMisMesaReservasData, ListMisMesaReservasVariables>;
  operationName: string;
}
export const listMisMesaReservasRef: ListMisMesaReservasRef;

export function listMisMesaReservas(vars: ListMisMesaReservasVariables, options?: ExecuteQueryOptions): QueryPromise<ListMisMesaReservasData, ListMisMesaReservasVariables>;
export function listMisMesaReservas(dc: DataConnect, vars: ListMisMesaReservasVariables, options?: ExecuteQueryOptions): QueryPromise<ListMisMesaReservasData, ListMisMesaReservasVariables>;

interface ListMesaReservasByFechaRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListMesaReservasByFechaVariables): QueryRef<ListMesaReservasByFechaData, ListMesaReservasByFechaVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListMesaReservasByFechaVariables): QueryRef<ListMesaReservasByFechaData, ListMesaReservasByFechaVariables>;
  operationName: string;
}
export const listMesaReservasByFechaRef: ListMesaReservasByFechaRef;

export function listMesaReservasByFecha(vars: ListMesaReservasByFechaVariables, options?: ExecuteQueryOptions): QueryPromise<ListMesaReservasByFechaData, ListMesaReservasByFechaVariables>;
export function listMesaReservasByFecha(dc: DataConnect, vars: ListMesaReservasByFechaVariables, options?: ExecuteQueryOptions): QueryPromise<ListMesaReservasByFechaData, ListMesaReservasByFechaVariables>;

interface ListMesaReservasVenciblesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListMesaReservasVenciblesVariables): QueryRef<ListMesaReservasVenciblesData, ListMesaReservasVenciblesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListMesaReservasVenciblesVariables): QueryRef<ListMesaReservasVenciblesData, ListMesaReservasVenciblesVariables>;
  operationName: string;
}
export const listMesaReservasVenciblesRef: ListMesaReservasVenciblesRef;

export function listMesaReservasVencibles(vars: ListMesaReservasVenciblesVariables, options?: ExecuteQueryOptions): QueryPromise<ListMesaReservasVenciblesData, ListMesaReservasVenciblesVariables>;
export function listMesaReservasVencibles(dc: DataConnect, vars: ListMesaReservasVenciblesVariables, options?: ExecuteQueryOptions): QueryPromise<ListMesaReservasVenciblesData, ListMesaReservasVenciblesVariables>;

