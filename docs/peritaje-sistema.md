# Peritaje del sistema Facturacon — 2026-11-18

> Revisión de solo lectura hecha en cinco frentes (emisión/DGII, seguridad, cobros, módulos de negocio, operación y trabajo sin Internet).
> **✔ = lo verifiqué yo leyendo el código** (con un comando o lectura puntual). **Sin marca = lo reportó un revisor y no lo he verificado todavía.**
> Gravedad: **Crítico** (dinero, datos o cumplimiento en riesgo real) · **Alto** · **Medio** · **Bajo**. Esfuerzo: S (horas) · M (1–3 días) · L (más).
> Regla del dueño: la emisión funciona; **no se toca la emisión/firma sin su visto bueno** (ver «Decisiones»).

---

## 1. Resumen en una pantalla

**Lo bueno** (confirmado por varios revisores): el número de comprobante (e-NCF) se asigna en el servidor con transacción; la emisión es idempotente (un reintento no gasta otro número); los totales los decide el servidor; el certificado digital vive cifrado en KMS; las rutas de la API validan sesión, empresa y rol sin huecos de «ver datos de otra empresa»; los correos escapan todo dato; la verificación en dos pasos y los códigos de recuperación están bien construidos; el cobro tiene candado contra doble ejecución del cron.

**Lo que impide hoy un lanzamiento con clientes reales** (en orden de importancia):

| # | Tema | Estado |
|---|---|---|
| 1 | **Vender no descuenta inventario en producción** y la pantalla real no tiene botones de entrada/movimiento ✔ | Bloquea a cualquier negocio con stock |
| 2 | **«Anular» solo cambia un campo local**: la DGII sigue viendo el comprobante vigente; no hay nota de crédito ni devolución en pantalla ✔ | Descuadra declaraciones |
| 3 | **Reglas de Firestore dejan alterar una factura ya emitida** (items, fecha, número…) y tratan a la empresa «suspendida» como sandbox ✔ | Integridad fiscal |
| 4 | **Sin timeouts en las 7 llamadas a la DGII** ✔; sin aviso si el certificado venció ✔ | Cajero colgado / emisiones inválidas |
| 5 | **Si el proceso se corta durante la emisión**, el número queda quemado y reintentar da «ya se está procesando» para siempre ✔ (orden reserva→firma→envío→guardado) | Pérdida de números |
| 6 | **Primer fallo de cobro bloquea la emisión** aunque el correo promete reintentos a 2 y 5 días ✔ | Contradice la política |
| 7 | **Un cajero que vende a crédito queda sin cuenta por cobrar** (las reglas solo dejan al dueño/admin/contador) y, al reintentar, emite otra factura ✔ | Datos y duplicados |
| 8 | **No hay monitoreo ni alertas, ni pruebas automáticas, ni CI** | No te enteras de lo que falla |
| 9 | **No existe trabajo sin Internet** (ni service worker ni cola local) | Pendiente de diseño con la DGII |
| 10 | **Páginas legales publicadas son borrador** (privacidad y términos) | Revisión de abogado |

**Algo mío que debo señalar:** el revisor de seguridad encontró que el endpoint nuevo `firebase-token` (el que agregué hoy para que el dueño pueda leer/escribir en el subdominio) **debilita la regla de «reconfirmar identidad»**: quien tenga la cookie de sesión puede obtener un inicio de sesión «reciente» sin segundo paso y, con él, quitar el segundo paso de la cuenta. Ver S-05.

---

## 2. Orden recomendado de trabajo

**Fase 0 — Antes de tu primera factura real (rápido, sin tocar emisión)**
1. Ocultar «Anular» en empresas activas (y plantear nota de crédito). *(S)*
2. Corregir redirección abierta del login (S-07) y escapado de etiquetas (S-02). *(S)*
3. `PAGADITO_ENV` obligatorio en producción (C-10) y límite de intentos en «suscribir tarjeta» (C-11). *(S)*
4. Gracia de reintentos: permitir emitir mientras la cuenta está en «pago fallido» (C-04). *(S, **toca la puerta de emisión**: pedir OK)*
5. Aviso por correo de certificado por vencer / vencido (O-05). *(S–M)*

