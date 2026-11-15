import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { limitar } from "@/lib/seguridad/limite-tasa";

// Lista de espera mientras el registro está cerrado. Público, sin sesión.
// Guarda solo el correo (y el nombre del negocio si lo dan), con el hash del
// correo como id para que repetir el envío no duplique.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { email?: string; negocio?: string; web?: string } | null;
  // "web" es un campo trampa invisible: una persona nunca lo llena.
  if (body?.web) return NextResponse.json({ ok: true });

  // Por IP y, además, un tope global: una red de IPs distintas no puede inflar
  // la colección sin límite.
  const limIp = await limitar(req, { nombre: "lista-espera", max: 5, ventanaSeg: 3600, compartido: true });
  if (limIp) return limIp;
  const limGlobal = await limitar(req, { nombre: "lista-espera-global", id: "todos", max: 300, ventanaSeg: 3600, compartido: true });
  if (limGlobal) return limGlobal;

  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: "Escribe un correo válido." }, { status: 400 });
  }
  const negocio = String(body?.negocio ?? "").trim().slice(0, 120);
  const id = createHash("sha256").update(email).digest("hex").slice(0, 32);
  await adminDb.collection("lista_espera").doc(id).set({
    email, ...(negocio ? { negocio } : {}), creadoEn: new Date().toISOString(),
  }, { merge: true });
  return NextResponse.json({ ok: true });
}
