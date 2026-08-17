"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/icon";
import Logo from "@/components/ui/logo";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useSidebarCtx } from "@/contexts/SidebarUIContext";
import { ROL_LABEL, ROLES_INVITABLES, tieneAcceso, type Modulo } from "@/lib/tenant/roles";
import type { RolMembership } from "@/types/tenant";

const NAV: { seg: Modulo; label: string; icon: string }[] = [
  { seg: "dashboard",          label: "Dashboard",          icon: "dashboard" },
  { seg: "facturas",           label: "Facturas",           icon: "invoice"   },
  { seg: "cotizaciones",       label: "Cotizaciones",       icon: "quotes"    },
  { seg: "cuentas-por-cobrar", label: "Cuentas por Cobrar", icon: "alert"     },
  { seg: "clientes",           label: "Clientes",           icon: "clients"   },
  { seg: "inventario",         label: "Inventario",         icon: "products"  },
  { seg: "recibidas",          label: "Facturas Recibidas", icon: "invoice"   },
  { seg: "personalizacion",    label: "Personalización",    icon: "settings"  },
];

const serif = "var(--font-serif)";
const sans  = "var(--font-sans)";
const mono  = "var(--font-mono)";

// Mismo layout que SandboxSidebar (components/sandbox/sandbox-sidebar.tsx)
// pero apuntando a las rutas reales bajo el subdominio del tenant — aquí no
// hay query param ?t=, el middleware ya resolvió el tenant por subdominio.
export default function TenantSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const tenant = useTenant();
  const { open, setOpen } = useSidebarCtx();
  const esAdmin = tenant.rol === "owner" || tenant.rol === "admin";

  // "Ver como": solo owner/admin, solo cambia qué ítems se muestran en este
  // sidebar (para previsualizar rápido qué vería un cajero) — no toca los
  // permisos reales de Firestore, que dependen del rol real de cada quien.
  const [rolPreview, setRolPreview] = useState<RolMembership | null>(null);
  const rolEfectivo = esAdmin && rolPreview ? rolPreview : tenant.rol;

  useEffect(() => { setOpen(false); }, [pathname, setOpen]);

  const active = (seg: string) => pathname.endsWith(`/${seg}`);
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
        <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", background: "var(--c-brand)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
                stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: serif, fontSize: 13, fontWeight: 700, color: "#111", lineHeight: 1.2,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {tenant.nombreNegocio}
              </div>
              <div style={{ fontSize: 10, color: "#9ca3af", fontFamily: mono }}>{tenant.slug}</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "#9ca3af", fontFamily: mono, marginBottom: 6 }}>
            RNC {tenant.rnc}
          </div>
          <div style={{
            display: "inline-block", background: "var(--c-green-bg, #f0faf4)", color: "var(--c-green, #166534)",
            border: "1px solid var(--c-green-border, #bbf7d0)", padding: "2px 8px", borderRadius: 3,
            fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", fontFamily: sans,
          }}>
            EMISOR CERTIFICADO
          </div>
        </div>

        {esAdmin && (
          <div style={{ padding: "10px 14px 0" }}>
            <select
              value={rolPreview ?? ""} onChange={(e) => setRolPreview((e.target.value || null) as RolMembership | null)}
              title="Solo cambia lo que ves aquí — no tus permisos reales"
              style={{
                width: "100%", fontSize: 11, padding: "5px 6px", borderRadius: 4,
                border: "1px solid #e5e7eb", color: "#6b7280", fontFamily: sans, background: "#fff",
              }}
            >
              <option value="">Ver como: yo ({ROL_LABEL[tenant.rol]})</option>
              {ROLES_INVITABLES.filter((r) => r !== tenant.rol).map((r) => (
                <option key={r} value={r}>Ver como: {ROL_LABEL[r]}</option>
              ))}
            </select>
          </div>
        )}

        <nav style={{ flex: 1, padding: 10, display: "flex", flexDirection: "column", gap: 1, overflowY: "auto" }}>
          {navVisible.map(({ seg, label, icon }) => {
            const isActive = active(seg);
            return (
              <Link key={seg} href={`/${seg}`} style={{
                display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", borderRadius: 4,
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                background: isActive ? "var(--c-brand-bg)" : "transparent",
                color: isActive ? "var(--c-brand)" : "#6b7280",
                borderLeft: isActive ? "2px solid var(--c-brand)" : "2px solid transparent",
                textDecoration: "none", fontFamily: sans, transition: "all 0.1s",
              }}>
                <Icon name={icon} size={14} />
                {label}
              </Link>
            );
          })}
          {esAdmin && !rolPreview && (
            <Link href="/usuarios" style={{
              display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", borderRadius: 4,
              fontSize: 13, fontWeight: active("usuarios") ? 600 : 400,
              background: active("usuarios") ? "var(--c-brand-bg)" : "transparent",
              color: active("usuarios") ? "var(--c-brand)" : "#6b7280",
              borderLeft: active("usuarios") ? "2px solid var(--c-brand)" : "2px solid transparent",
              textDecoration: "none", fontFamily: sans, transition: "all 0.1s",
            }}>
              <Icon name="user" size={14} />
              Usuarios
            </Link>
          )}
        </nav>

        <div style={{ padding: "14px 16px", borderTop: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#9ca3af", fontFamily: sans }}>
            Con tecnología de <Logo variant="icon" size={13} /> <span style={{ fontWeight: 700, color: "#6b7280" }}>Facturacon</span>
          </div>
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
