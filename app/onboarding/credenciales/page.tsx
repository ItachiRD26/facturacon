"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Tenant } from "@/types/tenant";

const sans = "var(--font-sans)";
const serif = "var(--font-serif)";

interface CedulaValidada { valid: boolean; name?: string; activo?: boolean | null }

const ETAPAS_ENVIO = [
  "Leyendo tu certificado...",
  "Verificando que corresponda a tu RNC...",
  "Validando tu cédula ante la DGII...",
  "Cifrando y guardando de forma segura...",
];

function ChecklistItem({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: ok ? "#166534" : "var(--c-text-3)" }}>
      <span style={{
        width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
        background: ok ? "#166534" : "var(--c-border)", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700,
      }}>
        {ok ? "✓" : ""}
      </span>
      {children}
    </div>
  );
}

function CredencialesShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("t") ?? "";

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [cargando, setCargando] = useState(true);

  const [cedula, setCedula] = useState("");
  const [validandoCedula, setValidandoCedula] = useState(false);
  const [cedulaResultado, setCedulaResultado] = useState<CedulaValidada | null>(null);
  const [cedulaError, setCedulaError] = useState("");

  const [p12File, setP12File] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [etapa, setEtapa] = useState(0);
  const [completado, setCompletado] = useState(false);
  const [error, setError] = useState("");
  const etapaTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!tenantId) { setCargando(false); return; }
    getDoc(doc(db, "tenants", tenantId)).then((snap) => {
      if (snap.exists()) setTenant({ id: snap.id, ...snap.data() } as Tenant);
      setCargando(false);
    });
  }, [tenantId]);

  useEffect(() => () => { if (etapaTimer.current) clearInterval(etapaTimer.current); }, []);

  const validarCedula = async () => {
    setValidandoCedula(true); setCedulaError(""); setCedulaResultado(null);
    try {
      const res = await fetch(`/api/validate-rnc?number=${encodeURIComponent(cedula)}`);
      const data = await res.json();
      if (!data.valid) setCedulaError("No encontramos esa cédula en el padrón de la DGII.");
      else setCedulaResultado(data);
    } catch {
      setCedulaError("No se pudo validar la cédula ahora. Intenta de nuevo.");
    } finally { setValidandoCedula(false); }
  };

  const passwordTrimmed = password.trim();
  const passwordTieneEspacios = password !== passwordTrimmed && password.length > 0;
  const cedulaLista = !!cedulaResultado?.valid && !!cedulaResultado?.activo;
  const p12Listo = !!p12File;
  const passwordLista = passwordTrimmed.length > 0;
  const listoParaEnviar = cedulaLista && p12Listo && passwordLista;

  const enviar = async () => {
    if (!p12File || !tenant) return;
    setEnviando(true); setError(""); setEtapa(0); setCompletado(false);

    etapaTimer.current = setInterval(() => {
      setEtapa((e) => Math.min(e + 1, ETAPAS_ENVIO.length - 1));
    }, 900);

    try {
      const form = new FormData();
      form.set("tenantId", tenantId);
      form.set("password", passwordTrimmed);
      form.set("cedula", cedula);
      form.set("p12", p12File);
      const res = await fetch("/api/onboarding/completar-requisitos", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo completar la verificación.");

      if (etapaTimer.current) clearInterval(etapaTimer.current);
      setEtapa(ETAPAS_ENVIO.length - 1);
      setCompletado(true);
      setTimeout(() => router.push(`/panel/${tenantId}`), 1100);
    } catch (err) {
      if (etapaTimer.current) clearInterval(etapaTimer.current);
      setError(err instanceof Error ? err.message : "Error inesperado");
      setEnviando(false);
    }
  };

  if (cargando) {
    return <main style={{ padding: 60, textAlign: "center", fontFamily: sans, color: "var(--c-text-3)" }}>Cargando...</main>;
  }

  if (!tenantId || !tenant) {
    return (
      <main style={{ maxWidth: 480, margin: "80px auto", padding: "0 24px", fontFamily: sans, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--c-text-3)" }}>No encontramos tu empresa. Vuelve a empezar el registro.</p>
        <a href="/onboarding" style={{ color: "var(--c-brand)", fontWeight: 600, fontSize: 13 }}>← Volver al onboarding</a>
      </main>
    );
  }

  if (tenant.estado !== "demo") {
    return (
      <main style={{ maxWidth: 480, margin: "80px auto", padding: "0 24px", fontFamily: sans, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--c-text-3)" }}>
          Ya completaste este paso para {tenant.nombreNegocio}.
        </p>
        <a href={`/panel/${tenantId}`} style={{ color: "var(--c-brand)", fontWeight: 600, fontSize: 13 }}>← Volver a mi cuenta</a>
      </main>
    );
  }

  if (enviando || completado) {
    return (
      <main style={{ maxWidth: 420, margin: "100px auto", padding: "0 24px", fontFamily: sans, textAlign: "center" }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%", margin: "0 auto 20px",
          background: completado ? "#166534" : "var(--c-brand-bg)",
          color: completado ? "#fff" : "var(--c-brand)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
        }}>
          {completado ? "✓" : "⏳"}
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
          {completado ? "¡Verificación completa!" : "Verificando..."}
        </div>
        <div style={{ fontSize: 13, color: "var(--c-text-3)" }}>
          {completado ? "Redirigiendo a tu cuenta..." : ETAPAS_ENVIO[etapa]}
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 520, margin: "48px auto", padding: "0 24px", fontFamily: sans }}>
      <a href={`/onboarding/requisitos?t=${tenantId}`} style={{ fontSize: 13, color: "var(--c-text-3)", display: "inline-block", marginBottom: 20 }}>
        ← Atrás
      </a>

      <h1 style={{ fontFamily: serif, fontSize: "1.5rem", marginBottom: 8 }}>
        Verificación de credenciales
      </h1>
      <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 22 }}>
        Revisamos cada dato antes de avanzar a la certificación. Nada de esto se envía a la DGII
        todavía — solo lo verificamos y guardamos cifrado.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px", background: "var(--c-bg)", border: "1px solid var(--c-border)", borderRadius: 8, marginBottom: 24 }}>
        <ChecklistItem ok={cedulaLista}>Cédula validada y Activa ante la DGII</ChecklistItem>
        <ChecklistItem ok={p12Listo}>Certificado (.p12) seleccionado</ChecklistItem>
        <ChecklistItem ok={passwordLista}>Contraseña ingresada</ChecklistItem>
      </div>

      <div style={{ marginBottom: 22 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", marginBottom: 6 }}>
          Cédula del representante legal
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={cedula} onChange={(e) => { setCedula(e.target.value); setCedulaResultado(null); }}
            placeholder="00123456789" style={{ flex: 1, padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
          <button onClick={validarCedula} disabled={!cedula.trim() || validandoCedula} type="button" style={{
            padding: "10px 18px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: validandoCedula ? "not-allowed" : "pointer",
            background: "var(--c-surface)", border: "1px solid var(--c-border)",
          }}>
            {validandoCedula ? "Validando..." : "Validar"}
          </button>
        </div>
        {cedulaError && <div style={{ marginTop: 6, fontSize: 12, color: "#991b1b" }}>{cedulaError}</div>}
        {cedulaResultado?.valid && (
          <div style={{ marginTop: 6, fontSize: 12, color: cedulaResultado.activo ? "#166534" : "#991b1b" }}>
            {cedulaResultado.activo
              ? `✓ ${cedulaResultado.name} — Activa`
              : `${cedulaResultado.name} — no figura como Activa ante la DGII. Actualízala antes de continuar.`}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 22 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", marginBottom: 6 }}>
          Certificado de firma digital (.p12)
        </label>
        <input type="file" accept=".p12,.pfx" onChange={(e) => setP12File(e.target.files?.[0] ?? null)}
          style={{ width: "100%", padding: "9px 4px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", marginBottom: 6 }}>
          Contraseña del certificado
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type={mostrarPassword ? "text" : "password"}
            value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ flex: 1, padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, fontFamily: "var(--font-mono)" }}
          />
          <button type="button" onClick={() => setMostrarPassword((v) => !v)} style={{
            padding: "10px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
            background: "var(--c-surface)", border: "1px solid var(--c-border)", whiteSpace: "nowrap",
          }}>
            {mostrarPassword ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        {passwordTieneEspacios && (
          <div style={{ marginTop: 6, fontSize: 12, color: "#92400e" }}>
            ⚠ Tu contraseña tiene espacios al inicio o al final — es un error común al copiarla.
            Los vamos a quitar automáticamente, pero verifica que el resto esté exactamente igual a
            como te la entregaron.
          </div>
        )}
        <div style={{ marginTop: 6, fontSize: 11, color: "var(--c-text-4)" }}>
          Usa &quot;Mostrar&quot; para verificar que no haya errores de tipeo antes de continuar.
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 4, fontSize: 12, color: "#991b1b", marginTop: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <button onClick={enviar} disabled={!listoParaEnviar} style={{
        marginTop: 16, padding: "12px 24px", borderRadius: 6, fontWeight: 700, fontSize: 14,
        cursor: !listoParaEnviar ? "not-allowed" : "pointer",
        background: !listoParaEnviar ? "#9ca3af" : "var(--c-brand)", color: "#fff", border: "none",
      }}>
        Completar verificación y continuar →
      </button>
    </main>
  );
}

export default function CredencialesPage() {
  return (
    <Suspense fallback={<main style={{ padding: 60, textAlign: "center" }}>Cargando...</main>}>
      <CredencialesShell />
    </Suspense>
  );
}
