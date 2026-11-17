import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireTenantActivo } from "@/lib/tenant/auth";
import { registrarAuditoria } from "@/lib/auditoria/registrar";
import { buildXML, buildRFCEXml, totalesFiscales, LIMITE_RFCE, fmtRNC } from "@/lib/dgii/xml-builder";
import { firmarXML, extraerSignatureValue } from "@/lib/dgii/xml-signer";
import { calcularCodigoSeguridad, generarURLQR, formatFechaQR, formatFechaHoraQR, extraerFechaHoraFirmaISO } from "@/lib/dgii/qr-builder";
import { getToken, enviarECF, enviarRFCE } from "@/lib/dgii/dgii-client";
import { obtenerCertificado } from "@/lib/kms/p12-vault";
import { clasificarError, marcarExito, marcarFallo, servicioEnPausa } from "@/lib/dgii/reenvio";
import { contarComprobantesEsteMes } from "@/lib/tenant/estadisticas";
import { obtenerSuscripcion } from "@/lib/payments/suscripcion";
import { buscarPlan } from "@/lib/payments/planes";
import { ErrorSecuencia, TIPOS_CON_SECUENCIA, hoyRD, reservarENCF } from "@/lib/tenant/secuencias-fiscales";
import type { Cliente, Factura, LineaServicio, TipoECF } from "@/types";
import type { EmpresaConfig } from "@/types/tenant";

// El SDK Admin rechaza valores `undefined` en .add()/.set().
function cleanData(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) if (value !== undefined) result[key] = value;
  return result;
}

// Lo que el cliente PUEDE decidir. Todo lo fiscal (e-NCF, fecha de emisión,
// vencimiento de la secuencia, totales, estado ante la DGII) lo decide este
// servidor: antes el navegador mandaba el e-NCF, la fecha y el vencimiento.
interface Body {
  tenantId: string;
  idempotencyKey: string;
  tipoECF: TipoECF;
  terminos: string;
  metodoPago?: string;
  clienteId: string;
  items: LineaServicio[];
  esConsumidorFinal?: boolean;
  nombreConsumidor?: string;
  telefonoConsumidor?: string;
  rncCompradorOcasional?: string;
  esExtranjeroComprador?: boolean;
  modalidadPago: "unico" | "plazo";
  fechaVencimientoPago?: string;
  notas?: string;
  idTransaccion?: string;
  // Solo notas de crédito/débito (E33/E34)
  eCFRef?: string;
  motivoNota?: string;
  codigoModificacion?: string;
}

class ErrorEntrada extends Error {}

const num = (v: unknown, min: number, max: number, campo: string): number => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new ErrorEntrada(`Valor no válido en ${campo}.`);
  return n;
};
const txt = (v: unknown, max: number): string => String(v ?? "").trim().slice(0, max);

// Valida y limpia las líneas: solo se conservan los campos conocidos, con
// rangos razonables y tasas de ITBIS permitidas por la DGII (0, 16%, 18%).
function limpiarItems(raw: unknown): LineaServicio[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new ErrorEntrada("La factura no tiene líneas.");
  if (raw.length > 200) throw new ErrorEntrada("Una factura admite hasta 200 líneas.");
  return raw.map((r, i): LineaServicio => {
    const it = (r ?? {}) as Record<string, unknown>;
    const modo = it.modo === "por_persona" || it.modo === "por_grupo" ? it.modo : "unidad";
    const descripcion = txt(it.descripcion, 200);
    if (!descripcion) throw new ErrorEntrada(`La línea ${i + 1} no tiene descripción.`);
    const itbis = Number(it.itbis ?? 0);
    if (![0, 0.16, 0.18].includes(itbis)) throw new ErrorEntrada(`La línea ${i + 1} tiene una tasa de ITBIS no válida.`);
    return {
      codigo: txt(it.codigo, 40),
      descripcion, modo,
      cant: modo === "unidad" ? num(it.cant ?? 1, 0.0001, 1_000_000, `cantidad de la línea ${i + 1}`) : 1,
      pax: modo === "unidad" ? 0 : num(it.pax ?? 1, 1, 100_000, `personas de la línea ${i + 1}`),
      precio: num(it.precio, 0, 1_000_000_000, `precio de la línea ${i + 1}`),
      descuentoMonto: num(it.descuentoMonto ?? 0, 0, 1_000_000_000, `descuento de la línea ${i + 1}`),
      itbis,
    };
  });
}

const rncValido = (r?: string) => { const d = (r ?? "").replace(/\D/g, ""); return d.length === 9 || d.length === 11; };

