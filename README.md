# TodoStock S.A. — Backend (DSWB)

Sistema de gestion comercial mayorista con autenticacion JWT, ciclo completo de ordenes de compra/venta, inventario por lotes con seleccion FEFO/FIFO, y panel de calidad/trazabilidad.

---

## Tabla de Contenidos

- [Requisitos](#requisitos)
- [Instalacion](#instalacion)
- [Configuracion](#configuracion)
- [Scripts Disponibles](#scripts-disponibles)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Arquitectura](#arquitectura)
- [Modulos](#modulos)
- [API Endpoints](#api-endpoints)
- [Flujos de Negocio](#flujos-de-negocio)
- [Testing](#testing)
- [QA Dashboard](#qa-dashboard)

---

## Requisitos

| Herramienta | Version |
|-------------|---------|
| Node.js | 18+ |
| MongoDB | 6+ |
| npm | 9+ |

---

## Instalacion

```bash
git clone <repo-url>
cd DSWB---Distribuidora-Mayorista-TodoStock-S.A.
npm install
```

---

## Configuracion

Crear un archivo `.env` en la raiz del proyecto con las siguientes variables:

| Variable | Descripcion | Valor por defecto |
|----------|-------------|-------------------|
| `MONGO_URI` | URI de conexion a MongoDB | `mongodb://localhost:27017/todostock` |
| `JWT_SECRET` | Secreto para firmar tokens JWT | — |
| `PORT` | Puerto del servidor HTTP | `3000` |

Ejemplo:

```env
MONGO_URI=mongodb://localhost:27017/todostock
JWT_SECRET=mi-secreto-super-seguro
PORT=3000
```

---

## Scripts Disponibles

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Inicia servidor en modo desarrollo con recarga automatica (nodemon + tsx) |
| `npm run build` | Compila TypeScript a JavaScript en `dist/` |
| `npm start` | Ejecuta el servidor compilado en produccion |
| `npm run migrate` | Migra datos desde archivos JSON a MongoDB |
| `npm run seed:catalog` | Pobla el catalogo con proveedores y productos de ejemplo |
| `npm test` | Ejecuta tests unitarios (Vitest) |
| `npm run test:watch` | Tests unitarios en modo watch |
| `npm run test:coverage` | Tests unitarios con reporte de cobertura |
| `npm run test:e2e` | Tests end-to-end (Playwright con navegador visible) |
| `npm run dashboard` | Genera panel de calidad QA en `qa-dashboard/` |

---

## Estructura del Proyecto

```
├── src/
│   ├── core/                          # Capa transversal
│   │   ├── database/connection.ts     # Conexion a MongoDB (Mongoose)
│   │   ├── middleware/errorHandler.ts # Manejador global de errores
│   │   └── realtime/socketServer.ts   # Servidor WebSocket (Socket.io)
│   ├── modules/                       # Modulos de negocio (Arquitectura Hexagonal)
│   │   ├── auth/                      # Autenticacion y autorizacion
│   │   ├── business-partner/          # Clientes y proveedores
│   │   ├── inventory/                 # Gestion de stock por lotes
│   │   ├── orders/                    # Ordenes de compra y venta
│   │   ├── products/                  # Catalogo de productos
│   │   └── transactions/              # Transacciones financieras
│   ├── server.ts                      # Entry point
│   └── views/                         # Templates Pug
├── e2e/                               # Tests end-to-end (Playwright)
├── scripts/                           # Scripts de migracion y seed
├── qa-dashboard/                      # Panel QA generado (gitignored)
├── .qa/                               # Resultados de tests (gitignored)
├── vitest.config.ts                   # Configuracion de Vitest
└── playwright.config.ts               # Configuracion de Playwright
```

---

## Arquitectura

El proyecto sigue **Arquitectura Hexagonal** (Clean Architecture) con tres capas por modulo:

| Capa | Ruta | Responsabilidad |
|------|------|-----------------|
| `domain/` | `src/modules/<modulo>/domain/` | Entidades, interfaces de repositorio, tipos y validadores |
| `application/` | `src/modules/<modulo>/application/` | Casos de uso (use-cases) con logica de negocio pura |
| `infrastructure/` | `src/modules/<modulo>/infrastructure/` | Implementaciones concretas (Mongoose, rutas Express) |

### Roles del Sistema

| Rol | Acceso |
|-----|--------|
| `ADMIN` | Todas las operaciones |
| `COMMERCIAL` | Clientes, proveedores, productos, ordenes |
| `INVENTORY` | Inventario, recepcion y auditoria de ordenes |
| `FINANCE` | Transacciones, verificacion presupuesto/cobros |
| `VENDOR` | Sus productos y datos propios |
| `CLIENT` | Sus datos y ordenes de compra |

---

## Modulos

### Auth — Autenticacion y Autorizacion

- Login con JWT (1 hora de expiracion)
- Middleware `authenticate`: extrae JWT del header `Authorization: Bearer` o cookie `token`
- Middleware `authorizeRoles(allowedRoles[])`: restringe endpoints por rol
- Redireccion por rol post-login

### Business Partner — Clientes y Proveedores

Unifica clientes (`/api/clients`) y proveedores (`/api/vendors`) en una misma entidad con tipo discriminado (`CLIENT`, `VENDOR` o ambos). Incluye validacion de CUIT (11 digitos con sanitizacion) y baja logica con reactivacion.

### Products — Catalogo de Productos

Productos asociados a un proveedor (por CUIT) con precio de venta al publico y precio por proveedor. Categorizados y trazables por usuario creador/actualizador.

### Orders — Ordenes de Compra y Venta

El modulo mas complejo con 13 casos de uso. Define dos tipos de orden con ciclos de vida independientes:

- **Purchase**: `TO_VERIFY_BUDGET -> PENDING_BUDGET -> TO_CONFIRM -> CONFIRMED -> RECEIVED -> AUDITED -> CANCELLED`
- **Sale**: `TO_VERIFY_COLLECTION -> PENDING_PAYMENT -> PENDING_ASSEMBLY -> DISPATCHING -> DELIVERED -> CANCELLED`

Cada transicion de estado dispara validaciones de negocio y genera las transacciones financieras correspondientes.

### Inventory — Gestion de Stock por Lotes

Inventario manejado por lotes con dos estrategias de seleccion:

- **FEFO** (First Expiry, First Out): prioriza lotes que vencen primero
- **FIFO** (First In, First Out): prioriza lotes mas antiguos

Cada lote registra stock total, stock comprometido (engaged) y fecha de vencimiento.

### Transactions — Transacciones Financieras

Transacciones de tipo `PAYMENT` (pago a proveedor) y `COLLECTION` (cobro a cliente), con ciclo `TO_VERIFY -> VERIFIED -> COMPLETED -> CANCELLED`.

---

## API Endpoints

### Autenticacion

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/` | No | Pagina de login |
| POST | `/api/auth/login` | No | Login (JSON o form), setea cookie |
| POST | `/api/auth/logout` | No | Limpia cookie de sesion |

### Clientes (`/api/clients`)

| Metodo | Ruta | Roles | Descripcion |
|--------|------|-------|-------------|
| GET | `/` | Todos | Listar clientes |
| GET | `/new` | Todos | Formulario de alta |
| POST | `/` | ADMIN, COMMERCIAL, CLIENT | Crear cliente |
| GET | `/:cuit` | Todos | Detalle por CUIT |
| GET | `/:cuit/edit` | Todos | Formulario de edicion |
| PUT/POST | `/:cuit/edit` | ADMIN, COMMERCIAL, CLIENT | Actualizar |
| DELETE/PATCH | `/:cuit/deactivate` | ADMIN, COMMERCIAL | Baja logica |
| PATCH | `/:cuit/activate` | ADMIN, COMMERCIAL | Reactivar |

### Proveedores (`/api/vendors`)

Misma estructura que clientes pero roles: ADMIN, COMMERCIAL, VENDOR.

### Productos (`/api/products`)

| Metodo | Ruta | Roles | Descripcion |
|--------|------|-------|-------------|
| GET | `/` | Todos | Listar productos |
| GET | `/new` | Todos | Formulario de alta |
| POST | `/` | ADMIN, COMMERCIAL, VENDOR | Crear producto |
| GET | `/:vendor_cuit/:name/edit` | Todos | Formulario de edicion |
| POST | `/:vendor_cuit/:name/edit` | ADMIN, COMMERCIAL, VENDOR | Actualizar |

### Ordenes (`/api/orders`)

**Consultas:**

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/` | Listar (filtro `?type=PURCHASE` o `?type=SALE`) |
| GET | `/:id` | Detalle |

**Compra:**

| Metodo | Ruta | Accion |
|--------|------|--------|
| POST | `/purchase` | Crear orden de compra |
| POST/PATCH | `/purchase/:id/verify-budget` | Verificar presupuesto (FINANCE) |
| POST/PATCH | `/purchase/:id/confirm` | Confirmar (COMMERCIAL) |
| POST/PATCH | `/purchase/:id/receive` | Recibir mercaderia (INVENTORY) |
| POST | `/purchase/:id/audit` | Auditar y crear lotes (INVENTORY) |
| POST/PATCH | `/purchase/:id/cancel` | Cancelar |

**Venta:**

| Metodo | Ruta | Accion |
|--------|------|--------|
| POST | `/sale` | Crear orden de venta |
| POST/PATCH | `/sale/:id/confirm-payment` | Confirmar cobro (FINANCE) |
| POST/PATCH | `/sale/:id/dispatch` | Despachar (INVENTORY) |
| POST/PATCH | `/sale/:id/deliver` | Marcar entregado (ADMIN/INVENTORY) |
| POST/PATCH | `/sale/:id/cancel` | Cancelar |

### Inventario (`/api/inventory`)

| Metodo | Ruta | Roles | Descripcion |
|--------|------|-------|-------------|
| GET | `/` | ADMIN, INVENTORY | Dashboard con tabs (compra/venta/stock) |

### Transacciones (`/api/transactions`)

| Metodo | Ruta | Roles | Descripcion |
|--------|------|-------|-------------|
| GET | `/` | ADMIN, FINANCE | Listar transacciones |
| GET | `/:id` | ADMIN, FINANCE | Detalle |
| POST/PATCH | `/:id/complete` | ADMIN, FINANCE | Completar |
| POST/PATCH | `/:id/cancel` | ADMIN, FINANCE | Cancelar |

### Health Check

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/health` | Verificar estado del servidor |

---

## Flujos de Negocio

### Ciclo de Compra

1. **Crear orden** (`CreatePurchaseOrder` — ADMIN/COMMERCIAL) -> estado `TO_VERIFY_BUDGET`, genera transaccion PAYMENT
2. **Verificar presupuesto** (`VerifyPurchaseBudget` — FINANCE) -> `PENDING_BUDGET` o pasa a `TO_CONFIRM`
3. **Confirmar** (`ConfirmPurchaseOrder` — COMMERCIAL) -> `CONFIRMED`
4. **Recibir mercaderia** (`ReceivePurchaseOrder` — INVENTORY) -> `RECEIVED`
5. **Auditar** (`AuditPurchaseOrder` — INVENTORY) -> `AUDITED`, crea lotes de inventario
6. **Cancelar** (`CancelPurchaseOrder` — cualquier estado) -> `CANCELLED`, revierte transaccion

### Ciclo de Venta

1. **Crear orden** (`CreateSaleOrder` — ADMIN/COMMERCIAL) -> `TO_VERIFY_COLLECTION`, reserva stock FEFO/FIFO, genera transaccion COLLECTION
2. **Confirmar cobro** (`ConfirmSalePayment` — FINANCE) -> `PENDING_ASSEMBLY`, confirma venta en inventario
3. **Despachar** (`DispatchSaleOrder` — INVENTORY) -> `DISPATCHING`
4. **Entregar** (`MarkOrderDelivered` — ADMIN/INVENTORY) -> `DELIVERED`
5. **Cancelar** (`CancelSaleOrder`) -> `CANCELLED`, libera stock reservado

---

## Testing

### Tests Unitarios (Vitest)

```bash
npm test              # Ejecutar una vez
npm run test:watch    # Modo watch
npm run test:coverage # Con reporte de cobertura
```

**Configuracion de cobertura (`vitest.config.ts`):**

| Metrica | Threshold |
|---------|-----------|
| Statements | 80% |
| Branches | 75% |
| Functions | 80% |
| Lines | 80% |

**Exclusiones de cobertura:** persistencia (Mongoose), rutas Express, vistas Pug, entry point, conexion a DB y Socket.io.

El proyecto cuenta con **240+ tests unitarios** distribuidos en todos los modulos de negocio.

### Tests E2E (Playwright)

```bash
npm run test:e2e
```

Los tests E2E cubren:

- Login con los 4 roles del sistema
- Credenciales invalidas
- Logout
- Proteccion de rutas por rol
- Ciclo completo de compra y venta
- Cancelaciones
- Listados y filtros

Playwright levanta el servidor automaticamente con `npx tsx src/server.ts` antes de ejecutar los tests.

---

## QA Dashboard

El comando `npm run dashboard` ejecuta los tests con cobertura y genera un panel HTML interactivo en `qa-dashboard/index.html` con:

- Resumen de tests (pasados, fallidos, total)
- Cobertura promedio y health score
- Quality gates (cumplimiento de thresholds)
- Graficos Chart.js: cobertura por modulo, health index, distribucion de coverage
- Tablas detalladas de cobertura por modulo y por archivo
- Risk assessment para modulos con cobertura inferior al 80%

---

## Tecnologias

| Categoria | Tecnologia |
|-----------|------------|
| Runtime | Node.js (ESM) |
| Lenguaje | TypeScript 6.x |
| Framework web | Express 5.x |
| Base de datos | MongoDB + Mongoose 9.x |
| Autenticacion | JWT + bcrypt |
| Tiempo real | Socket.io 4.x |
| Templates | Pug |
| Tests unitarios | Vitest 3.x + @vitest/coverage-v8 |
| Tests E2E | Playwright 1.x |
| Dev server | nodemon + tsx |
