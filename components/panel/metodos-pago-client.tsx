"use client";

import { useState } from "react";
import { useMetodosPago, LIMITE_METODOS_PAGO } from "@/hooks/use-metodos-pago";
import { EmptyState } from "@/components/sandbox/ui";
import PaymentCardVisual from "./payment-card-visual";
import ModalMetodoPago from "./modal-metodo-pago";

export default function MetodosPagoClient({ tenantId }: { tenantId: string }) {
  const { metodos, loading, agregar, marcarPredeterminado, eliminar } = useMetodosPago(tenantId);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [error, setError] = useState("");

  const eliminarConfirmado = async (id: string) => {
    if (!confirm("¿Eliminar este método de pago?")) return;
    setError("");
    try { await eliminar(id); } catch (err) { setError(err instanceof Error ? err.message : "No se pudo eliminar."); }
  };

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", fontFamily: "var(--font-sans)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", marginBottom: 4 }}>Métodos de pago</h1>
          <p style={{ fontSize: 12, color: "var(--c-text-3)" }}>
            Hasta {LIMITE_METODOS_PAGO} métodos guardados. No procesamos cobros reales todavía.
          </p>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          disabled={metodos.length >= LIMITE_METODOS_PAGO}
          style={{
            padding: "9px 16px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: metodos.length >= LIMITE_METODOS_PAGO ? "not-allowed" : "pointer",
            border: "none", background: metodos.length >= LIMITE_METODOS_PAGO ? "#9ca3af" : "var(--c-brand)", color: "#fff",
          }}
        >
          + Agregar método de pago
        </button>
      </div>

      {error && <div style={{ fontSize: 12, color: "#991b1b", marginBottom: 14 }}>{error}</div>}

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--c-text-3)" }}>Cargando...</div>
      ) : metodos.length === 0 ? (
        <EmptyState texto="No tienes métodos de pago guardados. Agrega uno para tenerlo listo cuando tu cuenta se active." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }}>
          {metodos.map((m) => (
            <PaymentCardVisual
              key={m.id}
              metodo={m}
              onEliminar={() => eliminarConfirmado(m.id)}
              onMarcarPredeterminado={() => marcarPredeterminado(m.id)}
            />
          ))}
        </div>
      )}

      <ModalMetodoPago open={modalAbierto} onClose={() => setModalAbierto(false)} onSave={agregar} />
    </div>
  );
}
