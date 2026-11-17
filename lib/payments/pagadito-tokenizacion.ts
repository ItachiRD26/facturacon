// Integración con el API REST de Tokenización de Pagadito ("PG-TokenizationPayment",
// doc oficial 2023 compartida por Pagadito vía Drive el 2026-06-30) — DISTINTA del
// WSPG/SOAP de pagadito.ts (ese es el redirect de pago único que activa la
// certificación; este es para guardar la tarjeta y cobrar el plan mensual de forma
// recurrente sin que el cliente vuelva a ingresar sus datos).
//
// A diferencia del checkout por redirect (donde la tarjeta nunca toca nuestro
// servidor), esta API exige enviar el número/CVV de la tarjeta directo a estos
// endpoints vía POST con autenticación HTTP Basic (UID/WSK) — eso solo se puede
// hacer server-side, porque el WSK nunca puede exponerse al navegador. Implica
// que el número de tarjeta SÍ transita por nuestro backend (nunca se debe loggear
// ni persistir crudo) — alcance PCI más alto (SAQ A-EP) que el flujo de redirect.
//
// Pendiente de verificar contra una cuenta de Sandbox real (aún no creada al
// escribir esto): los nombres exactos de campos y códigos de error ya están
// confirmados contra la documentación oficial, así que el riesgo de "formato
// incorrecto" aquí es bajo — lo que sí hay que probar en vivo es el flujo
// completo (Device Fingerprint real, tarjetas de prueba, webhooks).
import "server-only";

const SANDBOX = process.env.PAGADITO_ENV !== "live";
const BASE_URL = SANDBOX
  ? "https://sandbox-api.pagadito.com/v1/"
  : "https://api.pagadito.com/v1/";

function credenciales(): { uid: string; wsk: string } {
  // trim(): al pegar una variable en Vercel suele colarse un espacio o salto de línea al final, y con eso
  // la autenticación Basic falla (401) aunque la clave sea correcta.
  const uid = process.env.PAGADITO_UID?.trim();
  const wsk = process.env.PAGADITO_WSK?.trim();
  if (!uid || !wsk) throw new Error("Pagadito no está configurado (faltan PAGADITO_UID/PAGADITO_WSK).");
  return { uid, wsk };
}

// Diagnóstico SIN secretos para los logs del servidor cuando Pagadito rechaza el acceso (401/403): ambiente,
// servidor al que se llamó, largo de las claves y si traían espacios sobrantes.
function diagnosticoAcceso(recurso: string, res: Response): string {
  const uid = process.env.PAGADITO_UID ?? "", wsk = process.env.PAGADITO_WSK ?? "";
  const host = new URL(BASE_URL).host;
  const info = {
    recurso, http: res.status, ambiente: SANDBOX ? "sandbox" : "live", host,
    uidLargo: uid.trim().length, wskLargo: wsk.trim().length,
    uidConEspacios: uid !== uid.trim(), wskConEspacios: wsk !== wsk.trim(),
    wwwAuthenticate: res.headers.get("www-authenticate") ?? undefined, server: res.headers.get("server") ?? undefined,
  };
  console.error("[pagadito-tokenizacion] acceso rechazado:", JSON.stringify(info));
  return JSON.stringify({ ambiente: info.ambiente, host: info.host });
}

export interface RespuestaTokenizacion<T> {
  response_code: string;
  response_message: string;
  request_id?: string;
  request_date?: string;
  customer_reply?: T;
}

// ── Tipos de los objetos que pide el API (nombres en inglés — son el
//    contrato exacto de Pagadito, no se traducen) ──────────────────────────
export interface TarjetaPagadito {
  number: string;
  expirationDate: string; // MM/YYYY
  cvv: string;
  cardHolderName: string;
  firstName: string;
  lastName: string;
  billingAddress: {
    city: string; state: string; zip?: string;
    countryId: string; line1: string; phone: string;
  };
  email: string;
}

export interface DetalleTransaccion { quantity: string; description: string; amount: string }

export interface TransaccionPagadito {
  merchantTransactionId: string;
  currencyId: "USD";
  transactionDetails: DetalleTransaccion[];
}

export interface BrowserInfoPagadito { deviceFingerprintID: string; customerIp: string }

export interface RecurringPagadito {
  interval: "week" | "month" | "year";
  interval_count: number;
  first_interval_free: boolean;
  merchantTransactionId: string;
  description: string;
  interval_amount: string;
}

interface CustomerReplyPago {
  payment_token: string; authorization: string; merchantTransactionId: string;
  totalAmount: string; firstName: string; lastName: string; paymentDate: string;
}

interface CustomerReplySuscripcion {
  authorization: string; paymentDate: string; payment_token: string;
  recurring: {
    amount: string; merchantTransactionId: string; period: string; subscription_code: string;
    client: { firstName: string; lastName: string; email: string };
  };
}

