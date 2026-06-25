"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: Record<string, unknown>) => { render: (selector: string) => void };
    };
  }
}

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";
const sans = "var(--font-sans)";
const serif = "var(--font-serif)";

// Pantalla que bloquea el acceso al asistente de certificación hasta que se
// captura el pago único vía PayPal. PayPal no liquida en pesos dominicanos,
// así que el cobro es en USD — equivalente provisional de los RD$ 15,000 de
// referencia en la landing, no un precio cerrado todavía.
export default function PagoCertificacion({ tenantId, onPagado }: { tenantId: string; onPagado: () => void }) {
  const [cargandoSdk, setCargandoSdk] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (window.paypal) { setCargandoSdk(false); return; }
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&intent=capture`;
    script.onload = () => setCargandoSdk(false);
    script.onerror = () => setError("No se pudo cargar PayPal. Recarga la página.");
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    if (cargandoSdk || error || !window.paypal) return;
    window.paypal.Buttons({
      style: { layout: "vertical", color: "blue", label: "pay" },
      createOrder: async () => {
        setError("");
        const res = await fetch("/api/payments/crear-orden", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantId }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "No se pudo crear la orden de pago."); throw new Error(data.error); }
        return data.orderId;
      },
      onApprove: async (data: { orderID: string }) => {
        const res = await fetch("/api/payments/capturar", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantId, orderId: data.orderID }),
        });
        const body = await res.json();
        if (!res.ok) { setError(body.error ?? "No se pudo confirmar el pago."); return; }
        onPagado();
      },
      onError: () => setError("Ocurrió un error con PayPal. Intenta de nuevo."),
    }).render("#paypal-button-container");
  }, [cargandoSdk, error, tenantId, onPagado]);

  return (
    <div style={{ maxWidth: 480, margin: "60px auto", padding: "0 24px", fontFamily: sans, textAlign: "center" }}>
      <h1 style={{ fontFamily: serif, fontSize: "1.5rem", marginBottom: 8 }}>
        Activa tu certificación
      </h1>
      <p style={{ fontSize: 13, color: "var(--c-text-3)", marginBottom: 24 }}>
        Antes de iniciar el asistente de 15 pasos ante la DGII, hay que completar el pago único de
        certificación. Esto solo se cobra una vez.
      </p>

      <div style={{
        background: "var(--gradient-hero)", borderRadius: 14, padding: "24px 20px", color: "#fff", marginBottom: 24,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, marginBottom: 6 }}>Certificación como emisor electrónico</div>
        <div style={{ fontSize: 30, fontWeight: 800, fontFamily: serif }}>US$ 250.00</div>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>
          Equivalente provisional a los RD$ 15,000 de referencia — PayPal no acepta cobros en pesos
          dominicanos, por eso el cobro se hace en dólares.
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "var(--c-red-bg)", border: "1px solid var(--c-red-border)", borderRadius: 8, fontSize: 12, color: "var(--c-red)", marginBottom: 16, textAlign: "left" }}>
          {error}
        </div>
      )}

      {cargandoSdk ? (
        <div style={{ fontSize: 13, color: "var(--c-text-3)" }}>Cargando PayPal…</div>
      ) : (
        <div id="paypal-button-container" />
      )}

      <p style={{ fontSize: 11, color: "var(--c-text-4)", marginTop: 20 }}>
        Pago procesado por PayPal. No almacenamos los datos de tu tarjeta o cuenta.
      </p>
    </div>
  );
}
