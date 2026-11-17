# Anexo 1.2 — Política de Contingencia y Continuidad Operativa

**Organización:** Facturacon — [razón social y RNC]
**Versión:** 0.1 (borrador) · **Fecha:** [fecha de aprobación] · **Responsable:** [nombre y cargo]

> Lo marcado `[PENDIENTE]` aún no está implementado o falta decidirlo.

## 1. Objetivo
Asegurar que los contribuyentes puedan seguir facturando y que ningún comprobante se pierda cuando falle la DGII, la plataforma, un proveedor o los datos.

## 2. Objetivos de recuperación
| Concepto | Meta | Nota |
|---|---|---|
| Disponibilidad mensual de la plataforma | `[DEFINIR, por ejemplo 99.5 %]` | Basada en las garantías de Vercel y Google Cloud |
| RTO (tiempo máximo para restablecer el servicio) | `[DEFINIR, por ejemplo 4 horas]` | |
| RPO (pérdida máxima de datos aceptable) | `[DEFINIR, por ejemplo 24 horas; menos con recuperación a un punto en el tiempo]` | Depende de activar los respaldos |

## 3. Escenarios y respuesta

### A. La DGII no está disponible o rechaza temporalmente la recepción
- **Qué hace el sistema:** el comprobante se emite y queda **pendiente de envío** en lugar de perderse. El contribuyente sigue facturando.
- Un proceso programado **reintenta el envío cada día** y el contribuyente puede reenviar manualmente («sincronizar») cuando quiera.
- Se muestra un **aviso permanente** con la cantidad de comprobantes pendientes, y se le recuerda el límite de **72 horas** para regularizarlos.
- Se conserva el XML firmado y la fecha de firma exacta con la que se emitió.
- Si un comprobante es rechazado por la DGII, se muestra el motivo para corregirlo y reemitirlo.

### B. Falla de la plataforma (alojamiento o base de datos)
1. Confirmar el alcance con el panel de estado de Vercel y Google Cloud.
2. Comunicar a los clientes por correo y en [página de estado] `[PENDIENTE]`.
3. Mientras dure, el contribuyente puede emitir con los mecanismos de contingencia que establezca la DGII para su caso [confirmar con la DGII el procedimiento que aplica a un emisor cuando su proveedor no está disponible].
4. Al restablecerse, enviar a la DGII lo pendiente y verificar que no haya comprobantes duplicados.

### C. Pérdida o corrupción de datos
1. Detener las escrituras afectadas.
2. Restaurar desde el **respaldo** más reciente o desde un punto en el tiempo anterior al daño. `[PENDIENTE]` Activar respaldos programados de Firestore y su retención.
3. Verificar la consistencia (secuencias fiscales, comprobantes enviados a la DGII) y avisar a los afectados.
4. **Prueba de restauración** al menos cada 6 meses `[PENDIENTE]`.

### D. Compromiso de credenciales o certificados
1. Revocar de inmediato la sesión, el usuario o el código afectado.
2. Si hay duda sobre un certificado digital: avisar al titular, que debe **revocarlo y renovarlo** con su entidad certificadora, y sustituirlo en la plataforma.
3. Rotar claves de servicio y secretos.
4. Notificar según la Política de Seguridad.

### E. Falla del servicio de cifrado (KMS) o de los certificados
- Sin KMS no se puede firmar: los comprobantes quedan pendientes (escenario A). Se restablece el acceso y se reanuda el envío.
- Cuando un certificado digital está por vencer, se avisa al contribuyente con anticipación para que lo renueve.

### F. Falla del procesador de pagos
- No afecta la emisión de comprobantes ya activos. Los cobros fallidos se reintentan, se avisa al cliente con fecha límite y solo se suspende después de agotar los reintentos.

## 4. Respaldo y recuperación
- Los datos viven en Google Cloud Firestore con replicación del proveedor.
- `[PENDIENTE]` Respaldos programados (diarios) y recuperación a un punto en el tiempo; copia en otra ubicación; retención [definir].
- Los certificados `.p12` están cifrados con KMS; el contribuyente conserva siempre el original.
- El código fuente está en un repositorio privado con historial completo.

## 5. Comunicación durante una contingencia
| Quién | Cómo | Cuándo |
|---|---|---|
| Contribuyentes | Correo y aviso en el panel | Al detectar la falla y al resolverla |
| DGII | Contacto designado (Anexo 1.5) | Si afecta la recepción de comprobantes o hay incidente de seguridad |
| Equipo interno | [canal] | De inmediato |

## 6. Pruebas y revisión
Se simula al menos una vez al año una caída de la DGII y una restauración de datos, y se documenta el resultado. Esta política se revisa anualmente y tras cualquier incidente.
