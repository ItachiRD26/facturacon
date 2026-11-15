import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireOwnerOAdmin } from "@/lib/tenant/auth";
import { generarTokenLinkEmpleado } from "@/lib/tenant/codigo-empleado";

// Genera un nuevo token para la URL de login de empleados — el link
// anterior deja de funcionar de inmediato (útil si se compartió por
// accidente en un lugar público).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tenantId = body?.tenantId ?? "";
  const verif = await requireOwnerOAdmin(tenantId);
  if (!verif.ok) return verif.response;

  const linkToken = generarTokenLinkEmpleado();
  await adminDb.collection("tenants").doc(tenantId).update({ linkEmpleadoToken: linkToken });

  return NextResponse.json({ ok: true, linkToken });
}
