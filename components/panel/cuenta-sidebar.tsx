"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/icon";
import Logo from "@/components/ui/logo";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebarCtx } from "@/contexts/SidebarUIContext";
import type { Tenant } from "@/types/tenant";

const NAV = [
  { seg: "",              label: "Resumen",        icon: "dashboard" },
  { seg: "metodos-pago",  label: "Métodos de pago", icon: "invoice"   },
  { seg: "soporte",       label: "Soporte",         icon: "alert"     },
];

const serif = "var(--font-serif)";
const sans  = "var(--font-sans)";
const mono  = "var(--font-mono)";

export default function CuentaSidebar({
  tenant, tenantId, multiplesEmpresas,
}: { tenant: Tenant; tenantId: string; multiplesEmpresas: boolean }) {
  const pathname          = usePathname();
  const { logout }        = useAuth();
  const { open, setOpen }  = useSidebarCtx();

  useEffect(() => { setOpen(false); }, [pathname, setOpen]);

  const base = `/panel/${tenantId}`;
  const hrefDe = (seg: string) => seg ? `${base}/${seg}` : base;
  const active = (seg: string) => seg ? pathname.startsWith(`${base}/${seg}`) : pathname === base;

  const enSandbox = tenant.estado !== "activo" || !tenant.slug;

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
            <Logo variant="icon" size={32} />
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: serif, fontSize: 13, fontWeight: 700, color: "#111", lineHeight: 1.2,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {tenant.nombreNegocio}
              </div>
              <div style={{ fontSize: 10, color: "#9ca3af", fontFamily: mono }}>Mi cuenta</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "#9ca3af", fontFamily: mono }}>RNC {tenant.rnc}</div>
        </div>

        <nav style={{ flex: 1, padding: 10, display: "flex", flexDirection: "column", gap: 1, overflowY: "auto" }}>
          {NAV.map(({ seg, label, icon }) => {
            const isActive = active(seg);
            return (
              <Link key={seg || "resumen"} href={hrefDe(seg)} style={{
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

          <div style={{ height: 1, background: "#e5e7eb", margin: "10px 4px" }} />

          <Link href={enSandbox ? `/onboarding/sandbox/dashboard?t=${tenantId}` : `https://${tenant.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`} style={{
            display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", borderRadius: 4,
            fontSize: 13, color: "#0e7490", fontWeight: 600, textDecoration: "none", fontFamily: sans,
          }}>
            <Icon name="eye" size={14} />
            {enSandbox ? "Seguir probando" : "Abrir mi sistema"}
          </Link>

          {multiplesEmpresas && (
            <Link href="/panel" style={{
              display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", borderRadius: 4,
              fontSize: 13, color: "#6b7280", textDecoration: "none", fontFamily: sans,
            }}>
              <Icon name="convert" size={14} />
              Cambiar de empresa
            </Link>
          )}
        </nav>

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
