"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

// Asegura que el navegador esté conectado a Firebase con el MISMO usuario de la sesión del servidor antes de mostrar
// el sistema de la empresa. El inicio de sesión de Firebase se guarda por dirección (cada subdominio tiene el suyo),
// así que quien llega desde www.facturacon.com.do trae cookie válida pero no usuario de Firebase en este subdominio.
// Los cajeros que entran con código ya vienen conectados: para ellos no se hace ninguna llamada.
// `bloquear=false` (panel de www): no detiene la pantalla; solo alinea en segundo plano si el usuario guardado en el
// navegador no es el de la sesión (p. ej. alguien entró con un código de caja y dejó atrás al dueño).
export default function SesionFirebase({ uid, children, bloquear = true }: { uid: string; children: ReactNode; bloquear?: boolean }) {
  const { firebaseUser } = useAuth();
  const [fallo, setFallo] = useState(false);
  const [intento, setIntento] = useState(0);
  const enCurso = useRef(false);
  const listo = firebaseUser?.uid === uid;

  useEffect(() => {
    if (listo || enCurso.current) return;
    enCurso.current = true;
    (async () => {
      try {
        await auth.authStateReady();                        // espera a que Firebase restaure lo que ya tenía guardado
        if (auth.currentUser?.uid === uid) return;
        const res = await fetch("/api/auth/firebase-token", { method: "POST" });
        if (!res.ok) throw new Error(String(res.status));
        const { token } = await res.json();
        await signInWithCustomToken(auth, token);
      } catch (e) {
        console.error("[sesion-firebase]", e);
        setFallo(true);
      } finally { enCurso.current = false; }
    })();
  }, [listo, uid, intento]);

  if (listo || !bloquear) return <>{children}</>;
  if (fallo) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "var(--font-sans)" }}>
        <div style={{ maxWidth: 380, textAlign: "center" }}>
          <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No pudimos conectar tu sesión</p>
          <p style={{ fontSize: 14, color: "var(--c-text-3)", lineHeight: 1.55, marginBottom: 16 }}>Revisa tu conexión e inténtalo de nuevo. Si sigue igual, cierra sesión y vuelve a entrar.</p>
          <button onClick={() => { setFallo(false); setIntento((n) => n + 1); }} style={{ background: "var(--c-brand)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer" }}>Reintentar</button>
        </div>
      </div>
    );
  }
  return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--c-text-4)", fontSize: 14, fontFamily: "var(--font-sans)" }}>Conectando tu sesión…</div>;
}
