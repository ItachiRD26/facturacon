"use client";

import { useEffect, useState } from "react";
import type { FacturaRecibida } from "@/types";
import { today } from "@/types";
import Modal from "./modal";
import { Boton, Campo, Input } from "@/components/sandbox/ui";

export default function ModalFacturaRecibida({
  open, onClose, onSave,
}: { open: boolean; onClose: () => void; onSave: (data: Omit<FacturaRecibida, "id">) => Promise<void> }) {
  const [encf, setEncf] = useState("");
  const [rncEmisor, setRncEmisor] = useState("");
  const [razonSocialEmisor, setRazonSocialEmisor] = useState("");
  const [fechaEmision, setFechaEmision] = useState(today());
  const [montoTotal, setMontoTotal] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setEncf(""); setRncEmisor(""); setRazonSocialEmisor(""); setFechaEmision(today()); setMontoTotal(""); setError("");
  }, [open]);

  const submit = async () => {
    const monto = parseFloat(montoTotal);
    if (!encf.trim() || !rncEmisor.trim() || isNaN(monto)) return;
    setGuardando(true); setError("");
    try {
      await onSave({
        encf: encf.trim(), tipoECF: encf.trim().slice(0, 3), rncEmisor: rncEmisor.replace(/\D/g, ""),
        razonSocialEmisor: razonSocialEmisor.trim() || undefined, rncComprador: "",
        fechaEmision, montoTotal: monto, estadoARECF: "pendiente", estadoACECF: "pendiente",
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la factura recibida.");
    } finally { setGuardando(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Registrar factura recibida">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontSize: 12, color: "var(--c-text-3)" }}>
          En producción estas llegan automáticamente desde la DGII (receptor electrónico). En el
          entorno de prueba se registran a mano para mostrar cómo se ve el módulo.
        </p>
        <Campo label="e-NCF del proveedor">
          <Input value={encf} onChange={(e) => setEncf(e.target.value)} placeholder="E3100000001" />
        </Campo>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
          <Campo label="RNC proveedor">
            <Input value={rncEmisor} onChange={(e) => setRncEmisor(e.target.value)} placeholder="131217656" />
          </Campo>
          <Campo label="Razón social">
            <Input value={razonSocialEmisor} onChange={(e) => setRazonSocialEmisor(e.target.value)} />
          </Campo>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Campo label="Fecha de emisión">
            <Input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} />
          </Campo>
          <Campo label="Monto total RD$">
            <Input type="number" min={0} step="0.01" value={montoTotal} onChange={(e) => setMontoTotal(e.target.value)} />
          </Campo>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Boton variant="secondary" onClick={onClose}>Cancelar</Boton>
          <Boton onClick={submit} disabled={guardando || !encf.trim() || !rncEmisor.trim() || !montoTotal}>
            {guardando ? "Guardando..." : "Registrar"}
          </Boton>
        </div>
      </div>
    </Modal>
  );
}
