"use client";

import { useState } from "react";
import { SidebarCtx } from "@/contexts/SidebarUIContext";
import TenantSidebar from "@/components/tenant/tenant-sidebar";
import TenantTopbar from "@/components/tenant/tenant-topbar";

// Shell del sistema real (Fase 7) — mismo armazón que SandboxShell
// (app/onboarding/sandbox/layout.tsx) pero sin DemoBanner ni TourProvider,
// porque aquí ya no es un entorno de prueba.
export default function TenantShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SidebarCtx.Provider value={{ open: sidebarOpen, setOpen: setSidebarOpen }}>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <TenantSidebar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <TenantTopbar />
          <main style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            {children}
          </main>
        </div>
      </div>
    </SidebarCtx.Provider>
  );
}
