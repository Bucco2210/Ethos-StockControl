# B&B Gestion - Guía de Desarrollo

## Descripción del Sistema

Sistema de gestión de inventario con soporte multi-proveedor para comparar precios y calcular márgenes de ganancia.

## Arquitectura

- **Backend**: NestJS + MongoDB (Mongoose) en `apps/api/`
- **Frontend**: Next.js 14 + React en `apps/web/`
- **Shared**: Tipos y enums compartidos en `packages/shared/`

## Estructura de Módulos

```
apps/api/src/modules/
├── auth/               # Autenticación JWT
├── users/              # Gestión de usuarios
├── families/           # Categorías de productos
├── subfamilies/        # Subcategorías
├── products/           # Productos (sistema original)
├── stock/              # Movimientos de inventario
├── import/             # Importación bulk desde Excel
├── suppliers/          # Proveedores
├── supplier-products/  # Productos por proveedor
├── unified-products/   # Productos unificados + mapeo
└── mapping-settings/   # Configuración de auto-mapeo
```

---

## Sistema Multi-Proveedor (En Desarrollo)

### Concepto

El cliente recibe listas de precios de múltiples proveedores (ej: 3 proveedores diferentes). Cada proveedor tiene:
- Códigos de producto propios
- Nombres diferentes para los mismos productos
- Precios y descuentos diferentes

El sistema permite:
1. Importar listas de cada proveedor
2. Unificar productos equivalentes entre proveedores
3. Comparar precios
4. Elegir el mejor proveedor por producto
5. Calcular precio de venta con margen de ganancia

### Schemas

```
Supplier (Proveedor)
├── name (único)
├── code, contactName, email, phone
├── isActive
└── createdBy

SupplierProduct (Producto del Proveedor)
├── supplierId → Supplier
├── supplierSku (único por proveedor)
├── supplierName
├── basePrice, discountPercent
├── netCost (calculado: basePrice * (1 - discount/100))
├── unifiedProductId → UnifiedProduct (opcional)
└── importJobId → ImportJob

StockMovement (Movimiento de inventario)
├── productId → Product
├── type: IN | OUT | ADJUSTMENT
├── quantity, reason
├── previousStock, newStock
├── supplierId → Supplier (obligatorio en IN)
├── documentNumber (número de remito, obligatorio en IN)
└── performedBy → User

ImportJob (Trabajo de importación)
├── fileName, originalName, importType
├── status: pending|preview|completed|failed|reverted
├── supplierId → Supplier (en supplier_products)
├── previewData[] (filas validadas)
├── result (counters de creados/actualizados)
├── previousValues[] (snapshot para revert: por cada SupplierProduct
│                    tocado, su basePrice/discount previos o wasCreated=true)
├── revertedAt, revertedBy (audit)
└── uploadedBy → User

UnifiedProduct (Producto Unificado)
├── sku (interno, único)
├── name, description
├── familyId, subfamilyId
├── stock, stockMin
├── selectedSupplierProductId → SupplierProduct
├── selectedCost (costo del proveedor elegido)
├── profitMarginPercent (margen deseado)
├── salePrice (calculado: cost * (1 + margin/100))
└── status

MappingSettings (Configuración de Auto-Mapeo)
├── key: 'default' (singleton)
├── autoMapOnImport: boolean
├── autoMapStrategy: 'exact_sku' | 'similar_name' | 'disabled'
├── defaultProfitMargin: number (0-100)
├── minMatchScore: number (0-100)
└── createUnifiedIfNoMatch: boolean
```

### Fórmulas de Precio

```
Costo Neto = Precio Base × (1 - Descuento% / 100)
Precio Venta = Costo Seleccionado × (1 + Margen% / 100)
```

---

## Fases de Implementación

### Fase 1: Proveedores (CRUD)
- [x] Backend: SuppliersModule con CRUD completo
- [x] Frontend: Página /suppliers con lista y formulario
- [x] Permisos: SUPPLIERS_READ, SUPPLIERS_MANAGE

### Fase 2: Importación de Listas de Proveedor
- [x] Schema SupplierProduct
- [x] SupplierProductsModule
- [x] Modificar ImportJob para soportar supplierId
- [x] SupplierImportService
- [x] Frontend: Selector de proveedor en importación

### Fase 3: Productos Unificados + Mapeo
- [x] Schema UnifiedProduct
- [x] UnifiedProductsModule (service + controller + DTOs)
- [x] MappingSuggesterService (sugerencias por similitud)
- [x] Frontend: Interfaz de mapeo
- [x] Frontend: Comparativa de precios
- [x] Frontend: Calculadora de margen

