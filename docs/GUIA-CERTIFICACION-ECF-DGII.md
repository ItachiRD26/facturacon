# Guía de certificación e-CF ante la DGII — síntesis de dos certificaciones reales

Este documento combina lo aprendido en **dos** certificaciones e-CF completadas
de principio a fin: Soraya y Leonardo Tours (2026-06-12, ver `01-logica-activa/`
y `03-reglas-de-negocio/reglas-dgii-ecf.md` en esta misma carpeta) y **Hotel Gil**
(2026-09-15, proyecto `hotelgil`, bitácora completa en
`hotelgil/docs/certificacion-dgii.md`). Es la referencia a usar al certificar
un tercer proyecto (p. ej. el SaaS multi-tenant de facturación) — no repite el
trabajo de prueba y error, solo lo que ya se confirmó que funciona.

No es código para copiar literal — cada proyecto tiene su propio modelo de
datos — sino el mapa de decisiones, reglas de negocio no documentadas en el
XSD, y errores ya cometidos (para no repetirlos).

---

## 1. Los 13 pasos reales del portal DGII (de principio a fin)

La DGII numera el proceso como 13 pasos visibles en el portal (no 15 —
ese número venía de una estimación previa que no coincidió con lo que el
portal mostró en ninguna de las dos certificaciones reales). Resumen de qué
hace falta construir/hacer en cada uno:

| Paso | Qué pide la DGII | Qué construir / hacer |
|---|---|---|
| 1 | Autenticación: descargar semilla (`testecf`/`certecf`), firmarla con el certificado real, subir el XML firmado | Reusar `firmarXML()`; endpoint simple que descarga semilla + firma + sube. Puede necesitar una ruta ad-hoc `firmar-xml` para firmar XML que el portal entrega directo (no generado por el propio sistema) — útil también en pasos 13 |
| 2 | Subir Excel de 25 comprobantes de prueba con eNCF YA asignados por la DGII, enviarlos en 4 grupos en orden oficial | Parser de Excel → JSON e-CF (`build-from-excel.ts`) + firma + envío agrupado y bloqueado por grupo (ver orden abajo) |
| 3 | Subir Excel de Aprobaciones Comerciales (ACECF) para los eNCF que lo requieren | Mismo patrón que Paso 2, builder de ACECF |
| 4 | "Simulación": comprobantes de tipos que el negocio normal no emite (notas, compras, regímenes especiales, exportación, pagos al exterior) — no vienen de Excel, el propio sistema los genera | Builder genérico reusado + numeración de secuencia APARTE de la real (ver §3) + UI que automatiza la generación con datos de ejemplo válidos |
| 5 | Subir la representación impresa (PDF) — **un archivo por categoría de tipo**, no por cada comprobante individual | Reusar el layout HTML/CSS ya existente de impresión real, nunca reconstruirlo a mano (ver §5, lección jsPDF) |
| 6 | DGII valida lo subido en el Paso 5 | 100% del lado de la DGII, solo esperar |
| 7 | Confirmar/validar las URLs de los 3 servicios receptor (Autenticación, Recepción, Aprobación Comercial) | Los endpoints `/fe/*` deben estar desplegados y vivos ANTES de este paso |
| 8 | Botón "Inicio Prueba Recepción e-CF" — dispara que la DGII llame de verdad a los endpoints receptor | Nada que construir, solo confirmar que los endpoints siguen vivos |
| 9 | "Recepción e-CF" — la DGII valida la capacidad real de recepción | Verificar en la propia base de datos que realmente llegaron llamadas y que se respondió con ARECF firmado — no confiar solo en lo que muestra el portal |
| 10 | Botón "Inicio Prueba Aprobaciones Comerciales" | Igual que el 8 pero para ACECF |
| 11 | "Recepción Aprobaciones Comerciales" | Igual que el 9 pero para ACECF — verificar `acecf_recibidas` en base de datos |
| 12 | "URL Servicios Producción" — registrar las URLs DEFINITIVAS en el directorio público (OFV) | **Decisión de producto, no técnica**: decidir aquí si el dominio de certificación se vuelve permanente o si se planea mover — después de este paso, cambiar la URL implica un nuevo trámite ante la DGII |
| 13 | "Declaración Jurada" — el portal entrega un XML a firmar y subir | Mismo mecanismo de firma del Paso 1 |
| — | Mensaje final: *"Ha completado de manera exitosa el proceso de certificación como Facturador Electrónico"* | No hay Paso 14/15 visible — el proceso cierra en 13 |

