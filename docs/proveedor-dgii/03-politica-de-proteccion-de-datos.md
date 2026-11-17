# Anexo 1.3 — Política de Protección de Datos Personales (pública)

> **Borrador para revisión de un abogado.** Pensado para publicarse en www.facturacon.com.do/privacidad. Basado en la Ley núm. 172-13 sobre Protección Integral de los Datos Personales (artículos citados según una copia del texto de la ley; el abogado debe verificarlos) y en la Ley núm. 32-23 de Facturación Electrónica.
> Lo marcado `[ABOGADO]` es una decisión o redacción que le corresponde a él; `[COMPLETAR]` lo llena Facturacon.

**Última actualización:** [fecha de publicación]

## 1. Responsable y contacto
El responsable del tratamiento es **ABC FACTURACON** (plataforma Facturacon), nombre comercial de **PETER JETER GARCIA RODRIGUEZ**, RNC/Cédula 40212171397, con domicilio en Playa Juan de Bolanos Bugalow #3, Montecristi, República Dominicana. Correo para temas de datos personales: `contacto@facturacon.com.do`. Teléfono: 809-962-2259.

**Dos papeles distintos.**
- Sobre los datos de **tu cuenta y tu suscripción** (quién eres, cómo te cobramos, cómo te contactamos), Facturacon es el *responsable* del tratamiento.
- Sobre los datos que tú cargas para facturar (tus clientes, productos, comprobantes), **tú eres el responsable** y Facturacon es tu *encargado*: los trata únicamente por tu cuenta y según tus instrucciones, para prestarte el servicio (ver el *Acuerdo de tratamiento de datos* que acompaña a los Términos).

## 2. Qué datos tratamos
| Categoría | Datos | De dónde vienen |
|---|---|---|
| Cuenta | Nombre, correo, teléfono, método de acceso (correo o cuenta de Google) | De ti |
| Empresa | RNC o cédula, razón social, nombre comercial, dirección, actividad económica, representante | De ti y de la DGII |
| Operación de tu negocio | Clientes (nombre, RNC o cédula, contacto), productos y servicios, comprobantes fiscales electrónicos, cotizaciones, cuentas por cobrar, facturas recibidas de proveedores | De ti |
| Equipo | Nombre, rol y código de acceso (se guarda cifrado) de tus cajeros y usuarios | De ti |
| Certificado digital | Archivo .p12 y su contraseña, cifrados con Google Cloud KMS | De ti |
| Pagos | Últimos 4 dígitos de la tarjeta, nombre del titular, un código seguro del procesador (token) e historial de cobros. **No guardamos el número completo ni el código de seguridad** | De ti y de Pagadito |
| Uso y seguridad | Fecha, hora, dirección IP y navegador en inicios de sesión y acciones importantes (bitácora de actividad) | Automático |

No recopilamos **datos sensibles** (origen racial, salud, opiniones políticas, religión, vida sexual, etc.) y te pedimos no cargarlos.

## 3. Para qué los usamos y con qué fundamento
| Finalidad | Fundamento |
|---|---|
| Prestarte el servicio de facturación electrónica: emitir, firmar, enviar a la DGII y conservar tus comprobantes | Ejecución del contrato y obligación legal |
| Crear y administrar tu cuenta y tu equipo; cobrar tu suscripción | Ejecución del contrato |
| Avisos del servicio (cobros, certificado por vencer, comprobantes pendientes), soporte | Ejecución del contrato e interés legítimo |
| Seguridad, prevención de fraude y trazabilidad de operaciones (bitácora) | Interés legítimo y obligación de seguridad |
| Cumplir requerimientos de la DGII y de otras autoridades | Obligación legal |

No vendemos tus datos ni los usamos para publicidad de terceros. Solo te enviamos comunicaciones comerciales si lo aceptas, y puedes darte de baja cuando quieras.

