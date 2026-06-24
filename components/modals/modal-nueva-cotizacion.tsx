"use client";

import { useEffect, useState } from "react";
import type { Cliente, Cotizacion, LineaServicio, Producto } from "@/types";
import { calcTotales, fmt, genCOT, localDate, today } from "@/types";
import { nextSecuencia } from "@/hooks/use-secuencias";
import Modal from "./modal";
import TablaItems from "./tabla-items";
import { Boton, Campo, Select } from "@/components/sandbox/ui";

export default function ModalNuevaCotizacion({
  open, onClose, onSave, tenantId, clientes, productos,
}: {
  open: boolean; onClose: () => void; tenantId: string;
  onSave: (data: Omit<Cotizacion, "id">) => Promise<string | void>;
  clientes: Cliente[]; productos: Producto[];
}) {
  const [clienteId, setClienteId] = useState("");
  const [validezDias, setValidezDias] = useState(15);
  const [items, setItems] = useState<LineaServicio[]>([]);
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setClienteId(clientes[0]?.id ?? ""); setValidezDias(15); setItems([]); setNotas(""); setError("");
  }, [open, clientes]);

  const totales = calcTotales(items);

  const submit = async () => {
    if (!clienteId || items.length === 0) return;
    setGuardando(true); setError("");
    try {
      const seq = await nextSecuencia(tenantId, "COT");
      const venc = new Date();
      venc.setDate(venc.getDate() + validezDias);
      await onSave({
        noCotizacion: genCOT(seq), fecha: today(), vencimiento: localDate(venc),
        validez: `${validezDias} días`, clienteId, estado: "vigente",
        items: items.filter((i) => i.descripcion.trim()), notas: notas.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cotización. Intenta de nuevo.");
    } finally { setGuardando(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva cotización" maxWidth={720}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
          <Campo label="Cliente">
            <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Selecciona un cliente</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
          </Campo>
          <Campo label="Validez">
            <Select value={validezDias} onChange={(e) => setValidezDias(parseInt(e.target.value, 10))}>
              {[7, 15, 30, 45].map((d) => <option key={d} value={d}>{d} días</option>)}
            </Select>
          </Campo>
        </div>

        <Campo label="Líneas de la cotización">
          <TablaItems items={items} onChange={setItems} productos={productos} />
        </Campo>

        {items.length > 0 && (
          <div style={{ textAlign: "right", fontSize: 13, fontWeight: 700 }}>
            Total: RD$ {fmt(totales.total)}
          </div>
        )}

        <Campo label="Notas (opcional)">
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2}
            style={{ width: "100%", padding: "9px 11px", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 13 }} />
        </Campo>

        {error && <div style={{ fontSize: 12, color: "#991b1b" }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Boton variant="secondary" onClick={onClose}>Cancelar</Boton>
          <Boton onClick={submit} disabled={guardando || !clienteId || items.length === 0}>
            {guardando ? "Creando..." : "Crear cotización"}
          </Boton>
        </div>
      </div>
    </Modal>
  );
}
