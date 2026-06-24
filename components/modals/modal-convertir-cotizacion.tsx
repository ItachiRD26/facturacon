"use client";

import { useEffect, useState } from "react";
import type { Cliente, Cotizacion } from "@/types";
import { fmt, calcTotales, PLAZOS_CREDITO } from "@/types";
import Modal from "./modal";
import { Boton, Campo, Select, Input } from "@/components/sandbox/ui";

const METODOS = ["Efectivo", "Tarjeta", "Transferencia", "Cheque"];

export interface DatosConversion {
  terminos: "Contado" | "Crédito";
  metodoPago?: string;
  referencia?: string;
  plazo?: string;
}

export default function ModalConvertirCotizacion({
  open, onClose, cotizacion, cliente, onConfirmar,
}: {
  open: boolean; onClose: () => void; cotizacion: Cotizacion | null; cliente?: Cliente;
  onConfirmar: (datos: DatosConversion) => Promise<void>;
}) {
  const [terminos, setTerminos] = useState<"Contado" | "Crédito">("Contado");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [referencia, setReferencia] = useState("");
  const [plazo, setPlazo] = useState<string>(PLAZOS_CREDITO[1]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setTerminos("Contado"); setMetodoPago("Efectivo"); setReferencia(""); setPlazo(PLAZOS_CREDITO[1]); setError("");
  }, [open]);

  if (!cotizacion) return null;
  const totales = calcTotales(cotizacion.items);

  const confirmar = async () => {
    setEnviando(true); setError("");
    try {
      await onConfirmar({
        terminos, metodoPago: terminos === "Contado" ? metodoPago : undefined,
        referencia: metodoPago !== "Efectivo" ? referencia : undefined,
        plazo: terminos === "Crédito" ? plazo : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo convertir la cotización. Intenta de nuevo.");
    } finally { setEnviando(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Convertir ${cotizacion.noCotizacion} en factura`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 13 }}>
          Cliente: <strong>{cliente?.nombre ?? "—"}</strong> · Total: <strong>RD$ {fmt(totales.total)}</strong>
        </div>

        <Campo label="Forma de pago">
          <div style={{ display: "flex", gap: 6 }}>
            {(["Contado", "Crédito"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTerminos(t)} style={{
                flex: 1, padding: "8px 6px", fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer",
                border: `1px solid ${terminos === t ? "var(--c-brand)" : "var(--c-border)"}`,
                background: terminos === t ? "var(--c-brand-bg)" : "var(--c-surface)",
              }}>{t}</button>
            ))}
          </div>
        </Campo>

        {terminos === "Contado" ? (
          <>
            <Campo label="Método de pago">
              <Select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Campo>
            {metodoPago !== "Efectivo" && (
              <Campo label="Referencia / No. de aprobación">
                <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} />
              </Campo>
            )}
          </>
        ) : (
          <Campo label="Plazo de crédito">
            <Select value={plazo} onChange={(e) => setPlazo(e.target.value)}>
              {PLAZOS_CREDITO.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Campo>
        )}

        {error && <div style={{ fontSize: 12, color: "#991b1b" }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Boton variant="secondary" onClick={onClose}>Cancelar</Boton>
          <Boton onClick={confirmar} disabled={enviando}>{enviando ? "Emitiendo..." : "Emitir factura"}</Boton>
        </div>
      </div>
    </Modal>
  );
}
