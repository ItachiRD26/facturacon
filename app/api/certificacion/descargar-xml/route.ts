import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireTenantEnCertificacion } from "@/lib/certificacion/auth";

// Sirve el XML firmado de un e-CF de prueba (guardado al enviarlo como RFCE
// — ver /api/certificacion/enviar) para que el usuario lo suba a mano al
// portal de la DGII en el Paso 5 (DGII exige subir ahí los E32<250k).
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("t") ?? "";
  const encf     = req.nextUrl.searchParams.get("encf") ?? "";
  const verif = await requireTenantEnCertificacion(tenantId);
  if (!verif.ok) return verif.response;
  if (!encf) return NextResponse.json({ error: "Falta el eNCF" }, { status: 400 });

  const snap = await adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("ecf_firmados").get();
  const data = snap.data()?.[encf] as { xmlFirmado?: string } | undefined;
  if (!data?.xmlFirmado) {
    return NextResponse.json({ error: `No hay XML firmado guardado para ${encf}` }, { status: 404 });
  }

  return new NextResponse(data.xmlFirmado, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encf}.xml"`,
    },
  });
}
