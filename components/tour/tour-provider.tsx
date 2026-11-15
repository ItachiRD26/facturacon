"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
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

  // Al cambiar de rol el recorrido cambia: el paso actual no puede quedar fuera de la lista.
  useEffect(() => { setIndex((i) => Math.min(i, Math.max(0, steps.length - 1))); }, [steps]);

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

// Coloca el globo dentro de la pantalla usando su ALTO REAL (los textos son de distinto largo): antes
// se suponía un alto fijo y, con un texto largo, los botones quedaban fuera de la pantalla y no se
// podían pulsar. Se prueba el lado preferido y los demás; si ninguno cabe entero, va abajo y centrado.
function colocar(
  rect: DOMRect | null, ancho: number, alto: number, pref: TourStep["placement"],
): { top: number; left: number } {
  const vw = window.innerWidth, vh = window.innerHeight, m = 12, sep = 14;
  const dentro = (top: number, left: number) => top >= m && left >= m && top + alto <= vh - m && left + ancho <= vw - m;
  if (!rect) return { top: Math.max(m, (vh - alto) / 2), left: Math.max(m, (vw - ancho) / 2) };

  const lados: Record<string, { top: number; left: number }> = {
    right:  { top: rect.top, left: rect.right + sep },
    left:   { top: rect.top, left: rect.left - ancho - sep },
    bottom: { top: rect.bottom + sep, left: rect.left },
    top:    { top: rect.top - alto - sep, left: rect.left },
  };
  const orden = [pref ?? "bottom", "bottom", "right", "top", "left"];
  for (const lado of orden) {
    const c = lados[lado];
    // Se acepta el lado si cabe con la posición ideal, ajustando solo el eje que sobra.
    const ajustado = { top: Math.min(Math.max(c.top, m), vh - alto - m), left: Math.min(Math.max(c.left, m), vw - ancho - m) };
    const tapa = lado === "right" || lado === "left"
      ? ajustado.left < rect.right && ajustado.left + ancho > rect.left            // se encimaría al elemento
      : ajustado.top < rect.bottom && ajustado.top + alto > rect.top;
    if (!tapa || dentro(c.top, c.left)) return ajustado;
  }
  return { top: Math.max(m, vh - alto - m), left: Math.max(m, (vw - ancho) / 2) };
}

function TourBubble({
  step, rect, indice, total, onSiguiente, onAtras, onOmitir,
}: {
  step: TourStep; rect: DOMRect | null; indice: number; total: number;
  onSiguiente: () => void; onAtras: () => void; onOmitir: () => void;
}) {
  const ancho = Math.min(320, window.innerWidth - 24);
  const globoRef = useRef<HTMLDivElement>(null);
  const [alto, setAlto] = useState(240);

  // Mide el alto real del globo (cambia con cada paso y al cambiar el tamaño de la ventana).
  useEffect(() => {
    const el = globoRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAlto(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [step.id]);

  const { top, left } = colocar(rect, ancho, alto, step.placement);

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
      <div ref={globoRef} role="dialog" aria-label={step.title} style={{
        position: "fixed", zIndex: 9999, top, left, width: ancho, maxHeight: "calc(100vh - 24px)", overflowY: "auto",
        background: "#fff", borderRadius: 8, boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
        padding: 18, fontFamily: sans, transition: "top 0.2s ease, left 0.2s ease",
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
          Paso {indice + 1} de {total}
        </div>
        <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 6 }}>{step.title}</div>
        <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.5, marginBottom: 14 }}>{step.body}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onOmitir} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 12.5, cursor: "pointer", fontFamily: sans, padding: "8px 4px" }}>
            Omitir tutorial
          </button>
          <div style={{ display: "flex", gap: 6 }}>
            {indice > 0 && (
              <button onClick={onAtras} style={{ padding: "8px 14px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, cursor: "pointer", fontFamily: sans, color: "#374151" }}>
                Atrás
              </button>
            )}
            <button onClick={onSiguiente} style={{ padding: "8px 16px", background: "var(--c-brand)", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: sans }}>
              {indice >= total - 1 ? "Finalizar" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
