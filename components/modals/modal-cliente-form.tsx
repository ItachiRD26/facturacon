"use client";

import { useEffect, useState } from "react";
import type { Cliente, SubtipoJuridica, TipoPersona } from "@/types";
import Modal from "./modal";
import { Boton, Campo, Input, Select } from "@/components/sandbox/ui";

const TIPOS: { v: TipoPersona; label: string }[] = [
  { v: "consumidor", label: "Consumidor final" },
  { v: "fisica", label: "Persona física" },
  { v: "juridica", label: "Empresa (jurídica)" },
];

const SUBTIPOS: { v: SubtipoJuridica; label: string }[] = [
  { v: "regular", label: "Regular" },
  { v: "gobierno", label: "Entidad gubernamental" },
  { v: "zona_franca", label: "Zona franca" },
  { v: "exportacion", label: "Exportación" },
];

type RncEstado = "idle" | "checking" | "valid" | "invalid" | "error";

export default function ModalClienteForm({
  open, onClose, onSave, inicial,
}: {
  open: boolean; onClose: () => void; onSave: (data: Omit<Cliente, "id">) => Promise<void>;
  inicial?: Cliente | null;
}) {
  const [tipo, setTipo] = useState<TipoPersona>("fisica");
  const [subtipo, setSubtipo] = useState<SubtipoJuridica>("regular");
  const [rnc, setRnc] = useState("");
  const [rncEstado, setRncEstado] = useState<RncEstado>("idle");
  const [rncNombre, setRncNombre] = useState("");
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [contacto, setContacto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTipo(inicial?.tipo ?? "fisica");
    setSubtipo(inicial?.subtipo ?? "regular");
    setRnc(inicial?.rnc ?? "");
    setRncEstado("idle"); setRncNombre("");
    setNombre(inicial?.nombre ?? "");
    setDireccion(inicial?.direccion ?? "");
    setCiudad(inicial?.ciudad ?? "");
    setContacto(inicial?.contacto ?? "");
    setTelefono(inicial?.telefono ?? "");
    setEmail(inicial?.email ?? "");
  }, [open, inicial]);

  const validarRnc = async () => {
    const digits = rnc.replace(/\D/g, "");
    if (digits.length !== 9 && digits.length !== 11) return;
    setRncEstado("checking");
    try {
      const res = await fetch(`/api/validate-rnc?number=${digits}`);
      const data = await res.json();
      if (data.valid) {
        setRncEstado("valid"); setRncNombre(data.name);
        if (!nombre) setNombre(data.name);
      } else setRncEstado("invalid");
    } catch { setRncEstado("error"); }
  };

  const submit = async () => {
    if (!nombre.trim()) return;
    setGuardando(true);
    try {
      await onSave({
        tipo, subtipo: tipo === "juridica" ? subtipo : undefined,
        rnc: tipo === "consumidor" ? "" : rnc.replace(/\D/g, ""),
        nombre: nombre.trim(), direccion, ciudad, contacto, telefono,
        email: email.trim() || undefined,
      });
      onClose();
    } finally { setGuardando(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={inicial ? "Editar cliente" : "Nuevo cliente"}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Campo label="Tipo de cliente">
          <div style={{ display: "flex", gap: 6 }}>
            {TIPOS.map((t) => (
              <button key={t.v} type="button" onClick={() => setTipo(t.v)} style={{
                flex: 1, padding: "8px 6px", fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer",
                border: `1px solid ${tipo === t.v ? "var(--c-brand)" : "var(--c-border)"}`,
                background: tipo === t.v ? "var(--c-brand-bg)" : "var(--c-surface)",
              }}>{t.label}</button>
            ))}
          </div>
        </Campo>

        {tipo === "juridica" && (
          <Campo label="Subtipo">
            <Select value={subtipo} onChange={(e) => setSubtipo(e.target.value as SubtipoJuridica)}>
              {SUBTIPOS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
            </Select>
          </Campo>
        )}

        {tipo !== "consumidor" && (
          <Campo label="RNC / Cédula">
            <div style={{ display: "flex", gap: 8 }}>
              <Input value={rnc} onChange={(e) => { setRnc(e.target.value); setRncEstado("idle"); }} placeholder="131217656" />
              <Boton variant="secondary" onClick={validarRnc} disabled={rncEstado === "checking"}>
                {rncEstado === "checking" ? "..." : "Validar"}
              </Boton>
            </div>
            {rncEstado === "valid" && <div style={{ fontSize: 12, color: "#166534", marginTop: 4 }}>✓ {rncNombre}</div>}
            {rncEstado === "invalid" && <div style={{ fontSize: 12, color: "#991b1b", marginTop: 4 }}>No encontrado en el padrón de la DGII.</div>}
          </Campo>
        )}

        <Campo label="Nombre / Razón social">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del cliente" />
        </Campo>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Campo label="Dirección">
            <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          </Campo>
          <Campo label="Ciudad">
            <Input value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
          </Campo>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Campo label="Teléfono">
            <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="809-000-0000" />
          </Campo>
          <Campo label="Contacto">
            <Input value={contacto} onChange={(e) => setContacto(e.target.value)} />
          </Campo>
        </div>

        <Campo label="Email (opcional)">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </Campo>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <Boton variant="secondary" onClick={onClose}>Cancelar</Boton>
          <Boton onClick={submit} disabled={guardando || !nombre.trim()}>{guardando ? "Guardando..." : "Guardar"}</Boton>
        </div>
      </div>
    </Modal>
  );
}
