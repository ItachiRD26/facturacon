import { MODULOS_POR_ROL, type Modulo } from "@/lib/tenant/roles";
import type { RolMembership } from "@/types/tenant";

// Roles que se pueden "probar" en el entorno de prueba, en el orden en que se
// muestran. El cajero va primero y es el de arranque: lo principal del sistema es
// facturar, y es lo que más gente de un negocio hace. (Administrador y Solo
// lectura existen en el sistema real, pero para entender el sistema bastan estos tres.)
export const ROLES_PRUEBA: RolMembership[] = ["vendedor", "almacen", "contador", "owner"];
export const ROL_PRUEBA_INICIAL: RolMembership = "vendedor";

export const ROL_PRUEBA_TITULO: Record<string, string> = {
  vendedor: "Cajero",
  almacen:  "Almacén",
  contador: "Contador",
  owner:    "Dueño",
};

export const ROL_PRUEBA_RESUMEN: Record<string, string> = {
  vendedor: "Se dedica a vender: emite facturas y cotizaciones y registra clientes. No ve cuánto factura el negocio en total, ni el inventario ni las cuentas por cobrar.",
  almacen:  "Encargado de almacén: maneja los productos, los precios y las compras a proveedores. No vende ni ve cuánto factura el negocio.",
  contador: "Revisa los números: ve facturas, cuentas por cobrar y facturas recibidas, sin poder vender ni cambiar el inventario.",
  owner:    "Ve y administra todo: dashboard, inventario, cuentas por cobrar y, en el sistema real, el equipo y el plan. Puede cotizar. No factura: eso lo hace la caja, salvo que active «Yo también facturo» en Permisos.",
};

export const MODULO_ETIQUETA: Record<Modulo, string> = {
  dashboard: "Dashboard", facturas: "Facturas", cotizaciones: "Cotizaciones", clientes: "Clientes",
  inventario: "Inventario", "cuentas-por-cobrar": "Cuentas por cobrar", recibidas: "Facturas recibidas", personalizacion: "Personalización",
};

const TODOS: Modulo[] = ["dashboard", "facturas", "cotizaciones", "clientes", "inventario", "cuentas-por-cobrar", "recibidas", "personalizacion"];

/** Qué módulos ve y cuáles no ve un rol (sale de la misma tabla que el sistema real). */
export function modulosDeRol(rol: RolMembership): { ve: Modulo[]; noVe: Modulo[] } {
  const ve = TODOS.filter((m) => MODULOS_POR_ROL[rol].includes(m));
  return { ve, noVe: TODOS.filter((m) => !ve.includes(m)) };
}

/** Primera pantalla útil de un rol: facturar si puede; si no, la primera que vea. */
export function moduloInicial(rol: RolMembership): Modulo {
  return MODULOS_POR_ROL[rol].includes("facturas") ? "facturas" : MODULOS_POR_ROL[rol][0];
}
