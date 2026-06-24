"use client";

import { useState } from "react";
import type { Cliente, CuentaPorCobrar } from "@/types";
import { calcPendiente, fmt, fmtDate, today } from "@/types";
import Modal from "./modal";
import { Boton, Campo, Input, Select } from "@/components/sandbox/ui";

const METODOS = ["Efectivo", "Tarjeta", "Transferencia", "Cheque"];

export default function ModalDetalleCuenta({
  open, onClose, cuenta, cliente, onRegistrarAbono,
}: {
  open: boolean; onClose: () => void; cuenta: CuentaPorCobrar | null; cliente?: Cliente;
  onRegistrarAbono: (cuenta: CuentaPorCobrar, abono: { fecha: string; monto: number; metodoPago: string; nota?: string }) => Promise<void>;
}) {
  const [monto, setMonto] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);

  if (!cuenta) return null;
  const pendiente = calcPendiente(cuenta);

  const registrar = async () => {
    const m = parseFloat(monto);
    if (isNaN(m) || m <= 0 || m > pendiente) return;
    setGuardando(true);
    try {
      await onRegistrarAbono(cuenta, { fecha: today(), monto: m, metodoPago, nota: nota.trim() || undefined });
      setMonto(""); setNota("");
    } finally { setGuardando(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Cuenta — ${cuenta.numeroFactura}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 13 }}>Cliente: <strong>{cliente?.nombre ?? "—"}</strong></div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {[["Total", cuenta.monto], ["Cobrado", cuenta.pagado], ["Pendiente", pendiente]].map(([label, val]) => (
            <div key={label as string} style={{ border: "1px solid var(--c-border)", borderRadius: 6, padding: 10, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "var(--c-text-3)", textTransform: "uppercase" }}>{label as string}</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>RD$ {fmt(val as number)}</div>
            </div>
          ))}
        </div>

        {pendiente > 0 && (
          <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Registrar abono</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <Campo label="Monto RD$">
                <Input type="number" min={0} max={pendiente} step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} />
              </Campo>
              <Campo label="Método">
                <Select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                  {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
                </Select>
              </Campo>
            </div>
            <Campo label="Nota (opcional)">
              <Input value={nota} onChange={(e) => setNota(e.target.value)} />
            </Campo>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <Boton onClick={registrar} disabled={guardando || !monto}>{guardando ? "Guardando..." : "Registrar abono"}</Boton>
            </div>
          </div>
        )}

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Historial de pagos</div>
          {cuenta.abonos.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>Sin abonos registrados.</div>
          ) : (
            [...cuenta.abonos].reverse().map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 0", borderBottom: "1px solid var(--c-border-lt)" }}>
                <span>{fmtDate(a.fecha)} · {a.metodoPago}</span>
                <span style={{ fontWeight: 700 }}>RD$ {fmt(a.monto)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
