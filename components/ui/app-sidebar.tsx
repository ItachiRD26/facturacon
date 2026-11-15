"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import Icon from "@/components/ui/icon";
import Logo from "@/components/ui/logo";

// Menú lateral del sistema (real y de prueba). Mismo diseño que las vistas de la
// landing: marca, tarjeta del negocio con su estado, navegación agrupada con
// iconos Phosphor y tarjeta de la sesión. Cada sidebar (tenant y sandbox) solo
// le pasa sus rutas y datos.
export interface ItemNavApp {
  seg: string; label: string; icon: string; href: string; activo: boolean;
  grupo?: string;          // título de grupo que se muestra antes del primer ítem de ese grupo
  tour?: string;
}

export default function AppSidebar({
  abierto, onCerrar, nombre, sub, rnc, insignia, selector, items, usuario, onLogout, pie,
}: {
  abierto: boolean; onCerrar: () => void;
  nombre: string; sub: string; rnc: string;
  insignia: { texto: string; tono: "ok" | "aviso" };
  selector?: ReactNode;
  items: ItemNavApp[];
  usuario?: { nombre: string; detalle: string };
  onLogout: () => void;
  pie?: ReactNode;
}) {
  const ink = insignia.tono === "ok"
    ? { bg: "var(--c-green-bg)", fg: "var(--c-green)", bd: "var(--c-green-border)" }
    : { bg: "var(--c-yellow-bg)", fg: "var(--c-yellow)", bd: "var(--c-yellow-border)" };

  let grupoAnterior: string | undefined;

  return (
    <>
      <div className={`sidebar-overlay ${abierto ? "open" : ""}`} onClick={onCerrar} />
      <aside className={`sidebar-responsive ${abierto ? "open" : ""}`} style={{
        width: 236, background: "var(--c-surface)", borderRight: "1px solid var(--c-border)",
        display: "flex", flexDirection: "column", height: "100vh", flexShrink: 0, fontFamily: "var(--font-sans)",
      }}>
        <div style={{ padding: "18px 16px 14px" }}>
          <div style={{ marginBottom: 14, paddingLeft: 2 }}><Logo size={26} /></div>
          <div style={{ background: "var(--c-bg)", border: "1px solid var(--c-border-lt)", borderRadius: "var(--radius-md)", padding: "10px 12px" }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.25, color: "var(--c-text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombre}</div>
            <div style={{ fontSize: 11.5, color: "var(--c-text-3)", marginTop: 2 }}>{sub} · RNC {rnc}</div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, padding: "3px 9px", borderRadius: 999,
              background: ink.bg, color: ink.fg, border: `1px solid ${ink.bd}`, fontSize: 11, fontWeight: 700,
            }}>
              <Icon name="sello" size={13} peso="fill" />{insignia.texto}
            </div>
          </div>
        </div>

        {selector && <div style={{ padding: "0 16px 6px" }}>{selector}</div>}

        <nav style={{ flex: 1, padding: "4px 12px 12px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
          {items.map((it) => {
            const mostrarGrupo = it.grupo !== grupoAnterior && it.grupo;
            grupoAnterior = it.grupo;
            return (
              <div key={it.seg}>
                {mostrarGrupo && (
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--c-text-4)", padding: "16px 10px 6px" }}>{it.grupo}</div>
                )}
                <Link href={it.href} data-tour={it.tour} className="app-nav-item" aria-current={it.activo ? "page" : undefined} style={{
                  display: "flex", alignItems: "center", gap: 11, padding: "9px 11px", borderRadius: "var(--radius-md)",
                  fontSize: 14, fontWeight: it.activo ? 700 : 500, textDecoration: "none",
                  background: it.activo ? "var(--c-brand-bg)" : "transparent",
                  color: it.activo ? "var(--c-brand)" : "var(--c-text-2)",
                }}>
                  <Icon name={it.icon} size={19} peso={it.activo ? "fill" : "duotone"} />
                  {it.label}
                </Link>
              </div>
            );
          })}
        </nav>

        <div style={{ padding: "12px 16px 14px", borderTop: "1px solid var(--c-border)", display: "flex", flexDirection: "column", gap: 10 }}>
          {usuario && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--c-bg)", borderRadius: "var(--radius-md)" }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", background: "var(--c-text-1)", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {(usuario.nombre || "?").trim().charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{usuario.nombre || "Tu cuenta"}</div>
                <div style={{ fontSize: 11.5, color: "var(--c-text-3)" }}>{usuario.detalle}</div>
              </div>
            </div>
          )}
          {pie}
          <button type="button" onClick={onLogout} className="app-logout" style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: "8px 10px",
            background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: "var(--radius-md)",
            cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--c-text-2)", fontFamily: "var(--font-sans)",
          }}>
            <Icon name="logout" size={15} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
