import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireTenantEnCertificacion } from "@/lib/certificacion/auth";
import { buildXML, buildRFCEXml, LIMITE_RFCE } from "@/lib/dgii/xml-builder";
import { firmarXML, extraerSignatureValue } from "@/lib/dgii/xml-signer";
import { calcularCodigoSeguridad } from "@/lib/dgii/qr-builder";
import { getToken, enviarECF, enviarRFCE } from "@/lib/dgii/dgii-client";
import { obtenerCertificado } from "@/lib/kms/p12-vault";
import { secuenciasUsadasEnPaso2 } from "@/lib/certificacion/mapeo";
import { siguienteENCFPrueba } from "@/lib/certificacion/secuencias";
import { RNC_PRUEBA_DGII, NOMBRE_PRUEBA_DGII, type FacturaPrueba } from "@/lib/certificacion/tipos";
import type { Cliente, Factura, LineaServicio, TipoECF } from "@/types";
import type { FilaSetPrueba } from "@/lib/certificacion/tipos";
import type { EmpresaConfig } from "@/types/tenant";

const TIPOS_VALIDOS: TipoECF[] = ["E32", "E33", "E34", "E41", "E43", "E44", "E45", "E46", "E47"];

// Crea, firma y envía un e-CF de prueba "a mano" (Paso 4 — pruebas de
// simulación que la DGII exige interactivamente, no desde el Excel del Paso
// 2). Cubre los 9 tipos que aparecen en esa fase. El cuerpo del POST es un
// formulario único con campos opcionales según el tipo — la UI solo muestra
// los campos relevantes para el tipo elegido, esta ruta vuelve a validar.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tenantId = body?.tenantId ?? "";
  const verif = await requireTenantEnCertificacion(tenantId);
  if (!verif.ok) return verif.response;

  const tipoECF = body?.tipoECF as TipoECF;
  if (!TIPOS_VALIDOS.includes(tipoECF)) {
    return NextResponse.json({ error: "Tipo de e-CF de prueba no soportado" }, { status: 400 });
  }

  const descripcion = String(body?.descripcion ?? "").trim();
  const monto = Number(body?.monto ?? 0);
  if (!descripcion || !(monto > 0)) {
    return NextResponse.json({ error: "Descripción y monto (mayor a 0) son obligatorios" }, { status: 400 });
  }
  if (["E33", "E34"].includes(tipoECF) && !String(body?.eCFRef ?? "").trim()) {
    return NextResponse.json({ error: "E33/E34 necesitan el eNCF que modifican (eCFRef)" }, { status: 400 });
  }

  const [setSnap, empresaSnap] = await Promise.all([
    adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("set_paso2").get(),
    adminDb.collection("tenants").doc(tenantId).collection("config").doc("empresa").get(),
  ]);
  if (!empresaSnap.exists) return NextResponse.json({ error: "Completa primero los datos de empresa" }, { status: 400 });
  const empresa = empresaSnap.data() as EmpresaConfig;
  const tenant  = { tenantId, rnc: empresa.rnc, ambiente: empresa.ambiente };

  const filasPaso2 = Object.values((setSnap.data()?.filas ?? {}) as Record<string, FilaSetPrueba>);
  const reservados = secuenciasUsadasEnPaso2(filasPaso2).get(tipoECF) ?? new Set<number>();
  const eCF = await siguienteENCFPrueba(tenantId, tipoECF, reservados);

  const itbis = [0, 0.16, 0.18].includes(Number(body?.itbis)) ? Number(body.itbis) : 0;
  const linea: LineaServicio = {
    codigo: "", descripcion, modo: "unidad", cant: 1, pax: 0,
    precio: monto, descuentoMonto: 0, itbis,
  };

  let cliente: Cliente | undefined;
  if (tipoECF === "E41") {
    const rnc = String(body?.rncProveedor ?? "").replace(/\D/g, "");
    if (!rnc) return NextResponse.json({ error: "E41 necesita el RNC del proveedor" }, { status: 400 });
    cliente = { id: `prueba-${eCF}`, rnc, nombre: String(body?.nombreProveedor ?? "Proveedor de prueba"), direccion: "", ciudad: "", contacto: "", telefono: "", tipo: "juridica" };
  } else if (tipoECF === "E44" || tipoECF === "E45") {
    const rnc = String(body?.rncComprador ?? "").replace(/\D/g, "") || RNC_PRUEBA_DGII;
    cliente = { id: `prueba-${eCF}`, rnc, nombre: String(body?.nombreComprador ?? NOMBRE_PRUEBA_DGII), direccion: "", ciudad: "", contacto: "", telefono: "", tipo: "juridica" };
  } else if (tipoECF === "E46") {
    if (body?.esExtranjero) {
      cliente = undefined; // buildE46 usa compradorExtranjero() vía idTransaccion en la factura
    } else {
      const rnc = String(body?.rncComprador ?? "").replace(/\D/g, "") || RNC_PRUEBA_DGII;
      cliente = { id: `prueba-${eCF}`, rnc, nombre: String(body?.nombreComprador ?? NOMBRE_PRUEBA_DGII), direccion: "", ciudad: "", contacto: "", telefono: "", tipo: "juridica" };
    }
  } else if (tipoECF === "E33" || tipoECF === "E34") {
    const rnc = String(body?.rncComprador ?? "").replace(/\D/g, "");
    if (rnc) cliente = { id: `prueba-${eCF}`, rnc, nombre: String(body?.nombreComprador ?? NOMBRE_PRUEBA_DGII), direccion: "", ciudad: "", contacto: "", telefono: "", tipo: "juridica" };
  } else if (tipoECF === "E32") {
    const rnc = String(body?.rncComprador ?? "").replace(/\D/g, "");
    if (rnc) cliente = { id: `prueba-${eCF}`, rnc, nombre: String(body?.nombreComprador ?? NOMBRE_PRUEBA_DGII), direccion: "", ciudad: "", contacto: "", telefono: "", tipo: "juridica" };
  }

  const factura: Factura = {
    id: eCF, noFactura: eCF, eCF, tipoECF,
    fecha: String(body?.fecha ?? new Date().toISOString().slice(0, 10)),
    vencimientoECF: "2099-12-31",
    terminos: "Contado",
    clienteId: cliente?.id ?? "",
    items: [linea],
    estado: "pendiente",
    ...( ["E33", "E34"].includes(tipoECF) ? {
      eCFRef: String(body.eCFRef).trim().toUpperCase(),
      motivoNota: String(body?.motivoNota ?? "Ajuste de prueba de certificación"),
      codigoModificacion: String(body?.codigoModificacion ?? "1"),
    } : {}),
    ...(tipoECF === "E46" && body?.esExtranjero ? {
      idTransaccion: String(body?.idExtranjero ?? ""),
      nombreConsumidor: String(body?.nombreExtranjero ?? "Beneficiario exterior"),
    } : {}),
    ...(tipoECF === "E47" ? {
      idTransaccion: String(body?.idExtranjero ?? ""),
      nombreConsumidor: String(body?.nombreExtranjero ?? "Beneficiario exterior"),
    } : {}),
    ...(!cliente && tipoECF === "E32" ? { nombreConsumidor: NOMBRE_PRUEBA_DGII } : {}),
  };

  try {
    const token = await getToken(tenant, async () => obtenerCertificado(tenantId));
    const { p12Buffer, password } = await obtenerCertificado(tenantId);

    const xmlSinFirma = buildXML(factura, cliente, empresa);
    const xmlFirmado  = await firmarXML(xmlSinFirma, p12Buffer, password);

    let trackId: string;
    const esRFCE = tipoECF === "E32" && monto < LIMITE_RFCE;
    if (esRFCE) {
      const signatureValue  = extraerSignatureValue(xmlFirmado);
      const codigoSeguridad = calcularCodigoSeguridad(signatureValue);
      await adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("ecf_firmados")
        .set({ [eCF]: { xmlFirmado, codigoSeguridad, guardadoEn: new Date().toISOString() } }, { merge: true });

      const rfceXmlSinFirma = buildRFCEXml(factura, empresa, codigoSeguridad, cliente);
      const rfceXmlFirmado  = await firmarXML(rfceXmlSinFirma, p12Buffer, password);
      const resultado = await enviarRFCE(rfceXmlFirmado, tenant, token, eCF);
      trackId = resultado.trackId || resultado.estado;
    } else {
      trackId = await enviarECF(xmlFirmado, tenant, token, eCF);
    }

    const registro: FacturaPrueba = {
      id: eCF, tipoECF, eCF, fecha: factura.fecha, descripcion, montoTotal: monto,
      estadoEnvio: "enviado", trackId, creadoEn: new Date().toISOString(),
    };
    await adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("facturas_prueba")
      .set({ [eCF]: registro }, { merge: true });

    return NextResponse.json({ ok: true, eCF, trackId });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    const registro: FacturaPrueba = {
      id: eCF, tipoECF, eCF, fecha: factura.fecha, descripcion, montoTotal: monto,
      estadoEnvio: "error", error: mensaje, creadoEn: new Date().toISOString(),
    };
    await adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("facturas_prueba")
      .set({ [eCF]: registro }, { merge: true });
    return NextResponse.json({ error: mensaje }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("t") ?? "";
  const verif = await requireTenantEnCertificacion(tenantId);
  if (!verif.ok) return verif.response;

  const snap = await adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("facturas_prueba").get();
  return NextResponse.json({ items: snap.exists ? snap.data() : {} });
}
