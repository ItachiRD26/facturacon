# Correos de Facturacon

Catálogo de todos los correos que el sistema puede enviar. Está definido en `lib/email/catalogo.ts` (esta tabla se genera de ahí).

- **Remitente:** todos salen de `noreply@facturacon.com.do`, con respuesta a `contacto@facturacon.com.do`.
- **Siempre:** el usuario lo necesita sí o sí (factura, recibo, acceso). **Siempre (aviso):** importante para su operación. **Opcional:** lleva aviso de baja y solo se manda si el usuario no lo apagó.
- **Estado:** todas las plantillas están listas. Falta conectar cada una a su evento (el «cuándo» de la tabla) y configurar la clave SMTP.

## Cuenta y equipo (3)

| Correo | Cuándo se manda | Para | Se manda | Asunto de ejemplo |
|---|---|---|---|---|
| **Bienvenida** (`bienvenida`) | Al crear la cuenta | Usuario | Siempre | Bienvenido a Facturacon |
| **Invitación al equipo** (`invitacion_equipo`) | Cuando el dueño agrega a un empleado | Usuario | Siempre | Peter García te invitó a ABC Facturacon en Facturacon |
| **Cambio de rol** (`rol_cambiado`) | Cuando cambian el rol de un usuario | Usuario | Siempre | Tu rol en ABC Facturacon cambió |

## Certificación y firma digital (6)

| Correo | Cuándo se manda | Para | Se manda | Asunto de ejemplo |
|---|---|---|---|---|
| **Certificación iniciada** (`cert_iniciada`) | Al empezar el asistente de certificación | Usuario | Siempre | Empezaste la certificación de ABC Facturacon |
| **La DGII rechazó un paso** (`cert_rechazo_dgii`) | Cuando la DGII rechaza algo del proceso | Usuario | Siempre (aviso) | La DGII pidió corregir: Representación impresa |
| **Certificación sin terminar** (`cert_inactiva`) | A los 3 y 7 días sin avance | Usuario | Opcional (con baja) | Tu certificación de ABC Facturacon te está esperando |
| **¡Certificación aprobada!** (`cert_aprobada`) | Al quedar el negocio activo como emisor | Usuario | Siempre | ABC Facturacon ya es emisor electrónico |
| **Firma digital por vencer** (`certificado_por_vencer`) | A los 60, 30, 15 y 7 días del vencimiento | Usuario | Siempre (aviso) | Tu firma digital vence en 30 días |
| **Firma digital vencida** (`certificado_vencido`) | El día que vence | Usuario | Siempre (aviso) | Tu firma digital venció: no puedes emitir |

## Facturación e inventario (4)

| Correo | Cuándo se manda | Para | Se manda | Asunto de ejemplo |
|---|---|---|---|---|
| **Factura rechazada por la DGII** (`ecf_rechazado_dgii`) | Cuando la DGII rechaza un comprobante emitido | Usuario | Siempre (aviso) | La DGII rechazó el comprobante E310000000012 |
| **Comprobantes pendientes de enviar a la DGII** (`contingencia_pendientes`) | Cuando hay comprobantes sin enviar (contingencia) | Usuario | Siempre (aviso) | 3 comprobantes pendientes de enviar a la DGII |
| **Secuencias por agotarse** (`secuencias_por_agotarse`) | Cuando quedan pocos eNCF autorizados de un tipo | Usuario | Siempre (aviso) | Te quedan 25 secuencias de E32 |
| **Inventario bajo** (`stock_bajo`) | Resumen diario de productos bajo su mínimo | Usuario | Opcional (con baja) | 2 productos con poco inventario |

## Plan y cobros (7)

