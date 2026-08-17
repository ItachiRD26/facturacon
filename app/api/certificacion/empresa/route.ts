import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireTenantEnCertificacion } from "@/lib/certificacion/auth";
import type { EmpresaConfig } from "@/types/tenant";

// Paso 0 del wizard: datos del emisor que el XSD del e-CF exige y que el
// onboarding normal nunca pidió (dirección, teléfono, actividad económica).
// Se guardan en tenants/{tenantId}/config/empresa — bloqueado a escritura de
// cliente en firestore.rules, así que solo el backend puede crearlo/editarlo.
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("t") ?? "";
  const verif = await requireTenantEnCertificacion(tenantId);
  if (!verif.ok) return verif.response;

  const snap = await adminDb.collection("tenants").doc(tenantId).collection("config").doc("empresa").get();
  return NextResponse.json({ empresa: snap.exists ? (snap.data() as EmpresaConfig) : null, slug: verif.tenant.slug ?? null });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tenantId = body?.tenantId ?? "";
  const verif = await requireTenantEnCertificacion(tenantId);
  if (!verif.ok) return verif.response;

  const { direccion, telefono, actividadEconomica } = body ?? {};
  if (!direccion?.trim() || !actividadEconomica?.trim()) {
    return NextResponse.json({ error: "Dirección y actividad económica son obligatorias" }, { status: 400 });
  }

  const empresa: EmpresaConfig = {
    nombre:             verif.tenant.nombreNegocio,
    rnc:                verif.tenant.rnc,
    direccion:          direccion.trim(),
    telefono:           telefono?.trim() ?? "",
    actividadEconomica: actividadEconomica.trim(),
    // Durante todo el wizard se trabaja contra el ambiente de certificación
    // de la DGII — nunca contra producción ("ecf").
    ambiente:           "certecf",
  };

  await adminDb.collection("tenants").doc(tenantId).collection("config").doc("empresa").set(empresa);
  return NextResponse.json({ ok: true, empresa });
}
