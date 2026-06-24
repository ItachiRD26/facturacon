"use client";

import { useState } from "react";
import type { FacturaRecibida } from "@/types";
import { fmt, fmtDate } from "@/types";
import ModalFacturaRecibida from "@/components/modals/modal-factura-recibida";
import { Badge, Boton, EmptyState } from "./ui";

export default function TabRecibidas({
  recibidas, agregar, eliminar,
}: { recibidas: FacturaRecibida[]; agregar: (d: Omit<FacturaRecibida, "id">) => Promise<void>; eliminar: (id: string) => Promise<void> }) {
  const [modalAbierto, setModalAbierto] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Facturas recibidas ({recibidas.length})</div>
        <Boton onClick={() => setModalAbierto(true)}>+ Registrar</Boton>
      </div>
      <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 14 }}>
        En producción, las facturas de tus proveedores llegan automáticamente desde la DGII. Aquí
        las registras a mano solo para ver cómo se ve este módulo.
      </p>

      {recibidas.length === 0 ? (
        <EmptyState texto="Registra una factura recibida de prueba." />
      ) : (
        <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
          {recibidas.map((r) => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--c-border-lt)", fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{r.encf}</div>
                <div style={{ fontSize: 11, color: "var(--c-text-3)" }}>{r.razonSocialEmisor || r.rncEmisor} · {fmtDate(r.fechaEmision)}</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontWeight: 700 }}>RD$ {fmt(r.montoTotal)}</span>
                <Badge tone="neutral">{r.estadoACECF}</Badge>
                <button onClick={() => eliminar(r.id)} style={{ border: "none", background: "transparent", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ModalFacturaRecibida open={modalAbierto} onClose={() => setModalAbierto(false)} onSave={agregar} />
    </div>
  );
}
