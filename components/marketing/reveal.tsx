"use client";

import { useEffect, useRef, type ElementType, type ReactNode, type CSSProperties } from "react";

// Aparición al hacer scroll, una sola vez. Antes de hidratar (y sin JavaScript)
// todo es visible: el estado oculto se aplica recién al montar, y solo a lo que
// todavía está fuera de pantalla. Con "reducir movimiento" no se anima nada.
//   stagger: los hijos directos entran escalonados (la clase de grid va en este mismo elemento)
export default function Reveal({ children, as = "div", stagger, className, style }: {
  children: ReactNode; as?: ElementType; stagger?: boolean; className?: string; style?: CSSProperties;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const Tag = as;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return; // ya se ve: no se anima

    el.classList.add("rv-pre");
    let fin: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      el.classList.remove("rv-pre");
      el.classList.add("rv-in");
      // Pasada la entrada, se quitan los retardos para que el hover responda al instante.
      fin = setTimeout(() => el.classList.add("rv-done"), 1500);
      io.disconnect();
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    io.observe(el);
    return () => { io.disconnect(); if (fin) clearTimeout(fin); };
  }, []);

  return (
    <Tag ref={ref} className={`rv${stagger ? " rv-stagger" : ""}${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </Tag>
  );
}
