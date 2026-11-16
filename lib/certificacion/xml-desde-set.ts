// Arma el XML del Paso 2 de certificación DIRECTAMENTE desde las columnas del
// Excel de la DGII. La DGII compara cada campo del comprobante enviado contra
// su "conjunto de datos entregados": si un campo difiere (nombre del emisor,
// dirección, municipio, unidad de medida, "1500.0000" vs "1500.00"...) rechaza
// el comprobante y reinicia todo el set. Por eso aquí NO se calcula ni se
// formatea nada: se copia el texto del Excel, en el orden y la estructura del
// XSD oficial (xsd-estructura.ts, generado de docs/xsd).
//
// Módulo puro (sin imports de servidor) para poder probarlo con Node directo.
import type { NodoXsd } from "./xsd-estructura";

// Datos de una fila: solo las celdas con valor, con la clave normalizada por
// `claveDeColumna` ("NombreItem[2]" → "nombreitem_2").
export type DatosSet = Record<string, string>;

// Celdas que el Excel marca "sin valor" (#e = vacío en el formato de la DGII).
const VACIO = new Set(["", "#e"]);
export const esVacio = (v: unknown): boolean => v === undefined || v === null || VACIO.has(String(v).trim().toLowerCase());

export function claveDeColumna(col: string): string {
  return col.toLowerCase().replace(/\s+/g, "").replace(/\]\[/g, "_").replace(/\[/g, "_").replace(/\]/g, "");
}

// Nombres del XSD que el Excel escribe distinto, según el elemento padre
// ("Padre.Hijo" en el XSD → nombre de la columna del Excel, en minúsculas).
const ALIAS: Record<string, string> = {
  "descuentoorecargo.numerolinea": "numerolineador",
};

// Elementos cuyas columnas el Excel entrega SIN índice cuando solo hay uno
// (p. ej. NumeroSubTotal en vez de NumeroSubTotal[1]).
const SIN_INDICE_SI_UNICO = new Set(["Subtotal"]);

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export interface OpcionesXml {
  fechaHoraFirma?: string;   // dd-MM-yyyy HH:mm:ss (la pone el servidor al firmar)
  codigoSeguridad?: string;  // solo RFCE: 6 primeros caracteres del hash de la firma del e-CF
}

export interface ResultadoXml {
  xml: string;
  // Celdas con valor en el Excel que no pudieron colocarse en el XML. Si hay
  // alguna, NO se debe enviar: la DGII lo rechazaría y reiniciaría el set.
  noUsadas: string[];
}

export function construirXmlDesdeSet(raiz: NodoXsd, datos: DatosSet, opciones: OpcionesXml = {}): ResultadoXml {
  const usadas = new Set<string>();

  function buscar(nombre: string, padre: string, indices: number[]): string | undefined {
    const base = ALIAS[`${padre}.${nombre}`.toLowerCase()] ?? nombre.toLowerCase();
    const minimo = SIN_INDICE_SI_UNICO.has(padre) && indices.every((i) => i === 1) ? 0 : indices.length;
    for (let k = indices.length; k >= minimo; k--) {
      const clave = base + indices.slice(0, k).map((i) => `_${i}`).join("");
      const v = datos[clave];
      if (v !== undefined && !esVacio(v)) { usadas.add(clave); return v; }
    }
    return undefined;
  }

  function emitir(n: NodoXsd, padre: string, indices: number[]): string {
    if (n.s) return "";
    if (!n.c) {
      const hoja = (ind: number[]): string | undefined =>
        n.n === "FechaHoraFirma" ? opciones.fechaHoraFirma
        : n.n === "CodigoSeguridadeCF" ? opciones.codigoSeguridad
        : buscar(n.n, padre, ind);
      if (!n.r) {
        const v = hoja(indices);
        return v === undefined ? "" : `<${n.n}>${escapeXml(v)}</${n.n}>`;
      }
      // Hoja repetible (TelefonoEmisor[1..3]): una etiqueta por cada valor presente.
      let fuera = "";
      for (let i = 1; i <= 1000; i++) {
        const v = hoja([...indices, i]);
        if (v === undefined) break;
        fuera += `<${n.n}>${escapeXml(v)}</${n.n}>`;
      }
      return fuera;
    }
    if (!n.r) {
      const dentro = n.c.map((h) => emitir(h, n.n, indices)).join("");
      return dentro ? `<${n.n}>${dentro}</${n.n}>` : "";
    }
    let fuera = "";
    for (let i = 1; i <= 1000; i++) {
      const dentro = n.c.map((h) => emitir(h, n.n, [...indices, i])).join("");
      if (!dentro) break;
      fuera += `<${n.n}>${dentro}</${n.n}>`;
    }
    return fuera;
  }

  const cuerpo = emitir(raiz, "", []);
  const noUsadas = Object.keys(datos).filter((k) => k !== "casoprueba" && !usadas.has(k) && !esVacio(datos[k]));
  return { xml: `<?xml version="1.0" encoding="UTF-8"?>${cuerpo}`, noUsadas };
}
