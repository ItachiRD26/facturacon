import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { adminDb } from "@/lib/firebase-admin";

// Solicitudes de plan empresarial / a la medida. Público, sin sesión. No hay
// servicio de correo configurado, así que cada solicitud queda en Firestore
// (colección "contactos_comerciales") para que ventas le dé seguimiento.
const txt = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function POST(req: Request) {
  const b = await req.json().catch(() => null) as Record<string, unknown> | null;
  // Campo trampa invisible: una persona nunca lo llena.
  if (b?.web) return NextResponse.json({ ok: true });

  const nombre = txt(b?.nombre, 120);
  const empresa = txt(b?.empresa, 160);
  const email = txt(b?.email, 200).toLowerCase();
  const telefono = txt(b?.telefono, 40);
  const rnc = txt(b?.rnc, 20).replace(/[^\d-]/g, "");
  const mensaje = txt(b?.mensaje, 1500);
  const volumen = Math.round(Number(b?.volumen));

  if (!nombre || !empresa) return NextResponse.json({ error: "Escribe tu nombre y el de tu empresa." }, { status: 400 });
  if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(email) && telefono.replace(/\D/g, "").length < 10) {
    return NextResponse.json({ error: "Déjanos un correo válido o un teléfono para contactarte." }, { status: 400 });
  }

  // Mismo correo + mismo día = una sola solicitud (reintentos no duplican).
  const dia = new Date().toISOString().slice(0, 10);
  const id = createHash("sha256").update(`${email}|${telefono}|${dia}`).digest("hex").slice(0, 32);
  await adminDb.collection("contactos_comerciales").doc(id).set({
    nombre, empresa, email, telefono, rnc, mensaje,
    ...(Number.isFinite(volumen) && volumen > 0 ? { volumenMensual: Math.min(volumen, 100_000_000) } : {}),
    estado: "nuevo",
    creadoEn: new Date().toISOString(),
  }, { merge: true });

  return NextResponse.json({ ok: true });
}
