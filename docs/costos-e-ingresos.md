# Costos e ingresos estimados de Facturacon (10 a 1.000 clientes)

> Documento de trabajo, calculado el 2026-11-18. **Son estimaciones con supuestos explícitos** (sección final): sirven para decidir, no son una cotización de Google ni de Pagadito. El cálculo es repetible: `node scripts/estimar-costos.js` (los supuestos están al inicio del archivo).

## Resumen

- Cada cliente de pago aporta, en promedio, **RD$1,394 al mes sin ITBIS (≈ US$23.23)**, con la mezcla de planes supuesta.
- **La pasarela de pago (Pagadito) es el mayor costo después de ti**: ~4 % del cobrado (supuesto: confirmar la tarifa real con Pagadito).
- **Hoy**, el costo de Firebase crece con el *historial* de cada cliente, no solo con su cantidad, porque las pantallas leen colecciones completas y los comprobantes llevan el XML firmado dentro del mismo documento. Con 1.000 clientes pasa de ~7.7% del ingreso en el año 1 a ~32.6% en el año 3.
- **Optimizado** (listeners compartidos por sesión, últimos 100 comprobantes, XML fuera del documento de la lista) el costo de infraestructura se queda en ~1.5% del ingreso aun en el año 3.

## Ingresos y margen por escenario (por mes)

| Clientes | Ingreso neto (sin ITBIS) | Pasarela (~4 %) | Infra HOY año 1 | Infra HOY año 3 | Infra OPTIMIZADA año 3 | Margen operativo HOY año 3 | Margen operativo OPTIMIZADO año 3 |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | US$232 (RD$13,938) | US$11 | US$40 | US$98 | US$27 | US$123 (52.9%) | US$194 (83.6%) |
| 50 | US$1,162 (RD$69,692) | US$55 | US$111 | US$401 | US$40 | US$706 (60.8%) | US$1,067 (91.9%) |
| 100 | US$2,323 (RD$139,384) | US$110 | US$199 | US$779 | US$55 | US$1,435 (61.8%) | US$2,158 (92.9%) |
| 500 | US$11,615 (RD$696,922) | US$548 | US$902 | US$3,802 | US$184 | US$7,265 (62.6%) | US$10,883 (93.7%) |
| 1000 | US$23,231 (RD$1,393,843) | US$1,096 | US$1,783 | US$7,581 | US$346 | US$14,553 (62.6%) | US$21,789 (93.8%) |

*Margen operativo = ingreso neto − pasarela − infraestructura. **No incluye** tu tiempo, soporte, publicidad, abogado, contador, el costo de ser proveedor ante la DGII ni el impuesto sobre la renta.*

## Desglose de infraestructura (por mes)

### 10 clientes

| Concepto | HOY año 1 | HOY año 3 | OPTIMIZADO año 3 |
|---|---:|---:|---:|
| Lecturas de Firestore | US$7.52 | US$28.09 | US$0.24 |
| Escrituras | US$0.05 | US$0.05 | US$0.05 |
| Transferencia de datos (egreso) | US$8.08 | US$43.38 | US$0 |
| Almacenamiento + respaldos | US$0.53 | US$2.65 | US$2.65 |
| Vercel | US$20.2 | US$20.2 | US$20.2 |
| Cloud KMS (certificados) | US$0.07 | US$0.07 | US$0.07 |
| Correo | US$4 | US$4 | US$4 |
| **Total** | **US$40.45** | **US$98.43** | **US$27.2** |
| Lecturas del navegador al mes | 13 M | 47 M | 0 M |

### 50 clientes

| Concepto | HOY año 1 | HOY año 3 | OPTIMIZADO año 3 |
|---|---:|---:|---:|
| Lecturas de Firestore | US$37.61 | US$140 | US$1.18 |
| Escrituras | US$0.24 | US$0.24 | US$0.24 |
| Transferencia de datos (egreso) | US$45.19 | US$222 | US$0 |
| Almacenamiento + respaldos | US$2.65 | US$13.23 | US$13.23 |
| Vercel | US$21 | US$21 | US$21 |
| Cloud KMS (certificados) | US$0.11 | US$0.11 | US$0.11 |
| Correo | US$4 | US$4 | US$4 |
| **Total** | **US$111** | **US$401** | **US$39.77** |
| Lecturas del navegador al mes | 63 M | 234 M | 2 M |

### 100 clientes

| Concepto | HOY año 1 | HOY año 3 | OPTIMIZADO año 3 |
|---|---:|---:|---:|
| Lecturas de Firestore | US$75.21 | US$281 | US$2.37 |
| Escrituras | US$0.48 | US$0.48 | US$0.48 |
| Transferencia de datos (egreso) | US$91.57 | US$445 | US$0 |
| Almacenamiento + respaldos | US$5.29 | US$26.47 | US$26.47 |
| Vercel | US$22 | US$22 | US$22 |
| Cloud KMS (certificados) | US$0.16 | US$0.16 | US$0.16 |
| Correo | US$4 | US$4 | US$4 |
| **Total** | **US$199** | **US$779** | **US$55.48** |
| Lecturas del navegador al mes | 125 M | 468 M | 4 M |

### 500 clientes