**Regla de oro repetida en ambas certificaciones**: cada grupo/paso debe
confirmarse realmente **Aceptado** (no solo "enviado") antes de continuar al
siguiente — varios rechazos reales ocurrieron por mandar algo dependiente
(ej. una Nota de Crédito) antes de que su dependencia (la factura que
modifica) estuviera aceptada.

### Orden oficial de envío del Paso 2

```
1º: 31, 32 (>= RD$250,000), 41, 43, 44, 45, 46, 47
2º: 33, 34   (Notas de Débito/Crédito — referencian un eNCF del grupo 1º)
3º: 32 Resumen (RFCE), monto < RD$250,000
4º: 32 factura íntegra, una vez el RFCE del punto 3º quedó Aceptado
```

---

## 2. Arquitectura de código recomendada

Confirmada en dos proyectos independientes — repetir este patrón ahorra
tiempo de diseño:

- **El módulo de certificación es desechable, el receptor NO.** Todo lo de
  Pasos 1-6 y 10-13 (UI de certificación, builders de prueba, numeración
  separada) puede archivarse/borrarse una vez certificado — no cumple
  función en producción. Pero **`/fe/*` (los 3 endpoints receptor) deben
  vivir para siempre**: a partir del Paso 12, su URL queda registrada ante
  la DGII como permanente. No confundir "módulo de certificación" con
  "servicio receptor" al decidir qué limpiar después.
- **Admin SDK, no SDK cliente, en las rutas server-side de `/fe/*` y de
  certificación.** Estas rutas no tienen sesión de usuario — las reglas de
  base de datos que exigen `auth != null` rechazan los writes. Usar el SDK
  de administrador (bypassa las reglas) en vez de forzar reglas públicas.
- **Certificado real aislado del certificado de prueba, con variables de
  entorno separadas** (p. ej. `DGII_CERT_BASE64`/`PASSWORD` para el día a
  día en `testecf`, `DGII_CERTECF_CERT_BASE64`/`PASSWORD` para
  certificación en `certecf`) — así la certificación nunca arriesga romper
  la emisión real mientras está en curso, y el día a día nunca gasta
  secuencias de certificación por accidente.
- **Numeración de secuencia de certificación SEPARADA de la real** — un
  contador propio (no el que usa la emisión diaria), que además debe
  escanear el Excel de la DGII ya subido y arrancar por encima del eNCF más
  alto ya usado de ese tipo (ver lección de colisión en §4). Si no se
  separa, las pruebas de certificación consumen/mezclan la numeración real
  que después necesita producción.
- **El builder de XML del día a día no debe ensuciarse con tipos que el
  negocio real nunca emite.** El Paso 4 pide tipos (notas, compras,
  regímenes especiales, exportación) que un negocio normal no genera
  orgánicamente — mejor un builder genérico aparte (reusable entre Pasos 2
  y 4) que forzar esos tipos en el builder de producción.
- **El firmador de XML (`firmarXML`) debe aceptar un certificado "override"
  opcional** (path/base64/password), para poder firmar con el certificado
  real de certificación sin tocar el flujo de firma del día a día.
- **El QR/Timbre Electrónico (`generarURLQR`) debe aceptar un `ambiente`
  opcional**, para que certificación pueda forzar `certecf` sin depender de
  la variable global de ambiente (que se queda en `testecf`/`ecf` real para
  el día a día).
- **Reusar el layout de impresión real (HTML/CSS) para la representación
  impresa de certificación, nunca reconstruirlo con una librería de PDF
  aparte.** Ver lección detallada en §5 — esto ya se intentó mal una vez.
- **Rutas administrativas de un solo uso (firmar un XML puntual que entrega
  el portal, corregir un dato de configuración puntual) se crean, se usan
  una vez, y se BORRAN** — no deben quedar rutas de diagnóstico/fix
  olvidadas en el código ya certificado.
