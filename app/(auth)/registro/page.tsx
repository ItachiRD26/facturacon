"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

const sans  = "var(--font-sans)";
const mono  = "var(--font-mono)";
const serif = "var(--font-serif)";

async function crearSesionYRedirigir(idToken: string, router: ReturnType<typeof useRouter>) {
  const res = await fetch("/api/auth/session", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Error al crear sesión");
  }
  router.push("/onboarding");
  router.refresh();
}

export default function RegistroPage() {
  const router   = useRouter();
  const [email,   setEmail]   = useState("");
  const [pass,    setPass]    = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, pass);
      const idToken    = await credential.user.getIdToken();
      await crearSesionYRedirigir(idToken, router);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("email-already-in-use")) {
        setError("Ya existe una cuenta con ese correo. Inicia sesión en su lugar.");
      } else if (msg.includes("weak-password")) {
        setError("La contraseña debe tener al menos 6 caracteres.");
      } else if (msg.includes("invalid-email")) {
        setError("Correo inválido.");
      } else {
        setError(msg || "Error al registrarte. Intenta de nuevo.");
      }
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError(""); setLoading(true);
    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken    = await credential.user.getIdToken();
      await crearSesionYRedirigir(idToken, router);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al registrarte con Google.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6,
      padding: "40px 36px", width: "100%", maxWidth: 380,
      boxShadow: "0 4px 24px rgba(0,0,0,0.07)", fontFamily: sans,
    }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: "#111", lineHeight: 1.2 }}>
          Facturacon
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, fontFamily: mono }}>
          Crea tu cuenta
        </div>
      </div>

      <button onClick={handleGoogle} disabled={loading} type="button" style={{
        width: "100%", padding: "10px", marginBottom: 16, background: "#fff",
        border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, fontWeight: 600,
        color: "#111", cursor: loading ? "not-allowed" : "pointer", fontFamily: sans,
      }}>
        Continuar con Google
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0", fontSize: 11, color: "#9ca3af" }}>
        <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
        o con correo
        <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
            Correo electrónico
          </label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@ejemplo.com"
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, color: "#111", outline: "none", fontFamily: sans, background: "#fff" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
            Contraseña
          </label>
          <input type="password" required minLength={6} value={pass} onChange={(e) => setPass(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, color: "#111", outline: "none", fontFamily: sans, background: "#fff" }} />
        </div>

        {error && (
          <div style={{ padding: "9px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 4, fontSize: 12, color: "#991b1b" }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}
          style={{ padding: "11px", background: loading ? "#9ca3af" : "#0e7490", color: "#fff", border: "none", borderRadius: 4, cursor: loading ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, fontFamily: sans }}>
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#6b7280" }}>
        ¿Ya tienes cuenta? <a href="/login" style={{ color: "#0e7490", fontWeight: 600 }}>Inicia sesión</a>
      </div>
    </div>
  );
}
