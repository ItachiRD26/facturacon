"use client";

import { useState } from "react";
import Image from "next/image";

// Vistas del sistema con datos de ejemplo (scripts/landing-imagenes). Pestañas
// en vez de tres imágenes enormes apiladas: se ve una a la vez, a buen tamaño.
const VISTAS = [
  { id: "dashboard", pestana: "Tu negocio de un vistazo", descripcion: "Lo facturado, lo que te deben y cuántos comprobantes llevas del plan, sin armar reportes.", src: "/landing/dashboard.png", alt: "Dashboard de Facturacon con facturado del mes, por cobrar, comprobantes emitidos, gráfico diario y últimos comprobantes aceptados por la DGII" },
  { id: "factura", pestana: "Factura con código QR", descripcion: "Comprobante fiscal electrónico firmado, listo para imprimir en hoja A4 o en ticket térmico.", src: "/landing/factura.png", alt: "Factura de crédito fiscal electrónica en formato A4 y en ticket térmico, con código QR y código de seguridad" },
  { id: "inventario", pestana: "Inventario y códigos de barra", descripcion: "Productos con control de stock, etiquetas para imprimir y escaneo directo en la factura.", src: "/landing/inventario.png", alt: "Lista de inventario con códigos de barra, stock y etiqueta imprimible del producto seleccionado" },
];

export default function VistasProducto() {
  const [activa, setActiva] = useState(VISTAS[0].id);
  const v = VISTAS.find((x) => x.id === activa) ?? VISTAS[0];

  return (
    <div>
      <div className="tabs-vistas" role="tablist" aria-label="Vistas del sistema">
        {VISTAS.map((x) => (
          <button key={x.id} type="button" role="tab" id={`tab-${x.id}`} aria-selected={x.id === activa}
            aria-controls="panel-vista" className="tab-vista" onClick={() => setActiva(x.id)}>
            {x.pestana}
          </button>
        ))}
      </div>
      <p style={{ color: "rgba(255,255,255,0.78)", fontSize: 17, lineHeight: 1.55, maxWidth: 600, marginBottom: 8 }}>{v.descripcion}</p>
      <div id="panel-vista" role="tabpanel" aria-labelledby={`tab-${v.id}`}>
        <Image key={v.id} src={v.src} alt={v.alt} width={2400} height={1520} sizes="(max-width: 1120px) 100vw, 1072px" priority={v.id === VISTAS[0].id}
          style={{ width: "100%", height: "auto", display: "block" }} />
      </div>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Vistas con datos de ejemplo.</p>
    </div>
  );
}
