"use client";

import { useState } from "react";
import type { Producto } from "@/types";
import Modal from "@/components/modals/modal";
import { Boton, Campo, Input } from "@/components/sandbox/ui";

type Tipo = "entrada" | "merma" | "ajuste";

const TIPOS: { id: Tipo; titulo: string; ayuda: string }[] = [
  { id: "entrada", titulo: "Entrada de mercancía", ayuda: "Llegó mercancía de un proveedor: se suma al stock." },
  { id: "ajuste", titulo: "Conteo / ajuste", ayuda: "Contaste en el almacén: se deja el stock en lo que contaste y queda la diferencia anotada." },
  { id: "merma", titulo: "Merma o baja", ayuda: "Se dañó, venció o se perdió: se resta del stock." },
];

// Mueve el stock de un producto dejando rastro (quién, cuánto y por qué). El stock ya no se
// edita "a mano" en la ficha del producto: todo cambio pasa por aquí o por una venta.
function Formulario({
  onClose, tenantId, producto,
}: { onClose: () => void; tenantId: string; producto: Producto }) {
  const [tipo, setTipo] = useState<Tipo>("entrada");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [costo, setCosto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const actual = producto.stock ?? 0;
  const numero = Number(cantidad.replace(",", "."));
  const valido = cantidad.trim() !== "" && Number.isFinite(numero) && (tipo === "ajuste" ? numero >= 0 : numero > 0) && (tipo === "entrada" || motivo.trim() !== "");
  const resultado = !valido ? null : tipo === "entrada" ? actual + numero : tipo === "merma" ? actual - numero : numero;

  const guardar = async () => {
    if (!valido) return;
    setGuardando(true); setError("");
    try {
      const res = await fetch("/api/inventario/movimiento", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId, productoId: producto.id, tipo, motivo,
          ...(tipo === "ajuste" ? { conteo: numero } : { cantidad: numero }),
          ...(tipo === "entrada" && costo.trim() ? { costo: Number(costo.replace(",", ".")) } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo registrar el movimiento.");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el movimiento.");
    } finally { setGuardando(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Stock de ${producto.nombre}`} maxWidth={480}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 13, color: "var(--c-text-3)" }}>
          Ahora hay <b style={{ color: "var(--c-text-1)" }}>{actual}</b> en inventario.
        </div>
        <div role="radiogroup" aria-label="Tipo de movimiento" style={{ display: "grid", gap: 8 }}>
          {TIPOS.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={tipo === t.id} onClick={() => { setTipo(t.id); setError(""); }}
              style={{ textAlign: "left", padding: "10px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "var(--font-sans)",
                border: `2px solid ${tipo === t.id ? "var(--c-brand)" : "var(--c-border)"}`, background: tipo === t.id ? "var(--c-brand-bg)" : "var(--c-surface)" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{t.titulo}</div>
              <div style={{ fontSize: 12.5, color: "var(--c-text-3)", marginTop: 2 }}>{t.ayuda}</div>
            </button>
          ))}
        </div>

        <Campo label={tipo === "ajuste" ? "Cantidad contada" : "Cantidad"}>
          <Input value={cantidad} onChange={(e) => setCantidad(e.target.value)} inputMode="decimal" autoFocus placeholder={tipo === "ajuste" ? "Lo que hay en el almacén" : "0"} />
        </Campo>
        {tipo === "entrada" && (
          <Campo label="Costo por unidad (opcional)">
            <Input value={costo} onChange={(e) => setCosto(e.target.value)} inputMode="decimal" placeholder="Lo que te costó" />
          </Campo>
        )}
        <Campo label={tipo === "entrada" ? "Proveedor o nota (opcional)" : "Motivo (obligatorio)"}>
          <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={tipo === "entrada" ? "Ej. Pedido de la semana, Distribuidora Norte" : tipo === "merma" ? "Ej. Producto vencido" : "Ej. Conteo del cierre de mes"} />
        </Campo>

        {resultado !== null && (
          <div role="status" style={{ padding: "10px 12px", borderRadius: 10, background: resultado < 0 ? "var(--c-red-bg)" : "var(--c-green-bg)", border: `1px solid ${resultado < 0 ? "var(--c-red-border)" : "var(--c-green-border)"}`, fontSize: 13.5 }}>
            Quedará en <b>{resultado}</b> ({resultado - actual >= 0 ? "+" : ""}{Math.round((resultado - actual) * 10000) / 10000}).
            {resultado < 0 && " Es negativo: revisa la cantidad."}
          </div>
        )}
        {error && <div role="alert" style={{ fontSize: 13, color: "var(--c-red)" }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Boton variant="secondary" onClick={onClose} disabled={guardando}>Cancelar</Boton>
          <Boton onClick={guardar} disabled={!valido || guardando}>{guardando ? "Guardando…" : "Registrar"}</Boton>
        </div>
      </div>
    </Modal>
  );
}

// El formulario solo existe mientras el modal está abierto: cada vez empieza en blanco.
export default function ModalMovimiento({
  open, onClose, tenantId, producto,
}: { open: boolean; onClose: () => void; tenantId: string; producto: Producto | null }) {
  return open && producto ? <Formulario key={producto.id} onClose={onClose} tenantId={tenantId} producto={producto} /> : null;
}
