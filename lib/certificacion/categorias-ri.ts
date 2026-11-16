// Las 11 casillas del Paso 5 del portal de la DGII: UNA representación impresa
// (PDF) por categoría de tipo — no una por cada comprobante enviado. Módulo puro:
// lo usan la ruta que genera el PDF y la pantalla que los lista.
import type { FacturaPrueba } from "./tipos";

export interface CategoriaRI {
  id: string;        // "31", "32M" (>= 250 mil), "33" … "47", "32m" (< 250 mil)
  prefijo: string;   // parte del nombre del archivo (distinta a la vista aunque el sistema no distinga mayúsculas)
  etiqueta: string;  // como la nombra el portal
  coincide: (p: Pick<FacturaPrueba, "tipoECF" | "montoTotal">) => boolean;
}

// Mismo umbral que usa el envío (monto base sin ITBIS): >= 250 mil va como e-CF completo, menor como resumen (RFCE).
const LIMITE = 250_000;

export const CATEGORIAS_RI: CategoriaRI[] = [
  { id: "31",  prefijo: "31", etiqueta: "Representación para comprobante tipo 31",              coincide: (p) => p.tipoECF === "E31" },
  { id: "32M", prefijo: "32-desde-250mil", etiqueta: "Representación para comprobante tipo 32 >= RD$250mil", coincide: (p) => p.tipoECF === "E32" && p.montoTotal >= LIMITE },
  { id: "33",  prefijo: "33", etiqueta: "Representación para comprobante tipo 33",              coincide: (p) => p.tipoECF === "E33" },
  { id: "34",  prefijo: "34", etiqueta: "Representación para comprobante tipo 34",              coincide: (p) => p.tipoECF === "E34" },
  { id: "41",  prefijo: "41", etiqueta: "Representación para comprobante tipo 41",              coincide: (p) => p.tipoECF === "E41" },
  { id: "43",  prefijo: "43", etiqueta: "Representación para comprobante tipo 43",              coincide: (p) => p.tipoECF === "E43" },
  { id: "44",  prefijo: "44", etiqueta: "Representación para comprobante tipo 44",              coincide: (p) => p.tipoECF === "E44" },
  { id: "45",  prefijo: "45", etiqueta: "Representación para comprobante tipo 45",              coincide: (p) => p.tipoECF === "E45" },
  { id: "46",  prefijo: "46", etiqueta: "Representación para comprobante tipo 46",              coincide: (p) => p.tipoECF === "E46" },
  { id: "47",  prefijo: "47", etiqueta: "Representación para comprobante tipo 47",              coincide: (p) => p.tipoECF === "E47" },
  { id: "32m", prefijo: "32-menor-250mil", etiqueta: "Representación para comprobante tipo 32 < RD$250mil",  coincide: (p) => p.tipoECF === "E32" && p.montoTotal < LIMITE },
];

// El comprobante de simulación (Paso 4) que sirve de ejemplo para una categoría: el más reciente
// que la DGII ya aceptó y que no quedó invalidado por un reinicio del lote.
export function ejemploDeCategoria(cat: CategoriaRI, pruebas: FacturaPrueba[]): FacturaPrueba | undefined {
  return pruebas
    .filter((p) => p.descripcion?.startsWith("Simulación #") && /aceptad/i.test(p.estadoDGII ?? "") && cat.coincide(p))
    .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
    .pop();
}

export const nombreArchivoRI = (cat: CategoriaRI, eCF: string) => `RI-${cat.prefijo}-${eCF}.pdf`;
