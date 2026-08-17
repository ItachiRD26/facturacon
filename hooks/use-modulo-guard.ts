"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { tieneAcceso, type Modulo } from "@/lib/tenant/roles";
import type { RolMembership } from "@/types/tenant";

// Reforzar en la propia página que el rol actual tiene acceso al módulo —
// esconder el link del sidebar no alcanza si alguien escribe la URL a mano.
// No reemplaza las Firestore rules (esas ya bloquean la escritura real);
// esto evita que alguien sin acceso vea la PANTALLA (ej. el dashboard con
// totales de facturación, que si es de solo lectura no lo bloquean las
// rules de escritura).
export function useModuloGuard(rol: RolMembership, modulo: Modulo) {
  const router = useRouter();
  useEffect(() => {
    if (!tieneAcceso(rol, modulo)) router.replace("/");
  }, [rol, modulo, router]);
}
