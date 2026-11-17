// Envío automático de comprobantes que la DGII no pudo recibir (contingencia) y
// seguimiento de su estado final. Solo servidor.
//
// Idea: emitir NUNCA depende de que la DGII esté arriba. Cada comprobante se firma y se
// guarda al instante con su e-NCF, su XML firmado y su QR (estado "pendiente"). Cuando la DGII
// vuelve, aquí se envía el MISMO XML firmado, en el orden en que se emitieron. Nada se vuelve
// a numerar ni a firmar.
import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { obtenerCertificado } from "@/lib/kms/p12-vault";
import { getToken, enviarECF, enviarRFCE, consultarEstado } from "./dgii-client";
import type { EmpresaConfig } from "@/types/tenant";

// Plazo que la DGII da para enviar un comprobante emitido mientras ella no recibía.
export const LIMITE_HORAS_PENDIENTE = 72;
const PAUSA_TRAS_FALLO_MS = 60_000;   // tras un fallo no se vuelve a intentar al emitir durante 1 minuto

interface FacturaDoc {
  estadoDGII?: string; eCF: string; tipoECF: string; eCFRef?: string;
  xmlFirmado?: string; xmlRFCEFirmado?: string; trackIdDGII?: string; creadoEn?: string;
}

const refFacturas = (tenantId: string) => adminDb.collection("tenants").doc(tenantId).collection("facturas");
const refEstado = (tenantId: string) => adminDb.collection("tenants").doc(tenantId).collection("config").doc("dgii_estado");
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ¿Falla de la DGII/red (se reintenta luego) o rechazo real del comprobante (no sirve reintentar)?
export function clasificarError(mensaje: string): "caida" | "rechazo" {
  const m = mensaje.match(/Env[ií]o (?:eCF|e-CF|RFCE): (\d{3})/i);
  if (!m) return "caida";                       // red caída, tiempo agotado, token, etc.
  const c = Number(m[1]);
  return c === 401 || c === 403 || c === 408 || c === 429 || c >= 500 ? "caida" : "rechazo";
}

// ── Circuito: si la DGII acaba de fallar, emitir no vuelve a esperarla (el cajero no se queda colgado) ──
export async function servicioEnPausa(tenantId: string): Promise<boolean> {
  try {
    const d = (await refEstado(tenantId).get()).data() as { ultimoFallo?: string } | undefined;
    return !!d?.ultimoFallo && Date.now() - new Date(d.ultimoFallo).getTime() < PAUSA_TRAS_FALLO_MS;
  } catch { return false; }
}
export async function marcarFallo(tenantId: string): Promise<void> {
  const ahora = new Date().toISOString();
  const d = (await refEstado(tenantId).get().catch(() => null))?.data() as { caidaDesde?: string } | undefined;
  await refEstado(tenantId).set({ ultimoFallo: ahora, caidaDesde: d?.caidaDesde ?? ahora }, { merge: true }).catch(() => undefined);
}
export async function marcarExito(tenantId: string): Promise<void> {
  await refEstado(tenantId).set({ ultimoFallo: null, caidaDesde: null, ultimoExito: new Date().toISOString() }, { merge: true }).catch(() => undefined);
}

// ── Resumen barato (solo lectura) para el aviso en pantalla ──
export interface ResumenPendientes { pendientes: number; horasMasAntiguo: number; vencidos72h: number }
export async function resumenPendientes(tenantId: string): Promise<ResumenPendientes> {
  const snap = await refFacturas(tenantId).where("estadoDGII", "==", "pendiente").limit(500).get();
  const ahora = Date.now();
  const horas = snap.docs.map((d) => {
    const t = (d.data() as FacturaDoc).creadoEn;
    return t ? (ahora - new Date(t).getTime()) / 3_600_000 : 0;
  });
  return {
    pendientes: snap.size,
    horasMasAntiguo: horas.length ? Math.floor(Math.max(...horas)) : 0,
    vencidos72h: horas.filter((h) => h >= LIMITE_HORAS_PENDIENTE).length,
  };
}

async function contexto(tenantId: string) {
  const empresaSnap = await adminDb.collection("tenants").doc(tenantId).collection("config").doc("empresa").get();
  if (!empresaSnap.exists) return null;
  const empresa = empresaSnap.data() as EmpresaConfig;
  const tenant = { tenantId, rnc: empresa.rnc, ambiente: empresa.ambiente };
  try {
    const token = await getToken(tenant, async () => obtenerCertificado(tenantId));
    return { tenant, token };
  } catch (e) {
    console.error(`[reenvio][${tenantId}] sin token de la DGII:`, e instanceof Error ? e.message : e);
    await marcarFallo(tenantId);
    return { tenant, token: null as string | null };
  }
}

