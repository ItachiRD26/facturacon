"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle, Pill, th, td, tablaWrap } from "@/components/ui/kit";

interface Cobro {
  id: string; estado: "cobrado" | "fallido"; motivo: "ciclo" | "cancelacion"; creadoEn: string;
  planRD: number; adicionalesRD: number; totalRD: number; totalUSD: string;
  ern: string; autorizacion: string | null; intento: number;
}

const rd = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fechaHora = (iso: string) => new Date(iso).toLocaleString("es-DO", {
  timeZone: "America/Santo_Domingo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
});

// Historial de cobros del plan: cada transacción con su fecha y hora, monto, número de aprobación y ERN (referencia).
export default function HistorialCobros({ tenantId, recargar }: { tenantId: string; recargar?: unknown }) {
  const [cobros, setCobros] = useState<Cobro[] | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch(`/api/tenant/cobros?t=${tenantId}`).then((r) => r.json()).then((x) => { if (vivo && Array.isArray(x?.cobros)) setCobros(x.cobros); }).catch(() => {});
    return () => { vivo = false; };
  }, [tenantId, recargar]);

  if (!cobros || cobros.length === 0) return null;
  return (
    <Card padding={0} style={{ marginBottom: 16 }}>
      <div style={{ padding: "16px 18px 12px" }}>
        <CardTitle extra="Cada cobro con su aprobación y referencia">Historial de cobros</CardTitle>
      </div>
      <div style={{ ...tablaWrap, border: "none", borderTop: "1px solid var(--c-border)", borderRadius: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr><th style={th}>Fecha y hora</th><th style={th}>Concepto</th><th style={th}>Monto</th><th style={th}>N.º de aprobación</th><th style={th}>Referencia (ERN)</th><th style={th}>Estado</th></tr>
          </thead>
          <tbody>
            {cobros.map((c) => (
              <tr key={c.id}>
                <td style={{ ...td, whiteSpace: "nowrap" }}>{fechaHora(c.creadoEn)}</td>
                <td style={td}>
                  {c.motivo === "cancelacion" ? "Adicionales al cancelar" : "Plan"}
                  {c.adicionalesRD > 0 && <span style={{ color: "var(--c-text-3)", fontSize: 12 }}> + adicionales {rd(c.adicionalesRD)}</span>}
                </td>
                <td style={{ ...td, whiteSpace: "nowrap" }} className="num-sans"><b>{rd(c.totalRD)}</b> <span style={{ color: "var(--c-text-3)", fontSize: 12 }}>(US$ {c.totalUSD})</span></td>
                <td style={td} className="num-sans">{c.autorizacion ?? "—"}</td>
                <td style={{ ...td, fontSize: 11.5, color: "var(--c-text-3)", wordBreak: "break-all" }}>{c.ern}</td>
                <td style={td}><Pill tono={c.estado === "cobrado" ? "success" : "danger"}>{c.estado === "cobrado" ? "Cobrado" : `Falló (intento ${c.intento})`}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
