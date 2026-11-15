"use client";

import { useEffect, useState } from "react";
import { SquaresFour, Receipt, Package } from "@phosphor-icons/react/dist/ssr";
import FacturaDemo from "./factura-demo";
import VentanaEscalada from "./ventana-escalada";
import { DashboardDemo, InventarioDemo } from "./sistema-demo";

// Vistas del sistema con datos de ejemplo. Pestañas con icono que rotan solas
// (con barra de progreso; se detienen al pasar el cursor, al enfocar o con
// "reducir movimiento") sobre un escenario con resplandor. La factura no es una
// imagen: es el componente FacturaDemo, con la hoja A4 y el ticket por separado.
const VISTAS = [
  { id: "dashboard", pestana: "Tu negocio de un vistazo", Icono: SquaresFour, descripcion: "Lo facturado, lo que te deben y cuántos comprobantes llevas del plan, sin armar reportes." },
  { id: "factura", pestana: "Factura A4 y ticket", Icono: Receipt, descripcion: "Comprobante fiscal electrónico firmado, con código QR, para imprimir en hoja A4 o en ticket térmico." },
  { id: "inventario", pestana: "Inventario y códigos de barra", Icono: Package, descripcion: "Productos con control de stock, etiquetas para imprimir y escaneo directo en la factura." },
];
const SEGUNDOS = 7;

export default function VistasProducto() {
  const [idx, setIdx] = useState(0);
  const [pausa, setPausa] = useState(false);
  const [sinMovimiento, setSinMovimiento] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const aplicar = () => setSinMovimiento(mq.matches);
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, []);

  // Rotación automática: reinicia al cambiar de pestaña (por clic o por tiempo).
  useEffect(() => {
    if (pausa || sinMovimiento) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % VISTAS.length), SEGUNDOS * 1000);
    return () => clearTimeout(t);
  }, [idx, pausa, sinMovimiento]);

  const v = VISTAS[idx];

  return (
    <div onMouseEnter={() => setPausa(true)} onMouseLeave={() => setPausa(false)}
      onFocus={() => setPausa(true)} onBlur={() => setPausa(false)}>
      <div className="tabs-vistas" role="tablist" aria-label="Vistas del sistema">
        {VISTAS.map((x, i) => (
          <button key={x.id} type="button" role="tab" id={`tab-${x.id}`} aria-selected={i === idx}
            aria-controls="panel-vista" className="tab-vista" onClick={() => setIdx(i)}>
            <x.Icono size={20} weight={i === idx ? "fill" : "duotone"} aria-hidden="true" />
            <span>{x.pestana}</span>
            {i === idx && !sinMovimiento && (
              <span key={`${idx}-${pausa}`} className="tab-prog" aria-hidden="true"
                style={{ animationDuration: `${SEGUNDOS}s`, animationPlayState: pausa ? "paused" : "running" }} />
            )}
          </button>
        ))}
      </div>

      <p className="vista-desc" key={`d-${v.id}`}>{v.descripcion}</p>

      <div className="stage-vistas" id="panel-vista" role="tabpanel" aria-labelledby={`tab-${v.id}`}>
        <div className="stage-in" key={v.id}>
          {v.id === "factura" ? <FacturaDemo /> : (
            <VentanaEscalada>{v.id === "dashboard" ? <DashboardDemo /> : <InventarioDemo />}</VentanaEscalada>
          )}
        </div>
      </div>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 14 }}>Vistas con datos de ejemplo.</p>
    </div>
  );
}
