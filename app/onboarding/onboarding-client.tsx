"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TIPOS_NEGOCIO } from "@/lib/onboarding/tipos-negocio";
import type { TipoNegocio } from "@/types/tenant";

const sans = "var(--font-sans)";
const serif = "var(--font-serif)";

type Paso = 1 | 2;

interface RncValidado { valid: boolean; name?: string; rnc?: string; activo?: boolean | null }

function Card({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button onClick={onClick} type="button" style={{
      textAlign: "left", padding: 16, borderRadius: 8, cursor: "pointer",
      border: `2px solid ${active ? "var(--c-brand)" : "var(--c-border)"}`,
      background: active ? "var(--c-brand-bg)" : "var(--c-surface)",
      fontFamily: sans,
    }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>{desc}</div>
    </button>
  );
}

function Boton({ children, onClick, disabled, variant = "primary" }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; variant?: "primary" | "secondary";
}) {
  return (
    <button onClick={onClick} disabled={disabled} type="button" style={{
      padding: "11px 22px", borderRadius: 6, fontSize: 13, fontWeight: 600, fontFamily: sans,
      cursor: disabled ? "not-allowed" : "pointer",
      background: disabled ? "#9ca3af" : variant === "primary" ? "var(--c-brand)" : "var(--c-surface)",
      color: variant === "primary" ? "#fff" : "var(--c-text-1)",
      border: variant === "secondary" ? "1px solid var(--c-border)" : "none",
    }}>
      {children}
    </button>
  );
}

