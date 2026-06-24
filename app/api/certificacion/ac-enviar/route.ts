import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireTenantEnCertificacion } from "@/lib/certificacion/auth";
import { buildACECFXml } from "@/lib/certificacion/acecf";
import { firmarXML } from "@/lib/dgii/xml-signer";
import { getToken, enviarACECF } from "@/lib/dgii/dgii-client";
import { obtenerCertificado } from "@/lib/kms/p12-vault";
import type { ItemAC } from "@/lib/certificacion/tipos";
import type { EmpresaConfig } from "@/types/tenant";

// Envía la decisión de Aprobación/Rechazo Comercial de un eNCF (Paso 3).
// El usuario puede editar `estado`/`motivoRechazo` antes de enviar — el
// cuerpo del POST manda el valor final, no se relee del Excel.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tenantId = body?.tenantId ?? "";
  const encf = body?.encf ?? "";
  const verif = await requireTenantEnCertificacion(tenantId);
  if (!verif.ok) return verif.response;
  if (!encf) return NextResponse.json({ error: "Falta el eNCF" }, { status: 400 });

  const acRef = adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("ac_set");
  const [acSnap, empresaSnap] = await Promise.all([
    acRef.get(),
    adminDb.collection("tenants").doc(tenantId).collection("config").doc("empresa").get(),
  ]);
  if (!acSnap.exists || !empresaSnap.exists) {
    return NextResponse.json({ error: "Falta el Excel de AC o los datos de empresa" }, { status: 400 });
  }

  const items = (acSnap.data()?.items ?? {}) as Record<string, ItemAC>;
  const item = items[encf];
  if (!item) return NextResponse.json({ error: `${encf} no está en el set de AC` }, { status: 404 });

  const estado = body.estado === 2 ? 2 : 1;
  const itemFinal: ItemAC = {
    ...item,
    estado,
    motivoRechazo: estado === 2 ? (body.motivoRechazo || item.motivoRechazo) : undefined,
  };

  const empresa = empresaSnap.data() as EmpresaConfig;
  const tenant = { tenantId, rnc: empresa.rnc, ambiente: empresa.ambiente };

  try {
    const token = await getToken(tenant, async () => obtenerCertificado(tenantId));
    const { p12Buffer, password } = await obtenerCertificado(tenantId);

    const xmlSinFirma = buildACECFXml(itemFinal);
    const xmlFirmado  = await firmarXML(xmlSinFirma, p12Buffer, password);
    const resultado   = await enviarACECF(xmlFirmado, tenant, token);

    await acRef.update({
      [`items.${encf}.enviado`]: true,
      [`items.${encf}.resultado`]: resultado.mensaje,
      [`items.${encf}.estado`]: estado,
      [`items.${encf}.error`]: null,
    });

    return NextResponse.json({ ok: true, resultado });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    await acRef.update({ [`items.${encf}.error`]: mensaje });
    return NextResponse.json({ error: mensaje }, { status: 502 });
  }
}