| Concepto | HOY año 1 | HOY año 3 | OPTIMIZADO año 3 |
|---|---:|---:|---:|
| Lecturas de Firestore | US$376 | US$1,404 | US$11.85 |
| Escrituras | US$2.41 | US$2.41 | US$2.41 |
| Transferencia de datos (egreso) | US$463 | US$2,228 | US$2.59 |
| Almacenamiento + respaldos | US$26.47 | US$132 | US$132 |
| Vercel | US$30.27 | US$30.27 | US$30.27 |
| Cloud KMS (certificados) | US$0.54 | US$0.54 | US$0.54 |
| Correo | US$4 | US$4 | US$4 |
| **Total** | **US$902** | **US$3,802** | **US$184** |
| Lecturas del navegador al mes | 626 M | 2340 M | 19 M |

### 1000 clientes

| Concepto | HOY año 1 | HOY año 3 | OPTIMIZADO año 3 |
|---|---:|---:|---:|
| Lecturas de Firestore | US$752 | US$2,809 | US$23.69 |
| Escrituras | US$4.82 | US$4.82 | US$4.82 |
| Transferencia de datos (egreso) | US$927 | US$4,457 | US$6.37 |
| Almacenamiento + respaldos | US$52.93 | US$265 | US$265 |
| Vercel | US$41.14 | US$41.14 | US$41.14 |
| Cloud KMS (certificados) | US$1.03 | US$1.03 | US$1.03 |
| Correo | US$4 | US$4 | US$4 |
| **Total** | **US$1,783** | **US$7,581** | **US$346** |
| Lecturas del navegador al mes | 1252 M | 4679 M | 38 M |

## Por qué sube tanto "hoy" (hallazgo)

1. Los hooks de [hooks/](../hooks/) (`useFacturas`, `useClientes`, `useProductos`…) abren un listener **sin límite** sobre la colección completa **cada vez que se abre una pantalla** (no se comparten entre pantallas). Un cliente con 5.000 comprobantes lee 5.000 documentos por cada pantalla de facturas o dashboard.
2. El **XML firmado** del e-CF se guarda dentro del documento de la factura (`xmlFirmado`, `xmlRFCEFirmado` en [app/api/facturas/emitir/route.ts](../app/api/facturas/emitir/route.ts)), así que cada lectura de la lista también descarga ese XML (cientos de MB por pantalla al cabo de un tiempo).
3. El dashboard calcula sus cifras en el navegador a partir de **todas** las facturas.

## Plan de optimización propuesto

**Fase A (sin cambiar lo que ve el usuario)**
- Listeners compartidos por sesión: una sola suscripción por colección mientras el usuario navega (≈ 53 sesiones al mes por cliente en vez de ≈ 634 pantallas).
- Sacar `xmlFirmado` y `xmlRFCEFirmado` del documento de la lista (a un documento aparte que solo se lee al descargar o reenviar).

**Fase B (cambios visibles, bien pensados)**
- Lista de facturas con los últimos 100 y botón «Ver más» (paginación), búsqueda por rango de fechas.
- Cifras del dashboard y de contabilidad desde un resumen mensual que el servidor actualiza al emitir (un documento pequeño por mes).

**Ya aplicado en lo nuevo de esta tanda:** el aviso de verificación en dos pasos usa caché de 10 minutos por instancia; los códigos de recuperación viven en un solo documento por persona (1 lectura); el limitador compartido de Firestore solo se usa en rutas sensibles y públicas.

## Supuestos (cámbialos si no te cuadran)

- Mezcla de clientes: 40 % Emprendedor (RD$690), 25 % plan 250 (RD$1.380), 20 % plan 500 (RD$2.320), 10 % plan 1.000 (RD$3.890), 5 % plan 2.000 (RD$6.340). Precio medio RD$1,791 con ITBIS.
- Usan el 80 % de su tope → ≈ 322 comprobantes por cliente al mes.
- 20 % paga anual (10 meses por 12); 5 % de cobros incobrables.
- ITBIS 18 % incluido en el precio (el ingreso real es el precio entre 1,18). Cambio 60 RD$ por US$.
- Uso: 2.4 personas activas por cliente, 22 días al mes, 12 pantallas al día. Cada cliente tiene ~250 clientes finales, ~400 productos, ~60 cotizaciones.
- Cada comprobante ocupa ~9 KB en Firestore (XML firmado incluido; **no medido**: los comprobantes de prueba actuales no traen XML) y ~8 escrituras (bloqueo, secuencia, factura, auditoría…).
- Precios de Google (Firestore Standard, región nam5): lecturas US$0.06/100 mil, escrituras US$0.18/100 mil, almacenamiento US$0.18/GiB-mes, egreso US$0.12/GiB tras 10 GiB gratis. **No pude confirmar las tarifas nam5 en la página oficial desde aquí: verifícalas en la calculadora de precios de Google Cloud.** La cuota gratuita diaria (50 mil lecturas, 20 mil escrituras) no se descontó.
- Respaldos: 21 copias retenidas a US$0.1/GiB-mes como cota alta (si cada copia fuera completa; en la práctica suele ser menos).
- Vercel Pro (US$20 base) más uso estimado; Cloud KMS por operaciones; correo US$4/mes. Firebase Authentication con Identity Platform queda en cero hasta 50.000 usuarios activos al mes; la verificación en dos pasos con app autenticadora no tiene costo por uso.
- **Pasarela: 4 % del monto cobrado** como supuesto (rango típico de comisiones de tarjeta en RD: 3 % a 5 %, según [elDinero](https://eldinero.com.do/15645/pagos-con-tarjetas-de-credito-y-debito-en-republica-dominicana/)). Pagadito no publica su tarifa: **hay que pedírsela**, es la partida que más mueve el margen.