// Emisión real de un e-CF en producción: valida la entrada, reserva el e-NCF
// dentro del rango autorizado por la DGII, arma y firma el XML con el .p12 del
// tenant (KMS) y lo envía. El comprobante se guarda SIEMPRE una vez reservado el
// número, aunque la DGII no responda: así no se pierde el e-NCF ni el XML firmado.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Body | null;
  if (!body?.tenantId) return NextResponse.json({ error: "Falta tenantId" }, { status: 400 });

  const verif = await requireTenantActivo(body.tenantId);
  if (!verif.ok) return verif.response;
  const { tenantId } = body;

  const suscripcion = await obtenerSuscripcion(tenantId);
  if (suscripcion?.estado !== "activa") {
    return NextResponse.json({
      error: "Tu cuenta todavía no tiene un cobro recurrente activo. Actívalo en Plan y facturación para poder emitir comprobantes reales.",
    }, { status: 402 });
  }
  // Pasado el tope del plan ya NO se bloquea: cada comprobante extra se cobra como
  // adicional al cierre del mes (tarifa por plan en lib/payments/planes.ts). Solo hay
  // un tope de seguridad a 3 veces el plan, para que un error o abuso no genere un cobro
  // desmedido: ahí se pide hablar con ventas.
  const emitidasEsteMes = await contarComprobantesEsteMes(tenantId);
  const esAdicional = emitidasEsteMes >= suscripcion.facturasMes;
  if (emitidasEsteMes >= suscripcion.facturasMes * 3) {
    return NextResponse.json({
      error: `Llegaste a ${emitidasEsteMes.toLocaleString("es-DO")} comprobantes este mes, el triple de tu plan. Por seguridad pausamos la emisión: escríbenos para pasar a un plan acorde a tu volumen.`,
    }, { status: 403 });
  }
  const costoAdicionalRD = esAdicional ? (buscarPlan(suscripcion.planId)?.extraRD ?? 0) : 0;

  const empresaSnap = await adminDb.collection("tenants").doc(tenantId).collection("config").doc("empresa").get();
  if (!empresaSnap.exists) {
    return NextResponse.json({ error: "Esta empresa no tiene datos de emisor configurados." }, { status: 400 });
  }
  const empresa = empresaSnap.data() as EmpresaConfig;
  const facturas = adminDb.collection("tenants").doc(tenantId).collection("facturas");

  // ── Validación de entrada ──
  let items: LineaServicio[];
  let cliente: Cliente | undefined;
  let fechaECFRef: string | undefined;
  try {
    if (!/^[A-Za-z0-9-]{16,64}$/.test(body.idempotencyKey ?? "")) throw new ErrorEntrada("Solicitud sin identificador. Recarga la página e intenta de nuevo.");
    if (!TIPOS_CON_SECUENCIA.includes(body.tipoECF)) throw new ErrorEntrada("Tipo de comprobante no válido.");
    items = limpiarItems(body.items);

    if (!body.esConsumidorFinal && body.clienteId) {
      const cs = await adminDb.collection("tenants").doc(tenantId).collection("clientes").doc(body.clienteId).get();
      if (!cs.exists) throw new ErrorEntrada("Cliente no encontrado.");
      cliente = { id: cs.id, ...cs.data() } as Cliente;
    }
    if (["E31", "E41", "E45"].includes(body.tipoECF) && !rncValido(cliente?.rnc)) {
      throw new ErrorEntrada(`El comprobante ${body.tipoECF} requiere un cliente registrado con RNC o cédula válidos.`);
    }

    const total = totalesFiscales(items, body.tipoECF === "E46" ? "tasa3" : ["E43", "E44", "E47"].includes(body.tipoECF) ? "exento" : "normal").total;
    if (total <= 0 && body.tipoECF !== "E34") throw new ErrorEntrada("El total del comprobante debe ser mayor que cero.");
    if (body.tipoECF === "E32" && total >= LIMITE_RFCE && !rncValido(cliente?.rnc) && !(body.rncCompradorOcasional && body.rncCompradorOcasional.trim())) {
      throw new ErrorEntrada(`Una factura de consumo de RD$${LIMITE_RFCE.toLocaleString("es-DO")} o más requiere identificar al comprador.`);
    }

    if (body.tipoECF === "E33" || body.tipoECF === "E34") {
      const ref = txt(body.eCFRef, 13).toUpperCase();
      if (!/^E\d{12}$/.test(ref)) throw new ErrorEntrada("Indica el e-NCF del comprobante que modificas.");
      const orig = await facturas.where("eCF", "==", ref).limit(1).get();
      if (orig.empty) throw new ErrorEntrada(`No encontramos el comprobante ${ref} entre los emitidos por tu empresa.`);
      fechaECFRef = String(orig.docs[0].data().fecha ?? "");
      body.eCFRef = ref;
    }
  } catch (e) {
    if (e instanceof ErrorEntrada) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }

  // ── Idempotencia: un reintento (doble clic, red caída) nunca gasta otro número ──
  const key = body.idempotencyKey;
  const previa = await facturas.doc(key).get();
  if (previa.exists) {
    return NextResponse.json({ ok: true, id: previa.id, factura: { id: previa.id, ...previa.data() }, repetida: true });
  }
  const bloqueo = adminDb.collection("tenants").doc(tenantId).collection("emisiones").doc(key);
  try {
    await bloqueo.create({ estado: "en_proceso", creadoEn: new Date().toISOString(), por: verif.uid });
  } catch {
    return NextResponse.json({ error: "Este comprobante ya se está procesando. Revisa en Facturas antes de intentar de nuevo." }, { status: 409 });
  }

  // ── e-NCF: lo asigna el servidor dentro del rango autorizado ──
  let reserva: Awaited<ReturnType<typeof reservarENCF>>;
  try {
    reserva = await reservarENCF(tenantId, body.tipoECF);
  } catch (e) {
    await bloqueo.delete().catch(() => {});
    if (e instanceof ErrorSecuencia) return NextResponse.json({ error: e.message }, { status: 409 });
    console.error(`[emitir][${tenantId}] no se pudo reservar e-NCF:`, e);
    return NextResponse.json({ error: "No se pudo asignar el número de comprobante. Intenta de nuevo." }, { status: 500 });
  }
  const { eCF, numero, vencimiento } = reserva;

  const cajeroSnap = await adminDb.collection("users").doc(verif.uid).get();
  const nombreCajero = (cajeroSnap.data() as { nombre?: string } | undefined)?.nombre;
  const terminos = body.terminos === "Crédito" ? "Crédito" : "Contado";

  const factura: Factura = {
    id: "", noFactura: String(numero), eCF, tipoECF: body.tipoECF,
    fecha: hoyRD(), vencimientoECF: vencimiento,
    terminos, metodoPago: txt(body.metodoPago, 40) || undefined,
    clienteId: cliente ? cliente.id : "walk-in", idTransaccion: txt(body.idTransaccion, 60) || undefined,
    esConsumidorFinal: body.esConsumidorFinal, nombreConsumidor: txt(body.nombreConsumidor, 120) || undefined,
    telefonoConsumidor: txt(body.telefonoConsumidor, 30) || undefined,
    rncCompradorOcasional: txt(body.rncCompradorOcasional, 30) || undefined, esExtranjeroComprador: body.esExtranjeroComprador,
    estado: terminos === "Contado" ? "pagada" : "pendiente",
    items, notas: txt(body.notas, 500) || undefined,
    modalidadPago: terminos === "Contado" ? "unico" : "plazo",
    fechaVencimientoPago: body.fechaVencimientoPago || undefined,
    ...(fechaECFRef ? { eCFRef: body.eCFRef, fechaECFRef, motivoNota: txt(body.motivoNota, 90) || undefined, codigoModificacion: body.codigoModificacion === "2" ? "2" : body.tipoECF === "E33" ? "3" : "1" } : {}),
    // Quién emitió: permite que un cajero solo vea sus propias facturas.
    creadoPor: verif.uid, creadoPorNombre: nombreCajero,
  };

  const tenant = { tenantId, rnc: empresa.rnc, ambiente: empresa.ambiente };
  const modoTotales = body.tipoECF === "E46" ? "tasa3" : ["E43", "E44", "E47"].includes(body.tipoECF) ? "exento" : "normal";
  const totalMonto = totalesFiscales(items, modoTotales).total;
  const esRFCE = body.tipoECF === "E32" && totalMonto < LIMITE_RFCE;

  let trackId = "", urlQR = "", codigoSeguridad = "", signatureValue = "", xmlFirmado = "";
  let estadoDGII: Factura["estadoDGII"] = "pendiente";
  let mensajesDGII: string[] | undefined;
  let xmlRFCEFirmado: string | undefined;

  try {
    const { p12Buffer, password } = await obtenerCertificado(tenantId);
    // Siempre se firma primero el e-CF COMPLETO: si es RFCE, de su firma sale el
    // código de seguridad del resumen.
    xmlFirmado = await firmarXML(buildXML(factura, cliente, empresa), p12Buffer, password);
    signatureValue = extraerSignatureValue(xmlFirmado);
    codigoSeguridad = calcularCodigoSeguridad(signatureValue);
    urlQR = generarURLQR({
      rncEmisor: empresa.rnc, rncComprador: esRFCE ? undefined : cliente?.rnc && fmtRNC(cliente.rnc),
      eNCF: eCF, montoTotal: totalMonto,
      fechaEmision: formatFechaQR(factura.fecha), fechaFirma: formatFechaHoraQR(extraerFechaHoraFirmaISO(xmlFirmado)),
      signatureValue, ...(esRFCE ? { esRFCE: true } : {}),
    }, empresa.ambiente);

    if (await servicioEnPausa(tenantId)) {
      // La DGII acaba de fallar: no se hace esperar al cajero otra vez. El comprobante ya está firmado,
      // con su e-NCF y su QR, y se envía solo cuando la DGII vuelva.
      mensajesDGII = ["La DGII no está respondiendo en este momento. El comprobante se enviará solo cuando vuelva."];
    } else try {
      const token = await getToken(tenant, async () => ({ p12Buffer, password }));
      if (esRFCE) {
        xmlRFCEFirmado = await firmarXML(buildRFCEXml(factura, empresa, codigoSeguridad, cliente), p12Buffer, password);
        const r = await enviarRFCE(xmlRFCEFirmado, tenant, token, eCF);
        trackId = r.trackId;
        // El RFCE responde el estado final en la misma llamada.
        const est = r.estado.toLowerCase();
        estadoDGII = est.includes("rechaz") ? "Rechazado" : est.includes("condicional") ? "AceptadoCondicional" : est.includes("acept") ? "Aceptado" : "Enviado";
        if (estadoDGII === "Rechazado") mensajesDGII = [r.estado];
      } else {
        trackId = await enviarECF(xmlFirmado, tenant, token, eCF);
        estadoDGII = "Enviado";
      }
      await marcarExito(tenantId);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : String(e);
      if (clasificarError(mensaje) === "rechazo") {
        // La DGII lo recibió y lo rechazó: reintentarlo no sirve; queda visible como Rechazado.
        estadoDGII = "Rechazado";
        mensajesDGII = [mensaje.slice(0, 600)];
      } else {
        // La DGII/red falló: el comprobante ya tiene número y XML firmado, se guarda como pendiente
        // (contingencia) y el sistema lo envía solo cuando la DGII vuelva.
        mensajesDGII = [mensaje.slice(0, 300)];
        await marcarFallo(tenantId);
      }
      console.error(`[emitir][${tenantId}] envío de ${eCF} falló:`, mensaje);
    }
  } catch (e) {
    // No se pudo ni firmar: el número queda registrado como usado y sin enviar.
    const mensaje = e instanceof Error ? e.message : String(e);
    await bloqueo.update({ estado: "fallida", eCF, error: mensaje }).catch(() => {});
    console.error(`[emitir][${tenantId}] no se pudo firmar ${eCF}:`, mensaje);
    return NextResponse.json({ error: `No se pudo firmar el comprobante: ${mensaje}` }, { status: 502 });
  }

  const facturaCompleta = {
    ...factura, id: key,
    estadoDGII, trackIdDGII: trackId || undefined, urlQR, xmlFirmado, xmlRFCEFirmado, signatureValue, codigoSeguridad,
    mensajesDGII, fechaEnvioDGII: trackId ? new Date().toISOString() : undefined,
    creadoEn: new Date().toISOString(),
  };
  const { id: _omitId, ...datos } = facturaCompleta;
  void _omitId;
  await facturas.doc(key).set(cleanData(datos));
  await bloqueo.update({ estado: "ok", eCF }).catch(() => {});
  await registrarAuditoria({
    tenantId, uid: verif.uid, accion: "factura.emitida", recurso: eCF, req,
    detalle: { tipo: body.tipoECF, total: totalMonto, estadoDGII },
  });

  console.log(`[emitir][${tenantId}] e-CF ${eCF} (${body.tipoECF}) → trackId=${trackId || "—"} estado=${estadoDGII} docId=${key}`);

  return NextResponse.json({
    ok: true, id: key, factura: cleanData(facturaCompleta),
    // Número y XML ya guardados, pero la DGII aún no lo recibió.
    ...(estadoDGII === "pendiente" ? { advertencia: "El comprobante quedó guardado, pero no se pudo enviar a la DGII todavía." } : {}),
    // Avisa al cliente que este comprobante pasó el tope del plan y se cobra como adicional.
    ...(esAdicional ? { adicional: { costoRD: costoAdicionalRD } } : {}),
  });
}
