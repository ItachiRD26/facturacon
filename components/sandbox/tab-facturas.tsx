"use client";

import { useState } from "react";
import type { Cliente, Factura, Producto } from "@/types";
import { calcTotales, fmt, fmtDate } from "@/types";
import ModalNuevaFactura from "@/components/modals/modal-nueva-factura";
import PrintModal from "@/components/print/print-modal";
import type { EmpresaImpresion } from "@/components/print/factura-a4";
import { Badge, Boton, EmptyState } from "./ui";

export default function TabFacturas({
  facturas, clientes, productos, empresa, rncEmisor, rootDomain, tenantId, onSave, cambiarEstado,
}: {
  facturas: Factura[]; clientes: Cliente[]; productos: Producto[]; empresa: EmpresaImpresion;
  rncEmisor: string; rootDomain: string; tenantId: string;
  onSave: (data: Omit<Factura, "id">) => Promise<void>;
  cambiarEstado: (id: string, estado: Factura["estado"]) => Promise<void>;
}) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [imprimiendo, setImprimiendo] = useState<Factura | null>(null);

  const clientePor = (id: string) => clientes.find((c) => c.id === id);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Facturas ({facturas.length})</div>
        <Boton onClick={() => setModalAbierto(true)} disabled={productos.length === 0}>+ Nueva factura</Boton>
      </div>
      {productos.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 10 }}>
          Agrega al menos un producto o servicio en Inventario antes de facturar.
        </div>
      )}

      {facturas.length === 0 ? (
        <EmptyState texto="Todavía no has emitido ninguna factura de prueba." />
      ) : (
        <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
          {facturas.map((f) => (
            <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--c-border-lt)", fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{f.eCF} <span style={{ fontSize: 11, color: "var(--c-text-3)" }}>· {fmtDate(f.fecha)}</span></div>
                <div style={{ fontSize: 11, color: "var(--c-text-3)" }}>
                  {f.esConsumidorFinal ? (f.nombreConsumidor || "Consumidor Final") : clientePor(f.clienteId)?.nombre ?? "—"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontWeight: 700 }}>RD$ {fmt(calcTotales(f.items).total)}</span>
                <Badge tone={f.estado === "pagada" ? "green" : f.estado === "anulada" ? "red" : "yellow"}>{f.estado}</Badge>
                {f.estadoDGII === "Aceptado" && <Badge tone="blue">Aceptado (demo)</Badge>}
                <button onClick={() => setImprimiendo(f)} style={{ border: "none", background: "transparent", color: "var(--c-brand)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Imprimir</button>
                {f.estado !== "anulada" && (
                  <button onClick={() => cambiarEstado(f.id, "anulada")} style={{ border: "none", background: "transparent", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Anular</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ModalNuevaFactura
        open={modalAbierto} onClose={() => setModalAbierto(false)} onSave={onSave}
        tenantId={tenantId} clientes={clientes} productos={productos}
        nombreEmisor={empresa.nombre} rncEmisor={rncEmisor} rootDomain={rootDomain}
      />

      <PrintModal
        open={!!imprimiendo} onClose={() => setImprimiendo(null)} factura={imprimiendo}
        cliente={imprimiendo ? clientePor(imprimiendo.clienteId) : undefined} empresa={empresa}
      />
    </div>
  );
}
