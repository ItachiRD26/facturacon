// POST /fe/recepcion/api/ecf
// La DGII entrega aquí los e-CF dirigidos a la empresa como COMPRADORA. La
// respuesta debe ser un ARECF (Acuse de Recibo) firmado con el certificado de
// esa empresa (XSD ARECF_v_1_0). GET = comprobación de vida.
import { adminDb } from "@/lib/firebase-admin";
import { firmarXML } from "@/lib/dgii/xml-signer";
import { obtenerCertificado } from "@/lib/kms/p12-vault";
import {
  ahoraRD, errorXml, escapeXml, exigeToken, fechaIso, ipDe, leerXml, tag,
  tenantDeLaPeticion, tokenValido, xmlResponse,
} from "@/lib/fe/receptor";

export const dynamic = "force-dynamic";

// Estado 0 = recibido. Estado 1 = no recibido, con código de motivo
// (1 = error de especificación, 2 = error de firma, 3 = duplicado, 4 = RNC comprador no corresponde).
function buildARECF(p: { rncEmisor: string; rncComprador: string; encf: string; noRecibido?: 1 | 2 | 3 | 4 }): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<ARECF><DetalleAcusedeRecibo>`,
    `<Version>1.0</Version>`,
    `<RNCEmisor>${escapeXml(p.rncEmisor)}</RNCEmisor>`,
    `<RNCComprador>${escapeXml(p.rncComprador)}</RNCComprador>`,
    `<eNCF>${escapeXml(p.encf)}</eNCF>`,
    `<Estado>${p.noRecibido ? 1 : 0}</Estado>`,
    p.noRecibido ? `<CodigoMotivoNoRecibido>${p.noRecibido}</CodigoMotivoNoRecibido>` : "",
    `<FechaHoraAcuseRecibo>${ahoraRD()}</FechaHoraAcuseRecibo>`,
    `</DetalleAcusedeRecibo></ARECF>`,
  ].join("");
}

// Los tipos 32 (consumo), 41, 43, 46 y 47 no llevan aprobación comercial.
const TIPOS_SIN_ACECF = new Set(["E32", "E41", "E43", "E46", "E47"]);

export async function GET(req: Request) {
  const tenant = await tenantDeLaPeticion(req);
  if (!tenant) return errorXml("Empresa no encontrada", 404);
  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><ARECF><estado>OK</estado></ARECF>`);
}

export async function POST(req: Request) {
  try {
    const tenant = await tenantDeLaPeticion(req);
    if (!tenant) return errorXml("Empresa no encontrada", 404);

    const conToken = await tokenValido(tenant.id, req);
    if (!conToken && exigeToken(tenant)) {
      console.warn(`[fe/recepcion][${tenant.id}] sin token válido — IP ${ipDe(req)}`);
      return errorXml("Token requerido", 401);
    }

    const xml = await leerXml(req);
    if (xml === null) return errorXml("Documento demasiado grande", 413);

    const rncComprador = tenant.rnc.replace(/\D/g, "");
    const encf       = tag(xml, "eNCF") || tag(xml, "ENCF");
    const rncEmisor  = tag(xml, "RNCEmisor").replace(/\D/g, "");

    // Sin eNCF/RNC emisor no hay nada que guardar: se acusa como "no recibido
    // por error de especificación" (firmado igual, para que la DGII lo entienda).
    const valido = !!xml.trim() && !!encf && !!rncEmisor;
    const arecf = buildARECF({ rncEmisor: rncEmisor || "0", rncComprador, encf: encf || "0", noRecibido: valido ? undefined : 1 });

    if (valido) {
      const tipoECF = tag(xml, "TipoeCF") ? `E${tag(xml, "TipoeCF").padStart(2, "0")}` : (encf.match(/^([A-Z]\d{2})/)?.[1] ?? "");
      const ref = adminDb.collection("tenants").doc(tenant.id).collection("facturas_recibidas").doc(`${rncEmisor}_${encf}`);
      const previo = await ref.get();
      // Reenvío del mismo e-CF: se re-acusa pero no se pisa lo que ya se decidió.
      if (!previo.exists) {
        await ref.set({
          encf, tipoECF, rncEmisor, rncComprador,
          ...(tag(xml, "RazonSocialEmisor") || tag(xml, "NombreEmisor")
            ? { razonSocialEmisor: tag(xml, "RazonSocialEmisor") || tag(xml, "NombreEmisor") } : {}),
          fechaEmision: fechaIso(tag(xml, "FechaEmision")),
          montoTotal: parseFloat(tag(xml, "MontoTotal")) || 0,
          estadoARECF: "pendiente",
          estadoACECF: TIPOS_SIN_ACECF.has(tipoECF) ? "NoAplica" : "pendiente",
          xmlRecibido: xml,
          recibidoEn: new Date().toISOString(),
        });
      }

      try {
        const { p12Buffer, password } = await obtenerCertificado(tenant.id);
        const firmado = await firmarXML(arecf, p12Buffer, password);
        await ref.update({ estadoARECF: "Enviado", fechaARECF: new Date().toISOString(), xmlARECF: firmado });
        console.log(`[fe/recepcion][${tenant.id}] ${encf} de ${rncEmisor} acusado`);
        return xmlResponse(firmado);
      } catch (e) {
        await ref.update({ estadoARECF: "Error" }).catch(() => {});
        console.error(`[fe/recepcion][${tenant.id}] no se pudo firmar el ARECF:`, e instanceof Error ? e.message : e);
        return errorXml("No se pudo firmar el acuse", 503);
      }
    }

    try {
      const { p12Buffer, password } = await obtenerCertificado(tenant.id);
      return xmlResponse(await firmarXML(arecf, p12Buffer, password));
    } catch {
      return errorXml("No se pudo firmar el acuse", 503);
    }
  } catch (err) {
    console.error("[fe/recepcion]", err instanceof Error ? err.message : err);
    return errorXml("Error interno", 500);
  }
}
