"use client";

import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useClientes } from "@/hooks/use-clientes";
import { useProductos } from "@/hooks/use-productos";
import { useFacturas } from "@/hooks/use-facturas";
import { useCuentasPorCobrar } from "@/hooks/use-cuentas-por-cobrar";
import type { EstadoFactura, Factura } from "@/types";
import { calcTotales, fmt, fmtDate } from "@/types";
import Badge from "@/components/ui/badge";
import Icon  from "@/components/ui/icon";
import ModalNuevaFactura from "@/components/modals/modal-nueva-factura";
import PrintModal from "@/components/print/print-modal";
import { guardarFactura } from "@/lib/sandbox/acciones";

const sans  = "var(--font-sans)";
const mono  = "var(--font-mono)";
const serif = "var(--font-serif)";

function KPICard({ label, valor, sub, accent }: { label: string; valor: string | number; sub: string; accent: string }) {
  return (
    <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderTop: `3px solid ${accent}`, borderRadius: 8, padding: "14px 16px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--c-text-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: sans, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: mono, fontSize: 19, fontWeight: 700, color: "var(--c-text-1)", marginBottom: 2 }}>{valor}</div>
      <div style={{ fontSize: 11, color: "var(--c-text-4)", fontFamily: sans }}>{sub}</div>
    </div>
  );
}

