"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tieneAcceso } from "@/lib/tenant/roles";
import { useTenant } from "@/contexts/TenantContext";
import { useClientes } from "@/hooks/use-clientes";
import { useCuentasPorCobrar } from "@/hooks/use-cuentas-por-cobrar";
import type { CuentaPorCobrar } from "@/types";
import { calcPendiente, fmt, fmtDate } from "@/types";
import Badge from "@/components/ui/badge";
import ModalDetalleCuenta from "@/components/modals/modal-detalle-cuenta";

const sans  = "var(--font-sans)";
const mono  = "var(--font-mono)";
const serif = "var(--font-serif)";

export default function CuentasPorCobrarPage() {
  const tenant = useTenant();
  const router = useRouter();
  const permitido = tieneAcceso(tenant.rol, "cuentas-por-cobrar");
  // Un cajero o un encargado de almacén no ve este módulo: si escribe la dirección, se le devuelve al inicio.
  useEffect(() => { if (!permitido) router.replace("/"); }, [permitido, router]);
  const { clientes } = useClientes(tenant.tenantId);
  const { cuentas, loading, registrarAbono } = useCuentasPorCobrar(tenant.tenantId);
  const [viendo, setViendo] = useState<CuentaPorCobrar | null>(null);

  const clientePor = (id: string) => clientes.find((c) => c.id === id);

  const vigentes  = cuentas.filter((c) => c.estado === "vigente").length;
  const pagadas   = cuentas.filter((c) => c.estado === "pagada").length;
  const porCobrar = cuentas.reduce((s, c) => s + calcPendiente(c), 0);

  if (!permitido) return null;

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: serif, fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--c-text-1)", marginBottom: 2 }}>Cuentas por Cobrar</h1>
        <div style={{ fontSize: 13, color: "var(--c-text-3)", fontFamily: sans }}>Se crean automáticamente al emitir una factura a crédito</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, boxShadow: "var(--shadow-sm)", padding: "14px 16px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--c-text-3)", fontFamily: sans, marginBottom: 8 }}>Vigentes</div>
          <div style={{ fontFamily: mono, fontSize: 19, fontWeight: 700, color: "var(--c-text-1)" }}>{vigentes}</div>
        </div>
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, boxShadow: "var(--shadow-sm)", padding: "14px 16px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--c-text-3)", fontFamily: sans, marginBottom: 8 }}>Pendiente por cobrar</div>
          <div style={{ fontFamily: mono, fontSize: 19, fontWeight: 700, color: "var(--c-text-1)" }}>RD$ {fmt(porCobrar)}</div>
        </div>
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, boxShadow: "var(--shadow-sm)", padding: "14px 16px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--c-text-3)", fontFamily: sans, marginBottom: 8 }}>Pagadas</div>
          <div style={{ fontFamily: mono, fontSize: 19, fontWeight: 700, color: "var(--c-text-1)" }}>{pagadas}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--c-text-4)", fontFamily: sans }}>Cargando cuentas...</div>
      ) : cuentas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", fontFamily: sans }}>
          <div style={{ fontSize: 16, color: "var(--c-text-2)", fontWeight: 600, marginBottom: 6 }}>No hay cuentas por cobrar aún</div>
          <div style={{ fontSize: 13, color: "var(--c-text-4)" }}>Emite una factura a crédito desde Facturas para ver una aquí</div>
        </div>
      ) : (
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAFAF8", borderBottom: "2px solid var(--c-border)" }}>
                {["Factura", "Cliente", "Fecha", "Vence", "Total", "Pendiente", "Estado"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--c-text-3)", fontFamily: sans, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cuentas.map((c) => {
                const pendiente = calcPendiente(c);
                const vencida   = pendiente > 0 && new Date(c.fechaVencimiento + "T12:00:00") < new Date();
                return (
                  <tr key={c.id} onClick={() => setViendo(c)} style={{ borderBottom: "1px solid var(--c-border-lt)", cursor: "pointer", background: vencida ? "#fef2f2" : "" }}
                    onMouseEnter={(e) => { if (!vencida) e.currentTarget.style.background = "#FAFAF8"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = vencida ? "#fef2f2" : ""; }}>
                    <td style={{ padding: "11px 14px", fontFamily: mono, fontSize: 12, fontWeight: 700, color: "var(--c-text-1)" }}>{c.numeroFactura}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, color: "var(--c-text-2)", fontFamily: sans }}>{clientePor(c.clienteId)?.nombre ?? "—"}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--c-text-3)", fontFamily: sans }}>{fmtDate(c.fecha)}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--c-text-3)", fontFamily: sans }}>{fmtDate(c.fechaVencimiento)}</td>
                    <td style={{ padding: "11px 14px", fontFamily: mono, fontSize: 12, color: "var(--c-text-2)" }}>RD$ {fmt(c.monto)}</td>
                    <td style={{ padding: "11px 14px", fontFamily: mono, fontSize: 13, fontWeight: 700, color: "var(--c-text-1)" }}>RD$ {fmt(pendiente)}</td>
                    <td style={{ padding: "11px 14px" }}><Badge estado={vencida ? "vencida" : c.estado} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ModalDetalleCuenta
        open={!!viendo} onClose={() => setViendo(null)} cuenta={viendo}
        cliente={viendo ? clientePor(viendo.clienteId) : undefined}
        onRegistrarAbono={async (cuenta, abono) => { await registrarAbono(cuenta, abono); setViendo(null); }}
      />
    </div>
  );
}
