"use client";

import { useState } from "react";
import { useSandbox } from "@/contexts/SandboxContext";
import { useClientes } from "@/hooks/use-clientes";
import { useProductos } from "@/hooks/use-productos";
import { useCotizaciones } from "@/hooks/use-cotizaciones";
import { useFacturas } from "@/hooks/use-facturas";
import { useCuentasPorCobrar } from "@/hooks/use-cuentas-por-cobrar";
import type { Cotizacion, EstadoCotizacion } from "@/types";
import { calcTotales, fmt, fmtDate } from "@/types";
import Badge from "@/components/ui/badge";
import Icon  from "@/components/ui/icon";
import ModalNuevaCotizacion from "@/components/modals/modal-nueva-cotizacion";
import ModalConvertirCotizacion, { type DatosConversion } from "@/components/modals/modal-convertir-cotizacion";
import PrintModalCotizacion from "@/components/print/print-modal-cotizacion";
import { convertirCotizacionEnFactura } from "@/lib/sandbox/acciones";

const sans  = "var(--font-sans)";
const mono  = "var(--font-mono)";
const serif = "var(--font-serif)";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

export default function SandboxCotizacionesPage() {
  const { tenantId, tenant } = useSandbox();
  const { clientes } = useClientes(tenantId);
  const { productos } = useProductos(tenantId);
  const { cotizaciones, loading, agregar, actualizar, cambiarEstado } = useCotizaciones(tenantId);
  const { agregar: agregarFactura } = useFacturas(tenantId);
  const { agregar: agregarCuenta } = useCuentasPorCobrar(tenantId);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [convirtiendo, setConvirtiendo] = useState<Cotizacion | null>(null);
  const [imprimiendo,  setImprimiendo]  = useState<Cotizacion | null>(null);
  const [busqueda,     setBusqueda]     = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoCotizacion | "todos">("todos");

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
    await convertirCotizacionEnFactura({
      tenantId, rncEmisor: tenant.rnc, nombreEmisor: tenant.nombreNegocio, rootDomain: ROOT_DOMAIN,
      agregarFactura, actualizarCotizacion: actualizar, agregarCuenta,
    }, cotizacion, clientePor(cotizacion.clienteId), datos);
  };

  return (
    <div className="fade-in" data-tour="page-cotizaciones">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 2 }}>Cotizaciones</h1>
          <div style={{ fontSize: 13, color: "#6b7280", fontFamily: sans }}>Cotizaciones de prueba — convierte una en factura cuando el cliente acepte</div>
        </div>
        <button onClick={() => setModalAbierto(true)} disabled={clientes.length === 0 || productos.length === 0} data-tour="btn-nueva-cotizacion"
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: (clientes.length === 0 || productos.length === 0) ? "#9ca3af" : "#111", color: "#fff", border: "none", borderRadius: 4, cursor: (clientes.length === 0 || productos.length === 0) ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 500, fontFamily: sans }}>
          <Icon name="plus" size={14} /> Nueva Cotización
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderTop: "3px solid #1d4ed8", borderRadius: 4, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: sans, marginBottom: 8 }}>Vigentes</div>
          <div style={{ fontFamily: mono, fontSize: 19, fontWeight: 700, color: "#111" }}>{vigentes.length}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderTop: "3px solid #0e7490", borderRadius: 4, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: sans, marginBottom: 8 }}>Monto en vigor</div>
          <div style={{ fontFamily: mono, fontSize: 19, fontWeight: 700, color: "#111" }}>RD$ {fmt(montoVigente)}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderTop: "3px solid #166534", borderRadius: 4, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: sans, marginBottom: 8 }}>Convertidas</div>
          <div style={{ fontFamily: mono, fontSize: 19, fontWeight: 700, color: "#111" }}>{convertidas}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}><Icon name="search" size={14} /></div>
          <input style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, fontFamily: sans, outline: "none" }}
            placeholder="Buscar por número o cliente..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <select style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, fontFamily: sans, outline: "none" }}
          value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as EstadoCotizacion | "todos")}>
          <option value="todos">Todos los estados</option>
          <option value="vigente">Vigentes</option>
          <option value="vencida">Vencidas</option>
          <option value="convertida">Convertidas</option>
          <option value="anulada">Anuladas</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af", fontFamily: sans }}>Cargando cotizaciones...</div>
      ) : filtradas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", fontFamily: sans }}>
          <div style={{ fontSize: 16, color: "#374151", fontWeight: 600, marginBottom: 6 }}>{cotizaciones.length === 0 ? "No hay cotizaciones aún" : "Sin resultados"}</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>{cotizaciones.length === 0 ? "Crea una cotización de prueba" : "Ajusta los filtros"}</div>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                {["No. Cotización", "Cliente", "Fecha", "Vence", "Total", "Estado", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: sans, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                  <td style={{ padding: "11px 14px", fontFamily: mono, fontSize: 12, fontWeight: 700, color: "#111" }}>{c.noCotizacion}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, color: "#374151", fontFamily: sans }}>{clientePor(c.clienteId)?.nombre ?? "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#6b7280", fontFamily: sans }}>{fmtDate(c.fecha)}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#6b7280", fontFamily: sans }}>{fmtDate(c.vencimiento)}</td>
                  <td style={{ padding: "11px 14px", fontFamily: mono, fontSize: 13, fontWeight: 700, color: "#111" }}>RD$ {fmt(calcTotales(c.items).total)}</td>
                  <td style={{ padding: "11px 14px" }}><Badge estado={c.estado} /></td>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setImprimiendo(c)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer", color: "#374151", fontSize: 12, fontFamily: sans }}>
                        <Icon name="print" size={12} /> Ver
                      </button>
                      {c.estado === "vigente" && (
                        <>
                          <button onClick={() => setConvirtiendo(c)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", background: "#fff", border: "1px solid #a5f3fc", borderRadius: 4, cursor: "pointer", color: "#0e7490", fontSize: 12, fontFamily: sans }}>
                            <Icon name="convert" size={12} /> Convertir
                          </button>
                          <button onClick={() => cambiarEstado(c.id, "anulada")} style={{ padding: "5px 10px", background: "#fff", border: "1px solid #fecaca", borderRadius: 4, cursor: "pointer", color: "#dc2626", fontSize: 12, fontFamily: sans }}>
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
        open={modalAbierto} onClose={() => setModalAbierto(false)} tenantId={tenantId}
        clientes={clientes} productos={productos} onSave={agregar}
      />

      <ModalConvertirCotizacion
        open={!!convirtiendo} onClose={() => setConvirtiendo(null)} cotizacion={convirtiendo}
        cliente={convirtiendo ? clientePor(convirtiendo.clienteId) : undefined}
        onConfirmar={async (datos) => { if (convirtiendo) await onConvertir(convirtiendo, datos); }}
      />

      <PrintModalCotizacion
        open={!!imprimiendo} onClose={() => setImprimiendo(null)} cotizacion={imprimiendo}
        cliente={imprimiendo ? clientePor(imprimiendo.clienteId) : undefined}
        empresa={{ nombre: tenant.nombreNegocio, rnc: tenant.rnc }}
      />
    </div>
  );
}
