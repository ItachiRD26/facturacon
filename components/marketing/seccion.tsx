import type { ReactNode } from "react";

// Sección de la landing. Todas usan este componente: mismo contenedor, mismo
// espacio vertical y mismo encabezado (título + frase de apoyo, alineado a la
// izquierda). Lo único que cambia entre secciones es el tono de fondo; los
// estilos viven en app/globals.css (.sec-*).
//
//   paper: fondo base de la página
//   white: blanco con filete arriba y abajo
//   ink:   tinta oscura, para un solo momento de contraste
export type TonoSeccion = "paper" | "white" | "ink";

export default function Seccion({ id, tono = "paper", titulo, lede, children, className }: {
  id?: string; tono?: TonoSeccion; titulo?: ReactNode; lede?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section id={id} className={`sec sec-${tono}${className ? ` ${className}` : ""}`}>
      <div className="sec-inner">
        {titulo && (
          <header className="sec-head">
            <h2 className="sec-h2">{titulo}</h2>
            {lede && <p className="sec-lede">{lede}</p>}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
