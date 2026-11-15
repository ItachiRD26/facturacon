import type { ReactNode } from "react";
import Reveal from "./reveal";

// Sección de la landing. Todas usan este componente: mismo contenedor, mismo
// espacio vertical y mismo encabezado (título + frase de apoyo, a la izquierda).
// Los estilos viven en app/globals.css (.sec-*).
//
// Solo hay un tono claro y dos fuertes, con propósito:
//   paper: el fondo base, para explicar
//   ink:   tinta oscura, para lo que se ve (hero, producto, cierre)
//   brand: cobalto, reservado para el precio
export type TonoSeccion = "paper" | "ink" | "brand";

export default function Seccion({ id, tono = "paper", titulo, lede, children, className }: {
  id?: string; tono?: TonoSeccion; titulo?: ReactNode; lede?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section id={id} className={`sec sec-${tono}${className ? ` ${className}` : ""}`}>
      <div className="sec-inner">
        {titulo && (
          <Reveal as="header" className="sec-head">
            <h2 className="sec-h2">{titulo}</h2>
            {lede && <p className="sec-lede">{lede}</p>}
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}
