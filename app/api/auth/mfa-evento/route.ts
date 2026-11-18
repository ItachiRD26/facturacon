import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getSessionUid } from "@/lib/auth/session";
import { olvidarEstadoMfa } from "@/lib/auth/mfa";
import { borrarCodigos } from "@/lib/auth/codigos-recuperacion";
import { avisarSeguridad } from "@/lib/auth/avisos-seguridad";
import { registrarAuditoria } from "@/lib/auditoria/registrar";
import { limitar } from "@/lib/seguridad/limite-tasa";

// El navegador desactiva la verificación en dos pasos directamente con Firebase; este aviso deja el rastro en la
// bitácora, borra los códigos de recuperación (ya no sirven) y avisa por correo. No confía en lo que diga el
// cliente: solo actúa si Firebase confirma que la verificación YA está desactivada. (La activación se registra en
// /api/auth/mfa-codigos, que además entrega los códigos.)
export async function POST(req: NextRequest) {
  const lim = await limitar(req, { nombre: "mfa-evento", max: 20, ventanaSeg: 600 });
  if (lim) return lim;
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const u = await adminAuth.getUser(uid);
  const activa = (u.multiFactor?.enrolledFactors?.length ?? 0) > 0;
  olvidarEstadoMfa(uid);
  if (!activa) {
    await borrarCodigos(uid);
    await registrarAuditoria({ uid, accion: "cuenta.mfa_desactivada", req });
    await avisarSeguridad("segundo_paso_desactivado", u.email, u.displayName ?? undefined);
  }
  return NextResponse.json({ activa });
}