- **El dominio/subdominio del servicio receptor debe decidirse con
  cuidado antes del Paso 12** — después de registrarlo, es un trámite
  nuevo ante la DGII para cambiarlo. Evaluar si conviene que sea el
  dominio principal del sistema o un subdominio dedicado, pensando en que
  quedará vivo indefinidamente.

---

## 3. Reglas de negocio DGII no documentadas claramente en el XSD/manual

Confirmadas por rechazo real y verificadas contra el XSD oficial de cada
tipo (`e-CF NN v.1.0.xsd`) y/o el código ya certificado de un proyecto
hermano — no asumir que el manual/XSD alcanza por sí solo:

- **`TipoIngresos`** es obligatorio (`minOccurs="1"`) para la mayoría de
  tipos y debe ir ANTES de `TipoPago` en `IdDoc` — el orden de secuencia del
  XSD es estricto, omitir u ordenar mal produce
  `invalid child element 'TipoPago'`. Excepciones donde NO va: 41, 43, 47.
- **`TipoPago`**: obligatorio por regla de negocio en **E41** aunque el XSD
  lo marque opcional. **Omitido por completo** (ni siquiera vacío) en
  **E43 y E47** — incluirlo ahí también puede producir rechazo.
- **`FechaVencimientoSecuencia`**: el XSD de **E32 y E34** no tiene este
  campo en absoluto (confirmado con `grep -c` = 0 en ambos XSD). En **E34**
  ese lugar de la secuencia lo ocupa `IndicadorNotaCredito`.
- **`IndicadorMontoGravado`**: se envía (cuando hay ITBIS gravado) SOLO en
  31, 32, 33, 34, 41, 45 — se **omite siempre** en 43, 44, 46, 47, sin
  importar si hay gravado.
- **`MontoGravadoTotal`** es un campo agregado SEPARADO de
  `MontoGravadoI1` (desglose por tasa) — hay que mandar ambos, no basta con
  el desglose. Rechazo real si falta: `El campo MontoGravadoTotal ... no es
  válido`.
- **E46 (Exportaciones)** no es "exento" ni el 18% estándar: usa su propio
  tratamiento con "tasa 3" (0%) — todo el monto va a `MontoGravadoI3` con
  `ITBIS3=0`, e `IndicadorFacturacion=3` en el ítem (no 1 ni 4).
- **E43 (y por extensión 44/47)** exigen `IndicadorFacturacion=4` (Exento)
  EXPLÍCITO en el ítem — no hay que dejar que el builder caiga en su default
  de 18%. Regla de negocio real: "Los comprobantes tipo 43 solo permiten
  indicador de facturación exento."
- **`<Comprador>`** es obligatorio (`minOccurs="1"`) para 31, 32, 41, 44,
  45, 46. Es opcional para 33, 34, 47. **No existe en absoluto** para 43.
  Además, por regla de negocio (no solo XSD), **`RNCComprador` también es
  obligatorio en 33/34** aunque el XSD los marque opcionales — mismo patrón
  que `TipoPago` en E41. **E47 es la excepción real**: usa
  `IdentificadorExtranjero` en vez de `RNCComprador` (comprador no
  domiciliado).
- **E41 (Compras) y E47 (Pagos al Exterior)** exigen `<Retencion>` por ítem
  (`minOccurs="1"` en sus XSD): E41 lleva
  `IndicadorAgenteRetencionoPercepcion`, `MontoITBISRetenido` (18%) y
  `MontoISRRetenido` (10%, retención doméstica); E47 lleva solo
  `MontoISRRetenido` al 27% (no domiciliados), sin ITBIS.
- **`CodigoModificacion="2"` (Corrige Texto) exige `MontoTotal=0`** — si la
  nota de crédito/débito de prueba lleva un monto real, usar otro código:
  `"3"` (Corrige montos) para E33, `"1"` (Anula el NCF modificado) para E34
  son los defaults seguros que no exigen monto cero.
- **El monto de una Nota de Crédito/Débito no puede superar el "saldo
  disponible" de la factura que referencia** (`NCFModificado`) — y cada
  factura solo puede acreditarse una vez por el monto completo; si se
  generan varias notas de prueba, cada una debe referenciar una factura
  DISTINTA, no la misma repetida.
