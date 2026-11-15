"use client";

import { useState } from "react";
import { useSandbox } from "@/contexts/SandboxContext";
import { useFacturas } from "@/hooks/use-facturas";
import { useCotizaciones } from "@/hooks/use-cotizaciones";
import { useClientes } from "@/hooks/use-clientes";
import { useProductos } from "@/hooks/use-productos";
import { useCuentasPorCobrar } from "@/hooks/use-cuentas-por-cobrar";
import { fmt, fmtDate, calcTotales, calcPendiente } from "@/types";
import Badge from "@/components/ui/badge";
import Icon  from "@/components/ui/icon";

const sans  = "var(--font-sans)";
const mono  = "var(--font-mono)";
const serif = "var(--font-serif)";

function KPICard({ label, valor, sub, accent, icon }: { label: string; valor: string | number; sub: string; accent: string; icon: string }) {
  return (
    <div className="hov-lift" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, boxShadow: "var(--shadow-sm)", padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text-3)", fontFamily: sans }}>{label}</div>
        <div style={{ width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
          <Icon name={icon} size={18} />
        </div>
      </div>
      <div style={{ fontFamily: sans, fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--c-text-1)", marginBottom: 2 }}>{valor}</div>
      <div style={{ fontSize: 12.5, color: "var(--c-text-3)", fontFamily: sans }}>{sub}</div>
    </div>
  );
}

export default function SandboxDashboardPage() {
  const { tenantId, tenant } = useSandbox();
  const { facturas,     loading: lf  } = useFacturas(tenantId);
  const { cotizaciones, loading: lc  } = useCotizaciones(tenantId);
  const { clientes,     loading: lcl } = useClientes(tenantId);
  const { productos,    loading: lp  } = useProductos(tenantId);
  const { cuentas,      loading: lcu } = useCuentasPorCobrar(tenantId);
  const [periodo, setPeriodo] = useState<number | "hoy">(30);

  const loading = lf || lc || lcl || lp || lcu;

  const enPeriodo = (fecha: string) => {
    const hoy   = new Date();
    const fDate = new Date(fecha + "T00:00:00");
    if (periodo === "hoy") return fDate.toDateString() === hoy.toDateString();
    const desde = new Date(hoy);
    desde.setDate(hoy.getDate() - (periodo as number) + 1);
    desde.setHours(0, 0, 0, 0);
    return fDate >= desde;
  };

  const PERIODOS = [
    { label: "Hoy",     val: "hoy" as const },
    { label: "7 días",  val: 7  },
    { label: "30 días", val: 30 },
    { label: "90 días", val: 90 },
  ];

  const facturasPeriodo = facturas.filter((f) => enPeriodo(f.fecha) && f.estado !== "anulada");
  const ingresos        = facturasPeriodo.filter((f) => f.estado === "pagada").reduce((s, f) => s + calcTotales(f.items).total, 0);
  const porCobrar        = cuentas.reduce((s, c) => s + calcPendiente(c), 0);
  const cotVigentes      = cotizaciones.filter((c) => c.estado === "vigente");
  const productosActivos = productos.filter((p) => p.activo);
  const ultimasFacturas  = facturas.filter((f) => f.estado !== "anulada").slice(0, 5);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", color: "var(--c-text-4)", fontFamily: sans }}>
        Cargando dashboard...
      </div>
    );
  }

  return (
    <div className="fade-in" data-tour="page-dashboard">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: serif, fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--c-text-1)", marginBottom: 2 }}>Dashboard</h1>
          <div style={{ fontSize: 13, color: "var(--c-text-3)", fontFamily: sans }}>{tenant.nombreNegocio} · datos de prueba</div>
        </div>
        <div style={{ display: "flex", gap: 4, background: "var(--c-border-lt)", borderRadius: 8, padding: 3 }}>
          {PERIODOS.map(({ label, val }) => (
            <button key={String(val)} type="button" onClick={() => setPeriodo(val)}
              style={{ padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontFamily: sans, fontWeight: 500, background: periodo === val ? "#fff" : "transparent", color: periodo === val ? "var(--c-text-1)" : "var(--c-text-3)", boxShadow: periodo === val ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        <KPICard label="Ingresos cobrados"   valor={"RD$ " + fmt(ingresos)}   sub={facturasPeriodo.filter((f) => f.estado === "pagada").length + " facturas pagadas"} accent="#2540D9" icon="invoice"  />
        <KPICard label="Por cobrar"           valor={"RD$ " + fmt(porCobrar)}  sub={cuentas.length + " cuentas registradas"}                                           accent="#92400e" icon="alert"    />
        <KPICard label="Cotizaciones activas" valor={cotVigentes.length}       sub="Pendientes de convertir"                                                          accent="#1d4ed8" icon="quotes"   />
        <KPICard label="Inventario activo"    valor={productosActivos.length} sub="Productos y servicios"                                                            accent="#166534" icon="products" />
        <KPICard label="Clientes"             valor={clientes.length}          sub="Registrados en el sistema"                                                        accent="var(--c-text-3)" icon="clients"  />
      </div>

      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--c-border)" }}>
          <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, color: "var(--c-text-1)" }}>Facturas Recientes</div>
        </div>
        {ultimasFacturas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--c-text-4)", fontFamily: sans, fontSize: 13 }}>
            No hay facturas emitidas aún
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAFAF8", borderBottom: "1px solid var(--c-border)" }}>
                {["e-CF", "Cliente", "Fecha", "Total", "Estado"].map((h) => (
                  <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--c-text-3)", fontFamily: sans }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ultimasFacturas.map((f) => {
                const cliente = clientes.find((c) => c.id === f.clienteId);
                const nombre  = f.esConsumidorFinal ? (f.nombreConsumidor ?? "Consumidor Final") : (cliente?.nombre ?? "—");
                const t       = calcTotales(f.items);
                return (
                  <tr key={f.id} style={{ borderBottom: "1px solid var(--c-border-lt)" }}>
                    <td style={{ padding: "11px 14px", fontFamily: mono, fontSize: 12, fontWeight: 700, color: "var(--c-text-1)" }}>{f.eCF}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, color: "var(--c-text-2)", fontFamily: sans }}>{nombre}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--c-text-3)", fontFamily: sans }}>{fmtDate(f.fecha)}</td>
                    <td style={{ padding: "11px 14px", fontFamily: mono, fontSize: 13, fontWeight: 700, color: "var(--c-text-1)" }}>RD$ {fmt(t.total)}</td>
                    <td style={{ padding: "11px 14px" }}><Badge estado={f.estado} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
