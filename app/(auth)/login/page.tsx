"use client";

import { Suspense, useEffect, useState } from "react";
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/ui/logo";
import GoogleIcon from "@/components/ui/google-icon";

const sans  = "var(--font-sans)";
const mono  = "var(--font-mono)";

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
  const emailDesdeQuery = searchParams.get("email") ?? "";
  const [email,   setEmail]   = useState(emailDesdeQuery);
  const [pass,    setPass]    = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // Si llegamos desde /registro porque el correo ya tenía cuenta, el campo
  // viene precargado — solo falta la contraseña.
  useEffect(() => { if (emailDesdeQuery) setEmail(emailDesdeQuery); }, [emailDesdeQuery]);

  const crearSesionYRedirigir = async (idToken: string, nombre?: string) => {
    const res = await fetch("/api/auth/session", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ idToken, nombre }),
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
      await crearSesionYRedirigir(idToken, credential.user.displayName ?? credential.user.email ?? undefined);
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
      background: "#fff", border: "1px solid var(--c-border)", borderRadius: 10,
      padding: "40px 36px", width: "100%", maxWidth: 380,
      boxShadow: "0 4px 24px rgba(0,0,0,0.05)", fontFamily: sans,
    }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Logo size={30} />
        </div>
        <div style={{ fontSize: 11, color: "var(--c-text-4)", marginTop: 8, fontFamily: mono }}>
          Facturación Electrónica como Servicio
        </div>
      </div>

      {emailDesdeQuery && (
        <div style={{ padding: "9px 12px", marginBottom: 16, background: "var(--c-brand-bg)", border: "1px solid var(--c-brand-border)", borderRadius: 6, fontSize: 12, color: "var(--c-text-2)" }}>
          Ya tenías una cuenta con este correo — solo inicia sesión.
        </div>
      )}

      <button onClick={handleGoogle} disabled={loading} type="button" style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        width: "100%", padding: "10px", marginBottom: 16, background: "#fff",
        border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, fontWeight: 600,
        color: "#111", cursor: loading ? "not-allowed" : "pointer", fontFamily: sans,
      }}>
        <GoogleIcon />
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
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, color: "#111", outline: "none", fontFamily: sans, background: "#fff" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
            Contraseña
          </label>
          <input type="password" required value={pass} onChange={(e) => setPass(e.target.value)}
            placeholder="••••••••" autoFocus={!!emailDesdeQuery}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, color: "#111", outline: "none", fontFamily: sans, background: "#fff" }} />
        </div>

        {error && (
          <div style={{ padding: "9px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12, color: "#991b1b" }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}
          style={{ padding: "11px", background: loading ? "#9ca3af" : "var(--c-brand)", color: "#fff", border: "none", borderRadius: 6, cursor: loading ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, fontFamily: sans, transition: "background 0.15s" }}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#6b7280" }}>
        ¿No tienes cuenta? <a href="/registro" style={{ color: "var(--c-brand)", fontWeight: 600 }}>Regístrate</a>
      </div>
    </div>
  );
}
