"use client";

import { useEffect, useState } from "react";
import type { MarcaTarjeta, MetodoPago } from "@/types/pagos";
import Modal from "@/components/modals/modal";
import { Boton, Campo, Input, Select } from "@/components/sandbox/ui";

const MARCAS: { v: MarcaTarjeta; label: string }[] = [
  { v: "visa", label: "Visa" },
  { v: "mastercard", label: "Mastercard" },
  { v: "amex", label: "American Express" },
  { v: "otra", label: "Otra" },
];

export default function ModalMetodoPago({
  open, onClose, onSave,
}: { open: boolean; onClose: () => void; onSave: (data: Omit<MetodoPago, "id" | "creadoEn">) => Promise<void> }) {
  const [marca, setMarca] = useState<MarcaTarjeta>("visa");
  const [ultimos4, setUltimos4] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [predeterminado, setPredeterminado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setMarca("visa"); setUltimos4(""); setVencimiento(""); setPredeterminado(false); setError("");
  }, [open]);

  const vencimientoValido = /^(0[1-9]|1[0-2])\/\d{2}$/.test(vencimiento);
  const valido = ultimos4.length === 4 && vencimientoValido;

  const submit = async () => {
    if (!valido) return;
    setGuardando(true); setError("");
    try {
      await onSave({ marca, ultimos4, vencimiento, predeterminado });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el método de pago.");
    } finally { setGuardando(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Agregar método de pago">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontSize: 12, color: "var(--c-text-3)" }}>
          Por tu seguridad, no almacenamos el número completo de tu tarjeta ni el código de
          seguridad — solo los últimos 4 dígitos, para que la reconozcas. El cobro real se
          activará cuando tu cuenta esté certificada y tu suscripción inicie.
        </p>

        <Campo label="Marca">
          <Select value={marca} onChange={(e) => setMarca(e.target.value as MarcaTarjeta)}>
            {MARCAS.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
          </Select>
        </Campo>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Campo label="Últimos 4 dígitos">
            <Input
              value={ultimos4}
              onChange={(e) => setUltimos4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="1234" inputMode="numeric"
            />
          </Campo>
          <Campo label="Vencimiento (MM/YY)">
            <Input
              value={vencimiento}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                setVencimiento(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
              }}
              placeholder="08/27"
            />
          </Campo>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
          <input type="checkbox" checked={predeterminado} onChange={(e) => setPredeterminado(e.target.checked)} />
          Usar como método predeterminado
        </label>

        {error && <div style={{ fontSize: 12, color: "#991b1b" }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <Boton variant="secondary" onClick={onClose}>Cancelar</Boton>
          <Boton onClick={submit} disabled={guardando || !valido}>{guardando ? "Guardando..." : "Guardar"}</Boton>
        </div>
      </div>
    </Modal>
  );
}