## 4. Tu autorización
Al crear tu cuenta y aceptar estos documentos, autorizas de forma **libre, expresa y consciente** el tratamiento descrito aquí, incluida la transferencia a los proveedores de la sección 6. Dejamos constancia de tu aceptación (fecha y versión). Puedes retirar tu autorización cerrando tu cuenta, sin perjuicio de los datos que la ley nos obligue a conservar. `[ABOGADO: confirmar que el registro con casilla de aceptación basta como consentimiento por medio equivalente al escrito.]`

## 5. Con quién los compartimos
| Destinatario | Para qué |
|---|---|
| **DGII** | Recepción y validación de comprobantes, certificación y requerimientos |
| **Google Cloud / Firebase** | Base de datos, autenticación y cifrado de certificados |
| **Vercel** | Alojamiento de la aplicación |
| **Pagadito** | Procesamiento del cobro de tu suscripción |
| **Zoho** | Envío de correos del servicio |
| Autoridades competentes | Cuando la ley o una orden judicial lo exija |

## 6. Transferencias internacionales
Algunos proveedores tratan los datos en servidores ubicados fuera de la República Dominicana, principalmente en Estados Unidos (por ejemplo, la base de datos está en la multirregión de EE. UU. de Google Cloud). Estas transferencias se hacen con tu autorización (sección 4) y con proveedores que aplican medidas de seguridad reconocidas y conexiones cifradas. `[ABOGADO: revisar el cumplimiento del artículo 80.]` `[COMPLETAR: confirmar las regiones exactas de cada proveedor.]`

## 7. Cuánto tiempo conservamos los datos
- **Comprobantes fiscales y su respaldo:** durante el plazo que exige la normativa tributaria. `[ABOGADO/CONTADOR: indicar el plazo aplicable.]`
- **Datos de la cuenta:** mientras la cuenta esté activa.
- **Al cerrar la cuenta:** los datos se **bloquean** (no se usan para nada más) y se conservan solo el tiempo necesario para cumplir obligaciones legales y atender reclamaciones; vencido ese plazo se **eliminan o anonimizan**.
- **Bitácora de actividad:** 24 meses.
- **Respaldos:** diarios por 7 días y semanales por 14 semanas; los datos eliminados desaparecen de los respaldos al cumplirse esos plazos.

## 8. Cómo protegemos los datos
Cifrado en tránsito (HTTPS con HSTS) y en reposo; certificados digitales cifrados con Google Cloud KMS; aislamiento de los datos de cada empresa; control de acceso por roles; límite de intentos; bitácora de auditoría; respaldos y recuperación; y un equipo con deber de confidencialidad. Detalles en nuestra *Política de Seguridad*. Si ocurre un incidente que afecte tus datos, te lo notificaremos sin demora indebida, con lo ocurrido y lo que estamos haciendo. `[ABOGADO: la ley no fija un plazo de notificación; confirmar la redacción.]`

## 9. Tus derechos y cómo ejercerlos
Tienes derecho a **acceder** a tus datos, **rectificarlos y actualizarlos**, pedir su **supresión (cancelación)** y **oponerte** a ciertos tratamientos, y a reclamar por la vía judicial (hábeas data) si no te respondemos.

Escribe a `contacto@facturacon.com.do` indicando tu nombre, tu RNC o cédula y el derecho que ejerces. Te respondemos:
- **Acceso:** en un máximo de **5 días hábiles**.
- **Rectificación, actualización o supresión:** en un máximo de **10 días hábiles**, de forma **gratuita**.

La supresión no procede cuando exista una obligación legal o contractual de conservar los datos (por ejemplo, los comprobantes fiscales); en ese caso quedan bloqueados. Si eres cliente de un negocio que usa Facturacon, tus derechos sobre tus datos los ejerces ante ese negocio, y nosotros lo apoyaremos con lo que necesite.

## 10. Almacenamiento en tu navegador
Usamos almacenamiento local y cookies necesarias para mantener tu sesión y recordar preferencias (como el tema). No usamos cookies publicitarias. `[COMPLETAR si se añaden herramientas de analítica.]`

## 11. Menores de edad
El servicio es para contribuyentes y empresas; no está dirigido a menores de edad.

## 12. Cambios
Publicaremos aquí cualquier cambio con su fecha y, si es importante, te avisaremos por correo.
