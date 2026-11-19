// Construye el XML del e-CF según los XSD oficiales de la DGII
// Corregido contra XSD e-CF_31..47 + RFCE_32 v1.0
// Errores corregidos en esta versión:
//   1. TablaSubDescuento: campo TasaSubDescuento no existe → eliminado cuando no hay descuento
//   2. ITBIS dentro de <Item>: no existe en el XSD → ITBIS solo va en <Totales>
//   3. FechaHoraFirma: obligatorio antes del <Signature> en el XSD → se incluye en buildXML

import type { Factura, Cliente, LineaServicio } from "@/types";
import type { EmpresaConfig } from "@/types/tenant";
import { r2, lineaFiscal, totalesFiscales, type LineaFiscal, type TratamientoITBIS, type TotalesFiscales } from "@/lib/fiscal/calculo";

// El cálculo vive en lib/fiscal/calculo.ts (una sola fuente de verdad, compartida con la pantalla). Se reexporta aquí
// porque la ruta de emisión y la certificación lo importan desde este módulo.
export { totalesFiscales };
export type { TratamientoITBIS, TotalesFiscales };

const VERSION = "1.0";

// E32 por debajo de este monto se envía como RFCE (resumen), no como ECF completo.
export const LIMITE_RFCE = 250_000;

// ── Helpers ───────────────────────────────────────────────────────

function getTipoPago(terminos: string): string {
  return terminos === "Contado" ? "1" : "2";
}

// Normaliza RNC → solo dígitos, 9 u 11 chars
// Exportado para que lo usen qr-builder y otros módulos
export function fmtRNC(rnc: string): string {
  const d = rnc.replace(/\D/g, "");
  if (d.length === 9 || d.length === 11) return d;
  if (d.length === 10) return d.substring(0, 9);  // quita dígito verificador
  return d;
}

