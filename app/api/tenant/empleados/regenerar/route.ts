import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireOwnerOAdmin } from "@/lib/tenant/auth";
import { generarCodigoEmpleado, hashCodigo } from "@/lib/tenant/codigo-empleado";

// Genera un código nuevo para un empleado existente (perdió el suyo, o el
// dueño sospecha que se filtró) — invalida el anterior de inmediato y
// reactiva el acceso si estaba revocado.
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

  const codigo = generarCodigoEmpleado();
  await ref.update({ codigoHash: hashCodigo(codigo), codigoUltimos4: codigo.slice(-4), activo: true });

  return NextResponse.json({ ok: true, codigo });
}
