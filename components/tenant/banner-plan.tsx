"use client";

import { useTenant } from "@/contexts/TenantContext";

// Aviso fijo arriba del sistema real cuando el plan de pago no está activo.
// Antes el cliente solo se enteraba al intentar emitir y recibir un error; ahora
// lo ve desde que entra, con el botón directo a resolverlo.
const TEXTOS = {
  sin_plan: {
    titulo: "Activa tu plan para empezar a facturar",
    detalle: "Ya estás certificado. Elige tu plan y agrega tu tarjeta para poder emitir comprobantes reales. Puedes ver todo mientras tanto.",
    boton: "Elegir mi plan",
  },
  pago_fallido: {
    titulo: "No pudimos cobrar tu plan",
    detalle: "La emisión de comprobantes está pausada. Confirma tu tarjeta y se reactiva al instante.",
    boton: "Arreglar mi pago",
  },
  cancelado: {
    titulo: "Tu plan está cancelado",
    detalle: "No puedes emitir comprobantes reales hasta activar un plan de nuevo.",
    boton: "Activar un plan",
  },
} as const;

// URL del panel en el dominio raíz. El sistema vive en {slug}.dominio, el
// panel en dominio — se arma desde el host actual para que funcione igual en
// local (sub.localhost → localhost) que en producción.
function urlPanelPlan(tenantId: string): string {
  const { hostname, port, protocol } = window.location;
  const esLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost");
  const raiz = esLocal
    ? `http://localhost${port ? `:${port}` : ""}`
    : `${protocol}//${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;
  return `${raiz}/panel/${tenantId}/plan?activar=1`;
}

export default function BannerPlan() {
  const { puedeEmitir, motivoSinPlan, tenantId, rol } = useTenant();
  if (puedeEmitir || !motivoSinPlan) return null;

  const t = TEXTOS[motivoSinPlan];
  const puedeResolver = rol === "owner" || rol === "admin";
  const urgente = motivoSinPlan === "pago_fallido";

  return (
    <div role="status" style={{
      flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap",
      padding: "10px 20px", fontFamily: "var(--font-sans)",
      background: urgente ? "var(--c-red-bg)" : "var(--c-yellow-bg)",
      borderBottom: `1px solid ${urgente ? "var(--c-red-border)" : "var(--c-yellow-border)"}`,
      color: urgente ? "var(--c-red)" : "var(--c-yellow)",
    }}>
      <div style={{ fontSize: 13, lineHeight: 1.45, flex: "1 1 320px" }}>
        <strong>{t.titulo}.</strong> {puedeResolver ? t.detalle : "Pídele al dueño de la cuenta que lo resuelva para poder emitir."}
      </div>
      {puedeResolver && (
        <button type="button" onClick={() => { window.location.href = urlPanelPlan(tenantId); }} style={{
          padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
          background: urgente ? "var(--c-red)" : "var(--c-brand)", color: "#fff", whiteSpace: "nowrap",
        }}>
          {t.boton} →
        </button>
      )}
    </div>
  );
}
