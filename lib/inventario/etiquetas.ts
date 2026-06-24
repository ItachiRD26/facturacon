import JsBarcode from "jsbarcode";
import type { Producto } from "@/types";

export const LABEL_SIZES = [
  { id: "70x40",  label: "70 × 40 mm",  w: 70,  h: 40,  desc: "Estándar (recomendado)" },
  { id: "50x30",  label: "50 × 30 mm",  w: 50,  h: 30,  desc: "Pequeña / góndola" },
  { id: "100x50", label: "100 × 50 mm", w: 100, h: 50,  desc: "Grande / empaque" },
  { id: "58x40",  label: "58 × 40 mm",  w: 58,  h: 40,  desc: "Térmica estándar" },
] as const;

export type LabelSizeId = typeof LABEL_SIZES[number]["id"];

export function generarEtiquetasHTML(
  seleccion: { producto: Producto; cantidad: number }[],
  sizeId: LabelSizeId,
  nombreNegocio: string,
): string {
  const size = LABEL_SIZES.find((s) => s.id === sizeId)!;
  const wMm = size.w;
  const hMm = size.h;

  const allLabels = seleccion.flatMap(({ producto: p, cantidad }) => {
    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    // Barcode: más delgado en etiquetas pequeñas para dejar espacio al texto
    const bcH = Math.max(14, hMm * 0.38);
    const bcW = Math.max(26, wMm * 0.80);

    try {
      JsBarcode(svgEl, p.codigo, {
        format: "CODE128", width: 1.6, height: bcH,
        displayValue: false, margin: 1,
        background: "#ffffff", lineColor: "#000000",
        xmlDocument: document,
      });
    } catch (e) { console.error("JsBarcode:", e); }
    const barcodeSVG = svgEl.outerHTML;

    // ── Font size dinámico para el nombre ────────────────────────
    const desc       = p.nombre;
    const basePt     = Math.max(4, hMm * 0.155);
    const charsPerLine = Math.floor((wMm - 3) / (basePt * 0.55 * 0.353));
    const lineasNeeded = Math.ceil(desc.length / Math.max(1, charsPerLine));
    let descPt = basePt;
    if (lineasNeeded > 3)      descPt = Math.max(3.5, basePt * 0.72);
    else if (lineasNeeded > 2) descPt = Math.max(4,   basePt * 0.85);

    const precioFinal = p.precio * (1 + (p.itbis || 0));
    const tieneITBIS  = (p.itbis || 0) > 0;
    const mostrarEmpresa = !(wMm <= 55 && hMm <= 32 && desc.length > 20);

    return Array.from({ length: cantidad }).map(() => `
      <div class="label">
        ${mostrarEmpresa ? `<div class="empresa">${nombreNegocio}</div>` : ""}
        <div class="desc" style="font-size:${descPt}pt">${desc}</div>
        <div class="barcode-wrap" style="width:${bcW}mm">${barcodeSVG}</div>
        <div class="precio">RD$ ${precioFinal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</div>
        ${tieneITBIS ? `<div class="itbis-tag">ITBIS incl.</div>` : ""}
        <div class="codigo">${p.codigo}</div>
      </div>
    `);
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Etiquetas ${nombreNegocio}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; background: #f0f0f0; padding: 16px; }
  .controls {
    margin-bottom: 14px; display: flex; gap: 10px; align-items: center;
    background: #fff; padding: 10px 14px; border-radius: 6px;
    box-shadow: 0 1px 4px rgba(0,0,0,.08);
  }
  .btn-print { padding: 8px 18px; background: #111; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; }
  .btn-close  { padding: 8px 14px; background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; border-radius: 4px; cursor: pointer; font-size: 13px; }
  .info { font-size: 12px; color: #6b7280; }
  .grid { display: flex; flex-wrap: wrap; gap: 3mm; }
  .label {
    width: ${wMm}mm; height: ${hMm}mm;
    background: #fff; border: 0.3mm solid #ccc;
    border-radius: 1mm;
    display: flex; flex-direction: column; align-items: center;
    justify-content: space-evenly;
    gap: 0;
    padding: 1mm 1.5mm; text-align: center;
    page-break-inside: avoid; overflow: hidden;
  }
  .empresa {
    font-size: ${Math.max(4.5, hMm * 0.15)}pt;
    font-weight: 700; letter-spacing: 0.08em; color: #111;
    line-height: 1;
  }
  .desc {
    color: #222; line-height: 1.25;
    max-width: ${wMm - 3}mm;
    word-break: break-word; overflow-wrap: break-word;
    overflow: hidden;
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
  }
  .barcode-wrap { display: flex; justify-content: center; }
  .barcode-wrap svg { display: block; }
  .precio {
    font-size: ${Math.max(5.5, hMm * 0.19)}pt;
    font-weight: 700; color: #111; line-height: 1;
  }
  .itbis-tag {
    font-size: ${Math.max(3, hMm * 0.10)}pt;
    color: #6b7280; font-style: italic; line-height: 1;
  }
  .codigo {
    font-size: ${Math.max(3.5, hMm * 0.11)}pt;
    color: #999; font-family: monospace; line-height: 1;
  }
  @media print {
    body { background: #fff; padding: 0; }
    .controls { display: none !important; }
    @page { size: A4; margin: 8mm; }
  }
</style>
</head>
<body>
<div class="controls">
  <button class="btn-print" onclick="window.print()">🖨 Imprimir (${allLabels.length} etiqueta${allLabels.length !== 1 ? "s" : ""})</button>
  <button class="btn-close" onclick="window.close()">Cerrar</button>
  <span class="info">Tamaño: ${wMm}mm × ${hMm}mm · ${allLabels.length} etiqueta${allLabels.length !== 1 ? "s" : ""} en total</span>
</div>
<div class="grid">${allLabels.join("")}</div>
</body>
</html>`;
}

export function abrirVentanaEtiquetas(html: string, titulo: string): void {
  const win = window.open("", "_blank", "width=900,height=650");
  if (!win) { alert("Permite ventanas emergentes para imprimir etiquetas"); return; }
  win.document.write(html);
  win.document.close();
  win.document.title = titulo;
}
