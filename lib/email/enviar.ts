// Envío de correos por SMTP (Zoho Mail). Solo servidor.
//
// Nunca lanza errores: un correo que falla NO debe romper una factura, un pago ni un registro.
// Devuelve el resultado para que quien lo llama decida si reintenta o lo registra.
//
// Variables de entorno (ver .env.example). La clave es una "contraseña de aplicación" de Zoho
// del buzón noreply@; se guarda SOLO en .env.local y en las variables de Vercel, nunca en el código.
import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { renderCorreo, type DatosPorCorreo, type IdCorreo } from "./catalogo";
import { CORREO_CONTACTO } from "./plantilla";

export interface Adjunto { filename: string; content: Buffer | string; contentType?: string }

export interface OpcionesEnvio {
  para?: string;               // los correos internos van por defecto a contacto@
  responderA?: string;         // por defecto, contacto@
  nombreRemitente?: string;    // p. ej. el negocio que emite la factura: "Ferretería X vía Facturacon"
  adjuntos?: Adjunto[];
}

export type ResultadoEnvio =
  | { enviado: true; id: string }
  | { enviado: false; motivo: "sin-configurar" | "destinatario-invalido" | "adjuntos-muy-grandes" | "error"; detalle?: string };

const MAX_ADJUNTOS_BYTES = 10 * 1024 * 1024;

// Evita inyección de cabeceras: nada de saltos de línea en asunto, nombres ni direcciones.
const limpiar = (s: string) => s.replace(/[\r\n\t]+/g, " ").trim().slice(0, 200);
const correoValido = (e: string) => e.length <= 254 && /^[^\s@<>",;:]+@[^\s@<>",;:]+\.[^\s@<>",;:]+$/.test(e);
const enmascarar = (e: string) => e.replace(/^(.).*(@.*)$/, "$1***$2");

let transporte: Transporter | null = null;

function obtenerTransporte(): Transporter | null {
  const host = process.env.SMTP_HOST, user = process.env.SMTP_USER, pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  if (!transporte) {
    const puerto = Number(process.env.SMTP_PORT ?? 465);
    transporte = nodemailer.createTransport({
      host, port: puerto,
      secure: puerto === 465,          // 465 = SSL directo; 587 = STARTTLS
      requireTLS: puerto !== 465,
      auth: { user, pass },
      connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
    });
  }
  return transporte;
}

export async function enviarPlantilla<K extends IdCorreo>(id: K, datos: DatosPorCorreo[K], op: OpcionesEnvio = {}): Promise<ResultadoEnvio> {
  const t = obtenerTransporte();
  if (!t) {
    console.warn(`[correo] ${id}: SMTP sin configurar, no se envió`);
    return { enviado: false, motivo: "sin-configurar" };
  }

  const { asunto, html, texto, meta } = renderCorreo(id, datos);
  const para = (op.para ?? (meta.destino === "interno" ? CORREO_CONTACTO : "")).trim();
  if (!correoValido(para)) return { enviado: false, motivo: "destinatario-invalido" };

  const responderA = (op.responderA ?? process.env.MAIL_REPLY_TO ?? CORREO_CONTACTO).trim();
  const adjuntos = op.adjuntos ?? [];
  const bytes = adjuntos.reduce((s, a) => s + (typeof a.content === "string" ? Buffer.byteLength(a.content) : a.content.length), 0);
  if (bytes > MAX_ADJUNTOS_BYTES) return { enviado: false, motivo: "adjuntos-muy-grandes" };

  const nombre = limpiar(op.nombreRemitente ? `${op.nombreRemitente} vía Facturacon` : "Facturacon");
  const headers: Record<string, string> = {};
  // Los correos opcionales llevan la cabecera estándar de baja (los clientes de correo muestran "Cancelar suscripción").
  if (meta.naturaleza === "opcional") headers["List-Unsubscribe"] = `<mailto:${CORREO_CONTACTO}?subject=Baja>`;

  try {
    const r = await t.sendMail({
      from: { name: nombre, address: process.env.SMTP_USER! },
      to: para,
      replyTo: correoValido(responderA) ? responderA : CORREO_CONTACTO,
      subject: limpiar(asunto),
      html, text: texto,
      attachments: adjuntos.map((a) => ({ filename: limpiar(a.filename), content: a.content, contentType: a.contentType })),
      headers,
    });
    console.log(`[correo] ${id} → ${enmascarar(para)} ok`);
    return { enviado: true, id: String(r.messageId ?? "") };
  } catch (e) {
    // Nunca se registra la clave ni el contenido: solo el tipo de correo y el motivo.
    const detalle = e instanceof Error ? e.message : "error desconocido";
    console.error(`[correo] ${id} → ${enmascarar(para)} FALLÓ: ${detalle}`);
    return { enviado: false, motivo: "error", detalle };
  }
}
