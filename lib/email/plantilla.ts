// Diseño común de todos los correos de Facturacon. Módulo PURO (sin servidor):
// recibe el contenido ya armado y devuelve HTML + texto plano.
//
// Seguridad: TODO dato dinámico pasa por `esc()` antes de entrar al HTML (un nombre de
// cliente con "<script>" o comillas no puede romper ni inyectar nada en el correo).
// Las URLs de botones solo se aceptan si son https:// o mailto:.

const TINTA = "#0F1A30";
const ROJO = "#D92D3A";
const PAPEL = "#F3F4F1";
const MARCA = "#2540D9";

export const URL_SITIO = "https://www.facturacon.com.do";
export const CORREO_CONTACTO = "contacto@facturacon.com.do";

export function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Solo enlaces https o mailto (nada de javascript:, data:, etc.).
export function urlSegura(u: string): string {
  const t = u.trim();
  if (/^(https:\/\/|mailto:)/i.test(t)) return t;
  // Solo en desarrollo: enlaces a localhost para poder probar los correos sin salir al sitio real.
  if (process.env.NODE_ENV !== "production" && /^http:\/\/([a-z0-9-]+\.)?localhost(:\d+)?(\/|$)/i.test(t)) return t;
  return URL_SITIO;
}

export const rd = (n: number) =>
  `RD$ ${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export type TipoAlerta = "info" | "aviso" | "error" | "exito";

export interface ContenidoCorreo {
  asunto: string;
  preheader?: string;                       // texto que se ve junto al asunto en la bandeja
  titulo: string;
  parrafos: string[];                       // texto plano; se escapa solo
  alerta?: { tipo: TipoAlerta; texto: string };
  datos?: [string, string][];               // tabla "etiqueta → valor"
  boton?: { texto: string; url: string };
  notaFinal?: string;                       // texto pequeño debajo del botón
  enNombreDe?: string;                      // correos que salen "en nombre de" un negocio (e-CF, cotización)
}

export interface OpcionesLayout {
  // Los correos de novedades/recordatorios opcionales llevan aviso de baja.
  conBaja?: boolean;
}

const COLOR_ALERTA: Record<TipoAlerta, { fondo: string; borde: string; texto: string }> = {
  info:  { fondo: "#EEF1FE", borde: "#C5CEFA", texto: "#1B2FA8" },
  aviso: { fondo: "#FFFBEB", borde: "#FDE68A", texto: "#92400E" },
  error: { fondo: "#FEF2F2", borde: "#FECACA", texto: "#991B1B" },
  exito: { fondo: "#F0FDF4", borde: "#BBF7D0", texto: "#166534" },
};

export function armarCorreo(c: ContenidoCorreo, o: OpcionesLayout = {}): { html: string; texto: string } {
  const alerta = c.alerta
    ? `<tr><td style="padding:0 32px 18px"><div style="background:${COLOR_ALERTA[c.alerta.tipo].fondo};border:1px solid ${COLOR_ALERTA[c.alerta.tipo].borde};color:${COLOR_ALERTA[c.alerta.tipo].texto};border-radius:10px;padding:12px 14px;font-size:14px;line-height:1.5">${esc(c.alerta.texto)}</div></td></tr>`
    : "";

  const parrafos = c.parrafos
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1f2937">${esc(p)}</p>`)
    .join("");

  const datos = c.datos?.length
    ? `<tr><td style="padding:0 32px 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:10px;border-collapse:separate;overflow:hidden">${c.datos
        .map(([k, v], i) => `<tr><td style="padding:10px 14px;font-size:13px;color:#6B7280;background:${i % 2 ? "#fff" : "#FAFAF9"};width:42%">${esc(k)}</td><td style="padding:10px 14px;font-size:14px;font-weight:600;color:${TINTA};background:${i % 2 ? "#fff" : "#FAFAF9"}">${esc(v)}</td></tr>`)
        .join("")}</table></td></tr>`
    : "";

  const boton = c.boton
    ? `<tr><td style="padding:4px 32px 22px"><a href="${esc(urlSegura(c.boton.url))}" style="display:inline-block;background:${MARCA};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:10px">${esc(c.boton.texto)}</a></td></tr>`
    : "";

  const nota = c.notaFinal
    ? `<tr><td style="padding:0 32px 22px;font-size:12px;line-height:1.5;color:#6B7280">${esc(c.notaFinal)}</td></tr>`
    : "";

  const baja = o.conBaja
    ? `<br>Recibes este correo porque tienes una cuenta en Facturacon. Puedes dejar de recibir estos avisos desde <a href="${URL_SITIO}/panel" style="color:#6B7280">tu panel</a> o escribiéndonos a <a href="mailto:${CORREO_CONTACTO}" style="color:#6B7280">${CORREO_CONTACTO}</a>.`
    : "";

  const enNombreDe = c.enNombreDe
    ? `<tr><td style="padding:0 32px 6px;font-size:12px;color:#6B7280">Enviado en nombre de <strong>${esc(c.enNombreDe)}</strong> mediante Facturacon.</td></tr>`
    : "";

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(c.asunto)}</title></head>
<body style="margin:0;padding:0;background:${PAPEL};font-family:'Segoe UI',Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(c.preheader ?? "")}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPEL}"><tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB">
    <tr><td style="background:${TINTA};padding:20px 32px">
      <a href="${URL_SITIO}" style="text-decoration:none;font-size:26px;font-weight:800;letter-spacing:-1px;color:#ffffff">facturacon<span style="color:${ROJO}">.</span></a>
    </td></tr>
    <tr><td style="padding:30px 32px 10px"><h1 style="margin:0;font-size:23px;line-height:1.25;color:${TINTA}">${esc(c.titulo)}</h1></td></tr>
    <tr><td style="padding:6px 32px 8px">${parrafos}</td></tr>
    ${alerta}${datos}${boton}${nota}${enNombreDe}
    <tr><td style="padding:18px 32px 26px;border-top:1px solid #EEF0F3;font-size:12px;line-height:1.6;color:#9CA3AF">
      Facturacon · Certificación y facturación electrónica · República Dominicana<br>
      ¿Dudas? Escríbenos a <a href="mailto:${CORREO_CONTACTO}" style="color:#6B7280">${CORREO_CONTACTO}</a>. Este mensaje se envió automáticamente; si respondes, te leemos.${baja}
    </td></tr>
  </table>
  <div style="height:3px;width:46px;background:${ROJO};border-radius:3px;margin-top:14px"></div>
</td></tr></table></body></html>`;

  const texto = [
    c.titulo, "", ...c.parrafos, "",
    ...(c.alerta ? [c.alerta.texto, ""] : []),
    ...(c.datos?.map(([k, v]) => `${k}: ${v}`) ?? []), ...(c.datos?.length ? [""] : []),
    ...(c.boton ? [`${c.boton.texto}: ${urlSegura(c.boton.url)}`, ""] : []),
    ...(c.notaFinal ? [c.notaFinal, ""] : []),
    ...(c.enNombreDe ? [`Enviado en nombre de ${c.enNombreDe} mediante Facturacon.`, ""] : []),
    "—", `Facturacon · ${URL_SITIO}`, `¿Dudas? ${CORREO_CONTACTO}`,
  ].join("\n");

  return { html, texto };
}
