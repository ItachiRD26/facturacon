// Verificación de webhooks de Pagadito (servicio "TRANSACTION.STATUS.CHANGE")
// — ver PG-TokenizationPayment.pdf, sección "Webhooks". Sin esto, cualquiera
// podría enviar un POST falso a nuestro endpoint de webhook simulando que un
// pago se completó (ver hallazgo de la auditoría sobre webhooks no
// verificados). El payload se firma con la llave privada de Pagadito y se
// valida con la llave pública de un certificado X509 que Pagadito expone en
// PAGADITO-CERT-URL — exactamente el mismo patrón de "asymmetric signature"
// que describen.
//
// PENDIENTE DE VERIFICAR CONTRA UN WEBHOOK REAL: la doc no muestra el valor
// literal exacto del header PAGADITO-AUTH-ALGO (ej. "sha256WithRSAEncryption"
// vs "RSA-SHA256") — node:crypto acepta nombres de digest de OpenSSL, así que
// debería funcionar tal cual, pero hay que confirmarlo con un evento real de
// Sandbox antes de confiar en este verificador para producción.
import "server-only";
import * as crypto from "crypto";

// CRC-32 estándar (IEEE 802.3 / zlib / PHP crc32()) — Node no expone una
// función pública equivalente en todas las versiones, así que se implementa
// aquí en vez de depender de una API que podría no existir en el runtime.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export interface CabecerasWebhookPagadito {
  notificationId: string;
  notificationTimestamp: string;
  authAlgo: string;
  certUrl: string;
  signatureBase64: string;
}

// rawBody debe ser el cuerpo crudo tal cual llegó (antes de JSON.parse) —
// el CRC32 tiene que calcularse sobre los mismos bytes que Pagadito firmó,
// no sobre una re-serialización nuestra que podría diferir en espacios/orden.
export async function verificarWebhookPagadito(
  headers: CabecerasWebhookPagadito, rawBody: string,
): Promise<boolean> {
  const wsk = process.env.PAGADITO_WSK;
  if (!wsk) throw new Error("Pagadito no está configurado (falta PAGADITO_WSK).");

  let eventId: string;
  try {
    eventId = (JSON.parse(rawBody) as { id?: string }).id ?? "";
  } catch {
    return false;
  }
  if (!eventId) return false;

  const checksum = crc32(Buffer.from(rawBody, "utf8"));
  const cadenaFirmada = `${headers.notificationId}|${headers.notificationTimestamp}|${eventId}|${checksum}|${wsk}`;

  const certRes = await fetch(headers.certUrl);
  if (!certRes.ok) throw new Error(`No se pudo descargar el certificado de Pagadito (${headers.certUrl}): HTTP ${certRes.status}`);
  const certPem = await certRes.text();

  const cert = new crypto.X509Certificate(certPem);
  const signature = Buffer.from(headers.signatureBase64, "base64");

  return crypto.verify(headers.authAlgo, Buffer.from(cadenaFirmada, "utf8"), cert.publicKey, signature);
}

export interface EventoWebhookPagadito {
  id: string;
  event_create_timestamp: string;
  event_type: string;
  resource: {
    token: string; ern: string; create_timestamp: string;
    amount: { total: string; currency: string };
    description: string; update_timestamp: string;
    status: "REGISTERED" | "VERIFYING" | "COMPLETED" | "REVOKED" | "EXPIRED" | string;
    reference: string;
    items_list: { quantity: string; price: string; description: string; url_product: string }[];
  };
}
