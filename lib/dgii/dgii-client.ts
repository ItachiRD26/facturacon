// Cliente DGII — URLs según Swagger oficial certecf
// Recepción: /CerteCF/Recepcion/api/FacturasElectronicas
// RFCE:      /certecf/recepcionfc/api/recepcion/ecf
// Consulta:  /CerteCF/ConsultaResultado/api/Consultas/Estado
//
// A diferencia del código de referencia (single-tenant): el RNC, el
// ambiente, y el token cacheado en Firestore se resuelven por tenant en vez
// de leerse de process.env.DGII_RNC / DGII_AMBIENTE / config/dgii_token
// (documento global). El .p12 nunca se mantiene descifrado más tiempo del
// necesario: `signSeed` solo se invoca (y por tanto solo se llama a KMS)
// cuando de verdad hace falta re-firmar la semilla.
import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { firmarSemilla } from "@/lib/dgii/xml-signer";
import type { AmbienteDGII } from "@/lib/dgii/qr-builder";

const ECF_HOST = "https://ecf.dgii.gov.do";
const FC_HOST  = "https://fc.dgii.gov.do";

export interface DgiiTenantConfig {
  tenantId: string;
  rnc:      string;
  ambiente: AmbienteDGII;
}

function urls(ambiente: AmbienteDGII) {
  return {
    semilla:        `${ECF_HOST}/${ambiente}/autenticacion/api/Autenticacion/Semilla`,
    validarSemilla: `${ECF_HOST}/${ambiente}/autenticacion/api/Autenticacion/ValidarSemilla`,
    recepcion:      `${ECF_HOST}/CerteCF/Recepcion/api/FacturasElectronicas`,
    rfce:           `${FC_HOST}/${ambiente}/recepcionfc/api/recepcion/ecf`,
    consulta:       `${ECF_HOST}/CerteCF/ConsultaResultado/api/Consultas/Estado`,
    anulacion:      `${ECF_HOST}/${ambiente}/anulacion/api/Anulacion`,
  };
}

interface TokenCache { token: string; expira: Date }
const tokenCacheByTenant = new Map<string, TokenCache>();
const MARGEN_MS = 5 * 60 * 1000;

export async function obtenerSemilla(ambiente: AmbienteDGII): Promise<string> {
  const res = await fetch(urls(ambiente).semilla, { headers: { accept: "*/*" } });
  if (!res.ok) throw new Error(`Semilla: ${res.status} ${await res.text()}`);
  return res.text();
}

