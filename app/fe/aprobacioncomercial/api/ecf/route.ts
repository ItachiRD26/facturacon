// POST /fe/aprobacioncomercial/api/ecf
// La DGII entrega aquí la Aprobación Comercial (ACECF) que un comprador dio a
// un e-CF que NUESTRA empresa emitió. Se guarda, se refleja en la factura
// emitida y se responde con un ACECF firmado (XSD ACECF_v_1_0). GET = vida.
import { adminDb } from "@/lib/firebase-admin";
import { firmarXML } from "@/lib/dgii/xml-signer";
import { obtenerCertificado } from "@/lib/kms/p12-vault";
import { buildACECFXml } from "@/lib/certificacion/acecf";
import type { TipoECF } from "@/types";
import {
  ahoraRD, errorXml, exigeToken, ipDe, leerXml, tag,
  tenantDeLaPeticion, tokenValido, xmlResponse,
} from "@/lib/fe/receptor";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const tenant = await tenantDeLaPeticion(req);
  if (!tenant) return errorXml("Empresa no encontrada", 404);
  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><ACECF><estado>OK</estado></ACECF>`);
}

export async function POST(req: Request) {
  try {
    const tenant = await tenantDeLaPeticion(req);
    if (!tenant) return errorXml("Empresa no encontrada", 404);

    const conToken = await tokenValido(tenant.id, req);
    if (!conToken && exigeToken(tenant)) {
      console.warn(`[fe/aprobacioncomercial][${tenant.id}] sin token válido — IP ${ipDe(req)}`);
      return errorXml("Token requerido", 401);
    }

    const xml = await leerXml(req);
    if (xml === null) return errorXml("Documento demasiado grande", 413);

    const rncPropio    = tenant.rnc.replace(/\D/g, "");
    const encf         = tag(xml, "eNCF") || tag(xml, "ENCF");
    const rncEmisor    = tag(xml, "RNCEmisor").replace(/\D/g, "") || rncPropio;
    const rncComprador = tag(xml, "RNCComprador").replace(/\D/g, "") || rncPropio;
    const aprobada     = tag(xml, "Estado") !== "2";
    const motivo       = tag(xml, "DetalleMotivoRechazo");
    const montoTotal   = parseFloat(tag(xml, "MontoTotal")) || 0;
    const fechaOriginal = tag(xml, "FechaEmision");

    const ahora = ahoraRD();
    let docRef: FirebaseFirestore.DocumentReference | null = null;

    if (xml.trim() && encf) {
      docRef = adminDb.collection("tenants").doc(tenant.id).collection("acecf_recibidas").doc(`${rncComprador}_${encf}`);
      await docRef.set({
        encf, rncEmisor, rncComprador, montoTotal,
        estado: aprobada ? "Aceptado" : "Rechazado",
        ...(motivo ? { motivoRechazo: motivo } : {}),
        fechaHoraAC: ahora,
        xmlRecibido: xml,
        recibidoEn: new Date().toISOString(),
      }, { merge: true });

      // Refleja la decisión del comprador en la factura que emitimos.
      const fact = await adminDb.collection("tenants").doc(tenant.id).collection("facturas")
        .where("eCF", "==", encf).limit(1).get();
      if (!fact.empty) {
        await fact.docs[0].ref.update({
          aprobacionComercial: aprobada ? "Aceptado" : "Rechazado",
          ...(motivo ? { motivoRechazoComercial: motivo } : {}),
        });
      }
    }

    const respuesta = buildACECFXml({
      tipoECF: (encf.match(/^[A-Z]\d{2}/)?.[0] ?? "E31") as TipoECF,
      rncEmisor, encf: encf || "0", rncComprador, montoTotal,
      fechaEmision: fechaOriginal || ahora.split(" ")[0],
      estado: 1, fechaHoraAC: ahora,
    });

    try {
      const { p12Buffer, password } = await obtenerCertificado(tenant.id);
      const firmado = await firmarXML(respuesta, p12Buffer, password);
      if (docRef) await docRef.update({ xmlACECFEnviada: firmado, fechaRespuesta: new Date().toISOString() });
      return xmlResponse(firmado);
    } catch (e) {
      console.error(`[fe/aprobacioncomercial][${tenant.id}] no se pudo firmar:`, e instanceof Error ? e.message : e);
      return errorXml("No se pudo firmar la respuesta", 503);
    }
  } catch (err) {
    console.error("[fe/aprobacioncomercial]", err instanceof Error ? err.message : err);
    return errorXml("Error interno", 500);
  }
}
