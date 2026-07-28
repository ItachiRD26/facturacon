"use client";

import { useState } from "react";
import { useMetodosPago, LIMITE_METODOS_PAGO } from "@/hooks/use-metodos-pago";
import { useSuscripcion } from "@/hooks/use-suscripcion";
import { EmptyState, Boton } from "@/components/sandbox/ui";
import PaymentCardVisual from "./payment-card-visual";
import ModalMetodoPago from "./modal-metodo-pago";
import ModalSuscripcion from "./modal-suscripcion";

const ESTADO_LABEL: Record<string, { texto: string; color: string; bg: string }> = {
  activa:       { texto: "Activa",       color: "var(--c-green)",  bg: "var(--c-green-bg)" },
  pago_fallido: { texto: "Pago fallido", color: "var(--c-red)",    bg: "var(--c-red-bg)" },
  cancelada:    { texto: "Cancelada",    color: "var(--c-text-3)", bg: "var(--c-bg)" },
};

function SeccionCobroRecurrente({ tenantId, ambienteLive }: { tenantId: string; ambienteLive: boolean }) {
  const { suscripcion, loading } = useSuscripcion(tenantId);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState("");

  const cancelar = async () => {
    if (!confirm("¿Cancelar el cobro recurrente mensual? Tu plan dejará de renovarse automáticamente.")) return;
    setCancelando(true); setError("");
    try {
      const res = await fetch("/api/payments/tokenizacion/cancelar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo cancelar.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar.");
    } finally { setCancelando(false); }
  };

  if (loading) return null;
  const estado = suscripcion ? ESTADO_LABEL[suscripcion.estado] : null;

  return (
    <div style={{
      border: "1px solid var(--c-border)", borderRadius: 8, padding: "16px 18px",
      background: "var(--c-surface)", marginBottom: 24,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Cobro recurrente mensual</div>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", maxWidth: 480 }}>
            {suscripcion
              ? `Plan de ${suscripcion.facturasMes} comprobantes/mes — tarjeta terminada en ${suscripcion.ultimos4}.`
              : "Activa el cobro automático mensual para que tu plan se renueve sin que tengas que hacer nada."}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {estado && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, color: estado.color, background: estado.bg }}>
              {estado.texto}
            </span>
          )}
          {suscripcion?.estado === "activa" ? (
            <Boton variant="secondary" onClick={cancelar} disabled={cancelando}>
              {cancelando ? "Cancelando..." : "Cancelar"}
            </Boton>
          ) : (
            <Boton onClick={() => setModalAbierto(true)}>
              {suscripcion ? "Reactivar" : "Activar cobro recurrente"}
            </Boton>
          )}
        </div>
      </div>
      {error && <div style={{ fontSize: 12, color: "#991b1b", marginTop: 10 }}>{error}</div>}
      <ModalSuscripcion
        open={modalAbierto} onClose={() => setModalAbierto(false)} tenantId={tenantId}
        ambienteLive={ambienteLive} onActivada={() => {}}
      />
    </div>
  );
}

export default function MetodosPagoClient({ tenantId, ambienteLive }: { tenantId: string; ambienteLive: boolean }) {
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
      <SeccionCobroRecurrente tenantId={tenantId} ambienteLive={ambienteLive} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", marginBottom: 4 }}>Tarjetas guardadas</h1>
          <p style={{ fontSize: 12, color: "var(--c-text-3)" }}>
            Hasta {LIMITE_METODOS_PAGO} tarjetas de referencia (solo para que las reconozcas — no se cobra
            aquí). El cobro recurrente real se activa arriba, en &quot;Cobro recurrente mensual&quot;.
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
