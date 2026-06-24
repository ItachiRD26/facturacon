"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import type { Cliente, Cotizacion } from "@/types";
import CotizacionA4 from "./cotizacion-a4";
import type { EmpresaImpresion } from "./factura-a4";
import { Boton } from "@/components/sandbox/ui";

export default function PrintModalCotizacion({
  open, onClose, cotizacion, cliente, empresa,
}: { open: boolean; onClose: () => void; cotizacion: Cotizacion | null; cliente?: Cliente; empresa: EmpresaImpresion }) {
  const contenidoRef = useRef<HTMLDivElement>(null);

  if (!open || !cotizacion || typeof document === "undefined") return null;

  const imprimir = () => {
    const html = contenidoRef.current?.innerHTML ?? "";
    const ventana = window.open("", "_blank", "width=800,height=900");
    if (!ventana) return;
    ventana.document.write(`
      <html><head><title>${cotizacion.noCotizacion}</title>
      <style>@page { size: A4; margin: 12mm 15mm; } body { margin: 0; font-family: Arial, sans-serif; }</style>
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
        background: "var(--c-surface)", borderRadius: 10, maxWidth: 640,
        width: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{
          position: "sticky", top: 0, display: "flex", justifyContent: "flex-end", alignItems: "center",
          gap: 8, padding: "12px 16px", borderBottom: "1px solid var(--c-border)", background: "var(--c-surface)",
        }}>
          <Boton onClick={imprimir}>Imprimir</Boton>
          <Boton variant="secondary" onClick={onClose}>Cerrar</Boton>
        </div>

        <div style={{ overflowY: "auto", padding: 20, display: "flex", justifyContent: "center" }}>
          <div ref={contenidoRef}>
            <CotizacionA4 cotizacion={cotizacion} cliente={cliente} empresa={empresa} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
