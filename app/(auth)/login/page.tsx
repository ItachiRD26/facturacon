"use client";

import { Suspense, useState } from "react";
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";

const sans  = "var(--font-sans)";
const mono  = "var(--font-mono)";
const serif = "var(--font-serif)";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [email,   setEmail]   = useState("");
  const [pass,    setPass]    = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const crearSesionYRedirigir = async (idToken: string) => {
    const res = await fetch("/api/auth/session", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ idToken }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Error al crear sesión");
    }
    router.push(searchParams.get("redirect") || "/panel");
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, pass);
      const idToken    = await credential.user.getIdToken();
      await crearSesionYRedirigir(idToken);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("invalid-credential") || msg.includes("wrong-password") || msg.includes("INVALID_LOGIN_CREDENTIALS")) {
        setError("Credenciales incorrectas. Verifica tu email y contraseña.");
      } else if (msg.includes("too-many-requests")) {
        setError("Demasiados intentos. Espera unos minutos.");
      } else {
        setError(msg || "Error al ingresar. Intenta de nuevo.");
      }
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError(""); setLoading(true);
    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken    = await credential.user.getIdToken();
      await crearSesionYRedirigir(idToken);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("popup-closed-by-user")) {
        setError("");
      } else {
        setError(msg || "Error al ingresar con Google.");
      }
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
          Facturación Electrónica como Servicio
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
          <input type="password" required value={pass} onChange={(e) => setPass(e.target.value)}
            placeholder="••••••••"
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, color: "#111", outline: "none", fontFamily: sans, background: "#fff" }} />
        </div>

        {error && (
          <div style={{ padding: "9px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 4, fontSize: 12, color: "#991b1b" }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}
          style={{ padding: "11px", background: loading ? "#9ca3af" : "#0e7490", color: "#fff", border: "none", borderRadius: 4, cursor: loading ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, fontFamily: sans, transition: "background 0.15s" }}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#6b7280" }}>
        ¿No tienes cuenta? <a href="/registro" style={{ color: "#0e7490", fontWeight: 600 }}>Regístrate</a>
      </div>
    </div>
  );
}
