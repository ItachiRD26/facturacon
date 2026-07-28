import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireTenantActivo } from "@/lib/tenant/auth";
import { buildXML, buildRFCEXml } from "@/lib/dgii/xml-builder";
import { firmarXML, extraerSignatureValue } from "@/lib/dgii/xml-signer";
import { calcularCodigoSeguridad, generarURLQR, formatFechaQR, formatFechaHoraQR, extraerFechaHoraFirmaISO } from "@/lib/dgii/qr-builder";
import { getToken, enviarECF, enviarRFCE } from "@/lib/dgii/dgii-client";
import { obtenerCertificado } from "@/lib/kms/p12-vault";
import { contarComprobantesEsteMes } from "@/lib/tenant/estadisticas";
import { buscarPlan } from "@/lib/payments/planes";
import { calcTotales } from "@/types";
import type { Cliente, Factura, LineaServicio, TipoECF } from "@/types";
import type { EmpresaConfig } from "@/types/tenant";

const LIMITE_RFCE = 250_000;

// El SDK Admin rechaza valores `undefined` en .add()/.set() — los campos
// opcionales del body (notas, metodoPago, etc.) llegan como `undefined`
// cuando no se usan.
function cleanData(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) if (value !== undefined) result[key] = value;
  return result;
}

interface Body {
  tenantId: string;
  tipoECF: TipoECF;
  noFactura: string;
  eCF: string;
  fecha: string;
  vencimientoECF: string;
  terminos: string;
  metodoPago?: string;
  clienteId: string;
  items: LineaServicio[];
  esConsumidorFinal?: boolean;
  nombreConsumidor?: string;
  rncCompradorOcasional?: string;
  esExtranjeroComprador?: boolean;
  modalidadPago: "unico" | "plazo";
  fechaVencimientoPago?: string;
  notas?: string;
  idTransaccion?: string;
}

