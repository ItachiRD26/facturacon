"use client";

import { useEffect } from "react";

// Pantalla de error en español para cualquier página que falle (antes salía el mensaje en inglés de Next).
// Muestra el código (digest) para poder encontrar el fallo exacto en los registros del servidor.
export default function ErrorGeneral({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--c-bg)", color: "var(--c-text-1)", fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
      <div role="alert" style={{ maxWidth: 440, textAlign: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>No pudimos cargar esta página</h1>
        <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--c-text-2)", margin: "0 0 18px" }}>
          Fue un fallo momentáneo de nuestro lado. Vuelve a intentarlo; si sigue igual, escríbenos y dinos el código de abajo.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={reset} style={{ minHeight: 44, padding: "0 20px", border: 0, borderRadius: 10, background: "var(--c-brand)", color: "#fff", font: "700 15px var(--font-sans), system-ui, sans-serif", cursor: "pointer" }}>Reintentar</button>
          <button type="button" onClick={() => window.history.back()} style={{ minHeight: 44, padding: "0 20px", border: "1px solid var(--c-border)", borderRadius: 10, background: "var(--c-surface)", color: "var(--c-text-1)", font: "600 15px var(--font-sans), system-ui, sans-serif", cursor: "pointer" }}>Volver</button>
        </div>
        {error.digest && <p style={{ marginTop: 16, fontSize: 12, color: "var(--c-text-4)" }}>Código: {error.digest}</p>}
      </div>
    </main>
  );
}
