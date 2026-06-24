import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireTenantEnCertificacion } from "@/lib/certificacion/auth";

// Mueve el tenant de "pendiente_certificacion" a "certificando" la primera
// vez que entra al wizard de los 15 pasos (después de guardar los datos de
// empresa del Paso 0). Es idempotente: si ya está en "certificando" no falla.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tenantId = body?.tenantId ?? "";
  const verif = await requireTenantEnCertificacion(tenantId, ["pendiente_certificacion", "certificando"]);
  if (!verif.ok) return verif.response;

  if (verif.tenant.estado === "pendiente_certificacion") {
    await adminDb.collection("tenants").doc(tenantId).update({ estado: "certificando" });
  }
  return NextResponse.json({ ok: true });
}
