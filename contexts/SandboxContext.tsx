"use client";

import { createContext, useContext } from "react";
import type { Tenant } from "@/types/tenant";

export interface SandboxCtxValue {
  tenantId: string;
  tenant: Tenant;
  rootDomain: string;
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
