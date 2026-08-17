import { NextRequest, NextResponse } from "next/server";
import { requireTenantEnCertificacion } from "@/lib/certificacion/auth";
import { obtenerCertificado } from "@/lib/kms/p12-vault";
import { firmarXML } from "@/lib/dgii/xml-signer";

// Firma con el .p12 ya guardado del tenant un XML arbitrario que el usuario
// descargó de la OFV de la DGII (por ejemplo, el archivo de postulación
// como Emisor Electrónico) — no es un e-CF, así que no pasa por el flujo de
// facturación normal. firmarXML() detecta el elemento raíz del documento
// dinámicamente, por eso sirve igual para esto que para un e-CF o la Semilla.
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });

  const tenantId = form.get("tenantId")?.toString() ?? "";
  const xmlFile  = form.get("xml");

  const verif = await requireTenantEnCertificacion(tenantId);
  if (!verif.ok) return verif.response;

  if (!(xmlFile instanceof Blob)) {
    return NextResponse.json({ error: "Sube el archivo XML de la postulación" }, { status: 400 });
  }

  const xmlOriginal = await xmlFile.text();
  if (!xmlOriginal.trim().startsWith("<")) {
    return NextResponse.json({ error: "El archivo no parece un XML válido" }, { status: 400 });
  }

  let xmlFirmado: string;
  try {
    const { p12Buffer, password } = await obtenerCertificado(tenantId);
    xmlFirmado = await firmarXML(xmlOriginal, p12Buffer, password);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo firmar el XML" }, { status: 400 });
  }

  return new NextResponse(xmlFirmado, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="postulacion-firmada-${tenantId}.xml"`,
    },
  });
}
