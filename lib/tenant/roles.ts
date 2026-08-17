import type { RolMembership } from "@/types/tenant";

// Módulos = los mismos "seg" que usan tenant-sidebar.tsx / sandbox-sidebar.tsx
// para armar las rutas del sistema (/{seg}) — un solo catálogo para no
// tener el nombre de cada módulo repetido y potencialmente desincronizado
// en el sidebar, las Firestore rules (ver firestore.rules, PERMISOS_ROL) y
// la pantalla de administración de usuarios.
export type Modulo =
  | "dashboard" | "facturas" | "cotizaciones" | "cuentas-por-cobrar"
  | "clientes" | "inventario" | "recibidas" | "personalizacion";

// v1: roles predefinidos de permisos fijos, no personalizables módulo por
// módulo por persona — más simple de construir y de entender para el
// dueño del negocio. owner/admin tienen acceso operativo completo; la
// diferencia entre ellos es que solo owner administra facturación/equipo
// (ver requireOwnerOAdmin en las rutas de /api/tenant/usuarios).
export const MODULOS_POR_ROL: Record<RolMembership, Modulo[]> = {
  owner:    ["dashboard", "facturas", "cotizaciones", "cuentas-por-cobrar", "clientes", "inventario", "recibidas", "personalizacion"],
  admin:    ["dashboard", "facturas", "cotizaciones", "cuentas-por-cobrar", "clientes", "inventario", "recibidas", "personalizacion"],
  // Cajero: solo lo que necesita para vender — factura, cotiza, gestiona
  // clientes. Sin dashboard (no debe ver cuánto factura el negocio en
  // total, es información del dueño), sin inventario (no puede crear/
  // editar productos ni tocar stock) ni cuentas por cobrar (cobranza es un
  // tema administrativo). Sigue pudiendo LEER productos para poder
  // facturarlos (ver firestore.rules — la lectura de /productos no se
  // restringe por rol).
  vendedor: ["facturas", "cotizaciones", "clientes"],
  contador: ["dashboard", "facturas", "cuentas-por-cobrar", "recibidas", "clientes"],
  viewer:   ["dashboard"],
};

export const ROL_LABEL: Record<RolMembership, string> = {
  owner:    "Dueño",
  admin:    "Administrador",
  vendedor: "Cajero / Vendedor",
  contador: "Contador",
  viewer:   "Solo lectura",
};

// Roles que un owner puede asignar al invitar — no se puede invitar a
// alguien como "owner" (solo hay uno, el que creó el tenant).
export const ROLES_INVITABLES: RolMembership[] = ["admin", "vendedor", "contador", "viewer"];

export function tieneAcceso(rol: RolMembership, modulo: Modulo): boolean {
  return MODULOS_POR_ROL[rol].includes(modulo);
}
