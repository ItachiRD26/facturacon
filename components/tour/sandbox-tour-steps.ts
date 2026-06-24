export interface TourStep {
  id:         string;
  route:      string;
  title:      string;
  body:       string;
  placement?: "top" | "bottom" | "left" | "right";
}

const BASE = "/onboarding/sandbox";

export const SANDBOX_TOUR_STEPS: TourStep[] = [
  {
    id: "page-dashboard", route: `${BASE}/dashboard`, placement: "bottom",
    title: "Bienvenido a tu entorno de prueba",
    body: "Este es el sistema completo de Facturacon, con datos de ejemplo. Nada de lo que hagas aquí se envía a la DGII real — es para que veas cómo se vería tu negocio facturando.",
  },
  {
    id: "nav-clientes", route: `${BASE}/dashboard`, placement: "right",
    title: "Clientes",
    body: "Aquí registras a las personas o empresas a las que les facturarás.",
  },
  {
    id: "btn-nuevo-cliente", route: `${BASE}/clientes`, placement: "bottom",
    title: "Agrega un cliente de prueba",
    body: "Puedes usar datos ficticios. Si el cliente tiene RNC, el sistema lo valida contra el padrón real de la DGII.",
  },
  {
    id: "nav-inventario", route: `${BASE}/clientes`, placement: "right",
    title: "Inventario",
    body: "Aquí registras los productos o servicios que vendes.",
  },
  {
    id: "btn-nuevo-producto", route: `${BASE}/inventario`, placement: "bottom",
    title: "Agrega un producto o servicio",
    body: "Define el precio, el ITBIS aplicable y si quieres controlar el stock.",
  },
  {
    id: "nav-facturas", route: `${BASE}/inventario`, placement: "right",
    title: "Facturas",
    body: "Desde aquí emites comprobantes fiscales electrónicos.",
  },
  {
    id: "btn-nueva-factura", route: `${BASE}/facturas`, placement: "bottom",
    title: "Emite tu primera factura de prueba",
    body: "El sistema decide automáticamente qué tipo de comprobante fiscal aplica según el cliente, y simula el envío con un código QR de prueba e impresión en A4 o térmica.",
  },
  {
    id: "nav-cotizaciones", route: `${BASE}/facturas`, placement: "right",
    title: "Cotizaciones",
    body: "Crea una cotización y conviértela en factura cuando el cliente la acepte.",
  },
  {
    id: "nav-cuentas-por-cobrar", route: `${BASE}/cotizaciones`, placement: "right",
    title: "Cuentas por Cobrar",
    body: "Si facturas a crédito, aquí controlas los abonos y lo pendiente por cobrar.",
  },
  {
    id: "nav-recibidas", route: `${BASE}/cuentas-por-cobrar`, placement: "right",
    title: "Facturas Recibidas",
    body: "Aquí verás (en producción, automáticamente) las facturas que te emiten tus proveedores.",
  },
  {
    id: "btn-comenzar-certificacion", route: `${BASE}/recibidas`, placement: "bottom",
    title: "¿Ya probaste todo?",
    body: "Cuando estés listo, pulsa aquí para comenzar el proceso real de certificación de tu negocio ante la DGII.",
  },
];
