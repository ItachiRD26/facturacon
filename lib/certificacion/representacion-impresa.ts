// Representación impresa (PDF) de un e-CF YA firmado y enviado — Paso 5 de la
// certificación. Parte del XML firmado que quedó guardado (nunca de datos
// nuevos): así cada dato, el código de seguridad, la fecha de firma y el QR son
// exactamente los que la DGII recibió. El PDF es vectorial (texto
// seleccionable y QR nítido) y pesa pocos KB: los 11 caben de sobra en el
// límite de 10 MB del portal.
import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { DOMParser } from "@xmldom/xmldom";
import { generarURLQR, type AmbienteDGII } from "@/lib/dgii/qr-builder";

export const TITULO_TIPO: Record<string, string> = {
  "31": "Factura de Crédito Fiscal Electrónica",
  "32": "Factura de Consumo Electrónica",
  "33": "Nota de Débito Electrónica",
  "34": "Nota de Crédito Electrónica",
  "41": "Comprobante Electrónico de Compras",
  "43": "Comprobante Electrónico para Gastos Menores",
  "44": "Comprobante Electrónico para Regímenes Especiales",
  "45": "Comprobante Electrónico Gubernamental",
  "46": "Comprobante Electrónico para Exportaciones",
  "47": "Comprobante Electrónico para Pagos al Exterior",
};

// Catálogo oficial (Informe Técnico e-CF v1.0): el código de modificación se muestra en palabras.
const CODIGO_MODIFICACION: Record<string, string> = {
  "1": "Anula el NCF modificado", "2": "Corrige texto", "3": "Corrige montos", "4": "Reemplazo NCF por contingencia",
};
const UNIDAD_MEDIDA: Record<string, string> = { "43": "Unidad" };

export interface DatosRI {
  tipo: string; eNCF: string; fechaVencimiento?: string; fechaEmision: string; fechaFirma: string;
  emisor: { rnc: string; razonSocial: string; nombreComercial?: string; direccion?: string; telefono?: string };
  comprador?: { rnc?: string; identificadorExtranjero?: string; razonSocial?: string };
  items: { cantidad: string; descripcion: string; unidad: string; precio: string; itbis: number; valor: string }[];
  totales: { gravado?: string; exento?: string; itbis?: string; itbisRetenido?: string; isrRetencion?: string; total: string };
  referencia?: { ncfModificado: string; codigoModificacion: string; razon?: string };
  tipoPago?: string;
  signatureValue: string;
  codigoSeguridad: string;
  urlQR: string;
}

// ── Lectura del XML firmado ─────────────────────────────────────────────────
function hijos(el: Element | null | undefined, nombre: string): Element[] {
  if (!el) return [];
  return Array.from(el.childNodes).filter((n): n is Element => n.nodeType === 1 && (n as Element).localName === nombre);
}
const uno = (el: Element | null | undefined, nombre: string) => hijos(el, nombre)[0] ?? null;
const texto = (el: Element | null | undefined, nombre: string) => uno(el, nombre)?.textContent?.trim() || undefined;

