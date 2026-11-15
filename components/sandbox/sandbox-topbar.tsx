"use client";

import { usePathname } from "next/navigation";
import { useSidebarCtx } from "@/contexts/SidebarUIContext";
import { useTour } from "@/components/tour/tour-provider";

const LABELS: Record<string, string> = {
  dashboard:          "Dashboard",
  facturas:           "Facturas",
  cotizaciones:       "Cotizaciones",
  clientes:           "Clientes",
  inventario:         "Inventario",
  "cuentas-por-cobrar": "Cuentas por Cobrar",
  recibidas:          "Facturas Recibidas",
};

function getLabel(pathname: string) {
  const seg = pathname.split("/sandbox/")[1]?.split("/")[0] ?? "";
  return LABELS[seg] ?? "";
}

export default function SandboxTopbar() {
  const pathname           = usePathname();
  const label              = getLabel(pathname);
  const { open, setOpen }  = useSidebarCtx();
  const { restart }        = useTour();

  const date = new Date().toLocaleDateString("es-DO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const dateDisplay = date.charAt(0).toUpperCase() + date.slice(1);

  return (
    <header style={{
      height: 56, background: "var(--c-surface)", borderBottom: "1px solid var(--c-border)",
      display: "flex", alignItems: "center", padding: "0 16px", flexShrink: 0, gap: 10,
    }}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Abrir menú"
        className="hamburger-btn"
        style={{
          display: "none", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, background: "none",
          border: "1px solid var(--c-border)", borderRadius: 8, cursor: "pointer", flexShrink: 0,
        }}
      >
        <svg width={18} height={14} viewBox="0 0 18 14" fill="none">
          <rect x="0" y="0"  width="18" height="2" rx="1" fill="var(--c-text-2)" />
          <rect x="0" y="6"  width="18" height="2" rx="1" fill="var(--c-text-2)" />
          <rect x="0" y="12" width="18" height="2" rx="1" fill="var(--c-text-2)" />
        </svg>
      </button>
      <div style={{ flex: 1, fontSize: 17, color: "var(--c-text-1)", fontFamily: "var(--font-sans)", fontWeight: 800, letterSpacing: "-0.02em" }}>
        {label}
      </div>
      <button onClick={restart} style={{
        fontSize: 12, color: "#2540D9", fontFamily: "var(--font-sans)", fontWeight: 600,
        background: "none", border: "none", cursor: "pointer", flexShrink: 0,
      }}>
        Ver tutorial de nuevo
      </button>
      <div style={{ fontSize: 11, color: "var(--c-text-4)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
        {dateDisplay}
      </div>
    </header>
  );
}
