// Suscripción de cobro recurrente mensual (Pagadito Tokenización) — activa el
// cobro del plan mes a mes una vez el tenant ya está certificado. Vive en
// tenants/{tenantId}/facturacion/suscripcion, escrita solo por el backend
// (ver firestore.rules) porque payment_token/subscription_code son
// credenciales de cobro, no datos de visualización.
export type EstadoSuscripcion = "activa" | "cancelada" | "pago_fallido";

export interface Suscripcion {
  paymentToken:      string;
  subscriptionCode:  string;
  planId:            string;
  facturasMes:       number;
  montoUSD:          string;
  estado:            EstadoSuscripcion;
  cardHolderName?:   string;
  ultimos4?:         string;
  creadoEn?:         string;
  actualizadoEn?:    string;
  ultimoPagoEn?:     string;
  // Datos del dispositivo con que se activó el plan: Pagadito los pide en cada cobro con
  // token, y los adicionales de fin de mes se cobran sin que el cliente esté presente.
  browserInfo?:      { deviceFingerprintID: string; customerIp: string };
}
