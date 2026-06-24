import { NextRequest, NextResponse } from "next/server";
import { getSessionUid } from "@/lib/auth/session";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { createMembership } from "@/lib/tenant/get-memberships";
import type { Tenant, TipoCuenta, TipoNegocio } from "@/types/tenant";
import { TIPOS_NEGOCIO } from "@/lib/onboarding/tipos-negocio";

export async function POST(req: NextRequest) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });

  const body = await req.json().catch(() => null) as {
    tipoCuenta?: TipoCuenta; nombreNegocio?: string; rnc?: string; tipoNegocio?: TipoNegocio;
  } | null;
  if (!body?.tipoCuenta || !body.nombreNegocio?.trim() || !body.rnc?.trim() || !body.tipoNegocio) {
    return NextResponse.json({ error: "Faltan datos del onboarding" }, { status: 400 });
  }

  const tipoInfo = TIPOS_NEGOCIO.find((t) => t.codigo === body.tipoNegocio);
  if (!tipoInfo) return NextResponse.json({ error: "Tipo de negocio inválido" }, { status: 400 });
  if (!tipoInfo.disponible) {
    return NextResponse.json({ error: "Este tipo de negocio todavía no está disponible. Contáctanos para una solución personalizada." }, { status: 400 });
  }

  const user = await adminAuth.getUser(uid);

  await adminDb.collection("users").doc(uid).set({
    uid, email: user.email ?? "", nombre: user.displayName ?? user.email ?? "",
    tipoCuenta: body.tipoCuenta, creadoEn: new Date().toISOString(),
  }, { merge: true });

  const tenantRef = adminDb.collection("tenants").doc();
  const tenant: Omit<Tenant, "id" | "slug"> = {
    nombreNegocio: body.nombreNegocio.trim(),
    rnc: body.rnc.replace(/\D/g, ""),
    tipoNegocio: body.tipoNegocio,
    estado: "demo",
    creadoEn: new Date().toISOString(),
    creadoPorUid: uid,
  };
  await tenantRef.set(tenant);
  await createMembership(uid, tenantRef.id, "owner");

  return NextResponse.json({ success: true, tenantId: tenantRef.id });
}
