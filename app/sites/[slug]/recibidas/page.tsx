"use client";

import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useFacturasRecibidas } from "@/hooks/use-facturas-recibidas";
import { fmt, fmtDate } from "@/types";
import Badge from "@/components/ui/badge";
import Icon  from "@/components/ui/icon";
import ModalFacturaRecibida from "@/components/modals/modal-factura-recibida";

const sans  = "var(--font-sans)";
const mono  = "var(--font-mono)";
const serif = "var(--font-serif)";

export default function RecibidasPage() {
  const tenant = useTenant();
  const { recibidas, loading, agregar, eliminar } = useFacturasRecibidas(tenant.tenantId);
  const [modalAbierto, setModalAbierto] = useState(false);

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 2 }}>Facturas Recibidas</h1>
          <div style={{ fontSize: 13, color: "#6b7280", fontFamily: sans }}>Comprobantes de tus proveedores</div>
        </div>
        <button onClick={() => setModalAbierto(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "#111", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: sans }}>
          <Icon name="plus" size={14} /> Registrar
        </button>
      </div>

      <p style={{ fontSize: 12, color: "#9ca3af", fontFamily: sans, marginBottom: 20 }}>
        La recepción automática vía el receptor electrónico de la DGII todavía no está conectada —
        por ahora, registra aquí manualmente lo que te facturan tus proveedores.
      </p>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af", fontFamily: sans }}>Cargando...</div>
      ) : recibidas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", fontFamily: sans }}>
          <div style={{ fontSize: 16, color: "#374151", fontWeight: 600, marginBottom: 6 }}>No hay facturas recibidas aún</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>Registra la primera</div>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                {["e-NCF", "Proveedor", "RNC", "Fecha", "Monto", "Estado", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: sans, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recibidas.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "11px 14px", fontFamily: mono, fontSize: 12, fontWeight: 700, color: "#111" }}>{r.encf}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, color: "#374151", fontFamily: sans }}>{r.razonSocialEmisor || "—"}</td>
                  <td style={{ padding: "11px 14px", fontFamily: mono, fontSize: 12, color: "#6b7280" }}>{r.rncEmisor}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#6b7280", fontFamily: sans }}>{fmtDate(r.fechaEmision)}</td>
                  <td style={{ padding: "11px 14px", fontFamily: mono, fontSize: 13, fontWeight: 700, color: "#111" }}>RD$ {fmt(r.montoTotal)}</td>
                  <td style={{ padding: "11px 14px" }}><Badge tipo="neutral">{r.estadoACECF}</Badge></td>
                  <td style={{ padding: "11px 14px" }}>
                    <button onClick={() => eliminar(r.id)} style={{ background: "none", border: "1px solid #fecaca", borderRadius: 4, padding: "5px 7px", cursor: "pointer", color: "#dc2626", display: "flex" }}><Icon name="trash" size={13} /></button>
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
