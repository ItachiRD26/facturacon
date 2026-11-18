import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getSessionUid } from "@/lib/auth/session";
import { limitar } from "@/lib/seguridad/limite-tasa";
import { crearCodigos } from "@/lib/auth/codigos-recuperacion";
import { olvidarEstadoMfa } from "@/lib/auth/mfa";
import { avisarSeguridad } from "@/lib/auth/avisos-seguridad";
import { registrarAuditoria } from "@/lib/auditoria/registrar";

// Genera los códigos de recuperación (los muestra una sola vez). Se usa justo al activar la verificación en dos
// pasos y cuando la persona pide códigos nuevos (los anteriores dejan de servir). Exige:
//  - sesión válida,
//  - que la verificación esté activa en Firebase (lo confirma el servidor, no el navegador),
//  - un inicio de sesión reciente (idToken con menos de 10 minutos de haber confirmado la identidad).
export async function POST(req: NextRequest) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const lim = await limitar(req, { nombre: "mfa-codigos", id: uid, max: 6, ventanaSeg: 600 });
  if (lim) return lim;

  const body = await req.json().catch(() => null);
  const motivo = body?.motivo === "regeneracion" ? "regeneracion" : "activacion";
  if (typeof body?.idToken !== "string") return NextResponse.json({ error: "Falta confirmar tu identidad." }, { status: 400 });
  const decoded = await adminAuth.verifyIdToken(body.idToken).catch(() => null);
  if (!decoded || decoded.uid !== uid) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (Date.now() / 1000 - decoded.auth_time > 600) {
    return NextResponse.json({ error: "Confirma tu identidad de nuevo para continuar.", codigo: "reciente" }, { status: 403 });
  }

  const u = await adminAuth.getUser(uid);
  if ((u.multiFactor?.enrolledFactors?.length ?? 0) === 0) {
    return NextResponse.json({ error: "Primero activa la verificación en dos pasos." }, { status: 409 });
  }

  const codigos = await crearCodigos(uid);
  olvidarEstadoMfa(uid);
  await registrarAuditoria({ uid, accion: motivo === "activacion" ? "cuenta.mfa_activada" : "cuenta.codigos_nuevos", req });
  await avisarSeguridad(motivo === "activacion" ? "segundo_paso_activado" : "codigos_recuperacion_nuevos", u.email, u.displayName ?? undefined);
  return NextResponse.json({ codigos });
}
