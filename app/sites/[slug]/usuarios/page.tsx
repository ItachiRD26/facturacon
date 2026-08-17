"use client";

import { useCallback, useEffect, useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { ROL_LABEL, ROLES_INVITABLES } from "@/lib/tenant/roles";
import { Boton, Campo, Input, Select, EmptyState } from "@/components/sandbox/ui";
import type { RolMembership } from "@/types/tenant";

interface MiembroEquipo { uid: string; rol: RolMembership; nombre: string; email: string; creadoEn?: string }

export default function UsuariosPage() {
  const tenant = useTenant();
  const esAdmin = tenant.rol === "owner" || tenant.rol === "admin";

  const [equipo, setEquipo] = useState<MiembroEquipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<RolMembership>("vendedor");
  const [invitando, setInvitando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/usuarios?t=${tenant.tenantId}`);
      const data = await res.json();
      if (res.ok) setEquipo(data.equipo ?? []);
    } finally { setLoading(false); }
  }, [tenant.tenantId]);

  useEffect(() => { if (esAdmin) cargar(); }, [esAdmin, cargar]);

  if (!esAdmin) {
    return <EmptyState texto="Esta sección es solo para el dueño o administradores de la cuenta." />;
  }

  const invitar = async () => {
    if (!email.trim()) return;
    setInvitando(true); setError("");
    try {
      const res = await fetch("/api/tenant/usuarios", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenant.tenantId, email: email.trim(), rol }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo invitar.");
      setEmail(""); setRol("vendedor");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally { setInvitando(false); }
  };

  const cambiarRol = async (uid: string, nuevoRol: RolMembership) => {
    setError("");
    try {
      const res = await fetch("/api/tenant/usuarios/rol", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenant.tenantId, uid, rol: nuevoRol }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo cambiar el rol.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    }
  };

  const eliminar = async (uid: string, nombre: string) => {
    if (!confirm(`¿Quitar a ${nombre} de tu equipo? Perderá acceso al sistema.`)) return;
    setError("");
    try {
      const res = await fetch("/api/tenant/usuarios/eliminar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenant.tenantId, uid }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo eliminar.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 600, color: "var(--c-text-1)", marginBottom: 2 }}>
          Usuarios
        </h1>
        <div style={{ fontSize: 13, color: "var(--c-text-3)" }}>
          Invita a tu equipo (cajeros, contadores) y controla qué puede ver y hacer cada quien.
        </div>
      </div>

      <div style={{
        border: "1px solid var(--c-border)", borderRadius: 8, padding: 18, background: "var(--c-surface)", marginBottom: 20,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Invitar a alguien</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 240px" }}>
            <Campo label="Correo (debe tener cuenta de Facturacon ya creada)">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cajero@ejemplo.com" />
            </Campo>
          </div>
          <div style={{ flex: "0 1 180px" }}>
            <Campo label="Rol">
              <Select value={rol} onChange={(e) => setRol(e.target.value as RolMembership)}>
                {ROLES_INVITABLES.map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
              </Select>
            </Campo>
          </div>
          <Boton onClick={invitar} disabled={invitando || !email.trim()}>
            {invitando ? "Invitando..." : "Invitar"}
          </Boton>
        </div>
        {error && <div style={{ fontSize: 12, color: "#991b1b", marginTop: 10 }}>{error}</div>}
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--c-text-3)" }}>Cargando...</div>
      ) : equipo.length === 0 ? (
        <EmptyState texto="Todavía no hay nadie más en tu equipo." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {equipo.map((m) => (
            <div key={m.uid} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
              border: "1px solid var(--c-border)", borderRadius: 8, padding: "12px 16px", background: "var(--c-surface)",
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.nombre}</div>
                <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>{m.email}</div>
              </div>
              {m.rol === "owner" ? (
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--c-text-3)" }}>Dueño</span>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Select value={m.rol} onChange={(e) => cambiarRol(m.uid, e.target.value as RolMembership)} style={{ fontSize: 12, padding: "6px 8px" }}>
                    {ROLES_INVITABLES.map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                  </Select>
                  <Boton variant="danger" onClick={() => eliminar(m.uid, m.nombre)}>Quitar</Boton>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
