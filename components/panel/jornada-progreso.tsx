// Barra de progreso de la jornada del cliente (5 etapas). Presentacional y
// sin estado: se calcula afuera con lib/tenant/jornada.ts. `compacta` la
// reduce a una línea para ponerla arriba de las pantallas de onboarding.
import { etapasConActual, type EtapaId, type EstadoEtapa, type Etapa } from "@/lib/tenant/jornada";

type EtapaVista = Etapa & { estado: EstadoEtapa };

export default function JornadaProgreso({
  actual, etapas, compacta = false, completa = false,
}: {
  actual?: EtapaId; etapas?: EtapaVista[]; compacta?: boolean; completa?: boolean;
}) {
  const lista = etapas ?? etapasConActual(actual ?? "empresa", completa);
  const idxActual = Math.max(0, lista.findIndex((e) => e.estado === "actual"));

  return (
    <nav aria-label="Tu avance" style={{ fontFamily: "var(--font-sans)" }}>
      {compacta && (
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text-3)", marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Paso {idxActual + 1} de {lista.length} · {lista[idxActual]?.titulo}
        </div>
      )}
      <ol style={{ display: "flex", alignItems: "flex-start", listStyle: "none", gap: 0 }}>
        {lista.map((e, i) => {
          const hecha = e.estado === "hecha";
          const activa = e.estado === "actual";
          return (
            <li key={e.id} aria-current={activa ? "step" : undefined}
              style={{ display: "flex", alignItems: "flex-start", flex: i < lista.length - 1 ? 1 : "0 0 auto", minWidth: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, flexShrink: 0, width: compacta ? 28 : 84 }}>
                <span style={{
                  width: compacta ? 24 : 30, height: compacta ? 24 : 30, borderRadius: "50%",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                  background: hecha ? "var(--c-green)" : activa ? "var(--c-brand)" : "var(--c-surface)",
                  color: hecha || activa ? "#fff" : "var(--c-text-4)",
                  border: hecha || activa ? "none" : "1.5px solid var(--c-border)",
                  boxShadow: activa ? "0 0 0 4px var(--c-brand-bg)" : "none",
                }}>
                  {hecha ? "✓" : i + 1}
                </span>
                {!compacta && (
                  <span style={{
                    fontSize: 11.5, textAlign: "center", lineHeight: 1.25,
                    fontWeight: activa ? 700 : 500,
                    color: activa ? "var(--c-text-1)" : hecha ? "var(--c-text-2)" : "var(--c-text-4)",
                  }}>
                    {e.titulo}
                  </span>
                )}
              </div>
              {i < lista.length - 1 && (
                <span aria-hidden style={{
                  flex: 1, height: 2, margin: compacta ? "11px 4px 0" : "14px 2px 0", borderRadius: 2,
                  background: hecha ? "var(--c-green)" : "var(--c-border)",
                }} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
