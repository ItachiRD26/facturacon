"use client";

import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useClientes } from "@/hooks/use-clientes";
import { useProductos } from "@/hooks/use-productos";
import { useCotizaciones } from "@/hooks/use-cotizaciones";
import { useFacturas } from "@/hooks/use-facturas";
import { useCuentasPorCobrar } from "@/hooks/use-cuentas-por-cobrar";
import { usePersonalizacion } from "@/hooks/use-personalizacion";
import type { Cotizacion, EstadoCotizacion } from "@/types";
import { calcTotales, fmt, fmtDate } from "@/types";
import Badge from "@/components/ui/badge";
import Icon  from "@/components/ui/icon";
import ModalNuevaCotizacion from "@/components/modals/modal-nueva-cotizacion";
import ModalConvertirCotizacion, { type DatosConversion } from "@/components/modals/modal-convertir-cotizacion";
import PrintModalCotizacion from "@/components/print/print-modal-cotizacion";
import { convertirCotizacionEnFacturaReal } from "@/lib/produccion/acciones";

import { nombresImpresion } from "@/lib/tenant/nombres";
const sans  = "var(--font-sans)";
const mono  = "var(--font-mono)";
const serif = "var(--font-serif)";

export default function CotizacionesPage() {
  const tenant = useTenant();
  const { firebaseUser, perfil } = useAuth();
  const { clientes } = useClientes(tenant.tenantId);
  const { productos } = useProductos(tenant.tenantId);
  const { cotizaciones, loading, agregar, actualizar, cambiarEstado } = useCotizaciones(tenant.tenantId);
  // Esta página no lista facturas, solo necesita agregarFactura() como dep
  // de la conversión — pero useFacturas igual abre un onSnapshot, así que
  // hay que filtrarlo igual que en /facturas o un cajero se topa con un
  // permission-denied silencioso en la consola (ver firestore.rules).
  const filtroCreadoPor = (tenant.rol === "vendedor" || tenant.rol === "operador") ? (firebaseUser?.uid ?? null) : undefined;
  const { agregar: agregarFactura } = useFacturas(tenant.tenantId, filtroCreadoPor);
  const { agregar: agregarCuenta } = useCuentasPorCobrar(tenant.tenantId);
  const { personalizacion } = usePersonalizacion(tenant.tenantId);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando,     setEditando]     = useState<Cotizacion | null>(null);
  const [convirtiendo, setConvirtiendo] = useState<Cotizacion | null>(null);
  const [imprimiendo,  setImprimiendo]  = useState<Cotizacion | null>(null);
  const [busqueda,     setBusqueda]     = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoCotizacion | "todos">("todos");

  const autor = firebaseUser ? { uid: firebaseUser.uid, nombre: perfil?.nombre || perfil?.email || "Usuario" } : undefined;

  const abrirEdicion = (c: Cotizacion) => { setEditando(c); setModalAbierto(true); };
  const cerrarModal = () => { setModalAbierto(false); setEditando(null); };
  const guardarModal = async (data: Omit<Cotizacion, "id">) => {
    if (editando) await actualizar(editando.id, data, autor);
    else await agregar(data);
  };
  const anular = (c: Cotizacion) => cambiarEstado(c.id, "anulada", autor);

  const clientePor = (id: string) => clientes.find((c) => c.id === id);

  const filtradas = cotizaciones.filter((c) => {
    const nombre = clientePor(c.clienteId)?.nombre ?? "";
    const q = busqueda.toLowerCase();
    const matchBusq = !q || c.noCotizacion.toLowerCase().includes(q) || nombre.toLowerCase().includes(q);
    return matchBusq && (filtroEstado === "todos" || c.estado === filtroEstado);
  });

  const vigentes  = cotizaciones.filter((c) => c.estado === "vigente");
  const convertidas = cotizaciones.filter((c) => c.estado === "convertida").length;
  const montoVigente = vigentes.reduce((s, c) => s + calcTotales(c.items).total, 0);

  const onConvertir = async (cotizacion: Cotizacion, datos: DatosConversion) => {
    await convertirCotizacionEnFacturaReal({
      tenantId: tenant.tenantId,
      agregarFactura, actualizarCotizacion: actualizar, agregarCuenta,
    }, cotizacion, clientePor(cotizacion.clienteId), datos);
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: serif, fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--c-text-1)", marginBottom: 2 }}>Cotizaciones</h1>
          <div style={{ fontSize: 13, color: "var(--c-text-3)", fontFamily: sans }}>Convierte una en factura cuando el cliente acepte</div>
        </div>
        <button onClick={() => setModalAbierto(true)} disabled={clientes.length === 0 || productos.length === 0}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: (clientes.length === 0 || productos.length === 0) ? "var(--c-text-4)" : "var(--c-text-1)", color: "#fff", border: "none", borderRadius: 8, cursor: (clientes.length === 0 || productos.length === 0) ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 500, fontFamily: sans }}>
          <Icon name="plus" size={14} /> Nueva Cotización
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, boxShadow: "var(--shadow-sm)", padding: "14px 16px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--c-text-3)", fontFamily: sans, marginBottom: 8 }}>Vigentes</div>
          <div style={{ fontFamily: mono, fontSize: 19, fontWeight: 700, color: "var(--c-text-1)" }}>{vigentes.length}</div>
        </div>
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, boxShadow: "var(--shadow-sm)", padding: "14px 16px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--c-text-3)", fontFamily: sans, marginBottom: 8 }}>Monto en vigor</div>
          <div style={{ fontFamily: mono, fontSize: 19, fontWeight: 700, color: "var(--c-text-1)" }}>RD$ {fmt(montoVigente)}</div>
        </div>
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, boxShadow: "var(--shadow-sm)", padding: "14px 16px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--c-text-3)", fontFamily: sans, marginBottom: 8 }}>Convertidas</div>
          <div style={{ fontFamily: mono, fontSize: 19, fontWeight: 700, color: "var(--c-text-1)" }}>{convertidas}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--c-text-4)" }}><Icon name="search" size={14} /></div>
          <input style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid #CDD1C9", borderRadius: 8, fontSize: 13, fontFamily: sans, outline: "none" }}
            placeholder="Buscar por número o cliente..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <select style={{ padding: "8px 12px", border: "1px solid #CDD1C9", borderRadius: 8, fontSize: 13, fontFamily: sans, outline: "none" }}
          value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as EstadoCotizacion | "todos")}>
          <option value="todos">Todos los estados</option>
          <option value="vigente">Vigentes</option>
          <option value="vencida">Vencidas</option>
          <option value="convertida">Convertidas</option>
          <option value="anulada">Anuladas</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--c-text-4)", fontFamily: sans }}>Cargando cotizaciones...</div>
      ) : filtradas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", fontFamily: sans }}>
          <div style={{ fontSize: 16, color: "var(--c-text-2)", fontWeight: 600, marginBottom: 6 }}>{cotizaciones.length === 0 ? "No hay cotizaciones aún" : "Sin resultados"}</div>
          <div style={{ fontSize: 13, color: "var(--c-text-4)" }}>{cotizaciones.length === 0 ? "Crea tu primera cotización" : "Ajusta los filtros"}</div>
        </div>
      ) : (
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAFAF8", borderBottom: "2px solid var(--c-border)" }}>
                {["No. Cotización", "Cliente", "Fecha", "Vence", "Total", "Estado", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--c-text-3)", fontFamily: sans, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--c-border-lt)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAF8")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                  <td style={{ padding: "11px 14px", fontFamily: mono, fontSize: 12, fontWeight: 700, color: "var(--c-text-1)" }}>
                    {c.noCotizacion}
                    {!!c.historial?.length && (
                      <span
                        title={c.historial.map((h) => `${h.accion} — ${h.nombre} (${new Date(h.fecha).toLocaleString("es-DO")})`).join("\n")}
                        style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: "var(--c-text-4)", fontFamily: sans, cursor: "help" }}
                      >
                        ✎ {c.historial.length}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 13, color: "var(--c-text-2)", fontFamily: sans }}>{clientePor(c.clienteId)?.nombre ?? "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--c-text-3)", fontFamily: sans }}>{fmtDate(c.fecha)}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--c-text-3)", fontFamily: sans }}>{fmtDate(c.vencimiento)}</td>
                  <td style={{ padding: "11px 14px", fontFamily: mono, fontSize: 13, fontWeight: 700, color: "var(--c-text-1)" }}>RD$ {fmt(calcTotales(c.items).total)}</td>
                  <td style={{ padding: "11px 14px" }}><Badge estado={c.estado} /></td>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setImprimiendo(c)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", background: "var(--c-surface)", border: "1px solid #CDD1C9", borderRadius: 8, cursor: "pointer", color: "var(--c-text-2)", fontSize: 12, fontFamily: sans }}>
                        <Icon name="print" size={12} /> Ver
                      </button>
                      {c.estado === "vigente" && (
                        <>
                          <button onClick={() => abrirEdicion(c)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", background: "var(--c-surface)", border: "1px solid #CDD1C9", borderRadius: 8, cursor: "pointer", color: "var(--c-text-2)", fontSize: 12, fontFamily: sans }}>
                            <Icon name="edit" size={12} /> Editar
                          </button>
                          <button onClick={() => setConvirtiendo(c)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", background: "var(--c-surface)", border: "1px solid #C5CEFA", borderRadius: 8, cursor: "pointer", color: "#2540D9", fontSize: 12, fontFamily: sans }}>
                            <Icon name="convert" size={12} /> Convertir
                          </button>
                          <button onClick={() => anular(c)} style={{ padding: "5px 10px", background: "var(--c-surface)", border: "1px solid #fecaca", borderRadius: 8, cursor: "pointer", color: "#dc2626", fontSize: 12, fontFamily: sans }}>
                            Anular
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ModalNuevaCotizacion
        open={modalAbierto} onClose={cerrarModal} tenantId={tenant.tenantId}
        clientes={clientes} productos={productos} onSave={guardarModal} cotizacionEditar={editando}
      />

      <ModalConvertirCotizacion
        open={!!convirtiendo} onClose={() => setConvirtiendo(null)} cotizacion={convirtiendo}
        cliente={convirtiendo ? clientePor(convirtiendo.clienteId) : undefined}
        onConfirmar={async (datos) => { if (convirtiendo) await onConvertir(convirtiendo, datos); }}
      />

      <PrintModalCotizacion
        open={!!imprimiendo} onClose={() => setImprimiendo(null)} cotizacion={imprimiendo}
        cliente={imprimiendo ? clientePor(imprimiendo.clienteId) : undefined}
        empresa={{
          ...nombresImpresion(tenant), rnc: tenant.rnc,
          logoA4Url: personalizacion?.logoA4Url, logoTermicoUrl: personalizacion?.logoTermicoUrl,
        }}
        esMuestra={false}
      />
    </div>
  );
}
