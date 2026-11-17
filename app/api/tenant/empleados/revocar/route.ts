import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { requireOwnerOAdmin } from "@/lib/tenant/auth";
import { registrarAuditoria } from "@/lib/auditoria/registrar";

// Revoca el acceso de un empleado: desactiva su código, deshabilita su
// cuenta de Firebase y mata cualquier sesión que ya tuviera abierta —
// después de esto, ni su código ni una sesión existente vuelven a servir.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tenantId = body?.tenantId ?? "";
  const uid = body?.uid ?? "";
  const verif = await requireOwnerOAdmin(tenantId);
  if (!verif.ok) return verif.response;
  if (!uid) return NextResponse.json({ error: "Falta el empleado" }, { status: 400 });

  const ref = adminDb.collection("tenants").doc(tenantId).collection("empleados").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

  await ref.update({ activo: false });
  await adminAuth.updateUser(uid, { disabled: true }).catch(() => {});
  await adminAuth.revokeRefreshTokens(uid).catch(() => {});
  await registrarAuditoria({ tenantId, uid: verif.uid, accion: "empleado.revocado", recurso: uid, req });

  return NextResponse.json({ ok: true });
}
