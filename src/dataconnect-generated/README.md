# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetTicketById*](#getticketbyid)
  - [*ListRecentTickets*](#listrecenttickets)
  - [*GetUserProfile*](#getuserprofile)
  - [*ListUserTickets*](#listusertickets)
  - [*ListPaquetes*](#listpaquetes)
  - [*GetLandingPage*](#getlandingpage)
  - [*ListServiciosLanding*](#listservicioslanding)
  - [*ListServiciosAdmin*](#listserviciosadmin)
  - [*ListProductosAdmin*](#listproductosadmin)
  - [*ListProductosPublic*](#listproductospublic)
  - [*ListMovimientosInventario*](#listmovimientosinventario)
  - [*ListMesaReservasActivasPorFecha*](#listmesareservasactivasporfecha)
  - [*CheckMesaReservaLibre*](#checkmesareservalibre)
  - [*ListMisMesaReservas*](#listmismesareservas)
  - [*ListMesaReservasByFecha*](#listmesareservasbyfecha)
  - [*ListMesaReservasVencibles*](#listmesareservasvencibles)
- [**Mutations**](#mutations)
  - [*CreateAnonymousTicket*](#createanonymousticket)
  - [*CreateUserTicket*](#createuserticket)
  - [*UpdateTicketStatus*](#updateticketstatus)
  - [*CreatePaquete*](#createpaquete)
  - [*UpsertUser*](#upsertuser)
  - [*UpsertLandingPage*](#upsertlandingpage)
  - [*CreateServicio*](#createservicio)
  - [*UpdateServicio*](#updateservicio)
  - [*CreateProducto*](#createproducto)
  - [*UpdateProducto*](#updateproducto)
  - [*UpdateProductoStock*](#updateproductostock)
  - [*CreateMovimientoInventario*](#createmovimientoinventario)
  - [*CreateMesaReserva*](#createmesareserva)
  - [*CancelarMesaReserva*](#cancelarmesareserva)
  - [*DeleteServicio*](#deleteservicio)
  - [*DeleteProducto*](#deleteproducto)
  - [*UpdateMesaReservaEstado*](#updatemesareservaestado)
  - [*VincularTicketMesaReserva*](#vincularticketmesareserva)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetTicketById
You can execute the `GetTicketById` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getTicketById(vars: GetTicketByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetTicketByIdData, GetTicketByIdVariables>;

interface GetTicketByIdRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetTicketByIdVariables): QueryRef<GetTicketByIdData, GetTicketByIdVariables>;
}
export const getTicketByIdRef: GetTicketByIdRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getTicketById(dc: DataConnect, vars: GetTicketByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetTicketByIdData, GetTicketByIdVariables>;

interface GetTicketByIdRef {
  ...
  (dc: DataConnect, vars: GetTicketByIdVariables): QueryRef<GetTicketByIdData, GetTicketByIdVariables>;
}
export const getTicketByIdRef: GetTicketByIdRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getTicketByIdRef:
```typescript
const name = getTicketByIdRef.operationName;
console.log(name);
```

### Variables
The `GetTicketById` query requires an argument of type `GetTicketByIdVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetTicketByIdVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetTicketById` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetTicketByIdData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetTicketById`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getTicketById, GetTicketByIdVariables } from '@dataconnect/generated';

// The `GetTicketById` query requires an argument of type `GetTicketByIdVariables`:
const getTicketByIdVars: GetTicketByIdVariables = {
  id: ..., 
};

// Call the `getTicketById()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getTicketById(getTicketByIdVars);
// Variables can be defined inline as well.
const { data } = await getTicketById({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getTicketById(dataConnect, getTicketByIdVars);

console.log(data.ticket);

// Or, you can use the `Promise` API.
getTicketById(getTicketByIdVars).then((response) => {
  const data = response.data;
  console.log(data.ticket);
});
```

### Using `GetTicketById`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getTicketByIdRef, GetTicketByIdVariables } from '@dataconnect/generated';

// The `GetTicketById` query requires an argument of type `GetTicketByIdVariables`:
const getTicketByIdVars: GetTicketByIdVariables = {
  id: ..., 
};

// Call the `getTicketByIdRef()` function to get a reference to the query.
const ref = getTicketByIdRef(getTicketByIdVars);
// Variables can be defined inline as well.
const ref = getTicketByIdRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getTicketByIdRef(dataConnect, getTicketByIdVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.ticket);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.ticket);
});
```

## ListRecentTickets
You can execute the `ListRecentTickets` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listRecentTickets(options?: ExecuteQueryOptions): QueryPromise<ListRecentTicketsData, undefined>;

interface ListRecentTicketsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListRecentTicketsData, undefined>;
}
export const listRecentTicketsRef: ListRecentTicketsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listRecentTickets(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListRecentTicketsData, undefined>;

interface ListRecentTicketsRef {
  ...
  (dc: DataConnect): QueryRef<ListRecentTicketsData, undefined>;
}
export const listRecentTicketsRef: ListRecentTicketsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listRecentTicketsRef:
```typescript
const name = listRecentTicketsRef.operationName;
console.log(name);
```

### Variables
The `ListRecentTickets` query has no variables.
### Return Type
Recall that executing the `ListRecentTickets` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListRecentTicketsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListRecentTickets`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listRecentTickets } from '@dataconnect/generated';


// Call the `listRecentTickets()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listRecentTickets();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listRecentTickets(dataConnect);

console.log(data.tickets);

// Or, you can use the `Promise` API.
listRecentTickets().then((response) => {
  const data = response.data;
  console.log(data.tickets);
});
```

### Using `ListRecentTickets`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listRecentTicketsRef } from '@dataconnect/generated';


// Call the `listRecentTicketsRef()` function to get a reference to the query.
const ref = listRecentTicketsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listRecentTicketsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.tickets);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.tickets);
});
```

## GetUserProfile
You can execute the `GetUserProfile` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getUserProfile(vars: GetUserProfileVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserProfileData, GetUserProfileVariables>;

interface GetUserProfileRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserProfileVariables): QueryRef<GetUserProfileData, GetUserProfileVariables>;
}
export const getUserProfileRef: GetUserProfileRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUserProfile(dc: DataConnect, vars: GetUserProfileVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserProfileData, GetUserProfileVariables>;

interface GetUserProfileRef {
  ...
  (dc: DataConnect, vars: GetUserProfileVariables): QueryRef<GetUserProfileData, GetUserProfileVariables>;
}
export const getUserProfileRef: GetUserProfileRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserProfileRef:
```typescript
const name = getUserProfileRef.operationName;
console.log(name);
```

### Variables
The `GetUserProfile` query requires an argument of type `GetUserProfileVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetUserProfileVariables {
  id: string;
}
```
### Return Type
Recall that executing the `GetUserProfile` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserProfileData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetUserProfileData {
  user?: {
    id: string;
    email?: string | null;
    nombre?: string | null;
    rol?: string | null;
  } & User_Key;
}
```
### Using `GetUserProfile`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserProfile, GetUserProfileVariables } from '@dataconnect/generated';

// The `GetUserProfile` query requires an argument of type `GetUserProfileVariables`:
const getUserProfileVars: GetUserProfileVariables = {
  id: ..., 
};

// Call the `getUserProfile()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserProfile(getUserProfileVars);
// Variables can be defined inline as well.
const { data } = await getUserProfile({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserProfile(dataConnect, getUserProfileVars);

console.log(data.user);

// Or, you can use the `Promise` API.
getUserProfile(getUserProfileVars).then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

### Using `GetUserProfile`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserProfileRef, GetUserProfileVariables } from '@dataconnect/generated';

// The `GetUserProfile` query requires an argument of type `GetUserProfileVariables`:
const getUserProfileVars: GetUserProfileVariables = {
  id: ..., 
};

// Call the `getUserProfileRef()` function to get a reference to the query.
const ref = getUserProfileRef(getUserProfileVars);
// Variables can be defined inline as well.
const ref = getUserProfileRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserProfileRef(dataConnect, getUserProfileVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.user);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

## ListUserTickets
You can execute the `ListUserTickets` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listUserTickets(vars: ListUserTicketsVariables, options?: ExecuteQueryOptions): QueryPromise<ListUserTicketsData, ListUserTicketsVariables>;

interface ListUserTicketsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListUserTicketsVariables): QueryRef<ListUserTicketsData, ListUserTicketsVariables>;
}
export const listUserTicketsRef: ListUserTicketsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listUserTickets(dc: DataConnect, vars: ListUserTicketsVariables, options?: ExecuteQueryOptions): QueryPromise<ListUserTicketsData, ListUserTicketsVariables>;

interface ListUserTicketsRef {
  ...
  (dc: DataConnect, vars: ListUserTicketsVariables): QueryRef<ListUserTicketsData, ListUserTicketsVariables>;
}
export const listUserTicketsRef: ListUserTicketsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listUserTicketsRef:
```typescript
const name = listUserTicketsRef.operationName;
console.log(name);
```

### Variables
The `ListUserTickets` query requires an argument of type `ListUserTicketsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListUserTicketsVariables {
  userId: string;
}
```
### Return Type
Recall that executing the `ListUserTickets` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListUserTicketsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListUserTickets`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listUserTickets, ListUserTicketsVariables } from '@dataconnect/generated';

// The `ListUserTickets` query requires an argument of type `ListUserTicketsVariables`:
const listUserTicketsVars: ListUserTicketsVariables = {
  userId: ..., 
};

// Call the `listUserTickets()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listUserTickets(listUserTicketsVars);
// Variables can be defined inline as well.
const { data } = await listUserTickets({ userId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listUserTickets(dataConnect, listUserTicketsVars);

console.log(data.tickets);

// Or, you can use the `Promise` API.
listUserTickets(listUserTicketsVars).then((response) => {
  const data = response.data;
  console.log(data.tickets);
});
```

### Using `ListUserTickets`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listUserTicketsRef, ListUserTicketsVariables } from '@dataconnect/generated';

// The `ListUserTickets` query requires an argument of type `ListUserTicketsVariables`:
const listUserTicketsVars: ListUserTicketsVariables = {
  userId: ..., 
};

// Call the `listUserTicketsRef()` function to get a reference to the query.
const ref = listUserTicketsRef(listUserTicketsVars);
// Variables can be defined inline as well.
const ref = listUserTicketsRef({ userId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listUserTicketsRef(dataConnect, listUserTicketsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.tickets);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.tickets);
});
```

## ListPaquetes
You can execute the `ListPaquetes` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listPaquetes(options?: ExecuteQueryOptions): QueryPromise<ListPaquetesData, undefined>;

interface ListPaquetesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListPaquetesData, undefined>;
}
export const listPaquetesRef: ListPaquetesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listPaquetes(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListPaquetesData, undefined>;

interface ListPaquetesRef {
  ...
  (dc: DataConnect): QueryRef<ListPaquetesData, undefined>;
}
export const listPaquetesRef: ListPaquetesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listPaquetesRef:
```typescript
const name = listPaquetesRef.operationName;
console.log(name);
```

### Variables
The `ListPaquetes` query has no variables.
### Return Type
Recall that executing the `ListPaquetes` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListPaquetesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListPaquetes`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listPaquetes } from '@dataconnect/generated';


// Call the `listPaquetes()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listPaquetes();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listPaquetes(dataConnect);

console.log(data.paquetes);

// Or, you can use the `Promise` API.
listPaquetes().then((response) => {
  const data = response.data;
  console.log(data.paquetes);
});
```

### Using `ListPaquetes`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listPaquetesRef } from '@dataconnect/generated';


// Call the `listPaquetesRef()` function to get a reference to the query.
const ref = listPaquetesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listPaquetesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.paquetes);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.paquetes);
});
```

## GetLandingPage
You can execute the `GetLandingPage` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getLandingPage(vars: GetLandingPageVariables, options?: ExecuteQueryOptions): QueryPromise<GetLandingPageData, GetLandingPageVariables>;

interface GetLandingPageRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetLandingPageVariables): QueryRef<GetLandingPageData, GetLandingPageVariables>;
}
export const getLandingPageRef: GetLandingPageRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getLandingPage(dc: DataConnect, vars: GetLandingPageVariables, options?: ExecuteQueryOptions): QueryPromise<GetLandingPageData, GetLandingPageVariables>;

interface GetLandingPageRef {
  ...
  (dc: DataConnect, vars: GetLandingPageVariables): QueryRef<GetLandingPageData, GetLandingPageVariables>;
}
export const getLandingPageRef: GetLandingPageRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getLandingPageRef:
```typescript
const name = getLandingPageRef.operationName;
console.log(name);
```

### Variables
The `GetLandingPage` query requires an argument of type `GetLandingPageVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetLandingPageVariables {
  id: string;
}
```
### Return Type
Recall that executing the `GetLandingPage` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetLandingPageData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetLandingPage`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getLandingPage, GetLandingPageVariables } from '@dataconnect/generated';

// The `GetLandingPage` query requires an argument of type `GetLandingPageVariables`:
const getLandingPageVars: GetLandingPageVariables = {
  id: ..., 
};

// Call the `getLandingPage()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getLandingPage(getLandingPageVars);
// Variables can be defined inline as well.
const { data } = await getLandingPage({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getLandingPage(dataConnect, getLandingPageVars);

console.log(data.landingPage);

// Or, you can use the `Promise` API.
getLandingPage(getLandingPageVars).then((response) => {
  const data = response.data;
  console.log(data.landingPage);
});
```

### Using `GetLandingPage`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getLandingPageRef, GetLandingPageVariables } from '@dataconnect/generated';

// The `GetLandingPage` query requires an argument of type `GetLandingPageVariables`:
const getLandingPageVars: GetLandingPageVariables = {
  id: ..., 
};

// Call the `getLandingPageRef()` function to get a reference to the query.
const ref = getLandingPageRef(getLandingPageVars);
// Variables can be defined inline as well.
const ref = getLandingPageRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getLandingPageRef(dataConnect, getLandingPageVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.landingPage);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.landingPage);
});
```

## ListServiciosLanding
You can execute the `ListServiciosLanding` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listServiciosLanding(options?: ExecuteQueryOptions): QueryPromise<ListServiciosLandingData, undefined>;

interface ListServiciosLandingRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListServiciosLandingData, undefined>;
}
export const listServiciosLandingRef: ListServiciosLandingRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listServiciosLanding(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListServiciosLandingData, undefined>;

interface ListServiciosLandingRef {
  ...
  (dc: DataConnect): QueryRef<ListServiciosLandingData, undefined>;
}
export const listServiciosLandingRef: ListServiciosLandingRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listServiciosLandingRef:
```typescript
const name = listServiciosLandingRef.operationName;
console.log(name);
```

### Variables
The `ListServiciosLanding` query has no variables.
### Return Type
Recall that executing the `ListServiciosLanding` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListServiciosLandingData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListServiciosLanding`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listServiciosLanding } from '@dataconnect/generated';


// Call the `listServiciosLanding()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listServiciosLanding();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listServiciosLanding(dataConnect);

console.log(data.servicios);

// Or, you can use the `Promise` API.
listServiciosLanding().then((response) => {
  const data = response.data;
  console.log(data.servicios);
});
```

### Using `ListServiciosLanding`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listServiciosLandingRef } from '@dataconnect/generated';


// Call the `listServiciosLandingRef()` function to get a reference to the query.
const ref = listServiciosLandingRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listServiciosLandingRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.servicios);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.servicios);
});
```

## ListServiciosAdmin
You can execute the `ListServiciosAdmin` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listServiciosAdmin(options?: ExecuteQueryOptions): QueryPromise<ListServiciosAdminData, undefined>;

interface ListServiciosAdminRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListServiciosAdminData, undefined>;
}
export const listServiciosAdminRef: ListServiciosAdminRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listServiciosAdmin(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListServiciosAdminData, undefined>;

interface ListServiciosAdminRef {
  ...
  (dc: DataConnect): QueryRef<ListServiciosAdminData, undefined>;
}
export const listServiciosAdminRef: ListServiciosAdminRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listServiciosAdminRef:
```typescript
const name = listServiciosAdminRef.operationName;
console.log(name);
```

### Variables
The `ListServiciosAdmin` query has no variables.
### Return Type
Recall that executing the `ListServiciosAdmin` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListServiciosAdminData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListServiciosAdmin`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listServiciosAdmin } from '@dataconnect/generated';


// Call the `listServiciosAdmin()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listServiciosAdmin();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listServiciosAdmin(dataConnect);

console.log(data.servicios);

// Or, you can use the `Promise` API.
listServiciosAdmin().then((response) => {
  const data = response.data;
  console.log(data.servicios);
});
```

### Using `ListServiciosAdmin`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listServiciosAdminRef } from '@dataconnect/generated';


// Call the `listServiciosAdminRef()` function to get a reference to the query.
const ref = listServiciosAdminRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listServiciosAdminRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.servicios);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.servicios);
});
```

## ListProductosAdmin
You can execute the `ListProductosAdmin` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listProductosAdmin(options?: ExecuteQueryOptions): QueryPromise<ListProductosAdminData, undefined>;

interface ListProductosAdminRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListProductosAdminData, undefined>;
}
export const listProductosAdminRef: ListProductosAdminRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listProductosAdmin(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListProductosAdminData, undefined>;

interface ListProductosAdminRef {
  ...
  (dc: DataConnect): QueryRef<ListProductosAdminData, undefined>;
}
export const listProductosAdminRef: ListProductosAdminRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listProductosAdminRef:
```typescript
const name = listProductosAdminRef.operationName;
console.log(name);
```

### Variables
The `ListProductosAdmin` query has no variables.
### Return Type
Recall that executing the `ListProductosAdmin` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListProductosAdminData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListProductosAdmin`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listProductosAdmin } from '@dataconnect/generated';


// Call the `listProductosAdmin()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listProductosAdmin();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listProductosAdmin(dataConnect);

console.log(data.productos);

// Or, you can use the `Promise` API.
listProductosAdmin().then((response) => {
  const data = response.data;
  console.log(data.productos);
});
```

### Using `ListProductosAdmin`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listProductosAdminRef } from '@dataconnect/generated';


// Call the `listProductosAdminRef()` function to get a reference to the query.
const ref = listProductosAdminRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listProductosAdminRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.productos);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.productos);
});
```

## ListProductosPublic
You can execute the `ListProductosPublic` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listProductosPublic(options?: ExecuteQueryOptions): QueryPromise<ListProductosPublicData, undefined>;

interface ListProductosPublicRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListProductosPublicData, undefined>;
}
export const listProductosPublicRef: ListProductosPublicRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listProductosPublic(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListProductosPublicData, undefined>;

interface ListProductosPublicRef {
  ...
  (dc: DataConnect): QueryRef<ListProductosPublicData, undefined>;
}
export const listProductosPublicRef: ListProductosPublicRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listProductosPublicRef:
```typescript
const name = listProductosPublicRef.operationName;
console.log(name);
```

### Variables
The `ListProductosPublic` query has no variables.
### Return Type
Recall that executing the `ListProductosPublic` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListProductosPublicData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListProductosPublic`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listProductosPublic } from '@dataconnect/generated';


// Call the `listProductosPublic()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listProductosPublic();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listProductosPublic(dataConnect);

console.log(data.productos);

// Or, you can use the `Promise` API.
listProductosPublic().then((response) => {
  const data = response.data;
  console.log(data.productos);
});
```

### Using `ListProductosPublic`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listProductosPublicRef } from '@dataconnect/generated';


// Call the `listProductosPublicRef()` function to get a reference to the query.
const ref = listProductosPublicRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listProductosPublicRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.productos);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.productos);
});
```

## ListMovimientosInventario
You can execute the `ListMovimientosInventario` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listMovimientosInventario(vars: ListMovimientosInventarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListMovimientosInventarioData, ListMovimientosInventarioVariables>;

interface ListMovimientosInventarioRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListMovimientosInventarioVariables): QueryRef<ListMovimientosInventarioData, ListMovimientosInventarioVariables>;
}
export const listMovimientosInventarioRef: ListMovimientosInventarioRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMovimientosInventario(dc: DataConnect, vars: ListMovimientosInventarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListMovimientosInventarioData, ListMovimientosInventarioVariables>;

interface ListMovimientosInventarioRef {
  ...
  (dc: DataConnect, vars: ListMovimientosInventarioVariables): QueryRef<ListMovimientosInventarioData, ListMovimientosInventarioVariables>;
}
export const listMovimientosInventarioRef: ListMovimientosInventarioRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMovimientosInventarioRef:
```typescript
const name = listMovimientosInventarioRef.operationName;
console.log(name);
```

### Variables
The `ListMovimientosInventario` query requires an argument of type `ListMovimientosInventarioVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListMovimientosInventarioVariables {
  productoId: UUIDString;
}
```
### Return Type
Recall that executing the `ListMovimientosInventario` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMovimientosInventarioData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListMovimientosInventario`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMovimientosInventario, ListMovimientosInventarioVariables } from '@dataconnect/generated';

// The `ListMovimientosInventario` query requires an argument of type `ListMovimientosInventarioVariables`:
const listMovimientosInventarioVars: ListMovimientosInventarioVariables = {
  productoId: ..., 
};

// Call the `listMovimientosInventario()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMovimientosInventario(listMovimientosInventarioVars);
// Variables can be defined inline as well.
const { data } = await listMovimientosInventario({ productoId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMovimientosInventario(dataConnect, listMovimientosInventarioVars);

console.log(data.movimientoInventarios);

// Or, you can use the `Promise` API.
listMovimientosInventario(listMovimientosInventarioVars).then((response) => {
  const data = response.data;
  console.log(data.movimientoInventarios);
});
```

### Using `ListMovimientosInventario`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMovimientosInventarioRef, ListMovimientosInventarioVariables } from '@dataconnect/generated';

// The `ListMovimientosInventario` query requires an argument of type `ListMovimientosInventarioVariables`:
const listMovimientosInventarioVars: ListMovimientosInventarioVariables = {
  productoId: ..., 
};

// Call the `listMovimientosInventarioRef()` function to get a reference to the query.
const ref = listMovimientosInventarioRef(listMovimientosInventarioVars);
// Variables can be defined inline as well.
const ref = listMovimientosInventarioRef({ productoId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMovimientosInventarioRef(dataConnect, listMovimientosInventarioVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.movimientoInventarios);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.movimientoInventarios);
});
```

## ListMesaReservasActivasPorFecha
You can execute the `ListMesaReservasActivasPorFecha` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listMesaReservasActivasPorFecha(vars: ListMesaReservasActivasPorFechaVariables, options?: ExecuteQueryOptions): QueryPromise<ListMesaReservasActivasPorFechaData, ListMesaReservasActivasPorFechaVariables>;

interface ListMesaReservasActivasPorFechaRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListMesaReservasActivasPorFechaVariables): QueryRef<ListMesaReservasActivasPorFechaData, ListMesaReservasActivasPorFechaVariables>;
}
export const listMesaReservasActivasPorFechaRef: ListMesaReservasActivasPorFechaRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMesaReservasActivasPorFecha(dc: DataConnect, vars: ListMesaReservasActivasPorFechaVariables, options?: ExecuteQueryOptions): QueryPromise<ListMesaReservasActivasPorFechaData, ListMesaReservasActivasPorFechaVariables>;

interface ListMesaReservasActivasPorFechaRef {
  ...
  (dc: DataConnect, vars: ListMesaReservasActivasPorFechaVariables): QueryRef<ListMesaReservasActivasPorFechaData, ListMesaReservasActivasPorFechaVariables>;
}
export const listMesaReservasActivasPorFechaRef: ListMesaReservasActivasPorFechaRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMesaReservasActivasPorFechaRef:
```typescript
const name = listMesaReservasActivasPorFechaRef.operationName;
console.log(name);
```

### Variables
The `ListMesaReservasActivasPorFecha` query requires an argument of type `ListMesaReservasActivasPorFechaVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListMesaReservasActivasPorFechaVariables {
  fechaDia: string;
}
```
### Return Type
Recall that executing the `ListMesaReservasActivasPorFecha` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMesaReservasActivasPorFechaData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMesaReservasActivasPorFechaData {
  mesaReservas: ({
    mapItemId: string;
  })[];
}
```
### Using `ListMesaReservasActivasPorFecha`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMesaReservasActivasPorFecha, ListMesaReservasActivasPorFechaVariables } from '@dataconnect/generated';

// The `ListMesaReservasActivasPorFecha` query requires an argument of type `ListMesaReservasActivasPorFechaVariables`:
const listMesaReservasActivasPorFechaVars: ListMesaReservasActivasPorFechaVariables = {
  fechaDia: ..., 
};

// Call the `listMesaReservasActivasPorFecha()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMesaReservasActivasPorFecha(listMesaReservasActivasPorFechaVars);
// Variables can be defined inline as well.
const { data } = await listMesaReservasActivasPorFecha({ fechaDia: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMesaReservasActivasPorFecha(dataConnect, listMesaReservasActivasPorFechaVars);

console.log(data.mesaReservas);

// Or, you can use the `Promise` API.
listMesaReservasActivasPorFecha(listMesaReservasActivasPorFechaVars).then((response) => {
  const data = response.data;
  console.log(data.mesaReservas);
});
```

### Using `ListMesaReservasActivasPorFecha`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMesaReservasActivasPorFechaRef, ListMesaReservasActivasPorFechaVariables } from '@dataconnect/generated';

// The `ListMesaReservasActivasPorFecha` query requires an argument of type `ListMesaReservasActivasPorFechaVariables`:
const listMesaReservasActivasPorFechaVars: ListMesaReservasActivasPorFechaVariables = {
  fechaDia: ..., 
};

// Call the `listMesaReservasActivasPorFechaRef()` function to get a reference to the query.
const ref = listMesaReservasActivasPorFechaRef(listMesaReservasActivasPorFechaVars);
// Variables can be defined inline as well.
const ref = listMesaReservasActivasPorFechaRef({ fechaDia: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMesaReservasActivasPorFechaRef(dataConnect, listMesaReservasActivasPorFechaVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mesaReservas);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mesaReservas);
});
```

## CheckMesaReservaLibre
You can execute the `CheckMesaReservaLibre` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
checkMesaReservaLibre(vars: CheckMesaReservaLibreVariables, options?: ExecuteQueryOptions): QueryPromise<CheckMesaReservaLibreData, CheckMesaReservaLibreVariables>;

interface CheckMesaReservaLibreRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CheckMesaReservaLibreVariables): QueryRef<CheckMesaReservaLibreData, CheckMesaReservaLibreVariables>;
}
export const checkMesaReservaLibreRef: CheckMesaReservaLibreRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
checkMesaReservaLibre(dc: DataConnect, vars: CheckMesaReservaLibreVariables, options?: ExecuteQueryOptions): QueryPromise<CheckMesaReservaLibreData, CheckMesaReservaLibreVariables>;

interface CheckMesaReservaLibreRef {
  ...
  (dc: DataConnect, vars: CheckMesaReservaLibreVariables): QueryRef<CheckMesaReservaLibreData, CheckMesaReservaLibreVariables>;
}
export const checkMesaReservaLibreRef: CheckMesaReservaLibreRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the checkMesaReservaLibreRef:
```typescript
const name = checkMesaReservaLibreRef.operationName;
console.log(name);
```

### Variables
The `CheckMesaReservaLibre` query requires an argument of type `CheckMesaReservaLibreVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CheckMesaReservaLibreVariables {
  fechaDia: string;
  mapItemId: string;
}
```
### Return Type
Recall that executing the `CheckMesaReservaLibre` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CheckMesaReservaLibreData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CheckMesaReservaLibreData {
  mesaReservas: ({
    id: UUIDString;
  } & MesaReserva_Key)[];
}
```
### Using `CheckMesaReservaLibre`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, checkMesaReservaLibre, CheckMesaReservaLibreVariables } from '@dataconnect/generated';

// The `CheckMesaReservaLibre` query requires an argument of type `CheckMesaReservaLibreVariables`:
const checkMesaReservaLibreVars: CheckMesaReservaLibreVariables = {
  fechaDia: ..., 
  mapItemId: ..., 
};

// Call the `checkMesaReservaLibre()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await checkMesaReservaLibre(checkMesaReservaLibreVars);
// Variables can be defined inline as well.
const { data } = await checkMesaReservaLibre({ fechaDia: ..., mapItemId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await checkMesaReservaLibre(dataConnect, checkMesaReservaLibreVars);

console.log(data.mesaReservas);

// Or, you can use the `Promise` API.
checkMesaReservaLibre(checkMesaReservaLibreVars).then((response) => {
  const data = response.data;
  console.log(data.mesaReservas);
});
```

### Using `CheckMesaReservaLibre`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, checkMesaReservaLibreRef, CheckMesaReservaLibreVariables } from '@dataconnect/generated';

// The `CheckMesaReservaLibre` query requires an argument of type `CheckMesaReservaLibreVariables`:
const checkMesaReservaLibreVars: CheckMesaReservaLibreVariables = {
  fechaDia: ..., 
  mapItemId: ..., 
};

// Call the `checkMesaReservaLibreRef()` function to get a reference to the query.
const ref = checkMesaReservaLibreRef(checkMesaReservaLibreVars);
// Variables can be defined inline as well.
const ref = checkMesaReservaLibreRef({ fechaDia: ..., mapItemId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = checkMesaReservaLibreRef(dataConnect, checkMesaReservaLibreVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mesaReservas);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mesaReservas);
});
```

## ListMisMesaReservas
You can execute the `ListMisMesaReservas` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listMisMesaReservas(vars: ListMisMesaReservasVariables, options?: ExecuteQueryOptions): QueryPromise<ListMisMesaReservasData, ListMisMesaReservasVariables>;

interface ListMisMesaReservasRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListMisMesaReservasVariables): QueryRef<ListMisMesaReservasData, ListMisMesaReservasVariables>;
}
export const listMisMesaReservasRef: ListMisMesaReservasRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMisMesaReservas(dc: DataConnect, vars: ListMisMesaReservasVariables, options?: ExecuteQueryOptions): QueryPromise<ListMisMesaReservasData, ListMisMesaReservasVariables>;

interface ListMisMesaReservasRef {
  ...
  (dc: DataConnect, vars: ListMisMesaReservasVariables): QueryRef<ListMisMesaReservasData, ListMisMesaReservasVariables>;
}
export const listMisMesaReservasRef: ListMisMesaReservasRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMisMesaReservasRef:
```typescript
const name = listMisMesaReservasRef.operationName;
console.log(name);
```

### Variables
The `ListMisMesaReservas` query requires an argument of type `ListMisMesaReservasVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListMisMesaReservasVariables {
  userId: string;
}
```
### Return Type
Recall that executing the `ListMisMesaReservas` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMisMesaReservasData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListMisMesaReservas`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMisMesaReservas, ListMisMesaReservasVariables } from '@dataconnect/generated';

// The `ListMisMesaReservas` query requires an argument of type `ListMisMesaReservasVariables`:
const listMisMesaReservasVars: ListMisMesaReservasVariables = {
  userId: ..., 
};

// Call the `listMisMesaReservas()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMisMesaReservas(listMisMesaReservasVars);
// Variables can be defined inline as well.
const { data } = await listMisMesaReservas({ userId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMisMesaReservas(dataConnect, listMisMesaReservasVars);

console.log(data.mesaReservas);

// Or, you can use the `Promise` API.
listMisMesaReservas(listMisMesaReservasVars).then((response) => {
  const data = response.data;
  console.log(data.mesaReservas);
});
```

### Using `ListMisMesaReservas`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMisMesaReservasRef, ListMisMesaReservasVariables } from '@dataconnect/generated';

// The `ListMisMesaReservas` query requires an argument of type `ListMisMesaReservasVariables`:
const listMisMesaReservasVars: ListMisMesaReservasVariables = {
  userId: ..., 
};

// Call the `listMisMesaReservasRef()` function to get a reference to the query.
const ref = listMisMesaReservasRef(listMisMesaReservasVars);
// Variables can be defined inline as well.
const ref = listMisMesaReservasRef({ userId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMisMesaReservasRef(dataConnect, listMisMesaReservasVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mesaReservas);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mesaReservas);
});
```

## ListMesaReservasByFecha
You can execute the `ListMesaReservasByFecha` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listMesaReservasByFecha(vars: ListMesaReservasByFechaVariables, options?: ExecuteQueryOptions): QueryPromise<ListMesaReservasByFechaData, ListMesaReservasByFechaVariables>;

interface ListMesaReservasByFechaRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListMesaReservasByFechaVariables): QueryRef<ListMesaReservasByFechaData, ListMesaReservasByFechaVariables>;
}
export const listMesaReservasByFechaRef: ListMesaReservasByFechaRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMesaReservasByFecha(dc: DataConnect, vars: ListMesaReservasByFechaVariables, options?: ExecuteQueryOptions): QueryPromise<ListMesaReservasByFechaData, ListMesaReservasByFechaVariables>;

interface ListMesaReservasByFechaRef {
  ...
  (dc: DataConnect, vars: ListMesaReservasByFechaVariables): QueryRef<ListMesaReservasByFechaData, ListMesaReservasByFechaVariables>;
}
export const listMesaReservasByFechaRef: ListMesaReservasByFechaRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMesaReservasByFechaRef:
```typescript
const name = listMesaReservasByFechaRef.operationName;
console.log(name);
```

### Variables
The `ListMesaReservasByFecha` query requires an argument of type `ListMesaReservasByFechaVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListMesaReservasByFechaVariables {
  fechaDia: string;
}
```
### Return Type
Recall that executing the `ListMesaReservasByFecha` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMesaReservasByFechaData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListMesaReservasByFecha`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMesaReservasByFecha, ListMesaReservasByFechaVariables } from '@dataconnect/generated';

// The `ListMesaReservasByFecha` query requires an argument of type `ListMesaReservasByFechaVariables`:
const listMesaReservasByFechaVars: ListMesaReservasByFechaVariables = {
  fechaDia: ..., 
};

// Call the `listMesaReservasByFecha()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMesaReservasByFecha(listMesaReservasByFechaVars);
// Variables can be defined inline as well.
const { data } = await listMesaReservasByFecha({ fechaDia: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMesaReservasByFecha(dataConnect, listMesaReservasByFechaVars);

console.log(data.mesaReservas);

// Or, you can use the `Promise` API.
listMesaReservasByFecha(listMesaReservasByFechaVars).then((response) => {
  const data = response.data;
  console.log(data.mesaReservas);
});
```

### Using `ListMesaReservasByFecha`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMesaReservasByFechaRef, ListMesaReservasByFechaVariables } from '@dataconnect/generated';

// The `ListMesaReservasByFecha` query requires an argument of type `ListMesaReservasByFechaVariables`:
const listMesaReservasByFechaVars: ListMesaReservasByFechaVariables = {
  fechaDia: ..., 
};

// Call the `listMesaReservasByFechaRef()` function to get a reference to the query.
const ref = listMesaReservasByFechaRef(listMesaReservasByFechaVars);
// Variables can be defined inline as well.
const ref = listMesaReservasByFechaRef({ fechaDia: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMesaReservasByFechaRef(dataConnect, listMesaReservasByFechaVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mesaReservas);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mesaReservas);
});
```

## ListMesaReservasVencibles
You can execute the `ListMesaReservasVencibles` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listMesaReservasVencibles(vars: ListMesaReservasVenciblesVariables, options?: ExecuteQueryOptions): QueryPromise<ListMesaReservasVenciblesData, ListMesaReservasVenciblesVariables>;

interface ListMesaReservasVenciblesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListMesaReservasVenciblesVariables): QueryRef<ListMesaReservasVenciblesData, ListMesaReservasVenciblesVariables>;
}
export const listMesaReservasVenciblesRef: ListMesaReservasVenciblesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMesaReservasVencibles(dc: DataConnect, vars: ListMesaReservasVenciblesVariables, options?: ExecuteQueryOptions): QueryPromise<ListMesaReservasVenciblesData, ListMesaReservasVenciblesVariables>;

interface ListMesaReservasVenciblesRef {
  ...
  (dc: DataConnect, vars: ListMesaReservasVenciblesVariables): QueryRef<ListMesaReservasVenciblesData, ListMesaReservasVenciblesVariables>;
}
export const listMesaReservasVenciblesRef: ListMesaReservasVenciblesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMesaReservasVenciblesRef:
```typescript
const name = listMesaReservasVenciblesRef.operationName;
console.log(name);
```

### Variables
The `ListMesaReservasVencibles` query requires an argument of type `ListMesaReservasVenciblesVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListMesaReservasVenciblesVariables {
  fechaDia: string;
}
```
### Return Type
Recall that executing the `ListMesaReservasVencibles` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMesaReservasVenciblesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMesaReservasVenciblesData {
  mesaReservas: ({
    id: UUIDString;
    fechaDia: string;
    mapItemId: string;
    estado: string;
  } & MesaReserva_Key)[];
}
```
### Using `ListMesaReservasVencibles`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMesaReservasVencibles, ListMesaReservasVenciblesVariables } from '@dataconnect/generated';

// The `ListMesaReservasVencibles` query requires an argument of type `ListMesaReservasVenciblesVariables`:
const listMesaReservasVenciblesVars: ListMesaReservasVenciblesVariables = {
  fechaDia: ..., 
};

// Call the `listMesaReservasVencibles()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMesaReservasVencibles(listMesaReservasVenciblesVars);
// Variables can be defined inline as well.
const { data } = await listMesaReservasVencibles({ fechaDia: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMesaReservasVencibles(dataConnect, listMesaReservasVenciblesVars);

console.log(data.mesaReservas);

// Or, you can use the `Promise` API.
listMesaReservasVencibles(listMesaReservasVenciblesVars).then((response) => {
  const data = response.data;
  console.log(data.mesaReservas);
});
```

### Using `ListMesaReservasVencibles`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMesaReservasVenciblesRef, ListMesaReservasVenciblesVariables } from '@dataconnect/generated';

// The `ListMesaReservasVencibles` query requires an argument of type `ListMesaReservasVenciblesVariables`:
const listMesaReservasVenciblesVars: ListMesaReservasVenciblesVariables = {
  fechaDia: ..., 
};

// Call the `listMesaReservasVenciblesRef()` function to get a reference to the query.
const ref = listMesaReservasVenciblesRef(listMesaReservasVenciblesVars);
// Variables can be defined inline as well.
const ref = listMesaReservasVenciblesRef({ fechaDia: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMesaReservasVenciblesRef(dataConnect, listMesaReservasVenciblesVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mesaReservas);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mesaReservas);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateAnonymousTicket
You can execute the `CreateAnonymousTicket` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createAnonymousTicket(vars: CreateAnonymousTicketVariables): MutationPromise<CreateAnonymousTicketData, CreateAnonymousTicketVariables>;

interface CreateAnonymousTicketRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAnonymousTicketVariables): MutationRef<CreateAnonymousTicketData, CreateAnonymousTicketVariables>;
}
export const createAnonymousTicketRef: CreateAnonymousTicketRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createAnonymousTicket(dc: DataConnect, vars: CreateAnonymousTicketVariables): MutationPromise<CreateAnonymousTicketData, CreateAnonymousTicketVariables>;

interface CreateAnonymousTicketRef {
  ...
  (dc: DataConnect, vars: CreateAnonymousTicketVariables): MutationRef<CreateAnonymousTicketData, CreateAnonymousTicketVariables>;
}
export const createAnonymousTicketRef: CreateAnonymousTicketRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createAnonymousTicketRef:
```typescript
const name = createAnonymousTicketRef.operationName;
console.log(name);
```

### Variables
The `CreateAnonymousTicket` mutation requires an argument of type `CreateAnonymousTicketVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateAnonymousTicketVariables {
  clienteNombre: string;
  clienteEmail: string;
  metodoPago: string;
  estadoPago: string;
  precioTotal: number;
}
```
### Return Type
Recall that executing the `CreateAnonymousTicket` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateAnonymousTicketData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateAnonymousTicketData {
  ticket_insert: Ticket_Key;
}
```
### Using `CreateAnonymousTicket`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createAnonymousTicket, CreateAnonymousTicketVariables } from '@dataconnect/generated';

// The `CreateAnonymousTicket` mutation requires an argument of type `CreateAnonymousTicketVariables`:
const createAnonymousTicketVars: CreateAnonymousTicketVariables = {
  clienteNombre: ..., 
  clienteEmail: ..., 
  metodoPago: ..., 
  estadoPago: ..., 
  precioTotal: ..., 
};

// Call the `createAnonymousTicket()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createAnonymousTicket(createAnonymousTicketVars);
// Variables can be defined inline as well.
const { data } = await createAnonymousTicket({ clienteNombre: ..., clienteEmail: ..., metodoPago: ..., estadoPago: ..., precioTotal: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createAnonymousTicket(dataConnect, createAnonymousTicketVars);

console.log(data.ticket_insert);

// Or, you can use the `Promise` API.
createAnonymousTicket(createAnonymousTicketVars).then((response) => {
  const data = response.data;
  console.log(data.ticket_insert);
});
```

### Using `CreateAnonymousTicket`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createAnonymousTicketRef, CreateAnonymousTicketVariables } from '@dataconnect/generated';

// The `CreateAnonymousTicket` mutation requires an argument of type `CreateAnonymousTicketVariables`:
const createAnonymousTicketVars: CreateAnonymousTicketVariables = {
  clienteNombre: ..., 
  clienteEmail: ..., 
  metodoPago: ..., 
  estadoPago: ..., 
  precioTotal: ..., 
};

// Call the `createAnonymousTicketRef()` function to get a reference to the mutation.
const ref = createAnonymousTicketRef(createAnonymousTicketVars);
// Variables can be defined inline as well.
const ref = createAnonymousTicketRef({ clienteNombre: ..., clienteEmail: ..., metodoPago: ..., estadoPago: ..., precioTotal: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createAnonymousTicketRef(dataConnect, createAnonymousTicketVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.ticket_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.ticket_insert);
});
```

## CreateUserTicket
You can execute the `CreateUserTicket` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createUserTicket(vars: CreateUserTicketVariables): MutationPromise<CreateUserTicketData, CreateUserTicketVariables>;

interface CreateUserTicketRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateUserTicketVariables): MutationRef<CreateUserTicketData, CreateUserTicketVariables>;
}
export const createUserTicketRef: CreateUserTicketRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createUserTicket(dc: DataConnect, vars: CreateUserTicketVariables): MutationPromise<CreateUserTicketData, CreateUserTicketVariables>;

interface CreateUserTicketRef {
  ...
  (dc: DataConnect, vars: CreateUserTicketVariables): MutationRef<CreateUserTicketData, CreateUserTicketVariables>;
}
export const createUserTicketRef: CreateUserTicketRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createUserTicketRef:
```typescript
const name = createUserTicketRef.operationName;
console.log(name);
```

### Variables
The `CreateUserTicket` mutation requires an argument of type `CreateUserTicketVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateUserTicketVariables {
  clienteNombre: string;
  clienteEmail: string;
  metodoPago: string;
  estadoPago: string;
  precioTotal: number;
}
```
### Return Type
Recall that executing the `CreateUserTicket` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateUserTicketData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateUserTicketData {
  ticket_insert: Ticket_Key;
}
```
### Using `CreateUserTicket`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createUserTicket, CreateUserTicketVariables } from '@dataconnect/generated';

// The `CreateUserTicket` mutation requires an argument of type `CreateUserTicketVariables`:
const createUserTicketVars: CreateUserTicketVariables = {
  clienteNombre: ..., 
  clienteEmail: ..., 
  metodoPago: ..., 
  estadoPago: ..., 
  precioTotal: ..., 
};

// Call the `createUserTicket()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createUserTicket(createUserTicketVars);
// Variables can be defined inline as well.
const { data } = await createUserTicket({ clienteNombre: ..., clienteEmail: ..., metodoPago: ..., estadoPago: ..., precioTotal: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createUserTicket(dataConnect, createUserTicketVars);

console.log(data.ticket_insert);

// Or, you can use the `Promise` API.
createUserTicket(createUserTicketVars).then((response) => {
  const data = response.data;
  console.log(data.ticket_insert);
});
```

### Using `CreateUserTicket`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createUserTicketRef, CreateUserTicketVariables } from '@dataconnect/generated';

// The `CreateUserTicket` mutation requires an argument of type `CreateUserTicketVariables`:
const createUserTicketVars: CreateUserTicketVariables = {
  clienteNombre: ..., 
  clienteEmail: ..., 
  metodoPago: ..., 
  estadoPago: ..., 
  precioTotal: ..., 
};

// Call the `createUserTicketRef()` function to get a reference to the mutation.
const ref = createUserTicketRef(createUserTicketVars);
// Variables can be defined inline as well.
const ref = createUserTicketRef({ clienteNombre: ..., clienteEmail: ..., metodoPago: ..., estadoPago: ..., precioTotal: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createUserTicketRef(dataConnect, createUserTicketVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.ticket_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.ticket_insert);
});
```

## UpdateTicketStatus
You can execute the `UpdateTicketStatus` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateTicketStatus(vars: UpdateTicketStatusVariables): MutationPromise<UpdateTicketStatusData, UpdateTicketStatusVariables>;

interface UpdateTicketStatusRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateTicketStatusVariables): MutationRef<UpdateTicketStatusData, UpdateTicketStatusVariables>;
}
export const updateTicketStatusRef: UpdateTicketStatusRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateTicketStatus(dc: DataConnect, vars: UpdateTicketStatusVariables): MutationPromise<UpdateTicketStatusData, UpdateTicketStatusVariables>;

interface UpdateTicketStatusRef {
  ...
  (dc: DataConnect, vars: UpdateTicketStatusVariables): MutationRef<UpdateTicketStatusData, UpdateTicketStatusVariables>;
}
export const updateTicketStatusRef: UpdateTicketStatusRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateTicketStatusRef:
```typescript
const name = updateTicketStatusRef.operationName;
console.log(name);
```

### Variables
The `UpdateTicketStatus` mutation requires an argument of type `UpdateTicketStatusVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateTicketStatusVariables {
  id: UUIDString;
  estadoTicket: string;
  estadoPago: string;
}
```
### Return Type
Recall that executing the `UpdateTicketStatus` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateTicketStatusData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateTicketStatusData {
  ticket_update?: Ticket_Key | null;
}
```
### Using `UpdateTicketStatus`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateTicketStatus, UpdateTicketStatusVariables } from '@dataconnect/generated';

// The `UpdateTicketStatus` mutation requires an argument of type `UpdateTicketStatusVariables`:
const updateTicketStatusVars: UpdateTicketStatusVariables = {
  id: ..., 
  estadoTicket: ..., 
  estadoPago: ..., 
};

// Call the `updateTicketStatus()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateTicketStatus(updateTicketStatusVars);
// Variables can be defined inline as well.
const { data } = await updateTicketStatus({ id: ..., estadoTicket: ..., estadoPago: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateTicketStatus(dataConnect, updateTicketStatusVars);

console.log(data.ticket_update);

// Or, you can use the `Promise` API.
updateTicketStatus(updateTicketStatusVars).then((response) => {
  const data = response.data;
  console.log(data.ticket_update);
});
```

### Using `UpdateTicketStatus`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateTicketStatusRef, UpdateTicketStatusVariables } from '@dataconnect/generated';

// The `UpdateTicketStatus` mutation requires an argument of type `UpdateTicketStatusVariables`:
const updateTicketStatusVars: UpdateTicketStatusVariables = {
  id: ..., 
  estadoTicket: ..., 
  estadoPago: ..., 
};

// Call the `updateTicketStatusRef()` function to get a reference to the mutation.
const ref = updateTicketStatusRef(updateTicketStatusVars);
// Variables can be defined inline as well.
const ref = updateTicketStatusRef({ id: ..., estadoTicket: ..., estadoPago: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateTicketStatusRef(dataConnect, updateTicketStatusVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.ticket_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.ticket_update);
});
```

## CreatePaquete
You can execute the `CreatePaquete` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createPaquete(vars: CreatePaqueteVariables): MutationPromise<CreatePaqueteData, CreatePaqueteVariables>;

interface CreatePaqueteRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreatePaqueteVariables): MutationRef<CreatePaqueteData, CreatePaqueteVariables>;
}
export const createPaqueteRef: CreatePaqueteRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createPaquete(dc: DataConnect, vars: CreatePaqueteVariables): MutationPromise<CreatePaqueteData, CreatePaqueteVariables>;

interface CreatePaqueteRef {
  ...
  (dc: DataConnect, vars: CreatePaqueteVariables): MutationRef<CreatePaqueteData, CreatePaqueteVariables>;
}
export const createPaqueteRef: CreatePaqueteRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createPaqueteRef:
```typescript
const name = createPaqueteRef.operationName;
console.log(name);
```

### Variables
The `CreatePaquete` mutation requires an argument of type `CreatePaqueteVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreatePaqueteVariables {
  nombre: string;
  descripcion: string;
  precioBase: number;
  incluyePersonas: number;
}
```
### Return Type
Recall that executing the `CreatePaquete` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreatePaqueteData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreatePaqueteData {
  paquete_insert: Paquete_Key;
}
```
### Using `CreatePaquete`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createPaquete, CreatePaqueteVariables } from '@dataconnect/generated';

// The `CreatePaquete` mutation requires an argument of type `CreatePaqueteVariables`:
const createPaqueteVars: CreatePaqueteVariables = {
  nombre: ..., 
  descripcion: ..., 
  precioBase: ..., 
  incluyePersonas: ..., 
};

// Call the `createPaquete()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createPaquete(createPaqueteVars);
// Variables can be defined inline as well.
const { data } = await createPaquete({ nombre: ..., descripcion: ..., precioBase: ..., incluyePersonas: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createPaquete(dataConnect, createPaqueteVars);

console.log(data.paquete_insert);

// Or, you can use the `Promise` API.
createPaquete(createPaqueteVars).then((response) => {
  const data = response.data;
  console.log(data.paquete_insert);
});
```

### Using `CreatePaquete`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createPaqueteRef, CreatePaqueteVariables } from '@dataconnect/generated';

// The `CreatePaquete` mutation requires an argument of type `CreatePaqueteVariables`:
const createPaqueteVars: CreatePaqueteVariables = {
  nombre: ..., 
  descripcion: ..., 
  precioBase: ..., 
  incluyePersonas: ..., 
};

// Call the `createPaqueteRef()` function to get a reference to the mutation.
const ref = createPaqueteRef(createPaqueteVars);
// Variables can be defined inline as well.
const ref = createPaqueteRef({ nombre: ..., descripcion: ..., precioBase: ..., incluyePersonas: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createPaqueteRef(dataConnect, createPaqueteVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.paquete_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.paquete_insert);
});
```

## UpsertUser
You can execute the `UpsertUser` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
upsertUser(vars: UpsertUserVariables): MutationPromise<UpsertUserData, UpsertUserVariables>;

interface UpsertUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertUserVariables): MutationRef<UpsertUserData, UpsertUserVariables>;
}
export const upsertUserRef: UpsertUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertUser(dc: DataConnect, vars: UpsertUserVariables): MutationPromise<UpsertUserData, UpsertUserVariables>;

interface UpsertUserRef {
  ...
  (dc: DataConnect, vars: UpsertUserVariables): MutationRef<UpsertUserData, UpsertUserVariables>;
}
export const upsertUserRef: UpsertUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertUserRef:
```typescript
const name = upsertUserRef.operationName;
console.log(name);
```

### Variables
The `UpsertUser` mutation requires an argument of type `UpsertUserVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertUserVariables {
  id: string;
  email: string;
  nombre: string;
  rol: string;
}
```
### Return Type
Recall that executing the `UpsertUser` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertUserData {
  user_upsert: User_Key;
}
```
### Using `UpsertUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertUser, UpsertUserVariables } from '@dataconnect/generated';

// The `UpsertUser` mutation requires an argument of type `UpsertUserVariables`:
const upsertUserVars: UpsertUserVariables = {
  id: ..., 
  email: ..., 
  nombre: ..., 
  rol: ..., 
};

// Call the `upsertUser()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertUser(upsertUserVars);
// Variables can be defined inline as well.
const { data } = await upsertUser({ id: ..., email: ..., nombre: ..., rol: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertUser(dataConnect, upsertUserVars);

console.log(data.user_upsert);

// Or, you can use the `Promise` API.
upsertUser(upsertUserVars).then((response) => {
  const data = response.data;
  console.log(data.user_upsert);
});
```

### Using `UpsertUser`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertUserRef, UpsertUserVariables } from '@dataconnect/generated';

// The `UpsertUser` mutation requires an argument of type `UpsertUserVariables`:
const upsertUserVars: UpsertUserVariables = {
  id: ..., 
  email: ..., 
  nombre: ..., 
  rol: ..., 
};

// Call the `upsertUserRef()` function to get a reference to the mutation.
const ref = upsertUserRef(upsertUserVars);
// Variables can be defined inline as well.
const ref = upsertUserRef({ id: ..., email: ..., nombre: ..., rol: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertUserRef(dataConnect, upsertUserVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_upsert);
});
```

## UpsertLandingPage
You can execute the `UpsertLandingPage` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
upsertLandingPage(vars: UpsertLandingPageVariables): MutationPromise<UpsertLandingPageData, UpsertLandingPageVariables>;

interface UpsertLandingPageRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertLandingPageVariables): MutationRef<UpsertLandingPageData, UpsertLandingPageVariables>;
}
export const upsertLandingPageRef: UpsertLandingPageRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertLandingPage(dc: DataConnect, vars: UpsertLandingPageVariables): MutationPromise<UpsertLandingPageData, UpsertLandingPageVariables>;

interface UpsertLandingPageRef {
  ...
  (dc: DataConnect, vars: UpsertLandingPageVariables): MutationRef<UpsertLandingPageData, UpsertLandingPageVariables>;
}
export const upsertLandingPageRef: UpsertLandingPageRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertLandingPageRef:
```typescript
const name = upsertLandingPageRef.operationName;
console.log(name);
```

### Variables
The `UpsertLandingPage` mutation requires an argument of type `UpsertLandingPageVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
```
### Return Type
Recall that executing the `UpsertLandingPage` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertLandingPageData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertLandingPageData {
  landingPage_upsert: LandingPage_Key;
}
```
### Using `UpsertLandingPage`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertLandingPage, UpsertLandingPageVariables } from '@dataconnect/generated';

// The `UpsertLandingPage` mutation requires an argument of type `UpsertLandingPageVariables`:
const upsertLandingPageVars: UpsertLandingPageVariables = {
  id: ..., 
  descripcionParque: ..., 
  mapaDistribucionJson: ..., 
  mapaMesasJson: ..., 
  mapaEstacionamientoJson: ..., 
  imagenSatelitalUrl: ..., 
  googleMapsUrl: ..., 
  horariosTexto: ..., 
  abiertoAhora: ..., 
  ocupacionTexto: ..., 
  estacionamientoTexto: ..., 
  botonesJson: ..., 
};

// Call the `upsertLandingPage()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertLandingPage(upsertLandingPageVars);
// Variables can be defined inline as well.
const { data } = await upsertLandingPage({ id: ..., descripcionParque: ..., mapaDistribucionJson: ..., mapaMesasJson: ..., mapaEstacionamientoJson: ..., imagenSatelitalUrl: ..., googleMapsUrl: ..., horariosTexto: ..., abiertoAhora: ..., ocupacionTexto: ..., estacionamientoTexto: ..., botonesJson: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertLandingPage(dataConnect, upsertLandingPageVars);

console.log(data.landingPage_upsert);

// Or, you can use the `Promise` API.
upsertLandingPage(upsertLandingPageVars).then((response) => {
  const data = response.data;
  console.log(data.landingPage_upsert);
});
```

### Using `UpsertLandingPage`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertLandingPageRef, UpsertLandingPageVariables } from '@dataconnect/generated';

// The `UpsertLandingPage` mutation requires an argument of type `UpsertLandingPageVariables`:
const upsertLandingPageVars: UpsertLandingPageVariables = {
  id: ..., 
  descripcionParque: ..., 
  mapaDistribucionJson: ..., 
  mapaMesasJson: ..., 
  mapaEstacionamientoJson: ..., 
  imagenSatelitalUrl: ..., 
  googleMapsUrl: ..., 
  horariosTexto: ..., 
  abiertoAhora: ..., 
  ocupacionTexto: ..., 
  estacionamientoTexto: ..., 
  botonesJson: ..., 
};

// Call the `upsertLandingPageRef()` function to get a reference to the mutation.
const ref = upsertLandingPageRef(upsertLandingPageVars);
// Variables can be defined inline as well.
const ref = upsertLandingPageRef({ id: ..., descripcionParque: ..., mapaDistribucionJson: ..., mapaMesasJson: ..., mapaEstacionamientoJson: ..., imagenSatelitalUrl: ..., googleMapsUrl: ..., horariosTexto: ..., abiertoAhora: ..., ocupacionTexto: ..., estacionamientoTexto: ..., botonesJson: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertLandingPageRef(dataConnect, upsertLandingPageVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.landingPage_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.landingPage_upsert);
});
```

## CreateServicio
You can execute the `CreateServicio` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createServicio(vars: CreateServicioVariables): MutationPromise<CreateServicioData, CreateServicioVariables>;

interface CreateServicioRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateServicioVariables): MutationRef<CreateServicioData, CreateServicioVariables>;
}
export const createServicioRef: CreateServicioRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createServicio(dc: DataConnect, vars: CreateServicioVariables): MutationPromise<CreateServicioData, CreateServicioVariables>;

interface CreateServicioRef {
  ...
  (dc: DataConnect, vars: CreateServicioVariables): MutationRef<CreateServicioData, CreateServicioVariables>;
}
export const createServicioRef: CreateServicioRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createServicioRef:
```typescript
const name = createServicioRef.operationName;
console.log(name);
```

### Variables
The `CreateServicio` mutation requires an argument of type `CreateServicioVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateServicioVariables {
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  precio: number;
  orden: number;
  activo: boolean;
}
```
### Return Type
Recall that executing the `CreateServicio` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateServicioData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateServicioData {
  servicio_insert: Servicio_Key;
}
```
### Using `CreateServicio`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createServicio, CreateServicioVariables } from '@dataconnect/generated';

// The `CreateServicio` mutation requires an argument of type `CreateServicioVariables`:
const createServicioVars: CreateServicioVariables = {
  titulo: ..., 
  descripcion: ..., 
  imagenUrl: ..., 
  precio: ..., 
  orden: ..., 
  activo: ..., 
};

// Call the `createServicio()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createServicio(createServicioVars);
// Variables can be defined inline as well.
const { data } = await createServicio({ titulo: ..., descripcion: ..., imagenUrl: ..., precio: ..., orden: ..., activo: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createServicio(dataConnect, createServicioVars);

console.log(data.servicio_insert);

// Or, you can use the `Promise` API.
createServicio(createServicioVars).then((response) => {
  const data = response.data;
  console.log(data.servicio_insert);
});
```

### Using `CreateServicio`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createServicioRef, CreateServicioVariables } from '@dataconnect/generated';

// The `CreateServicio` mutation requires an argument of type `CreateServicioVariables`:
const createServicioVars: CreateServicioVariables = {
  titulo: ..., 
  descripcion: ..., 
  imagenUrl: ..., 
  precio: ..., 
  orden: ..., 
  activo: ..., 
};

// Call the `createServicioRef()` function to get a reference to the mutation.
const ref = createServicioRef(createServicioVars);
// Variables can be defined inline as well.
const ref = createServicioRef({ titulo: ..., descripcion: ..., imagenUrl: ..., precio: ..., orden: ..., activo: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createServicioRef(dataConnect, createServicioVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.servicio_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.servicio_insert);
});
```

## UpdateServicio
You can execute the `UpdateServicio` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateServicio(vars: UpdateServicioVariables): MutationPromise<UpdateServicioData, UpdateServicioVariables>;

interface UpdateServicioRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateServicioVariables): MutationRef<UpdateServicioData, UpdateServicioVariables>;
}
export const updateServicioRef: UpdateServicioRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateServicio(dc: DataConnect, vars: UpdateServicioVariables): MutationPromise<UpdateServicioData, UpdateServicioVariables>;

interface UpdateServicioRef {
  ...
  (dc: DataConnect, vars: UpdateServicioVariables): MutationRef<UpdateServicioData, UpdateServicioVariables>;
}
export const updateServicioRef: UpdateServicioRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateServicioRef:
```typescript
const name = updateServicioRef.operationName;
console.log(name);
```

### Variables
The `UpdateServicio` mutation requires an argument of type `UpdateServicioVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateServicioVariables {
  id: UUIDString;
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  precio: number;
  orden: number;
  activo: boolean;
}
```
### Return Type
Recall that executing the `UpdateServicio` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateServicioData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateServicioData {
  servicio_update?: Servicio_Key | null;
}
```
### Using `UpdateServicio`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateServicio, UpdateServicioVariables } from '@dataconnect/generated';

// The `UpdateServicio` mutation requires an argument of type `UpdateServicioVariables`:
const updateServicioVars: UpdateServicioVariables = {
  id: ..., 
  titulo: ..., 
  descripcion: ..., 
  imagenUrl: ..., 
  precio: ..., 
  orden: ..., 
  activo: ..., 
};

// Call the `updateServicio()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateServicio(updateServicioVars);
// Variables can be defined inline as well.
const { data } = await updateServicio({ id: ..., titulo: ..., descripcion: ..., imagenUrl: ..., precio: ..., orden: ..., activo: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateServicio(dataConnect, updateServicioVars);

console.log(data.servicio_update);

// Or, you can use the `Promise` API.
updateServicio(updateServicioVars).then((response) => {
  const data = response.data;
  console.log(data.servicio_update);
});
```

### Using `UpdateServicio`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateServicioRef, UpdateServicioVariables } from '@dataconnect/generated';

// The `UpdateServicio` mutation requires an argument of type `UpdateServicioVariables`:
const updateServicioVars: UpdateServicioVariables = {
  id: ..., 
  titulo: ..., 
  descripcion: ..., 
  imagenUrl: ..., 
  precio: ..., 
  orden: ..., 
  activo: ..., 
};

// Call the `updateServicioRef()` function to get a reference to the mutation.
const ref = updateServicioRef(updateServicioVars);
// Variables can be defined inline as well.
const ref = updateServicioRef({ id: ..., titulo: ..., descripcion: ..., imagenUrl: ..., precio: ..., orden: ..., activo: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateServicioRef(dataConnect, updateServicioVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.servicio_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.servicio_update);
});
```

## CreateProducto
You can execute the `CreateProducto` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createProducto(vars: CreateProductoVariables): MutationPromise<CreateProductoData, CreateProductoVariables>;

interface CreateProductoRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateProductoVariables): MutationRef<CreateProductoData, CreateProductoVariables>;
}
export const createProductoRef: CreateProductoRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createProducto(dc: DataConnect, vars: CreateProductoVariables): MutationPromise<CreateProductoData, CreateProductoVariables>;

interface CreateProductoRef {
  ...
  (dc: DataConnect, vars: CreateProductoVariables): MutationRef<CreateProductoData, CreateProductoVariables>;
}
export const createProductoRef: CreateProductoRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createProductoRef:
```typescript
const name = createProductoRef.operationName;
console.log(name);
```

### Variables
The `CreateProducto` mutation requires an argument of type `CreateProductoVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateProductoVariables {
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  precio: number;
  stockActual: number;
  reservadoAprox: number;
  activo: boolean;
}
```
### Return Type
Recall that executing the `CreateProducto` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateProductoData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateProductoData {
  producto_insert: Producto_Key;
}
```
### Using `CreateProducto`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createProducto, CreateProductoVariables } from '@dataconnect/generated';

// The `CreateProducto` mutation requires an argument of type `CreateProductoVariables`:
const createProductoVars: CreateProductoVariables = {
  titulo: ..., 
  descripcion: ..., 
  imagenUrl: ..., 
  precio: ..., 
  stockActual: ..., 
  reservadoAprox: ..., 
  activo: ..., 
};

// Call the `createProducto()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createProducto(createProductoVars);
// Variables can be defined inline as well.
const { data } = await createProducto({ titulo: ..., descripcion: ..., imagenUrl: ..., precio: ..., stockActual: ..., reservadoAprox: ..., activo: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createProducto(dataConnect, createProductoVars);

console.log(data.producto_insert);

// Or, you can use the `Promise` API.
createProducto(createProductoVars).then((response) => {
  const data = response.data;
  console.log(data.producto_insert);
});
```

### Using `CreateProducto`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createProductoRef, CreateProductoVariables } from '@dataconnect/generated';

// The `CreateProducto` mutation requires an argument of type `CreateProductoVariables`:
const createProductoVars: CreateProductoVariables = {
  titulo: ..., 
  descripcion: ..., 
  imagenUrl: ..., 
  precio: ..., 
  stockActual: ..., 
  reservadoAprox: ..., 
  activo: ..., 
};

// Call the `createProductoRef()` function to get a reference to the mutation.
const ref = createProductoRef(createProductoVars);
// Variables can be defined inline as well.
const ref = createProductoRef({ titulo: ..., descripcion: ..., imagenUrl: ..., precio: ..., stockActual: ..., reservadoAprox: ..., activo: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createProductoRef(dataConnect, createProductoVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.producto_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.producto_insert);
});
```

## UpdateProducto
You can execute the `UpdateProducto` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateProducto(vars: UpdateProductoVariables): MutationPromise<UpdateProductoData, UpdateProductoVariables>;

interface UpdateProductoRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateProductoVariables): MutationRef<UpdateProductoData, UpdateProductoVariables>;
}
export const updateProductoRef: UpdateProductoRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateProducto(dc: DataConnect, vars: UpdateProductoVariables): MutationPromise<UpdateProductoData, UpdateProductoVariables>;

interface UpdateProductoRef {
  ...
  (dc: DataConnect, vars: UpdateProductoVariables): MutationRef<UpdateProductoData, UpdateProductoVariables>;
}
export const updateProductoRef: UpdateProductoRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateProductoRef:
```typescript
const name = updateProductoRef.operationName;
console.log(name);
```

### Variables
The `UpdateProducto` mutation requires an argument of type `UpdateProductoVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateProductoVariables {
  id: UUIDString;
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  precio: number;
  activo: boolean;
}
```
### Return Type
Recall that executing the `UpdateProducto` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateProductoData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateProductoData {
  producto_update?: Producto_Key | null;
}
```
### Using `UpdateProducto`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateProducto, UpdateProductoVariables } from '@dataconnect/generated';

// The `UpdateProducto` mutation requires an argument of type `UpdateProductoVariables`:
const updateProductoVars: UpdateProductoVariables = {
  id: ..., 
  titulo: ..., 
  descripcion: ..., 
  imagenUrl: ..., 
  precio: ..., 
  activo: ..., 
};

// Call the `updateProducto()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateProducto(updateProductoVars);
// Variables can be defined inline as well.
const { data } = await updateProducto({ id: ..., titulo: ..., descripcion: ..., imagenUrl: ..., precio: ..., activo: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateProducto(dataConnect, updateProductoVars);

console.log(data.producto_update);

// Or, you can use the `Promise` API.
updateProducto(updateProductoVars).then((response) => {
  const data = response.data;
  console.log(data.producto_update);
});
```

### Using `UpdateProducto`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateProductoRef, UpdateProductoVariables } from '@dataconnect/generated';

// The `UpdateProducto` mutation requires an argument of type `UpdateProductoVariables`:
const updateProductoVars: UpdateProductoVariables = {
  id: ..., 
  titulo: ..., 
  descripcion: ..., 
  imagenUrl: ..., 
  precio: ..., 
  activo: ..., 
};

// Call the `updateProductoRef()` function to get a reference to the mutation.
const ref = updateProductoRef(updateProductoVars);
// Variables can be defined inline as well.
const ref = updateProductoRef({ id: ..., titulo: ..., descripcion: ..., imagenUrl: ..., precio: ..., activo: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateProductoRef(dataConnect, updateProductoVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.producto_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.producto_update);
});
```

## UpdateProductoStock
You can execute the `UpdateProductoStock` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateProductoStock(vars: UpdateProductoStockVariables): MutationPromise<UpdateProductoStockData, UpdateProductoStockVariables>;

interface UpdateProductoStockRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateProductoStockVariables): MutationRef<UpdateProductoStockData, UpdateProductoStockVariables>;
}
export const updateProductoStockRef: UpdateProductoStockRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateProductoStock(dc: DataConnect, vars: UpdateProductoStockVariables): MutationPromise<UpdateProductoStockData, UpdateProductoStockVariables>;

interface UpdateProductoStockRef {
  ...
  (dc: DataConnect, vars: UpdateProductoStockVariables): MutationRef<UpdateProductoStockData, UpdateProductoStockVariables>;
}
export const updateProductoStockRef: UpdateProductoStockRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateProductoStockRef:
```typescript
const name = updateProductoStockRef.operationName;
console.log(name);
```

### Variables
The `UpdateProductoStock` mutation requires an argument of type `UpdateProductoStockVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateProductoStockVariables {
  id: UUIDString;
  stockActual: number;
  reservadoAprox: number;
}
```
### Return Type
Recall that executing the `UpdateProductoStock` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateProductoStockData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateProductoStockData {
  producto_update?: Producto_Key | null;
}
```
### Using `UpdateProductoStock`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateProductoStock, UpdateProductoStockVariables } from '@dataconnect/generated';

// The `UpdateProductoStock` mutation requires an argument of type `UpdateProductoStockVariables`:
const updateProductoStockVars: UpdateProductoStockVariables = {
  id: ..., 
  stockActual: ..., 
  reservadoAprox: ..., 
};

// Call the `updateProductoStock()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateProductoStock(updateProductoStockVars);
// Variables can be defined inline as well.
const { data } = await updateProductoStock({ id: ..., stockActual: ..., reservadoAprox: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateProductoStock(dataConnect, updateProductoStockVars);

console.log(data.producto_update);

// Or, you can use the `Promise` API.
updateProductoStock(updateProductoStockVars).then((response) => {
  const data = response.data;
  console.log(data.producto_update);
});
```

### Using `UpdateProductoStock`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateProductoStockRef, UpdateProductoStockVariables } from '@dataconnect/generated';

// The `UpdateProductoStock` mutation requires an argument of type `UpdateProductoStockVariables`:
const updateProductoStockVars: UpdateProductoStockVariables = {
  id: ..., 
  stockActual: ..., 
  reservadoAprox: ..., 
};

// Call the `updateProductoStockRef()` function to get a reference to the mutation.
const ref = updateProductoStockRef(updateProductoStockVars);
// Variables can be defined inline as well.
const ref = updateProductoStockRef({ id: ..., stockActual: ..., reservadoAprox: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateProductoStockRef(dataConnect, updateProductoStockVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.producto_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.producto_update);
});
```

## CreateMovimientoInventario
You can execute the `CreateMovimientoInventario` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createMovimientoInventario(vars: CreateMovimientoInventarioVariables): MutationPromise<CreateMovimientoInventarioData, CreateMovimientoInventarioVariables>;

interface CreateMovimientoInventarioRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMovimientoInventarioVariables): MutationRef<CreateMovimientoInventarioData, CreateMovimientoInventarioVariables>;
}
export const createMovimientoInventarioRef: CreateMovimientoInventarioRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createMovimientoInventario(dc: DataConnect, vars: CreateMovimientoInventarioVariables): MutationPromise<CreateMovimientoInventarioData, CreateMovimientoInventarioVariables>;

interface CreateMovimientoInventarioRef {
  ...
  (dc: DataConnect, vars: CreateMovimientoInventarioVariables): MutationRef<CreateMovimientoInventarioData, CreateMovimientoInventarioVariables>;
}
export const createMovimientoInventarioRef: CreateMovimientoInventarioRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createMovimientoInventarioRef:
```typescript
const name = createMovimientoInventarioRef.operationName;
console.log(name);
```

### Variables
The `CreateMovimientoInventario` mutation requires an argument of type `CreateMovimientoInventarioVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateMovimientoInventarioVariables {
  productoId: UUIDString;
  tipo: string;
  cantidad: number;
  nota: string;
}
```
### Return Type
Recall that executing the `CreateMovimientoInventario` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateMovimientoInventarioData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateMovimientoInventarioData {
  movimientoInventario_insert: MovimientoInventario_Key;
}
```
### Using `CreateMovimientoInventario`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createMovimientoInventario, CreateMovimientoInventarioVariables } from '@dataconnect/generated';

// The `CreateMovimientoInventario` mutation requires an argument of type `CreateMovimientoInventarioVariables`:
const createMovimientoInventarioVars: CreateMovimientoInventarioVariables = {
  productoId: ..., 
  tipo: ..., 
  cantidad: ..., 
  nota: ..., 
};

// Call the `createMovimientoInventario()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createMovimientoInventario(createMovimientoInventarioVars);
// Variables can be defined inline as well.
const { data } = await createMovimientoInventario({ productoId: ..., tipo: ..., cantidad: ..., nota: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createMovimientoInventario(dataConnect, createMovimientoInventarioVars);

console.log(data.movimientoInventario_insert);

// Or, you can use the `Promise` API.
createMovimientoInventario(createMovimientoInventarioVars).then((response) => {
  const data = response.data;
  console.log(data.movimientoInventario_insert);
});
```

### Using `CreateMovimientoInventario`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createMovimientoInventarioRef, CreateMovimientoInventarioVariables } from '@dataconnect/generated';

// The `CreateMovimientoInventario` mutation requires an argument of type `CreateMovimientoInventarioVariables`:
const createMovimientoInventarioVars: CreateMovimientoInventarioVariables = {
  productoId: ..., 
  tipo: ..., 
  cantidad: ..., 
  nota: ..., 
};

// Call the `createMovimientoInventarioRef()` function to get a reference to the mutation.
const ref = createMovimientoInventarioRef(createMovimientoInventarioVars);
// Variables can be defined inline as well.
const ref = createMovimientoInventarioRef({ productoId: ..., tipo: ..., cantidad: ..., nota: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createMovimientoInventarioRef(dataConnect, createMovimientoInventarioVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.movimientoInventario_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.movimientoInventario_insert);
});
```

## CreateMesaReserva
You can execute the `CreateMesaReserva` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createMesaReserva(vars: CreateMesaReservaVariables): MutationPromise<CreateMesaReservaData, CreateMesaReservaVariables>;

interface CreateMesaReservaRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMesaReservaVariables): MutationRef<CreateMesaReservaData, CreateMesaReservaVariables>;
}
export const createMesaReservaRef: CreateMesaReservaRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createMesaReserva(dc: DataConnect, vars: CreateMesaReservaVariables): MutationPromise<CreateMesaReservaData, CreateMesaReservaVariables>;

interface CreateMesaReservaRef {
  ...
  (dc: DataConnect, vars: CreateMesaReservaVariables): MutationRef<CreateMesaReservaData, CreateMesaReservaVariables>;
}
export const createMesaReservaRef: CreateMesaReservaRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createMesaReservaRef:
```typescript
const name = createMesaReservaRef.operationName;
console.log(name);
```

### Variables
The `CreateMesaReserva` mutation requires an argument of type `CreateMesaReservaVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateMesaReservaVariables {
  fechaDia: string;
  mapItemId: string;
}
```
### Return Type
Recall that executing the `CreateMesaReserva` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateMesaReservaData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateMesaReservaData {
  mesaReserva_insert: MesaReserva_Key;
}
```
### Using `CreateMesaReserva`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createMesaReserva, CreateMesaReservaVariables } from '@dataconnect/generated';

// The `CreateMesaReserva` mutation requires an argument of type `CreateMesaReservaVariables`:
const createMesaReservaVars: CreateMesaReservaVariables = {
  fechaDia: ..., 
  mapItemId: ..., 
};

// Call the `createMesaReserva()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createMesaReserva(createMesaReservaVars);
// Variables can be defined inline as well.
const { data } = await createMesaReserva({ fechaDia: ..., mapItemId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createMesaReserva(dataConnect, createMesaReservaVars);

console.log(data.mesaReserva_insert);

// Or, you can use the `Promise` API.
createMesaReserva(createMesaReservaVars).then((response) => {
  const data = response.data;
  console.log(data.mesaReserva_insert);
});
```

### Using `CreateMesaReserva`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createMesaReservaRef, CreateMesaReservaVariables } from '@dataconnect/generated';

// The `CreateMesaReserva` mutation requires an argument of type `CreateMesaReservaVariables`:
const createMesaReservaVars: CreateMesaReservaVariables = {
  fechaDia: ..., 
  mapItemId: ..., 
};

// Call the `createMesaReservaRef()` function to get a reference to the mutation.
const ref = createMesaReservaRef(createMesaReservaVars);
// Variables can be defined inline as well.
const ref = createMesaReservaRef({ fechaDia: ..., mapItemId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createMesaReservaRef(dataConnect, createMesaReservaVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.mesaReserva_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.mesaReserva_insert);
});
```

## CancelarMesaReserva
You can execute the `CancelarMesaReserva` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
cancelarMesaReserva(vars: CancelarMesaReservaVariables): MutationPromise<CancelarMesaReservaData, CancelarMesaReservaVariables>;

interface CancelarMesaReservaRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CancelarMesaReservaVariables): MutationRef<CancelarMesaReservaData, CancelarMesaReservaVariables>;
}
export const cancelarMesaReservaRef: CancelarMesaReservaRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
cancelarMesaReserva(dc: DataConnect, vars: CancelarMesaReservaVariables): MutationPromise<CancelarMesaReservaData, CancelarMesaReservaVariables>;

interface CancelarMesaReservaRef {
  ...
  (dc: DataConnect, vars: CancelarMesaReservaVariables): MutationRef<CancelarMesaReservaData, CancelarMesaReservaVariables>;
}
export const cancelarMesaReservaRef: CancelarMesaReservaRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the cancelarMesaReservaRef:
```typescript
const name = cancelarMesaReservaRef.operationName;
console.log(name);
```

### Variables
The `CancelarMesaReserva` mutation requires an argument of type `CancelarMesaReservaVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CancelarMesaReservaVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `CancelarMesaReserva` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CancelarMesaReservaData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CancelarMesaReservaData {
  mesaReserva_update?: MesaReserva_Key | null;
}
```
### Using `CancelarMesaReserva`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, cancelarMesaReserva, CancelarMesaReservaVariables } from '@dataconnect/generated';

// The `CancelarMesaReserva` mutation requires an argument of type `CancelarMesaReservaVariables`:
const cancelarMesaReservaVars: CancelarMesaReservaVariables = {
  id: ..., 
};

// Call the `cancelarMesaReserva()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await cancelarMesaReserva(cancelarMesaReservaVars);
// Variables can be defined inline as well.
const { data } = await cancelarMesaReserva({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await cancelarMesaReserva(dataConnect, cancelarMesaReservaVars);

console.log(data.mesaReserva_update);

// Or, you can use the `Promise` API.
cancelarMesaReserva(cancelarMesaReservaVars).then((response) => {
  const data = response.data;
  console.log(data.mesaReserva_update);
});
```

### Using `CancelarMesaReserva`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, cancelarMesaReservaRef, CancelarMesaReservaVariables } from '@dataconnect/generated';

// The `CancelarMesaReserva` mutation requires an argument of type `CancelarMesaReservaVariables`:
const cancelarMesaReservaVars: CancelarMesaReservaVariables = {
  id: ..., 
};

// Call the `cancelarMesaReservaRef()` function to get a reference to the mutation.
const ref = cancelarMesaReservaRef(cancelarMesaReservaVars);
// Variables can be defined inline as well.
const ref = cancelarMesaReservaRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = cancelarMesaReservaRef(dataConnect, cancelarMesaReservaVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.mesaReserva_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.mesaReserva_update);
});
```

## DeleteServicio
You can execute the `DeleteServicio` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteServicio(vars: DeleteServicioVariables): MutationPromise<DeleteServicioData, DeleteServicioVariables>;

interface DeleteServicioRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteServicioVariables): MutationRef<DeleteServicioData, DeleteServicioVariables>;
}
export const deleteServicioRef: DeleteServicioRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteServicio(dc: DataConnect, vars: DeleteServicioVariables): MutationPromise<DeleteServicioData, DeleteServicioVariables>;

interface DeleteServicioRef {
  ...
  (dc: DataConnect, vars: DeleteServicioVariables): MutationRef<DeleteServicioData, DeleteServicioVariables>;
}
export const deleteServicioRef: DeleteServicioRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteServicioRef:
```typescript
const name = deleteServicioRef.operationName;
console.log(name);
```

### Variables
The `DeleteServicio` mutation requires an argument of type `DeleteServicioVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteServicioVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeleteServicio` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteServicioData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteServicioData {
  servicio_delete?: Servicio_Key | null;
}
```
### Using `DeleteServicio`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteServicio, DeleteServicioVariables } from '@dataconnect/generated';

// The `DeleteServicio` mutation requires an argument of type `DeleteServicioVariables`:
const deleteServicioVars: DeleteServicioVariables = {
  id: ..., 
};

// Call the `deleteServicio()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteServicio(deleteServicioVars);
// Variables can be defined inline as well.
const { data } = await deleteServicio({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteServicio(dataConnect, deleteServicioVars);

console.log(data.servicio_delete);

// Or, you can use the `Promise` API.
deleteServicio(deleteServicioVars).then((response) => {
  const data = response.data;
  console.log(data.servicio_delete);
});
```

### Using `DeleteServicio`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteServicioRef, DeleteServicioVariables } from '@dataconnect/generated';

// The `DeleteServicio` mutation requires an argument of type `DeleteServicioVariables`:
const deleteServicioVars: DeleteServicioVariables = {
  id: ..., 
};

// Call the `deleteServicioRef()` function to get a reference to the mutation.
const ref = deleteServicioRef(deleteServicioVars);
// Variables can be defined inline as well.
const ref = deleteServicioRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteServicioRef(dataConnect, deleteServicioVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.servicio_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.servicio_delete);
});
```

## DeleteProducto
You can execute the `DeleteProducto` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteProducto(vars: DeleteProductoVariables): MutationPromise<DeleteProductoData, DeleteProductoVariables>;

interface DeleteProductoRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteProductoVariables): MutationRef<DeleteProductoData, DeleteProductoVariables>;
}
export const deleteProductoRef: DeleteProductoRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteProducto(dc: DataConnect, vars: DeleteProductoVariables): MutationPromise<DeleteProductoData, DeleteProductoVariables>;

interface DeleteProductoRef {
  ...
  (dc: DataConnect, vars: DeleteProductoVariables): MutationRef<DeleteProductoData, DeleteProductoVariables>;
}
export const deleteProductoRef: DeleteProductoRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteProductoRef:
```typescript
const name = deleteProductoRef.operationName;
console.log(name);
```

### Variables
The `DeleteProducto` mutation requires an argument of type `DeleteProductoVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteProductoVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeleteProducto` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteProductoData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteProductoData {
  producto_delete?: Producto_Key | null;
}
```
### Using `DeleteProducto`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteProducto, DeleteProductoVariables } from '@dataconnect/generated';

// The `DeleteProducto` mutation requires an argument of type `DeleteProductoVariables`:
const deleteProductoVars: DeleteProductoVariables = {
  id: ..., 
};

// Call the `deleteProducto()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteProducto(deleteProductoVars);
// Variables can be defined inline as well.
const { data } = await deleteProducto({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteProducto(dataConnect, deleteProductoVars);

console.log(data.producto_delete);

// Or, you can use the `Promise` API.
deleteProducto(deleteProductoVars).then((response) => {
  const data = response.data;
  console.log(data.producto_delete);
});
```

### Using `DeleteProducto`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteProductoRef, DeleteProductoVariables } from '@dataconnect/generated';

// The `DeleteProducto` mutation requires an argument of type `DeleteProductoVariables`:
const deleteProductoVars: DeleteProductoVariables = {
  id: ..., 
};

// Call the `deleteProductoRef()` function to get a reference to the mutation.
const ref = deleteProductoRef(deleteProductoVars);
// Variables can be defined inline as well.
const ref = deleteProductoRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteProductoRef(dataConnect, deleteProductoVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.producto_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.producto_delete);
});
```

## UpdateMesaReservaEstado
You can execute the `UpdateMesaReservaEstado` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateMesaReservaEstado(vars: UpdateMesaReservaEstadoVariables): MutationPromise<UpdateMesaReservaEstadoData, UpdateMesaReservaEstadoVariables>;

interface UpdateMesaReservaEstadoRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateMesaReservaEstadoVariables): MutationRef<UpdateMesaReservaEstadoData, UpdateMesaReservaEstadoVariables>;
}
export const updateMesaReservaEstadoRef: UpdateMesaReservaEstadoRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateMesaReservaEstado(dc: DataConnect, vars: UpdateMesaReservaEstadoVariables): MutationPromise<UpdateMesaReservaEstadoData, UpdateMesaReservaEstadoVariables>;

interface UpdateMesaReservaEstadoRef {
  ...
  (dc: DataConnect, vars: UpdateMesaReservaEstadoVariables): MutationRef<UpdateMesaReservaEstadoData, UpdateMesaReservaEstadoVariables>;
}
export const updateMesaReservaEstadoRef: UpdateMesaReservaEstadoRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateMesaReservaEstadoRef:
```typescript
const name = updateMesaReservaEstadoRef.operationName;
console.log(name);
```

### Variables
The `UpdateMesaReservaEstado` mutation requires an argument of type `UpdateMesaReservaEstadoVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateMesaReservaEstadoVariables {
  id: UUIDString;
  estado: string;
}
```
### Return Type
Recall that executing the `UpdateMesaReservaEstado` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateMesaReservaEstadoData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateMesaReservaEstadoData {
  mesaReserva_update?: MesaReserva_Key | null;
}
```
### Using `UpdateMesaReservaEstado`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateMesaReservaEstado, UpdateMesaReservaEstadoVariables } from '@dataconnect/generated';

// The `UpdateMesaReservaEstado` mutation requires an argument of type `UpdateMesaReservaEstadoVariables`:
const updateMesaReservaEstadoVars: UpdateMesaReservaEstadoVariables = {
  id: ..., 
  estado: ..., 
};

// Call the `updateMesaReservaEstado()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateMesaReservaEstado(updateMesaReservaEstadoVars);
// Variables can be defined inline as well.
const { data } = await updateMesaReservaEstado({ id: ..., estado: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateMesaReservaEstado(dataConnect, updateMesaReservaEstadoVars);

console.log(data.mesaReserva_update);

// Or, you can use the `Promise` API.
updateMesaReservaEstado(updateMesaReservaEstadoVars).then((response) => {
  const data = response.data;
  console.log(data.mesaReserva_update);
});
```

### Using `UpdateMesaReservaEstado`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateMesaReservaEstadoRef, UpdateMesaReservaEstadoVariables } from '@dataconnect/generated';

// The `UpdateMesaReservaEstado` mutation requires an argument of type `UpdateMesaReservaEstadoVariables`:
const updateMesaReservaEstadoVars: UpdateMesaReservaEstadoVariables = {
  id: ..., 
  estado: ..., 
};

// Call the `updateMesaReservaEstadoRef()` function to get a reference to the mutation.
const ref = updateMesaReservaEstadoRef(updateMesaReservaEstadoVars);
// Variables can be defined inline as well.
const ref = updateMesaReservaEstadoRef({ id: ..., estado: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateMesaReservaEstadoRef(dataConnect, updateMesaReservaEstadoVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.mesaReserva_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.mesaReserva_update);
});
```

## VincularTicketMesaReserva
You can execute the `VincularTicketMesaReserva` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
vincularTicketMesaReserva(vars: VincularTicketMesaReservaVariables): MutationPromise<VincularTicketMesaReservaData, VincularTicketMesaReservaVariables>;

interface VincularTicketMesaReservaRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: VincularTicketMesaReservaVariables): MutationRef<VincularTicketMesaReservaData, VincularTicketMesaReservaVariables>;
}
export const vincularTicketMesaReservaRef: VincularTicketMesaReservaRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
vincularTicketMesaReserva(dc: DataConnect, vars: VincularTicketMesaReservaVariables): MutationPromise<VincularTicketMesaReservaData, VincularTicketMesaReservaVariables>;

interface VincularTicketMesaReservaRef {
  ...
  (dc: DataConnect, vars: VincularTicketMesaReservaVariables): MutationRef<VincularTicketMesaReservaData, VincularTicketMesaReservaVariables>;
}
export const vincularTicketMesaReservaRef: VincularTicketMesaReservaRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the vincularTicketMesaReservaRef:
```typescript
const name = vincularTicketMesaReservaRef.operationName;
console.log(name);
```

### Variables
The `VincularTicketMesaReserva` mutation requires an argument of type `VincularTicketMesaReservaVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface VincularTicketMesaReservaVariables {
  id: UUIDString;
  ticketId: UUIDString;
}
```
### Return Type
Recall that executing the `VincularTicketMesaReserva` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `VincularTicketMesaReservaData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface VincularTicketMesaReservaData {
  mesaReserva_update?: MesaReserva_Key | null;
}
```
### Using `VincularTicketMesaReserva`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, vincularTicketMesaReserva, VincularTicketMesaReservaVariables } from '@dataconnect/generated';

// The `VincularTicketMesaReserva` mutation requires an argument of type `VincularTicketMesaReservaVariables`:
const vincularTicketMesaReservaVars: VincularTicketMesaReservaVariables = {
  id: ..., 
  ticketId: ..., 
};

// Call the `vincularTicketMesaReserva()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await vincularTicketMesaReserva(vincularTicketMesaReservaVars);
// Variables can be defined inline as well.
const { data } = await vincularTicketMesaReserva({ id: ..., ticketId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await vincularTicketMesaReserva(dataConnect, vincularTicketMesaReservaVars);

console.log(data.mesaReserva_update);

// Or, you can use the `Promise` API.
vincularTicketMesaReserva(vincularTicketMesaReservaVars).then((response) => {
  const data = response.data;
  console.log(data.mesaReserva_update);
});
```

### Using `VincularTicketMesaReserva`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, vincularTicketMesaReservaRef, VincularTicketMesaReservaVariables } from '@dataconnect/generated';

// The `VincularTicketMesaReserva` mutation requires an argument of type `VincularTicketMesaReservaVariables`:
const vincularTicketMesaReservaVars: VincularTicketMesaReservaVariables = {
  id: ..., 
  ticketId: ..., 
};

// Call the `vincularTicketMesaReservaRef()` function to get a reference to the mutation.
const ref = vincularTicketMesaReservaRef(vincularTicketMesaReservaVars);
// Variables can be defined inline as well.
const ref = vincularTicketMesaReservaRef({ id: ..., ticketId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = vincularTicketMesaReservaRef(dataConnect, vincularTicketMesaReservaVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.mesaReserva_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.mesaReserva_update);
});
```

