// Planes de suscripción mensual por volumen de comprobantes — reemplazan al
// pago único de certificación: el primer cobro de un plan es justo lo que
// activa/paga el proceso de certificación, no hay un cargo de activación
// aparte.
//
// montoUSD es una conversión de referencia a ~RD$60 = US$1 (Pagadito siempre
// cobra en USD, ver lib/payments/pagadito.ts) — igual que el resto de
// cifras de este proyecto, es provisional hasta confirmar una tasa fija o
// conversión en tiempo real antes de lanzar de verdad.
export interface Plan {
  id:        string;
  facturas:  number;
  montoRD:   number;
  montoUSD:  string;
}

export const PLANES: Plan[] = [
  { id: "250",  facturas: 250,  montoRD: 1380,  montoUSD: "23.00"  },
  { id: "500",  facturas: 500,  montoRD: 2320,  montoUSD: "38.67"  },
  { id: "1000", facturas: 1000, montoRD: 3890,  montoUSD: "64.83"  },
  { id: "2000", facturas: 2000, montoRD: 6340,  montoUSD: "105.67" },
  { id: "3000", facturas: 3000, montoRD: 8290,  montoUSD: "138.17" },
  { id: "4000", facturas: 4000, montoRD: 10300, montoUSD: "171.67" },
];

export function buscarPlan(id: string): Plan | undefined {
  return PLANES.find((p) => p.id === id);
}
