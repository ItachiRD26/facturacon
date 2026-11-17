# Pagadito — pruebas del cobro recurrente (Sandbox)

## Cómo cobra Facturacon (cobro propio)
Pagadito solo guarda la tarjeta (token) y ejecuta los cobros que Facturacon le pide; **Facturacon decide cada cobro**
(`lib/payments/cobros.ts`, reglas de fechas y montos en `lib/payments/ciclo-cobro.ts`):
- **Primer cobro** al activar: `POST /customer` (tokeniza y cobra). Después, `POST /payment` con el token en cada ciclo.
- **Un cobro = plan + adicionales** de los meses ya cerrados (comprobantes y usuarios extra). Mensual: el cobro de
  diciembre lleva los adicionales de noviembre. Anual: **un solo pago al año**; los adicionales se acumulan y van en el pago del año siguiente.
- **Día de cobro** = aniversario de la activación (un 31 cae el último día de los meses cortos).
- **Cron diario** `/api/cron/cobros` (12:00 UTC). Falla → correo `pago_fallido` con la **fecha límite**; reintento a los **+2 y +5 días**;
  si falla el último: empresa `suspendido` + correo `cuenta_suspendida`. Pagar de nuevo (Cambiar tarjeta) reactiva al instante.
- **Cancelar**: se cobran los adicionales acumulados con la tarjeta guardada (si llegan a US$ 1, el mínimo de Pagadito).
- ERN: `sub-{tenant}-{t}` (primero), `cob-{tenant}-{fecha}-{intento}` (ciclo), `can-{tenant}-{t}` (cancelación). Webhook: solo anota el
  aviso; un `REVOKED` del último cobro (contracargo) suspende.
- Simulación local de un ciclo: `node scripts/pagadito-sandbox.cjs ciclo <tenantId> <YYYY-MM-DD>` (con `npm run dev` y `CRON_SECRET`
  en `.env.local`; en `PAGADITO_ENV=live` no se puede simular fecha).

## Estado de la cuenta Sandbox (2026-11-17)
- UID/WSK válidos. La Tokenización ya está habilitada, pero **solo responde desde el dominio facturacon.com.do** (desde localhost da 401). Las pruebas se hacen en el sitio en vivo con `PAGADITO_ENV=sandbox` en Vercel.
- El host `sandbox-api.pagadito.com` tarda ~11 s en conectar desde esta red (Node corta a los 10 s: «fetch failed»); con curl sí responde.

Pagadito pide: cuenta Sandbox → credenciales → integrar → pruebas → **Certificación Técnica** (formulario a
`validaciones@pagadito.com`). Dudas técnicas: `developers@pagadito.com`.

## Preparación (una vez)
1. Cuenta en <https://sandbox.pagadito.com/registrar/> (completa todos los datos como si fuera producción).
2. Credenciales: **Configuración Técnica → Parámetros de Integración → Credenciales de Conexión**.
3. Pegarlas en `.env.local` (nunca en el chat ni en Vercel todavía):
   ```
   PAGADITO_UID=...
   PAGADITO_WSK=...
   PAGADITO_ENV=sandbox      # solo "live" va al ambiente real
   ```
   Reiniciar el servidor local (lee el archivo al arrancar).
4. **Configuración Técnica → Webhooks**: URL `https://www.facturacon.com.do/api/payments/webhook` (evento
   `TRANSACTION.STATUS.CHANGE`). Pagadito no puede llamar a `localhost`: los avisos llegan al sitio en vivo,
   que escribe en la misma base de datos.

## Tarjetas de prueba (Sandbox)
| Marca | Número | Vence | CVV |
|---|---|---|---|
| VISA | 4111 1111 1111 1111 | 12/2030 | 123 |
| MasterCard | 4242 4242 4242 4242 | 12/2030 | 123 |
| MasterCard | 5555 5555 5555 4444 | 12/2030 | 123 |
| MasterCard | 5105 1051 0510 5100 | 12/2030 | 123 |

