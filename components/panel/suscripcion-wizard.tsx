"use client";

import { useState } from "react";
import Script from "next/script";
import { PLANES, montoPeriodoRD, type PeriodoPlan } from "@/lib/payments/planes";
import Modal from "@/components/modals/modal";
import { Boton, Campo, Input } from "@/components/sandbox/ui";
import InfoTooltip from "./info-tooltip";
import TutorialButton from "./tutorial-button";

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

// 1 = datos de pago, 2 = listo. El plan y el periodo (mensual/anual) ya se eligieron en la página de Plan y facturación.
type Paso = 1 | 2;

// Asistente de pago: solo pide los datos de la tarjeta y cobra. El plan se elige antes, en las tarjetas
// de la página de Plan y facturación. Se monta solo mientras está abierto, así cada vez empieza con el formulario limpio.
export default function SuscripcionWizard({
  open, onClose, tenantId, onActivada, ambienteLive = false, planId, periodo, urlSistema,
}: {
  open: boolean; onClose: () => void; tenantId: string; onActivada: () => void;
  ambienteLive?: boolean;
  planId: string | null;
  periodo: PeriodoPlan;
  // Si se pasa, el mensaje final ofrece abrir el sistema ya listo para facturar.
  urlSistema?: string;
}) {
  const [paso, setPaso] = useState<Paso>(1);
  const [form, setForm] = useState<FormTarjeta>(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [scriptListo, setScriptListo] = useState(false);
  const [activada, setActivada] = useState<{ facturasMes: number; ultimos4?: string } | null>(null);

  const set = <K extends keyof FormTarjeta>(k: K, v: FormTarjeta[K]) => setForm((f) => ({ ...f, [k]: v }));

  const plan = PLANES.find((p) => p.id === planId);

  const formValido =
    form.numero.replace(/\D/g, "").length >= 13 &&
    /^\d{1,2}$/.test(form.vencMes) && /^\d{4}$/.test(form.vencAnio) &&
    /^\d{3,4}$/.test(form.cvv) &&
    !!form.nombreTitular.trim() && !!form.nombre.trim() && !!form.apellido.trim() &&
    !!form.email.trim() && !!form.ciudad.trim() && !!form.direccion.trim() && !!form.telefono.trim();

  const submit = async () => {
    if (!plan || !formValido || !window.cybs_dfprofiler) return;
    setEnviando(true); setError("");
    try {
      const deviceFingerprintID = window.cybs_dfprofiler("pagadito", ambienteLive ? "LIVE" : "SANDBOX");

      const res = await fetch("/api/payments/tokenizacion/suscribir", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId, planId: plan.id, periodo, deviceFingerprintID,
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
      setActivada({ facturasMes: data.facturasMes, ultimos4: data.ultimos4 });
      setPaso(2);
      onActivada();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally { setEnviando(false); }
  };

  const titulo = paso === 1 ? "Datos de pago" : "¡Listo!";

  return (
    <>
      {/* Requerido por Pagadito para evaluar el riesgo de la transacción —
          ver documentacion-pagadito/PG-TokenizationPayment.pdf. */}
      <Script src="/cybs_devicefingerprint.js" strategy="afterInteractive" onReady={() => setScriptListo(true)} />
      <Modal open={open} onClose={onClose} title={titulo} maxWidth={560}>
        {paso === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <p style={{ fontSize: 12, color: "var(--c-text-3)", margin: 0 }}>
                {plan && (periodo === "anual"
                  ? `Plan de ${plan.facturas.toLocaleString("es-DO")} comprobantes · se cobra HOY RD$ ${montoPeriodoRD(plan, "anual").toLocaleString("es-DO")} (el año, 2 meses gratis) y se renueva cada año, automáticamente, hasta que canceles.`
                  : `Plan de ${plan.facturas.toLocaleString("es-DO")} comprobantes · se cobra HOY RD$ ${plan.montoRD.toLocaleString("es-DO")} y se renueva cada mes, automáticamente, hasta que canceles.`)}
              </p>
              <InfoTooltip texto="Tu tarjeta se envía a Pagadito (nuestra pasarela de pago) por una conexión cifrada. Facturacon no la guarda: solo conserva un código seguro de Pagadito y los últimos 4 dígitos." />
              <TutorialButton titulo="Cómo activar tu cobro recurrente" />
            </div>

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

            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <Boton variant="secondary" onClick={onClose}>Cancelar</Boton>
              <Boton onClick={submit} disabled={!formValido || !scriptListo || enviando}>
                {enviando ? "Activando..." : "Activar cobro recurrente"}
              </Boton>
            </div>
          </div>
        )}

        {paso === 2 && activada && (
          <div style={{ textAlign: "center", padding: "16px 0 4px" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: "#166534", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px",
            }}>
              ✓
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>¡Listo! Tu cobro recurrente está activo</div>
            <p style={{ fontSize: 13, color: "var(--c-text-3)", marginBottom: 20 }}>
              Plan de {activada.facturasMes.toLocaleString("es-DO")} facturas/mes{periodo === "anual" ? " (pago anual)" : ""}
              {activada.ultimos4 ? ` — tarjeta terminada en ${activada.ultimos4}` : ""}.
              Ya puedes emitir comprobantes fiscales reales.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              {urlSistema && <a href={urlSistema} style={{ padding: "9px 18px", borderRadius: 6, fontSize: 13, fontWeight: 600, background: "var(--c-brand)", color: "#fff", textDecoration: "none" }}>Abrir mi sistema →</a>}
              <Boton variant="secondary" onClick={onClose}>{urlSistema ? "Cerrar" : "Entendido"}</Boton>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
