"use client";

import { useState } from "react";
import type { Abono, Cliente, CuentaPorCobrar } from "@/types";
import { calcPendiente, fmt, fmtDate } from "@/types";
import ModalDetalleCuenta from "@/components/modals/modal-detalle-cuenta";
import { Badge, EmptyState } from "./ui";

export default function TabCxC({
  cuentas, clientes, registrarAbono,
}: { cuentas: CuentaPorCobrar[]; clientes: Cliente[]; registrarAbono: (cuenta: CuentaPorCobrar, abono: Omit<Abono, "id" | "registradoEn">) => Promise<void> }) {
  const [viendo, setViendo] = useState<CuentaPorCobrar | null>(null);
  const clientePor = (id: string) => clientes.find((c) => c.id === id);

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Cuentas por cobrar ({cuentas.length})</div>
      <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 14 }}>
        Se crean automáticamente cuando emites una factura a crédito.
      </p>

      {cuentas.length === 0 ? (
        <EmptyState texto="Emite una factura a crédito para ver una cuenta por cobrar aquí." />
      ) : (
        <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
          {cuentas.map((c) => {
            const pendiente = calcPendiente(c);
            return (
              <button key={c.id} onClick={() => setViendo(c)} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
                textAlign: "left", padding: "10px 14px", borderBottom: "1px solid var(--c-border-lt)",
                fontSize: 13, border: "none", background: "transparent", cursor: "pointer",
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{c.numeroFactura}</div>
                  <div style={{ fontSize: 11, color: "var(--c-text-3)" }}>{clientePor(c.clienteId)?.nombre ?? "—"} · vence {fmtDate(c.fechaVencimiento)}</div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontWeight: 700 }}>RD$ {fmt(pendiente)} <span style={{ fontWeight: 400, color: "var(--c-text-3)" }}>pendiente</span></span>
                  <Badge tone={c.estado === "pagada" ? "green" : c.estado === "vencida" ? "red" : "yellow"}>{c.estado}</Badge>
                </div>
              </button>
            );
          })}
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