export function leerXmlFirmado(xml: string, ambiente: AmbienteDGII, codigoSeguridadGuardado?: string): DatosRI {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const raiz = doc.documentElement as unknown as Element;
  const enc = uno(raiz, "Encabezado");
  const idDoc = uno(enc, "IdDoc"), emisor = uno(enc, "Emisor"), comprador = uno(enc, "Comprador"), totales = uno(enc, "Totales");

  const tipo = texto(idDoc, "TipoeCF") ?? "";
  const eNCF = texto(idDoc, "eNCF") ?? "";
  const signatureValue = (xml.match(/<SignatureValue[^>]*>([\s\S]*?)<\/SignatureValue>/)?.[1] ?? "").replace(/\s+/g, "");
  if (!tipo || !eNCF || !signatureValue) throw new Error("El XML firmado está incompleto");
  const codigoSeguridad = signatureValue.substring(0, 6);
  if (codigoSeguridadGuardado && codigoSeguridadGuardado !== codigoSeguridad) {
    throw new Error(`El código de seguridad guardado (${codigoSeguridadGuardado}) no coincide con la firma del XML (${codigoSeguridad})`);
  }
  const fechaFirma = doc.getElementsByTagName("FechaHoraFirma")[0]?.textContent?.trim() ?? "";
  const fechaEmision = texto(emisor, "FechaEmision") ?? "";
  const montoTotal = texto(totales, "MontoTotal") ?? "0";

  const items = hijos(uno(raiz, "DetallesItems"), "Item").map((it) => {
    const valor = texto(it, "MontoItem") ?? "0";
    const ind = texto(it, "IndicadorFacturacion");
    const tasa = ind === "1" ? 0.18 : ind === "2" ? 0.16 : 0;
    return {
      cantidad: texto(it, "CantidadItem") ?? "",
      descripcion: texto(it, "NombreItem") ?? "",
      unidad: UNIDAD_MEDIDA[texto(it, "UnidadMedida") ?? ""] ?? (texto(it, "UnidadMedida") ?? ""),
      precio: texto(it, "PrecioUnitarioItem") ?? "",
      itbis: Math.round(Number(valor) * tasa * 100) / 100,
      valor,
    };
  });

  const ref = uno(raiz, "InformacionReferencia");
  const rncComprador = texto(comprador, "RNCComprador");
  // E32 menor de RD$250 mil: su timbre va por el servicio de facturas de consumo (fc.dgii.gov.do).
  const esRFCE = tipo === "32" && Number(montoTotal) < 250000;
  const urlQR = generarURLQR({
    rncEmisor: texto(emisor, "RNCEmisor") ?? "", rncComprador, eNCF, fechaEmision, montoTotal: Number(montoTotal),
    fechaFirma, signatureValue, esRFCE,
  }, ambiente);

  return {
    tipo, eNCF, fechaEmision, fechaFirma,
    fechaVencimiento: texto(idDoc, "FechaVencimientoSecuencia"),
    emisor: {
      rnc: texto(emisor, "RNCEmisor") ?? "", razonSocial: texto(emisor, "RazonSocialEmisor") ?? "",
      nombreComercial: texto(emisor, "NombreComercial"), direccion: texto(emisor, "DireccionEmisor"),
      telefono: texto(uno(emisor, "TablaTelefonoEmisor"), "TelefonoEmisor"),
    },
    comprador: comprador ? {
      rnc: rncComprador, identificadorExtranjero: texto(comprador, "IdentificadorExtranjero"), razonSocial: texto(comprador, "RazonSocialComprador"),
    } : undefined,
    items,
    totales: {
      gravado: texto(totales, "MontoGravadoTotal"), exento: texto(totales, "MontoExento"), itbis: texto(totales, "TotalITBIS"),
      itbisRetenido: texto(totales, "TotalITBISRetenido"), isrRetencion: texto(totales, "TotalISRRetencion"), total: montoTotal,
    },
    referencia: ref ? {
      ncfModificado: texto(ref, "NCFModificado") ?? "", codigoModificacion: texto(ref, "CodigoModificacion") ?? "", razon: texto(ref, "RazonModificacion"),
    } : undefined,
    tipoPago: texto(idDoc, "TipoPago"),
    signatureValue, codigoSeguridad, urlQR,
  };
}

