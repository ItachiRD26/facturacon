import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getSessionUid } from "@/lib/auth/session";
import { getMembership } from "@/lib/tenant/get-memberships";
import { getTenantById } from "@/lib/tenant/resolve-tenant";
import { adminDb } from "@/lib/firebase-admin";
import { loadCertAndKey, extraerRncDelCertificado } from "@/lib/dgii/xml-signer";
import { guardarCertificado } from "@/lib/kms/p12-vault";
import { consultarRncODGII } from "@/lib/dgii/validar-rnc-cedula";

// Verifica el certificado de firma digital (.p12) y la cédula del
// representante ANTES de dejar avanzar al tenant a "pendiente_certificacion".
// Falla rápido si el .p12/contraseña son inválidos o si el RNC del
// certificado no corresponde al RNC declarado por el tenant — evita que se
// suba un certificado equivocado y solo se descubra al intentar firmar de
// verdad en la Fase 5.
export async function POST(req: NextRequest) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });

  const tenantId = form.get("tenantId")?.toString() ?? "";
  // Un espacio de más al copiar la contraseña del .p12 es el error más común
  // al subir el certificado — la recortamos también del lado del servidor
  // (defensa en profundidad, sin depender de que el cliente ya la recortó).
  const password = form.get("password")?.toString().trim() ?? "";
  const cedula   = form.get("cedula")?.toString() ?? "";
  const p12File  = form.get("p12");

  if (!tenantId || !password || !cedula.trim() || !(p12File instanceof Blob)) {
    return NextResponse.json({ error: "Faltan datos: certificado, contraseña o cédula" }, { status: 400 });
  }

  const membership = await getMembership(uid, tenantId);
  if (!membership || (membership.rol !== "owner" && membership.rol !== "admin")) {
    return NextResponse.json({ error: "No tienes acceso a esta empresa" }, { status: 403 });
  }

  const tenant = await getTenantById(tenantId);
  if (!tenant) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  if (tenant.estado !== "demo") {
    return NextResponse.json({ error: "Esta empresa ya pasó este paso o no está en estado de prueba." }, { status: 400 });
  }

  const p12Buffer = Buffer.from(await p12File.arrayBuffer());

  let rncCertificado: string | null;
  try {
    loadCertAndKey(p12Buffer, password);
    rncCertificado = extraerRncDelCertificado(p12Buffer, password);
  } catch {
    return NextResponse.json({ error: "No se pudo leer el certificado — verifica la contraseña o el archivo .p12." }, { status: 400 });
  }

  if (!rncCertificado || rncCertificado !== tenant.rnc) {
    return NextResponse.json({ error: "El certificado no corresponde al RNC de tu empresa." }, { status: 400 });
  }

  const consulta = await consultarRncODGII(cedula);
  if (!consulta.valid) {
    return NextResponse.json({ error: "No pudimos validar esa cédula en el padrón de la DGII." }, { status: 400 });
  }
  if (!consulta.activo) {
    return NextResponse.json({ error: "La cédula no figura como Activa ante la DGII. Actualízala antes de continuar." }, { status: 400 });
  }

  const fingerprint = createHash("sha256").update(p12Buffer).digest("hex").slice(0, 16).toUpperCase();
  await guardarCertificado(tenantId, p12Buffer, password, fingerprint);

  await adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("requisitos").set({
    cedula: consulta.rnc ?? cedula.replace(/\D/g, ""),
    cedulaNombre: consulta.name ?? null,
    fingerprint,
    completadoEn: new Date().toISOString(),
  });

  await adminDb.collection("tenants").doc(tenantId).update({ estado: "pendiente_certificacion" });

  return NextResponse.json({ ok: true });
}
