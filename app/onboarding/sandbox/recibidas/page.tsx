"use client";

import { useState } from "react";
import { useSandbox } from "@/contexts/SandboxContext";
import { useFacturasRecibidas } from "@/hooks/use-facturas-recibidas";
import { fmt, fmtDate } from "@/types";
import Badge from "@/components/ui/badge";
import Icon  from "@/components/ui/icon";
import ModalFacturaRecibida from "@/components/modals/modal-factura-recibida";

const sans  = "var(--font-sans)";
const mono  = "var(--font-mono)";
const serif = "var(--font-serif)";

export default function SandboxRecibidasPage() {
  const { tenantId } = useSandbox();
  const { recibidas, loading, agregar, eliminar } = useFacturasRecibidas(tenantId);
  const [modalAbierto, setModalAbierto] = useState(false);

  return (
    <div className="fade-in" data-tour="page-recibidas">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: serif, fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--c-text-1)", marginBottom: 2 }}>Facturas Recibidas</h1>
          <div style={{ fontSize: 13, color: "var(--c-text-3)", fontFamily: sans }}>Comprobantes de tus proveedores</div>
        </div>
        <button onClick={() => setModalAbierto(true)} data-tour="btn-nueva-recibida"
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "var(--c-text-1)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: sans }}>
          <Icon name="plus" size={14} /> Registrar
        </button>
      </div>

      <p style={{ fontSize: 12, color: "var(--c-text-4)", fontFamily: sans, marginBottom: 20 }}>
        En producción, estas llegan automáticamente desde la DGII (receptor electrónico). Aquí, en
        modo de prueba, se registran a mano solo para mostrar cómo se ve este módulo.
      </p>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--c-text-4)", fontFamily: sans }}>Cargando...</div>
      ) : recibidas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", fontFamily: sans }}>
          <div style={{ fontSize: 16, color: "var(--c-text-2)", fontWeight: 600, marginBottom: 6 }}>No hay facturas recibidas aún</div>
          <div style={{ fontSize: 13, color: "var(--c-text-4)" }}>Registra una de prueba</div>
        </div>
      ) : (
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAFAF8", borderBottom: "2px solid var(--c-border)" }}>
                {["e-NCF", "Proveedor", "RNC", "Fecha", "Monto", "Estado", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--c-text-3)", fontFamily: sans, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recibidas.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--c-border-lt)" }}>
                  <td style={{ padding: "11px 14px", fontFamily: mono, fontSize: 12, fontWeight: 700, color: "var(--c-text-1)" }}>{r.encf}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, color: "var(--c-text-2)", fontFamily: sans }}>{r.razonSocialEmisor || "—"}</td>
                  <td style={{ padding: "11px 14px", fontFamily: mono, fontSize: 12, color: "var(--c-text-3)" }}>{r.rncEmisor}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--c-text-3)", fontFamily: sans }}>{fmtDate(r.fechaEmision)}</td>
                  <td style={{ padding: "11px 14px", fontFamily: mono, fontSize: 13, fontWeight: 700, color: "var(--c-text-1)" }}>RD$ {fmt(r.montoTotal)}</td>
                  <td style={{ padding: "11px 14px" }}><Badge tipo="neutral">{r.estadoACECF}</Badge></td>
                  <td style={{ padding: "11px 14px" }}>
                    <button onClick={() => eliminar(r.id)} style={{ background: "none", border: "1px solid #fecaca", borderRadius: 8, padding: "5px 7px", cursor: "pointer", color: "#dc2626", display: "flex" }}><Icon name="trash" size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ModalFacturaRecibida open={modalAbierto} onClose={() => setModalAbierto(false)} onSave={agregar} />
    </div>
  );
}
