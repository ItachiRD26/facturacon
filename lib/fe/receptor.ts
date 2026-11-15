// Utilidades compartidas por los 3 servicios receptor que la DGII llama (/fe/*):
// autenticación (semilla + validación), recepción de e-CF y aprobación comercial.
//
// Diferencias con la implementación de referencia (single-tenant, Soraya):
//  - Multi-tenant: el tenant se resuelve por el subdominio ({slug}.dominio/fe/...)
//    que cada empresa registró ante la DGII. Todo se guarda bajo tenants/{id}/...
//  - Se firma con el .p12 DE ESE tenant (KMS), nunca con un certificado global.
//  - Las semillas y tokens son por tenant y los tokens se guardan hasheados.
//  - Las horas se emiten en hora de República Dominicana, no en la del servidor
//    (Vercel corre en UTC y la DGII espera hora local).
import "server-only";
import { createHash, randomBytes } from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { resolveTenantBySlug } from "@/lib/tenant/resolve-tenant";
import { getTenantSlugFromHost } from "@/lib/tenant/get-subdomain";
import type { Tenant } from "@/types/tenant";

export const TTL_SEMILLA_MS = 10 * 60 * 1000;
export const TTL_TOKEN_MS   = 4 * 60 * 60 * 1000;
// Un e-CF real pesa decenas de KB; 2 MB es holgado y evita que alguien nos
// llene la base o la memoria mandando cuerpos enormes.
export const MAX_BYTES_XML  = 2 * 1024 * 1024;

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

export function xmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export function errorXml(mensaje: string, status: number): Response {
  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><Error><Mensaje>${escapeXml(mensaje)}</Mensaje></Error>`, status);
}

export function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// Tenant dueño de la URL a la que llamó la DGII. null si el host no es un
// subdominio de empresa o la empresa no existe.
export async function tenantDeLaPeticion(req: Request): Promise<Tenant | null> {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const slug = getTenantSlugFromHost(host, ROOT_DOMAIN);
  if (!slug) return null;
  return resolveTenantBySlug(slug);
}

export function ipDe(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "desconocida").split(",")[0].trim();
}

// El XML puede llegar como multipart (campo "xml"), como XML crudo o como texto.
// Devuelve null si el cuerpo supera MAX_BYTES_XML.
export async function leerXml(req: Request): Promise<string | null> {
  const declarado = Number(req.headers.get("content-length") ?? 0);
  if (declarado > MAX_BYTES_XML) return null;

  const ct = req.headers.get("content-type") ?? "";
  let xml = "";
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const campo = form.get("xml") ?? [...form.values()].find((v) => typeof v !== "string") ?? null;
    if (campo && typeof campo !== "string") xml = await (campo as File).text();
    else if (typeof campo === "string") xml = campo;
  } else {
    xml = await req.text();
  }
  return xml.length > MAX_BYTES_XML ? null : xml;
}

export function tag(xml: string, name: string): string {
  // "(?:\s[^>]*)?>" exige que el nombre termine ahí: sin eso, "semilla" también
  // coincidiría con <SemillaModel> y devolvería basura.
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return m ? m[1].trim() : "";
}

// "dd-MM-yyyy HH:mm:ss" en hora de Santo Domingo (UTC-4, sin horario de verano).
export function ahoraRD(): string {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Santo_Domingo", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => partes.find((p) => p.type === t)?.value ?? "00";
  const hora = g("hour") === "24" ? "00" : g("hour");
  return `${g("day")}-${g("month")}-${g("year")} ${hora}:${g("minute")}:${g("second")}`;
}

// La DGII manda la fecha como dd-MM-yyyy; internamente guardamos yyyy-MM-dd.
export function fechaIso(raw: string): string {
  const limpio = raw.trim();
  const dmy = limpio.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const ymd = limpio.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  return new Date().toISOString().slice(0, 10);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

// ── Semillas y tokens (autenticación que la DGII hace contra nosotros) ────────
function semillas(tenantId: string) {
  return adminDb.collection("tenants").doc(tenantId).collection("receptor_semillas");
}
function tokens(tenantId: string) {
  return adminDb.collection("tenants").doc(tenantId).collection("receptor_tokens");
}

export async function crearSemilla(tenantId: string): Promise<string> {
  const semilla = randomBytes(16).toString("hex").toUpperCase();
  await semillas(tenantId).doc(semilla).set({
    expira: new Date(Date.now() + TTL_SEMILLA_MS).toISOString(),
    usada: false,
    creadoEn: new Date().toISOString(),
  });
  return semilla;
}

// Consume la semilla de forma atómica: solo una validación puede usarla.
export async function consumirSemilla(tenantId: string, semilla: string): Promise<"ok" | "desconocida" | "vencida" | "usada"> {
  const ref = semillas(tenantId).doc(semilla);
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return "desconocida";
    const d = snap.data() as { expira: string; usada: boolean };
    if (d.usada) return "usada";
    if (new Date(d.expira) < new Date()) return "vencida";
    tx.update(ref, { usada: true, usadaEn: new Date().toISOString() });
    return "ok";
  });
}

export async function crearToken(tenantId: string): Promise<{ token: string; expira: string }> {
  const token = randomBytes(32).toString("hex");
  const expira = new Date(Date.now() + TTL_TOKEN_MS).toISOString();
  // Se guarda el hash: si alguien lee la base no puede reutilizar los tokens.
  await tokens(tenantId).doc(sha256(token)).set({ expira, creadoEn: new Date().toISOString() });
  return { token, expira };
}

export async function tokenValido(tenantId: string, req: Request): Promise<boolean> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return false;
  try {
    const snap = await tokens(tenantId).doc(sha256(token)).get();
    return snap.exists && new Date((snap.data() as { expira: string }).expira) > new Date();
  } catch {
    return false;
  }
}

// Mientras la empresa se está certificando, la DGII a veces no manda el token
// en las pruebas del receptor (lección del proyecto de referencia), así que se
// tolera. Con la empresa ya activa (producción) el token es obligatorio.
export function exigeToken(tenant: Tenant): boolean {
  return tenant.estado === "activo" || tenant.estado === "suspendido";
}
