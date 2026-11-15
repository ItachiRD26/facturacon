"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Muestra una "ventana de navegador" diseñada a un ancho fijo (ancho x alto) y la
// escala completa al ancho disponible, sin deformarla: así el dashboard y el
// inventario se ven igual en escritorio que en teléfono, siempre vectoriales.
export default function VentanaEscalada({ ancho = 1112, alto = 690, children }: { ancho?: number; alto?: number; children: ReactNode }) {
  const caja = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medir = () => setEscala(Math.min(1, el.clientWidth / ancho));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ancho]);

  return (
    <div ref={caja} style={{ width: "100%", height: alto * escala, position: "relative" }}>
      <div style={{ width: ancho, height: alto, transform: `scale(${escala})`, transformOrigin: "top left", position: "absolute", left: 0, top: 0 }}>
        {children}
      </div>
    </div>
  );
}
