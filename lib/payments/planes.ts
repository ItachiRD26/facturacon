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
}

export const PLANES: Plan[] = [
  { id: "250",  facturas: 250,  montoRD: 1380,  montoUSD: "23.00",  usuarios: 2  },
  { id: "500",  facturas: 500,  montoRD: 2320,  montoUSD: "38.67",  usuarios: 3  },
  { id: "1000", facturas: 1000, montoRD: 3890,  montoUSD: "64.83",  usuarios: 5  },
  { id: "2000", facturas: 2000, montoRD: 6340,  montoUSD: "105.67", usuarios: 8  },
  { id: "3000", facturas: 3000, montoRD: 8290,  montoUSD: "138.17", usuarios: 12 },
  { id: "4000", facturas: 4000, montoRD: 10300, montoUSD: "171.67", usuarios: 15 },
];

export function buscarPlan(id: string): Plan | undefined {
  return PLANES.find((p) => p.id === id);
}
