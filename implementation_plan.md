# Plan de Implementación: Migración a Firebase Data Connect (SQL)

De acuerdo a tus instrucciones, para evitar mezclar datos con la otra aplicación del proyecto `mex-mapa-bjx` (que ya usa Firestore), migraremos la arquitectura de la base de datos del Balneario a **Firebase Data Connect** (basado en Google Cloud SQL - PostgreSQL).

## 1. Nuevo Modelo de Datos (Esquema GraphQL)

En lugar de colecciones NoSQL de Firestore, usaremos el archivo `dataconnect/schema/schema.gql` para definir de manera estricta nuestras tablas SQL:

```graphql
# Precios base del balneario
type Configuracion @table {
  id: String!
  precioAdulto: Float!
  precioNino: Float!
  precioMayor: Float!
}

# Paquetes especiales creados por el admin
type Paquete @table {
  id: UUID! @default(expr: "uuidV4()")
  nombre: String!
  descripcion: String!
  precioBase: Float!
  incluyePersonas: Int!
  activo: Boolean!
}

# Descuentos promocionales
type Descuento @table {
  codigo: String!
  descuento: Float!
  tipo: String! # "monto" o "porcentaje"
  usosRestantes: Int!
}

# Reserva / Ticket Principal
type Ticket @table {
  id: UUID! @default(expr: "uuidV4()")
  clienteNombre: String!
  clienteEmail: String!
  metodoPago: String! # "online" o "taquilla"
  estadoPago: String! # "pagado" o "pendiente"
  estadoTicket: String! # "valido", "escaneado", "cancelado"
  precioTotal: Float!
  fechaCreacion: Timestamp! @default(expr: "request.time")
  fechaEscaneo: Timestamp
}
```

## 2. Refactorización del Código JavaScript

Al cambiar de Firestore a Data Connect, debemos reemplazar las importaciones y lógica de Firebase en nuestras vistas:

### En `Checkout.js`
- **[ELIMINAR]** `import { collection, addDoc } from 'firebase/firestore'`
- **[NUEVO]** Usaremos los Mutadores (Mutations) generados automáticamente por el SDK de Data Connect (`createTicket(...)`) para insertar la compra en la tabla SQL.

### En `Escaner.js`
- **[ELIMINAR]** `getDoc(docRef)` y `updateDoc(...)`
- **[NUEVO]** Usaremos Consultas (Queries) generadas (`getTicketById(...)`) para verificar el estado, y Mutadores (`updateTicketStatus(...)`) para marcarlo como "escaneado".

### En `AdminDashboard.js`
- **[ELIMINAR]** `getDocs(query(collection(...)))`
- **[NUEVO]** Usaremos la consulta `listRecentTickets()` para poblar la tabla.

## 3. Generación del SDK y Despliegue

Data Connect genera un SDK tipado en JavaScript de forma automática.
1. Definiremos las consultas (Queries) en `dataconnect/example/queries.gql`.
2. Definiremos las mutaciones (Insert/Update) en `dataconnect/example/mutations.gql`.
3. Ejecutaremos `firebase dataconnect:sdk:generate` para crear las funciones que usaremos en tu frontend.
4. Finalizaremos el despliegue a la nube ejecutando `firebase deploy --only dataconnect`.

---

## > [!IMPORTANT]
## Preguntas Abiertas para el Usuario

1. **Relación de Usuarios:** ¿Vas a querer que los `Tickets` se relacionen formalmente con la tabla de usuarios autenticados de Firebase Auth, o prefieres mantenerlo desacoplado por ahora (solo guardando el Nombre y Email como cadenas de texto)? con firebase auth si
2. **Generación Local:** Data Connect utiliza un SDK generado localmente. ¿Estás de acuerdo con que sobreescriba los archivos `Checkout.js`, `Escaner.js` y `AdminDashboard.js` con las nuevas funciones SQL? si

**Si estás de acuerdo con esta migración, aprueba este plan y comenzaré a generar los esquemas SQL y a refactorizar el código.**
