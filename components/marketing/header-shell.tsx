"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Armazón del header público. Siempre visible (sticky): al bajar solo cambia de
// aspecto (fondo con desenfoque y sombra) para que se lea bien sobre cualquier
// sección, pero NUNCA se esconde, así los enlaces siempre se pueden pulsar.
export default function HeaderShell({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const actualizar = () => { raf = 0; el.classList.toggle("site-header--scrolled", window.scrollY > 12); };
    const alScroll = () => { if (!raf) raf = requestAnimationFrame(actualizar); };
    actualizar();
    window.addEventListener("scroll", alScroll, { passive: true });
    return () => { window.removeEventListener("scroll", alScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <header ref={ref} className="site-header" style={{
      position: "sticky", top: 0, zIndex: 40, background: "var(--c-navy)",
      borderBottom: "1px solid rgba(255,255,255,0.1)", fontFamily: "var(--font-sans)",
    }}>
      {children}
    </header>
  );
}
