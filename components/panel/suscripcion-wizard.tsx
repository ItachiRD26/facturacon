"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { PLANES } from "@/lib/payments/planes";
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

type Paso = 1 | 2 | 3;

// Reemplaza al viejo ModalSuscripcion: antes leía el plan de
// tenants/{tenantId}/certificacion/pago, un documento que ningún código
// escribía — el formulario de pago nunca se podía completar. Ahora el plan
// se elige aquí mismo, como Paso 1, sin depender de nada externo.
export default function SuscripcionWizard({
  open, onClose, tenantId, onActivada, ambienteLive = false, planIdActual, saltarPlan = false, urlSistema,
}: {
  open: boolean; onClose: () => void; tenantId: string; onActivada: () => void;
  ambienteLive?: boolean;
  // Si ya hubo una suscripción antes (reactivación tras pago fallido/cancelación),
  // precarga el mismo plan para que el usuario no tenga que volver a elegir.
  planIdActual?: string | null;
  // El plan ya se eligió afuera (tarjetas de la pantalla de plan): empieza en Datos de pago.
  saltarPlan?: boolean;
  // Si se pasa, el mensaje final ofrece abrir el sistema ya listo para facturar.
  urlSistema?: string;
}) {
  const [paso, setPaso] = useState<Paso>(1);
  const [planId, setPlanId] = useState<string | null>(null);
  const [form, setForm] = useState<FormTarjeta>(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [scriptListo, setScriptListo] = useState(false);
  const [activada, setActivada] = useState<{ facturasMes: number; ultimos4?: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setPaso(saltarPlan && planIdActual ? 2 : 1); setPlanId(planIdActual ?? null); setForm(VACIO); setError(""); setActivada(null);
  }, [open, planIdActual, saltarPlan]);

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
          tenantId, planId: plan.id, deviceFingerprintID,
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
      setPaso(3);
      onActivada();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally { setEnviando(false); }
  };

  const titulo = paso === 1 ? "Paso 1 — Elige tu plan" : paso === 2 ? "Paso 2 — Datos de pago" : "¡Listo!";

  return (
    <>
      {/* Requerido por Pagadito para evaluar el riesgo de la transacción —
          ver documentacion-pagadito/PG-TokenizationPayment.pdf. */}
      <Script src="/cybs_devicefingerprint.js" strategy="afterInteractive" onReady={() => setScriptListo(true)} />
      <Modal open={open} onClose={onClose} title={titulo} maxWidth={560}>
        {paso < 3 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
            {[1, 2].map((n) => (
              <div key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: n <= paso ? "var(--c-brand)" : "var(--c-border)" }} />
            ))}
          </div>
        )}

        {paso === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <p style={{ fontSize: 12, color: "var(--c-text-3)", margin: 0 }}>
                Elige cuántos comprobantes necesitas emitir al mes.
              </p>
              <InfoTooltip texto="El plan define cuántas facturas electrónicas puedes emitir al mes y cuántos usuarios/cajeros puedes tener. Si te quedas corto, puedes subir de plan más adelante." />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {PLANES.map((p) => (
                <button key={p.id} type="button" onClick={() => setPlanId(p.id)} style={{
                  textAlign: "left", padding: 14, borderRadius: 8, cursor: "pointer",
                  border: `2px solid ${planId === p.id ? "var(--c-brand)" : "var(--c-border)"}`,
                  background: planId === p.id ? "var(--c-brand-bg)" : "#fff",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{p.facturas.toLocaleString("es-DO")} facturas/mes</div>
                  <div style={{ fontSize: 11, color: "var(--c-text-3)", marginBottom: 6 }}>Hasta {p.usuarios} usuarios</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    RD$ {p.montoRD.toLocaleString("es-DO")}<span style={{ fontSize: 11, fontWeight: 400 }}>/mes</span>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Boton variant="secondary" onClick={onClose}>Cancelar</Boton>
              <Boton onClick={() => setPaso(2)} disabled={!planId}>Continuar →</Boton>
            </div>
          </div>
        )}

        {paso === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <p style={{ fontSize: 12, color: "var(--c-text-3)", margin: 0 }}>
                Se cobrará RD$ {plan?.montoRD.toLocaleString("es-DO")}/mes a esta tarjeta, automáticamente, hasta que canceles.
              </p>
              <InfoTooltip texto="Tu número de tarjeta se envía directo a Pagadito (nuestra pasarela de pago) — nunca pasa ni se guarda en los servidores de Facturacon." />
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
              <Boton variant="secondary" onClick={() => setPaso(1)}>← Atrás</Boton>
              <Boton onClick={submit} disabled={!formValido || !scriptListo || enviando}>
                {enviando ? "Activando..." : "Activar cobro recurrente"}
              </Boton>
            </div>
          </div>
        )}

        {paso === 3 && activada && (
          <div style={{ textAlign: "center", padding: "16px 0 4px" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: "#166534", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px",
            }}>
              ✓
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>¡Listo! Tu cobro recurrente está activo</div>
            <p style={{ fontSize: 13, color: "var(--c-text-3)", marginBottom: 20 }}>
              Plan de {activada.facturasMes.toLocaleString("es-DO")} facturas/mes
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
