"use client";

import { useState } from "react";
import type { Cliente } from "@/types";
import ModalClienteForm from "@/components/modals/modal-cliente-form";
import { Boton, EmptyState } from "./ui";

export default function TabClientes({
  clientes, agregar, actualizar, eliminar,
}: { clientes: Cliente[]; agregar: (d: Omit<Cliente, "id">) => Promise<void>; actualizar: (id: string, d: Partial<Cliente>) => Promise<void>; eliminar: (id: string) => Promise<void> }) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Clientes ({clientes.length})</div>
        <Boton onClick={() => { setEditando(null); setModalAbierto(true); }}>+ Nuevo cliente</Boton>
      </div>

      {clientes.length === 0 ? (
        <EmptyState texto="Agrega tu primer cliente de prueba para empezar a facturar." />
      ) : (
        <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
          {clientes.map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--c-border-lt)", fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{c.nombre}</div>
                <div style={{ fontSize: 11, color: "var(--c-text-3)" }}>{c.tipo} {c.rnc && `· RNC ${c.rnc}`}</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setEditando(c); setModalAbierto(true); }} style={{ border: "none", background: "transparent", color: "var(--c-brand)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Editar</button>
                <button onClick={() => eliminar(c.id)} style={{ border: "none", background: "transparent", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ModalClienteForm
        open={modalAbierto} onClose={() => setModalAbierto(false)} inicial={editando}
        onSave={async (data) => { if (editando) await actualizar(editando.id, data); else await agregar(data); }}
      />
    </div>
  );
}
