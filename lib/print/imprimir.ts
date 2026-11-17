import { cssFuenteNombre } from "./fuente-impresion";

// Imprime un trozo de HTML (la factura ya dibujada) sin abrir ventanas emergentes:
// usa un iframe oculto. Las ventanas emergentes las bloquea el navegador cuando la
// impresión se dispara justo después de emitir (la caja imprime sola al cobrar).
export type FormatoImpresion = "a4" | "termica";

export async function imprimirHtml(html: string, formato: FormatoImpresion, titulo: string): Promise<void> {
  if (typeof document === "undefined") return;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) { iframe.remove(); return; }

  const pagina = formato === "a4" ? "@page { size: A4; margin: 12mm 15mm; }" : "@page { size: 80mm auto; margin: 4mm; }";
  const fuente = formato === "a4" ? "Arial, sans-serif" : "monospace";
  doc.open();
  doc.write(`<html><head><title>${titulo.replace(/[<>&]/g, "")}</title><style>${cssFuenteNombre()} ${pagina} body { margin: 0; font-family: ${fuente}; }</style></head><body>${html}</body></html>`);
  doc.close();

  // Si la factura lleva logo, espera a que cargue (máximo 2 s) para que salga impreso.
  const imagenes = Array.from(doc.images);
  await Promise.race([
    Promise.all(imagenes.map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = () => r(null); })))),
    new Promise((r) => setTimeout(r, 2000)),
  ]);

  // Espera la fuente del nombre del negocio (máx. 1.5 s) para que no salga con otra letra.
  await Promise.race([doc.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]);

  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  setTimeout(() => iframe.remove(), 2000);
}
