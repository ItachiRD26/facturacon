import { NextRequest, NextResponse } from "next/server";
import { getSessionUid } from "@/lib/auth/session";
import { tieneVerificacionDosPasos } from "@/lib/auth/mfa";
import { registrarAuditoria } from "@/lib/auditoria/registrar";
import { limitar } from "@/lib/seguridad/limite-tasa";

// El navegador activa o desactiva la verificación en dos pasos directamente con Firebase; este aviso deja el
// rastro en la bitácora. No confía en lo que diga el cliente: registra lo que Firebase tiene guardado ahora.
export async function POST(req: NextRequest) {
  const lim = await limitar(req, { nombre: "mfa-evento", max: 20, ventanaSeg: 600 });
  if (lim) return lim;
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const activa = await tieneVerificacionDosPasos(uid);
  await registrarAuditoria({ uid, accion: activa ? "cuenta.mfa_activada" : "cuenta.mfa_desactivada", req });
  return NextResponse.json({ activa });
}
