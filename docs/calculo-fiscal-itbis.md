# Cálculo fiscal del ITBIS (precio final con ITBIS incluido)

**Regla (Peter, 2026-11-19):** el precio de un producto o servicio es el **precio final** que paga el cliente. Si lleva ITBIS (16 % o 18 %), el precio ya lo incluye; si no lo lleva, se marca «Exento». El ITBIS no se suma encima.

## Fórmula
Por línea: `neto = cantidad × precio − descuento` · `base = neto ÷ (1 + tasa)` · `ITBIS = neto − base` · `total = neto`.
Ejemplo: RD$12,500 al 18 % → base 10,593.22 + ITBIS 1,906.78 = **12,500.00**.

Es la misma fórmula que usan Soraya y Leonardo Tours y Hotel Gil (ya en producción ante la DGII) y OG DENTAL.

## Dónde vive (una sola fuente de verdad)
- `lib/fiscal/calculo.ts`: `lineaFiscal`, `totalesFiscales`, `conItbisIncluido`, `lineaConPrecisionInsuficiente`. Lo usan el servidor (XML) y la pantalla (`types/index.ts`: `calcLinea`/`calcTotales`).
- `app/api/facturas/emitir/route.ts`: el **servidor** marca las líneas gravadas como «precio con ITBIS incluido» en E31, E32, E33, E34 y E45. El cliente no decide. E41 (compras con retención), E43/E44/E47 (exentos) y E46 (exportación) conservan su tratamiento. La certificación y los precios «sin ITBIS incluido» se calculan exactamente como siempre.

## En el XML
`PrecioUnitarioItem` = precio ÷ (1 + tasa) (hasta 4 decimales, permitido por la DGII) · `MontoItem` = base · `IndicadorMontoGravado` = 0 · `MontoGravadoI1/I2` = suma de bases · `TotalITBIS` = lo que pagó el cliente − las bases · `MontoTotal` = suma exacta de los precios.

## Reglas oficiales de la DGII que se respetan
(Informe Técnico e-CF v1.0 y Formato e-CF v1.0.) Redondeo a 2 decimales con el tercero ≥ 5 hacia arriba; tolerancia de ±1 por línea y global igual al número de líneas (si no, «Aceptado Condicional»); `MontoTotal = MontoGravadoTotal + MontoExento + TotalITBIS`; el precio unitario admite hasta 4 decimales.

## Límite conocido
Con más de unas 10,000 unidades en una sola línea, un precio unitario de 4 decimales no puede declarar el monto con la precisión que pide la DGII. El servidor **rechaza esa línea con un mensaje claro** (hay que dividirla) en vez de declarar mal.

## Pruebas
`npm run test:calculo` (más de 527 mil comprobaciones): ejemplos al centavo; idéntico a la versión anterior cuando no hay ITBIS incluido; comparación con las fórmulas de Soraya/Hotel Gil; invariantes y tolerancias de la DGII; XML real (`buildXML`/`buildRFCEXml`); y que la pantalla calcule lo mismo que el servidor. **Hay que correrlas cada vez que se toque el cálculo.**
