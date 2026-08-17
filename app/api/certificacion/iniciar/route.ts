import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireTenantEnCertificacion } from "@/lib/certificacion/auth";

// Mueve el tenant de "pendiente_certificacion" a "certificando" la primera
// vez que entra al wizard de los 15 pasos (después de guardar los datos de
// empresa del Paso 0). Es idempotente: si ya está en "certificando" no falla.
//
// La certificación es gratis (no hay pago que verificar aquí) — el cobro
// empieza recién cuando el tenant llega a "activo" y activa su suscripción
// recurrente (ver lib/payments/suscripcion.ts), no antes.
//
// También guarda la confirmación de que la empresa ya inició la solicitud de
// certificación dentro de su Oficina Virtual (OFV) — sin eso, el ambiente
// certecf de la DGII no reconoce al RNC y los pasos técnicos (semilla, envío
// del set de pruebas) fallan. No podemos verificar esto por API, así que
// dependemos de la confirmación honesta del usuario, igual que en el Paso 6.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tenantId = body?.tenantId ?? "";
  const verif = await requireTenantEnCertificacion(tenantId, ["pendiente_certificacion", "certificando"]);
  if (!verif.ok) return verif.response;

  if (verif.tenant.estado === "pendiente_certificacion") {
    await adminDb.collection("tenants").doc(tenantId).update({ estado: "certificando" });
  }

  if (body?.ofvIniciada) {
    await adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("estado")
      .set({ ofvIniciada: true, ofvConfirmadoEn: new Date().toISOString() }, { merge: true });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("t") ?? "";
  const verif = await requireTenantEnCertificacion(tenantId);
  if (!verif.ok) return verif.response;

  const snap = await adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("estado").get();
  return NextResponse.json({ ofvIniciada: snap.data()?.ofvIniciada ?? false });
}
