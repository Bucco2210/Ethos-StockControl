# Formatos de Listas de Precios de Proveedores

Cada proveedor envía sus listas en formatos distintos. Este archivo documenta la estructura de cada uno para guiar la implementación del parser en `SupplierImportService`.

---

## Índice

1. [MENTRAU S.A. (Von Derk)](#1-mentrau-sa-von-derk)
2. [ARA Iluminación](#2-ara-iluminación)
3. [Electro Lanus S.R.L.](#3-electro-lanus-srl)
4. [GRASS S.R.L.](#4-grass-srl)
5. [Candil Iluminación S.R.L.](#5-candil-iluminación-srl)
6. [Maraña](#6-maraña)
7. [Consideraciones generales](#7-consideraciones-generales)

---

## 1. MENTRAU S.A. (Von Derk)

**Formato:** `.xlsx` (Excel)
**Nombre típico:** `LISTA_DE_PRECIOS_-_GENERAL___RETAIL_N{numero}.xlsx`
**Moneda:** USD (sin IVA)

### Hojas

- `GENERAL`: lista para distribuidores
- `RETAIL`: lista para minoristas ← **hoja usada por el parser**

### Estructura

Las primeras ~53 filas contienen datos del proveedor, condiciones de pago y datos bancarios — ignorar.
Los productos comienzan aproximadamente en la fila 57.

**Patrón de filas (se repite por cada grupo de producto):**
- Fila de **categoría** (ej: `ILUMINACIÓN INTERIOR`, `TECHO`) — ignorar, usar como contexto
- Fila de **nombre de producto** + URL en col C — ignorar
- Fila de **headers** con: Potencia | Lúmenes | Temp. de color | IP | Color | Precio | Precio mínimo sugerido — ignorar
- Filas de **producto** con los datos reales

### Columnas de datos

| Columna | Campo | Notas |
|---------|-------|-------|
| B | `supplierSku` | Código único (ej: `VK-TROU P4-8W-BN-3000K-24°-220V`) |
| C | metadata: potencia | |
| E | metadata: lúmenes | |
| F | metadata: temp. de color | |
| G | metadata: IP | |
| H | metadata: color | |
| I | `basePrice` | USD sin IVA |
| K | metadata: precio mínimo sugerido | Referencia, no usar como costo |

**Detección de fila de producto:** col B tiene texto con guiones y col I tiene valor numérico.

### Particularidades

- Col A puede contener etiquetas como `NUEVO` — ignorar para parseo
- Las filas de sub-encabezado de color repiten los headers — detectar por ausencia de precio en col I
- Col A a veces tiene etiquetas de categoría (`NUEVO`, `ILUMINACIÓN INTERIOR`) mezcladas con filas de datos

### Parser

```python
wb = load_workbook('lista_mentrau.xlsx', read_only=True)
ws = wb['RETAIL']  # hoja Retail (default del parser)

for row in ws.iter_rows(min_row=57, values_only=True):
    sku = row[1]   # col B
    price = row[8] # col I
    if sku and isinstance(price, (int, float)) and price > 0:
        # es una fila de producto válida
        pass
```

---

## 2. ARA Iluminación

**Formato:** `.pdf`
**Nombre típico:** `Lista_Ara_Iluminacion_{numero}.pdf`
**Moneda:** ARS (sin IVA)
**Lista analizada:** LN44, 16/3/2026

### Estructura

Organizado por **líneas** de producto (OVALE, GIRARE, KING, NATION, BEST, KANDINSK, WORLD, MINIWORLD, WATER, HIGHWATER, etc.).

**Patrón por línea:**
- Header de línea en mayúsculas con descripción — ignorar
- Filas de producto: `Descripción | [Medida opcional] | CODIGO | PRECIO`

### Campos por fila

| Elemento | Campo | Notas |
|----------|-------|-------|
| Descripción del producto | `supplierName` | Incluye línea, tipo, medida, color |
| Código (ej: `OV-150`, `NAT15-2PT`) | `supplierSku` | Identificador único |
| Precio (ej: `$ 63.630,00`) | `basePrice` | ARS, formato argentino |

**Detección de fila de producto:** línea que contiene un código alfanumérico seguido de precio con formato `$ X.XXX,XX`.

### Particularidades

- Algunos productos indican **recargos porcentuales** inline (ej: `COMBINACION CON DISCO ORO O CROMO +12%`, `CON ORO +7%`, `OPCIONAL TULIPA CRISTAL +15%`) — son variantes sobre el precio base, no SKUs separados
- Algunos precios no aparecen en extracción de texto del PDF (especialmente línea RAM.WATER) — considerar OCR como fallback
- Separador de miles `.` y decimal `,` (formato argentino)
- No hay columna de descuento — el precio listado es el precio neto
- Nota `OFERTA MENOS 15% X 6 UNIDADES` = descuento por volumen, no aplicar automáticamente

### Parser de precio

```typescript
// "$ 63.630,00" → 63630.00
const parseArsPrice = (raw: string): number =>
  parseFloat(raw.replace(/\$\s*/, '').replace(/\./g, '').replace(',', '.'));
```

---

## 3. Electro Lanus S.R.L.

**Formato:** `.xls` (Excel legacy)
**Nombre típico:** `Lista_de_Precios_DD-M-AA.xls`
**Moneda:** ARS o USD según producto (sin IVA)
**Engine requerido:** `xlrd` (`pip install xlrd`)

### Estructura

- Fila 0: título (`Electro Lanus SRL / Listas de Precios DD/MM/AA`)
- Fila 1: vacía
- Fila 2: headers → `Código | Descripción | General $ | General USD (USD)`
- Fila 3 en adelante: productos

### Columnas

| Col | Campo | Notas |
|-----|-------|-------|
| 0 | `supplierSku` | Código numérico (ej: `006120`) |
| 1 | `supplierName` | Descripción del producto |
| 2 | `basePrice` ARS | `0` si el producto cotiza en USD |
| 3 | `basePrice` USD | `0` si el producto cotiza en ARS |

### Lógica de moneda

```python
if row['General USD (USD)'] > 0:
    currency = 'USD'
    price = row['General USD (USD)']
else:
    currency = 'ARS'
    price = row['General $']
```

### Parser

```python
import pandas as pd

df = pd.read_excel('lista.xls', engine='xlrd', skiprows=2, header=0)
# columnas resultantes: Código | Descripción | General $ | General USD (USD)
df = df.dropna(subset=['Código'])
```

---

## 4. GRASS S.R.L.

**Formato:** `.xlsx`
**Nombre típico:** `EXCEL_LISTA_DE_PRECIOS_MES_YYYY.xlsx`
**Moneda:** ARS **CON IVA** ⚠️ (único proveedor que incluye IVA en lista)
**Hoja:** `Hoja1`

### Estructura

- Filas 1–25: datos comerciales y condiciones — ignorar
- Fila 26: headers → `Descripción | Dimensión | Imagen | Código de artículo | PRECIO DE LISTA`
- Fila 27: aclaración "INCLUYE IVA / EMITIMOS FC A y B" — ignorar
- Fila 28 en adelante: productos

### Columnas

| Col | Campo | Notas |
|-----|-------|-------|
| A | `supplierName` + atributos | Multi-línea: material, color, accesorios |
| B | metadata: dimensiones | `"Diametro X cm * Alto Y cm"` |
| C | imagen | Ignorar |
| D | `supplierSku` | Multi-línea: primera línea = nombre comercial, última = código (ej: `LSB63001`) |
| E | `basePrice` (con IVA) | Número entero |

### Extracción del SKU

La celda D tiene formato multilinea:
```
CAIRO 60

LSB63001
```

```python
raw = str(cell_d).strip()
lines = [l.strip() for l in raw.split('\n') if l.strip()]
sku = lines[-1]   # última línea no vacía
name = lines[0]   # primera línea
```

### Conversión a precio sin IVA

```python
price_con_iva = row[4]
price_sin_iva = round(price_con_iva / 1.21, 2)
```

### Parser

```python
wb = load_workbook('lista_grass.xlsx', read_only=True)
ws = wb['Hoja1']

for row in ws.iter_rows(min_row=28, values_only=True):
    if row[3] and row[4]:  # col D (SKU) y col E (precio) no vacías
        pass
```

---

## 5. Candil Iluminación S.R.L.

**Formato:** `.xlsx` con fórmulas (workbook complejo)
**Nombre típico:** `Lista_Candil_Nº_{numero}_V{version}.xlsx`
**Moneda:** ARS (sin IVA)

### Hojas del workbook

| Hoja | Descripción |
|------|-------------|
| `L{numero}` (ej: `L197`) | Lista visual completa con ~2.000 filas — estructura compleja, múltiples sub-encabezados entremezclados, precios como fórmulas VLOOKUP |
| `LISTA AL PÚBLICO` | Versión formateada para imprimir con margen aplicado |
| `IMPORTACION` | ✅ **Hoja recomendada para parseo** — datos limpios, sin fórmulas |
| `PARAMETROS` | Descuento del cliente y margen (lo completa el usuario) |
| `Sheet1 (2)` | Tabla auxiliar con Id + Precio Vigente — precios en `0`, no usar |

### Estructura de hoja `IMPORTACION` ✅

- Fila 1: headers
- Filas 2 en adelante: productos (~1.237 en lista Nº197)

| Col | Índice | Campo | Notas |
|-----|--------|-------|-------|
| A | 0 | `supplierSku` | Código del artículo (ej: `1790/BE`, `DRV-12V-IP20-025W`) |
| B | 1 | `supplierName` | Descripción completa del producto |
| C | 2 | metadata: color | Ignorar al parsear (no editar según el proveedor) |
| D | 3 | `basePrice` | ARS sin IVA, valor numérico float |
| E | 4 | `supplierEan` | Código EAN13 — puede ser `None` |
| F | 5 | computed | Igual al campo `Id` de col A — ignorar |

### Parser

```python
from openpyxl import load_workbook

wb = load_workbook('Lista_Candil_Nº_197_V1.xlsx', read_only=True)
ws = wb['IMPORTACION']

for row in ws.iter_rows(min_row=2, values_only=True):
    sku, name, color, price, ean, _ = row
    if sku and price:
        # fila de producto válida
        pass
```

### Detectar el nombre de la hoja de datos dinámicamente

```python
import re

# La hoja principal varía según el número de lista (L197, L198, etc.)
data_sheet_name = next(s for s in wb.sheetnames if re.match(r'^L\d+$', s))
```

### Parámetros de descuento (opcional)

La hoja `PARAMETROS` contiene los descuentos configurados por el usuario:

| Celda | Valor | Descripción |
|-------|-------|-------------|
| W4 | float (ej: `0.1`) | Descuento 1 (DTO 1) |
| Y4 | float (ej: `0.1`) | Descuento 2 (DTO 2) |
| Y7 | float (ej: `1`) | Margen de rentabilidad |

Fórmula de precio al público aplicada en `L{numero}`:
```
precio_publico = round(precio_lista * (1 - dto1) * (1 - dto2) * (1 + margen), 1)
```

Si el importador necesita calcular el precio al público:
```python
ws_params = wb['PARAMETROS']
dto1   = ws_params['W4'].value or 0
dto2   = ws_params['Y4'].value or 0
margen = ws_params['Y7'].value or 0

precio_publico = round(base_price * (1 - dto1) * (1 - dto2) * (1 + margen), 1)
```

---

## 6. Maraña

**Formato:** `.pdf`
**Nombre típico:** `MAYORISTA-YYYY-MM.pdf`
**Moneda:** ARS (sin IVA)
**Lista analizada:** 8 de marzo de 2026

### Estructura

2 páginas, layout de 2 columnas. Sin números de SKU propios — el nombre del producto es el identificador.

**Categorías:** `LAMPARAS`, `SERIE LUZ DE CUERO`, `LAMPARAS DE PIE`, `PANTALLAS`, `COLGANTES`, `APLIQUES`, `BARRALES`, `CANDELABROS`

**Patrón de fila:**
```
NOMBRE_PRODUCTO   [VARIANTE]   $PRECIO
```

Ejemplos:
```
ALINE            S             $81.700
ALINE            M             $111.500
OSAKA                          $146.900
OSAKA            Disco madera  $154.100
25 CONICA        lino natural  $28.900
```

### Campos extraídos

| Campo | Valor | Notas |
|-------|-------|-------|
| `supplierSku` | Nombre + variante (sintético) | No hay código propio — ver construcción abajo |
| `supplierName` | Nombre completo con variante | |
| `basePrice` | Precio ARS sin IVA | Sin decimales |
| metadata: `category` | Categoría (LAMPARAS, APLIQUES, etc.) | |
| metadata: `variant` | S / M / L / Disco / Pintura / Bronce / etc. | |

### Construcción del SKU sintético

```python
def build_sku(nombre: str, variante: str = '') -> str:
    parts = [nombre.strip()]
    if variante.strip():
        parts.append(variante.strip())
    return '_'.join(parts).upper().replace(' ', '_')

# Ejemplos:
# build_sku('ALINE', 'S')            → "ALINE_S"
# build_sku('OSAKA', 'Disco madera') → "OSAKA_DISCO_MADERA"
# build_sku('OSAKA')                 → "OSAKA"
```

### ⚠️ Particularidades

- **Sin SKUs reales:** si el proveedor cambia un nombre entre listas, el sistema no puede auto-mapear — requiere mapeo manual
- Las variantes (S/M/L, Pintura/Bronce, Con tubo, etc.) son parte del producto, no atributos separados
- Precios sin decimales (`$81.700` = 81700 ARS)

### Parser de precio

```python
# "$81.700" → 81700.0
def parse_marana_price(raw: str) -> float:
    return float(raw.replace('$', '').replace('.', '').strip())
```

---

## 7. Consideraciones generales

### Monedas por proveedor

| Proveedor | Moneda | IVA incluido |
|-----------|--------|--------------|
| MENTRAU (Von Derk) | USD | No |
| ARA Iluminación | ARS | No |
| Electro Lanus | ARS o USD | No |
| GRASS | ARS | **Sí** ⚠️ |
| Candil | ARS | No |
| Maraña | ARS | No |

### Recomendaciones de implementación

- Siempre asociar cada `SupplierProduct` al `supplierId` correspondiente al importar
- El campo `supplierName` debe preservar la descripción original completa del proveedor
- Los atributos técnicos (potencia, lúmenes, color, dimensiones, IP, etc.) guardarlos en `metadata: Record<string, string>` en `SupplierProduct` para futura consulta sin afectar el modelo principal
- Ante fallo de parseo de una fila, loggear con número de fila y contenido original — **no abortar el import completo**
- Para GRASS: normalizar siempre a precio sin IVA dividiendo por 1.21 antes de guardar
- Para Maraña y Electro Lanus: registrar la `currency` en el `SupplierProduct` ya que puede variar por fila

### Formato argentino de números

Todos los proveedores ARS usan formato argentino (punto = separador de miles, coma = decimal):

```typescript
const parseArsPrice = (raw: string): number =>
  parseFloat(raw.replace(/\$\s*/, '').replace(/\./g, '').replace(',', '.'));
```