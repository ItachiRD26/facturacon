// Planes de suscripción mensual por volumen de comprobantes. La
// certificación ante la DGII es gratis — no hay ningún pago que la active.
// El cobro empieza recién cuando el tenant llega a "activo" y activa su
// suscripción recurrente (ver lib/payments/suscripcion.ts).
//
// montoUSD es una conversión de referencia a ~RD$60 = US$1 (Pagadito siempre
// cobra en USD, ver lib/payments/pagadito-tokenizacion.ts) — igual que el
// resto de cifras de este proyecto, es provisional hasta confirmar una tasa
// fija o conversión en tiempo real antes de lanzar de verdad.
export interface Plan {
  id:        string;
  facturas:  number;
  montoRD:   number;
  montoUSD:  string;
  // Usuarios/cajeros incluidos en el plan — escala con el volumen de
  // comprobantes bajo el supuesto de que más facturación implica más
  // personal operando. No se cobra por asiento aparte: si un tenant
  // necesita más usuarios sin necesitar más comprobantes, la vía es subir
  // de plan, no comprar usuarios sueltos (al menos por ahora).
  usuarios:  number;
  // Precio (RD$) de cada comprobante que excede el tope mensual del plan. Va
  // decreciendo con el tamaño del plan y siempre por encima del costo marginal de
  // subir al plan siguiente, para que subir de plan convenga antes que pagar extras.
  extraRD:   number;
  // Nombre comercial del plan cuando lo tiene (el resto se identifica por su volumen).
  nombre?:   string;
  // Plan de una sola persona: no admite usuarios adicionales ni siquiera pagando
  // (quien necesite equipo sube a un plan con más usuarios). El único usuario es
  // dueño y cajero a la vez: puede facturar, cotizar y manejar inventario.
  soloUnUsuario?: boolean;
}

// Frecuencia de cobro. El anual es "paga 10 meses, usa 12" (2 meses gratis). Pagadito cobra recurrente
// por semana, mes o año (confirmado por su soporte); aquí solo se ofrecen mensual y anual.
export type PeriodoPlan = "mensual" | "anual";
export const MESES_COBRADOS_ANUAL = 10;
export const mesesCobrados = (p: PeriodoPlan) => (p === "anual" ? MESES_COBRADOS_ANUAL : 1);
/** Lo que se cobra cada vez (RD$): una mensualidad, o 10 mensualidades por el año. */
export const montoPeriodoRD = (plan: Plan, p: PeriodoPlan) => plan.montoRD * mesesCobrados(p);
/** Igual en USD (Pagadito cobra siempre en USD), con 2 decimales como lo pide su API. */
export const montoPeriodoUSD = (plan: Plan, p: PeriodoPlan) => (Number(plan.montoUSD) * mesesCobrados(p)).toFixed(2);

/** "1 usuario" / "2 usuarios". */
export function textoUsuarios(n: number): string {
  return `${n} usuario${n === 1 ? "" : "s"}`;
}

export const PLANES: Plan[] = [
  // Emprendedor: la mitad del precio del plan de 250 (RD$690 contra RD$1,380), 100 comprobantes y un solo
  // usuario. Comprobante extra a RD$3 (decisión de Peter): con el tope de seguridad de 3 veces el plan
  // (300 comprobantes) el máximo mensual es 690 + 200 × 3 = RD$1,290, todavía por debajo del plan de 250.
  { id: "100",  facturas: 100,  montoRD: 690,   montoUSD: "11.50",  usuarios: 1, extraRD: 3, nombre: "Emprendedor", soloUnUsuario: true },
  { id: "250",  facturas: 250,  montoRD: 1380,  montoUSD: "23.00",  usuarios: 2, extraRD: 4.5 },
  { id: "500",  facturas: 500,  montoRD: 2320,  montoUSD: "38.67",  usuarios: 3, extraRD: 3.75 },
  { id: "1000", facturas: 1000, montoRD: 3890,  montoUSD: "64.83",  usuarios: 5, extraRD: 3 },
  { id: "2000", facturas: 2000, montoRD: 6340,  montoUSD: "105.67", usuarios: 8, extraRD: 2.5 },
  { id: "3000", facturas: 3000, montoRD: 8290,  montoUSD: "138.17", usuarios: 12, extraRD: 2.25 },
  { id: "4000", facturas: 4000, montoRD: 10300, montoUSD: "171.67", usuarios: 15, extraRD: 2 },
];

export function buscarPlan(id: string): Plan | undefined {
  return PLANES.find((p) => p.id === id);
}

// Desde este volumen mensual de comprobantes no hay plan de lista: la empresa
// habla con ventas (/empresas) y se acuerda un plan a la medida.
export const VOLUMEN_EMPRESA = 10_000;

// Tarifas fijas que se suman al plan. Valores de REFERENCIA propuestos: ajustarlos
// aquí cambia la landing (y lo que se muestre en el panel) de una vez.
export const TARIFAS_ADICIONALES = {
  usuarioRD: 250, // por usuario adicional (cajero, administrador o contador), al mes
} as const;