**Fase 1 — Antes de aceptar clientes**
6. Reglas de Firestore sobre facturas (E-09/N-06/S-04) con pruebas de reglas. *(M)*
7. Emisión: timeouts DGII, comprobar vencimiento del certificado, guardar la factura «pendiente» **antes** de enviar y barrer emisiones colgadas, candado de reenvío (E-02/E-03/E-04/E-10/O-06/O-07). *(M, **toca emisión**)*
8. Inventario conectado a la venta + pantalla de movimientos (N-01/O-01). *(M, toca emisión)*
9. Cuenta por cobrar creada en el servidor y crédito solo con cliente registrado (N-03). *(S–M, toca emisión)*
10. Nota de crédito/devolución con reintegro de stock y cuenta por cobrar (N-02). *(L)*
11. Cobros: separar «cobro aprobado» de «cobro fallido» y manejar resultado incierto (C-01), candado en activación (C-02), «cambiar tarjeta» (C-03), E31/E32 de cada cobro (C-05).
12. Monitoreo/alertas, pruebas y CI mínimos (O-03/O-04/O-10).
13. Revocación real de sesiones (S-03) y arreglo de S-05.

**Fase 2 — Primeros meses**
Contabilidad 606/607/608 y cifras (N-08, E-05, N-04), snapshot del cliente en la factura (N-05), abonos (N-09), caja diaria, optimización de lecturas (docs/costos-e-ingresos.md), horarios/cierre de caja, trabajo sin Internet por fases.

---

## 3. Hallazgos por área

### 3.1 Emisión y DGII
| ID | Gravedad | Qué pasa | Esf. |
|---|---|---|---|
| E-01 ✔ | Alto | «Anular» en producción solo pone `estado:"anulada"` local; `anularENCF` existe y no se usa. Contabilidad lo excluye pero la DGII lo cuenta. | S/M |
| E-02 | Alto | Reenvío sin candado (cron + cada sesión abierta cada 2 min + botón): un doble envío recibe 4xx y un comprobante **aceptado** puede quedar «Rechazado». | S/M |
| E-03 ✔ | Alto | Orden: reserva e-NCF → cajero → certificado/firma → envío DGII → **guardado al final**. Un corte deja número quemado y 409 permanente; si falla el guardado final tras aceptar la DGII, hay un e-CF que el sistema no conoce. | M |
| E-04 ✔ | Alto | 0 de 7 `fetch` a la DGII con timeout; `emitir` sin `maxDuration`. | S |
| E-05 | Medio | Impresión y contabilidad calculan ITBIS distinto del XML (E43/E44/E46/E47); E34 suma como venta; cuentan rechazados y compras. | M |
| E-06 | Medio | Tras un 504 la llave de idempotencia se descarta: un reintento puede duplicar el e-CF. | S |
| E-07 | Medio | Estado final (Aceptado/Rechazado) se entera hasta ~24 h después (cron diario). | S/M |
| E-08 | Medio | Receptor `/fe/*`: la firma de la DGII no se valida (ver S-01). | M |
| E-09 ✔ | Medio | Reglas protegen solo 7 campos de una factura emitida (ver S-04/N-06). | S |
| E-10 ✔ | Medio | `emitir` no comprueba el vencimiento del certificado; toma `cert[0]`, no el de la llave privada. | S |
| E-11 | Medio | Notas E33/E34 sin validar monto ≤ original, mismo comprador ni estado del original. | M |
| E-12 | Medio | Rechazado es terminal: sin «corregir y reenviar» ni ANECF para números huérfanos. | M/L |
| E-13 | Medio | Pendientes de empresas suspendidas no se reenvían; el cron corta a 240 s con muchos clientes; `resumenPendientes` lee documentos con XML cada 2 min. | S/M |
| E-14 | Bajo | `clasificarError` marca «rechazo» cualquier 4xx raro (404/405/413); token cacheado no se invalida en 401. | S |
| E-15 | Bajo | `CantidadItem` a 2 decimales aunque se acepta 0.0001; caracteres de control en XML; sin XSD previo al envío. | S |
| E-16 | Bajo | Conteo mensual con hora UTC (la noche del último día del mes cuenta como mes nuevo); contención de secuencias (un doc por empresa). | S |
| E-17 | Info | Faltan ISC, propina legal (10 %), moneda extranjera (E46 USD). | — |