| Correo | Cuándo se manda | Para | Se manda | Asunto de ejemplo |
|---|---|---|---|---|
| **Pago recibido** (`pago_recibido`) | Tras cada pago exitoso de la mensualidad _(adjunta: e-CF de Facturacon (PDF y XML), cuando esté activa la emisión propia)_ | Usuario | Siempre | Recibimos tu pago de RD$ 690.00 |
| **Pago fallido** (`pago_fallido`) | Cuando no se puede cobrar la mensualidad | Usuario | Siempre (aviso) | No pudimos cobrar tu plan |
| **Plan por vencer** (`plan_por_vencer`) | 5, 3 y 1 día antes del próximo cobro | Usuario | Siempre (aviso) | Tu plan Emprendedor se renueva en 3 días |
| **Cuenta suspendida** (`cuenta_suspendida`) | Al suspender la cuenta por falta de pago | Usuario | Siempre (aviso) | La cuenta de ABC Facturacon fue suspendida |
| **Límite de comprobantes** (`limite_comprobantes`) | Al llegar al 80 % y al 100 % de los comprobantes del plan | Usuario | Siempre (aviso) | Llevas el 82 % de los comprobantes de tu plan |
| **Cambio de plan** (`cambio_plan`) | Al cambiar de plan | Usuario | Siempre | Cambiaste a Negocio |
| **Cuenta cerrada** (`cuenta_cerrada`) | Al darse de baja | Usuario | Siempre | La cuenta de ABC Facturacon se cerró |

## Resúmenes y recordatorios (3)

| Correo | Cuándo se manda | Para | Se manda | Asunto de ejemplo |
|---|---|---|---|---|
| **Resumen semanal** (`resumen_semanal`) | Lunes en la mañana | Usuario | Opcional (con baja) | Tu semana en ABC Facturacon: RD$ 215,400.50 |
| **Resumen mensual** (`resumen_mensual`) | Primer día hábil del mes | Usuario | Opcional (con baja) | Cierre de octubre 2026: 248 comprobantes |
| **Recordatorio de declaraciones** (`recordatorio_declaraciones`) | Una vez al mes, antes de la fecha límite de la DGII | Usuario | Opcional (con baja) | Recordatorio: reportes de octubre 2026 para la DGII |

## Seguridad (2)

| Correo | Cuándo se manda | Para | Se manda | Asunto de ejemplo |
|---|---|---|---|---|
| **Acceso desde un dispositivo nuevo** (`acceso_nuevo`) | Al iniciar sesión desde un dispositivo no reconocido | Usuario | Siempre (aviso) | Nuevo inicio de sesión en tu cuenta |
| **Usuario agregado al equipo** (`miembro_agregado`) | Al agregar o quitar usuarios (aviso al dueño) | Usuario | Siempre (aviso) | Laura se agregó al equipo de ABC Facturacon |

## Novedades y opinión (2)

| Correo | Cuándo se manda | Para | Se manda | Asunto de ejemplo |
|---|---|---|---|---|
| **Novedades del producto** (`novedades`) | Cuando hay mejoras importantes (máx. 1 al mes) | Usuario | Opcional (con baja) | Novedades de noviembre |
| **Encuesta de opinión** (`encuesta_opinion`) | 7 días después de la primera factura | Usuario | Opcional (con baja) | ¿Cómo te va con Facturacon? |

## Internos (llegan a contacto@) (5)

| Correo | Cuándo se manda | Para | Se manda | Asunto de ejemplo |
|---|---|---|---|---|
| **Mensaje del formulario de contacto** (`interno_contacto_web`) | Cuando alguien escribe desde la web | Equipo Facturacon | Siempre | Contacto web: Ana |
| **Pago fallido (cliente)** (`interno_pago_fallido`) | Cuando falla el cobro de un cliente | Equipo Facturacon | Siempre (aviso) | Pago fallido: ABC Facturacon |
| **Error con la DGII** (`interno_error_dgii`) | Cuando falla algo grave al hablar con la DGII | Equipo Facturacon | Siempre (aviso) | Error DGII en ABC Facturacon |
| **Cliente certificado** (`interno_cert_aprobada`) | Cuando un negocio completa su certificación | Equipo Facturacon | Siempre (aviso) | ¡Certificado! ABC Facturacon |
| **Rechazo en certificación (cliente)** (`interno_cert_rechazo`) | Cuando la DGII rechaza un paso de un cliente | Equipo Facturacon | Siempre (aviso) | Rechazo DGII en ABC Facturacon: Simulación |

**Total: 32 correos.**
