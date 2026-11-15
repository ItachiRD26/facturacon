"use client";

import { useEffect, useState } from "react";

// Cifra que cuenta desde 0 al montarse (900 ms, desaceleración suave). Con
// "reducir movimiento" muestra el valor final directo.
export default function CountUp({ to, prefix = "", ms = 900 }: { to: number; prefix?: string; ms?: number }) {
  const [v, setV] = useState(to);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const ini = performance.now();
    const paso = (t: number) => {
      const p = Math.min(1, (t - ini) / ms);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);

  return <span className="num-sans">{prefix}{v.toLocaleString("es-DO")}</span>;
}