// El tipo de cuenta (individual/gestor) ya se elige en /registro, antes de
// crear el usuario — esta página solo se encarga de la EMPRESA. Si llega con
// ?rnc=&nombreNegocio= (cuenta individual recién creada, ya con su único
// negocio declarado en el registro) se salta directo al tipo de negocio; si
// no (gestor agregando una empresa nueva desde /panel), pide RNC primero.
// El bloqueo de "individual con empresa ya creada" pasa ANTES de esto, en el
// server component de page.tsx — este componente asume que ya se puede estar
// aquí.
function OnboardingShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rncPrefill = searchParams.get("rnc") ?? "";
  const nombreNegocioPrefill = searchParams.get("nombreNegocio") ?? "";
  const vieneDeRegistro = !!(rncPrefill && nombreNegocioPrefill);

  const [paso, setPaso] = useState<Paso>(vieneDeRegistro ? 2 : 1);

  const [nombreNegocio, setNombreNegocio] = useState(nombreNegocioPrefill);
  const [rnc, setRnc] = useState(rncPrefill);
  const [validando, setValidando] = useState(false);
  const [rncValidado, setRncValidado] = useState<RncValidado | null>(
    vieneDeRegistro ? { valid: true, rnc: rncPrefill, name: nombreNegocioPrefill } : null
  );
  const [rncError, setRncError] = useState("");

  const [tipoNegocio, setTipoNegocio] = useState<TipoNegocio | null>(null);
  const [creando, setCreando] = useState(false);
  const [errorFinal, setErrorFinal] = useState("");

  const validarRnc = async () => {
    setValidando(true); setRncError(""); setRncValidado(null);
    try {
      const res = await fetch(`/api/validate-rnc?number=${encodeURIComponent(rnc)}`);
      const data = await res.json();
      if (!data.valid) {
        setRncError("No encontramos ese RNC en el padrón de la DGII. Verifica el número.");
      } else {
        setRncValidado(data);
        if (!nombreNegocio) setNombreNegocio(data.name);
      }
    } catch {
      setRncError("No se pudo validar el RNC ahora. Intenta de nuevo.");
    } finally { setValidando(false); }
  };

  const tipoInfo = TIPOS_NEGOCIO.find((t) => t.codigo === tipoNegocio);

  const entrarAlSandbox = async () => {
    setCreando(true); setErrorFinal("");
    try {
      const res = await fetch("/api/onboarding/crear-tenant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombreNegocio, rnc: rncValidado?.rnc ?? rnc, tipoNegocio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear tu empresa");
      router.push(`/onboarding/sandbox?t=${data.tenantId}`);
    } catch (err) {
      setErrorFinal(err instanceof Error ? err.message : "Error inesperado");
    } finally { setCreando(false); }
  };

  return (
    <main style={{ maxWidth: 720, margin: "48px auto", padding: "0 24px", fontFamily: sans }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
        {[1, 2].map((n) => (
          <div key={n} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: n <= paso ? "var(--c-brand)" : "var(--c-border)",
          }} />
        ))}
      </div>

      {paso === 1 && (
        <section>
          <h1 style={{ fontFamily: serif, fontSize: "1.5rem", marginBottom: 8 }}>Datos de la empresa</h1>
          <p style={{ color: "var(--c-text-3)", fontSize: 13, marginBottom: 20 }}>
            Verificamos el RNC contra el padrón público de la DGII.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", marginBottom: 5 }}>RNC</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={rnc} onChange={(e) => { setRnc(e.target.value); setRncValidado(null); }}
                  placeholder="131217656" style={{ flex: 1, padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
                <Boton variant="secondary" onClick={validarRnc} disabled={!rnc.trim() || validando}>
                  {validando ? "Validando..." : "Validar"}
                </Boton>
              </div>
              {rncError && <div style={{ marginTop: 6, fontSize: 12, color: "#991b1b" }}>{rncError}</div>}
              {rncValidado?.valid && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#166534" }}>
                  ✓ {rncValidado.name} — estado: {rncValidado.activo ? "Activo" : "no activo"}
                </div>
              )}
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", marginBottom: 5 }}>Nombre del negocio</label>
              <input value={nombreNegocio} onChange={(e) => setNombreNegocio(e.target.value)}
                placeholder="Mi Negocio SRL" style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
            </div>
          </div>
          <Boton onClick={() => setPaso(2)} disabled={!rncValidado?.valid || !nombreNegocio.trim()}>Continuar</Boton>
        </section>
      )}

      {paso === 2 && (
        <section>
          <h1 style={{ fontFamily: serif, fontSize: "1.5rem", marginBottom: 8 }}>¿Qué tipo de negocio tienes?</h1>
          <p style={{ color: "var(--c-text-3)", fontSize: 13, marginBottom: 20 }}>
            Esto nos ayuda a mostrarte el sistema configurado de forma relevante para ti. Después de
            elegir podrás probar el sistema completo con datos de prueba antes de certificarte.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 20 }}>
            {TIPOS_NEGOCIO.map((t) => (
              <Card key={t.codigo} active={tipoNegocio === t.codigo} onClick={() => setTipoNegocio(t.codigo)}
                title={t.label} desc={t.disponible ? "Disponible" : "Próximamente"} />
            ))}
          </div>
          {tipoInfo && !tipoInfo.disponible && (
            <div style={{ padding: 14, background: "var(--c-yellow-bg)", border: "1px solid var(--c-yellow-border)", borderRadius: 6, fontSize: 13, marginBottom: 20 }}>
              El módulo para <strong>{tipoInfo.label}</strong> todavía no está disponible (necesita gestión de
              reservas y no aplica al sistema genérico). {" "}
              <a href="mailto:contacto@facturacon.com.do" style={{ color: "var(--c-brand)", fontWeight: 600 }}>
                Contáctanos para una solución personalizada
              </a>.
            </div>
          )}
          {errorFinal && (
            <div style={{ padding: "9px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 4, fontSize: 12, color: "#991b1b", marginBottom: 12 }}>
              {errorFinal}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            {!vieneDeRegistro && <Boton variant="secondary" onClick={() => setPaso(1)}>Atrás</Boton>}
            <Boton onClick={entrarAlSandbox} disabled={!tipoNegocio || !tipoInfo?.disponible || creando}>
              {creando ? "Preparando tu entorno de prueba..." : "Probar el sistema completo →"}
            </Boton>
          </div>
        </section>
      )}
    </main>
  );
}

export default function OnboardingClient() {
  return (
    <Suspense fallback={<main style={{ padding: 60, textAlign: "center" }}>Cargando...</main>}>
      <OnboardingShell />
    </Suspense>
  );
}
