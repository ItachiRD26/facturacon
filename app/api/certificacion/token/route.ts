import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireTenantEnCertificacion } from "@/lib/certificacion/auth";
import { getToken } from "@/lib/dgii/dgii-client";
import { obtenerCertificado } from "@/lib/kms/p12-vault";
import type { EmpresaConfig } from "@/types/tenant";

// A diferencia del set de pruebas de referencia (que exigía descargar la
// semilla, firmarla a mano con la app de Firma Digital de la DGII y volver a
// subirla), aquí firmamos la semilla automáticamente con el .p12 del tenant
// — ya descifrado de KMS por dgii-client.getToken() — porque es la misma
// llave privada y el mismo algoritmo que firmaría la app de la DGII. No hay
// nada manual que el usuario tenga que hacer en este paso.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tenantId = body?.tenantId ?? "";
  const verif = await requireTenantEnCertificacion(tenantId);
  if (!verif.ok) return verif.response;

  const empresaSnap = await adminDb.collection("tenants").doc(tenantId).collection("config").doc("empresa").get();
  if (!empresaSnap.exists) {
    return NextResponse.json({ error: "Completa primero los datos de empresa (Paso 0)." }, { status: 400 });
  }
  const empresa = empresaSnap.data() as EmpresaConfig;

  try {
    await getToken(
      { tenantId, rnc: empresa.rnc, ambiente: empresa.ambiente },
      async () => obtenerCertificado(tenantId),
    );
  } catch (e) {
    return NextResponse.json({ error: `No se pudo obtener el token de la DGII: ${e instanceof Error ? e.message : e}` }, { status: 502 });
  }

  const tokenSnap = await adminDb.collection("tenants").doc(tenantId).collection("config").doc("dgii_token").get();
  const data = tokenSnap.data() as { expira: string } | undefined;
  return NextResponse.json({ ok: true, expira: data?.expira ?? null });
}

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("t") ?? "";
  const verif = await requireTenantEnCertificacion(tenantId);
  if (!verif.ok) return verif.response;

  const tokenSnap = await adminDb.collection("tenants").doc(tenantId).collection("config").doc("dgii_token").get();
  if (!tokenSnap.exists) return NextResponse.json({ valido: false });

  const data = tokenSnap.data() as { expira: string };
  const valido = new Date(data.expira).getTime() - Date.now() > 5 * 60 * 1000;
  return NextResponse.json({ valido, expira: data.expira });
}
