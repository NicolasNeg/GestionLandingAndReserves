# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { getTicketById, listRecentTickets, getUserProfile, listUserTickets, listPaquetes, getLandingPage, listServiciosLanding, listServiciosAdmin, listProductosAdmin, listProductosPublic } from '@dataconnect/generated';


// Operation GetTicketById:  For variables, look at type GetTicketByIdVars in ../index.d.ts
const { data } = await GetTicketById(dataConnect, getTicketByIdVars);

// Operation ListRecentTickets: 
const { data } = await ListRecentTickets(dataConnect);

// Operation GetUserProfile:  For variables, look at type GetUserProfileVars in ../index.d.ts
const { data } = await GetUserProfile(dataConnect, getUserProfileVars);

// Operation ListUserTickets:  For variables, look at type ListUserTicketsVars in ../index.d.ts
const { data } = await ListUserTickets(dataConnect, listUserTicketsVars);

// Operation ListPaquetes: 
const { data } = await ListPaquetes(dataConnect);

// Operation GetLandingPage:  For variables, look at type GetLandingPageVars in ../index.d.ts
const { data } = await GetLandingPage(dataConnect, getLandingPageVars);

// Operation ListServiciosLanding: 
const { data } = await ListServiciosLanding(dataConnect);

// Operation ListServiciosAdmin: 
const { data } = await ListServiciosAdmin(dataConnect);

// Operation ListProductosAdmin: 
const { data } = await ListProductosAdmin(dataConnect);

// Operation ListProductosPublic: 
const { data } = await ListProductosPublic(dataConnect);


```