import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireTenantEnCertificacion } from "@/lib/certificacion/auth";
import { buildXML, buildRFCEXml } from "@/lib/dgii/xml-builder";
import { firmarXML, extraerSignatureValue } from "@/lib/dgii/xml-signer";
import { calcularCodigoSeguridad } from "@/lib/dgii/qr-builder";
import { getToken, enviarECF, enviarRFCE } from "@/lib/dgii/dgii-client";
import { obtenerCertificado } from "@/lib/kms/p12-vault";
import { esRFCE, filaACliente, filaAFactura } from "@/lib/certificacion/mapeo";
import type { FilaSetPrueba } from "@/lib/certificacion/tipos";
import type { EmpresaConfig } from "@/types/tenant";

// Envía UN eNCF del set de pruebas del Paso 2. La orquestación de los 25
// (orden de grupos, espera de la "compuerta" E33/E34, throttling de 1.2s
// entre envíos) vive en el cliente (igual que en la referencia) — esta ruta
// solo sabe firmar y enviar uno, y deja el resultado escrito en Firestore
// para que el cliente pueda hacer polling del estado de la fila.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tenantId = body?.tenantId ?? "";
  const encf = body?.encf ?? "";
  const verif = await requireTenantEnCertificacion(tenantId);
  if (!verif.ok) return verif.response;
  if (!encf) return NextResponse.json({ error: "Falta el eNCF" }, { status: 400 });

  const setRef = adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("set_paso2");
  const [setSnap, empresaSnap] = await Promise.all([
    setRef.get(),
    adminDb.collection("tenants").doc(tenantId).collection("config").doc("empresa").get(),
  ]);

  if (!setSnap.exists) return NextResponse.json({ error: "No hay set de pruebas cargado" }, { status: 400 });
  if (!empresaSnap.exists) return NextResponse.json({ error: "Completa primero los datos de empresa" }, { status: 400 });

  const filas = (setSnap.data()?.filas ?? {}) as Record<string, FilaSetPrueba>;
  const fila = filas[encf];
  if (!fila) return NextResponse.json({ error: `eNCF ${encf} no está en el set cargado` }, { status: 404 });
  if (fila.estadoEnvio === "enviado" || fila.estadoEnvio === "aceptado") {
    return NextResponse.json({ ok: true, trackId: fila.trackId, yaEnviado: true });
  }

  const empresa = empresaSnap.data() as EmpresaConfig;
  const tenant = { tenantId, rnc: empresa.rnc, ambiente: empresa.ambiente };

  try {
    const token = await getToken(tenant, async () => obtenerCertificado(tenantId));
    const { p12Buffer, password } = await obtenerCertificado(tenantId);

    const factura = filaAFactura(fila);
    const cliente = filaACliente(fila);

    const xmlSinFirma = buildXML(factura, cliente, empresa);
    const xmlFirmado  = await firmarXML(xmlSinFirma, p12Buffer, password);

    let trackId: string;
    if (esRFCE(fila)) {
      const signatureValue = extraerSignatureValue(xmlFirmado);
      const codigoSeguridad = calcularCodigoSeguridad(signatureValue);

      // El ECF completo no se envía, pero hay que guardarlo firmado: el
      // Paso 5 necesita subirlo a mano al portal de la DGII.
      await adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("ecf_firmados")
        .set({ [encf]: { xmlFirmado, codigoSeguridad, guardadoEn: new Date().toISOString() } }, { merge: true });

      const rfceXmlSinFirma = buildRFCEXml(factura, empresa, codigoSeguridad, cliente);
      const rfceXmlFirmado  = await firmarXML(rfceXmlSinFirma, p12Buffer, password);
      const resultado = await enviarRFCE(rfceXmlFirmado, tenant, token, encf);
      trackId = resultado.trackId || resultado.estado;
    } else {
      trackId = await enviarECF(xmlFirmado, tenant, token, encf);
    }

    await setRef.update({
      [`filas.${encf}.estadoEnvio`]: "enviado",
      [`filas.${encf}.trackId`]: trackId,
      [`filas.${encf}.enviadoEn`]: new Date().toISOString(),
      [`filas.${encf}.error`]: null,
    });

    return NextResponse.json({ ok: true, trackId });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    await setRef.update({
      [`filas.${encf}.estadoEnvio`]: "error",
      [`filas.${encf}.error`]: mensaje,
    });
    return NextResponse.json({ error: mensaje }, { status: 502 });
  }
}
