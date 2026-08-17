"use client";

import { useRef, useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { usePersonalizacion } from "@/hooks/use-personalizacion";
import FacturaA4 from "@/components/print/factura-a4";
import FacturaTermica from "@/components/print/factura-termica";
import { Boton } from "@/components/sandbox/ui";
import type { Factura } from "@/types";

// Factura ficticia solo para la vista previa — nunca se guarda ni se envía
// a ningún lado, es puramente para ver cómo queda el logo en el diseño real.
const FACTURA_EJEMPLO: Factura = {
  id: "ejemplo", noFactura: "1", eCF: "E320000000001", tipoECF: "E32",
  fecha: new Date().toISOString().slice(0, 10), vencimientoECF: "2027-12-31",
  terminos: "Contado", clienteId: "", estado: "pagada",
  esConsumidorFinal: true, nombreConsumidor: "Cliente de ejemplo",
  items: [
    { codigo: "001", descripcion: "Producto de ejemplo", modo: "unidad", cant: 2, pax: 1, precio: 500, descuentoMonto: 0, itbis: 0.18 },
    { codigo: "002", descripcion: "Servicio de ejemplo", modo: "unidad", cant: 1, pax: 1, precio: 1200, descuentoMonto: 0, itbis: 0.18 },
  ],
  urlQR: "https://ecf.dgii.gov.do/testecf/consultatimbre?ejemplo=1",
  codigoSeguridad: "ABC123",
};

type Formato = "a4" | "termica";

export default function PersonalizacionPage() {
  const tenant = useTenant();
  const { personalizacion, loading } = usePersonalizacion(tenant.tenantId);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [formato, setFormato] = useState<Formato>("a4");
  const inputRef = useRef<HTMLInputElement>(null);
  const contenidoRef = useRef<HTMLDivElement>(null);

  const empresa = {
    nombre: tenant.nombreNegocio, rnc: tenant.rnc,
    logoA4Url: personalizacion?.logoA4Url, logoTermicoUrl: personalizacion?.logoTermicoUrl,
  };

  const subirLogo = async (file: File) => {
    setSubiendo(true); setError("");
    try {
      const form = new FormData();
      form.append("tenantId", tenant.tenantId);
      form.append("logo", file);
      const res = await fetch("/api/personalizacion/logo", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo subir el logo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const imprimir = () => {
    const html = contenidoRef.current?.innerHTML ?? "";
    const ventana = window.open("", "_blank", "width=800,height=900");
    if (!ventana) return;
    const pageStyle = formato === "a4"
      ? "@page { size: A4; margin: 12mm 15mm; }"
      : "@page { size: 80mm auto; margin: 4mm; }";
    ventana.document.write(`
      <html><head><title>Vista previa</title>
      <style>${pageStyle} body { margin: 0; font-family: ${formato === "a4" ? "Arial, sans-serif" : "monospace"}; }</style>
      </head><body>${html}</body></html>
    `);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => { ventana.print(); ventana.close(); }, 300);
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 600, color: "var(--c-text-1)", marginBottom: 2 }}>
          Personalización
        </h1>
        <div style={{ fontSize: 13, color: "var(--c-text-3)" }}>
          El logo que subas aquí aparece en tus facturas impresas, en A4 y en térmica.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24, alignItems: "start" }} className="personalizacion-grid">
        <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, padding: 18, background: "var(--c-surface)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Logo del negocio</div>

          {loading ? (
            <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>Cargando...</div>
          ) : personalizacion?.logoA4Url ? (
            <div style={{
              marginBottom: 12, padding: 12, border: "1px solid var(--c-border-lt)", borderRadius: 6,
              display: "flex", justifyContent: "center", background: "var(--c-bg)",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- imagen del tenant en Storage */}
              <img src={personalizacion.logoA4Url} alt="Logo actual" style={{ maxWidth: "100%", maxHeight: 80 }} />
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 12 }}>
              Todavía no has subido un logo — tus facturas se imprimen solo con el nombre del negocio.
            </div>
          )}

          <input
            ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) subirLogo(f); }}
          />
          <Boton onClick={() => inputRef.current?.click()} disabled={subiendo} style={{ width: "100%" }}>
            {subiendo ? "Subiendo..." : personalizacion?.logoA4Url ? "Cambiar logo" : "Subir logo"}
          </Boton>
          {error && <div style={{ fontSize: 12, color: "#991b1b", marginTop: 10 }}>{error}</div>}

          <p style={{ fontSize: 11, color: "var(--c-text-4)", marginTop: 14, lineHeight: 1.5 }}>
            PNG, JPG o WEBP, máximo 5MB. Ajustamos el tamaño y el formato automáticamente para que
            quede bien tanto en A4 como en la impresora térmica — ahí se convierte a blanco y negro
            puro, porque la mayoría de esas impresoras no manejan bien el color.
          </p>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setFormato("a4")} style={{
              padding: "6px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer",
              border: `1px solid ${formato === "a4" ? "var(--c-brand)" : "var(--c-border)"}`,
              background: formato === "a4" ? "var(--c-brand-bg)" : "transparent",
            }}>
              Vista A4
            </button>
            <button type="button" onClick={() => setFormato("termica")} style={{
              padding: "6px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer",
              border: `1px solid ${formato === "termica" ? "var(--c-brand)" : "var(--c-border)"}`,
              background: formato === "termica" ? "var(--c-brand-bg)" : "transparent",
            }}>
              Vista térmica
            </button>
            <div style={{ flex: 1 }} />
            <Boton variant="secondary" onClick={imprimir}>Imprimir de prueba</Boton>
          </div>

          <div style={{
            border: "1px solid var(--c-border)", borderRadius: 8, padding: 20, background: "var(--c-surface)",
            display: "flex", justifyContent: "center", overflowX: "auto",
          }}>
            <div ref={contenidoRef}>
              {formato === "a4"
                ? <FacturaA4 factura={FACTURA_EJEMPLO} empresa={empresa} esMuestra />
                : <FacturaTermica factura={FACTURA_EJEMPLO} empresa={empresa} esMuestra />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
