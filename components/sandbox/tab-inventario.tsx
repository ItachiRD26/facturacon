"use client";

import { useState } from "react";
import type { Producto } from "@/types";
import { fmt } from "@/types";
import ModalProductoForm from "@/components/modals/modal-producto-form";
import { Badge, Boton, EmptyState } from "./ui";

export default function TabInventario({
  productos, agregar, actualizar, eliminar,
}: { productos: Producto[]; agregar: (d: Omit<Producto, "id">) => Promise<void>; actualizar: (id: string, d: Partial<Producto>) => Promise<void>; eliminar: (id: string) => Promise<void> }) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Inventario y servicios ({productos.length})</div>
        <Boton onClick={() => { setEditando(null); setModalAbierto(true); }}>+ Nuevo producto/servicio</Boton>
      </div>

      {productos.length === 0 ? (
        <EmptyState texto="Agrega los productos o servicios que vendes para poder facturarlos." />
      ) : (
        <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
          {productos.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--c-border-lt)", fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{p.nombre} <span style={{ fontSize: 11, color: "var(--c-text-3)" }}>({p.codigo})</span></div>
                <div style={{ fontSize: 11, color: "var(--c-text-3)", display: "flex", gap: 6, alignItems: "center" }}>
                  RD$ {fmt(p.precio)} · ITBIS {p.itbis === 0 ? "Exento" : `${p.itbis * 100}%`}
                  {p.controlaStock && <Badge tone={(p.stock ?? 0) > 0 ? "blue" : "red"}>Stock: {p.stock ?? 0}</Badge>}
                  {!p.controlaStock && <Badge tone="neutral">Servicio</Badge>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setEditando(p); setModalAbierto(true); }} style={{ border: "none", background: "transparent", color: "var(--c-brand)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Editar</button>
                <button onClick={() => eliminar(p.id)} style={{ border: "none", background: "transparent", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ModalProductoForm
        open={modalAbierto} onClose={() => setModalAbierto(false)} inicial={editando}
        onSave={async (data) => { if (editando) await actualizar(editando.id, data); else await agregar(data); }}
      />
    </div>
  );
}
