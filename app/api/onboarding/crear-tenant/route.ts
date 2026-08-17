import { NextRequest, NextResponse } from "next/server";
import { getSessionUid } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase-admin";
import { createMembership, listMembershipsForUser } from "@/lib/tenant/get-memberships";
import type { Tenant, TipoNegocio, UserPerfil } from "@/types/tenant";
import { TIPOS_NEGOCIO } from "@/lib/onboarding/tipos-negocio";

// El tipo de cuenta (individual/gestor) ya se decide en /registro y queda en
// users/{uid}.tipoCuenta — esta ruta solo crea EMPRESAS (una para individual,
// una o varias para gestor), nunca vuelve a tocar el tipo de cuenta.
export async function POST(req: NextRequest) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });

  const body = await req.json().catch(() => null) as {
    nombreNegocio?: string; rnc?: string; tipoNegocio?: TipoNegocio;
  } | null;
  if (!body?.nombreNegocio?.trim() || !body.rnc?.trim() || !body.tipoNegocio) {
    return NextResponse.json({ error: "Faltan datos del onboarding" }, { status: 400 });
  }

  // Aplicación real del límite de "una sola empresa" para cuentas
  // individuales — la redirección en app/onboarding/page.tsx cubre la UI
  // normal, pero esto es lo que de verdad lo impide si alguien llama el
  // endpoint directo.
  const [perfilSnap, memberships] = await Promise.all([
    adminDb.collection("users").doc(uid).get(),
    listMembershipsForUser(uid),
  ]);
  const tipoCuenta = (perfilSnap.data() as UserPerfil | undefined)?.tipoCuenta;
  if (tipoCuenta === "individual" && memberships.length > 0) {
    return NextResponse.json({
      error: "Tu cuenta es de una sola empresa. Si necesitas administrar varias, contáctanos para cambiarla a cuenta de gestor.",
    }, { status: 403 });
  }

  const tipoInfo = TIPOS_NEGOCIO.find((t) => t.codigo === body.tipoNegocio);
  if (!tipoInfo) return NextResponse.json({ error: "Tipo de negocio inválido" }, { status: 400 });
  if (!tipoInfo.disponible) {
    return NextResponse.json({ error: "Este tipo de negocio todavía no está disponible. Contáctanos para una solución personalizada." }, { status: 400 });
  }

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
