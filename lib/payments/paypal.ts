// Integración con PayPal (REST Orders v2) para el pago único de
// certificación que se cobra antes de iniciar el wizard de 15 pasos.
//
// PayPal no liquida en pesos dominicanos (DOP), así que el cobro se hace en
// USD. El monto de referencia en la landing (RD$ 15,000) todavía no es un
// precio cerrado — MONTO_CERTIFICACION_USD es un placeholder explícito hasta
// que se confirme una tasa/monto final con el usuario.
import "server-only";

const BASE_URL = process.env.PAYPAL_ENV === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

export const MONTO_CERTIFICACION_USD = "250.00";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("PayPal no está configurado (faltan credenciales).");

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`No se pudo autenticar con PayPal (${res.status})`);
  const data = await res.json();
  return data.access_token as string;
}

export interface OrdenPayPal {
  id: string;
  status: string;
}

export async function crearOrden(tenantId: string, referencia: string): Promise<OrdenPayPal> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: referencia,
        custom_id: tenantId,
        description: "Certificación como emisor electrónico — Facturacon",
        amount: { currency_code: "USD", value: MONTO_CERTIFICACION_USD },
      }],
    }),
  });
  if (!res.ok) throw new Error(`No se pudo crear la orden de PayPal (${res.status})`);
  const data = await res.json();
  return { id: data.id, status: data.status };
}

export interface CapturaPayPal {
  id: string;
  status: string;
  montoCapturado: string;
  monedaCapturada: string;
}

export async function capturarOrden(orderId: string): Promise<CapturaPayPal> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`No se pudo capturar el pago de PayPal (${res.status})`);
  const data = await res.json();
  const captura = data.purchase_units?.[0]?.payments?.captures?.[0];
  if (!captura) throw new Error("PayPal no devolvió una captura válida.");
  return {
    id: captura.id,
    status: captura.status,
    montoCapturado: captura.amount?.value ?? "",
    monedaCapturada: captura.amount?.currency_code ?? "",
  };
}