async function llamarTokenizacion<T>(recurso: string, body: unknown): Promise<RespuestaTokenizacion<T>> {
  const { uid, wsk } = credenciales();
  const auth = Buffer.from(`${uid}:${wsk}`).toString("base64");

  const res = await fetch(`${BASE_URL}${recurso}`, {
    method: "POST",
    headers: {
      "Content-Type": "Application/json;charset=UTF-8",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(body),
  });

  const texto = await res.text();
  let data: RespuestaTokenizacion<T>;
  try {
    data = JSON.parse(texto) as RespuestaTokenizacion<T>;
  } catch {
    const extra = res.status === 401 || res.status === 403 ? ` · ${diagnosticoAcceso(recurso, res)}` : "";
    throw new Error(`Pagadito Tokenización (${recurso}): respuesta no-JSON (HTTP ${res.status}) — ${texto.substring(0, 300)}${extra}`);
  }

  if (data.response_code !== "PG200-00") {
    throw new Error(`Pagadito Tokenización (${recurso}) falló: ${data.response_code} — ${data.response_message}`);
  }
  return data;
}

// POST /v1/customer — tokeniza la tarjeta Y cobra el primer monto en el mismo
// paso. Devuelve payment_token para cobros futuros sin re-pedir la tarjeta.
export async function tokenizarYCobrar(params: {
  card: TarjetaPagadito; transaction: TransaccionPagadito; browserInfo: BrowserInfoPagadito;
}): Promise<CustomerReplyPago> {
  const rs = await llamarTokenizacion<CustomerReplyPago>("customer", params);
  if (!rs.customer_reply) throw new Error("Pagadito Tokenización (customer) no devolvió customer_reply.");
  return rs.customer_reply;
}

// POST /v1/payment — cobra usando un payment_token ya existente, sin volver a
// pedir los datos de la tarjeta.
export async function cobrarConToken(params: {
  payment_token: string; transaction: TransaccionPagadito; browserInfo: BrowserInfoPagadito;
}): Promise<CustomerReplyPago> {
  const rs = await llamarTokenizacion<CustomerReplyPago>("payment", params);
  if (!rs.customer_reply) throw new Error("Pagadito Tokenización (payment) no devolvió customer_reply.");
  return rs.customer_reply;
}

// POST /v1/subscription — tokeniza la tarjeta y crea la suscripción recurrente
// en el mismo paso (cobra el primer ciclo salvo first_interval_free=true).
export async function crearSuscripcion(params: {
  card: TarjetaPagadito; recurring: RecurringPagadito; browserInfo: BrowserInfoPagadito;
}): Promise<CustomerReplySuscripcion> {
  const rs = await llamarTokenizacion<CustomerReplySuscripcion>("subscription", params);
  if (!rs.customer_reply) throw new Error("Pagadito Tokenización (subscription) no devolvió customer_reply.");
  return rs.customer_reply;
}

// POST /v1/subscription-by-token — crea una suscripción recurrente reusando
// un payment_token ya tokenizado (ej. tenant que ya guardó su tarjeta y luego
// decide pasar a un plan con cobro mensual).
export async function crearSuscripcionConToken(params: {
  payment_token: string; recurring: RecurringPagadito; browserInfo: BrowserInfoPagadito;
}): Promise<CustomerReplySuscripcion> {
  const rs = await llamarTokenizacion<CustomerReplySuscripcion>("subscription-by-token", params);
  if (!rs.customer_reply) throw new Error("Pagadito Tokenización (subscription-by-token) no devolvió customer_reply.");
  return rs.customer_reply;
}

// POST /v1/subscription-cancel
export async function cancelarSuscripcion(subscriptionCode: string): Promise<void> {
  await llamarTokenizacion("subscription-cancel", { subscription_code: subscriptionCode });
}

// POST /v1/refund — reembolsa un cobro ya aprobado (one-time o de un ciclo de
// suscripción) por su número de autorización.
export async function reembolsar(authorization: string, reason: string): Promise<{ amount: string; authorization: string }> {
  const { uid, wsk } = credenciales();
  const auth = Buffer.from(`${uid}:${wsk}`).toString("base64");
  const res = await fetch(`${BASE_URL}refund`, {
    method: "POST",
    headers: { "Content-Type": "Application/json;charset=UTF-8", Authorization: `Basic ${auth}` },
    body: JSON.stringify({ authorization, reason }),
  });
  const data = await res.json() as RespuestaTokenizacion<unknown> & { amount?: string };
  if (data.response_code !== "PG200-00") {
    throw new Error(`Pagadito Tokenización (refund) falló: ${data.response_code} — ${data.response_message}`);
  }
  return { amount: data.amount ?? "", authorization };
}
