import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getSessionUid } from "@/lib/auth/session";
import { limitar } from "@/lib/seguridad/limite-tasa";
import { enviarPlantilla } from "@/lib/email/enviar";
import { enlaceNuestro, origenPublico } from "@/lib/auth/enlaces";

// Manda el enlace para confirmar el correo de quien tiene sesión (necesario para activar la verificación en dos pasos).
export async function POST(req: NextRequest) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const lim = await limitar(req, { nombre: "verificar-correo", id: uid, max: 3, ventanaSeg: 900 });
  if (lim) return lim;

  const u = await adminAuth.getUser(uid);
  if (u.emailVerified) return NextResponse.json({ yaVerificado: true });
  if (!u.email) return NextResponse.json({ error: "Tu cuenta no tiene correo." }, { status: 400 });

  const enlace = await adminAuth.generateEmailVerificationLink(u.email);
  const url = enlaceNuestro(enlace, "verifyEmail", origenPublico(req));
  if (!url) return NextResponse.json({ error: "No se pudo generar el enlace." }, { status: 500 });
  await enviarPlantilla("verificar_correo", { nombre: u.displayName?.split(" ")[0], url }, { para: u.email });
  return NextResponse.json({ ok: true });
}
