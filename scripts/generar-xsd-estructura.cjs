/* eslint-disable @typescript-eslint/no-require-imports -- script de Node (CommonJS) que se ejecuta a mano */
// Lee los XSD oficiales de la DGII (docs/xsd) y genera lib/certificacion/xsd-estructura.ts:
// el árbol de elementos (orden, grupos y repetidos) de cada tipo de e-CF y del RFCE.
// Sirve para armar, en el Paso 2 de certificación, el XML exactamente en el orden del XSD
// a partir de las columnas del Excel de la DGII (cuyos nombres son los tags del XSD).
// Uso: node scripts/generar-xsd-estructura.cjs
const fs = require("fs");
const path = require("path");
const { DOMParser } = require("@xmldom/xmldom");

const RAIZ = path.join(__dirname, "..");
const archivos = {
  "31": "e-CF-31.xsd", "32": "e-CF-32.xsd", "33": "e-CF-33.xsd", "34": "e-CF-34.xsd",
  "41": "e-CF-41.xsd", "43": "e-CF-43.xsd", "44": "e-CF-44.xsd", "45": "e-CF-45.xsd",
  "46": "e-CF-46.xsd", "47": "e-CF-47.xsd", "RFCE": "RFCE-32.xsd",
};

const hijos = (el, nombre) => Array.from(el.childNodes).filter((n) => n.nodeType === 1 && n.localName === nombre);

function nodo(el) {
  const n = { n: el.getAttribute("name") };
  const max = el.getAttribute("maxOccurs");
  if (max && max !== "1") n.r = 1; // elemento repetible (Item, FormaDePago, TelefonoEmisor...)
  const ct = hijos(el, "complexType")[0];
  if (ct) {
    const seq = hijos(ct, "sequence")[0];
    n.c = [];
    for (const h of Array.from(seq.childNodes)) {
      if (h.nodeType !== 1) continue;
      if (h.localName === "element") n.c.push(nodo(h));
      else if (h.localName === "any") n.c.push({ n: "Signature", s: 1 }); // la firma la inserta el firmador
      else throw new Error("Construcción XSD no soportada: " + h.localName + " en " + n.n);
    }
  }
  return n;
}

const salida = {};
for (const [tipo, archivo] of Object.entries(archivos)) {
  const doc = new DOMParser().parseFromString(fs.readFileSync(path.join(RAIZ, "docs/xsd", archivo), "utf8").replace(/^FEFF/, "").replace(/^[^<]+/, ""), "text/xml");
  const raiz = hijos(doc.documentElement, "element")[0];
  salida[tipo] = nodo(raiz);
}

const cabecera = `// GENERADO por scripts/generar-xsd-estructura.cjs a partir de docs/xsd/*.xsd — no editar a mano.
// n = nombre del tag, c = hijos (en orden XSD), r = se repite (maxOccurs > 1), s = firma (la inserta el firmador).
export interface NodoXsd { n: string; c?: NodoXsd[]; r?: 1; s?: 1 }
export const ESTRUCTURA_XSD: Record<string, NodoXsd> = `;
fs.writeFileSync(path.join(RAIZ, "lib/certificacion/xsd-estructura.ts"), cabecera + JSON.stringify(salida) + ";\n");
console.log("OK", Object.keys(salida).join(","));