// ── Dibujo del PDF (A4) ─────────────────────────────────────────────────────
const MM = 72 / 25.4;
const fmtRNC = (r: string) => (r.length === 9 ? `${r.slice(0, 3)}-${r.slice(3, 8)}-${r.slice(8)}` : r.length === 11 ? `${r.slice(0, 3)}-${r.slice(3, 10)}-${r.slice(10)}` : r);
const dinero = (v?: string) => (v === undefined ? "" : Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export async function dibujarRI(d: DatosRI): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${TITULO_TIPO[d.tipo] ?? "e-CF"} ${d.eNCF}`);
  pdf.setProducer("Facturacon");
  const page = pdf.addPage([595.28, 841.89]); // A4
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const negro = rgb(0.07, 0.07, 0.07), gris = rgb(0.35, 0.35, 0.35), linea = rgb(0.8, 0.8, 0.8);

  // Solo caracteres que la fuente estándar puede dibujar (el resto se cambia por "?" para no fallar).
  const permitidos = new Set(normal.getCharacterSet());
  const seguro = (s: string) => Array.from(s).map((c) => (permitidos.has(c.codePointAt(0)!) ? c : "?")).join("");

  const M = 16 * MM, ancho = page.getWidth() - 2 * M;
  let y = page.getHeight() - M;

  const txt = (p: PDFPage, s: string, x: number, yy: number, o: { f?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; alignRight?: boolean } = {}) => {
    const f = o.f ?? normal, size = o.size ?? 9.5, t = seguro(s);
    const w = f.widthOfTextAtSize(t, size);
    p.drawText(t, { x: o.alignRight ? x - w : x, y: yy, size, font: f, color: o.color ?? negro });
  };
  // Parte un texto largo en varias líneas según el ancho disponible.
  const envolver = (s: string, f: PDFFont, size: number, max: number): string[] => {
    const out: string[] = []; let cur = "";
    for (const palabra of seguro(s).split(/\s+/)) {
      const prueba = cur ? `${cur} ${palabra}` : palabra;
      if (f.widthOfTextAtSize(prueba, size) <= max) cur = prueba; else { if (cur) out.push(cur); cur = palabra; }
    }
    if (cur) out.push(cur);
    return out;
  };

  // Encabezado: emisor a la izquierda, tipo de documento y e-NCF a la derecha.
  const colIzq = ancho * 0.58;
  let yi = y - 12;
  if (d.emisor.nombreComercial) { for (const l of envolver(d.emisor.nombreComercial, negrita, 14, colIzq)) { txt(page, l, M, yi, { f: negrita, size: 14 }); yi -= 16; } }
  for (const l of envolver(d.emisor.razonSocial, d.emisor.nombreComercial ? normal : negrita, d.emisor.nombreComercial ? 10 : 13, colIzq)) {
    txt(page, l, M, yi, { f: d.emisor.nombreComercial ? normal : negrita, size: d.emisor.nombreComercial ? 10 : 13 }); yi -= 14;
  }
  txt(page, `RNC: ${fmtRNC(d.emisor.rnc)}`, M, yi); yi -= 13;
  if (d.emisor.direccion) for (const l of envolver(d.emisor.direccion, normal, 9.5, colIzq)) { txt(page, l, M, yi); yi -= 12.5; }
  if (d.emisor.telefono) { txt(page, `Tel: ${d.emisor.telefono}`, M, yi); yi -= 13; }
  txt(page, `Fecha de emisión: ${d.fechaEmision}`, M, yi); yi -= 13;

  const xd = M + ancho;
  let yd = y - 12;
  for (const l of envolver(TITULO_TIPO[d.tipo] ?? `e-CF tipo ${d.tipo}`, negrita, 12, ancho * 0.4)) { txt(page, l, xd, yd, { f: negrita, size: 12, alignRight: true }); yd -= 14; }
  txt(page, `e-NCF: ${d.eNCF}`, xd, yd, { f: negrita, alignRight: true }); yd -= 13;
  if (d.fechaVencimiento) { txt(page, `Fecha de vencimiento: ${d.fechaVencimiento}`, xd, yd, { alignRight: true }); yd -= 13; }
  if (d.referencia) {
    txt(page, `e-NCF Modificado: ${d.referencia.ncfModificado}`, xd, yd, { alignRight: true }); yd -= 13;
    txt(page, `Código de Modificación: ${CODIGO_MODIFICACION[d.referencia.codigoModificacion] ?? d.referencia.codigoModificacion}`, xd, yd, { alignRight: true }); yd -= 13;
  }
  if (d.tipoPago) { txt(page, `Tipo de pago: ${d.tipoPago === "1" ? "Contado" : d.tipoPago === "2" ? "Crédito" : d.tipoPago}`, xd, yd, { alignRight: true }); yd -= 13; }

  y = Math.min(yi, yd) - 6;
  page.drawLine({ start: { x: M, y }, end: { x: M + ancho, y }, thickness: 1.5, color: negro });
  y -= 18;

  // Comprador
  txt(page, d.tipo === "47" || (d.tipo === "46" && d.comprador?.identificadorExtranjero) ? "Beneficiario" : "Cliente", M, y, { f: negrita }); y -= 13;
  if (d.comprador) {
    if (d.comprador.razonSocial) { for (const l of envolver(d.comprador.razonSocial, normal, 9.5, ancho)) { txt(page, l, M, y); y -= 12.5; } }
    if (d.comprador.rnc) { txt(page, `RNC: ${fmtRNC(d.comprador.rnc)}`, M, y); y -= 12.5; }
    if (d.comprador.identificadorExtranjero) { txt(page, `Identificador extranjero: ${d.comprador.identificadorExtranjero}`, M, y); y -= 12.5; }
  } else { txt(page, "—", M, y); y -= 12.5; }
  y -= 8;

  // Tabla de ítems
  const cols = [
    { t: "Cant.", x: M, w: 44, r: false },
    { t: "Descripción", x: M + 48, w: ancho - 48 - 4 * 62 - 50, r: false },
    { t: "Unidad", x: M + ancho - 4 * 62 - 46, w: 46, r: false },
    { t: "Precio", x: M + ancho - 3 * 62, w: 62, r: true },
    { t: "ITBIS", x: M + ancho - 2 * 62, w: 62, r: true },
    { t: "Valor", x: M + ancho - 62, w: 62, r: true },
  ];
  page.drawRectangle({ x: M, y: y - 4, width: ancho, height: 16, color: rgb(0.94, 0.94, 0.94) });
  for (const c of cols) txt(page, c.t, c.r ? c.x + c.w : c.x + 2, y, { f: negrita, size: 9, alignRight: c.r });
  y -= 16;
  for (const it of d.items) {
    const lineas = envolver(it.descripcion, normal, 9, cols[1].w - 4);
    txt(page, Number(it.cantidad).toLocaleString("en-US", { maximumFractionDigits: 2 }), M + 2, y, { size: 9 });
    txt(page, it.unidad, cols[2].x + 2, y, { size: 9 });
    txt(page, dinero(it.precio), cols[3].x + cols[3].w, y, { size: 9, alignRight: true });
    txt(page, it.itbis > 0 ? dinero(String(it.itbis)) : "Exento", cols[4].x + cols[4].w, y, { size: 9, alignRight: true });
    txt(page, dinero(it.valor), cols[5].x + cols[5].w, y, { size: 9, alignRight: true });
    let yl = y;
    for (const l of lineas) { txt(page, l, cols[1].x + 2, yl, { size: 9 }); yl -= 11.5; }
    y = yl - 2;
    page.drawLine({ start: { x: M, y: y + 6 }, end: { x: M + ancho, y: y + 6 }, thickness: 0.5, color: linea });
    y -= 4;
  }
  y -= 8;

  // Totales (a la derecha)
  const xt = M + ancho - 230;
  const fila = (etq: string, val: string, fuerte = false) => {
    if (fuerte) page.drawRectangle({ x: xt - 6, y: y - 5, width: 236, height: 17, color: negro });
    const c = fuerte ? rgb(1, 1, 1) : negro;
    txt(page, etq, xt, y, { f: fuerte ? negrita : normal, size: fuerte ? 10.5 : 9.5, color: c });
    txt(page, `RD$ ${val}`, M + ancho, y, { f: fuerte ? negrita : normal, size: fuerte ? 10.5 : 9.5, color: c, alignRight: true });
    y -= fuerte ? 20 : 14;
  };
  if (d.totales.gravado && Number(d.totales.gravado) > 0) fila("Subtotal gravado", dinero(d.totales.gravado));
  if (d.totales.exento && Number(d.totales.exento) > 0) fila("Monto exento", dinero(d.totales.exento));
  if (d.totales.itbis && Number(d.totales.itbis) > 0) fila("Total ITBIS", dinero(d.totales.itbis));
  if (d.totales.itbisRetenido) fila("ITBIS retenido", dinero(d.totales.itbisRetenido));
  if (d.totales.isrRetencion) fila("ISR retenido", dinero(d.totales.isrRetencion));
  fila("TOTAL", dinero(d.totales.total), true);

  // Pie: QR (mínimo exigido por la DGII: 22 x 22 mm; aquí 28 mm), código de seguridad y fecha de firma.
  const qrLado = 28 * MM;
  const yPie = y - 22; // justo debajo de los totales
  const qr = QRCode.create(d.urlQR, { errorCorrectionLevel: "M" });
  const n = qr.modules.size, quiet = 4, modulo = qrLado / (n + 2 * quiet);
  const yQR = Math.max(M, yPie - qrLado);
  page.drawRectangle({ x: M, y: yQR, width: qrLado, height: qrLado, color: rgb(1, 1, 1) });
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (qr.modules.get(r, c)) page.drawRectangle({ x: M + (c + quiet) * modulo, y: yQR + qrLado - (r + quiet + 1) * modulo, width: modulo, height: modulo, color: rgb(0, 0, 0) });
  }
  const xq = M + qrLado + 14;
  let yq = yQR + qrLado - 12;
  txt(page, `Código de Seguridad: ${d.codigoSeguridad}`, xq, yq, { f: negrita, size: 10 }); yq -= 14;
  txt(page, `Fecha de Firma Digital: ${d.fechaFirma}`, xq, yq, { size: 9.5 }); yq -= 13;
  txt(page, "Escanee el código QR o verifique en ecf.dgii.gov.do", xq, yq, { size: 8.5, color: gris });
  txt(page, `Comprobante Fiscal Electrónico — ${d.emisor.nombreComercial ?? d.emisor.razonSocial}`, M, M / 2 + 4, { size: 8, color: gris });

  return pdf.save();
}

export async function representacionPdf(xmlFirmado: string, ambiente: AmbienteDGII, codigoSeguridadGuardado?: string): Promise<{ pdf: Uint8Array; datos: DatosRI }> {
  const datos = leerXmlFirmado(xmlFirmado, ambiente, codigoSeguridadGuardado);
  return { pdf: await dibujarRI(datos), datos };
}
