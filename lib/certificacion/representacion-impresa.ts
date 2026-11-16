// Representación impresa (PDF) de un e-CF YA firmado y enviado — Paso 5 de la
// certificación. Parte del XML firmado que quedó guardado (nunca de datos
// nuevos): así cada dato, el código de seguridad, la fecha de firma y el QR son
// exactamente los que la DGII recibió. El PDF es vectorial (texto
// seleccionable y QR nítido) y pesa pocos KB: los 11 caben de sobra en el
// límite de 10 MB del portal.
import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
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
const UNIDAD_MEDIDA: Record<string, string> = { "43": "UND" };

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
// Sigue el "Modelo ilustrativo de Representación Impresa" oficial de la DGII (Informe Técnico e-CF):
// emisor a la izquierda; tipo de documento, e-NCF y vencimiento a la derecha; "Razón Social Cliente" y
// "RNC Cliente" entre dos líneas azules; tabla con bordes (Cantidad, Descripción, Unidad de Medida,
// Precio, ITBIS, Valor); y al final el QR a la izquierda con el Código de Seguridad y la Fecha Firma
// DEBAJO del QR (la DGII rechaza la RI si van al lado), y los totales a la derecha.
const MM = 72 / 25.4;
const dinero = (v?: string) => (v === undefined ? "" : Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const sinGuiones = (r: string) => r.replace(/\D/g, "");

export async function dibujarRI(d: DatosRI): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${TITULO_TIPO[d.tipo] ?? "e-CF"} ${d.eNCF}`);
  pdf.setProducer("Facturacon");
  const page = pdf.addPage([595.28, 841.89]); // A4
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const negro = rgb(0.1, 0.1, 0.1), azul = rgb(0.17, 0.36, 0.56), azulLinea = rgb(0.3, 0.57, 0.85);
  const grisCab = rgb(0.9, 0.9, 0.9), grisValor = rgb(0.95, 0.95, 0.95), borde = rgb(0.45, 0.45, 0.45);

  // Solo caracteres que la fuente estándar puede dibujar (el resto se cambia por "?" para no fallar).
  const permitidos = new Set(normal.getCharacterSet());
  const seguro = (s: string) => Array.from(s).map((c) => (permitidos.has(c.codePointAt(0)!) ? c : "?")).join("");

  const M = 15 * MM, ancho = page.getWidth() - 2 * M;
  const top = page.getHeight() - 18 * MM;

  type Estilo = { f?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; derecha?: boolean };
  const txt = (s: string, x: number, y: number, o: Estilo = {}) => {
    const f = o.f ?? normal, size = o.size ?? 9.5, t = seguro(s);
    const w = f.widthOfTextAtSize(t, size);
    page.drawText(t, { x: o.derecha ? x - w : x, y, size, font: f, color: o.color ?? negro });
  };
  // "Etiqueta:" en negrita y el valor normal, en la misma línea.
  const campo = (etq: string, val: string, x: number, y: number, o: { size?: number; derecha?: boolean } = {}) => {
    const size = o.size ?? 9.5, e = seguro(etq + " "), v = seguro(val);
    const we = negrita.widthOfTextAtSize(e, size), wv = normal.widthOfTextAtSize(v, size);
    const x0 = o.derecha ? x - we - wv : x;
    page.drawText(e, { x: x0, y, size, font: negrita, color: negro });
    page.drawText(v, { x: x0 + we, y, size, font: normal, color: negro });
  };
  const envolver = (s: string, f: PDFFont, size: number, max: number): string[] => {
    const out: string[] = []; let cur = "";
    for (const palabra of seguro(s).split(/\s+/)) {
      const prueba = cur ? `${cur} ${palabra}` : palabra;
      if (f.widthOfTextAtSize(prueba, size) <= max) cur = prueba; else { if (cur) out.push(cur); cur = palabra; }
    }
    if (cur) out.push(cur);
    return out;
  };
  const regla = (y: number) => page.drawLine({ start: { x: M, y }, end: { x: M + ancho, y }, thickness: 1.2, color: azulLinea });

  // ── Encabezado ──
  const colIzq = ancho * 0.56;
  let yi = top - 12;
  if (d.emisor.nombreComercial) { for (const l of envolver(d.emisor.nombreComercial, negrita, 14, colIzq)) { txt(l, M, yi, { f: negrita, size: 14, color: azul }); yi -= 16; } }
  for (const l of envolver(d.emisor.razonSocial, normal, d.emisor.nombreComercial ? 11 : 13, colIzq)) { txt(l, M, yi, { size: d.emisor.nombreComercial ? 11 : 13, f: d.emisor.nombreComercial ? normal : negrita, color: d.emisor.nombreComercial ? negro : azul }); yi -= 14; }
  txt(`RNC ${sinGuiones(d.emisor.rnc)}`, M, yi, { size: 10 }); yi -= 13;
  if (d.emisor.direccion) { for (const l of envolver(`Dirección: ${d.emisor.direccion}`, normal, 8.5, colIzq)) { txt(l, M, yi, { size: 8.5 }); yi -= 11.5; } }
  if (d.emisor.telefono) { txt(`Tel: ${d.emisor.telefono}`, M, yi, { size: 8.5 }); yi -= 11.5; }
  campo("Fecha Emisión:", d.fechaEmision, M, yi, { size: 9 }); yi -= 12;

  const xd = M + ancho;
  let yd = top - 12;
  for (const l of envolver(TITULO_TIPO[d.tipo] ?? `e-CF tipo ${d.tipo}`, negrita, 13, ancho * 0.42)) { txt(l, xd, yd, { f: negrita, size: 13, color: azul, derecha: true }); yd -= 15; }
  campo("e-NCF:", d.eNCF, xd, yd, { size: 10, derecha: true }); yd -= 13;
  if (d.fechaVencimiento) { campo("Fecha Vencimiento:", d.fechaVencimiento, xd, yd, { size: 9, derecha: true }); yd -= 12; }
  if (d.referencia) {
    campo("e-NCF Modificado:", d.referencia.ncfModificado, xd, yd, { size: 9, derecha: true }); yd -= 12;
    campo("Código de Modificación:", CODIGO_MODIFICACION[d.referencia.codigoModificacion] ?? d.referencia.codigoModificacion, xd, yd, { size: 9, derecha: true }); yd -= 12;
  }

  let y = Math.min(yi, yd) - 8;
  regla(y); y -= 20;

  // ── Cliente ──
  const esExtranjero = !!d.comprador?.identificadorExtranjero && !d.comprador?.rnc;
  campo(esExtranjero ? "Beneficiario:" : "Razón Social Cliente:", d.comprador?.razonSocial ?? "—", M, y, { size: 10 }); y -= 14;
  if (d.comprador?.rnc) { campo("RNC Cliente:", sinGuiones(d.comprador.rnc), M, y, { size: 10 }); y -= 14; }
  if (d.comprador?.identificadorExtranjero) { campo("Identificador Extranjero:", d.comprador.identificadorExtranjero, M, y, { size: 10 }); y -= 14; }
  y -= 2;
  regla(y); y -= 16;

  // ── Tabla de ítems (con bordes) ──
  const wCant = 46, wUni = 62, wPre = 66, wItb = 62, wVal = 76;
  const wDes = ancho - wCant - wUni - wPre - wItb - wVal;
  const xs = [M, M + wCant, M + wCant + wDes, M + wCant + wDes + wUni, M + wCant + wDes + wUni + wPre, M + wCant + wDes + wUni + wPre + wItb];
  const ws = [wCant, wDes, wUni, wPre, wItb, wVal];
  const cab = ["Cantidad", "Descripción", "Unidad de Medida", "Precio", "ITBIS", "Valor"];
  const hCab = 24;
  const caja = (x: number, yTop: number, w: number, h: number, fondo?: ReturnType<typeof rgb>) =>
    page.drawRectangle({ x, y: yTop - h, width: w, height: h, color: fondo, borderColor: borde, borderWidth: 0.6 });
  cab.forEach((c, i) => {
    caja(xs[i], y, ws[i], hCab, grisCab);
    if (c === "Unidad de Medida") { txt("Unidad de", xs[i] + ws[i] / 2 - negrita.widthOfTextAtSize("Unidad de", 8.5) / 2, y - 10, { f: negrita, size: 8.5 }); txt("Medida", xs[i] + ws[i] / 2 - negrita.widthOfTextAtSize("Medida", 8.5) / 2, y - 20, { f: negrita, size: 8.5 }); }
    else txt(c, xs[i] + ws[i] / 2 - negrita.widthOfTextAtSize(c, 9) / 2, y - 15, { f: negrita, size: 9 });
  });
  y -= hCab;
  for (const it of d.items) {
    const lineas = envolver(it.descripcion, normal, 9, wDes - 10);
    const h = Math.max(18, lineas.length * 11.5 + 7);
    ws.forEach((w, i) => caja(xs[i], y, w, h, i === 5 ? grisValor : undefined));
    const yt = y - 12;
    txt(Number(it.cantidad).toLocaleString("en-US", { maximumFractionDigits: 2 }), xs[0] + wCant / 2 - normal.widthOfTextAtSize(Number(it.cantidad).toLocaleString("en-US", { maximumFractionDigits: 2 }), 9) / 2, yt, { size: 9 });
    lineas.forEach((l, k) => txt(l, xs[1] + 5, yt - k * 11.5, { size: 9 }));
    txt(it.unidad, xs[2] + wUni / 2 - normal.widthOfTextAtSize(seguro(it.unidad), 9) / 2, yt, { size: 9 });
    txt(dinero(it.precio), xs[3] + wPre - 5, yt, { size: 9, derecha: true });
    txt(it.itbis > 0 ? dinero(String(it.itbis)) : "Exento", xs[4] + wItb - 5, yt, { size: 9, derecha: true });
    txt(dinero(it.valor), xs[5] + wVal - 5, yt, { size: 9, derecha: true });
    y -= h;
  }
  y -= 14;
  regla(y); y -= 16;

  // ── Pie: QR a la izquierda (con Código de Seguridad y Fecha Firma DEBAJO) y totales a la derecha ──
  const qrLado = 30 * MM; // mínimo exigido por la DGII: 22 x 22 mm
  const qr = QRCode.create(d.urlQR, { errorCorrectionLevel: "M" });
  const n = qr.modules.size, quiet = 4, modulo = qrLado / (n + 2 * quiet);
  const yQR = y - qrLado;
  const xQR = M + 12;
  page.drawRectangle({ x: xQR, y: yQR, width: qrLado, height: qrLado, color: rgb(1, 1, 1) });
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (qr.modules.get(r, c)) page.drawRectangle({ x: xQR + (c + quiet) * modulo, y: yQR + qrLado - (r + quiet + 1) * modulo, width: modulo, height: modulo, color: rgb(0, 0, 0) });
  }
  // Debajo del QR, en este orden: Código de Seguridad y luego Fecha Firma.
  const yc = yQR - 12;
  const campoSerif = (etq: string, val: string, yy: number) => {
    const e = seguro(etq + " "), we = serif.widthOfTextAtSize(e, 9);
    page.drawText(e, { x: xQR, y: yy, size: 9, font: serif, color: negro });
    page.drawText(seguro(val), { x: xQR + we, y: yy, size: 9, font: serif, color: negro });
  };
  campoSerif("Código de Seguridad:", d.codigoSeguridad, yc);
  campoSerif("Fecha Firma:", d.fechaFirma, yc - 11);

  // Totales (a la derecha, en cajas como el modelo).
  const filas: [string, string][] = [];
  if (d.totales.gravado && Number(d.totales.gravado) > 0) filas.push(["Subtotal Gravado:", dinero(d.totales.gravado)]);
  if (d.totales.exento && Number(d.totales.exento) > 0) filas.push(["Monto Exento:", dinero(d.totales.exento)]);
  if (d.totales.itbis && Number(d.totales.itbis) > 0) filas.push(["Total ITBIS:", dinero(d.totales.itbis)]);
  if (d.totales.itbisRetenido) filas.push(["ITBIS Retenido:", dinero(d.totales.itbisRetenido)]);
  if (d.totales.isrRetencion) filas.push(["ISR Retenido:", dinero(d.totales.isrRetencion)]);
  filas.push(["Total:", dinero(d.totales.total)]);
  const wEtq = 110, wMonto = 100, hFila = 15;
  const xv = M + ancho - wMonto;
  let yt = y;
  for (const [etq, val] of filas) {
    page.drawRectangle({ x: xv, y: yt - hFila, width: wMonto, height: hFila, color: grisValor, borderColor: borde, borderWidth: 0.6 });
    txt(etq, xv - 6, yt - 11, { f: negrita, size: 8.5, derecha: true });
    txt(val, xv + wMonto - 5, yt - 11, { size: 9, derecha: true });
    yt -= hFila;
  }
  void wEtq;

  return pdf.save();
}

export async function representacionPdf(xmlFirmado: string, ambiente: AmbienteDGII, codigoSeguridadGuardado?: string): Promise<{ pdf: Uint8Array; datos: DatosRI }> {
  const datos = leerXmlFirmado(xmlFirmado, ambiente, codigoSeguridadGuardado);
  return { pdf: await dibujarRI(datos), datos };
}
