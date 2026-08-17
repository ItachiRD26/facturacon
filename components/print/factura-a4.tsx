import { QRCodeSVG } from "qrcode.react";
import type { Cliente, Factura } from "@/types";
import { calcLinea, calcTotales, fmt, fmtDate } from "@/types";
import { fmtRNCDisplay } from "@/lib/dgii/xml-builder";
import SelloMuestra from "./sello-muestra";

export interface EmpresaImpresion {
  nombre: string; rnc: string; direccion?: string; telefono?: string;
  logoA4Url?: string; logoTermicoUrl?: string;
}

function fmtFechaFirma(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function FacturaA4({ factura, cliente, empresa, esMuestra = true }: { factura: Factura; cliente?: Cliente; empresa: EmpresaImpresion; esMuestra?: boolean }) {
  const totales = calcTotales(factura.items);
  const titulo = `Comprobante Fiscal Electrónico ${factura.tipoECF}`;

  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#111", fontSize: 12, padding: 0, position: "relative" }}>
      {esMuestra && <SelloMuestra />}
      <div style={{ position: "relative", zIndex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #111", paddingBottom: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {empresa.logoA4Url && (
            // eslint-disable-next-line @next/next/no-img-element -- imagen del tenant en Storage, no un asset propio del sitio
            <img src={empresa.logoA4Url} alt={empresa.nombre} style={{ maxWidth: 90, maxHeight: 60, objectFit: "contain" }} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{empresa.nombre}</div>
            <div>RNC: {fmtRNCDisplay(empresa.rnc)}</div>
            {empresa.direccion && <div>{empresa.direccion}</div>}
            {empresa.telefono && <div>Tel: {empresa.telefono}</div>}
            <div>Fecha emisión: {fmtDate(factura.fecha)}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700 }}>{titulo}</div>
          <div>e-NCF: {factura.eCF}</div>
          {factura.tipoECF !== "E32" && factura.tipoECF !== "E34" && (
            <div>Válido hasta: {fmtDate(factura.vencimientoECF)}</div>
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

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", borderTop: "1px dashed #999", paddingTop: 14 }}>
        {factura.urlQR ? <QRCodeSVG value={factura.urlQR} size={80} level="M" /> : (
          <div style={{ width: 80, height: 80, border: "1px dashed #999", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#999" }}>
            QR DGII
          </div>
        )}
        <div style={{ fontSize: 10, color: "#444" }}>
          {factura.codigoSeguridad && <div>Código de Seguridad: <strong>{factura.codigoSeguridad}</strong></div>}
          <div>Fecha Firma Digital: {fmtFechaFirma(factura.fechaEnvioDGII)}</div>
          <div style={{ marginTop: 4 }}>Verifique en ecf.dgii.gov.do</div>
        </div>
      </div>

      <div style={{ textAlign: "center", fontSize: 10, color: "#888", marginTop: 18, borderTop: "1px dashed #ccc", paddingTop: 8 }}>
        Comprobante Fiscal Electrónico — {empresa.nombre}
      </div>
      </div>
    </div>
  );
}
