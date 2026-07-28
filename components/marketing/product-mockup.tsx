// Ilustración del producto en CSS puro (no es una captura real) — honesta
// representación de cómo se ve el sandbox, mientras no tengamos capturas
// reales del sistema para mostrar en el landing.
const KPIS = [
  { label: "Facturado", color: "#0e7490" },
  { label: "Por cobrar", color: "#92400e" },
  { label: "Clientes", color: "#1d4ed8" },
];

const FILAS = [
  { w: "78%" }, { w: "62%" }, { w: "85%" }, { w: "54%" },
];

export default function ProductMockup() {
  return (
    <section style={{ padding: "0 24px 56px", maxWidth: 920, margin: "0 auto" }}>
      <div style={{
        borderRadius: 14, overflow: "hidden", border: "1px solid var(--c-border)",
        boxShadow: "0 24px 60px rgba(17,20,57,0.12)", background: "var(--c-surface)",
      }}>
        {/* Barra de navegador */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", background: "#f1f1f3", borderBottom: "1px solid var(--c-border)" }}>
          {["#f87171", "#fbbf24", "#34d399"].map((c) => (
            <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
          ))}
          <div style={{
            marginLeft: 10, fontSize: 11, color: "var(--c-text-4)", fontFamily: "var(--font-mono)",
            background: "#fff", border: "1px solid var(--c-border)", borderRadius: 4, padding: "2px 10px",
          }}>
            tuempresa.facturacon.com.do
          </div>
        </div>

        {/* Cuerpo: sidebar + contenido */}
        <div style={{ display: "flex", minHeight: 280 }}>
          <div style={{ width: 130, background: "#fafafa", borderRight: "1px solid var(--c-border)", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ height: 8, width: "70%", borderRadius: 3, background: "var(--c-navy)" }} />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ height: 7, width: i === 1 ? "85%" : "60%", borderRadius: 3, background: i === 1 ? "var(--c-brand)" : "#e5e7eb" }} />
            ))}
          </div>

          <div style={{ flex: 1, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 10 }}>
              {KPIS.map((k) => (
                <div key={k.label} style={{ flex: 1, border: "1px solid var(--c-border)", borderTop: `3px solid ${k.color}`, borderRadius: 6, padding: "10px 12px" }}>
                  <div style={{ fontSize: 9, color: "var(--c-text-4)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{k.label}</div>
                  <div style={{ height: 10, width: "55%", borderRadius: 3, background: "#e5e7eb" }} />
                </div>
              ))}
            </div>

            <div style={{ border: "1px solid var(--c-border)", borderRadius: 6, padding: "10px 12px", flex: 1 }}>
              <div style={{ height: 8, width: "30%", borderRadius: 3, background: "#d1d5db", marginBottom: 12 }} />
              {FILAS.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderTop: i > 0 ? "1px solid var(--c-border-lt)" : "none" }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: "var(--c-brand-border)" }} />
                  <div style={{ height: 6, width: f.w, borderRadius: 3, background: "#eef0f2" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p style={{ textAlign: "center", fontSize: 11, color: "var(--c-text-4)", marginTop: 10 }}>
        Vista simplificada del sistema — pruébalo completo y gratis desde tu cuenta.
      </p>
    </section>
  );
}
