"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AppSidebar, { type ItemNavApp } from "@/components/ui/app-sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useSandbox } from "@/contexts/SandboxContext";
import { useSidebarCtx } from "@/contexts/SidebarUIContext";
import { ROL_LABEL, ROLES_INVITABLES, tieneAcceso, type Modulo } from "@/lib/tenant/roles";
import type { RolMembership } from "@/types/tenant";

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

const selectEstilo: React.CSSProperties = {
  width: "100%", fontSize: 12, padding: "7px 8px", borderRadius: "var(--radius-md)",
  border: "1px solid var(--c-border)", color: "var(--c-text-3)", fontFamily: "var(--font-sans)", background: "var(--c-surface)",
};

export default function SandboxSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { tenant, tenantId } = useSandbox();
  const { open, setOpen } = useSidebarCtx();

  // Quien explora el sandbox es siempre el dueño (todavía no hay cajeros
  // invitados en esta etapa): este selector es solo para que se adelante a
  // ver cómo quedaría el sistema para un cajero antes de certificarse.
  const [rolPreview, setRolPreview] = useState<RolMembership | null>(null);
  const rolEfectivo = rolPreview ?? "owner";

  useEffect(() => { setOpen(false); }, [pathname, setOpen]);

  const items: ItemNavApp[] = NAV.filter((i) => tieneAcceso(rolEfectivo, i.seg)).map((i) => ({
    ...i, href: `/onboarding/sandbox/${i.seg}?t=${tenantId}`, activo: pathname.endsWith(`/sandbox/${i.seg}`), tour: `nav-${i.seg}`,
  }));

  return (
    <AppSidebar
      abierto={open} onCerrar={() => setOpen(false)}
      nombre={tenant.nombreNegocio} sub="Entorno de prueba" rnc={tenant.rnc}
      insignia={{ texto: "Datos de prueba", tono: "aviso" }}
      selector={
        <select value={rolPreview ?? ""} onChange={(e) => setRolPreview((e.target.value || null) as RolMembership | null)}
          title="Solo para previsualizar, no afecta datos reales" style={selectEstilo}>
          <option value="">Ver como: dueño</option>
          {ROLES_INVITABLES.map((r) => (<option key={r} value={r}>Ver como: {ROL_LABEL[r]}</option>))}
        </select>
      }
      items={items}
      onLogout={logout}
    />
  );
}
