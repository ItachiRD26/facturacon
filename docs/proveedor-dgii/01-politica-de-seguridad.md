# Anexo 1.1 — Política de Seguridad de la Información

**Organización:** ABC FACTURACON (nombre comercial de PETER JETER GARCIA RODRIGUEZ) — RNC/Cédula 40212171397
**Versión:** 0.1 (borrador) · **Fecha:** [fecha de aprobación] · **Responsable:** Peter Jeter García Rodríguez, Dueño
**Alcance:** la plataforma web de facturación electrónica Facturacon (www.facturacon.com.do), sus bases de datos, la custodia de certificados digitales y todo el personal y proveedores que intervienen en el servicio.

> Los puntos marcados `[PENDIENTE]` no están implementados todavía y deben quedar resueltos (o retirados del texto) antes de entregar este documento a la DGII.

## 1. Objetivo
Proteger la confidencialidad, integridad y disponibilidad de la información de los contribuyentes (comprobantes fiscales electrónicos, datos de clientes y productos, credenciales y certificados digitales) y cumplir con la Ley 32-23 de Facturación Electrónica, la Ley 172-13 de Protección de Datos Personales y las normas de la DGII.

## 2. Responsabilidades
- **Responsable de seguridad:** Peter Jeter García Rodríguez, Dueño. Aprueba esta política, decide sobre incidentes y revisa los accesos.
- **Todo el personal y colaboradores:** guardar confidencialidad, no compartir credenciales y reportar de inmediato cualquier sospecha de incidente.
- **Contribuyentes (clientes):** custodian sus usuarios y contraseñas y la contraseña de su certificado digital.

## 3. Clasificación de la información
| Nivel | Ejemplos | Tratamiento |
|---|---|---|
| Crítica | Certificados digitales (.p12) y sus contraseñas, claves de servicio | Cifrado con KMS; nunca en claro; sin acceso humano |
| Confidencial | Comprobantes, clientes, productos, datos de cuenta | Acceso solo por empresa y rol; cifrado en tránsito y en reposo |
| Interna | Código fuente, configuración | Repositorio privado, acceso restringido |
| Pública | Sitio de marketing, políticas | Sin restricción |

## 4. Control de acceso
- Autenticación con **Firebase Authentication** (correo y contraseña, o cuenta de Google). Las sesiones se verifican en el servidor en cada operación.
- **Roles con permisos mínimos:** Dueño, Administrador, Cajero/Vendedor, Encargado de almacén, Contador y Solo lectura. Cada rol ve solo los módulos que necesita (por ejemplo, el cajero no ve los totales del negocio ni el inventario).
- Los cajeros pueden entrar con un código personal revocable; un cajero revocado deja de tener acceso de inmediato.
- Limitación de intentos (rate limiting) en las rutas sensibles: inicio de sesión, registro, consultas a la DGII y escrituras públicas.
- `[PENDIENTE]` Verificación en dos pasos (2FA) obligatoria para dueños y administradores.
- Las reglas de la base de datos impiden que cajeros, contadores y lectores lean el código de la tarjeta guardada del plan.
- Revisión de accesos de administración al menos cada 6 meses.

## 5. Aislamiento entre contribuyentes
Cada empresa (tenant) tiene sus datos separados. El acceso se controla en dos capas: **reglas de seguridad de Firestore** (solo los miembros de la empresa leen o escriben, según su rol) y **verificación en el servidor** de la pertenencia y el rol antes de cada operación. Las configuraciones sensibles (certificado, token de la DGII, secuencias fiscales) no son accesibles desde el navegador en ningún caso.

