# Pagadito — pruebas del cobro recurrente (Sandbox)

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
| 6 | Webhook con falla (`REVOKED`/`FAILED`/`UNCOLLECTABLE`) | Empresa pasa a `suspendido` / `pago_fallido` | ☐ |
| 7 | Webhook repetido o fuera de orden | Sin efectos dobles; un aviso viejo no suspende un pago posterior | ☐ |
| 8 | Cobro de **adicionales** con token | `PG200-00` y autorización | ☐ |
| 9 | **Cancelar** suscripción | `PG200-00`; ya no hay más cobros | ☐ |
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
