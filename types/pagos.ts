// Suscripción de cobro recurrente mensual (Pagadito Tokenización) — activa el
// cobro del plan mes a mes una vez el tenant ya está certificado. Vive en
// tenants/{tenantId}/facturacion/suscripcion, escrita solo por el backend
// (ver firestore.rules) porque payment_token/subscription_code son
// credenciales de cobro, no datos de visualización.
export type EstadoSuscripcion = "activa" | "cancelada" | "pago_fallido";

export interface Suscripcion {
  paymentToken:      string;
  subscriptionCode?: string;   // solo en suscripciones del modelo viejo (Pagadito cobraba por su cuenta)
  planId:            string;
  facturasMes:       number;
  montoUSD:          string;   // lo que se cobra cada vez (una mensualidad, o el año completo)
  periodo?:          "mensual" | "anual";   // ausente = mensual (suscripciones anteriores)
  // Datos del primer cobro (los pide Pagadito en la certificación técnica y sirven de recibo).
  ern?:              string;   // número de comprobante que enviamos a Pagadito
  autorizacion?:     string;   // número de aprobación que devolvió Pagadito
  interno?:          boolean;              // cuenta propia de Facturacon (cliente cero): sin tarjeta ni cobro
  ilimitado?:        boolean;              // sin tope de comprobantes ni de usuarios de caja (cuenta propia)
  estado:            EstadoSuscripcion;
  cardHolderName?:   string;
  ultimos4?:         string;
  creadoEn?:         string;
  actualizadoEn?:    string;
  ultimoPagoEn?:     string;
  // Datos del dispositivo con que se activó el plan: Pagadito los pide en cada cobro con
  // token, y los adicionales de fin de mes se cobran sin que el cliente esté presente.
  browserInfo?:      { deviceFingerprintID: string; customerIp: string };

  // ── Cobro propio (lib/payments/cobros.ts): Facturacon decide cada cobro con el token guardado ──
  // El plan y los adicionales de los meses cerrados se cobran JUNTOS el día del aniversario.
  cobroPropio?:      boolean;
  anclaCobro?:       string;   // fecha del primer cobro (YYYY-MM-DD): de ahí salen todos los aniversarios
  cicloActual?:      number;   // número del ciclo que toca cobrar a continuación (0 = el primero, ya cobrado al activar)
  proximoCobroEn?:   string;   // fecha de vencimiento del siguiente cobro
  proximoIntentoEn?: string;   // si el cobro falló: fecha del siguiente reintento
  intentosFallidos?: number;   // intentos fallidos del ciclo en curso (al llegar a 3 se suspende)
  adicionalesFacturadosHasta?: string;   // último mes (YYYY-MM) cuyos adicionales ya se cobraron
  ultimoErn?:        string;
  ultimoError?:      string;
  ultimoEventoPagadito?: { ern: string; estado: string; cuando: string };
  montoUltimoCobroRD?:  number;
  montoUltimoCobroUSD?: string;
}

// Un intento de cobro de ciclo: tenants/{id}/facturacion/cargos/ciclos/{id}.
export interface CicloCobro {
  fecha: string;               // vencimiento del ciclo
  intento: number;             // 1, 2, 3
  estado: "cobrado" | "fallido";
  planRD: number; adicionalesRD: number; totalRD: number; totalUSD: string;
  meses: string[];             // meses cuyos adicionales se cobraron aquí
  ern: string; autorizacion?: string; error?: string;
  motivo?: "ciclo" | "cancelacion";
  creadoEn: string;
}
