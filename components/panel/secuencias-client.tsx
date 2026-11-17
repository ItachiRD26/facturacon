"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/modals/modal";
import { Button, Card, PageHeader, Pill, th, td, tablaWrap } from "@/components/ui/kit";
import { TIPOS_ECF } from "@/types";
import type { TipoECF } from "@/types";

interface Rango { desde: number; hasta: number; vencimiento: string; ultimo: number }
type Secuencias = Partial<Record<TipoECF, Rango>>;

const input: React.CSSProperties = {
  width: "100%", padding: "9px 10px", border: "1px solid var(--c-border)", borderRadius: "var(--radius-md)",
  fontSize: 13, fontFamily: "var(--font-sans)", background: "var(--c-surface)",
};

const hoy = () => new Date().toISOString().slice(0, 10);

export default function SecuenciasClient({ tenantId, embebido = false }: { tenantId: string; embebido?: boolean }) {
  const [sec, setSec] = useState<Secuencias | null>(null);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState<TipoECF | null>(null);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [venc, setVenc] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");

  useEffect(() => {
    let vivo = true;
    fetch(`/api/tenant/secuencias?t=${tenantId}`)
      .then((r) => r.json())
      .then((d) => { if (vivo) { if (d.secuencias) setSec(d.secuencias); else setError(d.error ?? "No se pudieron cargar las secuencias."); } })
      .catch(() => { if (vivo) setError("No se pudieron cargar las secuencias."); });
    return () => { vivo = false; };
  }, [tenantId]);

  function abrir(tipo: TipoECF) {
    const r = sec?.[tipo];
    setEditando(tipo); setErrorForm("");
    setDesde(r ? String(r.desde) : "1"); setHasta(r ? String(r.hasta) : ""); setVenc(r?.vencimiento ?? "");
  }

  async function guardar() {
    if (!editando) return;
    setGuardando(true); setErrorForm("");
    try {
      const res = await fetch("/api/tenant/secuencias", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, tipo: editando, desde: Number(desde), hasta: Number(hasta), vencimiento: venc }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSec(d.secuencias);
      setEditando(null);
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      {!embebido && (
        <>
      <PageHeader
        titulo="Secuencias fiscales"
        descripcion="Los números de comprobante (e-NCF) que la DGII te autorizó. Facturacon los asigna uno por uno, en orden, y te avisa cuando se acaban o vencen."
      />

      <Card style={{ marginBottom: 20, background: "var(--c-brand-bg)", borderColor: "var(--c-brand-border)" }}>
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          <strong>¿De dónde salen estos números?</strong> Después de certificarte, en la Oficina Virtual de la DGII
          solicitas la <em>autorización de secuencias</em> para cada tipo de comprobante que vas a usar. La DGII te
          responde con un rango (por ejemplo del 1 al 1,000) y una fecha de vencimiento. Escríbelos aquí tal cual.
          Solo registra los tipos que vas a emitir.
        </div>
      </Card>

        </>
      )}

      {error && <p style={{ fontSize: 13, color: "var(--c-red)", marginBottom: 12 }}>{error}</p>}

      <div style={tablaWrap}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Tipo</th><th style={th}>Rango autorizado</th><th style={th}>Usados</th>
              <th style={th}>Disponibles</th><th style={th}>Vence</th><th style={th}>Estado</th><th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {TIPOS_ECF.map((t) => {
              const r = sec?.[t.codigo];
              const usados = r ? r.ultimo - r.desde + 1 : 0;
              const disp = r ? r.hasta - r.ultimo : 0;
              const vencida = !!r && r.vencimiento < hoy();
              const poco = !!r && disp > 0 && disp <= Math.max(10, Math.round((r.hasta - r.desde + 1) * 0.1));
              return (
                <tr key={t.codigo}>
                  <td style={{ ...td, fontWeight: 600 }}>{t.label}</td>
                  <td style={td} className="num">{r ? `${r.desde.toLocaleString("es-DO")} – ${r.hasta.toLocaleString("es-DO")}` : "—"}</td>
                  <td style={td} className="num">{r ? usados.toLocaleString("es-DO") : "—"}</td>
                  <td style={td} className="num">{r ? disp.toLocaleString("es-DO") : "—"}</td>
                  <td style={td}>{r ? r.vencimiento : "—"}</td>
                  <td style={td}>
                    {!r ? <Pill tono="neutral">Sin registrar</Pill>
                      : vencida ? <Pill tono="danger">Vencida</Pill>
                      : disp === 0 ? <Pill tono="danger">Agotada</Pill>
                      : poco ? <Pill tono="warning">Quedan pocos</Pill>
                      : <Pill tono="success">Lista</Pill>}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <Button tamano="sm" variante={r ? "secondary" : "primary"} onClick={() => abrir(t.codigo)}>{r ? "Editar" : "Registrar"}</Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={!!editando} onClose={() => setEditando(null)} title={`Secuencia ${editando ?? ""}`} maxWidth={460}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", lineHeight: 1.5 }}>
            Copia los datos de la autorización que te dio la DGII. Si es una ampliación del mismo rango, deja el
            inicial igual y sube el final. Un rango nuevo debe empezar después del último número que ya usaste.
          </p>
          <label style={{ fontSize: 12 }}>Número inicial
            <input style={input} inputMode="numeric" value={desde} onChange={(e) => setDesde(e.target.value.replace(/\D/g, ""))} />
          </label>
          <label style={{ fontSize: 12 }}>Número final
            <input style={input} inputMode="numeric" value={hasta} onChange={(e) => setHasta(e.target.value.replace(/\D/g, ""))} />
          </label>
          <label style={{ fontSize: 12 }}>Fecha de vencimiento
            <input style={input} type="date" value={venc} onChange={(e) => setVenc(e.target.value)} />
          </label>
          {errorForm && <p style={{ fontSize: 12, color: "var(--c-red)" }}>{errorForm}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variante="secondary" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={guardar} disabled={guardando || !desde || !hasta || !venc}>{guardando ? "Guardando…" : "Guardar"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