// Emisión real de un e-CF en producción: arma el XML con el motor propio
// (lib/dgii/xml-builder), lo firma con el .p12 del tenant (descifrado de KMS
// solo en este request) y lo envía al ambiente "ecf" real de la DGII — el
// mismo código que usa el wizard de certificación (app/api/certificacion/
// enviar/route.ts) contra "certecf", aquí contra producción.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Body | null;
  if (!body?.tenantId) return NextResponse.json({ error: "Falta tenantId" }, { status: 400 });

  const verif = await requireTenantActivo(body.tenantId);
  if (!verif.ok) return verif.response;
  const { tenantId } = body;

  // Límite de comprobantes del plan contratado — sin esto, cualquier tenant
  // podía emitir comprobantes ilimitados sin importar el plan que pagó.
  const pagoSnap = await adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("pago").get();
  const planId = pagoSnap.data()?.planId as string | undefined;
  const plan = planId ? buscarPlan(planId) : undefined;
  if (plan) {
    const emitidasEsteMes = await contarComprobantesEsteMes(tenantId);
    if (emitidasEsteMes >= plan.facturas) {
      return NextResponse.json({
        error: `Alcanzaste el límite de ${plan.facturas} comprobantes/mes de tu plan. Actualiza tu plan para seguir emitiendo.`,
      }, { status: 403 });
    }
  }

  const empresaSnap = await adminDb.collection("tenants").doc(tenantId).collection("config").doc("empresa").get();
  if (!empresaSnap.exists) {
    return NextResponse.json({ error: "Esta empresa no tiene datos de emisor configurados." }, { status: 400 });
  }
  const empresa = empresaSnap.data() as EmpresaConfig;

  let cliente: Cliente | undefined;
  if (!body.esConsumidorFinal && body.clienteId) {
    const clienteSnap = await adminDb.collection("tenants").doc(tenantId).collection("clientes").doc(body.clienteId).get();
    if (!clienteSnap.exists) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    cliente = { id: clienteSnap.id, ...clienteSnap.data() } as Cliente;
  }

  const factura: Factura = {
    id: "", noFactura: body.noFactura, eCF: body.eCF, tipoECF: body.tipoECF,
    fecha: body.fecha, vencimientoECF: body.vencimientoECF,
    terminos: body.terminos, metodoPago: body.metodoPago,
    clienteId: body.clienteId, idTransaccion: body.idTransaccion,
    esConsumidorFinal: body.esConsumidorFinal, nombreConsumidor: body.nombreConsumidor,
    rncCompradorOcasional: body.rncCompradorOcasional, esExtranjeroComprador: body.esExtranjeroComprador,
    estado: body.terminos === "Contado" ? "pagada" : "pendiente",
    items: body.items, notas: body.notas,
    modalidadPago: body.modalidadPago, fechaVencimientoPago: body.fechaVencimientoPago,
  };

  const tenant = { tenantId, rnc: empresa.rnc, ambiente: empresa.ambiente };

  try {
    const token = await getToken(tenant, async () => obtenerCertificado(tenantId));
    const { p12Buffer, password } = await obtenerCertificado(tenantId);

    const totales = calcTotales(factura.items);
    const esRFCE = factura.tipoECF === "E32" && totales.total < LIMITE_RFCE;

    let trackId = "";
    let estadoDGII: Factura["estadoDGII"] = "Enviado";
    let urlQR = "";
    let codigoSeguridad = "";
    let signatureValue = "";
    let xmlFirmado = "";

    if (esRFCE) {
      xmlFirmado = await firmarXML(buildXML(factura, cliente, empresa), p12Buffer, password);
      signatureValue = extraerSignatureValue(xmlFirmado);
      codigoSeguridad = calcularCodigoSeguridad(signatureValue);

      const rfceXmlFirmado = await firmarXML(buildRFCEXml(factura, empresa, codigoSeguridad, cliente), p12Buffer, password);
      const resultado = await enviarRFCE(rfceXmlFirmado, tenant, token, factura.eCF);
      trackId = resultado.trackId;
      estadoDGII = "Aceptado";
      // fechaFirma se extrae del XML realmente firmado (xmlFirmado, el mismo
      // que produjo signatureValue/codigoSeguridad) en vez de recalcularse
      // con new Date() — si no coinciden, consultatimbre responde "no
      // encontrada" aunque la URL sea sintácticamente válida.
      urlQR = generarURLQR({
        rncEmisor: empresa.rnc, eNCF: factura.eCF, montoTotal: totales.total,
        fechaEmision: formatFechaQR(factura.fecha), fechaFirma: formatFechaHoraQR(extraerFechaHoraFirmaISO(xmlFirmado)),
        signatureValue, esRFCE: true,
      }, empresa.ambiente);
    } else {
      xmlFirmado = await firmarXML(buildXML(factura, cliente, empresa), p12Buffer, password);
      signatureValue = extraerSignatureValue(xmlFirmado);
      codigoSeguridad = calcularCodigoSeguridad(signatureValue);
      trackId = await enviarECF(xmlFirmado, tenant, token, factura.eCF);
      urlQR = generarURLQR({
        rncEmisor: empresa.rnc, rncComprador: cliente?.rnc, eNCF: factura.eCF, montoTotal: totales.total,
        fechaEmision: formatFechaQR(factura.fecha), fechaFirma: formatFechaHoraQR(extraerFechaHoraFirmaISO(xmlFirmado)),
        signatureValue,
      }, empresa.ambiente);
    }

    const facturaCompleta = {
      ...factura,
      estadoDGII, trackIdDGII: trackId, urlQR, xmlFirmado, signatureValue, codigoSeguridad,
      fechaEnvioDGII: new Date().toISOString(),
    };

    // El documento se crea aquí, con el Admin SDK (ignora firestore.rules),
    // porque es la única forma de garantizar que estadoDGII/trackIdDGII/
    // xmlFirmado en Firestore corresponden a una respuesta real de la DGII
    // — si el cliente escribiera este documento por su cuenta, cualquier
    // miembro del tenant podría fabricar un comprobante "Aceptado" sin que
    // pasara nunca por la DGII (ver regla noToca() en firestore.rules).
    const { id: _omitId, ...datosFactura } = facturaCompleta;
    void _omitId;
    const ref = await adminDb.collection("tenants").doc(tenantId).collection("facturas").add(cleanData(datosFactura));

    console.log(`[emitir][${tenantId}] e-CF ${factura.eCF} (${factura.tipoECF}) → trackId=${trackId} estado=${estadoDGII} docId=${ref.id}`);

    return NextResponse.json({ ok: true, id: ref.id, factura: facturaCompleta });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    console.error(`[emitir][${tenantId}] Falló la emisión de ${body.eCF}:`, mensaje);
    return NextResponse.json({ error: `No se pudo emitir el comprobante ante la DGII: ${mensaje}` }, { status: 502 });
  }
}
