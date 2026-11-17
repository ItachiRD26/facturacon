import { QRCodeSVG } from "qrcode.react";
import type { Cliente, Factura } from "@/types";
import { calcLinea, calcTotales, fmt, fmtDate } from "@/types";
import { fmtRNCDisplay } from "@/lib/dgii/xml-builder";
import SelloMuestra from "./sello-muestra";
import { FUENTE_NOMBRE } from "@/lib/print/fuente-impresion";

export interface EmpresaImpresion {
  // `nombre` = razón social (como consta en el RNC); `nombreComercial` solo si la DGII lo tiene.
  nombre: string; nombreComercial?: string; rnc: string; direccion?: string; telefono?: string;
  logoA4Url?: string; logoTermicoUrl?: string;
}

function fmtFechaFirma(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Catálogo oficial DGII (Informe Técnico e-CF v1.0) — obligatorio mostrar el
// eNCF modificado y el código de modificación en la representación impresa
// de una Nota de Débito/Crédito, no solo llevarlo en el XML.
export const CODIGO_MODIFICACION: Record<string, string> = {
  "1": "Anula el NCF modificado", "2": "Corrige texto", "3": "Corrige montos",
  "4": "Reemplazo NCF por contingencia",
};

// Fecha/hora de firma EXACTAMENTE como quedó dentro del XML firmado (es la misma que lleva el QR); la DGII la
// compara. Solo si no hay XML se cae a la fecha de envío.
export function fechaFirmaDe(f: { xmlFirmado?: string; fechaEnvioDGII?: string }): string {
  const m = f.xmlFirmado?.match(/<FechaHoraFirma>([^<]+)<\/FechaHoraFirma>/);
  return m ? m[1].trim() : fmtFechaFirma(f.fechaEnvioDGII);
}

export default function FacturaA4({ factura, cliente, empresa, esMuestra = true }: { factura: Factura; cliente?: Cliente; empresa: EmpresaImpresion; esMuestra?: boolean }) {
  const totales = calcTotales(factura.items);
  const titulo = `Comprobante Fiscal Electrónico ${factura.tipoECF}`;

  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#111", fontSize: 12, padding: 0, position: "relative" }}>
      {esMuestra && <SelloMuestra />}
      <div style={{ position: "relative", zIndex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #111", paddingBottom: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
          {empresa.logoA4Url && (
            // eslint-disable-next-line @next/next/no-img-element -- imagen del tenant en Storage, no un asset propio del sitio
            <img src={empresa.logoA4Url} alt={empresa.nombre} style={{ maxWidth: 90, maxHeight: 60, objectFit: "contain" }} />
          )}
          <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
            {empresa.logoA4Url ? (
              <>
                {empresa.nombreComercial && <div style={{ fontWeight: 800, fontSize: 17 }}>{empresa.nombreComercial}</div>}
                <div style={{ fontWeight: empresa.nombreComercial ? 500 : 700, fontSize: empresa.nombreComercial ? 12 : 16 }}>{empresa.nombre}</div>
              </>
            ) : (
              // Sin logo: el nombre del negocio arriba, con la letra de marca.
              <>
                <div style={{ fontFamily: FUENTE_NOMBRE, fontWeight: 800, fontSize: 26, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 2 }}>{empresa.nombreComercial ?? empresa.nombre}</div>
                {empresa.nombreComercial && <div style={{ fontSize: 12 }}>{empresa.nombre}</div>}
              </>
            )}
            <div>RNC: {fmtRNCDisplay(empresa.rnc)}</div>
            {empresa.direccion && <div>{empresa.direccion}</div>}
            {empresa.telefono && <div>Tel: {empresa.telefono}</div>}
            <div>Fecha emisión: {fmtDate(factura.fecha)}</div>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 20 }}>
          <div style={{ fontWeight: 700 }}>{titulo}</div>
          <div>e-NCF: {factura.eCF}</div>
          {factura.tipoECF !== "E32" && factura.tipoECF !== "E34" && (
            <div>Válido hasta: {fmtDate(factura.vencimientoECF)}</div>
          )}
          {(factura.tipoECF === "E33" || factura.tipoECF === "E34") && factura.eCFRef && (
            <>
              <div>e-NCF Modificado: {factura.eCFRef}</div>
              {factura.codigoModificacion && (
                <div>Código Modificación: {CODIGO_MODIFICACION[factura.codigoModificacion] ?? factura.codigoModificacion}</div>
              )}
            </>
          )}
          <div>Términos: {factura.terminos}</div>
          {factura.metodoPago && <div>Pago: {factura.metodoPago}</div>}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Cliente</div>
        {factura.esConsumidorFinal ? (
          <div>{factura.nombreConsumidor || "Consumidor Final"}</div>
        ) : cliente ? (
          <>
            <div>{cliente.nombre}{cliente.rnc ? ` — RNC: ${fmtRNCDisplay(cliente.rnc)}` : ""}</div>
            <div>{cliente.direccion} {cliente.ciudad}</div>
            {cliente.telefono && <div>Tel: {cliente.telefono}</div>}
          </>
        ) : <div>—</div>}
        {factura.rncCompradorOcasional && <div>Identificación: {factura.rncCompradorOcasional}</div>}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #111", textAlign: "left" }}>
            <th style={{ padding: "6px 4px" }}>Cant.</th>
            <th style={{ padding: "6px 4px" }}>Descripción</th>
            <th style={{ padding: "6px 4px", textAlign: "right" }}>Precio</th>
            <th style={{ padding: "6px 4px", textAlign: "right" }}>Desc.</th>
            <th style={{ padding: "6px 4px", textAlign: "right" }}>ITBIS</th>
            <th style={{ padding: "6px 4px", textAlign: "right" }}>Valor</th>
          </tr>
        </thead>
        <tbody>
          {factura.items.map((item, i) => {
            const c = calcLinea(item);
            return (
              <tr key={i} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: "6px 4px" }}>{item.cant}</td>
                <td style={{ padding: "6px 4px" }}>{item.descripcion}</td>
                <td style={{ padding: "6px 4px", textAlign: "right" }}>{fmt(item.precio)}</td>
                <td style={{ padding: "6px 4px", textAlign: "right" }}>{c.descAmt > 0 ? fmt(c.descAmt) : "—"}</td>
                <td style={{ padding: "6px 4px", textAlign: "right" }}>{item.itbis > 0 ? `${fmt(c.itbisAmt)}` : "Exento"}</td>
                <td style={{ padding: "6px 4px", textAlign: "right" }}>{fmt(c.total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <table style={{ minWidth: 240 }}>
          <tbody>
            {totales.desc > 0 && (
              <tr><td style={{ padding: "3px 8px" }}>Descuentos</td><td style={{ padding: "3px 8px", textAlign: "right" }}>RD$ {fmt(totales.desc)}</td></tr>
            )}
            <tr><td style={{ padding: "3px 8px" }}>Subtotal Gravado</td><td style={{ padding: "3px 8px", textAlign: "right" }}>RD$ {fmt(totales.sub)}</td></tr>
            <tr><td style={{ padding: "3px 8px" }}>Total ITBIS</td><td style={{ padding: "3px 8px", textAlign: "right" }}>RD$ {fmt(totales.itbis)}</td></tr>
            <tr style={{ background: "#111", color: "#fff" }}>
              <td style={{ padding: "6px 8px", fontWeight: 700 }}>TOTAL</td>
              <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>RD$ {fmt(totales.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {factura.notas && (
        <div style={{ padding: 10, background: "#fffbeb", border: "1px solid #fde68a", marginBottom: 16, fontSize: 11 }}>
          {factura.notas}
        </div>
      )}

      {/* Pie fiscal: QR y, DEBAJO del QR, el código de seguridad y la fecha de firma (formato exigido por la DGII). */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-end", borderTop: "1px dashed #999", paddingTop: 14 }}>
        <div>
          {factura.urlQR ? <QRCodeSVG value={factura.urlQR} size={100} level="M" /> : (
            <div style={{ width: 100, height: 100, border: "1px dashed #999", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#999" }}>
              QR DGII
            </div>
          )}
          {factura.codigoSeguridad && <div style={{ fontSize: 10, marginTop: 4 }}>Código de Seguridad: <strong>{factura.codigoSeguridad}</strong></div>}
          <div style={{ fontSize: 10 }}>Fecha Firma: {fechaFirmaDe(factura)}</div>
        </div>
        <div style={{ fontSize: 10, color: "#444" }}>Verifique en ecf.dgii.gov.do</div>
      </div>

      <div style={{ textAlign: "center", fontSize: 10, color: "#888", marginTop: 18, borderTop: "1px dashed #ccc", paddingTop: 8 }}>
        Comprobante Fiscal Electrónico — {empresa.nombre}
      </div>
      </div>
    </div>
  );
}
