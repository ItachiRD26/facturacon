"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import AppSidebar, { type ItemNavApp } from "@/components/ui/app-sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useSandbox } from "@/contexts/SandboxContext";
import { useSidebarCtx } from "@/contexts/SidebarUIContext";
import { tieneAcceso, type Modulo } from "@/lib/tenant/roles";

const NAV: { seg: Modulo; label: string; icon: string; grupo?: string }[] = [
  { seg: "dashboard",          label: "Dashboard",          icon: "dashboard" },
  { seg: "facturas",           label: "Facturas",           icon: "invoice"   },
  { seg: "cotizaciones",       label: "Cotizaciones",       icon: "quotes"    },
  { seg: "clientes",           label: "Clientes",           icon: "clients"   },
  { seg: "inventario",         label: "Inventario",         icon: "products"  },
  { seg: "cuentas-por-cobrar", label: "Cuentas por cobrar", icon: "wallet",   grupo: "Cobranza" },
  { seg: "recibidas",          label: "Facturas recibidas", icon: "tray",     grupo: "Cobranza" },
  { seg: "personalizacion",    label: "Personalización",    icon: "settings", grupo: "Ajustes"  },
];

export default function SandboxSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { tenant, tenantId, rol } = useSandbox();
  const { open, setOpen } = useSidebarCtx();

  // El rol que se prueba se elige en el panel "Probando como" (arriba, visible), no aquí.
  useEffect(() => { setOpen(false); }, [pathname, setOpen]);

  const items: ItemNavApp[] = NAV.filter((i) => tieneAcceso(rol, i.seg)).map((i) => ({
    ...i, href: `/onboarding/sandbox/${i.seg}?t=${tenantId}`, activo: pathname.endsWith(`/sandbox/${i.seg}`), tour: `nav-${i.seg}`,
  }));

  return (
    <AppSidebar
      abierto={open} onCerrar={() => setOpen(false)}
      nombre={tenant.nombreNegocio} sub="Entorno de prueba" rnc={tenant.rnc}
      insignia={{ texto: "Datos de prueba", tono: "aviso" }}
      items={items}
      onLogout={logout}
    />
  );
}
