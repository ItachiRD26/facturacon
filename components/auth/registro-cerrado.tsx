"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/ui/logo";

const input: React.CSSProperties = {
  width: "100%", padding: "11px 12px", border: "1px solid var(--c-border)", borderRadius: "var(--radius-md)",
  fontSize: 14, fontFamily: "var(--font-sans)", background: "#fff", color: "var(--c-text-1)",
};

// Pantalla de /registro mientras las cuentas nuevas están cerradas.
export default function RegistroCerrado() {
  const [email, setEmail] = useState("");
  const [negocio, setNegocio] = useState("");
  const [web, setWeb] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando" | "listo">("idle");
  const [error, setError] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando"); setError("");
    try {
      const res = await fetch("/api/lista-espera", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, negocio, web }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error ?? "No se pudo guardar tu correo.");
      setEstado("listo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar tu correo.");
      setEstado("idle");
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: 400, fontFamily: "var(--font-sans)" }}>
      <Link href="/" style={{ display: "inline-flex", marginBottom: 28, textDecoration: "none" }}><Logo size={30} /></Link>
      <h1 style={{ fontSize: "1.7rem", fontWeight: 800, lineHeight: 1.15, marginBottom: 10 }}>
        Estamos afinando los últimos detalles
      </h1>
      <p style={{ fontSize: 14.5, color: "var(--c-text-2)", lineHeight: 1.6, marginBottom: 24 }}>
        Las cuentas nuevas abren muy pronto. Déjanos tu correo y te avisamos el día que puedas
        certificarte gratis y empezar a facturar.
      </p>

      {estado === "listo" ? (
        <div role="status" style={{ padding: "14px 16px", background: "var(--c-green-bg)", border: "1px solid var(--c-green-border)", borderRadius: "var(--radius-md)", color: "var(--c-green)", fontSize: 14, lineHeight: 1.55 }}>
          Listo, te avisamos a <strong>{email}</strong> en cuanto abramos.
        </div>
      ) : (
        <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Correo
            <input style={{ ...input, marginTop: 5 }} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Nombre de tu negocio (opcional)
            <input style={{ ...input, marginTop: 5 }} value={negocio} onChange={(e) => setNegocio(e.target.value)} />
          </label>
          {/* Campo trampa: invisible para personas. */}
          <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={web} onChange={(e) => setWeb(e.target.value)}
            style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />
          {error && <p role="alert" style={{ fontSize: 13, color: "var(--c-red)" }}>{error}</p>}
          <button type="submit" disabled={estado === "enviando"} style={{
            padding: "12px 16px", background: "var(--c-brand)", color: "#fff", border: "none",
            borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "var(--font-sans)",
          }}>
            {estado === "enviando" ? "Guardando…" : "Avísame cuando abra"}
          </button>
        </form>
      )}

      <p style={{ marginTop: 24, fontSize: 13, color: "var(--c-text-3)" }}>
        ¿Ya tienes cuenta? <Link href="/login" style={{ color: "var(--c-brand)", fontWeight: 600 }}>Inicia sesión</Link>
      </p>
    </div>
  );
}
