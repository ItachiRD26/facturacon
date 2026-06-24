"use client";

import type { Cliente, CuentaPorCobrar, Cotizacion, Factura, Producto } from "@/types";
import { calcPendiente, calcTotales, fmt, fmtDate } from "@/types";
import { Badge } from "./ui";

export default function TabDashboard({
  facturas, cotizaciones, clientes, productos, cuentas,
}: { facturas: Factura[]; cotizaciones: Cotizacion[]; clientes: Cliente[]; productos: Producto[]; cuentas: CuentaPorCobrar[] }) {
  const cobrado = facturas.filter((f) => f.estado === "pagada").reduce((acc, f) => acc + calcTotales(f.items).total, 0);
  const porCobrar = cuentas.reduce((acc, c) => acc + calcPendiente(c), 0);
  const cotizacionesVigentes = cotizaciones.filter((c) => c.estado === "vigente").length;
  const productosActivos = productos.filter((p) => p.activo).length;

  const kpis = [
    ["Ingresos cobrados", `RD$ ${fmt(cobrado)}`],
    ["Por cobrar", `RD$ ${fmt(porCobrar)}`],
    ["Cotizaciones vigentes", cotizacionesVigentes],
    ["Productos/servicios", productosActivos],
    ["Clientes", clientes.length],
  ] as const;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
        {kpis.map(([label, val]) => (
          <div key={label} style={{ border: "1px solid var(--c-border)", borderRadius: 8, padding: 14, background: "var(--c-surface)" }}>
            <div style={{ fontSize: 11, color: "var(--c-text-3)", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-serif)" }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Últimas facturas</div>
      {facturas.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>Todavía no has emitido ninguna factura de prueba.</div>
      ) : (
        <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
          {facturas.slice(0, 5).map((f) => (
            <div key={f.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", fontSize: 12, borderBottom: "1px solid var(--c-border-lt)" }}>
              <span>{f.eCF} · {fmtDate(f.fecha)}</span>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                RD$ {fmt(calcTotales(f.items).total)}
                <Badge tone={f.estado === "pagada" ? "green" : f.estado === "anulada" ? "red" : "yellow"}>{f.estado}</Badge>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
