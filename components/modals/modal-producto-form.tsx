"use client";

import { useEffect, useState } from "react";
import type { Producto } from "@/types";
import { ITBIS_RATES } from "@/types";
import Modal from "./modal";
import { Boton, Campo, Input, Select } from "@/components/sandbox/ui";

export default function ModalProductoForm({
  open, onClose, onSave, inicial,
}: {
  open: boolean; onClose: () => void; onSave: (data: Omit<Producto, "id">) => Promise<void>;
  inicial?: Producto | null;
}) {
  const [esServicio, setEsServicio] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [itbis, setItbis] = useState(0.18);
  const [controlaStock, setControlaStock] = useState(true);
  const [stock, setStock] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEsServicio(inicial ? !inicial.controlaStock : false);
    setCodigo(inicial?.codigo ?? "");
    setNombre(inicial?.nombre ?? "");
    setDescripcion(inicial?.descripcion ?? "");
    setPrecio(inicial ? String(inicial.precio) : "");
    setItbis(inicial?.itbis ?? 0.18);
    setControlaStock(inicial?.controlaStock ?? true);
    setStock(inicial?.stock !== undefined ? String(inicial.stock) : "");
  }, [open, inicial]);

  const submit = async () => {
    const precioNum = parseFloat(precio);
    if (!nombre.trim() || isNaN(precioNum) || precioNum < 0) return;
    setGuardando(true);
    try {
      const controla = !esServicio && controlaStock;
      await onSave({
        codigo: codigo.trim() || `P-${Date.now().toString().slice(-6)}`,
        nombre: nombre.trim(), descripcion: descripcion.trim() || undefined,
        precio: precioNum, itbis, controlaStock: controla,
        stock: controla ? (parseInt(stock, 10) || 0) : undefined,
        activo: true,
      });
      onClose();
    } finally { setGuardando(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={inicial ? "Editar producto/servicio" : "Nuevo producto o servicio"}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Campo label="¿Qué vas a registrar?">
          <div style={{ display: "flex", gap: 6 }}>
            {[["Producto (inventario)", false], ["Servicio", true]].map(([label, val]) => (
              <button key={label as string} type="button" onClick={() => setEsServicio(val as boolean)} style={{
                flex: 1, padding: "8px 6px", fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer",
                border: `1px solid ${esServicio === val ? "var(--c-brand)" : "var(--c-border)"}`,
                background: esServicio === val ? "var(--c-brand-bg)" : "var(--c-surface)",
              }}>{label as string}</button>
            ))}
          </div>
        </Campo>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
          <Campo label="Código">
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Auto" />
          </Campo>
          <Campo label="Nombre">
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Tornillo 1/4, Consultoría, Amoxicilina 500mg" />
          </Campo>
        </div>

        <Campo label="Descripción (opcional)">
          <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </Campo>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Campo label="Precio unitario RD$">
            <Input value={precio} onChange={(e) => setPrecio(e.target.value)} type="number" min={0} step="0.01" />
          </Campo>
          <Campo label="ITBIS">
            <Select value={itbis} onChange={(e) => setItbis(parseFloat(e.target.value))}>
              {ITBIS_RATES.map((r) => <option key={r.val} value={r.val}>{r.label}</option>)}
            </Select>
          </Campo>
        </div>

        {!esServicio && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
              <input type="checkbox" checked={controlaStock} onChange={(e) => setControlaStock(e.target.checked)} />
              Controlar inventario
            </label>
            {controlaStock && (
              <Input value={stock} onChange={(e) => setStock(e.target.value)} type="number" min={0}
                placeholder="Stock inicial" style={{ maxWidth: 140 }} />
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <Boton variant="secondary" onClick={onClose}>Cancelar</Boton>
          <Boton onClick={submit} disabled={guardando || !nombre.trim() || !precio}>{guardando ? "Guardando..." : "Guardar"}</Boton>
        </div>
      </div>
    </Modal>
  );
}
