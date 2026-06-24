"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Cliente, Factura } from "@/types";
import FacturaA4, { type EmpresaImpresion } from "./factura-a4";
import FacturaTermica from "./factura-termica";
import { Boton } from "@/components/sandbox/ui";

type Formato = "a4" | "termica";

export default function PrintModal({
  open, onClose, factura, cliente, empresa,
}: { open: boolean; onClose: () => void; factura: Factura | null; cliente?: Cliente; empresa: EmpresaImpresion }) {
  const [formato, setFormato] = useState<Formato>("a4");
  const contenidoRef = useRef<HTMLDivElement>(null);

  if (!open || !factura || typeof document === "undefined") return null;

  const imprimir = () => {
    const html = contenidoRef.current?.innerHTML ?? "";
    const ventana = window.open("", "_blank", "width=800,height=900");
    if (!ventana) return;
    const pageStyle = formato === "a4"
      ? "@page { size: A4; margin: 12mm 15mm; }"
      : "@page { size: 80mm auto; margin: 4mm; }";
    ventana.document.write(`
      <html><head><title>${factura.eCF}</title>
      <style>${pageStyle} body { margin: 0; font-family: ${formato === "a4" ? "Arial, sans-serif" : "monospace"}; }</style>
      </head><body>${html}</body></html>
    `);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => { ventana.print(); ventana.close(); }, 300);
  };

  return createPortal(
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--c-surface)", borderRadius: 10, maxWidth: formato === "a4" ? 640 : 380,
        width: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{
          position: "sticky", top: 0, display: "flex", justifyContent: "space-between", alignItems: "center",
          gap: 8, padding: "12px 16px", borderBottom: "1px solid var(--c-border)", background: "var(--c-surface)",
        }}>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={() => setFormato("a4")} style={{
              padding: "6px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer",
              border: `1px solid ${formato === "a4" ? "var(--c-brand)" : "var(--c-border)"}`,
              background: formato === "a4" ? "var(--c-brand-bg)" : "transparent",
            }}>Formato A4</button>
            <button type="button" onClick={() => setFormato("termica")} style={{
              padding: "6px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer",
              border: `1px solid ${formato === "termica" ? "var(--c-brand)" : "var(--c-border)"}`,
              background: formato === "termica" ? "var(--c-brand-bg)" : "transparent",
            }}>Térmica 80mm</button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Boton onClick={imprimir}>Imprimir</Boton>
            <Boton variant="secondary" onClick={onClose}>Cerrar</Boton>
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: 20, display: "flex", justifyContent: "center" }}>
          <div ref={contenidoRef}>
            {formato === "a4"
              ? <FacturaA4 factura={factura} cliente={cliente} empresa={empresa} />
              : <FacturaTermica factura={factura} cliente={cliente} empresa={empresa} />}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
