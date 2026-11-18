// Acciones que se registran en la bitácora de auditoría y cómo se muestran en pantalla. Módulo puro (sin servidor):
// lo usan tanto el registrador como la página «Actividad».
export const ACCIONES_AUDITORIA = {
  "sesion.inicio": "Inició sesión",
  "sesion.cierre": "Cerró sesión",
  "cuenta.terminos": "Aceptó los términos y la política de privacidad",
  "cuenta.mfa_activada": "Activó la verificación en dos pasos",
  "cuenta.mfa_desactivada": "Desactivó la verificación en dos pasos",
  "certificado.renovado": "Cargó o renovó el certificado digital",
  "usuario.agregado": "Agregó a una persona al equipo",
  "usuario.rol": "Cambió el rol de una persona",
  "usuario.eliminado": "Quitó a una persona del equipo",
  "empleado.creado": "Creó un acceso de cajero",
  "empleado.codigo": "Generó un código nuevo para un cajero",
  "empleado.revocado": "Revocó el acceso de un cajero",
  "permisos.cambio": "Cambió quién puede facturar",
  "secuencias.cambio": "Cambió una secuencia fiscal",
  "factura.emitida": "Emitió un comprobante",
  "factura.reintento": "Reenvió un comprobante a la DGII",
  "factura.sincronizacion": "Envió comprobantes pendientes a la DGII",
  "plan.activado": "Activó el plan",
  "plan.cancelado": "Canceló el plan",
  "cobro.ciclo": "Cobro del plan",
} as const;

export type AccionAuditoria = keyof typeof ACCIONES_AUDITORIA;

export const etiquetaAccion = (a: string): string => (ACCIONES_AUDITORIA as Record<string, string>)[a] ?? a;
