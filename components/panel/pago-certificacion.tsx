"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PLANES } from "@/lib/payments/planes";

const sans = "var(--font-sans)";
const serif = "var(--font-serif)";

const ERRORES: Record<string, string> = {
  "pago-invalido": "El enlace de pago no es válido. Intenta de nuevo.",
  "pago-no-coincide": "No pudimos confirmar este pago. Si ya pagaste, escríbenos a contacto@facturacon.cfd.",
  "pago-verificacion": "No pudimos confirmar el estado del pago con Pagadito. Intenta de nuevo en unos minutos.",
  "pago-canceled": "Cancelaste el pago en Pagadito. Puedes intentarlo de nuevo cuando quieras.",
  "pago-expired": "El enlace de pago expiró (10 minutos). Genera uno nuevo.",
  "pago-failed": "Pagadito no pudo procesar el pago. Verifica los datos de tu tarjeta e intenta de nuevo.",
};

// Pantalla que bloquea el acceso al asistente de certificación hasta que se
// elige un plan y se captura su primer pago vía Pagadito. No hay cargo de
// activación aparte: el primer pago del plan ES lo que activa la
// certificación (ver lib/payments/planes.ts).
//
// A diferencia de PayPal (botón embebido vía SDK de JS), Pagadito funciona
// con redirect completo: el cliente sale de Facturacon, paga en la página
// segura de Pagadito, y Pagadito lo regresa a /api/payments/retorno, que
// verifica el pago y rebota aquí mismo (con ?error=... si algo falló).
export default function PagoCertificacion({ tenantId }: { tenantId: string }) {
  const searchParams = useSearchParams();
  const errorUrl = searchParams.get("error");
  const [planId, setPlanId] = useState(PLANES[0].id);
  const [iniciando, setIniciando] = useState(false);
  const [error, setError] = useState(errorUrl ? (ERRORES[errorUrl] ?? "Ocurrió un problema con el pago.") : "");

  const pagar = async () => {
    setIniciando(true); setError("");
    try {
      const res = await fetch("/api/payments/crear-orden", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo iniciar el pago.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar el pago.");
      setIniciando(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: "60px auto", padding: "0 24px", fontFamily: sans, textAlign: "center" }}>
      <h1 style={{ fontFamily: serif, fontSize: "1.5rem", marginBottom: 8 }}>
        Elige tu plan y activa tu certificación
      </h1>
      <p style={{ fontSize: 13, color: "var(--c-text-3)", marginBottom: 24 }}>
        Antes de iniciar el asistente de 15 pasos ante la DGII, paga el primer mes de tu plan según
        cuántos comprobantes esperas emitir — ese pago es justo lo que activa tu certificación.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, textAlign: "left" }}>
        {PLANES.map((p) => (
          <label key={p.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px",
            border: `1.5px solid ${planId === p.id ? "var(--c-brand)" : "var(--c-border)"}`,
            background: planId === p.id ? "var(--c-brand-bg)" : "var(--c-surface)",
            borderRadius: 8, cursor: "pointer",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="radio" name="plan" checked={planId === p.id} onChange={() => setPlanId(p.id)} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{p.facturas} facturas/mes</span>
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
              RD$ {p.montoRD.toLocaleString("es-DO")}/mes
            </span>
          </label>
        ))}
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "var(--c-red-bg)", border: "1px solid var(--c-red-border)", borderRadius: 8, fontSize: 12, color: "var(--c-red)", marginBottom: 16, textAlign: "left" }}>
          {error}
        </div>
      )}

      <button
        onClick={pagar}
        disabled={iniciando}
        style={{
          width: "100%", padding: "12px 20px", borderRadius: 8, border: "none", cursor: iniciando ? "not-allowed" : "pointer",
          background: iniciando ? "#9ca3af" : "var(--c-brand)", color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: sans,
        }}
      >
        {iniciando ? "Redirigiendo a Pagadito…" : "Pagar con Pagadito →"}
      </button>

      <p style={{ fontSize: 11, color: "var(--c-text-4)", marginTop: 20 }}>
        Pago procesado por Pagadito, cobrado en dólares (USD) — equivalente provisional al monto en
        RD$ mostrado. Saldrás de Facturacon hacia su página segura; no almacenamos los datos de tu
        tarjeta.
      </p>
    </div>
  );
}
