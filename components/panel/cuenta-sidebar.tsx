"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/icon";
import Logo from "@/components/ui/logo";
import { Avatar } from "@/components/ui/kit";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebarCtx } from "@/contexts/SidebarUIContext";
import { ROL_LABEL } from "@/lib/tenant/roles";
import type { RolMembership, Tenant } from "@/types/tenant";

interface ItemNav { seg: string; label: string; icon: string; roles?: RolMembership[]; solo?: Tenant["estado"][] }

// Qué ve cada persona en el panel de cuenta. Los cajeros y el rol de solo
// lectura entran por el sistema de la empresa, no por aquí; el contador ve
// únicamente lo suyo (contabilidad). Las pantallas validan el rol de nuevo en
// el servidor — ocultar el enlace es comodidad, no seguridad.
const GRUPOS: { titulo?: string; items: ItemNav[] }[] = [
  {
    items: [
      { seg: "", label: "Resumen", icon: "dashboard" },
      { seg: "certificacion", label: "Certificación DGII", icon: "scan", roles: ["owner", "admin"], solo: ["pendiente_certificacion", "certificando"] },
    ],
  },
  {
    titulo: "Mi negocio",
    items: [
      { seg: "equipo", label: "Equipo y accesos", icon: "user", roles: ["owner", "admin"] },
      { seg: "contabilidad", label: "Contabilidad", icon: "chart", roles: ["owner", "admin", "contador"] },
      { seg: "secuencias", label: "Secuencias fiscales", icon: "invoice", roles: ["owner", "admin"], solo: ["activo", "suspendido"] },
    ],
  },
  {
    titulo: "Cuenta",
    items: [
      { seg: "plan", label: "Plan y facturación", icon: "invoice", roles: ["owner", "admin"] },
      { seg: "soporte", label: "Ayuda y soporte", icon: "alert" },
    ],
  },
];

const ESTADO_PILL: Record<Tenant["estado"], { texto: string; color: string; bg: string }> = {
  demo:                    { texto: "Entorno de prueba",   color: "var(--c-yellow)", bg: "var(--c-yellow-bg)" },
  pendiente_certificacion: { texto: "Por certificar",      color: "var(--c-yellow)", bg: "var(--c-yellow-bg)" },
  certificando:            { texto: "Certificando",        color: "var(--c-blue)",   bg: "var(--c-blue-bg)" },
  activo:                  { texto: "Activo",              color: "var(--c-green)",  bg: "var(--c-green-bg)" },
  suspendido:              { texto: "Pago pendiente",      color: "var(--c-red)",    bg: "var(--c-red-bg)" },
};

export default function CuentaSidebar({
  tenant, tenantId, multiplesEmpresas, rol,
}: { tenant: Tenant; tenantId: string; multiplesEmpresas: boolean; rol: RolMembership }) {
  const pathname          = usePathname();
  const { logout }        = useAuth();
  const { open, setOpen }  = useSidebarCtx();

  useEffect(() => { setOpen(false); }, [pathname, setOpen]);

  const base = `/panel/${tenantId}`;
  const hrefDe = (seg: string) => seg ? `${base}/${seg}` : base;
  const active = (seg: string) => seg ? pathname.startsWith(`${base}/${seg}`) : pathname === base;

  const enSandbox = tenant.estado !== "activo" || !tenant.slug;
  const pill = ESTADO_PILL[tenant.estado];

  // Arma la URL del subdominio a partir de dónde se está viendo el panel
  // ahora mismo, no de NEXT_PUBLIC_ROOT_DOMAIN a secas — esa env var queda
  // fija en facturacon.com.do incluso en local, así que usarla directo
  // sacaría a quien prueba en localhost hacia el sitio real.
  const urlSistema = () => {
    if (typeof window === "undefined") return `https://${tenant.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;
    const { hostname, port, protocol } = window.location;
    const esLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost");
    const host = esLocal ? `${tenant.slug}.localhost${port ? `:${port}` : ""}` : `${tenant.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;
    return `${esLocal ? "http" : protocol.replace(":", "")}://${host}`;
  };

  const visibles = (items: ItemNav[]) =>
    items.filter((i) => (!i.roles || i.roles.includes(rol)) && (!i.solo || i.solo.includes(tenant.estado)));

  const puedeOperar = rol === "owner" || rol === "admin" || rol === "vendedor";

  return (
    <>
      <div className={`sidebar-overlay ${open ? "open" : ""}`} onClick={() => setOpen(false)} />
      <aside
        className={`sidebar-responsive ${open ? "open" : ""}`}
        style={{
          width: 236, background: "var(--c-surface)", borderRight: "1px solid var(--c-border)",
          display: "flex", flexDirection: "column", height: "100vh", flexShrink: 0,
        }}
      >
        <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid var(--c-border)" }}>
          <Logo size={24} />
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar nombre={tenant.nombreNegocio} tamano={36} />
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: "var(--c-text-1)", lineHeight: 1.25,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {tenant.nombreNegocio}
              </div>
              <div className="num" style={{ fontSize: 11, color: "var(--c-text-4)", fontFamily: "var(--font-mono)" }}>RNC {tenant.rnc}</div>
            </div>
          </div>
          <span style={{
            display: "inline-block", marginTop: 12, fontSize: 11, fontWeight: 700, padding: "3px 10px",
            borderRadius: 999, color: pill.color, background: pill.bg,
          }}>
            {pill.texto}
          </span>
        </div>

        <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
          {GRUPOS.map((g, gi) => {
            const items = visibles(g.items);
            if (items.length === 0) return null;
            return (
              <div key={gi} style={{ marginBottom: 10 }}>
                {g.titulo && (
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                    color: "var(--c-text-4)", padding: "10px 12px 6px",
                  }}>
                    {g.titulo}
                  </div>
                )}
                {items.map(({ seg, label, icon }) => {
                  const isActive = active(seg);
                  return (
                    <Link key={seg || "resumen"} href={hrefDe(seg)} aria-current={isActive ? "page" : undefined} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: "var(--radius-md)",
                      fontSize: 13, fontWeight: isActive ? 700 : 500,
                      background: isActive ? "var(--c-brand-bg)" : "transparent",
                      color: isActive ? "var(--c-brand-dark)" : "var(--c-text-3)",
                      textDecoration: "none", fontFamily: "var(--font-sans)",
                    }}>
                      <Icon name={icon} size={15} />
                      {label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div style={{ padding: 12, borderTop: "1px solid var(--c-border)", display: "flex", flexDirection: "column", gap: 8 }}>
          {puedeOperar && (
            <Link href={enSandbox ? `/onboarding/sandbox/dashboard?t=${tenantId}` : urlSistema()} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 12px",
              borderRadius: "var(--radius-md)", background: "var(--c-brand)", color: "#fff", fontSize: 13,
              fontWeight: 700, textDecoration: "none",
            }}>
              <Icon name="eye" size={14} />
              {enSandbox ? "Seguir probando" : "Abrir mi sistema"}
            </Link>
          )}
          {multiplesEmpresas && (
            <Link href="/panel" style={{
              display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", fontSize: 12,
              color: "var(--c-text-3)", textDecoration: "none",
            }}>
              <Icon name="convert" size={13} />
              Cambiar de empresa
            </Link>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "2px 4px" }}>
            <span style={{ fontSize: 11, color: "var(--c-text-4)" }}>{ROL_LABEL[rol]}</span>
            <button onClick={logout} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 8px", background: "none", border: "none",
              cursor: "pointer", fontSize: 12, color: "var(--c-text-3)", fontFamily: "var(--font-sans)",
            }}>
              <Icon name="logout" size={13} />
              Salir
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
