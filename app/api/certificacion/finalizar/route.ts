import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireTenantEnCertificacion } from "@/lib/certificacion/auth";
import { generarSlugUnico } from "@/lib/tenant/slug";
import { sellarDatosSandbox } from "@/lib/tenant/sellar-sandbox";

// Cierra el wizard: pasos 12-15 (subir representaciones impresas, validar en
// el portal de la DGII) ocurren FUERA de Facturacon — esta ruta solo registra
// que el usuario confirmó haberlos completado y mueve el tenant a "activo".
// No hay forma de verificar esos pasos automáticamente: dependemos de la
// confirmación honesta del usuario, igual que advierte el checklist en la UI.
//
// También aquí se asigna el slug del subdominio (no existía un punto previo
// donde tuviera sentido asignarlo) y se sella todo lo creado en el entorno
// de prueba con esMuestra:true, para que el sistema real que arranca en el
// subdominio nunca mezcle datos de la etapa de prueba con datos reales.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tenantId = body?.tenantId ?? "";
  const verif = await requireTenantEnCertificacion(tenantId, ["certificando"]);
  if (!verif.ok) return verif.response;

  if (!body?.confirmoPasosPortal) {
    return NextResponse.json({ error: "Falta confirmar que completaste los pasos finales en el portal de la DGII." }, { status: 400 });
  }

  await sellarDatosSandbox(tenantId);

  const slug = verif.tenant.slug ?? await generarSlugUnico();

  await adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("estado").set({
    completadoEn: new Date().toISOString(),
  }, { merge: true });
  await adminDb.collection("tenants").doc(tenantId).update({ estado: "activo", slug });

  return NextResponse.json({ ok: true, slug });
}
