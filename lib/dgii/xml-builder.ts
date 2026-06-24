// Construye el XML del e-CF según los XSD oficiales de la DGII
// Corregido contra XSD e-CF_31..47 + RFCE_32 v1.0
// Errores corregidos en esta versión:
//   1. TablaSubDescuento: campo TasaSubDescuento no existe → eliminado cuando no hay descuento
//   2. ITBIS dentro de <Item>: no existe en el XSD → ITBIS solo va en <Totales>
//   3. FechaHoraFirma: obligatorio antes del <Signature> en el XSD → se incluye en buildXML

import type { Factura, Cliente, LineaServicio } from "@/types";
import { calcLinea, calcTotales } from "@/types";
import type { EmpresaConfig } from "@/types/tenant";

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

// YYYY-MM-DD → DD-MM-YYYY (formato DGII)
function fmtFecha(fecha: string): string {
  if (!fecha) return "";
  if (/^\d{2}-\d{2}-\d{4}$/.test(fecha)) return fecha;
  const [y, m, d] = fecha.split("-");
  if (y && m && d) return `${d.padStart(2,"0")}-${m.padStart(2,"0")}-${y}`;
  return fecha;
}

// Genera FechaHoraFirma en formato dd-MM-YYYY HH:mm:ss
function nowFechaHoraFirma(): string {
  const n   = new Date();
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${pad(n.getDate())}-${pad(n.getMonth()+1)}-${n.getFullYear()} ${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
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

// ── Emisor ────────────────────────────────────────────────────────
function buildEmisor(e: EmpresaConfig, fecha: string): string {
  return `<Emisor>
    <RNCEmisor>${fmtRNC(e.rnc)}</RNCEmisor>
    <RazonSocialEmisor>${escapeXml(e.nombre)}</RazonSocialEmisor>
    <DireccionEmisor>${escapeXml(e.direccion)}</DireccionEmisor>
    ${e.telefono ? `<TablaTelefonoEmisor><TelefonoEmisor>${e.telefono}</TelefonoEmisor></TablaTelefonoEmisor>` : ""}
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
  const parts = fmtFecha(f.fecha).split("-"); // DD-MM-YYYY
  const emision = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  const diffDays = (Date.now() - emision.getTime()) / 86400000;
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

// ── Items ─────────────────────────────────────────────────────────
// Orden correcto según XSD:
// NumeroLinea → IndicadorFacturacion → NombreItem → IndicadorBienoServicio →
// DescripcionItem? → CantidadItem → UnidadMedida? → PrecioUnitarioItem →
// DescuentoMonto? → MontoItem
function buildItems(items: LineaServicio[]): string {
  return items.map((item, i) => {
    const c       = calcLinea(item);
    const paxDesc = item.pax > 0 ? ` | PAX: ${item.pax}` : "";
    const cant    = item.modo === "por_persona" ? (item.pax || 1) : Math.max(item.pax, 1);
    const precioU = item.modo === "por_grupo"
      ? (c.bruto / Math.max(item.pax, 1))
      : item.precio;
    const descLarga = item.descripcion.length > 80 || paxDesc;
    const indFact = item.itbis === 0.18 ? 1 : item.itbis === 0.16 ? 2 : 4;
    return `<Item>
      <NumeroLinea>${i + 1}</NumeroLinea>
      <IndicadorFacturacion>${indFact}</IndicadorFacturacion>
      <NombreItem>${escapeXml(item.descripcion.substring(0, 80))}</NombreItem>
      <IndicadorBienoServicio>2</IndicadorBienoServicio>
      ${descLarga ? `<DescripcionItem>${escapeXml((item.descripcion + paxDesc).substring(0, 1000))}</DescripcionItem>` : ""}
      <CantidadItem>${fmt(cant)}</CantidadItem>
      <UnidadMedida>43</UnidadMedida>
      <PrecioUnitarioItem>${fmt(precioU)}</PrecioUnitarioItem>
      ${item.descuentoMonto > 0 ? `<DescuentoMonto>${fmt(item.descuentoMonto)}</DescuentoMonto>` : ""}
      <MontoItem>${fmt(c.sub)}</MontoItem>
    </Item>`;
  }).join("\n");
}

// E41 — Comprobante de Compras: el comprador retiene ITBIS (18%) e ISR (10%) por ítem.
const ISR_RATE_E41 = 0.10;

function buildItemsE41(items: LineaServicio[]): string {
  return items.map((item, i) => {
    const c       = calcLinea(item);
    const cant    = item.modo === "por_persona" ? (item.pax || 1) : Math.max(item.pax, 1);
    const precioU = item.modo === "por_grupo"
      ? (c.bruto / Math.max(item.pax, 1))
      : item.precio;
    const indFact = item.itbis === 0.18 ? 1 : item.itbis === 0.16 ? 2 : 4;
    return `<Item>
      <NumeroLinea>${i + 1}</NumeroLinea>
      <IndicadorFacturacion>${indFact}</IndicadorFacturacion>
      <Retencion>
        <IndicadorAgenteRetencionoPercepcion>1</IndicadorAgenteRetencionoPercepcion>
        ${c.itbisAmt > 0 ? `<MontoITBISRetenido>${fmt(c.itbisAmt)}</MontoITBISRetenido>` : ""}
        <MontoISRRetenido>${fmt(c.sub * ISR_RATE_E41)}</MontoISRRetenido>
      </Retencion>
      <NombreItem>${escapeXml(item.descripcion.substring(0, 80))}</NombreItem>
      <IndicadorBienoServicio>2</IndicadorBienoServicio>
      <CantidadItem>${fmt(cant)}</CantidadItem>
      <UnidadMedida>43</UnidadMedida>
      <PrecioUnitarioItem>${fmt(precioU)}</PrecioUnitarioItem>
      ${item.descuentoMonto > 0 ? `<DescuentoMonto>${fmt(item.descuentoMonto)}</DescuentoMonto>` : ""}
      <MontoItem>${fmt(c.sub)}</MontoItem>
    </Item>`;
  }).join("\n");
}

// E46 — Exportaciones: IndicadorFacturacion=3 (tasa 3, 0%)
function buildItemsE46(items: LineaServicio[]): string {
  return items.map((item, i) => {
    const c       = calcLinea(item);
    const paxDesc = item.pax > 0 ? ` | PAX: ${item.pax}` : "";
    const cant    = item.modo === "por_persona" ? (item.pax || 1) : Math.max(item.pax, 1);
    const precioU = item.modo === "por_grupo"
      ? (c.bruto / Math.max(item.pax, 1))
      : item.precio;
    const descLarga = item.descripcion.length > 80 || paxDesc;
    return `<Item>
      <NumeroLinea>${i + 1}</NumeroLinea>
      <IndicadorFacturacion>3</IndicadorFacturacion>
      <NombreItem>${escapeXml(item.descripcion.substring(0, 80))}</NombreItem>
      <IndicadorBienoServicio>2</IndicadorBienoServicio>
      ${descLarga ? `<DescripcionItem>${escapeXml((item.descripcion + paxDesc).substring(0, 1000))}</DescripcionItem>` : ""}
      <CantidadItem>${fmt(cant)}</CantidadItem>
      <UnidadMedida>43</UnidadMedida>
      <PrecioUnitarioItem>${fmt(precioU)}</PrecioUnitarioItem>
      ${item.descuentoMonto > 0 ? `<DescuentoMonto>${fmt(item.descuentoMonto)}</DescuentoMonto>` : ""}
      <MontoItem>${fmt(c.sub)}</MontoItem>
    </Item>`;
  }).join("\n");
}

// E47 — Retencion con ISR retenido (27%)
function buildItemsE47(items: LineaServicio[]): string {
  return items.map((item, i) => {
    const c       = calcLinea(item);
    const cant    = item.modo === "por_persona" ? (item.pax || 1) : Math.max(item.pax, 1);
    const precioU = item.modo === "por_grupo"
      ? (c.bruto / Math.max(item.pax, 1))
      : item.precio;
    return `<Item>
      <NumeroLinea>${i + 1}</NumeroLinea>
      <IndicadorFacturacion>4</IndicadorFacturacion>
      <Retencion>
        <IndicadorAgenteRetencionoPercepcion>1</IndicadorAgenteRetencionoPercepcion>
        <MontoISRRetenido>${fmt(c.sub * 0.27)}</MontoISRRetenido>
      </Retencion>
      <NombreItem>${escapeXml(item.descripcion.substring(0, 80))}</NombreItem>
      <IndicadorBienoServicio>2</IndicadorBienoServicio>
      <CantidadItem>${fmt(cant)}</CantidadItem>
      <UnidadMedida>43</UnidadMedida>
      <PrecioUnitarioItem>${fmt(precioU)}</PrecioUnitarioItem>
      <MontoItem>${fmt(c.sub)}</MontoItem>
    </Item>`;
  }).join("\n");
}

// ── Totales por tipo ──────────────────────────────────────────────

// E31, E32, E33, E45 — gravado + ITBIS + total
function totalesGravados(f: Factura): string {
  const t      = calcTotales(f.items);
  const exentos = f.items.filter(i => i.itbis === 0).reduce((s, i) => s + calcLinea(i).sub, 0);
  const grav   = t.sub - exentos;
  return `<Totales>
    <MontoGravadoTotal>${fmt(grav)}</MontoGravadoTotal>
    <MontoGravadoI1>${fmt(grav)}</MontoGravadoI1>
    <MontoExento>${fmt(exentos)}</MontoExento>
    ${t.itbis > 0 ? `<ITBIS1>18</ITBIS1>` : ""}
    <TotalITBIS>${fmt(t.itbis)}</TotalITBIS>
    <TotalITBIS1>${fmt(t.itbis)}</TotalITBIS1>
    <MontoTotal>${fmt(t.total)}</MontoTotal>
  </Totales>`;
}

// E41 — comprobante de compras con retenciones
function totalesE41(f: Factura): string {
  const t      = calcTotales(f.items);
  const exentos = f.items.filter(i => i.itbis === 0).reduce((s, i) => s + calcLinea(i).sub, 0);
  const grav   = t.sub - exentos;
  return `<Totales>
    <MontoGravadoTotal>${fmt(grav)}</MontoGravadoTotal>
    <MontoGravadoI1>${fmt(grav)}</MontoGravadoI1>
    <MontoExento>${fmt(exentos)}</MontoExento>
    ${t.itbis > 0 ? `<ITBIS1>18</ITBIS1>` : ""}
    <TotalITBIS>${fmt(t.itbis)}</TotalITBIS>
    <TotalITBIS1>${fmt(t.itbis)}</TotalITBIS1>
    <MontoTotal>${fmt(t.total)}</MontoTotal>
    <TotalITBISRetenido>${fmt(t.itbis)}</TotalITBISRetenido>
    <TotalISRRetencion>${fmt(t.sub * ISR_RATE_E41)}</TotalISRRetencion>
  </Totales>`;
}

// E43 — gastos menores (todos los ítems son exentos)
function totalesE43(f: Factura): string {
  const t = calcTotales(f.items);
  return `<Totales>
    <MontoExento>${fmt(t.sub)}</MontoExento>
    <MontoTotal>${fmt(t.total)}</MontoTotal>
  </Totales>`;
}

// E44 — regímenes especiales (exento)
function totalesE44(f: Factura): string {
  const t = calcTotales(f.items);
  return `<Totales>
    <MontoExento>${fmt(t.sub)}</MontoExento>
    <MontoTotal>${fmt(t.total)}</MontoTotal>
  </Totales>`;
}

// E46 — exportaciones (tasa 3 = 0%, no exento)
function totalesE46(f: Factura): string {
  const t = calcTotales(f.items);
  return `<Totales>
    <MontoGravadoTotal>${fmt(t.sub)}</MontoGravadoTotal>
    <MontoGravadoI3>${fmt(t.sub)}</MontoGravadoI3>
    <ITBIS3>0</ITBIS3>
    <TotalITBIS>${fmt(0)}</TotalITBIS>
    <TotalITBIS3>${fmt(0)}</TotalITBIS3>
    <MontoTotal>${fmt(t.total)}</MontoTotal>
  </Totales>`;
}

// E47 — pagos al exterior (exentos + ISR retenido)
function totalesE47(f: Factura): string {
  const t = calcTotales(f.items);
  return `<Totales>
    <MontoExento>${fmt(t.sub)}</MontoExento>
    <MontoTotal>${fmt(t.total)}</MontoTotal>
    <TotalISRRetencion>${fmt(t.sub * 0.27)}</TotalISRRetencion>
  </Totales>`;
}

// ── InformacionReferencia (E33/E34) ───────────────────────────────
// XSD E33: NCFModificado(1) → FechaNCFModificado(1) → CodigoModificacion(1) → RazonModificacion(0)
function infoRef(f: Factura, codMod: string): string {
  return `<InformacionReferencia>
    <NCFModificado>${f.eCFRef ?? ""}</NCFModificado>
    <FechaNCFModificado>${fmtFecha(f.fecha)}</FechaNCFModificado>
    <CodigoModificacion>${codMod}</CodigoModificacion>
    ${f.motivoNota ? `<RazonModificacion>${escapeXml(f.motivoNota.substring(0, 90))}</RazonModificacion>` : ""}
  </InformacionReferencia>`;
}

// ── CONSTRUCTORES POR TIPO ────────────────────────────────────────
// Todos incluyen <FechaHoraFirma> al final, obligatorio según XSD.
// El xml-signer.ts inserta el bloque <Signature> antes del </ECF> de cierre,
// lo que lo coloca correctamente DESPUÉS de FechaHoraFirma.

function buildE31(f: Factura, c: Cliente, e: EmpresaConfig, fh: string): string {
  const hasITBIS = calcTotales(f.items).itbis > 0;
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
  const hasITBIS = calcTotales(f.items).itbis > 0;
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

function buildE33(f: Factura, c: Cliente | undefined, e: EmpresaConfig, fh: string): string {
  const comp = c ? compradorB2B(c) : compradorConsumidor(f);
  const hasITBIS = calcTotales(f.items).itbis > 0;
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
  const comp = c ? compradorB2B(c) : compradorConsumidor(f);
  const hasITBIS = calcTotales(f.items).itbis > 0;
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
  ${infoRef(f, f.codigoModificacion ?? "1")}
  <FechaHoraFirma>${fh}</FechaHoraFirma>
</ECF>`;
}

function buildE41(f: Factura, c: Cliente, e: EmpresaConfig, fh: string): string {
  const hasITBIS = calcTotales(f.items).itbis > 0;
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
    ${totalesE43(f)}
  </Encabezado>
  <DetallesItems>
    ${buildItems(f.items)}
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
    ${totalesE44(f)}
  </Encabezado>
  <DetallesItems>
    ${buildItems(f.items)}
  </DetallesItems>
  <FechaHoraFirma>${fh}</FechaHoraFirma>
</ECF>`;
}

function buildE45(f: Factura, c: Cliente, e: EmpresaConfig, fh: string): string {
  const hasITBIS = calcTotales(f.items).itbis > 0;
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
  const t       = calcTotales(f.items);
  const exentos = f.items.filter(i => i.itbis === 0).reduce((s, i) => s + calcLinea(i).sub, 0);
  const grav    = t.sub - exentos;
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
      <MontoGravadoTotal>${fmt(grav)}</MontoGravadoTotal>
      <MontoGravadoI1>${fmt(grav)}</MontoGravadoI1>
      <MontoExento>${fmt(exentos)}</MontoExento>
      <TotalITBIS>${fmt(t.itbis)}</TotalITBIS>
      <TotalITBIS1>${fmt(t.itbis)}</TotalITBIS1>
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