### 3.2 Seguridad y accesos
| ID | Gravedad | Qué pasa | Esf. |
|---|---|---|---|
| S-01 ✔ | Alto | `/fe/*`: el token se entrega a cualquiera que mande `<Signature` con una semilla vigente (el propio código lo admite); `semilla` pública sin límite. Un atacante puede marcar aprobación comercial «Rechazado» en facturas reales, llenar `facturas_recibidas` y usar la empresa como «oráculo de firma» (ARECF/ACECF firmados con el certificado). | M |
| S-02 ✔ | Alto | Etiquetas: nombre/código/negocio sin escapar en HTML con `document.write`; un «almacén» puede inyectar script que corre con la sesión del dueño al imprimir etiquetas. Sin CSP. | S |
| S-03 ✔ | Alto | `verifySessionCookie` sin `checkRevoked`: un cajero «revocado», una cookie robada o un 2FA quitado siguen sirviendo hasta 5 días. `regenerar` no rehabilita la cuenta deshabilitada. | S |
| S-04 ✔ | Alto | Reglas: `tenantActivo()` = solo «activo» → empresa «suspendida» queda como sandbox (se puede escribir estado/XML/borrar). Con empresa activa se pueden alterar items/fecha/eCF, poner `esMuestra:true` (desaparece de contabilidad) o evitar el conteo de adicionales. | M |
| S-05 (mío) | Medio | `firebase-token` da un inicio de sesión «reciente» sin segundo paso: salta el chequeo de 10 min de `mfa-codigos` y permite quitar el 2FA con solo la cookie. | M |
| S-06 | Medio | Webhook Pagadito: `fetch(certUrl)` sin lista de hosts (SSRF), sin timeout; sin ventana de tiempo. | S |
| S-07 ✔ | Medio | Login: `router.push(redirect)` acepta URL absoluta (phishing tras autenticarse). | S |
| S-08 | Medio | Una sola service account para Firestore y KMS: si se filtra la llave de Vercel, caen todos los certificados. | M |
| S-09 | Bajo-Medio | `xlsx@0.18.5` con CVE conocidos. | S |
| S-10…S-16 | Bajo | Invitar sin verificar correo; `users/{uid}` escribible (se puede saltar el tope de empresas); sin comprobación de `Origin`; mensajes de error con detalle interno; bloqueo de cajeros por abuso del contador compartido; sin límite de tamaño en algunas subidas; `CRON_SECRET` sin comparación en tiempo constante. | S c/u |
| Ya conocidos (confirmados) | — | Cajero/almacén/lector puede leer `cuentas_por_cobrar`, `facturas_recibidas`, clientes, cotizaciones, costos de producto y el doc de la empresa (incluye `linkEmpleadoToken`). Falta CSP. `ignoreBuildErrors:true` (hoy `tsc` pasa limpio). | — |

### 3.3 Cobros, planes y correos
| ID | Gravedad | Qué pasa | Esf. |
|---|---|---|---|
| C-01 ✔ | Crítico | Tras aprobar el cobro, las escrituras en Firestore siguen en el mismo `try`: si una falla, el `catch` lo trata como cobro rechazado → doble cobro (ERN `-2`) o suscripción trabada para siempre (PG3018 → `no_toca`). Sin timeout en `fetch` de Pagadito. | M |
| C-02 | Alto | Activación sin candado ni idempotencia (ERN con `Date.now()`): doble clic = doble cobro. | S |
| C-03 | Alto | «Cambiar tarjeta» con plan activo lanza «ya tiene suscripción»: no se puede reemplazar una tarjeta por vencer. | M |
| C-04 ✔ | Alto | Primer fallo → `pago_fallido` → emisión devuelve 402, contra la política de reintentos a 2/5 días. | S |
| C-05 | Alto | No hay E31/E32 por cada cobro de la suscripción; no se envía correo en la activación ni al cancelar. | M–L |
| C-06 | Medio | Usuarios extra se cobran con el equipo de hoy por **todos** los meses (anual = hasta 12). | M |
| C-07 | Medio | Comprobantes de muestra y rechazados cuentan para el plan y los extras. | S |
| C-08 | Medio | Cancelar sin candado puede ser pisado por el cron; cancelar corta el servicio aunque el periodo esté pagado. | S/M |
| C-09 | Medio | Correos de cobro «dispara y olvida» (la función puede congelarse antes de enviarlos), sin reintento. | S/M |
| C-10 ✔ | Medio | Entorno por defecto = sandbox: si falta `PAGADITO_ENV` en Vercel, «se cobra» contra el sandbox y los clientes quedan activos sin pagar. | S |
| C-11 ✔ | Medio | `suscribir` sin límite de intentos (prueba de tarjetas); validación mínima; error 502 con mensaje crudo. | S |
| C-12…C-15 | Medio-Bajo | Anual: extras acumulados un año; sin cambio de plan ni reembolso (`reembolsar()` sin usar); webhook sin probar con evento real; tasa fija RD$60; colisión de registros al cancelar/reactivar el mismo día; notificaciones del catálogo sin enviar (`plan_por_vencer`, `limite_comprobantes`, `cambio_plan`, `cuenta_cerrada`). | S–M |

