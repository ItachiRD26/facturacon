"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Logo from "@/components/ui/logo";

const sans = "var(--font-sans)";
const mono = "var(--font-mono)";
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

export default function EmpleadoLoginPage() {
  const params = useParams();
  const token = String(params.token ?? "");

  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // El navegador guarda UNA sola sesión: si ya hay una abierta (p. ej. la del dueño), entrar con este código la cierra.
  const [sesionPrevia, setSesionPrevia] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/auth/sesion-actual").then((r) => r.json()).then((d) => { if (d?.activa) setSesionPrevia(d.nombre); }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/empleado/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Código inválido");

      const credential = await signInWithCustomToken(auth, data.customToken);
      const idToken = await credential.user.getIdToken();
      const sessionRes = await fetch("/api/auth/session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!sessionRes.ok) throw new Error("No se pudo iniciar sesión. Intenta de nuevo.");
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--c-bg)", fontFamily: sans, padding: 24,
    }}>
      <form onSubmit={handleSubmit} style={{
        background: "#fff", border: "1px solid var(--c-border)", borderRadius: 10,
        padding: "40px 36px", width: "100%", maxWidth: 360, boxShadow: "0 4px 24px rgba(0,0,0,0.05)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <Logo size={28} />
          </div>
          <div style={{ fontSize: 11, color: "var(--c-text-4)", fontFamily: mono }}>Acceso de empleado</div>
        </div>

        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
          Código de acceso
        </label>
        <input
          value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} required autoFocus
          placeholder="XXXX-XXXX-XXXX"
          style={{
            width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 6,
            fontSize: 15, textAlign: "center", letterSpacing: "0.08em", fontFamily: mono, outline: "none",
          }}
        />

        {sesionPrevia && (
          <div role="status" style={{ marginTop: 12, padding: "10px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
            Ya hay una sesión abierta en este navegador (<b>{sesionPrevia}</b>). Al entrar con este código esa sesión se cierra para dar paso a la tuya.
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, padding: "9px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12, color: "#991b1b" }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading || !codigo.trim()} style={{
          marginTop: 16, width: "100%", padding: "12px",
          background: (loading || !codigo.trim()) ? "#9ca3af" : "var(--c-brand)",
          color: "#fff", border: "none", borderRadius: 6,
          cursor: (loading || !codigo.trim()) ? "not-allowed" : "pointer",
          fontSize: 14, fontWeight: 700, fontFamily: sans,
        }}>
          {loading ? "Verificando..." : "Entrar"}
        </button>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#9ca3af" }}>
          ¿Eres el dueño o administrador?{" "}
          <a href={`https://${ROOT_DOMAIN}/login`} style={{ color: "var(--c-brand)", fontWeight: 600 }}>
            Inicia sesión aquí
          </a>
        </div>
      </form>
    </main>
  );
}