export async function validarSemilla(xmlFirmado: string, ambiente: AmbienteDGII): Promise<{ token: string; expira: string }> {
  const form = new FormData();
  form.append("xml", new Blob([xmlFirmado], { type: "text/xml" }), "semilla.xml");
  const res  = await fetch(urls(ambiente).validarSemilla, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Validar semilla: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (!data.token) throw new Error("DGII no devolvió token");
  return { token: data.token, expira: data.expira };
}

// 3 niveles, igual que el código de referencia, pero ahora por tenant:
// 1. Cache en memoria del proceso (Map por tenantId)
// 2. tenants/{tenantId}/config/dgii_token en Firestore (compartido entre requests/instancias)
// 3. Firma automática: descarga semilla, la firma con el .p12 del tenant (descifrado
//    de KMS vía signSeed(), solo en este punto) y valida contra DGII
export async function getToken(
  tenant: DgiiTenantConfig,
  signSeed: () => Promise<{ p12Buffer: Buffer; password: string }>,
): Promise<string> {
  const cached = tokenCacheByTenant.get(tenant.tenantId);
  if (cached && cached.expira.getTime() - Date.now() > MARGEN_MS) {
    return cached.token;
  }

  try {
    const snap = await adminDb.collection("tenants").doc(tenant.tenantId).collection("config").doc("dgii_token").get();
    if (snap.exists) {
      const data = snap.data() as { token: string; expira: string };
      const expira = new Date(data.expira);
      if (expira.getTime() - Date.now() > MARGEN_MS) {
        tokenCacheByTenant.set(tenant.tenantId, { token: data.token, expira });
        return data.token;
      }
    }
  } catch (e) {
    console.warn(`[DGII][${tenant.tenantId}] No se pudo leer token de Firestore:`, e instanceof Error ? e.message : e);
  }

  const xml = await obtenerSemilla(tenant.ambiente);
  const { p12Buffer, password } = await signSeed();
  const xmlFirmado = await firmarSemilla(xml, p12Buffer, password);
  const { token, expira } = await validarSemilla(xmlFirmado, tenant.ambiente);

  tokenCacheByTenant.set(tenant.tenantId, { token, expira: new Date(expira) });
  await adminDb.collection("tenants").doc(tenant.tenantId).collection("config").doc("dgii_token")
    .set({ token, expira }).catch((e) => console.warn(`[DGII][${tenant.tenantId}] No se pudo cachear token:`, e));

  return token;
}

function authHeaders(token: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Enviar e-CF → retorna TrackId ───────────────────────────────────────────
export async function enviarECF(xmlFirmado: string, tenant: DgiiTenantConfig, token: string, encf?: string): Promise<string> {
  // DGII requiere filename = RNCEmisor + eNCF + ".xml" (longitud exacta)
  const filename = encf ? `${tenant.rnc}${encf}.xml` : "ecf.xml";
  const form  = new FormData();
  form.append("xml", new Blob([xmlFirmado], { type: "text/xml" }), filename);

  const res  = await fetch(urls(tenant.ambiente).recepcion, {
    method: "POST",
    headers: authHeaders(token),
    body: form,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Envío eCF: ${res.status} — ${text}`);

  try {
    const data = JSON.parse(text);
    if (data.trackId) return data.trackId;
    if (data.error)   throw new Error(data.error);
  } catch { /* si no es JSON, buscar trackId en texto */ }

  const match = text.match(/"trackId"\s*:\s*"([^"]+)"/);
  if (match) return match[1];
  throw new Error(`DGII no devolvió trackId. Respuesta: ${text.substring(0, 300)}`);
}

// ─── Enviar RFCE ──────────────────────────────────────────────────────────────
export async function enviarRFCE(xmlFirmado: string, tenant: DgiiTenantConfig, token: string, encf?: string): Promise<{ trackId: string; estado: string }> {
  const filename = encf ? `${tenant.rnc}${encf}.xml` : "rfce.xml";
  const form  = new FormData();
  form.append("xml", new Blob([xmlFirmado], { type: "text/xml" }), filename);

  const res  = await fetch(urls(tenant.ambiente).rfce, {
    method: "POST",
    headers: authHeaders(token),
    body: form,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Envío RFCE: ${res.status} — ${text}`);

  try {
    const data = JSON.parse(text);
    return {
      trackId: data.encf  ?? data.trackId ?? "",
      estado:  data.estado ?? "",
    };
  } catch {
    return { trackId: "", estado: text };
  }
}

// ─── Consultar estado por TrackId ─────────────────────────────────────────────
export async function consultarEstado(trackId: string, tenant: DgiiTenantConfig, token: string): Promise<{
  estado: string; mensajes: string[]; eCF?: string;
}> {
  const url = `${urls(tenant.ambiente).consulta}?trackId=${trackId}`;
  const res = await fetch(url, {
    headers: { ...authHeaders(token), accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Consulta TrackId: ${res.status}`);
  const data = await res.json();
  return {
    estado:   data.estado    ?? "Desconocido",
    mensajes: data.mensajes?.map((m: {valor?: string; codigo?: string}) => m.valor ?? m.codigo ?? "") ?? [],
    eCF:      data.encf      ?? data.eNCF,
  };
}

// ─── Anular e-NCF ─────────────────────────────────────────────────────────────
export async function anularENCF(xmlFirmado: string, tenant: DgiiTenantConfig, token: string): Promise<void> {
  const form = new FormData();
  form.append("xml", new Blob([xmlFirmado], { type: "text/xml" }), "anulacion.xml");
  const res = await fetch(urls(tenant.ambiente).anulacion, {
    method: "POST",
    headers: authHeaders(token),
    body: form,
  });
  if (!res.ok) throw new Error(`Anulación: ${res.status} — ${await res.text()}`);
}