- **CRÍTICO — un solo comprobante rechazado en el lote de prueba del Paso 4
  reinicia el LOTE COMPLETO** del lado de la DGII (verificado en dos
  certificaciones independientes) — incluso los que ya estaban Aceptados
  quedan invalidados y hay que regenerarlos con eNCF nuevos. Cualquier
  automatización de este paso debe detectar un rechazo y detener/reiniciar
  el seguimiento local de inmediato, no seguir gastando secuencias.
- **RFCE (Resumen de Factura de Consumo, Recepción de Resúmenes,
  `fc.dgii.gov.do/.../RecepcionFC`) NO es asíncrono** — no da un `trackId`
  para consultar después: responde el estado final en la misma llamada de
  envío. **ACECF (Aprobación Comercial) tampoco** — mismo patrón. Tratar
  cualquiera de los dos como si devolvieran trackId produce
  "No encontrado" al intentar consultarlos después.
- **Nombres de parámetro del QR/Timbre Electrónico van en PascalCase
  exacto** (`RncEmisor`, `RncComprador`, `ENCF`, `FechaEmision`,
  `MontoTotal`, `FechaFirma`, `CodigoSeguridad`), no minúsculas — y la ruta
  del servicio es `ConsultaTimbre` (mayúscula), no `consultatimbre`. El
  formato de fecha es `dd-MM-yyyy` (con guiones), según el texto del
  Informe Técnico (no su placeholder de ejemplo, que lo omite).
  `CodigoSeguridad` = primeros 6 caracteres del `SignatureValue` en base64
  — NO un hash SHA-256.
- **La representación impresa de Notas de Débito/Crédito debe mostrar
  "e-NCF Modificado" y "Código de Modificación" en palabras** (catálogo:
  1=Anula el NCF modificado, 2=Corrige Texto, 3=Corrige montos, 4=Reemplazo
  NCF en contingencia) — confirmado contra el modelo ilustrativo oficial del
  Informe Técnico. Más allá de esos dos campos de encabezado, el resto de
  la representación (tabla de ítems, totales) es igual a una factura
  normal — no necesita signo ni texto especial.
- **El Paso 5 pide un archivo POR CATEGORÍA DE TIPO (11 casillas), no uno
  por cada comprobante individual** del lote de 25 — alcanza con un
  ejemplo de cada tipo.

---

## 4. Bugs de infraestructura transversales (no son reglas DGII, son bugs propios)

- **Rutas `/fe/*` sensibles a mayúsculas/minúsculas en producción (Vercel/
  Linux), aunque funcionaban bien en desarrollo (Windows).** El portal de
  la DGII documenta sus propias URLs con mayúsculas en partes del path
  (`.../api/ValidacionCertificado`), pero las carpetas de ruta de Next.js
  suelen crearse en minúsculas. En Windows el filesystem es
  case-insensitive y el bug no se nota en local; en Vercel (Linux) sí
  distingue mayúsculas, y la llamada real de la DGII devuelve 404
  `NotFound`, reiniciando la prueba del lado de la DGII. **Fix robusto**:
  middleware que reescribe (`NextResponse.rewrite`, nunca `redirect` —
  un redirect puede convertir un POST en GET) cualquier ruta bajo el
  prefijo del servicio receptor a minúsculas antes de que el framework la
  resuelva, cubriendo cualquier variante de casing que use cualquier
  llamador externo futuro, no solo la DGII.
- **Excel real de la DGII con columnas repetidas entre corchetes**
  (`FormaPago[1]`) — si se persiste en una base de datos tipo Realtime
  Database, los caracteres `.`, `#`, `$`, `/`, `[`, `]` son inválidos como
  key y hay que sanearlos antes de guardar.
- **Guardar el Excel completo en un solo write puede exceder límites de
  tamaño de request** de bases de datos tipo RTDB — mejor omitir celdas
  vacías y escribir en lotes pequeños, no un payload gigante de una vez.
- **Un `setState` de merge parcial (`{ ...anterior, campoNuevo }`) sobre un
  mapa keyeado por id puede dejar un registro sin el propio id**, si el
  id todavía no existía en el estado antes del merge (p. ej. justo después
  de crear algo, antes de refrescar desde el servidor) — cualquier
  `.sort()`/`.filter()` posterior que asuma que el campo existe puede
  reventar toda la pantalla (`Cannot read properties of undefined`), no
  solo esa fila. Siempre incluir el id explícito en el objeto que se
  escribe, y agregar un filtro defensivo antes de ordenar.
