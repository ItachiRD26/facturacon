import "server-only";
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

// Limitador de tasa para rutas API. Dos capas:
//  1. Memoria de la instancia: gratis y sin red; frena la inundación sobre una
//     misma instancia caliente. Cada instancia cuenta lo suyo, así que nunca
//     es más permisiva que el límite global (solo puede ser más estricta).
//  2. Firestore (opcional, `compartido: true`): contador atómico compartido por
//     todas las instancias, para lo sensible (fuerza bruta, escrituras públicas,
//     consultas que salen a la DGII). Solo ve lo que ya pasó la capa 1.
// Si Firestore falla, la capa 2 deja pasar (un fallo del limitador no debe
// tumbar el servicio). Colección `rate_limits`: sin regla en firestore.rules =
// denegada al cliente; el campo `expira` permite activar una política TTL.

interface Opciones {
  nombre: string;       // identifica la ruta/regla, p. ej. "lista-espera"
  max: number;          // peticiones permitidas por ventana
  ventanaSeg: number;   // tamaño de la ventana en segundos
  id?: string;          // a quién se cuenta (uid, slug…); por defecto la IP
  compartido?: boolean; // contador en Firestore además de la memoria
}

const memoria = new Map<string, { n: number; reinicia: number }>();

export function ipDe(req: Request | null): string {
  if (!req) return "desconocida";
  const h = req.headers;
  const ip = h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "";
  return ip.trim() || "desconocida";
}

function contarEnMemoria(clave: string, max: number, ventanaMs: number): boolean {
  const ahora = Date.now();
  if (memoria.size > 5000) {
    for (const [k, v] of memoria) if (v.reinicia <= ahora) memoria.delete(k);
    if (memoria.size > 5000) memoria.clear(); // salvaguarda: nunca crece sin límite
  }
  const e = memoria.get(clave);
  if (!e || e.reinicia <= ahora) { memoria.set(clave, { n: 1, reinicia: ahora + ventanaMs }); return true; }
  if (e.n >= max) return false;
  e.n += 1;
  return true;
}

async function contarCompartido(clave: string, max: number, ventanaSeg: number): Promise<boolean> {
  const ventana = Math.floor(Date.now() / (ventanaSeg * 1000));
  const docId = createHash("sha256").update(`${clave}|${ventana}`).digest("hex").slice(0, 40);
  const ref = adminDb.collection("rate_limits").doc(docId);
  try {
    return await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const n = (snap.data()?.n as number | undefined) ?? 0;
      if (n >= max) return false;
      tx.set(ref, { n: n + 1, expira: Timestamp.fromMillis((ventana + 2) * ventanaSeg * 1000) });
      return true;
    });
  } catch (e) {
    console.error("[limite-tasa] Firestore no respondió, se deja pasar:", e);
    return true;
  }
}

/** Devuelve una respuesta 429 si se superó el límite, o null si puede continuar. */
export async function limitar(req: Request | null, o: Opciones): Promise<NextResponse | null> {
  const clave = `${o.nombre}|${o.id ?? ipDe(req)}`;
  const permitido =
    contarEnMemoria(clave, o.max, o.ventanaSeg * 1000) &&
    (!o.compartido || (await contarCompartido(clave, o.max, o.ventanaSeg)));
  if (permitido) return null;
  return NextResponse.json(
    { error: "Demasiados intentos. Espera un momento e intenta de nuevo." },
    { status: 429, headers: { "Retry-After": String(o.ventanaSeg) } },
  );
}
