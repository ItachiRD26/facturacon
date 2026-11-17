# Proveedor de Servicios de Facturación Electrónica — checklist y brechas

Fuente oficial: *Guía para ser Proveedores de Servicios de FE Autorizados* y *Documentaciones soporte para la autorización y certificación de Proveedores de Servicios de FE* (DGII, julio 2025).
Estado al 2026-11-17. **Los textos de esta carpeta son borradores**: describen los controles que Facturacon tiene hoy; lo marcado `[PENDIENTE]` hay que implementarlo (o decidirlo) antes de firmar ante la DGII.

## 1. Requisitos de autorización
| Requisito (DGII) | Estado | Qué falta |
|---|---|---|
| RNC activo y clave de la Oficina Virtual | Listo | — |
| Autorizado y certificado como **Emisor Electrónico** | Listo (certificado el 2026-11-17) | — |
| Certificado digital de **persona física** (Ley 126-02) | Listo | Vigencia: se avisa por correo antes de vencer |
| Actividad económica de **venta/desarrollo de software** | Listo según Peter («Diseño y Desarrollo de Software») | Confirmar que figure así en la OFV |
| Al día en obligaciones formales y sustantivas | Verificar | Peter, con su contador |
| Cumplir exigencias técnicas de la DGII | En curso | Sets de pruebas como proveedor (pasos 2–13 del portal) |
| Posible mínimo de contribuyentes certificados (¿3?) | **Preguntar** | Aparece en un resultado de búsqueda, no en las guías oficiales. Preguntar a la Gerencia de Facturación si exige un mínimo y si cuentan los certificados con sistemas a la medida |

## 2. Documentos de soporte (Anexos)
| Anexo | Documento | Estado |
|---|---|---|
| 1.1 | Política de Seguridad | Borrador listo: `01-politica-de-seguridad.md` |
| 1.2 | Política de Contingencia | Borrador listo: `02-politica-de-contingencia.md` |
| 1.3 | Política de Protección de Datos **pública** (Ley 172-13) con la URL | Borrador listo: `03-politica-de-proteccion-de-datos.md`. Falta revisión de un abogado y publicarla (hoy `/privacidad` es un borrador distinto) |
| 1.4 | Vías de asistencia y tiempos de respuesta | Listo con los tiempos de Peter (30 min a 1 h en urgentes). Falta confirmar el horario de atención |
| 1.5 | Contacto para la DGII (nombre, cargo, correo, teléfono directo) | Completado con los datos de Peter: `05-contacto-dgii.md` |
| 1.6 | Certificación de seguridad (ISO 27001 u otra) | Opcional; no se tiene |

## 3. Consideraciones técnicas exigidas
| Exigencia | Estado | Acción |
|---|---|---|
| **Bitácora de eventos (logs)** con trazabilidad y control de cambios | **Falta** | `[PENDIENTE]` Registro de auditoría (quién, qué, cuándo, desde dónde) para: inicio de sesión, subida/cambio de certificado, emisión y anulación de comprobantes, cambios de usuarios/roles, cambios de plan. Hoy solo hay logs de Vercel |
| **Respaldo y recuperación** | **Falta** | `[PENDIENTE]` Activar respaldos programados de Firestore (y recuperación a un punto en el tiempo), probar una restauración y documentar RPO/RTO |
| Página web activa | Listo | — |
| Mesa de ayuda | Parcial | Existe «Ayuda y soporte» en el panel; definir horario y tiempos |
| Niveles de servicio (disponibilidad mínima) | **Definir** | Elegir y publicar una meta realista; apoyarse en las garantías de Vercel y Google Cloud |
| Custodia segura de certificados digitales | Listo | Cifrado con Google Cloud KMS (ver política) |

## 4. Endurecimiento recomendado antes de enviar (no es exigencia escrita, pero respalda la solicitud)
- `[PENDIENTE]` Verificación en dos pasos (2FA) para dueños y administradores.
- `[PENDIENTE]` Cabecera CSP (hoy hay HSTS, X-Frame-Options, nosniff, Referrer-Policy y Permissions-Policy).
- `[PENDIENTE]` Ambiente de pruebas separado de producción (hoy comparten Firebase).
- `[PENDIENTE]` Alertas y monitoreo de caídas y de errores de emisión.
- `[PENDIENTE]` Prueba de intrusión o escaneo de vulnerabilidades independiente.
- `[PENDIENTE]` Quitar `ignoreBuildErrors` de `next.config.ts` y dejar el despliegue con la compilación estricta.
- `[PENDIENTE]` Términos de servicio y política de privacidad revisados por un abogado.

## 5. Trámite
1. En la OFV / portal de Facturación Electrónica: crear la postulación de proveedor (descargar el formulario, firmarlo por el representante y cargarlo).
2. Confirmar por teléfono el canal y si hay mínimo de contribuyentes certificados (anotar nombre y fecha de quien atienda).
3. Subir los anexos 1.1–1.5 y la URL pública de 1.3.
4. Pasar los sets de pruebas como proveedor (13 pasos del portal), la Declaración Jurada y esperar la resolución.
