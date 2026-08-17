"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "@/contexts/TenantContext";
import { MODULOS_POR_ROL } from "@/lib/tenant/roles";

// Raíz del subdominio del tenant (https://{slug}.facturacon.com.do/) — no
// tenía página propia, así que caía en 404. Redirige al primer módulo que
// el rol de quien entra pueda ver (dashboard para owner/admin, facturas
// para un cajero ya que no tiene dashboard, etc.) en vez de asumir siempre
// "dashboard".
export default function TenantRootPage() {
  const tenant = useTenant();
  const router = useRouter();

  useEffect(() => {
    const primero = MODULOS_POR_ROL[tenant.rol][0] ?? "facturas";
    router.replace(`/${primero}`);
  }, [tenant.rol, router]);

  return null;
}
