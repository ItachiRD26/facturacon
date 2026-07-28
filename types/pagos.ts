export type MarcaTarjeta = "visa" | "mastercard" | "amex" | "otra";

export interface MetodoPago {
  id:             string;
  marca:          MarcaTarjeta;
  ultimos4:       string;
  vencimiento:    string; // "MM/YY"
  predeterminado: boolean;
  creadoEn?:      string;
}

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
}
