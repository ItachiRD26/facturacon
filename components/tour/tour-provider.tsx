"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TourStep } from "./sandbox-tour-steps";

interface TourCtxValue { restart: () => void }
const TourCtx = createContext<TourCtxValue>({ restart: () => {} });
export const useTour = () => useContext(TourCtx);

const sans = "var(--font-sans)";
const serif = "var(--font-serif)";

export default function TourProvider({
  tenantId, steps, children,
}: { tenantId: string; steps: TourStep[]; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const storageKey = `facturacon_tour_${tenantId}`;

  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    if (!window.localStorage.getItem(storageKey)) setActive(true);
  }, [storageKey]);

  const step = steps[index];

  // Navega a la ruta del paso si todavia no estamos ahi.
  useEffect(() => {
    if (!active || !step) return;
    if (!pathname.startsWith(step.route)) {
      router.push(`${step.route}?t=${searchParams.get("t") ?? tenantId}`);
    }
  }, [active, step, pathname, router, searchParams, tenantId]);

  // Ubica el elemento objetivo (puede tardar un tick tras la navegacion).
  useEffect(() => {
    if (!active || !step) { setRect(null); return; }
    let cancelado = false;
    let intentos = 0;
    let raf = 0;
    function localizar() {
      if (cancelado) return;
      const el = document.querySelector(`[data-tour="${step.id}"]`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setRect(el.getBoundingClientRect());
      } else if (intentos < 90) {
        intentos++;
        raf = requestAnimationFrame(localizar);
      }
    }
    localizar();
    return () => { cancelado = true; cancelAnimationFrame(raf); };
  }, [active, step]);

  useEffect(() => {
    if (!active || !step) return;
    const reposicionar = () => {
      const el = document.querySelector(`[data-tour="${step.id}"]`);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("scroll", reposicionar, true);
    window.addEventListener("resize", reposicionar);
    return () => {
      window.removeEventListener("scroll", reposicionar, true);
      window.removeEventListener("resize", reposicionar);
    };
  }, [active, step]);

  const finalizar = useCallback(() => {
    window.localStorage.setItem(storageKey, "done");
    setActive(false);
  }, [storageKey]);

  const omitir = useCallback(() => {
    window.localStorage.setItem(storageKey, "omitido");
    setActive(false);
  }, [storageKey]);

  const restart = useCallback(() => {
    window.localStorage.removeItem(storageKey);
    setIndex(0);
    setRect(null);
    setActive(true);
  }, [storageKey]);

  const siguiente = () => {
    if (index >= steps.length - 1) { finalizar(); return; }
    setRect(null);
    setIndex((i) => i + 1);
  };
  const atras = () => {
    if (index === 0) return;
    setRect(null);
    setIndex((i) => i - 1);
  };

  return (
    <TourCtx.Provider value={{ restart }}>
      {children}
      {ready && active && step && (
        <TourBubble
          step={step} rect={rect} indice={index} total={steps.length}
          onSiguiente={siguiente} onAtras={atras} onOmitir={omitir}
        />
      )}
    </TourCtx.Provider>
  );
}

function TourBubble({
  step, rect, indice, total, onSiguiente, onAtras, onOmitir,
}: {
  step: TourStep; rect: DOMRect | null; indice: number; total: number;
  onSiguiente: () => void; onAtras: () => void; onOmitir: () => void;
}) {
  const ancho = 300;
  let top = rect ? rect.bottom + 12 : window.innerHeight / 2 - 80;
  let left = rect ? rect.left : window.innerWidth / 2 - ancho / 2;

  if (rect) {
    if (step.placement === "right") { top = rect.top; left = rect.right + 14; }
    else if (step.placement === "top") { top = rect.top - 12; left = rect.left; }
    else { top = rect.bottom + 12; left = rect.left; }
    left = Math.min(Math.max(left, 12), window.innerWidth - ancho - 12);
    top = Math.min(Math.max(top, 12), window.innerHeight - 220);
  }

  return (
    <>
      {rect && (
        <div style={{
          position: "fixed", zIndex: 9998, pointerEvents: "none",
          top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8,
          border: "2px solid var(--c-brand)", borderRadius: 6,
          boxShadow: "0 0 0 4000px rgba(15,23,42,0.45)",
          transition: "all 0.2s ease",
        }} />
      )}
      <div style={{
        position: "fixed", zIndex: 9999, top, left, width: ancho,
        background: "#fff", borderRadius: 8, boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
        padding: 18, fontFamily: sans, transition: "top 0.2s ease, left 0.2s ease",
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
          Paso {indice + 1} de {total}
        </div>
        <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 6 }}>{step.title}</div>
        <p style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.5, marginBottom: 14 }}>{step.body}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={onOmitir} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 12, cursor: "pointer", fontFamily: sans }}>
            Omitir tutorial
          </button>
          <div style={{ display: "flex", gap: 6 }}>
            {indice > 0 && (
              <button onClick={onAtras} style={{ padding: "6px 12px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: sans, color: "#374151" }}>
                Atrás
              </button>
            )}
            <button onClick={onSiguiente} style={{ padding: "6px 14px", background: "var(--c-brand)", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: sans }}>
              {indice >= total - 1 ? "Finalizar" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
