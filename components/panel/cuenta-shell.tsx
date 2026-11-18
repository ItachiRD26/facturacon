"use client";

import { useState } from "react";
import { SidebarCtx } from "@/contexts/SidebarUIContext";
import type { RolMembership, Tenant } from "@/types/tenant";
import CuentaSidebar from "./cuenta-sidebar";
import CuentaTopbar from "./cuenta-topbar";
import { useAuth } from "@/contexts/AuthContext";

export default function CuentaShell({
  tenant, tenantId, multiplesEmpresas, rol, children,
}: { tenant: Tenant; tenantId: string; multiplesEmpresas: boolean; rol: RolMembership; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  // Una sesión de caja (entró con código) no administra el negocio: se avisa y se ofrece cambiar de cuenta.
  const esSesionDeCaja = rol === "vendedor" || rol === "operador" || rol === "almacen";

  return (
    <SidebarCtx.Provider value={{ open: sidebarOpen, setOpen: setSidebarOpen }}>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <CuentaSidebar tenant={tenant} tenantId={tenantId} multiplesEmpresas={multiplesEmpresas} rol={rol} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <CuentaTopbar />
          {esSesionDeCaja && (
            <div role="status" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "10px 24px", background: "var(--c-yellow-bg)", borderBottom: "1px solid var(--c-border)", fontSize: 13, color: "var(--c-text-2)" }}>
              <span>Esta es una <b>sesión de caja</b>: no administra el negocio. Para administrar, cierra esta sesión y entra con tu correo.</span>
              <button onClick={logout} style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cerrar sesión y entrar como dueño</button>
            </div>
          )}
          <main style={{ flex: 1, overflowY: "auto", padding: "28px 24px 48px" }}>
            {children}
          </main>
        </div>
      </div>
    </SidebarCtx.Provider>
  );
}
