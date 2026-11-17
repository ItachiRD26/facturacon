"use client";

import { useEffect, useRef, useState } from "react";
import { useTenant } from "@/contexts/TenantContext";

interface Resumen { pendientes: number; horasMasAntiguo: number; vencidos72h: number }

const CADA_MS = 2 * 60 * 1000;   // revisa y reintenta cada 2 minutos mientras el sistema está abierto
const LIMITE_HORAS = 72;

// Contingencia: cuando la DGII no recibe un comprobante, el sistema igual lo emite (con su número, su QR y su
// representación impresa) y lo deja pendiente. Aquí se ve cuántos hay y se reenvían solos en cuanto hay
// conexión con la DGII. El cajero nunca deja de facturar.
export default function AvisoPendientesDGII() {
  const { tenantId, puedeEmitir } = useTenant();
  const [res, setRes] = useState<Resumen | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [nota, setNota] = useState("");
  const enCurso = useRef(false);

  const ciclo = useRef<(forzar?: boolean) => void>(() => {});

  useEffect(() => {
    if (!puedeEmitir) return;
    let vivo = true;
    const correr = (forzar = false) => {
      if (enCurso.current) return;
      enCurso.current = true;
      fetch(`/api/facturas/sincronizar?t=${tenantId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then(async (r: Resumen | null) => {
          if (!vivo || !r) return;
          setRes(r);
          if (r.pendientes === 0 || !navigator.onLine) return;
          setTrabajando(true);
          const p = await fetch("/api/facturas/sincronizar", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId }),
          }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
          if (!vivo) return;
          if (p?.resumen) setRes(p.resumen);
          if (forzar) {
            setNota(p?.reenvio?.dgiiNoResponde
              ? "La DGII todavía no responde. Seguimos intentando solos."
              : p?.reenvio ? `Se enviaron ${p.reenvio.enviados} comprobante${p.reenvio.enviados === 1 ? "" : "s"} a la DGII.` : "No se pudo conectar. Seguimos intentando solos.");
          }
        })
        .catch(() => undefined)
        .finally(() => { enCurso.current = false; if (vivo) setTrabajando(false); });
    };
    ciclo.current = correr;
    correr();
    const t = setInterval(() => correr(), CADA_MS);
    const alVolver = () => correr();
    window.addEventListener("online", alVolver);
    return () => { vivo = false; clearInterval(t); window.removeEventListener("online", alVolver); };
  }, [tenantId, puedeEmitir]);

  if (!res || res.pendientes === 0) return null;

  const critico = res.horasMasAntiguo >= LIMITE_HORAS;
  const alerta = !critico && res.horasMasAntiguo >= 48;
  const color = critico ? "var(--c-red)" : alerta ? "var(--c-yellow)" : "var(--c-blue)";
  const fondo = critico ? "var(--c-red-bg)" : alerta ? "var(--c-yellow-bg)" : "var(--c-blue-bg)";
  const n = res.pendientes;

  return (
    <div role="status" style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
      padding: "10px 16px", background: fondo, color, borderBottom: `1px solid ${color}`, fontSize: 13, lineHeight: 1.45,
    }}>
      <div>
        <strong>
          {n} comprobante{n === 1 ? "" : "s"} emitido{n === 1 ? "" : "s"} esperando a la DGII
        </strong>
        {" — "}
        {critico
          ? `el más antiguo lleva ${res.horasMasAntiguo} horas y el plazo de la DGII es de ${LIMITE_HORAS}. Reenvíalos ahora.`
          : "ya tienen su número y su QR, puedes seguir facturando. Se envían solos en cuanto la DGII responda."}
        {alerta && ` El más antiguo lleva ${res.horasMasAntiguo} horas (el plazo es de ${LIMITE_HORAS}).`}
        {nota && <span style={{ marginLeft: 8, opacity: 0.85 }}>{nota}</span>}
      </div>
      <button
        type="button" onClick={() => ciclo.current(true)} disabled={trabajando}
        style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${color}`, background: "transparent", color, fontWeight: 700, fontSize: 12, cursor: trabajando ? "wait" : "pointer" }}
      >
        {trabajando ? "Enviando…" : "Reenviar ahora"}
      </button>
    </div>
  );
}