### Fase 4: Auto-mapeo Configurable
- [x] MappingSettingsModule (backend + frontend)
- [x] Settings: autoMapOnImport, autoMapStrategy, defaultProfitMargin, createUnifiedIfNoMatch
- [x] Estrategias: exact_sku, similar_name, disabled
- [x] Auto-mapeo integrado en flujo de importación

### Fase 5: Impactar lista en Productos + Stock
- [x] Endpoint `POST /import/supplier/:jobId/impact-stock`
- [x] Upsert por SKU del proveedor: existentes update precio/dto, nuevos se crean
- [x] Nuevos productos van bajo familia "Sin clasificar" con stock 0
- [x] Botón en frontend (step 'result' del import de proveedor) con diálogo de confirmación

### Fase 6: Historial de listas + regresión
- [x] Snapshot inline en ImportJob (`previousValues[]`) capturado en `confirm()`
- [x] Estado `ImportStatus.REVERTED` + campos `revertedAt`, `revertedBy`
- [x] Endpoint `POST /import/supplier/:jobId/revert` restaura precios y borra los
      SupplierProducts creados por ese job (desvincula UnifiedProducts huérfanos)
- [x] Endpoint `GET /import/supplier/history` (team-wide, sin `previewData` ni `previousValues`)
- [x] Página `/import-history` con botón "Revertir"
- [x] La regresión NO deshace el impacto en Productos+Stock (se aclara en el diálogo)

### Fase 7: Remito + proveedor en movimientos de stock
- [x] Schema `StockMovement` con `supplierId` y `documentNumber`
- [x] Validación: ambos obligatorios para `IN`, opcionales para `OUT`/`ADJUSTMENT`
- [x] Dialog frontend con render condicional + zod superRefine
- [x] Historial muestra "Prov: X · Remito: Y"

### Fase 8: QR por producto + scanner mobile
- [x] Endpoint `GET /products/by-sku/:sku`
- [x] Componente `ProductQrDialog` (qrcode.react) con imprimir + descargar PNG
- [x] Acción "Ver QR" en dropdown de la tabla de productos
- [x] Página `/scan` (mobile-only, fallback en desktop) con `@yudiel/react-qr-scanner`
- [x] Flujo: scan → buscar por SKU → mostrar stock → cantidad → POST movement OUT
- [x] Permiso del enlace lateral: `STOCK_ADJUST`

---

## Módulos Implementados

### Backend (apps/api/src/modules/)

| Módulo | Descripción | Endpoints |
|--------|-------------|-----------|
| `mapping-settings` | Configuración de auto-mapeo | GET/PATCH `/mapping-settings` |
| `unified-products` | Productos unificados + mapeo | CRUD + `/suggestions`, `/auto-map`, `/create-from-unmapped`, `/link` |
| `supplier-products` | Productos de proveedores | CRUD + `createOrUpdate` |
| `suppliers` | Gestión de proveedores | CRUD completo |
| `products` | Catálogo maestro | CRUD + `/by-sku/:sku` (lookup para scanner) |
| `stock` | Movimientos de inventario | POST `/stock/movement` (acepta `supplierId` + `documentNumber`, obligatorios en IN) |
| `import` (supplier) | Importación de lista de proveedor | upload/preview/confirm + `impact-stock`, `revert`, `history` |

### Frontend (apps/web/src/features/)

| Feature | Componentes |
|---------|-------------|
| `unified-products` | `mapping-dialog`, `price-comparison-dialog`, `unified-product-dialog` |
| `mapping-settings` | API hooks para configuración |
| `import` | Selector de tipo (standard/supplier) + selector de proveedor + export Excel (`lib/export-to-excel.ts`) |
| `products` | `product-qr-dialog` (QR con SKU, imprimir, descargar PNG) |
| `stock` | `stock-movement-dialog` (campos remito + proveedor condicionales), `movement-history` |

### Páginas del dashboard (apps/web/src/app/(dashboard)/)

| Ruta | Descripción |
|------|-------------|
| `/dashboard` | Resumen del inventario |
| `/stock` | Stock actual + entradas/salidas + historial por producto |
| `/scan` | Scanner QR (solo mobile — detecta UA + viewport ≤820px) |
| `/products` | Catálogo maestro + acción "Ver QR" |
| `/unified-products` | Productos unificados + comparativa |
| `/families` · `/suppliers` · `/supplier-products` | CRUDs / listados |
| `/import` | Wizard: upload → mapping → preview → confirmar → (opcional) impactar en stock |
| `/import-history` | Listado de importaciones de proveedor + botón Revertir |
| `/mapping-settings` · `/kardex` · `/users` | Configuración y gestión |

---

## Flujo de Usuario

