import type { Cliente, Cotizacion } from "@/types";
import { calcLinea, calcTotales, fmt, fmtDate } from "@/types";
import type { EmpresaImpresion } from "./factura-a4";
import SelloMuestra from "./sello-muestra";

export default function CotizacionA4({ cotizacion, cliente, empresa, esMuestra = true }: { cotizacion: Cotizacion; cliente?: Cliente; empresa: EmpresaImpresion; esMuestra?: boolean }) {
  const totales = calcTotales(cotizacion.items);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#111", fontSize: 12, padding: 0, position: "relative" }}>
      {esMuestra && <SelloMuestra />}
      <div style={{ position: "relative", zIndex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #111", paddingBottom: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{empresa.nombre}</div>
          <div>RNC: {empresa.rnc}</div>
          {empresa.direccion && <div>{empresa.direccion}</div>}
          {empresa.telefono && <div>Tel: {empresa.telefono}</div>}
          <div>Fecha: {fmtDate(cotizacion.fecha)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700 }}>Cotización</div>
          <div>No. {cotizacion.noCotizacion}</div>
          <div>Vence: {fmtDate(cotizacion.vencimiento)}</div>
          {cotizacion.validez && <div>Validez: {cotizacion.validez}</div>}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Cliente</div>
        {cliente ? (
          <>
            <div>{cliente.nombre}{cliente.rnc ? ` — RNC: ${cliente.rnc}` : ""}</div>
            <div>{cliente.direccion} {cliente.ciudad}</div>
            {cliente.telefono && <div>Tel: {cliente.telefono}</div>}
          </>
        ) : <div>—</div>}
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
          {cotizacion.items.map((item, i) => {
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

      {cotizacion.notas && (
        <div style={{ padding: 10, background: "#fffbeb", border: "1px solid #fde68a", marginBottom: 16, fontSize: 11 }}>
          {cotizacion.notas}
        </div>
      )}

      <div style={{ textAlign: "center", fontSize: 10, color: "#888", marginTop: 18, borderTop: "1px dashed #ccc", paddingTop: 8 }}>
        Esta cotización no es un comprobante fiscal — válida según los términos indicados arriba.
      </div>
      </div>
    </div>
  );
}
