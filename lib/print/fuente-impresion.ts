// Fuente con la que se imprime el NOMBRE del negocio cuando no tiene logo (la misma del sitio, extra negrita).
// Las facturas se imprimen en una ventana/iframe aparte que no hereda las fuentes de la página, por eso se
// declara aquí con su propio @font-face (archivo local en /public/fonts).
export const FUENTE_NOMBRE = "'NombreNegocio', var(--font-sans), 'Schibsted Grotesk', Arial, sans-serif";

export function cssFuenteNombre(): string {
  const origen = typeof window !== "undefined" ? window.location.origin : "";
  return `@font-face { font-family: 'NombreNegocio'; src: url('${origen}/fonts/schibsted-grotesk-latin.woff2') format('woff2'); font-weight: 100 900; font-display: block; }`;
}
