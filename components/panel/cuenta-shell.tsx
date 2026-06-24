"use client";

import { useState } from "react";
import { SidebarCtx } from "@/contexts/SidebarUIContext";
import type { Tenant } from "@/types/tenant";
import CuentaSidebar from "./cuenta-sidebar";
import CuentaTopbar from "./cuenta-topbar";

export default function CuentaShell({
  tenant, tenantId, multiplesEmpresas, children,
}: { tenant: Tenant; tenantId: string; multiplesEmpresas: boolean; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SidebarCtx.Provider value={{ open: sidebarOpen, setOpen: setSidebarOpen }}>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <CuentaSidebar tenant={tenant} tenantId={tenantId} multiplesEmpresas={multiplesEmpresas} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <CuentaTopbar />
          <main style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            {children}
          </main>
        </div>
      </div>
    </SidebarCtx.Provider>
  );
}