- **`npm run build` y `npm run dev` no pueden correr a la vez sobre el
  mismo proyecto** — ambos escriben en `.next/` y se corrompen entre sí,
  tumbando TODAS las rutas con 500. Verificar con `tsc --noEmit` + `eslint`
  en vez de arriesgar un build completo mientras el dev server sigue vivo.
- **Un valor de `.env` con `#` sin comillas se trunca ahí mismo** — cualquier
  password/secreto que pueda contener `#` debe ir citado.
- **La fecha de vencimiento de secuencia (`FechaVencimientoSecuencia`) no es
  un detalle de formato — es un valor que la DGII autorizó específicamente
  para ese RNC/ambiente.** Un rechazo "Fecha de vencimiento de secuencia
  inválida" con formato correcto significa que el VALOR configurado no
  coincide con lo autorizado — no adivinar por prueba y error (cada intento
  gasta una secuencia real); confirmar en el portal (Consulta de
  Autorizaciones) o contra un proyecto ya certificado con el mismo tipo de
  ambiente.

---

## 5. Anti-patrones ya probados y revertidos — no repetir

- **Reconstruir a mano (con una librería de dibujo de PDF como jsPDF) el
  layout de un documento que YA existe y se ve bien en HTML/CSS** — se
  intentó para poder descargar en lote sin diálogo de impresión, y el
  resultado perdió el diseño real (logo, colores, bordes según el modelo de
  la DGII). El cliente lo rechazó de inmediato por la regresión visual.
  **Alternativa correcta** si se necesita descarga masiva sin diálogo:
  convertir el HTML YA EXISTENTE a PDF preservando su CSS (p. ej.
  `jsPDF.html()` + `html2canvas`), no reimplementar el diseño desde cero.
- **Un botón "Enviar" que desaparece tras el primer intento** — un rechazo
  por orden de envío (dependencia no cumplida todavía) necesita poder
  reintentarse sin recargar la página entera. Siempre dejar un
  "Reenviar" disponible.
- **Borrar el seguimiment local de un rechazo sin guardar el mensaje
  exacto antes** — el cliente necesita poder copiar/pegar el texto exacto
  que devolvió la DGII para investigar o para soporte; guardarlo en un
  panel fijo (no un toast que desaparece) ANTES de resetear cualquier
  contador local.
- **Generar/elegir el monto y el eNCF a modificar de una Nota de Crédito de
  forma independiente uno del otro** en una automatización — como el monto
  de la nota está acotado al saldo disponible de la factura que referencia,
  hay que guardar y pasar el monto exacto de la factura elegida, nunca un
  monto "sugerido" aparte.
- **Usar `[0]` para elegir repetidamente "la primera factura disponible"
  al generar varias notas de crédito/débito de prueba en automático** — la
  primera nota ya consume el saldo de esa factura; la segunda y tercera
  deben consumir una factura DISTINTA cada una (usar `.shift()` o
  equivalente, nunca indexar siempre la misma posición).

---

## 6. Variables de entorno típicas (nombrar según convención del proyecto)

```
# Día a día / producción real
DGII_AMBIENTE=testecf|ecf
DGII_CERT_BASE64=...
DGII_CERT_PASSWORD=...        # citar si contiene '#'

# Módulo de certificación (aislado, nunca pisa las de arriba)
DGII_CERTECF_CERT_BASE64=...  # el certificado REAL, usado también por el
DGII_CERTECF_CERT_PASSWORD=...# servicio receptor /fe/* permanente
```

---

## 7. Dónde profundizar

- `01-logica-activa/` (esta carpeta) — código que sigue vivo en producción
  en Soraya y Leonardo Tours: `xml-builder.ts`, `xml-signer.ts`,
  `dgii-client.ts`, `qr-builder.ts`.
- `03-reglas-de-negocio/reglas-dgii-ecf.md` (esta carpeta) — catálogo
  original de reglas descubiertas en la primera certificación.
- `hotelgil/docs/certificacion-dgii.md` — bitácora completa, paso por paso,
  de la segunda certificación (incluye fechas, mensajes exactos de la DGII,
  y la sección "Siguiente fase: paso a producción real" con el checklist
  de cutover pendiente en ese proyecto).
