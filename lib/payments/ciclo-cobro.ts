// Reglas del ciclo de cobro (módulo PURO: sin Firestore ni Pagadito, fácil de probar).
//
// Política aprobada por Peter:
//  - El cobro cae el día del aniversario de la suscripción (mensual: cada mes; anual: UN solo pago al año).
//  - Cada cobro = plan + adicionales (comprobantes y usuarios extra) de los meses ya cerrados que aún no se cobraron.
//  - Si el cobro falla se reintenta a los 2 y a los 5 días; si el último también falla, se suspende la cuenta.
//    Se avisa por correo con la fecha límite para evitar la suspensión.
//  - Al cancelar se cobran los adicionales acumulados con la tarjeta guardada.
import { montoPeriodoRD, montoPeriodoUSD, type Plan, type PeriodoPlan } from "./planes";

// Misma conversión de referencia que usa planes.ts (RD$ 60 = US$ 1).
export const RD_POR_USD = 60;
/** Días después del vencimiento en que se reintenta el cobro (además del intento del día mismo). */
export const DIAS_REINTENTO = [2, 5] as const;
/** Cobros máximos por ciclo: el del día + los reintentos. */
export const INTENTOS_POR_CICLO = 1 + DIAS_REINTENTO.length;

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const pad = (n: number) => String(n).padStart(2, "0");

const diasEnMes = (anio: number, mes: number) => new Date(Date.UTC(anio, mes, 0)).getUTCDate();
function partes(f: string): { y: number; m: number; d: number } {
  const [y, m, d] = f.split("-").map(Number);
  return { y, m, d };
}

/** Hoy en República Dominicana, "YYYY-MM-DD" (la zona no tiene horario de verano). */
export function hoyRD(ahora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santo_Domingo", year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
}

export function sumarDias(fecha: string, dias: number): string {
  const { y, m, d } = partes(fecha);
  const t = new Date(Date.UTC(y, m - 1, d + dias));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Fecha del ciclo número `k` contado desde el ancla (k = 0 es el ancla). Un 31 cae el último día de los meses cortos y vuelve al 31 después. */
export function fechaCiclo(ancla: string, periodo: PeriodoPlan, k: number): string {
  const { y, m, d } = partes(ancla);
  const total = y * 12 + (m - 1) + (periodo === "anual" ? 12 : 1) * k;
  const ny = Math.floor(total / 12), nm = (total % 12) + 1;
  return `${ny}-${pad(nm)}-${pad(Math.min(d, diasEnMes(ny, nm)))}`;
}

/** Fechas de los intentos de un ciclo que vence en `venc`: el día mismo, +2 y +5 días. */
export function calendarioIntentos(venc: string): string[] {
  return [venc, ...DIAS_REINTENTO.map((n) => sumarDias(venc, n))];
}
/** Último día para pagar sin que se suspenda la cuenta. */
export function fechaLimitePago(venc: string): string {
  return sumarDias(venc, DIAS_REINTENTO[DIAS_REINTENTO.length - 1]);
}

export const mesDe = (fecha: string) => fecha.slice(0, 7);
export function mesAnteriorDe(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${pad(m - 1)}`;
}
function mesSiguiente(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${pad(m + 1)}`;
}

/**
 * Meses con adicionales aún sin cobrar: los posteriores a `facturadoHasta` y hasta `hastaMes` (incluido).
 * Para un cobro de ciclo, `hastaMes` es el mes ANTERIOR al de la fecha de cobro (solo meses ya cerrados);
 * al cancelar es el mes en curso.
 */
export function mesesPorCobrar(facturadoHasta: string | undefined, hastaMes: string): string[] {
  if (!facturadoHasta) return [];
  const out: string[] = [];
  for (let m = mesSiguiente(facturadoHasta); m <= hastaMes && out.length < 36; m = mesSiguiente(m)) out.push(m);
  return out;
}

export interface MontoCiclo {
  planRD: number; adicionalesRD: number; totalRD: number;
  planUSD: string; adicionalesUSD: string; totalUSD: string;
}
/** Total de un cobro: el plan del periodo más los adicionales acumulados (RD$). Pagadito cobra en USD. */
export function montoCiclo(plan: Plan, periodo: PeriodoPlan, adicionalesRD: number): MontoCiclo {
  const adic = r2(Math.max(0, adicionalesRD));
  const adicUSD = r2(adic / RD_POR_USD);
  return {
    planRD: montoPeriodoRD(plan, periodo), adicionalesRD: adic, totalRD: r2(montoPeriodoRD(plan, periodo) + adic),
    planUSD: montoPeriodoUSD(plan, periodo), adicionalesUSD: adicUSD.toFixed(2),
    totalUSD: (Number(montoPeriodoUSD(plan, periodo)) + adicUSD).toFixed(2),
  };
}

/** "2026-12-17" → "17-12-2026" (formato de los correos). */
export function fechaDMA(f: string): string {
  const { y, m, d } = partes(f);
  return `${pad(d)}-${pad(m)}-${y}`;
}
