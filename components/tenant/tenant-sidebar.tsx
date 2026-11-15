"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Logo from "@/components/ui/logo";
import AppSidebar, { type ItemNavApp } from "@/components/ui/app-sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
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

// Sidebar del sistema real: mismo diseño que el del sandbox (ambos usan
// components/ui/app-sidebar.tsx) pero con las rutas bajo el subdominio del
// tenant — aquí no hay query param ?t=, el proxy ya resolvió el tenant.
export default function TenantSidebar() {
  const pathname = usePathname();
  const { logout, perfil } = useAuth();
  const tenant = useTenant();
  const { open, setOpen } = useSidebarCtx();
  const esAdmin = tenant.rol === "owner" || tenant.rol === "admin";

  // "Ver como": solo owner/admin, solo cambia qué ítems se muestran en este
  // sidebar (para previsualizar rápido qué vería un cajero) — no toca los
  // permisos reales de Firestore, que dependen del rol real de cada quien.
  const [rolPreview, setRolPreview] = useState<RolMembership | null>(null);
  const rolEfectivo = esAdmin && rolPreview ? rolPreview : tenant.rol;

  useEffect(() => { setOpen(false); }, [pathname, setOpen]);

  const items: ItemNavApp[] = NAV.filter((i) => tieneAcceso(rolEfectivo, i.seg)).map((i) => ({
    ...i, href: `/${i.seg}`, activo: pathname.endsWith(`/${i.seg}`),
  }));

  return (
    <AppSidebar
      abierto={open} onCerrar={() => setOpen(false)}
      nombre={tenant.nombreNegocio} sub={tenant.slug ?? "Tu empresa"} rnc={tenant.rnc}
      insignia={{ texto: "Emisor certificado", tono: "ok" }}
      selector={esAdmin ? (
        <select value={rolPreview ?? ""} onChange={(e) => setRolPreview((e.target.value || null) as RolMembership | null)}
          title="Solo cambia lo que ves aquí, no tus permisos reales" style={selectEstilo}>
          <option value="">Ver como: yo ({ROL_LABEL[tenant.rol]})</option>
          {ROLES_INVITABLES.filter((r) => r !== tenant.rol).map((r) => (
            <option key={r} value={r}>Ver como: {ROL_LABEL[r]}</option>
          ))}
        </select>
      ) : undefined}
      items={items}
      // Confirma quién es la sesión activa: importante sobre todo para empleados
      // que entran por código (sin correo visible) o en una caja compartida.
      usuario={{ nombre: perfil?.nombre || "Tu cuenta", detalle: ROL_LABEL[tenant.rol] }}
      onLogout={logout}
      pie={<div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--c-text-4)" }}>
        Con tecnología de <Logo variant="icon" size={14} /> <span style={{ fontWeight: 700, color: "var(--c-text-3)" }}>Facturacon</span>
      </div>}
    />
  );
}
