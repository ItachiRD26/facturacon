// Bitácora de auditoría: registra QUIÉN hizo QUÉ, CUÁNDO y DESDE DÓNDE en las operaciones sensibles (inicio de
// sesión, certificado digital, usuarios y roles, secuencias, emisión de comprobantes, plan y cobros).
// Exigencia de la DGII para proveedores («bitácora de eventos que permita trazabilidad y control de cambios»).
//
//  - Solo se escribe desde el servidor; las reglas de Firestore niegan toda lectura y escritura desde el navegador.
//  - Es de solo agregar: nada en la aplicación edita ni borra estos registros.
//  - Eventos de una empresa → tenants/{id}/auditoria. Eventos sin empresa (inicio de sesión) → auditoria_sistema.
//  - Cada registro lleva `expira` para una política TTL de Firestore (retención de RETENCION_MESES meses).
//  - NUNCA se guardan contraseñas, claves, tokens ni datos de tarjeta: quien llama pasa solo datos seguros y,
//    por si acaso, se descartan los campos cuyo nombre sugiere un secreto.
//  - Un fallo al registrar NO debe romper la operación del usuario: se anota en el log del servidor y se sigue.
import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { ipDe } from "@/lib/seguridad/limite-tasa";
import type { AccionAuditoria } from "./etiquetas";

export const RETENCION_MESES = 24;

export type DetalleAuditoria = Record<string, string | number | boolean | null | undefined>;

export interface EventoAuditoria {
  tenantId?: string;
  /** Quién lo hizo: uid de la persona, o "sistema" para procesos automáticos. */
  uid: string;
  accion: AccionAuditoria;
  /** Sobre qué (por ejemplo el e-NCF o el uid de la persona afectada). */
  recurso?: string;
  resultado?: "ok" | "error";
  detalle?: DetalleAuditoria;
  /** La petición, para guardar la IP y el navegador. */
  req?: Request | null;
}

const CAMPO_SECRETO = /pass|clave|secret|token|cvv|tarjeta|card|numero|wsk|p12/i;

function limpiar(d?: DetalleAuditoria): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(d ?? {})) {
    if (v === undefined || CAMPO_SECRETO.test(k)) continue;
    out[k] = typeof v === "string" ? v.slice(0, 200) : v;
  }
  return out;
}

export async function registrarAuditoria(e: EventoAuditoria): Promise<void> {
  try {
    const ahora = new Date();
    const expira = new Date(ahora);
    expira.setMonth(expira.getMonth() + RETENCION_MESES);
    const registro = {
      uid: e.uid, accion: e.accion, resultado: e.resultado ?? "ok",
      ...(e.recurso ? { recurso: e.recurso.slice(0, 120) } : {}),
      detalle: limpiar(e.detalle),
      ip: ipDe(e.req ?? null),
      agente: (e.req?.headers.get("user-agent") ?? "").slice(0, 160),
      creadoEn: ahora.toISOString(),
      expira: Timestamp.fromDate(expira),
    };
    const coleccion = e.tenantId
      ? adminDb.collection("tenants").doc(e.tenantId).collection("auditoria")
      : adminDb.collection("auditoria_sistema");
    await coleccion.add(registro);
  } catch (err) {
    console.error("[auditoria] no se pudo registrar", e.accion, err instanceof Error ? err.message : err);
  }
}
