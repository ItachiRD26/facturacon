"use client";

import { useEffect, useState } from "react";

interface Fila { id: string; etiqueta: string; eCF: string | null; archivo: string | null }

// Paso 5 — las 11 representaciones impresas (PDF), una por categoría de tipo, ya armadas desde
// los e-CF que la DGII aceptó en el Paso 4. El usuario solo las descarga y las sube al portal.
export default function RepresentacionesImpresas({ tenantId }: { tenantId: string }) {
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [error, setError] = useState("");
  const [subidos, setSubidos] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(`cert-ri-subidas-${tenantId}`) ?? "{}"); } catch { return {}; }
  });

  useEffect(() => {
    let vivo = true;
    fetch(`/api/certificacion/representacion?t=${tenantId}`)
      .then((r) => r.json())
      .then((d) => { if (!vivo) return; if (d.error) setError(d.error); else setFilas(d.categorias); })
      .catch(() => { if (vivo) setError("No se pudo cargar la lista de representaciones."); });
    return () => { vivo = false; };
  }, [tenantId]);

  function marcar(id: string, v: boolean) {
    setSubidos((prev) => {
      const sig = { ...prev, [id]: v };
      try { localStorage.setItem(`cert-ri-subidas-${tenantId}`, JSON.stringify(sig)); } catch { /* sin almacenamiento */ }
      return sig;
    });
  }

  const url = (id: string) => `/api/certificacion/representacion?t=${tenantId}&cat=${id}`;

  // Descarga seguida de todas (el navegador puede pedir permiso para bajar varios archivos).
  async function descargarTodos() {
    for (const f of filas ?? []) {
      if (!f.eCF) continue;
      const a = document.createElement("a");
      a.href = url(f.id); a.download = f.archivo ?? "";
      document.body.appendChild(a); a.click(); a.remove();
      await new Promise((r) => setTimeout(r, 700));
    }
  }

  if (error) return <div style={{ fontSize: 12, color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 10 }}>{error}</div>;
  if (!filas) return <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>Preparando tus PDF…</div>;

  const listos = filas.filter((f) => f.eCF).length;
  const marcados = filas.filter((f) => subidos[f.id]).length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
        <strong style={{ fontSize: 13 }}>{listos} de {filas.length} PDF listos · {marcados} marcados como subidos</strong>
        <button
          onClick={descargarTodos} disabled={listos === 0}
          style={{ fontSize: 13, fontWeight: 700, padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--c-brand)", color: "#fff", cursor: listos === 0 ? "not-allowed" : "pointer", opacity: listos === 0 ? 0.5 : 1 }}
        >
          ⬇ Descargar los {listos}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filas.map((f, i) => (
          <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", background: "var(--c-surface, #fff)", border: "1px solid var(--c-border)", borderRadius: 8, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{i + 1}. {f.etiqueta}</div>
              <div style={{ fontSize: 11, color: f.eCF ? "var(--c-text-3)" : "#991b1b" }}>
                {f.eCF ? `Archivo: ${f.archivo} (del e-CF ${f.eCF})` : "Falta: todavía no hay un comprobante de este tipo aceptado en el Paso 4."}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
              {f.eCF && <a href={url(f.id)} style={{ fontSize: 13, color: "var(--c-brand)", fontWeight: 700 }}>⬇ Descargar PDF</a>}
              <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={!!subidos[f.id]} onChange={(e) => marcar(f.id, e.target.checked)} />
                Ya lo subí
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