```
1. Crear proveedores ("Proveedor A", "Proveedor B", "Proveedor C")

2. Importar lista de Proveedor A
   → Se crean SupplierProducts asociados a Proveedor A

3. Importar lista de Proveedor B y C
   → Cada uno tiene sus propios SupplierProducts

4. Unificar productos
   → Usuario ve productos sin mapear
   → Sistema sugiere coincidencias por nombre/código similar
   → Usuario confirma mapeo
   → Se crea UnifiedProduct con referencias a SupplierProducts

5. Comparar y elegir
   → Usuario ve comparativa de precios entre proveedores
   → Elige proveedor preferido
   → Define margen de ganancia (ej: 30%)
   → Sistema calcula precio de venta automáticamente

6. Actualizar precios
   → Proveedor envía nueva lista
   → Usuario importa
   → Sistema actualiza SupplierProducts existentes
   → Costos en UnifiedProducts se actualizan automáticamente
   → Antes del update, el job guarda `previousValues[]` para permitir revert

7. (Opcional) Impactar la lista en el catálogo general
   → Tras confirmar la importación, botón "Impactar en Stock"
   → Por cada SupplierProduct válido, upsert en Product usando el mismo SKU:
     · Existe → actualiza basePrice / discountPercent (stock intacto)
     · No existe → crea Product en familia "Sin clasificar" con stock 0
   → No afecta a la lista del proveedor, solo al catálogo

8. (Opcional) Revertir una importación desde `/import-history`
   → Restaura los precios previos de los SupplierProducts modificados
   → Borra los SupplierProducts que ese job hubiera creado
   → No revierte el impacto en Products+Stock (si se ejecutó, queda como está)
   → Marca el job como REVERTED con `revertedAt` y `revertedBy`
```

## Flujo de Stock + QR

```
Entradas (mostrador):
  Stock → Entrada (dialog) → completar proveedor + número de remito
  → POST /stock/movement (type=IN, supplierId + documentNumber requeridos)

Salidas rápidas desde celular:
  Imprimir QR de cada producto (Productos → Ver QR → PNG/imprimir; QR codifica el SKU)
  Pegar QR en el estante / producto
  En el celular: /scan → cámara enfoca QR → SKU resuelto → cantidad → Descontar
  → POST /stock/movement (type=OUT)
```

---

## Comandos Útiles

```bash
# Desarrollo
npm run dev              # Inicia API y Web en paralelo vía concurrently
                         # (kill:3001 + build:shared + api + web con prefijos)

# Solo API
cd apps/api && npm run dev

# Solo Web
cd apps/web && npm run dev

# Build
npm run build:shared     # Compilar tipos compartidos (necesario tras tocar packages/shared)
npm run build            # Build completo
```

**Nota:** `npm run dev` en la raíz usa `concurrently` (devDependency) porque
`npm run --workspaces` corre secuencial y bloquea en el primer workspace con
proceso watch. Si tocás `packages/shared`, hace falta rebuildearlo aparte
(`npm run build:shared`) o reiniciar `npm run dev` — no está en watch concurrente
por elección, para no recompilar todo el rato.

---

## Variables de Entorno

### Backend (apps/api)
```
MONGODB_URI=mongodb://localhost:27017/ethos-stock
JWT_ACCESS_SECRET=your-secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRATION=7d
API_PORT=3001
API_CORS_ORIGIN=http://localhost:3000
```

### Frontend (apps/web)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

---

## Deployment

- **Backend**: Render (usa variable PORT automática)
- **Frontend**: Vercel
- **Database**: MongoDB Atlas

---

## Notas de Desarrollo

- El sistema Product original se mantiene separado de UnifiedProduct
- Ambos sistemas pueden coexistir
- Los productos importados via el nuevo sistema van a SupplierProduct → UnifiedProduct
- El mapeo entre productos de diferentes proveedores es manual con sugerencias automáticas
- **Impactar en Stock** es el puente entre el sistema de proveedores y Product/Stock:
  toma SupplierProducts y los lleva al catálogo maestro usando el SKU del proveedor.
- **Revert** solo afecta la capa de SupplierProducts. Si ya impactaste a Products+Stock,
  esa parte queda como está — por diseño, para no perder stock real.
- Las importaciones hechas antes de la Fase 6 no tienen `previousValues` y no se pueden
  revertir (el endpoint devuelve 400 con mensaje explicativo).
- El scanner QR necesita HTTPS para acceder a la cámara desde dispositivos remotos.
  Para probar desde el celular en red local conviene usar ngrok/Cloudflare Tunnel.
- Los QR codifican únicamente el SKU del producto, no su `_id`. Son regenerables y
  funcionan aunque cambie el ObjectId.

## Formatos de Listas de Proveedores

Ver [`SUPPLIER_FORMATS.md`](./SUPPLIER_FORMATS.md) para la documentación detallada de cada proveedor (MENTRAU, ARA, Electro Lanus, GRASS, Candil, Maraña).