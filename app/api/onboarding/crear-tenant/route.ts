import { NextRequest, NextResponse } from "next/server";
import { getSessionUid } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase-admin";
import { createMembership, listMembershipsForUser } from "@/lib/tenant/get-memberships";
import type { Tenant, TipoNegocio, UserPerfil } from "@/types/tenant";
import { TIPOS_NEGOCIO } from "@/lib/onboarding/tipos-negocio";
import { limitar } from "@/lib/seguridad/limite-tasa";
import { consultarRncConCache } from "@/lib/dgii/validar-rnc-cedula";
import { sembrarDatosEjemplo } from "@/lib/sandbox/datos-ejemplo";

const MAX_EMPRESAS_POR_CUENTA = 25;

// El tipo de cuenta (individual/gestor) ya se decide en /registro y queda en
// users/{uid}.tipoCuenta — esta ruta solo crea EMPRESAS (una para individual,
// una o varias para gestor), nunca vuelve a tocar el tipo de cuenta.
export async function POST(req: NextRequest) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
  const lim = await limitar(req, { nombre: "crear-tenant", id: uid, max: 5, ventanaSeg: 3600, compartido: true });
  if (lim) return lim;

  // El nombre de la empresa YA NO viene del navegador: se toma de la DGII más abajo.
  const body = await req.json().catch(() => null) as {
    rnc?: string; tipoNegocio?: TipoNegocio;
  } | null;
  if (!body?.rnc?.trim() || !body.tipoNegocio) {
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

  // Tope de empresas por cuenta: una cuenta gratis no puede crear tenants sin fin.
  if (memberships.length >= MAX_EMPRESAS_POR_CUENTA) {
    return NextResponse.json({
      error: `Llegaste al máximo de ${MAX_EMPRESAS_POR_CUENTA} empresas por cuenta. Escríbenos a contacto@facturacon.com.do si necesitas más.`,
    }, { status: 403 });
  }

  const tipoInfo = TIPOS_NEGOCIO.find((t) => t.codigo === body.tipoNegocio);
  if (!tipoInfo) return NextResponse.json({ error: "Tipo de negocio inválido" }, { status: 400 });
  if (!tipoInfo.disponible) {
    return NextResponse.json({ error: "Este tipo de negocio todavía no está disponible. Contáctanos para una solución personalizada." }, { status: 400 });
  }

  // Los nombres salen del padrón de la DGII, consultado aquí en el servidor (con
  // caché): la razón social va en el XML y en la factura, y el nombre comercial solo
  // existe si la DGII lo tiene registrado. Así nadie puede poner un nombre ajeno ni
  // inventado, y no depende de lo que mande el navegador.
  const rnc = body.rnc.replace(/\D/g, "");
  if (rnc.length !== 9 && rnc.length !== 11) {
    return NextResponse.json({ error: "El RNC debe tener 9 dígitos (cédula: 11)." }, { status: 400 });
  }
  const dgii = await consultarRncConCache(rnc);
  if (dgii.error) {
    return NextResponse.json({ error: dgii.error }, { status: 503 });
  }
  if (!dgii.valid || !dgii.name) {
    return NextResponse.json({ error: dgii.mensajeDgii || "La DGII no encuentra ese RNC o cédula." }, { status: 400 });
  }

  const tenantRef = adminDb.collection("tenants").doc();
  const tenant: Omit<Tenant, "id" | "slug"> = {
    nombreNegocio: dgii.nombreComercial || dgii.name,
    razonSocial: dgii.name,
    ...(dgii.nombreComercial ? { nombreComercial: dgii.nombreComercial } : {}),
    facturadorElectronicoDGII: dgii.facturadorElectronico ?? null,
    rnc,
    tipoNegocio: body.tipoNegocio,
    estado: "demo",
    creadoEn: new Date().toISOString(),
    creadoPorUid: uid,
  };
  await tenantRef.set(tenant);
  await createMembership(uid, tenantRef.id, "owner");

  // Catálogo y clientes de ejemplo para poder facturar desde el primer minuto. Si falla,
  // la empresa ya está creada: el botón "Cargar datos de ejemplo" lo puede reintentar.
  await sembrarDatosEjemplo(tenantRef.id, body.tipoNegocio).catch((e) => console.error("[crear-tenant] datos de ejemplo:", e));

  return NextResponse.json({ success: true, tenantId: tenantRef.id });
}
