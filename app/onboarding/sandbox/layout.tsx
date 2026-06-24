"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SandboxProvider } from "@/contexts/SandboxContext";
import { SidebarCtx } from "@/contexts/SidebarUIContext";
import type { Tenant } from "@/types/tenant";
import SandboxSidebar from "@/components/sandbox/sandbox-sidebar";
import SandboxTopbar from "@/components/sandbox/sandbox-topbar";
import DemoBanner from "@/components/sandbox/demo-banner";
import TourProvider from "@/components/tour/tour-provider";
import { SANDBOX_TOUR_STEPS } from "@/components/tour/sandbox-tour-steps";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
const sans = "var(--font-sans)";

function SandboxShell({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("t") ?? "";

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [cargando, setCargando] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!tenantId) { setCargando(false); return; }
    getDoc(doc(db, "tenants", tenantId)).then((snap) => {
      if (snap.exists()) setTenant({ id: snap.id, ...snap.data() } as Tenant);
      setCargando(false);
    });
  }, [tenantId]);

  if (!tenantId || (!cargando && !tenant)) {
    return (
      <main style={{ maxWidth: 480, margin: "80px auto", padding: "0 24px", fontFamily: sans, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--c-text-3)" }}>
          No encontramos tu empresa de prueba. Vuelve a empezar el registro.
        </p>
        <a href="/onboarding" style={{ color: "var(--c-brand)", fontWeight: 600, fontSize: 13 }}>← Volver al onboarding</a>
      </main>
    );
  }

  if (cargando || !tenant) {
    return <main style={{ padding: 60, textAlign: "center", fontFamily: sans, color: "var(--c-text-3)" }}>Cargando tu entorno de prueba...</main>;
  }

  return (
    <SandboxProvider value={{ tenantId, tenant, rootDomain: ROOT_DOMAIN }}>
      <TourProvider tenantId={tenantId} steps={SANDBOX_TOUR_STEPS}>
        <SidebarCtx.Provider value={{ open: sidebarOpen, setOpen: setSidebarOpen }}>
          <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
            <DemoBanner />
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              <SandboxSidebar />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
                <SandboxTopbar />
                <main style={{ flex: 1, overflowY: "auto", padding: 20 }}>
                  {children}
                </main>
              </div>
            </div>
          </div>
        </SidebarCtx.Provider>
      </TourProvider>
    </SandboxProvider>
  );
}

export default function SandboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<main style={{ padding: 60, textAlign: "center" }}>Cargando...</main>}>
      <SandboxShell>{children}</SandboxShell>
    </Suspense>
  );
}
