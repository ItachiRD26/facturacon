import { QRCodeSVG } from "qrcode.react";
import type { Cliente, Factura } from "@/types";
import { calcLinea, fmt, fmtDate } from "@/types";
import { totalesFiscales, modoDeTipo } from "@/lib/fiscal/calculo";
import { CODIGO_MODIFICACION, fechaFirmaDe, type EmpresaImpresion } from "./factura-a4";
import { FUENTE_NOMBRE } from "@/lib/print/fuente-impresion";
import { fmtRNCDisplay } from "@/lib/dgii/xml-builder";
import SelloMuestra from "./sello-muestra";

export default function FacturaTermica({ factura, cliente, empresa, esMuestra = true }: { factura: Factura; cliente?: Cliente; empresa: EmpresaImpresion; esMuestra?: boolean }) {
  // Los totales impresos son EXACTAMENTE los que se declaran a la DGII en el XML (mismo cálculo).
  const fisc = totalesFiscales(factura.items, modoDeTipo(factura.tipoECF));

  return (
    <div style={{ fontFamily: "monospace", fontSize: 11, color: "#111", width: 280, position: "relative" }}>
      {esMuestra && <SelloMuestra compacto />}
      <div style={{ position: "relative", zIndex: 1 }}>
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        {empresa.logoTermicoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- imagen del tenant en Storage, no un asset propio del sitio
          <img src={empresa.logoTermicoUrl} alt={empresa.nombre} style={{ maxWidth: 140, maxHeight: 60, objectFit: "contain", margin: "0 auto 6px" }} />
        )}
        {empresa.logoTermicoUrl ? (
          <>
            {empresa.nombreComercial && <div style={{ fontWeight: 700, fontSize: 13 }}>{empresa.nombreComercial}</div>}
            <div style={{ fontWeight: empresa.nombreComercial ? 400 : 700 }}>{empresa.nombre}</div>
          </>
        ) : (
          // Sin logo: el nombre del negocio arriba, con la letra de marca.
          <>
            <div style={{ fontFamily: FUENTE_NOMBRE, fontWeight: 800, fontSize: 21, lineHeight: 1.05, letterSpacing: "-0.02em", marginBottom: 2 }}>{empresa.nombreComercial ?? empresa.nombre}</div>
            {empresa.nombreComercial && <div>{empresa.nombre}</div>}
          </>
        )}
        <div>RNC: {fmtRNCDisplay(empresa.rnc)}</div>
        {empresa.direccion && <div>{empresa.direccion}</div>}
        {empresa.telefono && <div>Tel: {empresa.telefono}</div>}
      </div>

      <div style={{ textAlign: "center", borderTop: "1px dashed #000", borderBottom: "1px dashed #000", padding: "4px 0", marginBottom: 6 }}>
        <div>{factura.tipoECF} · e-NCF: {factura.eCF}</div>
        <div>{fmtDate(factura.fecha)}</div>
        {(factura.tipoECF === "E33" || factura.tipoECF === "E34") && factura.eCFRef && (
          <>
            <div>Modifica: {factura.eCFRef}</div>
            {factura.codigoModificacion && (
              <div>{CODIGO_MODIFICACION[factura.codigoModificacion] ?? factura.codigoModificacion}</div>
            )}
          </>
        )}
      </div>

      <div style={{ marginBottom: 6 }}>
        <div style={{ fontWeight: 700 }}>Cliente:</div>
        {factura.esConsumidorFinal ? (
          <div>{factura.nombreConsumidor || "Consumidor Final"}</div>
        ) : cliente ? (
          <>
            <div>{cliente.nombre}</div>
            {cliente.rnc && <div>RNC: {fmtRNCDisplay(cliente.rnc)}</div>}
          </>
        ) : <div>—</div>}
      </div>

      {factura.items.map((item, i) => {
        const c = calcLinea(item);
        const incluye = !!item.incluyeITBIS && item.itbis > 0;   // el precio es FINAL: el ITBIS ya va dentro
        return (
          <div key={i} style={{ marginBottom: 4, borderTop: "1px dashed #ccc", paddingTop: 4 }}>
            <div style={{ fontWeight: 700 }}>{item.descripcion}</div>
            <div>{item.cant} × RD$ {fmt(item.precio)} = RD$ {fmt(c.brutoFinal)}</div>
            {c.descFinal > 0 && <div style={{ color: "var(--c-red)" }}>Desc: -RD$ {fmt(c.descFinal)}</div>}
            {incluye && c.descFinal > 0 && <div style={{ fontWeight: 700 }}>Importe: RD$ {fmt(c.total)}</div>}
            {item.itbis > 0
              ? <div style={{ color: "#555" }}>{incluye ? `Incluye ITBIS (${Math.round(item.itbis * 100)}%)` : "ITBIS"}: RD$ {fmt(c.itbisAmt)}</div>
              : <div style={{ color: "#555" }}>(Exento de ITBIS)</div>}
          </div>
        );
      })}

      <div style={{ borderTop: "1px solid #000", marginTop: 6, paddingTop: 6 }}>
        {fisc.gravadoI1 + fisc.gravadoI2 > 0 && <div>Monto gravado (sin ITBIS): RD$ {fmt(fisc.gravadoI1 + fisc.gravadoI2)}</div>}
        {fisc.gravadoI3 > 0 && <div>Monto gravado tasa 0%: RD$ {fmt(fisc.gravadoI3)}</div>}
        {fisc.exento > 0 && <div>Monto exento: RD$ {fmt(fisc.exento)}</div>}
        {fisc.itbis1 > 0 && <div>ITBIS 18%: RD$ {fmt(fisc.itbis1)}</div>}
        {fisc.itbis2 > 0 && <div>ITBIS 16%: RD$ {fmt(fisc.itbis2)}</div>}
        <div style={{ fontWeight: 700, fontSize: 13 }}>TOTAL: RD$ {fmt(fisc.total)}</div>
      </div>

      <div style={{ marginTop: 6, borderTop: "1px dashed #ccc", paddingTop: 6 }}>
        <div>Método de pago: {factura.metodoPago ?? factura.terminos}</div>
        <div>Términos: {factura.terminos}</div>
      </div>

      <div style={{ textAlign: "center", marginTop: 8 }}>
        {factura.urlQR ? <div style={{ display: "flex", justifyContent: "center" }}><QRCodeSVG value={factura.urlQR} size={96} level="M" /></div> : (
          <div style={{ width: 80, height: 80, border: "1px dashed #999", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#999" }}>
            QR DGII
          </div>
        )}
        {factura.codigoSeguridad && <div style={{ fontWeight: 700, marginTop: 4 }}>Código de Seguridad: {factura.codigoSeguridad}</div>}
        <div style={{ fontSize: 10 }}>Fecha Firma: {fechaFirmaDe(factura)}</div>
        <div style={{ fontSize: 9, color: "#555" }}>ecf.dgii.gov.do</div>
      </div>

      <div style={{ textAlign: "center", marginTop: 8, fontWeight: 700 }}>
        Comprobante Fiscal Electrónico<br />{empresa.nombre}<br />¡Gracias por preferirnos!
      </div>
      </div>
    </div>
  );
}