### 3.4 Módulos de negocio y pantallas
| ID | Gravedad | Qué pasa | Esf. |
|---|---|---|---|
| N-01 ✔ | Crítico | En producción la venta **no descuenta inventario** (solo la ruta del sandbox llama `descontarStock` y rechaza empresas activas); la pantalla real no tiene entrada/conteo/merma/historial ni alerta de stock mínimo; el formulario manda a un botón «Stock» que no existe. | M |
| N-02 ✔ | Crítico | «Anular» local; sin pantalla de nota de crédito/débito ni devolución (el servidor ya soporta E33/E34); no devuelve stock ni cancela CxC; cualquier cajero puede anular sin motivo. | L |
| N-03 ✔ | Alto | CxC creada desde el navegador tras emitir; las reglas solo dejan a owner/admin/contador → para vendedor/operador falla con el e-CF ya emitido y reintentar emite otro. | S–M |
| N-04 | Alto | Vista previa, impresión, dashboard y contabilidad usan `calcTotales` (sin redondeo por línea): diferencias de RD$0.01 con el XML/QR; E43/E44/E46/E47 imprimen ITBIS que el XML no declara. | M |
| N-05 | Alto | La factura guarda solo `clienteId`: reimprimir cambia si se edita o borra el cliente. | S |
| N-06 ✔ | Alto | Reglas permiten reescribir facturas emitidas (ver S-04). | S |
| N-07 | Medio | Permisos «yo también facturo / administradores facturan» calculados y no aplicados en el servidor. | S |
| N-08 | Alto | Contabilidad: no hay 606/607/608; E34 suma positivo; cuentan rechazadas, pendientes y compras; el receptor guarda solo el monto de los e-CF recibidos. | M–L |
| N-09 | Medio | Abonos no actualizan la factura ni «por cobrar»/«ingresos cobrados»; dos cajas pisan abonos. | M |
| N-10…N-20 | Medio-Bajo | Rechazo sin motivo visible; formularios que se vacían con cambios en vivo; orden aleatorio dentro del día; Recibidas con texto de borrador y posible duplicado; impresión sin dirección/teléfono del emisor, solo 80 mm; lector de código de barras con fallas; precios/descuentos sin control por rol, sin línea libre; cotizaciones «vencida» nunca se asigna; cambiar rol no revisa el cupo; tablas sin scroll en móvil y modales sin accesibilidad; hora UTC en mes por defecto. | S–M |

### 3.5 Operación e ingeniería
| ID | Gravedad | Qué pasa | Esf. |
|---|---|---|---|
| O-03 | Alto | Sin monitoreo ni alertas (solo `console.*`). | M |
| O-04 | Alto | Cero pruebas automáticas y sin CI (el paquete de pruebas de reglas está instalado y sin usar). | M |
| O-05 | Alto | Los correos de certificado por vencer, plan por vencer y pendientes cercanos a 72 h **nunca se envían**; el checklist de DGII los da por «Listo». | S–M |
| O-08 | Medio | `firestore.indexes.json` vacío; XML dentro del documento de la factura (costo en `docs/costos-e-ingresos.md`). | M |
| O-09 | Medio | Cron de reenvío una vez al día; un pendiente puede llegar a 72 h con un solo intento. | S |
| O-10/O-11/O-12 | Medio-Bajo | `ignoreBuildErrors`; 17 errores de ESLint (14 antiguos, 3 de scripts/firebase-admin); sin `error.tsx`/`not-found.tsx`; variables sin documentar; dependencias sin uso. | S |