// Formato legible para representación impresa: 9 dígitos → XXX-XXXXX-X,
// 11 dígitos (cédula) → XXX-XXXXXXX-X. Aplica fmtRNC primero — así la
// impresión nunca muestra un RNC crudo/con typo que el XML fiscal ya
// normalizó internamente.
export function fmtRNCDisplay(rnc: string): string {
  const d = fmtRNC(rnc);
  if (d.length === 9)  return `${d.slice(0, 3)}-${d.slice(3, 8)}-${d.slice(8)}`;
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 10)}-${d.slice(10)}`;
  return d;
}

// YYYY-MM-DD → DD-MM-YYYY (formato DGII)
function fmtFecha(fecha: string): string {
  if (!fecha) return "";
  if (/^\d{2}-\d{2}-\d{4}$/.test(fecha)) return fecha;
  const [y, m, d] = fecha.split("-");
  if (y && m && d) return `${d.padStart(2,"0")}-${m.padStart(2,"0")}-${y}`;
  return fecha;
}

// Genera FechaHoraFirma en formato dd-MM-YYYY HH:mm:ss, en hora de Rep.
// Dominicana. Usa America/Santo_Domingo explícitamente — si el servidor
// corre en UTC (común en hosting cloud), new Date().getHours() desfasaría
// la hora de firma 4 horas respecto a la hora real del comprobante.
export function nowFechaHoraFirma(): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santo_Domingo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "00";
  return `${get("day")}-${get("month")}-${get("year")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function fmt(n: number): string { return n.toFixed(2); }

// Teléfono en el formato del XSD (NNN-NNN-NNNN). Si no son 10 dígitos se omite
// el campo (es opcional) en vez de arriesgar el rechazo del comprobante.
function fmtTelefono(t?: string): string {
  const d = (t ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : "";
}

// ── Emisor ────────────────────────────────────────────────────────
function buildEmisor(e: EmpresaConfig, fecha: string): string {
  return `<Emisor>
    <RNCEmisor>${fmtRNC(e.rnc)}</RNCEmisor>
    <RazonSocialEmisor>${escapeXml(e.nombre)}</RazonSocialEmisor>
    ${e.nombreComercial ? `<NombreComercial>${escapeXml(e.nombreComercial)}</NombreComercial>` : ""}
    <DireccionEmisor>${escapeXml(e.direccion)}</DireccionEmisor>
    ${fmtTelefono(e.telefono) ? `<TablaTelefonoEmisor><TelefonoEmisor>${fmtTelefono(e.telefono)}</TelefonoEmisor></TablaTelefonoEmisor>` : ""}
    <ActividadEconomica>${escapeXml(e.actividadEconomica)}</ActividadEconomica>
    <FechaEmision>${fmtFecha(fecha)}</FechaEmision>
  </Emisor>`;
}

function buildEmisorRFCE(e: EmpresaConfig, fecha: string): string {
  return `<Emisor>
    <RNCEmisor>${fmtRNC(e.rnc)}</RNCEmisor>
    <RazonSocialEmisor>${escapeXml(e.nombre)}</RazonSocialEmisor>
    <FechaEmision>${fmtFecha(fecha)}</FechaEmision>
  </Emisor>`;
}

// ── IdDoc por tipo ────────────────────────────────────────────────
function idDocConIngresos(f: Factura, tipo: string, inclMontoGrav = false): string {
  return `<IdDoc>
    <TipoeCF>${tipo}</TipoeCF>
    <eNCF>${f.eCF}</eNCF>
    <FechaVencimientoSecuencia>${fmtFecha(f.vencimientoECF)}</FechaVencimientoSecuencia>
    ${inclMontoGrav ? `<IndicadorMontoGravado>0</IndicadorMontoGravado>` : ""}
    <TipoIngresos>01</TipoIngresos>
    <TipoPago>${getTipoPago(f.terminos)}</TipoPago>
  </IdDoc>`;
}

function idDocE41(f: Factura, inclMontoGrav = false): string {
  return `<IdDoc>
    <TipoeCF>41</TipoeCF>
    <eNCF>${f.eCF}</eNCF>
    <FechaVencimientoSecuencia>${fmtFecha(f.vencimientoECF)}</FechaVencimientoSecuencia>
    ${inclMontoGrav ? `<IndicadorMontoGravado>0</IndicadorMontoGravado>` : ""}
    <TipoPago>${getTipoPago(f.terminos)}</TipoPago>
  </IdDoc>`;
}

function idDocE33(f: Factura, inclMontoGrav = false): string {
  return `<IdDoc>
    <TipoeCF>33</TipoeCF>
    <eNCF>${f.eCF}</eNCF>
    <FechaVencimientoSecuencia>${fmtFecha(f.vencimientoECF)}</FechaVencimientoSecuencia>
    ${inclMontoGrav ? `<IndicadorMontoGravado>0</IndicadorMontoGravado>` : ""}
    <TipoIngresos>01</TipoIngresos>
    <TipoPago>1</TipoPago>
  </IdDoc>`;
}

function idDocE34(f: Factura, inclMontoGrav = false): string {
  // IndicadorNotaCredito: 0 si la fecha de emisión es <= 30 días calendario, 1 si > 30 días
  // Días entre el comprobante ORIGINAL y esta nota (ambas fechas del documento).
  const aMs = (d: string) => { const p = fmtFecha(d).split("-"); return new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime(); };
  const diffDays = (aMs(f.fecha) - aMs(f.fechaECFRef ?? f.fecha)) / 86400000;
  const indNotaC = diffDays <= 30 ? "0" : "1";
  return `<IdDoc>
    <TipoeCF>34</TipoeCF>
    <eNCF>${f.eCF}</eNCF>
    <IndicadorNotaCredito>${indNotaC}</IndicadorNotaCredito>
    ${inclMontoGrav ? `<IndicadorMontoGravado>0</IndicadorMontoGravado>` : ""}
    <TipoIngresos>01</TipoIngresos>
    <TipoPago>1</TipoPago>
  </IdDoc>`;
}

function idDocE32(f: Factura, inclMontoGrav = false): string {
  // E32 XSD no tiene FechaVencimientoSecuencia
  return `<IdDoc>
    <TipoeCF>32</TipoeCF>
    <eNCF>${f.eCF}</eNCF>
    ${inclMontoGrav ? `<IndicadorMontoGravado>0</IndicadorMontoGravado>` : ""}
    <TipoIngresos>01</TipoIngresos>
    <TipoPago>${getTipoPago(f.terminos)}</TipoPago>
  </IdDoc>`;
}

function idDocE43(f: Factura): string {
  return `<IdDoc>
    <TipoeCF>43</TipoeCF>
    <eNCF>${f.eCF}</eNCF>
    <FechaVencimientoSecuencia>${fmtFecha(f.vencimientoECF)}</FechaVencimientoSecuencia>
  </IdDoc>`;
}

function idDocE47(f: Factura): string {
  return `<IdDoc>
    <TipoeCF>47</TipoeCF>
    <eNCF>${f.eCF}</eNCF>
    <FechaVencimientoSecuencia>${fmtFecha(f.vencimientoECF)}</FechaVencimientoSecuencia>
  </IdDoc>`;
}

// ── Compradores ───────────────────────────────────────────────────
function compradorB2B(c: Cliente): string {
  return `<Comprador>
    <RNCComprador>${fmtRNC(c.rnc ?? "")}</RNCComprador>
    <RazonSocialComprador>${escapeXml(c.nombre)}</RazonSocialComprador>
    ${c.direccion ? `<DireccionComprador>${escapeXml(c.direccion)}</DireccionComprador>` : ""}
  </Comprador>`;
}

function compradorConsumidor(f: Factura): string {
  return `<Comprador>
    <RazonSocialComprador>${escapeXml(f.nombreConsumidor ?? "CONSUMIDOR FINAL")}</RazonSocialComprador>
  </Comprador>`;
}

function compradorOcasional(f: Factura): string {
  const nombre = escapeXml(f.nombreConsumidor ?? "CONSUMIDOR FINAL");
  if (f.esExtranjeroComprador) {
    return `<Comprador>
    <IdentificadorExtranjero>${escapeXml(f.rncCompradorOcasional ?? "")}</IdentificadorExtranjero>
    <RazonSocialComprador>${nombre}</RazonSocialComprador>
  </Comprador>`;
  }
  return `<Comprador>
    <RNCComprador>${fmtRNC(f.rncCompradorOcasional ?? "")}</RNCComprador>
    <RazonSocialComprador>${nombre}</RazonSocialComprador>
  </Comprador>`;
}

function compradorExtranjero(f: Factura): string {
  return `<Comprador>
    ${f.idTransaccion ? `<IdentificadorExtranjero>${escapeXml(f.idTransaccion)}</IdentificadorExtranjero>` : ""}
    <RazonSocialComprador>${escapeXml(f.nombreConsumidor ?? "BENEFICIARIO EXTERIOR")}</RazonSocialComprador>
  </Comprador>`;
}

// ── Líneas y totales fiscales ─────────────────────────────────────
// UNA sola fuente de verdad para lo que se declara a la DGII: cada Item cumple
// CantidadItem × PrecioUnitarioItem − DescuentoMonto = MontoItem, y los
// totales son la suma de los MontoItem por tasa. Antes los ítems "unidad"
// (todo producto de inventario) salían con CantidadItem=1 aunque se vendieran
// varios, y el ITBIS al 16% se declaraba como 18%: la DGII lo rechaza.

// Precio con 2 a 4 decimales (el XSD admite hasta 4).
function fmtPrecio(n: number): string {
  return (Math.round(n * 10000) / 10000).toFixed(4).replace(/0{1,2}$/, "");
}

// ── Items ─────────────────────────────────────────────────────────
// Orden según XSD: NumeroLinea → IndicadorFacturacion → Retencion? → NombreItem →
// IndicadorBienoServicio → DescripcionItem? → CantidadItem → UnidadMedida →
// PrecioUnitarioItem → DescuentoMonto? → MontoItem
function itemXml(item: LineaServicio, i: number, o: {
  indFact: number; retencion?: string; conDescripcion?: boolean; conDescuento?: boolean;
}): string {
  const l = lineaFiscal(item);
  const paxDesc = item.pax > 0 ? ` | PAX: ${item.pax}` : "";
  const descLarga = o.conDescripcion && (item.descripcion.length > 80 || paxDesc);
  return `<Item>
      <NumeroLinea>${i + 1}</NumeroLinea>
      <IndicadorFacturacion>${o.indFact}</IndicadorFacturacion>
      ${o.retencion ?? ""}
      <NombreItem>${escapeXml(item.descripcion.substring(0, 80))}</NombreItem>
      <IndicadorBienoServicio>2</IndicadorBienoServicio>
      ${descLarga ? `<DescripcionItem>${escapeXml((item.descripcion + paxDesc).substring(0, 1000))}</DescripcionItem>` : ""}
      <CantidadItem>${fmt(l.cant)}</CantidadItem>
      <UnidadMedida>43</UnidadMedida>
      <PrecioUnitarioItem>${fmtPrecio(l.precioU)}</PrecioUnitarioItem>
      ${o.conDescuento !== false && l.desc > 0 ? `<DescuentoMonto>${fmt(l.desc)}</DescuentoMonto>` : ""}
      <MontoItem>${fmt(l.monto)}</MontoItem>
    </Item>`;
}

const indicadorDe = (tasa: number) => (tasa === 0.18 ? 1 : tasa === 0.16 ? 2 : 4);

function buildItems(items: LineaServicio[]): string {
  return items.map((it, i) => itemXml(it, i, { indFact: indicadorDe(it.itbis), conDescripcion: true })).join("\n");
}

// E41 — Comprobante de Compras: el comprador retiene el ITBIS del ítem y 10% de ISR.
const ISR_RATE_E41 = 0.10;
const retItbisE41 = (l: LineaFiscal) => r2(l.monto * l.tasa);
const retIsrE41   = (l: LineaFiscal) => r2(l.monto * ISR_RATE_E41);

function buildItemsE41(items: LineaServicio[]): string {
  return items.map((it, i) => {
    const l = lineaFiscal(it);
    const retencion = `<Retencion>
        <IndicadorAgenteRetencionoPercepcion>1</IndicadorAgenteRetencionoPercepcion>
        ${retItbisE41(l) > 0 ? `<MontoITBISRetenido>${fmt(retItbisE41(l))}</MontoITBISRetenido>` : ""}
        <MontoISRRetenido>${fmt(retIsrE41(l))}</MontoISRRetenido>
      </Retencion>`;
    return itemXml(it, i, { indFact: indicadorDe(it.itbis), retencion });
  }).join("\n");
}

// E43/E44 — siempre exentos: IndicadorFacturacion=4 fijo sin importar la tasa
// que traiga el producto en el catálogo.
function buildItemsExento(items: LineaServicio[]): string {
  return items.map((it, i) => itemXml(it, i, { indFact: 4, conDescripcion: true })).join("\n");
}

// E46 — Exportaciones: IndicadorFacturacion=3 (tasa 0%).
function buildItemsE46(items: LineaServicio[]): string {
  return items.map((it, i) => itemXml(it, i, { indFact: 3, conDescripcion: true })).join("\n");
}

// E47 — Pagos al exterior: ISR retenido 27%, sin ITBIS ni descuento.
const ISR_RATE_E47 = 0.27;
const retIsrE47 = (l: LineaFiscal) => r2(l.monto * ISR_RATE_E47);

function buildItemsE47(items: LineaServicio[]): string {
  return items.map((it, i) => {
    const retencion = `<Retencion>
        <IndicadorAgenteRetencionoPercepcion>1</IndicadorAgenteRetencionoPercepcion>
        <MontoISRRetenido>${fmt(retIsrE47(lineaFiscal(it)))}</MontoISRRetenido>
      </Retencion>`;
    return itemXml(it, i, { indFact: 4, retencion, conDescuento: false });
  }).join("\n");
}

// ── Totales por tipo ──────────────────────────────────────────────
const sumaLineas = (items: LineaServicio[], f: (l: LineaFiscal) => number) =>
  r2(items.reduce((s, it) => s + f(lineaFiscal(it)), 0));

// E31, E32, E33, E34, E45 — gravado + ITBIS + total (soporta 18% y 16% a la vez)
function totalesGravados(f: Factura): string {
  const t = totalesFiscales(f.items);
  const gravado = r2(t.gravadoI1 + t.gravadoI2);
  return `<Totales>
    <MontoGravadoTotal>${fmt(gravado)}</MontoGravadoTotal>
    <MontoGravadoI1>${fmt(t.gravadoI1)}</MontoGravadoI1>
    ${t.gravadoI2 > 0 ? `<MontoGravadoI2>${fmt(t.gravadoI2)}</MontoGravadoI2>` : ""}
    <MontoExento>${fmt(t.exento)}</MontoExento>
    ${t.gravadoI1 > 0 ? `<ITBIS1>18</ITBIS1>` : ""}
    ${t.gravadoI2 > 0 ? `<ITBIS2>16</ITBIS2>` : ""}
    <TotalITBIS>${fmt(t.itbis)}</TotalITBIS>
    <TotalITBIS1>${fmt(t.itbis1)}</TotalITBIS1>
    ${t.gravadoI2 > 0 ? `<TotalITBIS2>${fmt(t.itbis2)}</TotalITBIS2>` : ""}
    <MontoTotal>${fmt(t.total)}</MontoTotal>
  </Totales>`;
}

// E41 — comprobante de compras con retenciones
function totalesE41(f: Factura): string {
  const t = totalesFiscales(f.items);
  const gravado = r2(t.gravadoI1 + t.gravadoI2);
  return `<Totales>
    <MontoGravadoTotal>${fmt(gravado)}</MontoGravadoTotal>
    <MontoGravadoI1>${fmt(t.gravadoI1)}</MontoGravadoI1>
    ${t.gravadoI2 > 0 ? `<MontoGravadoI2>${fmt(t.gravadoI2)}</MontoGravadoI2>` : ""}
    <MontoExento>${fmt(t.exento)}</MontoExento>
    ${t.gravadoI1 > 0 ? `<ITBIS1>18</ITBIS1>` : ""}
    ${t.gravadoI2 > 0 ? `<ITBIS2>16</ITBIS2>` : ""}
    <TotalITBIS>${fmt(t.itbis)}</TotalITBIS>
    <TotalITBIS1>${fmt(t.itbis1)}</TotalITBIS1>
    ${t.gravadoI2 > 0 ? `<TotalITBIS2>${fmt(t.itbis2)}</TotalITBIS2>` : ""}
    <MontoTotal>${fmt(t.total)}</MontoTotal>
    <TotalITBISRetenido>${fmt(sumaLineas(f.items, retItbisE41))}</TotalITBISRetenido>
    <TotalISRRetencion>${fmt(sumaLineas(f.items, retIsrE41))}</TotalISRRetencion>
  </Totales>`;
}

// E43 y E44 — todo exento
function totalesExentos(f: Factura): string {
  const t = totalesFiscales(f.items, "exento");
  return `<Totales>
    <MontoExento>${fmt(t.exento)}</MontoExento>
    <MontoTotal>${fmt(t.total)}</MontoTotal>
  </Totales>`;
}

// E46 — exportaciones (tasa 3 = 0%, no exento)
function totalesE46(f: Factura): string {
  const t = totalesFiscales(f.items, "tasa3");
  return `<Totales>
    <MontoGravadoTotal>${fmt(t.gravadoI3)}</MontoGravadoTotal>
    <MontoGravadoI3>${fmt(t.gravadoI3)}</MontoGravadoI3>
    <ITBIS3>0</ITBIS3>
    <TotalITBIS>${fmt(0)}</TotalITBIS>
    <TotalITBIS3>${fmt(0)}</TotalITBIS3>
    <MontoTotal>${fmt(t.total)}</MontoTotal>
  </Totales>`;
}

// E47 — pagos al exterior (exentos + ISR retenido)
function totalesE47(f: Factura): string {
  const t = totalesFiscales(f.items, "exento");
  return `<Totales>
    <MontoExento>${fmt(t.exento)}</MontoExento>
    <MontoTotal>${fmt(t.total)}</MontoTotal>
    <TotalISRRetencion>${fmt(sumaLineas(f.items, retIsrE47))}</TotalISRRetencion>
  </Totales>`;
}

// ── InformacionReferencia (E33/E34) ───────────────────────────────
// XSD: NCFModificado → FechaNCFModificado → CodigoModificacion → RazonModificacion?
// FechaNCFModificado es la fecha del comprobante ORIGINAL (no la de la nota).
function infoRef(f: Factura, codMod: string): string {
  return `<InformacionReferencia>
    <NCFModificado>${f.eCFRef ?? ""}</NCFModificado>
    <FechaNCFModificado>${fmtFecha(f.fechaECFRef ?? f.fecha)}</FechaNCFModificado>
    <CodigoModificacion>${codMod}</CodigoModificacion>
    ${f.motivoNota ? `<RazonModificacion>${escapeXml(f.motivoNota.substring(0, 90))}</RazonModificacion>` : ""}
  </InformacionReferencia>`;
}

// ── CONSTRUCTORES POR TIPO ────────────────────────────────────────
// Todos incluyen <FechaHoraFirma> al final, obligatorio según XSD.
// El xml-signer.ts inserta el bloque <Signature> antes del </ECF> de cierre,
// lo que lo coloca correctamente DESPUÉS de FechaHoraFirma.

function buildE31(f: Factura, c: Cliente, e: EmpresaConfig, fh: string): string {
  const hasITBIS = totalesFiscales(f.items).itbis > 0;
  return `<?xml version="1.0" encoding="UTF-8"?>
<ECF>
  <Encabezado>
    <Version>${VERSION}</Version>
    ${idDocConIngresos(f, "31", hasITBIS)}
    ${buildEmisor(e, f.fecha)}
    ${compradorB2B(c)}
    ${totalesGravados(f)}
  </Encabezado>
  <DetallesItems>
    ${buildItems(f.items)}
  </DetallesItems>
  <FechaHoraFirma>${fh}</FechaHoraFirma>
</ECF>`;
}

function buildE32(f: Factura, cliente: Cliente | undefined, e: EmpresaConfig, fh: string): string {
  const hasITBIS = totalesFiscales(f.items).itbis > 0;
  // Prioridad: cliente registrado con RNC > cédula/ID ocasional > consumidor anónimo
  const comp = cliente?.rnc
    ? compradorB2B(cliente)
    : f.rncCompradorOcasional
      ? compradorOcasional(f)
      : compradorConsumidor(f);
  return `<?xml version="1.0" encoding="UTF-8"?>
<ECF>
  <Encabezado>
    <Version>${VERSION}</Version>
    ${idDocE32(f, hasITBIS)}
    ${buildEmisor(e, f.fecha)}
    ${comp}
    ${totalesGravados(f)}
  </Encabezado>
  <DetallesItems>
    ${buildItems(f.items)}
  </DetallesItems>
  <FechaHoraFirma>${fh}</FechaHoraFirma>
</ECF>`;
}

// RNCComprador es obligatorio por regla de negocio en 33/34 aunque el XSD lo
// marque opcional — la DGII rechaza una nota de crédito/débito sin RNC del
// comprador. compradorConsumidor() no lo incluye (solo RazonSocialComprador),
// así que hay que caer en compradorOcasional() cuando no hay un Cliente
// registrado pero sí un RNC ocasional — mismo fallback que ya usa E32.
function compradorNotaCredito(f: Factura, c: Cliente | undefined): string {
  if (c) return compradorB2B(c);
  if (f.rncCompradorOcasional) return compradorOcasional(f);
  return compradorConsumidor(f);
}

function buildE33(f: Factura, c: Cliente | undefined, e: EmpresaConfig, fh: string): string {
  const comp = compradorNotaCredito(f, c);
  const hasITBIS = totalesFiscales(f.items).itbis > 0;
  return `<?xml version="1.0" encoding="UTF-8"?>
<ECF>
  <Encabezado>
    <Version>${VERSION}</Version>
    ${idDocE33(f, hasITBIS)}
    ${buildEmisor(e, f.fecha)}
    ${comp}
    ${totalesGravados(f)}
  </Encabezado>
  <DetallesItems>
    ${buildItems(f.items)}
  </DetallesItems>
  ${infoRef(f, "3")}
  <FechaHoraFirma>${fh}</FechaHoraFirma>
</ECF>`;
}

function buildE34(f: Factura, c: Cliente | undefined, e: EmpresaConfig, fh: string): string {
  const comp = compradorNotaCredito(f, c);
  const hasITBIS = totalesFiscales(f.items).itbis > 0;
  const codMod = f.codigoModificacion ?? "1";
  // CodigoModificacion=2 (Corrige Texto) exige MontoTotal=0 por regla de
  // negocio de la DGII — el default "1" (Anula el NCF modificado) nunca cae
  // en esto, pero un caller podría pasar "2" con un monto real.
  if (codMod === "2" && totalesFiscales(f.items).total !== 0) {
    throw new Error("CodigoModificacion=2 (Corrige Texto) requiere MontoTotal=0 en la nota de crédito.");
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<ECF>
  <Encabezado>
    <Version>${VERSION}</Version>
    ${idDocE34(f, hasITBIS)}
    ${buildEmisor(e, f.fecha)}
    ${comp}
    ${totalesGravados(f)}
  </Encabezado>
  <DetallesItems>
    ${buildItems(f.items)}
  </DetallesItems>
  ${infoRef(f, codMod)}
  <FechaHoraFirma>${fh}</FechaHoraFirma>
</ECF>`;
}

function buildE41(f: Factura, c: Cliente, e: EmpresaConfig, fh: string): string {
  const hasITBIS = totalesFiscales(f.items).itbis > 0;
  return `<?xml version="1.0" encoding="UTF-8"?>
<ECF>
  <Encabezado>
    <Version>${VERSION}</Version>
    ${idDocE41(f, hasITBIS)}
    ${buildEmisor(e, f.fecha)}
    ${compradorB2B(c)}
    ${totalesE41(f)}
  </Encabezado>
  <DetallesItems>
    ${buildItemsE41(f.items)}
  </DetallesItems>
  <FechaHoraFirma>${fh}</FechaHoraFirma>
</ECF>`;
}

function buildE43(f: Factura, e: EmpresaConfig, fh: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ECF>
  <Encabezado>
    <Version>${VERSION}</Version>
    ${idDocE43(f)}
    ${buildEmisor(e, f.fecha)}
    ${totalesExentos(f)}
  </Encabezado>
  <DetallesItems>
    ${buildItemsExento(f.items)}
  </DetallesItems>
  <FechaHoraFirma>${fh}</FechaHoraFirma>
</ECF>`;
}

function buildE44(f: Factura, c: Cliente | undefined, e: EmpresaConfig, fh: string): string {
  const comp = c ? compradorB2B(c) : compradorConsumidor(f);
  return `<?xml version="1.0" encoding="UTF-8"?>
<ECF>
  <Encabezado>
    <Version>${VERSION}</Version>
    ${idDocConIngresos(f, "44")}
    ${buildEmisor(e, f.fecha)}
    ${comp}
    ${totalesExentos(f)}
  </Encabezado>
  <DetallesItems>
    ${buildItemsExento(f.items)}
  </DetallesItems>
  <FechaHoraFirma>${fh}</FechaHoraFirma>
</ECF>`;
}

function buildE45(f: Factura, c: Cliente, e: EmpresaConfig, fh: string): string {
  const hasITBIS = totalesFiscales(f.items).itbis > 0;
  return `<?xml version="1.0" encoding="UTF-8"?>
<ECF>
  <Encabezado>
    <Version>${VERSION}</Version>
    ${idDocConIngresos(f, "45", hasITBIS)}
    ${buildEmisor(e, f.fecha)}
    ${compradorB2B(c)}
    ${totalesGravados(f)}
  </Encabezado>
  <DetallesItems>
    ${buildItems(f.items)}
  </DetallesItems>
  <FechaHoraFirma>${fh}</FechaHoraFirma>
</ECF>`;
}

function buildE46(f: Factura, c: Cliente | undefined, e: EmpresaConfig, fh: string): string {
  const comp = f.idTransaccion
    ? compradorExtranjero(f)
    : c ? compradorB2B(c) : compradorConsumidor(f);
  return `<?xml version="1.0" encoding="UTF-8"?>
<ECF>
  <Encabezado>
    <Version>${VERSION}</Version>
    ${idDocConIngresos(f, "46")}
    ${buildEmisor(e, f.fecha)}
    ${comp}
    ${totalesE46(f)}
  </Encabezado>
  <DetallesItems>
    ${buildItemsE46(f.items)}
  </DetallesItems>
  <FechaHoraFirma>${fh}</FechaHoraFirma>
</ECF>`;
}

function buildE47(f: Factura, e: EmpresaConfig, fh: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ECF>
  <Encabezado>
    <Version>${VERSION}</Version>
    ${idDocE47(f)}
    ${buildEmisor(e, f.fecha)}
    ${compradorExtranjero(f)}
    ${totalesE47(f)}
  </Encabezado>
  <DetallesItems>
    ${buildItemsE47(f.items)}
  </DetallesItems>
  <FechaHoraFirma>${fh}</FechaHoraFirma>
</ECF>`;
}

// ── RFCE — Resumen E32 < RD$250,000 ──────────────────────────────
function buildRFCE(f: Factura, e: EmpresaConfig, codigoSeguridad: string = "", cliente?: Cliente): string {
  const t = totalesFiscales(f.items);
  const nombreComprador = escapeXml(cliente?.nombre ?? f.nombreConsumidor ?? "CONSUMIDOR FINAL");
  return `<?xml version="1.0" encoding="UTF-8"?>
<RFCE>
  <Encabezado>
    <Version>${VERSION}</Version>
    <IdDoc>
      <TipoeCF>32</TipoeCF>
      <eNCF>${f.eCF}</eNCF>
      <TipoIngresos>01</TipoIngresos>
      <TipoPago>${getTipoPago(f.terminos)}</TipoPago>
    </IdDoc>
    ${buildEmisorRFCE(e, f.fecha)}
    <Comprador>
      <RazonSocialComprador>${nombreComprador}</RazonSocialComprador>
    </Comprador>
    <Totales>
      <MontoGravadoTotal>${fmt(t.gravadoI1 + t.gravadoI2)}</MontoGravadoTotal>
      <MontoGravadoI1>${fmt(t.gravadoI1)}</MontoGravadoI1>
      ${t.gravadoI2 > 0 ? `<MontoGravadoI2>${fmt(t.gravadoI2)}</MontoGravadoI2>` : ""}
      <MontoExento>${fmt(t.exento)}</MontoExento>
      <TotalITBIS>${fmt(t.itbis)}</TotalITBIS>
      <TotalITBIS1>${fmt(t.itbis1)}</TotalITBIS1>
      ${t.gravadoI2 > 0 ? `<TotalITBIS2>${fmt(t.itbis2)}</TotalITBIS2>` : ""}
      <MontoTotal>${fmt(t.total)}</MontoTotal>
    </Totales>
    ${codigoSeguridad ? `<CodigoSeguridadeCF>${codigoSeguridad.substring(0, 6)}</CodigoSeguridadeCF>` : ""}
  </Encabezado>
</RFCE>`;
}

// ── EXPORTACIÓN PRINCIPAL ─────────────────────────────────────────

export function buildXML(f: Factura, cliente: Cliente | undefined, empresa: EmpresaConfig): string {
  const fh = nowFechaHoraFirma();
  switch (f.tipoECF) {
    case "E31": return buildE31(f, cliente!, empresa, fh);
    case "E32": return buildE32(f, cliente, empresa, fh);
    case "E33": return buildE33(f, cliente, empresa, fh);
    case "E34": return buildE34(f, cliente, empresa, fh);
    case "E41": return buildE41(f, cliente!, empresa, fh);
    case "E43": return buildE43(f, empresa, fh);
    case "E44": return buildE44(f, cliente, empresa, fh);
    case "E45": return buildE45(f, cliente!, empresa, fh);
    case "E46": return buildE46(f, cliente, empresa, fh);
    case "E47": return buildE47(f, empresa, fh);
    default: throw new Error(`Tipo de e-CF no soportado: ${f.tipoECF}`);
  }
}

export function buildRFCEXml(f: Factura, empresa: EmpresaConfig, codigoSeguridad?: string, cliente?: Cliente): string {
  return buildRFCE(f, empresa, codigoSeguridad, cliente);
}