## Script de pruebas (`scripts/pagadito-sandbox.cjs`)
> **Ojo:** la Tokenización de Pagadito solo responde desde el dominio facturacon.com.do, así que este script (que corre en tu computadora) ya no sirve para suscribir o cobrar. Las pruebas se hacen en el sitio en vivo; ver `docs/PAGADITO-PRUEBAS.pdf`.

Cada prueba crea una empresa ficticia `PAGADITOPRUEBA<n>` (marcada `esPrueba`), nunca toca la empresa real.
```
node scripts/pagadito-sandbox.cjs credenciales
node scripts/pagadito-sandbox.cjs suscribir mensual 100 visa
node scripts/pagadito-sandbox.cjs suscribir anual 100 mc
node scripts/pagadito-sandbox.cjs estado <tenantId>
node scripts/pagadito-sandbox.cjs cobrar <tenantId> 3      # cobro suelto con el token (comprobantes adicionales)
node scripts/pagadito-sandbox.cjs cancelar <tenantId>
node scripts/pagadito-sandbox.cjs reembolsar <autorizacion>
node scripts/pagadito-sandbox.cjs limpiar
```

## Lista de pruebas (lo que se mostrará en la certificación técnica)
| # | Prueba | Resultado esperado | Hecha |
|---|---|---|---|
| 1 | Credenciales válidas | Pagadito atiende (`credenciales`) | ☐ |
| 2 | Suscripción **mensual** (VISA) | `PG200-00`, `period` mensual, 1.er cobro hecho | ☐ |
| 3 | Suscripción **anual** (MasterCard) | `PG200-00`, `period` anual, monto = 10 mensualidades | ☐ |
| 4 | Flujo completo en la pantalla (formulario, huella del dispositivo, tarjeta) | La empresa queda con plan activo | ☐ |
| 5 | **Webhook** `COMPLETED` | Firma válida y estado `activa` | ☐ |
| 6 | Cobro fallido de un ciclo | `pago_fallido` + correo con fecha límite; reintentos +2/+5 días; al final `suspendido` (probado en local con un token falso) | ☐ |
| 7 | Webhook repetido o fuera de orden | Sin efectos dobles; solo un `REVOKED` del último cobro suspende | ☐ |
| 8 | **Ciclo** con adicionales (`ciclo <tenant> <fecha>`) | Cobro único plan + adicionales, `PG200-00`, siguiente fecha correcta | ☐ |
| 9 | **Cancelar** (panel) | Se cobran los adicionales acumulados; ya no hay más cobros | ☐ |
| 10 | **Reembolso** de un cobro | `PG200-00` y monto devuelto | ☐ |
| 11 | Tarjeta rechazada | Mensaje claro al usuario; nada se activa | ☐ (preguntar a Pagadito por una tarjeta de rechazo) |

## Hallazgos de la documentación (PDF «Pagadito Connect ES – Recurrentes», 2023)
- Hay **dos formas** de cobrar recurrente en Pagadito:
  1. **Tokenización** (`api.pagadito.com/v1`, la que usamos): `subscription` con `interval` (`week|month|year`) e
     `interval_count`; la tarjeta pasa por nuestro servidor (alcance PCI SAQ A-EP) y exige huella de dispositivo.
  2. **Connect «pago único con cobro programado»** (`connect.pagadito.com/api/v2`): se redirige al cliente a la
     pantalla de pago de Pagadito (**la tarjeta nunca toca nuestros servidores**, alcance PCI SAQ A) y se envía una
     lista de `pending_charges` con fechas. Estados: `PENDING`, `COMPLETED`, `UNCOLLECTABLE` (un cobro fallido marca
     incobrables los siguientes).
- Webhook (igual en ambas): firma = `IdNotificación|Timestamp|IdEvento|CRC32|WSK`, verificada con el certificado de
  `PAGADITO-CERT-URL`; reintentos hasta 20 veces en 3 días, **orden no garantizado**; responder HTTP 200.
  Nuestro verificador coincide con esto (probado con un evento firmado localmente).
- Monto por cobro: mínimo US$1, máximo US$50,000 (el plan más caro anual = US$1,716.70).
- Cada ERN (`merchantTransactionId`) solo puede usarse **una vez** (`PG3018`).
