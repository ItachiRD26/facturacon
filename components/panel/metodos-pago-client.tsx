"use client";

import { useState } from "react";
import { useSuscripcion } from "@/hooks/use-suscripcion";
import { Boton } from "@/components/sandbox/ui";
import { PLANES } from "@/lib/payments/planes";
import SuscripcionWizard from "./suscripcion-wizard";
import TutorialButton from "./tutorial-button";

const ESTADO_LABEL: Record<string, { texto: string; color: string; bg: string }> = {
  activa:       { texto: "Activa",       color: "var(--c-green)",  bg: "var(--c-green-bg)" },
  pago_fallido: { texto: "Pago fallido", color: "var(--c-red)",    bg: "var(--c-red-bg)" },
  cancelada:    { texto: "Cancelada",    color: "var(--c-text-3)", bg: "var(--c-bg)" },
};

export default function MetodosPagoClient({ tenantId, ambienteLive }: { tenantId: string; ambienteLive: boolean }) {
  const { suscripcion, loading } = useSuscripcion(tenantId);
  const [wizardAbierto, setWizardAbierto] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState("");

  const cancelar = async () => {
    if (!confirm("¿Cancelar el cobro recurrente mensual? Tu plan dejará de renovarse y no podrás emitir comprobantes reales hasta que lo actives de nuevo.")) return;
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

  if (loading) {
    return <div style={{ maxWidth: 640, margin: "0 auto", fontSize: 13, color: "var(--c-text-3)" }}>Cargando...</div>;
  }

  const estado = suscripcion ? ESTADO_LABEL[suscripcion.estado] : null;
  const plan = suscripcion ? PLANES.find((p) => p.id === suscripcion.planId) : undefined;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", fontFamily: "var(--font-sans)" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", marginBottom: 4 }}>Cobro recurrente</h1>
        <p style={{ fontSize: 13, color: "var(--c-text-3)" }}>
          Tu plan se renueva automáticamente cada mes — sin esto activo no puedes emitir comprobantes
          fiscales reales.
        </p>
      </div>

      {!suscripcion && (
        <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, padding: "28px 24px", textAlign: "center", background: "var(--c-surface)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Todavía no tienes un plan activo</div>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 18, maxWidth: 400, margin: "0 auto 18px" }}>
            Son solo dos pasos: elige tu plan y agrega tu tarjeta. Te guiamos en cada uno.
          </p>
          <Boton onClick={() => setWizardAbierto(true)}>Activar cobro recurrente →</Boton>
        </div>
      )}

      {suscripcion?.estado === "pago_fallido" && (
        <div style={{ border: "1px solid var(--c-red-border)", background: "var(--c-red-bg)", borderRadius: 8, padding: 18, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#991b1b", marginBottom: 6 }}>⚠ No pudimos cobrar tu última factura</div>
          <p style={{ fontSize: 12, color: "#991b1b", marginBottom: 14 }}>
            Tu cuenta está suspendida temporalmente — no puedes emitir comprobantes reales hasta que lo
            resuelvas. Solo necesitamos que confirmes tu tarjeta de nuevo.
          </p>
          <Boton onClick={() => setWizardAbierto(true)}>Arreglar mi pago ahora →</Boton>
        </div>
      )}

      {suscripcion && suscripcion.estado !== "pago_fallido" && (
        <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, padding: "18px 20px", background: "var(--c-surface)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  Plan de {suscripcion.facturasMes.toLocaleString("es-DO")} facturas/mes
                </div>
                {estado && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, color: estado.color, background: estado.bg }}>
                    {estado.texto}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>
                {plan && `RD$ ${plan.montoRD.toLocaleString("es-DO")}/mes · `}
                {suscripcion.ultimos4 ? `Tarjeta terminada en ${suscripcion.ultimos4}` : "Sin tarjeta registrada"}
              </div>
            </div>
            {suscripcion.estado === "activa" ? (
              <Boton variant="secondary" onClick={cancelar} disabled={cancelando}>
                {cancelando ? "Cancelando..." : "Cancelar"}
              </Boton>
            ) : (
              <Boton onClick={() => setWizardAbierto(true)}>Reactivar →</Boton>
            )}
          </div>
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: "#991b1b", marginTop: 12 }}>{error}</div>}

      <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12, color: "var(--c-text-3)" }}>¿Dudas sobre el cobro recurrente?</span>
        <TutorialButton titulo="Cómo funciona el cobro recurrente" />
      </div>

      <SuscripcionWizard
        open={wizardAbierto} onClose={() => setWizardAbierto(false)} tenantId={tenantId}
        ambienteLive={ambienteLive} planIdActual={suscripcion?.planId}
        onActivada={() => {}}
      />
    </div>
  );
}
