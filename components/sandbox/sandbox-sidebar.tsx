"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/icon";
import Logo from "@/components/ui/logo";
import { useAuth } from "@/contexts/AuthContext";
import { useSandbox } from "@/contexts/SandboxContext";
import { useSidebarCtx } from "@/contexts/SidebarUIContext";
import { ROL_LABEL, ROLES_INVITABLES, tieneAcceso, type Modulo } from "@/lib/tenant/roles";
import type { RolMembership } from "@/types/tenant";

const NAV: { seg: Modulo; label: string; icon: string }[] = [
  { seg: "dashboard",            label: "Dashboard",          icon: "dashboard" },
  { seg: "facturas",             label: "Facturas",           icon: "invoice"   },
  { seg: "cotizaciones",         label: "Cotizaciones",       icon: "quotes"    },
  { seg: "cuentas-por-cobrar",   label: "Cuentas por Cobrar", icon: "alert"     },
  { seg: "clientes",             label: "Clientes",           icon: "clients"   },
  { seg: "inventario",           label: "Inventario",         icon: "products"  },
  { seg: "recibidas",            label: "Facturas Recibidas", icon: "invoice"   },
  { seg: "personalizacion",      label: "Personalización",    icon: "settings"  },
];

const serif = "var(--font-serif)";
const sans  = "var(--font-sans)";
const mono  = "var(--font-mono)";

export default function SandboxSidebar() {
  const pathname          = usePathname();
  const { logout }        = useAuth();
  const { tenant, tenantId } = useSandbox();
  const { open, setOpen }  = useSidebarCtx();

  // Quien explora el sandbox es siempre el dueño (todavía no hay cajeros
  // invitados en esta etapa) — este selector es solo para que se adelante a
  // ver cómo quedaría el sistema para un cajero antes de certificarse.
  const [rolPreview, setRolPreview] = useState<RolMembership | null>(null);
  const rolEfectivo = rolPreview ?? "owner";

  useEffect(() => { setOpen(false); }, [pathname, setOpen]);

  const hrefDe = (seg: string) => `/onboarding/sandbox/${seg}?t=${tenantId}`;
  const active = (seg: string) => pathname.endsWith(`/sandbox/${seg}`);
  const navVisible = NAV.filter((item) => tieneAcceso(rolEfectivo, item.seg));

  return (
    <>
      <div className={`sidebar-overlay ${open ? "open" : ""}`} onClick={() => setOpen(false)} />
      <aside
        className={`sidebar-responsive ${open ? "open" : ""}`}
        style={{
          width: 224, background: "#fff", borderRight: "1px solid #e5e7eb",
          display: "flex", flexDirection: "column", height: "100vh", flexShrink: 0,
        }}
      >
        {/* Marca */}
        <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Logo variant="icon" size={32} />
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: serif, fontSize: 13, fontWeight: 700, color: "#111", lineHeight: 1.2,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {tenant.nombreNegocio}
              </div>
              <div style={{ fontSize: 10, color: "#9ca3af", fontFamily: mono }}>Entorno de prueba</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "#9ca3af", fontFamily: mono, marginBottom: 6 }}>
            RNC {tenant.rnc}
          </div>
          <div style={{
            display: "inline-block", background: "#fffbeb", color: "#92400e",
            border: "1px solid #fde68a", padding: "2px 8px", borderRadius: 3,
            fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", fontFamily: sans,
          }}>
            DATOS DE PRUEBA
          </div>
        </div>

        <div style={{ padding: "10px 14px 0" }}>
          <select
            value={rolPreview ?? ""} onChange={(e) => setRolPreview((e.target.value || null) as RolMembership | null)}
            title="Solo para previsualizar — no afecta datos reales"
            style={{
              width: "100%", fontSize: 11, padding: "5px 6px", borderRadius: 4,
              border: "1px solid #e5e7eb", color: "#6b7280", fontFamily: sans, background: "#fff",
            }}
          >
            <option value="">Ver como: dueño</option>
            {ROLES_INVITABLES.map((r) => (
              <option key={r} value={r}>Ver como: {ROL_LABEL[r]}</option>
            ))}
          </select>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: 10, display: "flex", flexDirection: "column", gap: 1, overflowY: "auto" }}>
          {navVisible.map(({ seg, label, icon }) => {
            const isActive = active(seg);
            return (
              <Link key={seg} href={hrefDe(seg)} data-tour={`nav-${seg}`} style={{
                display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", borderRadius: 4,
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                background: isActive ? "#ecfeff" : "transparent",
                color: isActive ? "#0e7490" : "#6b7280",
                borderLeft: isActive ? "2px solid #0e7490" : "2px solid transparent",
                textDecoration: "none", fontFamily: sans, transition: "all 0.1s",
              }}>
                <Icon name={icon} size={14} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer usuario */}
        <div style={{ padding: "14px 16px", borderTop: "1px solid #e5e7eb" }}>
          <button
            onClick={logout}
            style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "7px 10px", background: "none", border: "1px solid #e5e7eb", borderRadius: 4, cursor: "pointer", fontSize: 12, color: "#6b7280", fontFamily: sans }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#991b1b"; e.currentTarget.style.borderColor = "#fecaca"; e.currentTarget.style.background = "#fef2f2"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#6b7280"; e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "none"; }}
          >
            <Icon name="logout" size={13} />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
