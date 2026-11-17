// Cálculo (puro, sin servidor) del rango de e-NCF a partir de CUÁNTOS comprobantes pidió el usuario
// en la Oficina Virtual. Lo usan la pantalla (para mostrar la vista previa) y el servidor (para guardar),
// así lo que el usuario ve es exactamente lo que se registra.
//
// Reglas:
//  - Primera solicitud de un tipo: la numeración empieza en 1.
//  - Si ya tenía un rango vigente: la nueva solicitud CONTINÚA a partir del final (se amplía el mismo rango).
//  - Si el rango anterior ya venció: el nuevo rango empieza después del final del anterior.
//  - Vencimiento: 31 de diciembre del año siguiente al de la solicitud (p. ej. pedido en 2026 → 31-12-2027).
export interface RangoBase { desde: number; hasta: number; vencimiento: string; ultimo: number }

export const MAX_CANTIDAD = 9_999_999;

export function vencimientoPorDefecto(hoyISO: string): string {
  return `${Number(hoyISO.slice(0, 4)) + 1}-12-31`;
}

export interface RangoCalculado { desde: number; hasta: number; vencimiento: string; modo: "primero" | "amplia" | "nuevo" }

export function calcularRango(actual: RangoBase | undefined, cantidad: number, hoyISO: string): RangoCalculado {
  const vencimiento = vencimientoPorDefecto(hoyISO);
  if (!actual) return { desde: 1, hasta: cantidad, vencimiento, modo: "primero" };
  if (actual.vencimiento >= hoyISO) return { desde: actual.desde, hasta: actual.hasta + cantidad, vencimiento, modo: "amplia" };
  return { desde: actual.hasta + 1, hasta: actual.hasta + cantidad, vencimiento, modo: "nuevo" };
}
