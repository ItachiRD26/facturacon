"use client";

import { useState } from "react";
import type { Producto } from "@/types";
import { LABEL_SIZES, type LabelSizeId, generarEtiquetasHTML, abrirVentanaEtiquetas } from "@/lib/inventario/etiquetas";
import { Boton } from "@/components/sandbox/ui";

const sans  = "var(--font-sans)";
const mono  = "var(--font-mono)";
const serif = "var(--font-serif)";

export default function ModalLoteEtiquetas({
  productos, nombreNegocio, onClose,
}: { productos: Producto[]; nombreNegocio: string; onClose: () => void }) {
  const [labelSize, setLabelSize] = useState<LabelSizeId>("70x40");
  const [loteItems, setLoteItems] = useState<Record<string, number>>({});

  const imprimirLote = () => {
    const seleccion = Object.entries(loteItems)
      .filter(([, cant]) => cant > 0)
      .map(([id, cant]) => ({ producto: productos.find((p) => p.id === id)!, cantidad: cant }))
      .filter((s) => s.producto);
    if (seleccion.length === 0) return;
    const html = generarEtiquetasHTML(seleccion, labelSize, nombreNegocio);
    abrirVentanaEtiquetas(html, `Lote de etiquetas — ${nombreNegocio}`);
    onClose();
  };

  const total = Object.values(loteItems).reduce((a, b) => a + b, 0);
  const prods = Object.values(loteItems).filter((c) => c > 0).length;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--c-surface)", borderRadius: 8, width: "100%", maxWidth: 640, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--c-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, color: "var(--c-text-1)" }}>Imprimir etiquetas en lote</div>
            <div style={{ fontSize: 11, color: "var(--c-text-4)", marginTop: 2, fontFamily: sans }}>
              Selecciona productos y cantidad de etiquetas por producto
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--c-text-3)" }}>×</button>
        </div>

        <div style={{ padding: "12px 22px", borderBottom: "1px solid var(--c-border-lt)", flexShrink: 0, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--c-text-2)", fontFamily: sans, fontWeight: 500 }}>Tamaño:</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {LABEL_SIZES.map((s) => (
              <button key={s.id} type="button" onClick={() => setLabelSize(s.id)} style={{
                padding: "4px 10px", borderRadius: 8, cursor: "pointer",
                fontSize: 11, fontFamily: sans, fontWeight: 500,
                border: `1.5px solid ${labelSize === s.id ? "#2540D9" : "var(--c-border)"}`,
                background: labelSize === s.id ? "#2540D9" : "#fff",
                color: labelSize === s.id ? "#fff" : "var(--c-text-2)",
              }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 22px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: sans }}>
            <thead style={{ position: "sticky", top: 0, background: "var(--c-surface)", zIndex: 1 }}>
              <tr style={{ borderBottom: "1px solid var(--c-border)" }}>
                <th style={{ padding: "10px 0", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--c-text-3)" }}>Producto</th>
                <th style={{ padding: "10px 0", textAlign: "center", fontSize: 12, fontWeight: 600, color: "var(--c-text-3)", width: 80 }}>Stock</th>
                <th style={{ padding: "10px 0", textAlign: "center", fontSize: 12, fontWeight: 600, color: "var(--c-text-3)", width: 110 }}>Cant. etiquetas</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => {
                const cant = loteItems[p.id] ?? 0;
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--c-border-lt)", background: cant > 0 ? "#f0faf4" : "transparent" }}>
                    <td style={{ padding: "10px 0" }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text-1)" }}>{p.nombre}</div>
                      <div style={{ fontSize: 11, color: "var(--c-text-4)", fontFamily: mono }}>{p.codigo}</div>
                    </td>
                    <td style={{ padding: "10px 0", textAlign: "center", fontFamily: mono, fontSize: 12, color: "var(--c-text-2)" }}>
                      {p.stock ?? 0} uds.
                    </td>
                    <td style={{ padding: "10px 0", textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <button type="button"
                          onClick={() => setLoteItems((prev) => ({ ...prev, [p.id]: Math.max(0, (prev[p.id] ?? 0) - 1) }))}
                          style={{ width: 26, height: 26, border: "1px solid #CDD1C9", borderRadius: 8, background: "#FAFAF8", cursor: "pointer", fontSize: 16, fontWeight: 500, lineHeight: 1 }}>−</button>
                        <input
                          type="number" min="0" max="999"
                          value={cant || ""}
                          placeholder="0"
                          onChange={(e) => setLoteItems((prev) => ({ ...prev, [p.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                          style={{ width: 52, textAlign: "center", padding: "4px 0", border: "1px solid #CDD1C9", borderRadius: 8, fontSize: 13, fontFamily: mono }}
                        />
                        <button type="button"
                          onClick={() => setLoteItems((prev) => ({ ...prev, [p.id]: (prev[p.id] ?? 0) + 1 }))}
                          style={{ width: 26, height: 26, border: "1px solid #CDD1C9", borderRadius: 8, background: "#FAFAF8", cursor: "pointer", fontSize: 16, fontWeight: 500, lineHeight: 1 }}>+</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--c-border)", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "var(--c-text-2)", fontFamily: sans }}>
            {total > 0
              ? <span style={{ fontWeight: 600 }}>{total} etiqueta{total !== 1 ? "s" : ""} de {prods} producto{prods !== 1 ? "s" : ""}</span>
              : <span style={{ color: "var(--c-text-4)" }}>Sin etiquetas seleccionadas</span>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Boton variant="secondary" onClick={onClose}>Cancelar</Boton>
            <Boton onClick={imprimirLote} disabled={total === 0}>🖨 Generar e imprimir</Boton>
          </div>
        </div>
      </div>
    </div>
  );
}