## 6. Criptografía
- **En tránsito:** todo el tráfico usa HTTPS (TLS 1.2 o superior) con HSTS (`max-age` de un año). Las comunicaciones con la DGII y con el procesador de pagos también van cifradas.
- **En reposo:** los datos se guardan en Google Cloud Firestore, cifrado en reposo por el proveedor.
- **Certificados digitales:** el archivo `.p12` y su contraseña se cifran con **Google Cloud KMS** antes de guardarse, con el identificador de la empresa como dato autenticado adicional (AAD): un cifrado de una empresa no puede descifrarse con el identificador de otra. Nunca se almacenan ni se muestran en claro, y la contraseña la escribe únicamente el titular del certificado, nunca por correo o chat.
- La firma del XML se realiza en el servidor, en memoria, al momento de emitir.
- Las claves y secretos del sistema viven en variables de entorno del proveedor de alojamiento; nunca en el código ni en el repositorio.

## 7. Seguridad de la aplicación
- Cabeceras de seguridad: HSTS, X-Frame-Options (DENY), X-Content-Type-Options, Referrer-Policy y Permissions-Policy. `[PENDIENTE]` Content-Security-Policy.
- Validación de los datos de entrada en el servidor; los XML se generan siguiendo los formatos y esquemas XSD publicados por la DGII, y las respuestas de la DGII se verifican antes de dar un comprobante por aceptado.
- Los avisos (webhooks) del procesador de pagos se aceptan solo con firma digital válida verificada con su certificado.
- Las tareas programadas (cron) exigen un secreto y rechazan cualquier otra llamada.

## 8. Desarrollo y cambios
- Código en repositorio privado; los despliegues a producción se hacen desde la rama principal con compilación y revisión de tipos.
- Control de cambios mediante el historial del repositorio (autor, fecha y descripción de cada cambio).
- `[PENDIENTE]` Ambiente de pruebas separado de producción.
- Actualización periódica de dependencias y atención a avisos de vulnerabilidades.

## 9. Registro y trazabilidad (bitácora)
- Los comprobantes conservan su estado, fechas, respuesta de la DGII y trazabilidad de envío.
- **Bitácora de auditoría:** el sistema registra quién, qué, cuándo y desde qué dirección IP en las operaciones sensibles: inicio y cierre de sesión, carga o renovación del certificado digital, altas, cambios de rol y bajas de personas del equipo, accesos de cajeros, permisos de facturación, cambios de secuencias fiscales, emisión y reenvío de comprobantes, activación y cancelación del plan y cobros.
- Los registros solo los escribe el servidor, no se pueden editar ni borrar desde la aplicación, no contienen contraseñas, claves ni datos de tarjeta, y el dueño y los administradores los consultan en la sección «Actividad» del panel.
- **Retención:** 24 meses; después se eliminan automáticamente.

## 10. Respaldo y recuperación
Ver la *Política de Contingencia* (Anexo 1.2): recuperación a un punto en el tiempo (7 días), respaldo diario (7 días) y semanal (14 semanas), protección contra borrado y prueba de restauración cada 6 meses.

## 11. Gestión de incidentes
1. **Detección:** alertas, reportes de clientes o del equipo.
2. **Contención:** revocar credenciales o accesos afectados, desactivar la función comprometida.
3. **Erradicación y recuperación:** corregir la causa, restaurar desde respaldo si hace falta.
4. **Notificación:** a los contribuyentes afectados y a la DGII sin demora injustificada, con qué ocurrió, qué datos se afectaron y qué medidas se tomaron.
5. **Lecciones aprendidas:** informe interno y mejoras.

## 12. Proveedores y terceros
| Proveedor | Función | Medida |
|---|---|---|
| Vercel | Alojamiento de la aplicación | Conexión cifrada, secretos como variables de entorno |
| Google Cloud / Firebase | Base de datos, autenticación y KMS | Cifrado en reposo; permisos mínimos por cuenta de servicio |
| Pagadito | Cobro de suscripciones | La tarjeta viaja cifrada; no se almacena número ni CVV |
| Zoho Mail | Envío de correos transaccionales | Contraseña de aplicación; no se envían claves ni datos de tarjeta |

## 13. Revisión
Esta política se revisa al menos una vez al año y cuando ocurra un incidente o un cambio importante. Historial de versiones: 0.1 — borrador inicial.
