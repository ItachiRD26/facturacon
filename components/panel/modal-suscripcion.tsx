"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Modal from "@/components/modals/modal";
import { Boton, Campo, Input } from "@/components/sandbox/ui";

// País fijo: República Dominicana (ISO 3166 numérico 214, único mercado que
// atiende Facturacon hoy — ver APPENDIX List of ISO 3166 Country Codes de
// PG-TokenizationPayment.pdf).
const COUNTRY_ID_RD = "214";

declare global {
  interface Window {
    cybs_dfprofiler?: (merchantId: string, environment: "SANDBOX" | "LIVE") => string;
  }
}

interface FormTarjeta {
  numero: string; vencMes: string; vencAnio: string; cvv: string;
  nombreTitular: string; nombre: string; apellido: string; email: string;
  ciudad: string; provincia: string; direccion: string; telefono: string;
}

const VACIO: FormTarjeta = {
  numero: "", vencMes: "", vencAnio: "", cvv: "",
  nombreTitular: "", nombre: "", apellido: "", email: "",
  ciudad: "", provincia: "", direccion: "", telefono: "",
};

export default function ModalSuscripcion({
  open, onClose, tenantId, onActivada, ambienteLive = false,
}: { open: boolean; onClose: () => void; tenantId: string; onActivada: () => void; ambienteLive?: boolean }) {
  const [form, setForm] = useState<FormTarjeta>(VACIO);
  const [planId, setPlanId] = useState<string | null>(null);
  const [facturasMes, setFacturasMes] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [scriptListo, setScriptListo] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(VACIO); setError("");
    // El plan a suscribir es el que el tenant ya contrató al certificarse
    // (tenants/{tenantId}/certificacion/pago) — no se deja elegir otro aquí,
    // cambiar de plan es un flujo aparte todavía sin construir.
    getDoc(doc(db, "tenants", tenantId, "certificacion", "pago")).then((snap) => {
      const data = snap.data();
      setPlanId((data?.planId as string) ?? null);
      setFacturasMes((data?.facturasMes as number) ?? null);
    });
  }, [open, tenantId]);

  const set = <K extends keyof FormTarjeta>(k: K, v: FormTarjeta[K]) => setForm((f) => ({ ...f, [k]: v }));

  const valido =
    form.numero.replace(/\D/g, "").length >= 13 &&
    /^\d{1,2}$/.test(form.vencMes) && /^\d{4}$/.test(form.vencAnio) &&
    /^\d{3,4}$/.test(form.cvv) &&
    form.nombreTitular.trim() && form.nombre.trim() && form.apellido.trim() &&
    form.email.trim() && form.ciudad.trim() && form.direccion.trim() && form.telefono.trim() &&
    planId;

  const submit = async () => {
    if (!valido || !window.cybs_dfprofiler) return;
    setEnviando(true); setError("");
    try {
      const deviceFingerprintID = window.cybs_dfprofiler("pagadito", ambienteLive ? "LIVE" : "SANDBOX");

      const res = await fetch("/api/payments/tokenizacion/suscribir", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId, planId, deviceFingerprintID,
          card: {
            number: form.numero.replace(/\D/g, ""),
            expirationDate: `${form.vencMes.padStart(2, "0")}/${form.vencAnio}`,
            cvv: form.cvv,
            cardHolderName: form.nombreTitular.trim(),
            firstName: form.nombre.trim(), lastName: form.apellido.trim(),
            email: form.email.trim(),
            billingAddress: {
              city: form.ciudad.trim(), state: form.provincia.trim(), zip: "",
              countryId: COUNTRY_ID_RD, line1: form.direccion.trim(), phone: form.telefono.trim(),
            },
          },
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo activar el cobro recurrente.");
      onActivada();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally { setEnviando(false); }
  };

  return (
    <>
      {/* Requerido por Pagadito para evaluar el riesgo de la transacción —
          ver documentacion-pagadito/PG-TokenizationPayment.pdf. */}
      <Script src="/cybs_devicefingerprint.js" strategy="afterInteractive" onReady={() => setScriptListo(true)} />
      <Modal open={open} onClose={onClose} title="Activar cobro recurrente mensual" maxWidth={520}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 12, color: "var(--c-text-3)" }}>
            {facturasMes
              ? `Se cobrará automáticamente tu plan de ${facturasMes} comprobantes/mes a esta tarjeta, cada mes, hasta que canceles.`
              : "Cargando tu plan..."}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            <Campo label="Nombre en la tarjeta">
              <Input value={form.nombreTitular} onChange={(e) => set("nombreTitular", e.target.value.toUpperCase())} placeholder="JOHN SMITH" />
            </Campo>
            <Campo label="Número de tarjeta">
              <Input value={form.numero} onChange={(e) => set("numero", e.target.value.replace(/\D/g, "").slice(0, 16))} placeholder="4111111111111111" inputMode="numeric" />
            </Campo>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Campo label="Mes venc.">
                <Input value={form.vencMes} onChange={(e) => set("vencMes", e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="12" inputMode="numeric" />
              </Campo>
              <Campo label="Año venc.">
                <Input value={form.vencAnio} onChange={(e) => set("vencAnio", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2030" inputMode="numeric" />
              </Campo>
              <Campo label="CVV">
                <Input value={form.cvv} onChange={(e) => set("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="123" inputMode="numeric" />
              </Campo>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Campo label="Nombre"><Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} /></Campo>
              <Campo label="Apellido"><Input value={form.apellido} onChange={(e) => set("apellido", e.target.value)} /></Campo>
            </div>
            <Campo label="Correo"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Campo>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Campo label="Ciudad"><Input value={form.ciudad} onChange={(e) => set("ciudad", e.target.value)} placeholder="Santo Domingo" /></Campo>
              <Campo label="Provincia"><Input value={form.provincia} onChange={(e) => set("provincia", e.target.value)} /></Campo>
            </div>
            <Campo label="Dirección"><Input value={form.direccion} onChange={(e) => set("direccion", e.target.value)} /></Campo>
            <Campo label="Teléfono"><Input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="+1 809 555 5555" /></Campo>
          </div>

          {error && <div style={{ fontSize: 12, color: "#991b1b" }}>{error}</div>}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Boton variant="secondary" onClick={onClose}>Cancelar</Boton>
            <Boton onClick={submit} disabled={!valido || !scriptListo || enviando}>
              {enviando ? "Activando..." : "Activar cobro recurrente"}
            </Boton>
          </div>
        </div>
      </Modal>
    </>
  );
}
