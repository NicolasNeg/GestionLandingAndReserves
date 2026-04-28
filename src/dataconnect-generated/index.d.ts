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

export interface CreatePaqueteData {
  paquete_insert: Paquete_Key;
}

export interface CreatePaqueteVariables {
  nombre: string;
  descripcion: string;
  precioBase: number;
  incluyePersonas: number;
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

export interface Paquete_Key {
  id: UUIDString;
  __typename?: 'Paquete_Key';
}

export interface Ticket_Key {
  id: UUIDString;
  __typename?: 'Ticket_Key';
}

export interface UpdateTicketStatusData {
  ticket_update?: Ticket_Key | null;
}

export interface UpdateTicketStatusVariables {
  id: UUIDString;
  estadoTicket: string;
  estadoPago: string;
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

