// Integración con Pagadito (servicio WSPG) para el pago único de
// certificación que se cobra antes de iniciar el wizard de 15 pasos.
//
// Reemplaza a PayPal (lib/payments/paypal.ts, eliminado) porque la cuenta de
// PayPal del negocio fue suspendida sin apelación. Pagadito también procesa
// siempre en USD (confirmado en su manual oficial: "Los pagos con Pagadito
// siempre son procesados en Dólares Norteamericanos (USD)") — no resuelve el
// tema de la conversión RD$↔USD, pero el negocio decidió que cobrar en USD
// no es un problema, así que esto no bloquea el cambio.
//
// A diferencia de PayPal (REST/JSON), el API de Pagadito ("WSPG") es SOAP
// RPC/encoded — confirmado leyendo su WSDL directamente:
//   sandbox: https://sandbox.pagadito.com/comercios/wspg/charges.php?wsdl
//   producción: https://comercios.pagadito.com/wspg/charges.php?wsdl
// No existe SDK oficial de Node/JavaScript (solo PHP y Java), así que aquí
// armamos el sobre SOAP a mano con fetch() — mismo patrón que ya usa este
// proyecto para hablar con la DGII en lib/dgii/dgii-client.ts (XML crudo,
// sin librería SOAP de terceros).
//
// ADVERTENCIA — pendiente de verificar contra una cuenta de Sandbox real:
// el manual oficial en PDF (Manual_Integracion_API_Pagadito_v1.1.pdf) no
// publica el formato exacto en que el SDK PHP serializa múltiples llamadas a
// add_detail() dentro del parámetro "details" del WSDL, ni el valor exacto
// de "format_return". Como Facturacon solo cobra UN ítem por transacción (la
// certificación), se evita la ambigüedad de múltiples líneas enviando un
// solo objeto en un array JSON. Si al probar contra el Sandbox real
// Pagadito rechaza el formato (código PG2002/PG3003 "incorrect format
// data"), hay que ajustar `serializarDetalle()` abajo — es el único punto
// del archivo con ese riesgo.
import "server-only";

const SANDBOX = process.env.PAGADITO_ENV !== "live";

const ENDPOINT = SANDBOX
  ? "https://sandbox.pagadito.com/comercios/wspg/charges.php?utf8_enc"
  : "https://comercios.pagadito.com/wspg/charges.php?utf8_enc";

const NAMESPACE = SANDBOX
  ? "urn:https://sandbox.pagadito.com/comercios/wspg/charges"
  : "urn:https://comercios.pagadito.com/wspg/charges";

export const MONTO_CERTIFICACION_USD = "250.00";

type RespuestaPagadito = { code: string; message: string; value?: string; datetime?: string };

function escaparXml(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Llama a una operación del WSDL de WSPG y devuelve el contenido ya
// parseado de <return> (Pagadito lo entrega como un string JSON dentro del
// XML — confirmado por el patrón code/message/value/datetime que expone el
// SDK PHP vía get_rs_code()/get_rs_message()/get_rs_status()/etc).
async function llamarWspg(operacion: string, params: Record<string, string | boolean>): Promise<RespuestaPagadito> {
  const campos = Object.entries(params).map(([nombre, valor]) => {
    const tipo = typeof valor === "boolean" ? "xsd:boolean" : "xsd:string";
    return `<${nombre} xsi:type="${tipo}">${escaparXml(String(valor))}</${nombre}>`;
  }).join("");

  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <${operacion} xmlns="${NAMESPACE}" soap:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
      ${campos}
    </${operacion}>
  </soap:Body>
</soap:Envelope>`;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: `"${NAMESPACE}#${operacion}"` },
    body: envelope,
  });
  const texto = await res.text();
  if (!res.ok) throw new Error(`Pagadito (${operacion}): HTTP ${res.status} — ${texto.substring(0, 300)}`);

  const match = texto.match(/<return[^>]*>([\s\S]*?)<\/return>/);
  if (!match) throw new Error(`Pagadito (${operacion}) no devolvió <return>. Respuesta: ${texto.substring(0, 300)}`);

  const crudo = match[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  try {
    return JSON.parse(crudo) as RespuestaPagadito;
  } catch {
    throw new Error(`Pagadito (${operacion}) devolvió un <return> no-JSON: ${crudo.substring(0, 300)}`);
  }
}

function serializarDetalle(descripcion: string, monto: string): string {
  return JSON.stringify([{ qty: 1, description: descripcion, price: monto }]);
}

export async function conectar(): Promise<string> {
  const uid = process.env.PAGADITO_UID;
  const wsk = process.env.PAGADITO_WSK;
  if (!uid || !wsk) throw new Error("Pagadito no está configurado (faltan PAGADITO_UID/PAGADITO_WSK).");

  const rs = await llamarWspg("connect", { uid, wsk, format_return: "json" });
  if (rs.code !== "PG1001" || !rs.value) throw new Error(`Pagadito connect() falló: ${rs.code} — ${rs.message}`);
  return rs.value;
}

export interface TransaccionPagadito {
  tokenTrans: string;
  url: string;
}

// Registra la transacción y devuelve la URL de la página de pago segura de
// Pagadito — el navegador del cliente debe ir a esa URL (redirect completo,
// no hay botón embebido como con PayPal).
export async function crearTransaccion(token: string, ern: string, descripcion: string): Promise<TransaccionPagadito> {
  const rs = await llamarWspg("exec_trans", {
    token, ern,
    amount: MONTO_CERTIFICACION_USD,
    details: serializarDetalle(descripcion, MONTO_CERTIFICACION_USD),
    format_return: "json",
    currency: "USD",
    custom_params: JSON.stringify({ ern }),
    allow_pending_payments: "0",
    extended_expiration: false,
  });
  if (rs.code !== "PG1002" || !rs.value) throw new Error(`Pagadito exec_trans() falló: ${rs.code} — ${rs.message}`);
  return { tokenTrans: token, url: rs.value };
}

export type EstadoTransaccionPagadito =
  | "REGISTERED" | "VERIFYING" | "COMPLETED" | "REVOKED" | "FAILED" | "CANCELED" | "EXPIRED";

export interface ConsultaPagadito {
  estado: EstadoTransaccionPagadito;
  referencia?: string;
  fechaTransaccion?: string;
}

// El token de conexión y el token de la transacción son distintos — hay que
// conectar() de nuevo (no se puede reusar el token de connect() del paso
// anterior, expira a los 10 minutos) y pasarle el token de la URL de
// retorno como `token_trans`.
export async function consultarEstado(tokenTrans: string): Promise<ConsultaPagadito> {
  const tokenConexion = await conectar();
  const rs = await llamarWspg("get_status", { token: tokenConexion, token_trans: tokenTrans, format_return: "json" });
  if (!rs.code.startsWith("PG1")) throw new Error(`Pagadito get_status() falló: ${rs.code} — ${rs.message}`);

  let detalle: { status?: string; reference?: string; date_trans?: string } = {};
  try { detalle = rs.value ? JSON.parse(rs.value) : {}; } catch { /* value puede venir como string plano */ }

  return {
    estado: (detalle.status as EstadoTransaccionPagadito) ?? "REGISTERED",
    referencia: detalle.reference,
    fechaTransaccion: detalle.date_trans,
  };
}
