import { MODULOS_POR_ROL, type Modulo } from "@/lib/tenant/roles";
import { ROL_PRUEBA_RESUMEN, ROL_PRUEBA_TITULO, moduloInicial } from "@/lib/sandbox/roles-prueba";
import type { RolMembership } from "@/types/tenant";

export interface TourStep {
  id:         string;
  route:      string;
  title:      string;
  body:       string;
  placement?: "top" | "bottom" | "left" | "right";
}

const BASE = "/onboarding/sandbox";

// Un paso es de "página" (el elemento está dentro de una pantalla concreta) o de
// "navegación" (el elemento es un ítem de la barra lateral, visible en cualquier
// pantalla). El recorrido arranca por facturar, que es lo principal, y solo incluye lo
// que el rol que se está probando puede ver: un cajero ya no recorre Inventario ni
// Cuentas por cobrar, que no vería en el sistema real.
interface Paso {
  id: string; modulo?: Modulo; tipo: "pagina" | "nav" | "global";
  title: string; body: string; placement?: TourStep["placement"];
}

const PASOS: Paso[] = [
  { id: "nav-facturas", modulo: "facturas", tipo: "nav", placement: "right", title: "Facturas",
    body: "Desde aquí emites comprobantes fiscales electrónicos." },
  { id: "btn-nueva-factura", modulo: "facturas", tipo: "pagina", placement: "bottom", title: "Emite tu primera factura de prueba",
    body: "Elige un cliente y un producto de los de ejemplo. El sistema decide solo qué tipo de comprobante fiscal aplica y simula el envío, con código QR de prueba e impresión en A4 o térmica." },
  { id: "nav-cotizaciones", modulo: "cotizaciones", tipo: "nav", placement: "right", title: "Cotizaciones",
    body: "Crea una cotización y conviértela en factura cuando el cliente la acepte." },
  { id: "nav-clientes", modulo: "clientes", tipo: "nav", placement: "right", title: "Clientes",
    body: "Aquí registras a las personas o empresas a las que les facturarás." },
  { id: "btn-nuevo-cliente", modulo: "clientes", tipo: "pagina", placement: "bottom", title: "Agrega un cliente de prueba",
    body: "Puedes usar datos ficticios. Si el cliente tiene RNC, el sistema lo valida contra el padrón real de la DGII." },
  { id: "nav-inventario", modulo: "inventario", tipo: "nav", placement: "right", title: "Inventario",
    body: "Aquí registras los productos o servicios que vendes." },
  { id: "btn-nuevo-producto", modulo: "inventario", tipo: "pagina", placement: "bottom", title: "Agrega un producto o servicio",
    body: "Define el precio, el ITBIS aplicable y si quieres controlar el stock." },
  { id: "nav-cuentas-por-cobrar", modulo: "cuentas-por-cobrar", tipo: "nav", placement: "right", title: "Cuentas por Cobrar",
    body: "Si facturas a crédito, aquí controlas los abonos y lo pendiente por cobrar." },
  { id: "nav-recibidas", modulo: "recibidas", tipo: "nav", placement: "right", title: "Facturas Recibidas",
    body: "Aquí verás (en producción, automáticamente) las facturas que te emiten tus proveedores." },
  { id: "nav-personalizacion", modulo: "personalizacion", tipo: "nav", placement: "right", title: "Personalización",
    body: "Sube el logo de tu negocio aquí — se ajusta automáticamente para verse bien tanto en facturas A4 como en impresoras térmicas, y lo puedes ver en una vista previa antes de imprimir." },
  { id: "panel-rol", tipo: "global", placement: "bottom", title: "Pruébalo como cada persona de tu equipo",
    body: "Cambia aquí de rol para ver el sistema como lo vería cada quien: el cajero solo factura, el contador revisa los números y el dueño lo ve todo." },
  { id: "btn-comenzar-certificacion", tipo: "global", placement: "bottom", title: "¿Ya probaste todo?",
    body: "Cuando estés listo, pulsa aquí para comenzar el proceso real de certificación de tu negocio ante la DGII." },
];

const ID_PAGINA: Partial<Record<Modulo, string>> = {
  dashboard: "page-dashboard", facturas: "page-facturas", cotizaciones: "page-cotizaciones", clientes: "page-clientes",
  inventario: "page-inventario", "cuentas-por-cobrar": "page-cxc", recibidas: "page-recibidas",
};

/** Recorrido guiado del entorno de prueba para el rol que se está probando. */
export function pasosTour(rol: RolMembership): TourStep[] {
  const accesibles = MODULOS_POR_ROL[rol];
  const inicial = moduloInicial(rol);
  let ruta = `${BASE}/${inicial}`;

  const bienvenida: TourStep = {
    id: ID_PAGINA[inicial] ?? "page-facturas", route: ruta, placement: "bottom",
    title: rol === "owner" ? "Bienvenido a tu entorno de prueba" : `Estás probando como ${ROL_PRUEBA_TITULO[rol] ?? "este rol"}`,
    body: rol === "owner"
      ? "Este es el sistema completo de Facturacon, con datos de ejemplo. Nada de lo que hagas aquí se envía a la DGII real: es para que veas cómo se vería tu negocio facturando."
      : `${ROL_PRUEBA_RESUMEN[rol]} Ya cargamos productos y clientes de ejemplo para que factures desde ahora. Nada se envía a la DGII real.`,
  };

  const resto: TourStep[] = [];
  for (const p of PASOS) {
    if (p.modulo && !accesibles.includes(p.modulo)) continue;
    // Los pasos de página llevan a su pantalla; los de navegación y globales se
    // quedan en la pantalla donde ya estamos.
    if (p.tipo === "pagina" && p.modulo) ruta = `${BASE}/${p.modulo}`;
    resto.push({ id: p.id, route: ruta, title: p.title, body: p.body, placement: p.placement });
  }
  return [bienvenida, ...resto];
}
