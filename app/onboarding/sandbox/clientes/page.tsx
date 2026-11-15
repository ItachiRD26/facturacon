"use client";

import { useState } from "react";
import { useSandbox } from "@/contexts/SandboxContext";
import { useClientes } from "@/hooks/use-clientes";
import type { Cliente } from "@/types";
import Icon from "@/components/ui/icon";
import ModalClienteForm from "@/components/modals/modal-cliente-form";

const sans  = "var(--font-sans)";
const mono  = "var(--font-mono)";
const serif = "var(--font-serif)";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1px solid #CDD1C9", borderRadius: 8,
  fontSize: 13, color: "var(--c-text-1)", outline: "none", fontFamily: sans, background: "var(--c-surface)", boxSizing: "border-box",
};

function TipoBadge({ tipo }: { tipo: string }) {
  const map: Record<string, { label: string; bg: string; color: string; border: string }> = {
    juridica:   { label: "Jurídica",    bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
    fisica:     { label: "Física",      bg: "#f0faf4", color: "#166534", border: "#bbf7d0" },
    consumidor: { label: "Cons. Final", bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
  };
  const s = map[tipo] ?? map.juridica;
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: sans, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

export default function SandboxClientesPage() {
  const { tenantId } = useSandbox();
  const { clientes, loading, error, agregar, actualizar, eliminar } = useClientes(tenantId);
  const [search,     setSearch]     = useState("");
  const [modal,      setModal]      = useState<"nuevo" | "editar" | null>(null);
  const [selected,   setSelected]   = useState<Cliente | null>(null);
  const [confirmId,  setConfirmId]  = useState<string | null>(null);
  const [tipoFiltro, setTipoFiltro] = useState("todos");

  const filtered = clientes.filter((c) => {
    const matchSearch = c.nombre.toLowerCase().includes(search.toLowerCase()) || c.rnc.includes(search.replace(/\D/g, "")) || c.ciudad.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (tipoFiltro === "todos" || c.tipo === tipoFiltro);
  });

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }} data-tour="page-clientes">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: "1px solid var(--c-border)" }}>
        <div>
          <h1 style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: "var(--c-text-1)" }}>Clientes</h1>
          <p style={{ fontSize: 13, color: "var(--c-text-3)", marginTop: 3, fontFamily: sans }}>{clientes.length} cliente{clientes.length !== 1 ? "s" : ""} de prueba registrado{clientes.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setModal("nuevo")} data-tour="btn-nuevo-cliente"
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "var(--c-text-1)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: sans }}>
          <Icon name="plus" size={14} /> Nuevo Cliente
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--c-text-4)" }}><Icon name="search" size={14} /></div>
          <input style={{ ...inputStyle, paddingLeft: 34 }} placeholder="Buscar por nombre, RNC o ciudad..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[{ val: "todos", label: "Todos" }, { val: "juridica", label: "Jurídicas" }, { val: "fisica", label: "Físicas" }, { val: "consumidor", label: "Cons. Final" }].map((f) => (
            <button key={f.val} onClick={() => setTipoFiltro(f.val)}
              style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: sans, border: `1px solid ${tipoFiltro === f.val ? "var(--c-text-1)" : "var(--c-border)"}`, background: tipoFiltro === f.val ? "var(--c-text-1)" : "#fff", color: tipoFiltro === f.val ? "#fff" : "var(--c-text-2)", fontWeight: tipoFiltro === f.val ? 600 : 400 }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ padding: 32, textAlign: "center", color: "var(--c-text-4)", fontFamily: sans }}>Cargando clientes...</div>}
      {error   && <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b", fontSize: 13, fontFamily: sans }}>{error}</div>}

      {!loading && (
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: sans }}>
            <thead>
              <tr style={{ background: "#FAFAF8", borderBottom: "1px solid var(--c-border)" }}>
                {["RNC / Cédula", "Nombre", "Ciudad", "Contacto", "Teléfono", "Tipo", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--c-text-3)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--c-border-lt)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#fafafa"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}>
                  <td style={{ padding: "11px 14px", fontFamily: mono, fontSize: 12, color: "var(--c-text-2)" }}>{c.rnc || <span style={{ color: "#CDD1C9", fontStyle: "italic", fontSize: 11 }}>No indicada</span>}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 500, color: "var(--c-text-1)" }}>
                    <div>{c.nombre}</div>
                    {c.email && <div style={{ fontSize: 11, color: "var(--c-text-4)", marginTop: 2 }}>{c.email}</div>}
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--c-text-2)" }}>{c.ciudad}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--c-text-2)" }}>{c.contacto}</td>
                  <td style={{ padding: "11px 14px", fontFamily: mono, fontSize: 12 }}>{c.telefono}</td>
                  <td style={{ padding: "11px 14px" }}><TipoBadge tipo={c.tipo} /></td>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => { setSelected(c); setModal("editar"); }} style={{ background: "none", border: "1px solid var(--c-border)", borderRadius: 8, padding: "5px 7px", cursor: "pointer", color: "var(--c-text-2)", display: "flex" }}><Icon name="edit" size={13} /></button>
                      <button onClick={() => setConfirmId(c.id)} style={{ background: "none", border: "1px solid #fecaca", borderRadius: 8, padding: "5px 7px", cursor: "pointer", color: "#dc2626", display: "flex" }}><Icon name="trash" size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <div style={{ padding: 32, textAlign: "center", color: "var(--c-text-4)", fontFamily: sans, fontSize: 13 }}>
              {search || tipoFiltro !== "todos" ? "No se encontraron clientes con ese filtro" : "Agrega tu primer cliente de prueba para empezar a facturar"}
            </div>
          )}
        </div>
      )}

      <ModalClienteForm
        open={modal === "nuevo" || modal === "editar"} inicial={modal === "editar" ? selected : null}
        onClose={() => { setModal(null); setSelected(null); }}
        onSave={async (data) => { if (modal === "editar" && selected) await actualizar(selected.id, data); else await agregar(data); }}
      />

      {confirmId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--c-surface)", borderRadius: 8, width: "100%", maxWidth: 400, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ fontFamily: serif, fontSize: 17, fontWeight: 700, color: "var(--c-text-1)", marginBottom: 10 }}>Eliminar cliente</div>
            <p style={{ fontSize: 13, color: "var(--c-text-3)", fontFamily: sans, marginBottom: 20 }}>Esta acción no se puede deshacer. Es solo un cliente de prueba.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmId(null)} style={{ padding: "8px 14px", background: "var(--c-surface)", color: "var(--c-text-2)", border: "1px solid #CDD1C9", borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: sans }}>Cancelar</button>
              <button onClick={async () => { await eliminar(confirmId); setConfirmId(null); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: sans }}>
                <Icon name="trash" size={13} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