export default function FacturasPage() {
  const tenant = useTenant();
  const { clientes } = useClientes(tenant.tenantId);
  const { productos } = useProductos(tenant.tenantId);
  const { facturas, loading, agregar: agregarFactura, cambiarEstado } = useFacturas(tenant.tenantId);
  const { agregar: agregarCuenta } = useCuentasPorCobrar(tenant.tenantId);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [imprimiendo,  setImprimiendo]  = useState<Factura | null>(null);
  const [busqueda,     setBusqueda]     = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoFactura | "todos">("todos");

  const clientePor = (id: string) => clientes.find((c) => c.id === id);

  const filtradas = facturas.filter((f) => {
    const cliente = clientePor(f.clienteId);
    const nombre  = f.esConsumidorFinal ? (f.nombreConsumidor ?? "Consumidor Final") : (cliente?.nombre ?? "");
    const q = busqueda.toLowerCase();
    const matchBusq = !q || f.eCF.toLowerCase().includes(q) || nombre.toLowerCase().includes(q);
    return matchBusq && (filtroEstado === "todos" || f.estado === filtroEstado);
  });

  const totalCobrado  = facturas.filter((f) => f.estado === "pagada").reduce((s, f) => s + calcTotales(f.items).total, 0);
  const totalPendiente = facturas.filter((f) => f.estado === "pendiente").reduce((s, f) => s + calcTotales(f.items).total, 0);
  const anuladas       = facturas.filter((f) => f.estado === "anulada").length;

  const onSave = async (data: Factura | Omit<Factura, "id">) => {
    await guardarFactura({
      tenantId: tenant.tenantId, rncEmisor: tenant.rnc, nombreEmisor: tenant.nombreNegocio, rootDomain: "",
      agregarFactura, actualizarCotizacion: async () => {}, agregarCuenta,
    }, data);
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: serif, fontSize: 24, fontWeight: 600, color: "var(--c-text-1)", marginBottom: 2 }}>Facturas</h1>
          <div style={{ fontSize: 13, color: "var(--c-text-3)", fontFamily: sans }}>Comprobantes fiscales electrónicos</div>
        </div>
        <button onClick={() => setModalAbierto(true)} disabled={productos.length === 0}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: productos.length === 0 ? "#9ca3af" : "var(--c-brand)", color: "#fff", border: "none", borderRadius: 6, cursor: productos.length === 0 ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, fontFamily: sans }}>
          <Icon name="plus" size={14} /> Nueva Factura
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        <KPICard label="Cobrado"   valor={"RD$ " + fmt(totalCobrado)}    sub="Facturas pagadas"    accent="var(--c-brand)" />
        <KPICard label="Por cobrar" valor={"RD$ " + fmt(totalPendiente)} sub="Facturas pendientes" accent="var(--c-yellow)" />
        <KPICard label="Anuladas"  valor={anuladas}                       sub="Comprobantes"        accent="var(--c-red)" />
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--c-text-4)" }}><Icon name="search" size={14} /></div>
          <input style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, fontFamily: sans, outline: "none" }}
            placeholder="Buscar por e-NCF o cliente..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <select style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, fontFamily: sans, outline: "none" }}
          value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as EstadoFactura | "todos")}>
          <option value="todos">Todos los estados</option>
          <option value="pagada">Pagadas</option>
          <option value="pendiente">Pendientes</option>
          <option value="anulada">Anuladas</option>
        </select>
      </div>

      {productos.length === 0 && (
        <div style={{ padding: "10px 14px", background: "var(--c-yellow-bg)", border: "1px solid var(--c-yellow-border)", borderRadius: 6, fontSize: 12, color: "var(--c-yellow)", fontFamily: sans, marginBottom: 16 }}>
          Agrega al menos un producto o servicio en Inventario antes de facturar.
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--c-text-4)", fontFamily: sans }}>Cargando facturas...</div>
      ) : filtradas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", fontFamily: sans }}>
          <div style={{ fontSize: 16, color: "var(--c-text-2)", fontWeight: 600, marginBottom: 6 }}>{facturas.length === 0 ? "No hay facturas aún" : "Sin resultados"}</div>
          <div style={{ fontSize: 13, color: "var(--c-text-4)" }}>{facturas.length === 0 ? "Emite tu primera factura" : "Ajusta los filtros"}</div>
        </div>
      ) : (
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--c-bg)", borderBottom: "2px solid var(--c-border)" }}>
                {["e-CF", "Tipo", "Fecha", "Cliente", "Total", "Estado", "DGII", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--c-text-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: sans, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((f) => {
                const cliente = clientePor(f.clienteId);
                const nombre  = f.esConsumidorFinal ? (f.nombreConsumidor ?? "Consumidor Final") : (cliente?.nombre ?? "—");
                return (
                  <tr key={f.id} style={{ borderBottom: "1px solid var(--c-border-lt)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--c-bg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                    <td style={{ padding: "11px 14px", fontFamily: mono, fontSize: 12, fontWeight: 700, color: "var(--c-text-1)" }}>{f.eCF}</td>
                    <td style={{ padding: "11px 14px", fontFamily: mono, fontSize: 11, color: "var(--c-text-3)" }}>{f.tipoECF}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--c-text-3)", fontFamily: sans }}>{fmtDate(f.fecha)}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, color: "var(--c-text-2)", fontFamily: sans }}>{nombre}</td>
                    <td style={{ padding: "11px 14px", fontFamily: mono, fontSize: 13, fontWeight: 700, color: "var(--c-text-1)" }}>RD$ {fmt(calcTotales(f.items).total)}</td>
                    <td style={{ padding: "11px 14px" }}><Badge estado={f.estado} /></td>
                    <td style={{ padding: "11px 14px" }}>{f.estadoDGII === "Aceptado" ? <Badge tipo="success">Aceptado</Badge> : f.estadoDGII === "Rechazado" ? <Badge tipo="danger">Rechazado</Badge> : <Badge tipo="neutral">{f.estadoDGII ?? "—"}</Badge>}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setImprimiendo(f)} style={{ padding: "5px 10px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", color: "var(--c-text-2)", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontFamily: sans }}>
                          <Icon name="print" size={12} /> Imprimir
                        </button>
                        {f.estado !== "anulada" && (
                          <button onClick={() => cambiarEstado(f.id, "anulada")} style={{ padding: "5px 10px", background: "#fff", border: "1px solid var(--c-red-border)", borderRadius: 6, cursor: "pointer", color: "var(--c-red)", fontSize: 12, fontFamily: sans }}>
                            Anular
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ModalNuevaFactura
        open={modalAbierto} onClose={() => setModalAbierto(false)} tenantId={tenant.tenantId}
        clientes={clientes} productos={productos} modo="produccion"
        onSave={onSave}
      />

      <PrintModal
        open={!!imprimiendo} onClose={() => setImprimiendo(null)} factura={imprimiendo}
        cliente={imprimiendo ? clientePor(imprimiendo.clienteId) : undefined}
        empresa={{ nombre: tenant.nombreNegocio, rnc: tenant.rnc }}
        esMuestra={false}
      />
    </div>
  );
}
