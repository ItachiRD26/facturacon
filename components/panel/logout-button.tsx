"use client";

import { useAuth } from "@/contexts/AuthContext";
import Icon from "@/components/ui/icon";

// Extraído de cuenta-sidebar.tsx para reusarse en /panel (el selector de
// empresa) — esa página no tiene sidebar porque no hay un tenant activo
// todavía, así que se había quedado sin ninguna forma de cerrar sesión.
export default function LogoutButton() {
  const { logout } = useAuth();
  return (
    <button
      onClick={logout}
      style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "none", border: "1px solid var(--c-border)", borderRadius: 6, cursor: "pointer", fontSize: 12, color: "var(--c-text-3)", fontFamily: "var(--font-sans)" }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--c-red)"; e.currentTarget.style.borderColor = "var(--c-red-border)"; e.currentTarget.style.background = "var(--c-red-bg)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--c-text-3)"; e.currentTarget.style.borderColor = "var(--c-border)"; e.currentTarget.style.background = "none"; }}
    >
      <Icon name="logout" size={13} />
      Cerrar sesión
    </button>
  );
}