const mapaEstado = (txt: string): "Aceptado" | "AceptadoCondicional" | "Rechazado" | "Enviado" => {
  const e = txt.toLowerCase();
  return e.includes("rechaz") ? "Rechazado" : e.includes("condicional") ? "AceptadoCondicional" : e.includes("acept") ? "Aceptado" : "Enviado";
};

export interface ResultadoReenvio { intentados: number; enviados: number; rechazados: number; pendientes: number; dgiiNoResponde: boolean }

// Envía los pendientes, del más antiguo al más nuevo. Si la DGII no responde, se detiene (no la martilla).
export async function reenviarPendientes(tenantId: string, max = 25): Promise<ResultadoReenvio> {
  const snap = await refFacturas(tenantId).where("estadoDGII", "==", "pendiente").limit(300).get();
  const docs = snap.docs.sort((a, b) => String((a.data() as FacturaDoc).creadoEn ?? "").localeCompare(String((b.data() as FacturaDoc).creadoEn ?? "")));
  const r: ResultadoReenvio = { intentados: 0, enviados: 0, rechazados: 0, pendientes: docs.length, dgiiNoResponde: false };
  if (docs.length === 0) return r;

  const ctx = await contexto(tenantId);
  if (!ctx || !ctx.token) { r.dgiiNoResponde = true; return r; }
  const { tenant, token } = ctx;
  const eCFPendientes = new Set(docs.map((d) => (d.data() as FacturaDoc).eCF));

  for (const d of docs.slice(0, max)) {
    const f = d.data() as FacturaDoc;
    if (!f.xmlFirmado) continue;
    // Una nota de crédito/débito va DESPUÉS del comprobante que modifica: si ese sigue pendiente, espera.
    if ((f.tipoECF === "E33" || f.tipoECF === "E34") && f.eCFRef && eCFPendientes.has(f.eCFRef)) continue;

    r.intentados++;
    try {
      let trackId = ""; let estadoDGII: string = "Enviado";
      if (f.xmlRFCEFirmado) {
        const x = await enviarRFCE(f.xmlRFCEFirmado, tenant, token, f.eCF);
        trackId = x.trackId; estadoDGII = mapaEstado(x.estado);
      } else {
        trackId = await enviarECF(f.xmlFirmado, tenant, token, f.eCF);
      }
      await d.ref.update({ estadoDGII, trackIdDGII: trackId, fechaEnvioDGII: new Date().toISOString(), mensajesDGII: [] });
      eCFPendientes.delete(f.eCF);
      r.enviados++; r.pendientes--;
      await marcarExito(tenantId);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : String(e);
      if (clasificarError(mensaje) === "rechazo") {
        // La DGII lo recibió y lo rechazó: reintentar no sirve. Queda marcado para que se vea en el sistema.
        await d.ref.update({ estadoDGII: "Rechazado", mensajesDGII: [mensaje.slice(0, 600)], fechaEnvioDGII: new Date().toISOString() }).catch(() => undefined);
        eCFPendientes.delete(f.eCF);
        r.rechazados++; r.pendientes--;
      } else {
        await d.ref.update({ mensajesDGII: [mensaje.slice(0, 300)] }).catch(() => undefined);
        await marcarFallo(tenantId);
        r.dgiiNoResponde = true;
        break;
      }
    }
    await pausa(400);
  }
  return r;
}

// Consulta a la DGII el resultado final de lo ya enviado (Enviado → Aceptado / Rechazado).
export async function sincronizarEstados(tenantId: string, max = 30): Promise<{ revisados: number; aceptados: number; rechazados: number }> {
  const snap = await refFacturas(tenantId).where("estadoDGII", "==", "Enviado").limit(200).get();
  const res = { revisados: 0, aceptados: 0, rechazados: 0 };
  const candidatos = snap.docs.filter((d) => (d.data() as FacturaDoc).trackIdDGII && !(d.data() as FacturaDoc).xmlRFCEFirmado).slice(0, max);
  if (candidatos.length === 0) return res;
  const ctx = await contexto(tenantId);
  if (!ctx || !ctx.token) return res;

  for (const d of candidatos) {
    const f = d.data() as FacturaDoc;
    try {
      const c = await consultarEstado(f.trackIdDGII!, ctx.tenant, ctx.token);
      const nuevo = mapaEstado(c.estado);
      res.revisados++;
      if (nuevo === "Enviado") continue;       // "En proceso": se consulta de nuevo más tarde
      await d.ref.update({ estadoDGII: nuevo, mensajesDGII: c.mensajes ?? [] });
      if (nuevo === "Rechazado") res.rechazados++; else res.aceptados++;
    } catch (e) {
      console.warn(`[reenvio][${tenantId}] consulta de ${f.eCF} falló:`, e instanceof Error ? e.message : e);
      break;                                   // si la DGII no contesta, no se insiste
    }
    await pausa(250);
  }
  return res;
}
