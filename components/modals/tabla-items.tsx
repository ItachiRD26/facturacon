"use client";

import { useState } from "react";
import type { LineaServicio, Producto } from "@/types";
import { calcLinea, fmt, ITBIS_RATES } from "@/types";
import { Boton, Input, Select } from "@/components/sandbox/ui";

export default function TablaItems({
  items, onChange, productos,
}: { items: LineaServicio[]; onChange: (items: LineaServicio[]) => void; productos: Producto[] }) {
  const [buscando, setBuscando] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const agregarDeCatalogo = (p: Producto) => {
    onChange([...items, {
      codigo: p.codigo, descripcion: p.nombre, modo: "unidad",
      cant: 1, pax: 1, precio: p.precio, descuentoMonto: 0, itbis: p.itbis,
      servicioId: p.id, fromCatalog: true,
    }]);
    setBuscando(false); setBusqueda("");
  };

  const actualizarLinea = (i: number, patch: Partial<LineaServicio>) => {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };

  const eliminarLinea = (i: number) => {
    onChange(items.filter((_, idx) => idx !== i));
  };

  const filtrados = productos.filter((p) =>
    p.activo && (p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.codigo.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, position: "relative" }}>
        <Boton variant="secondary" onClick={() => setBuscando((b) => !b)}>+ Agregar producto</Boton>

        {buscando && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, width: 320, zIndex: 10,
            background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 10,
          }}>
            <Input autoFocus value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar producto o servicio..." />
            <div style={{ maxHeight: 220, overflowY: "auto", marginTop: 8 }}>
              {filtrados.length === 0 && (
                <div style={{ fontSize: 12, color: "var(--c-text-3)", padding: 8 }}>
                  Sin resultados. Agrégalo primero en Inventario.
                </div>
              )}
              {filtrados.map((p) => (
                <button key={p.id} type="button" onClick={() => agregarDeCatalogo(p)} style={{
                  display: "flex", justifyContent: "space-between", width: "100%", textAlign: "left",
                  padding: "8px 6px", border: "none", background: "transparent", cursor: "pointer",
                  borderRadius: 4, fontSize: 12,
                }}>
                  <span>{p.nombre}</span>
                  <span style={{ fontWeight: 600 }}>RD$ {fmt(p.precio)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--c-text-3)", border: "1px dashed var(--c-border)", borderRadius: 8 }}>
          Agrega al menos un producto del inventario, o escanea un código de barras.
        </div>
      ) : (
        <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "2.2fr 0.7fr 1fr 1fr 0.9fr 1fr 28px",
            gap: 6, padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "var(--c-text-3)",
            textTransform: "uppercase", background: "var(--c-bg)",
          }}>
            <span>Descripción</span><span>Cant.</span><span>Precio</span><span>Desc.</span><span>ITBIS</span><span>Total</span><span />
          </div>
          {items.map((item, i) => {
            const c = calcLinea(item);
            return (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "2.2fr 0.7fr 1fr 1fr 0.9fr 1fr 28px",
                gap: 6, padding: "8px 10px", borderTop: "1px solid var(--c-border-lt)", alignItems: "center",
              }}>
                <span style={{ fontSize: 12 }}>{item.descripcion}</span>
                <Input type="number" min={1} value={item.cant} onChange={(e) => actualizarLinea(i, { cant: parseFloat(e.target.value) || 1 })}
                  style={{ padding: "5px 6px", fontSize: 12 }} />
                <Input type="number" min={0} step="0.01" value={item.precio} onChange={(e) => actualizarLinea(i, { precio: parseFloat(e.target.value) || 0 })}
                  style={{ padding: "5px 6px", fontSize: 12 }} />
                <Input type="number" min={0} step="0.01" value={item.descuentoMonto} onChange={(e) => actualizarLinea(i, { descuentoMonto: parseFloat(e.target.value) || 0 })}
                  style={{ padding: "5px 6px", fontSize: 12 }} />
                <Select value={item.itbis} onChange={(e) => actualizarLinea(i, { itbis: parseFloat(e.target.value) })} style={{ padding: "5px 6px", fontSize: 12 }}>
                  {ITBIS_RATES.map((r) => <option key={r.val} value={r.val}>{r.label}</option>)}
                </Select>
                <span style={{ fontSize: 12, fontWeight: 700, textAlign: "right" }}>{fmt(c.total)}</span>
                <button type="button" onClick={() => eliminarLinea(i)} disabled={items.length <= 1} style={{
                  border: "none", background: "transparent", cursor: items.length <= 1 ? "not-allowed" : "pointer",
                  color: "#dc2626", fontSize: 14,
                }}>✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
