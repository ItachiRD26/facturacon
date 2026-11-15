"use client";

import { createContext, useContext } from "react";
import type { RolMembership, Tenant } from "@/types/tenant";

export interface SandboxCtxValue {
  tenantId: string;
  tenant: Tenant;
  rootDomain: string;
  // Rol con el que se está "probando" el sistema (solo para ver cómo lo ve cada
  // persona del equipo; no cambia datos ni permisos reales). Arranca como cajero.
  rol: RolMembership;
  setRol: (r: RolMembership) => void;
}

const SandboxContext = createContext<SandboxCtxValue | null>(null);

export function SandboxProvider({ value, children }: { value: SandboxCtxValue; children: React.ReactNode }) {
  return <SandboxContext.Provider value={value}>{children}</SandboxContext.Provider>;
}

export function useSandbox(): SandboxCtxValue {
  const ctx = useContext(SandboxContext);
  if (!ctx) throw new Error("useSandbox debe usarse dentro de SandboxProvider");
  return ctx;
}
