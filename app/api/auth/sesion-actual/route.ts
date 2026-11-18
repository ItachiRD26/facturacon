import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getSessionUid } from "@/lib/auth/session";
import { limitar } from "@/lib/seguridad/limite-tasa";

// ¿Hay ya una sesión abierta en este navegador? La pantalla del código de caja lo usa para AVISAR antes de entrar:
// el navegador guarda una sola sesión, así que entrar con otra cuenta cierra la que estaba abierta. Solo dice a quién
// pertenece la sesión del propio navegador (la que ya trae en su cookie): no revela nada de otras personas.
export async function GET(req: NextRequest) {
  const lim = await limitar(req, { nombre: "sesion-actual", max: 30, ventanaSeg: 600 });
  if (lim) return lim;
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ activa: false });
  const u = await adminAuth.getUser(uid).catch(() => null);
  if (!u) return NextResponse.json({ activa: false });
  return NextResponse.json({ activa: true, nombre: u.displayName || u.email || "otra cuenta", uid });
}