---

## 4. Trabajo sin Internet y caja/horarios (diseño, nada construido)

**Hoy no existe nada** (sin service worker, manifest, IndexedDB ni cola local). El freno real: la firma usa el certificado guardado en el servidor y el QR depende de esa firma; el e-NCF lo asigna el servidor. Sin conexión **no se puede producir un e-CF fiscalmente completo**.

| Fase | Qué incluye | Esfuerzo | Condición |
|---|---|---|---|
| 0 | Cerrar inventario (N-01) y timeouts (E-04). | S–M | — |
| 1 | PWA instalable, caché de la app y de productos/clientes (caché persistente de Firestore con limpieza al cerrar sesión), detección de conexión. | M | — |
| 2 | **Cola de ventas en el dispositivo**: guardar la venta con su llave de idempotencia, imprimir recibo provisional («no es comprobante fiscal»), al volver la red emitir en orden. El servidor debe aceptar la fecha original de venta dentro de un máximo (p. ej. 72 h). | M | Decidir si se acepta vender sin e-CF válido en el momento |
| 3 | **Bloques de e-NCF reservados por dispositivo**: se asigna número offline y se firma/envía después. Riesgo: huecos, firma diferida (el impreso offline no puede llevar QR ni código de seguridad válidos); no enviar el `.p12` al dispositivo. | L | **Solo con respuesta escrita de la DGII** (la política 02 sección B dice «[confirmar con la DGII]») |

**Caja y horarios (versión simple acordada):** cada cajero tiene horario; cerca del fin muestra aviso con cuenta regresiva de 10:00 («extender» o «cerrar»); sin respuesta, **cierra la sesión** (= cierra caja); reabrir = volver a entrar con su código. La sesión **no se cierra mientras haya una venta a medias o una emisión en curso**. Sin comprobación en el servidor, solo en pantalla.

---

## 5. Decisiones que necesito de ti (consolidadas)

1. **Permiso para tocar la emisión** (después de tu primera factura real): E-03/O-06 (guardar «pendiente» antes de enviar), E-04 (timeouts), E-10 (vencimiento), N-01 (inventario), N-03 (CxC en el servidor), C-04 (gracia de cobro).
2. **«Anular»**: ¿lo ocultamos ya en empresas activas y construimos nota de crédito/devolución? (recomendado)
3. **Gracia de cobro**: ¿el cliente sigue emitiendo durante los 5 días de reintentos? (recomendado: sí)
4. **Precio con ITBIS incluido** para el comercio minorista: ¿se maneja así en tus clientes típicos?
5. **Quién anula y quién edita precio/descuento**: ¿solo dueño y administrador?
6. **Crédito a «Consumidor final»**: ¿se permite?
7. **Offline**: ¿aceptas vender con recibo provisional y emitir el e-CF al reconectar (Fase 2)? ¿Quién escribe a la DGII para la Fase 3?
8. **Alertas**: ¿por correo, WhatsApp u otro canal? ¿Subimos el plan de Vercel para crons más frecuentes?
9. **Consolas que solo tú puedes revisar**: reglas de Firebase **Storage** (no hay `storage.rules` en el repo: si está en modo prueba, los logos de todas las empresas serían legibles/escribibles) y si el **registro directo en Firebase Auth** está deshabilitado mientras el registro está cerrado.
10. **Cobros**: cobro de usuarios extra (por días de uso o equipo al cierre de mes), anual con extras mes a mes, qué hacer con rechazados/pruebas en el conteo, política de cancelar el anual, tasa de cambio real, quién emite el E31/E32 de cada cobro.
11. **Legal**: fecha de revisión del abogado; mientras tanto, los borradores de privacidad/términos están públicos.

---

## 6. Lo ya hecho hoy que se relaciona

Verificación en dos pasos con códigos de recuperación; correos de recuperar contraseña y verificar correo por nuestro servidor; casilla de aceptación de términos; arreglo del subdominio para dueños (lecturas/escrituras); una sola sesión por navegador con aviso; listas compartidas entre pantallas (menos lecturas). Quedan pendientes de configurar por ti en Firebase: URL de acción `/accion`, nombre público del proyecto y remitentes (ver conversación).
