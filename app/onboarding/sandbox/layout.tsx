"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SandboxProvider } from "@/contexts/SandboxContext";
import { SidebarCtx } from "@/contexts/SidebarUIContext";
import type { RolMembership, Tenant } from "@/types/tenant";
import { tieneAcceso, type Modulo } from "@/lib/tenant/roles";
import { ROLES_PRUEBA, ROL_PRUEBA_INICIAL } from "@/lib/sandbox/roles-prueba";
import PanelRolPrueba from "@/components/sandbox/panel-rol-prueba";
import ModuloNoDisponible from "@/components/sandbox/modulo-no-disponible";
import SandboxSidebar from "@/components/sandbox/sandbox-sidebar";
import SandboxTopbar from "@/components/sandbox/sandbox-topbar";
import DemoBanner from "@/components/sandbox/demo-banner";
import TourProvider from "@/components/tour/tour-provider";
import { pasosTour } from "@/components/tour/sandbox-tour-steps";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
const MODULOS: Modulo[] = ["dashboard", "facturas", "cotizaciones", "clientes", "inventario", "cuentas-por-cobrar", "recibidas", "personalizacion"];
const sans = "var(--font-sans)";

function SandboxShell({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const tenantId = searchParams.get("t") ?? "";

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [cargando, setCargando] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Rol con el que se prueba el sistema: arranca como cajero (lo principal es facturar)
  // y se recuerda mientras dure la pestaña. Es solo una vista, no cambia permisos reales.
  const claveRol = `facturacon_rol_prueba_${tenantId}`;
  const [rol, setRolEstado] = useState<RolMembership>(ROL_PRUEBA_INICIAL);
  useEffect(() => {
    try {
      const guardado = window.sessionStorage.getItem(claveRol) as RolMembership | null;
      if (guardado && ROLES_PRUEBA.includes(guardado)) setRolEstado(guardado);
    } catch { /* sin almacenamiento: se queda el rol inicial */ }
  }, [claveRol]);
  const setRol = useCallback((r: RolMembership) => {
    setRolEstado(r);
    try { window.sessionStorage.setItem(claveRol, r); } catch { /* opcional */ }
  }, [claveRol]);
  const pasos = useMemo(() => pasosTour(rol), [rol]);

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

  // Si el rol que se prueba no puede ver esta pantalla, se explica en vez de abrirla.
  const seg = pathname.split("/sandbox/")[1]?.split("/")[0] as Modulo | undefined;
  const moduloBloqueado = seg && MODULOS.includes(seg) && !tieneAcceso(rol, seg) ? seg : null;

  return (
    <SandboxProvider value={{ tenantId, tenant, rootDomain: ROOT_DOMAIN, rol, setRol }}>
      <TourProvider tenantId={tenantId} steps={pasos}>
        <SidebarCtx.Provider value={{ open: sidebarOpen, setOpen: setSidebarOpen }}>
          <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
            <DemoBanner />
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              <SandboxSidebar />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
                <SandboxTopbar />
                <PanelRolPrueba />
                <main style={{ flex: 1, overflowY: "auto", padding: 20 }}>
                  {moduloBloqueado ? <ModuloNoDisponible modulo={moduloBloqueado} /> : children}
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
