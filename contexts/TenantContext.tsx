"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { RolMembership } from "@/types/tenant";

export interface TenantSummary {
  tenantId:      string;
  slug:          string;
  nombreNegocio: string;
  rol:           RolMembership;
}

interface TenantContextValue {
  tenantId:      string;
  slug:          string;
  nombreNegocio: string;
  rnc:           string;
  rol:           RolMembership;
  // Otras empresas que esta cuenta administra (cuentas "gestor"); cada una
  // vive en su propio subdominio, así que "cambiar" es navegar, no un
  // simple cambio de estado local.
  otrasEmpresas: TenantSummary[];
  // Estado del cobro recurrente: sin plan activo no se pueden emitir comprobantes
  // reales. `motivoSinPlan` distingue "nunca activó", "pago fallido" y "cancelado".
  puedeEmitir:   boolean;
  motivoSinPlan: "sin_plan" | "pago_fallido" | "cancelado" | null;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({
  value, children,
}: { value: TenantContextValue; children: ReactNode }) {
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant debe usarse dentro de <TenantProvider> (app/(tenant)/layout.tsx)");
  return ctx;
}
