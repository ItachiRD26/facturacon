import { QRCodeSVG } from "qrcode.react";
import type { Cliente, Factura } from "@/types";
import { calcLinea, calcTotales, fmt, fmtDate } from "@/types";
import type { EmpresaImpresion } from "./factura-a4";

export default function FacturaTermica({ factura, cliente, empresa }: { factura: Factura; cliente?: Cliente; empresa: EmpresaImpresion }) {
  const totales = calcTotales(factura.items);

  return (
    <div style={{ fontFamily: "monospace", fontSize: 11, color: "#111", width: 280 }}>
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div style={{ fontWeight: 700 }}>{empresa.nombre}</div>
        <div>RNC: {empresa.rnc}</div>
        {empresa.direccion && <div>{empresa.direccion}</div>}
        {empresa.telefono && <div>Tel: {empresa.telefono}</div>}
      </div>

      <div style={{ textAlign: "center", borderTop: "1px dashed #000", borderBottom: "1px dashed #000", padding: "4px 0", marginBottom: 6 }}>
        <div>{factura.tipoECF} · e-NCF: {factura.eCF}</div>
        <div>{fmtDate(factura.fecha)}</div>
      </div>

      <div style={{ marginBottom: 6 }}>
        <div style={{ fontWeight: 700 }}>Cliente:</div>
        {factura.esConsumidorFinal ? (
          <div>{factura.nombreConsumidor || "Consumidor Final"}</div>
        ) : cliente ? (
          <>
            <div>{cliente.nombre}</div>
            {cliente.rnc && <div>RNC: {cliente.rnc}</div>}
          </>
        ) : <div>—</div>}
      </div>

      {factura.items.map((item, i) => {
        const c = calcLinea(item);
        return (
          <div key={i} style={{ marginBottom: 4, borderTop: "1px dashed #ccc", paddingTop: 4 }}>
            <div style={{ fontWeight: 700 }}>{item.descripcion}</div>
            <div>{item.cant} × RD$ {fmt(item.precio)} = RD$ {fmt(c.bruto)}</div>
            {c.descAmt > 0 && <div style={{ color: "#b91c1c" }}>Desc: -RD$ {fmt(c.descAmt)}</div>}
            {item.itbis > 0 ? <div style={{ color: "#555" }}>ITBIS: RD$ {fmt(c.itbisAmt)}</div> : <div style={{ color: "#555" }}>(Exento de ITBIS)</div>}
          </div>
        );
      })}

      <div style={{ borderTop: "1px solid #000", marginTop: 6, paddingTop: 6 }}>
        {totales.desc > 0 && <div>Descuentos: -RD$ {fmt(totales.desc)}</div>}
        <div>Sub Total: RD$ {fmt(totales.sub)}</div>
        {totales.itbis > 0 && <div>ITBIS: RD$ {fmt(totales.itbis)}</div>}
        <div style={{ fontWeight: 700, fontSize: 13 }}>TOTAL: RD$ {fmt(totales.total)}</div>
      </div>

      <div style={{ marginTop: 6, borderTop: "1px dashed #ccc", paddingTop: 6 }}>
        <div>Método de pago: {factura.metodoPago ?? factura.terminos}</div>
        <div>Términos: {factura.terminos}</div>
      </div>

      <div style={{ textAlign: "center", marginTop: 8 }}>
        {factura.urlQR ? <QRCodeSVG value={factura.urlQR} size={88} level="M" /> : (
          <div style={{ width: 80, height: 80, border: "1px dashed #999", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#999" }}>
            QR DGII
          </div>
        )}
        {factura.codigoSeguridad && <div style={{ fontWeight: 700, marginTop: 4 }}>Cód. Seg.: {factura.codigoSeguridad}</div>}
        <div style={{ fontSize: 9, color: "#555" }}>ecf.dgii.gov.do</div>
      </div>

      <div style={{ textAlign: "center", marginTop: 8, fontWeight: 700 }}>
        Comprobante Fiscal Electrónico<br />{empresa.nombre}<br />¡Gracias por preferirnos!
      </div>
    </div>
  );
}
