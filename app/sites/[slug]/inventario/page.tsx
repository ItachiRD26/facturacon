"use client";

import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useProductos } from "@/hooks/use-productos";
import type { Producto } from "@/types";
import { fmt } from "@/types";
import Badge from "@/components/ui/badge";
import Icon  from "@/components/ui/icon";
import ModalProductoForm from "@/components/modals/modal-producto-form";
import ModalLoteEtiquetas from "@/components/sandbox/modal-lote-etiquetas";
import { generarEtiquetasHTML, abrirVentanaEtiquetas } from "@/lib/inventario/etiquetas";

const sans  = "var(--font-sans)";
const mono  = "var(--font-mono)";
const serif = "var(--font-serif)";

export default function InventarioPage() {
  const tenant = useTenant();
  const { productos, loading, agregar, actualizar, eliminar } = useProductos(tenant.tenantId);
  const [showForm,  setShowForm]  = useState(false);
  const [editando,  setEditando]  = useState<Producto | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busqueda,  setBusqueda]  = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "productos" | "servicios">("todos");
  const [showLote,   setShowLote]   = useState(false);
  const [showAyuda,  setShowAyuda]  = useState(false);

  const filtrados = productos.filter((p) => {
    const q = busqueda.toLowerCase();
    const matchBusq = !q || p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q);
    const matchTipo = filtroTipo === "todos" || (filtroTipo === "productos" ? p.controlaStock : !p.controlaStock);
    return matchBusq && matchTipo;
  });

  const hayProductosConStock = productos.some((p) => p.controlaStock);

  const imprimirEtiqueta = (p: Producto) => {
    const html = generarEtiquetasHTML([{ producto: p, cantidad: 1 }], "70x40", tenant.nombreNegocio);
    abrirVentanaEtiquetas(html, `Etiqueta — ${p.nombre}`);
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 2 }}>Inventario</h1>
          <div style={{ fontSize: 13, color: "#6b7280", fontFamily: sans }}>Productos y servicios disponibles para facturar</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {hayProductosConStock && (
            <button onClick={() => setShowLote(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer", fontSize: 13, fontFamily: sans }}>
              <Icon name="print" size={14} /> Imprimir etiquetas
            </button>
          )}
          <button onClick={() => { setEditando(null); setShowForm(true); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "#0e7490", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: sans }}>
            <Icon name="plus" size={14} /> Nuevo Producto/Servicio
          </button>
        </div>
      </div>

      {hayProductosConStock && (
        <div style={{ marginBottom: 16, border: "1px solid #e5e7eb", borderRadius: 6, background: "#f9fafb" }}>
          <button onClick={() => setShowAyuda((v) => !v)} style={{
            width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px", background: "none", border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 600, color: "#0e7490", fontFamily: sans,
          }}>
            ¿Cómo funcionan los códigos de barra?
            <span>{showAyuda ? "−" : "+"}</span>
          </button>
          {showAyuda && (
            <div style={{ padding: "0 14px 14px", fontSize: 12, color: "#374151", lineHeight: 1.6, fontFamily: sans }}>
              <p style={{ marginBottom: 8 }}>
                <strong>Imprimir:</strong> usa el botón &quot;Etiqueta&quot; en cada producto, o &quot;Imprimir etiquetas&quot; arriba
                para generar varias a la vez. Cada etiqueta incluye un código de barras (CODE128) generado a partir
                del código del producto — imprímelas en una impresora normal o de etiquetas térmica.
              </p>
              <p>
                <strong>Escanear:</strong> conecta un lector de código de barras USB (funciona como un teclado) y,
                desde &quot;Nueva factura&quot;, simplemente escanea el producto — se agrega automáticamente a la lista,
                sin necesidad de hacer clic en ningún campo primero.
              </p>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}><Icon name="search" size={14} /></div>
          <input style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, fontFamily: sans, outline: "none" }}
            placeholder="Buscar producto o servicio..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <select style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, fontFamily: sans, outline: "none" }}
          value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as typeof filtroTipo)}>
          <option value="todos">Todos</option>
          <option value="productos">Solo productos</option>
          <option value="servicios">Solo servicios</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af", fontFamily: sans }}>Cargando inventario...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", fontFamily: sans }}>
          <div style={{ fontSize: 16, color: "#374151", fontWeight: 600, marginBottom: 6 }}>{productos.length === 0 ? "No hay productos ni servicios aún" : "Sin resultados"}</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>{productos.length === 0 ? "Crea tu primer producto o servicio" : "Ajusta los filtros"}</div>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                {["Código", "Nombre", "Tipo", "Precio", "ITBIS", "Stock", "Estado", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: sans, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                  <td style={{ padding: "12px 14px", fontFamily: mono, fontSize: 12, color: "#6b7280" }}>{p.codigo}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#111", fontFamily: sans }}>{p.nombre}</div>
                    {p.descripcion && <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: sans, marginTop: 2 }}>{p.descripcion}</div>}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 3, background: "#ecfeff", color: "#0e7490", border: "1px solid #a5f3fc", fontFamily: sans, fontWeight: 600 }}>
                      {p.controlaStock ? "Producto" : "Servicio"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", fontFamily: mono, fontSize: 12, color: "#374151" }}>RD$ {fmt(p.precio)}</td>
                  <td style={{ padding: "12px 14px" }}><Badge tipo={p.itbis === 0 ? "success" : "info"}>{p.itbis === 0 ? "Exento" : `${p.itbis * 100}%`}</Badge></td>
                  <td style={{ padding: "12px 14px", fontFamily: mono, fontSize: 12 }}>
                    {p.controlaStock ? <Badge tipo={(p.stock ?? 0) > 0 ? "info" : "danger"}>{p.stock ?? 0}</Badge> : "—"}
                  </td>
                  <td style={{ padding: "12px 14px" }}><Badge tipo={p.activo ? "success" : "neutral"}>{p.activo ? "Activo" : "Inactivo"}</Badge></td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {p.controlaStock && (
                        <button onClick={() => imprimirEtiqueta(p)} title="Imprimir etiqueta con código de barras" style={{ padding: "5px 8px", background: "none", border: "1px solid #bfdbfe", borderRadius: 4, cursor: "pointer", color: "#1d4ed8", fontSize: 11, fontFamily: sans, display: "flex", alignItems: "center", gap: 4 }}>Etiqueta</button>
                      )}
                      <button onClick={() => { setEditando(p); setShowForm(true); }} style={{ padding: "5px 10px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer", fontSize: 12, fontFamily: sans, color: "#374151" }}>Editar</button>
                      <button onClick={() => setConfirmId(p.id)} style={{ padding: "5px 10px", background: "#fff", border: "1px solid #fecaca", borderRadius: 4, cursor: "pointer", color: "#dc2626", display: "flex", alignItems: "center" }}><Icon name="trash" size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "10px 14px", fontSize: 12, color: "#9ca3af", fontFamily: sans, borderTop: "1px solid #f3f4f6" }}>
            {filtrados.length} de {productos.length} producto(s)/servicio(s)
          </div>
        </div>
      )}

      <ModalProductoForm
        open={showForm} inicial={editando} onClose={() => { setShowForm(false); setEditando(null); }}
        onSave={async (data) => { if (editando) await actualizar(editando.id, data); else await agregar(data); }}
      />

      {confirmId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 4, width: "100%", maxWidth: 400, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ fontFamily: serif, fontSize: 17, fontWeight: 700, color: "#111", marginBottom: 10 }}>Eliminar producto/servicio</div>
            <p style={{ fontSize: 13, color: "#6b7280", fontFamily: sans, marginBottom: 20 }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmId(null)} style={{ padding: "8px 14px", background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer", fontSize: 13, fontFamily: sans }}>Cancelar</button>
              <button onClick={async () => { await eliminar(confirmId); setConfirmId(null); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: sans }}>
                <Icon name="trash" size={13} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {showLote && (
        <ModalLoteEtiquetas
          productos={productos.filter((p) => p.controlaStock)}
          nombreNegocio={tenant.nombreNegocio}
          onClose={() => setShowLote(false)}
        />
      )}
    </div>
  );
}
