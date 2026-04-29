# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createAnonymousTicket, createUserTicket, updateTicketStatus, createPaquete, upsertUser, upsertLandingPage, createServicio, updateServicio, getTicketById, listRecentTickets } from '@dataconnect/generated';


// Operation CreateAnonymousTicket:  For variables, look at type CreateAnonymousTicketVars in ../index.d.ts
const { data } = await CreateAnonymousTicket(dataConnect, createAnonymousTicketVars);

// Operation CreateUserTicket:  For variables, look at type CreateUserTicketVars in ../index.d.ts
const { data } = await CreateUserTicket(dataConnect, createUserTicketVars);

// Operation UpdateTicketStatus:  For variables, look at type UpdateTicketStatusVars in ../index.d.ts
const { data } = await UpdateTicketStatus(dataConnect, updateTicketStatusVars);

// Operation CreatePaquete:  For variables, look at type CreatePaqueteVars in ../index.d.ts
const { data } = await CreatePaquete(dataConnect, createPaqueteVars);

// Operation UpsertUser:  For variables, look at type UpsertUserVars in ../index.d.ts
const { data } = await UpsertUser(dataConnect, upsertUserVars);

// Operation UpsertLandingPage:  For variables, look at type UpsertLandingPageVars in ../index.d.ts
const { data } = await UpsertLandingPage(dataConnect, upsertLandingPageVars);

// Operation CreateServicio:  For variables, look at type CreateServicioVars in ../index.d.ts
const { data } = await CreateServicio(dataConnect, createServicioVars);

// Operation UpdateServicio:  For variables, look at type UpdateServicioVars in ../index.d.ts
const { data } = await UpdateServicio(dataConnect, updateServicioVars);

// Operation GetTicketById:  For variables, look at type GetTicketByIdVars in ../index.d.ts
const { data } = await GetTicketById(dataConnect, getTicketByIdVars);

// Operation ListRecentTickets: 
const { data } = await ListRecentTickets(dataConnect);


```