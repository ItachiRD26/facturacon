"use client";

import { useState } from "react";
import type { Cliente, Cotizacion, Producto } from "@/types";
import { calcTotales, fmt, fmtDate } from "@/types";
import ModalNuevaCotizacion from "@/components/modals/modal-nueva-cotizacion";
import ModalConvertirCotizacion, { type DatosConversion } from "@/components/modals/modal-convertir-cotizacion";
import { Badge, Boton, EmptyState } from "./ui";

export default function TabCotizaciones({
  cotizaciones, clientes, productos, tenantId, onSave, onConvertir, cambiarEstado,
}: {
  cotizaciones: Cotizacion[]; clientes: Cliente[]; productos: Producto[]; tenantId: string;
  onSave: (data: Omit<Cotizacion, "id">) => Promise<string | void>;
  onConvertir: (cotizacion: Cotizacion, datos: DatosConversion) => Promise<void>;
  cambiarEstado: (id: string, estado: Cotizacion["estado"]) => Promise<void>;
}) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [convirtiendo, setConvirtiendo] = useState<Cotizacion | null>(null);

  const clientePor = (id: string) => clientes.find((c) => c.id === id);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Cotizaciones ({cotizaciones.length})</div>
        <Boton onClick={() => setModalAbierto(true)} disabled={clientes.length === 0 || productos.length === 0}>+ Nueva cotización</Boton>
      </div>
      {(clientes.length === 0 || productos.length === 0) && (
        <div style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 10 }}>
          Necesitas al menos un cliente y un producto/servicio para crear una cotización.
        </div>
      )}

      {cotizaciones.length === 0 ? (
        <EmptyState texto="Crea una cotización de prueba y luego convirtiéla en factura." />
      ) : (
        <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
          {cotizaciones.map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--c-border-lt)", fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{c.noCotizacion}</div>
                <div style={{ fontSize: 11, color: "var(--c-text-3)" }}>{clientePor(c.clienteId)?.nombre ?? "—"} · vence {fmtDate(c.vencimiento)}</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontWeight: 700 }}>RD$ {fmt(calcTotales(c.items).total)}</span>
                <Badge tone={c.estado === "vigente" ? "blue" : c.estado === "convertida" ? "green" : "neutral"}>{c.estado}</Badge>
                {c.estado === "vigente" && (
                  <button onClick={() => setConvirtiendo(c)} style={{ border: "none", background: "transparent", color: "var(--c-brand)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Convertir a factura
                  </button>
                )}
                {c.estado === "vigente" && (
                  <button onClick={() => cambiarEstado(c.id, "anulada")} style={{ border: "none", background: "transparent", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Anular
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ModalNuevaCotizacion
        open={modalAbierto} onClose={() => setModalAbierto(false)} tenantId={tenantId}
        clientes={clientes} productos={productos} onSave={onSave}
      />

      <ModalConvertirCotizacion
        open={!!convirtiendo} onClose={() => setConvirtiendo(null)} cotizacion={convirtiendo}
        cliente={convirtiendo ? clientePor(convirtiendo.clienteId) : undefined}
        onConfirmar={async (datos) => { if (convirtiendo) await onConvertir(convirtiendo, datos); }}
      />
    </div>
  );
}
