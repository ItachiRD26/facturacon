# Anexo 1.3 — Política de Protección de Datos Personales (pública)

> Texto pensado para publicarse en www.facturacon.com.do/privacidad. **Requiere revisión de un abogado** antes de publicarse. Lo marcado `[COMPLETAR]` lo debe llenar Facturacon.
> Marco: Ley núm. 172-13 sobre Protección Integral de los Datos Personales y Ley núm. 32-23 de Facturación Electrónica.

**Última actualización:** [fecha]

## 1. Quién es el responsable
**ABC FACTURACON** (plataforma Facturacon), nombre comercial de **PETER JETER GARCIA RODRIGUEZ**, RNC/Cédula 40212171397, domicilio Playa Juan de Bolanos Bugalow #3, Montecristi, correo `contacto@facturacon.com.do`. Para los datos de las empresas que usan la plataforma, Facturacon actúa como proveedor de servicios (encargado del tratamiento) y cada contribuyente es el responsable de los datos de sus propios clientes.

## 2. Qué datos tratamos
- **De la cuenta:** nombre, correo, teléfono y método de acceso (correo o cuenta de Google).
- **De la empresa:** RNC o cédula, razón social, nombre comercial, dirección, actividad económica, representante.
- **Operativos que el contribuyente ingresa:** clientes (nombre, RNC o cédula, contacto), productos y servicios, comprobantes fiscales electrónicos, cotizaciones, cuentas por cobrar y facturas recibidas de proveedores.
- **Certificado de firma digital** (.p12) y su contraseña: se cifran con Google Cloud KMS y no se muestran ni se almacenan en claro.
- **Pagos:** el procesador de pagos (Pagadito) recibe los datos de la tarjeta por una conexión cifrada. Facturacon **no almacena** el número completo ni el código de seguridad; solo conserva un código seguro del procesador, los últimos 4 dígitos y el historial de cobros.
- **Técnicos:** dirección IP, tipo de navegador y registros de uso para seguridad y funcionamiento.

## 3. Para qué los usamos (finalidades)
1. Prestar el servicio de facturación electrónica: emitir, firmar, enviar a la DGII y conservar comprobantes.
2. Gestionar la cuenta, los usuarios y los pagos de la suscripción.
3. Comunicarnos con el contribuyente (avisos del servicio, soporte, vencimiento de certificado, cobros).
4. Garantizar la seguridad y prevenir fraudes.
5. Cumplir obligaciones legales y requerimientos de la DGII.

No vendemos datos personales ni los usamos para publicidad de terceros.

## 4. Base de legitimación
Consentimiento del titular al registrarse, ejecución del contrato de servicio, cumplimiento de obligaciones legales (en especial las tributarias) e interés legítimo en la seguridad del servicio.

## 5. Con quién los compartimos
| Destinatario | Para qué |
|---|---|
| **DGII** | Recepción y validación de los comprobantes, certificación y requerimientos legales |
| **Google Cloud / Firebase** | Base de datos, autenticación y cifrado de certificados |
| **Vercel** | Alojamiento de la aplicación |
| **Pagadito** | Cobro de la suscripción |
| **Zoho** | Envío de correos del servicio |
| Autoridades competentes | Cuando la ley lo exija |

## 6. Transferencias internacionales
Algunos de estos proveedores procesan datos en servidores fuera de República Dominicana (principalmente Estados Unidos). Se utilizan proveedores con medidas de seguridad reconocidas y conexiones cifradas. `[COMPLETAR: confirmar regiones del servicio.]`

## 7. Cuánto tiempo los conservamos
Los comprobantes fiscales y sus registros se conservan durante los plazos que exige la normativa tributaria `[COMPLETAR con el contador/abogado: plazo aplicable]`. Los demás datos se conservan mientras la cuenta esté activa y, al cerrarla, por el tiempo necesario para cumplir obligaciones legales; luego se eliminan o anonimizan.

## 8. Cómo protegemos los datos
Cifrado en tránsito (HTTPS/TLS con HSTS) y en reposo, certificados digitales cifrados con KMS, aislamiento de los datos de cada empresa, control de acceso por roles, limitación de intentos y registro de operaciones sensibles. Detalles en nuestra *Política de Seguridad*. Si ocurre un incidente que afecte datos personales, lo notificaremos a los afectados y a la autoridad competente conforme a la ley.

## 9. Tus derechos
Puedes ejercer los derechos de **acceso, rectificación, actualización y supresión (cancelación)** de tus datos, así como oponerte a ciertos tratamientos. Escríbenos a `contacto@facturacon.com.do` con tu nombre y el derecho que ejerces; te responderemos en un plazo máximo de `[COMPLETAR: por ejemplo 10 días hábiles]`.
Algunos datos no pueden eliminarse mientras la ley obligue a conservarlos (por ejemplo, los comprobantes fiscales).

## 10. Almacenamiento en el navegador
Usamos almacenamiento local y cookies necesarias para mantener tu sesión y recordar preferencias (como el tema). No usamos cookies publicitarias. `[COMPLETAR si se agregan analíticas.]`

## 11. Menores de edad
El servicio es para contribuyentes y empresas; no está dirigido a menores de edad.

## 12. Cambios a esta política
Publicaremos aquí cualquier cambio y, si es importante, te avisaremos por correo.

## 13. Contacto
`contacto@facturacon.com.do` · 809-962-2259
