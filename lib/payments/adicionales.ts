// Adicionales sobre el plan: comprobantes que pasan el tope del mes y usuarios por
// encima de los incluidos. El plan mensual lo cobra Pagadito como suscripción
// fija; los adicionales se calculan al cierre de cada mes y se cobran aparte, una
// sola vez, con el mismo token de tarjeta (cobrarConToken). Cada cierre queda como
// un cargo en tenants/{id}/facturacion/cargos/{yyyy-mm}.
import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { obtenerSuscripcion } from "./suscripcion";
import { buscarPlan, TARIFAS_ADICIONALES, type Plan } from "./planes";
import { cobrarConToken } from "./pagadito-tokenizacion";
import { cupoUsuarios } from "@/lib/tenant/limite-usuarios";

// Misma conversión de referencia que usa planes.ts (RD$ 60 = US$ 1).
const RD_POR_USD = 60;
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function mesActual(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santo_Domingo", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
}
export function mesAnterior(mes = mesActual()): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function rango(mes: string): { inicio: string; fin: string } {
  const [a, m] = mes.split("-").map(Number);
  const f = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  return { inicio: f(new Date(a, m - 1, 1)), fin: f(new Date(a, m, 1)) };
}

export async function comprobantesDelMes(tenantId: string, mes: string): Promise<number> {
  const { inicio, fin } = rango(mes);
  const snap = await adminDb.collection("tenants").doc(tenantId).collection("facturas")
    .where("fecha", ">=", inicio).where("fecha", "<", fin).count().get();
  return snap.data().count;
}

export interface ResumenAdicionales {
  mes: string;
  plan: Plan;
  comprobantes: { incluidos: number; emitidos: number; excedentes: number; costoUnitarioRD: number; costoRD: number };
  usuarios: { incluidos: number; usados: number; extra: number; costoUnitarioRD: number; costoRD: number };
  totalRD: number;
}

// Cálculo puro (sin Firestore): sirve para el cierre, el panel y la advertencia al emitir.
export function calcularAdicionales(plan: Plan, emitidos: number, usuariosUsados: number, mes: string): ResumenAdicionales {
  const excedentes = Math.max(0, emitidos - plan.facturas);
  const extra = Math.max(0, usuariosUsados - plan.usuarios);
  const costoComp = r2(excedentes * plan.extraRD);
  const costoUsr = r2(extra * TARIFAS_ADICIONALES.usuarioRD);
  return {
    mes, plan,
    comprobantes: { incluidos: plan.facturas, emitidos, excedentes, costoUnitarioRD: plan.extraRD, costoRD: costoComp },
    usuarios: { incluidos: plan.usuarios, usados: usuariosUsados, extra, costoUnitarioRD: TARIFAS_ADICIONALES.usuarioRD, costoRD: costoUsr },
    totalRD: r2(costoComp + costoUsr),
  };
}

// Uso del mes en curso (o de otro mes) de un tenant con plan activo. null si no hay plan.
export async function resumenAdicionales(tenantId: string, mes = mesActual()): Promise<ResumenAdicionales | null> {
  const sus = await obtenerSuscripcion(tenantId);
  const plan = sus?.estado === "activa" ? buscarPlan(sus.planId) : undefined;
  if (!plan) return null;
  const [emitidos, cupo] = await Promise.all([comprobantesDelMes(tenantId, mes), cupoUsuarios(tenantId)]);
  return calcularAdicionales(plan, emitidos, cupo.usados, mes);
}

export type EstadoCargo = "sin_cargo" | "cobrado" | "fallido" | "pendiente";
export interface CargoMes {
  mes: string; estado: EstadoCargo;
  emitidos: number; incluidos: number; excedentes: number; costoComprobantesRD: number;
  usuariosExtra: number; costoUsuariosRD: number;
  totalRD: number; totalUSD: string;
  intentos: number; error?: string; autorizacion?: string; cobradoEn?: string; creadoEn: string;
}

// Cierra un mes: calcula los adicionales y, si hay algo que cobrar, lo cobra con el
// token de la tarjeta. Idempotente: un mes ya cobrado o sin cargo no se repite, y uno
// fallido/pendiente se reintenta.
export async function cerrarMesYCobrar(tenantId: string, mes: string): Promise<CargoMes | null> {
  const ref = adminDb.collection("tenants").doc(tenantId).collection("facturacion").doc("cargos").collection("meses").doc(mes);
  const previo = await ref.get();
  if (previo.exists && ["cobrado", "sin_cargo"].includes((previo.data() as CargoMes).estado)) return previo.data() as CargoMes;

  const sus = await obtenerSuscripcion(tenantId);
  const plan = sus?.estado === "activa" ? buscarPlan(sus.planId) : undefined;
  if (!sus || !plan) return null;

  const [emitidos, cupo] = await Promise.all([comprobantesDelMes(tenantId, mes), cupoUsuarios(tenantId)]);
  const r = calcularAdicionales(plan, emitidos, cupo.usados, mes);
  const base: CargoMes = {
    mes, estado: "sin_cargo",
    emitidos, incluidos: plan.facturas, excedentes: r.comprobantes.excedentes, costoComprobantesRD: r.comprobantes.costoRD,
    usuariosExtra: r.usuarios.extra, costoUsuariosRD: r.usuarios.costoRD,
    totalRD: r.totalRD, totalUSD: r2(r.totalRD / RD_POR_USD).toFixed(2),
    intentos: ((previo.data() as CargoMes | undefined)?.intentos ?? 0), creadoEn: (previo.data() as CargoMes | undefined)?.creadoEn ?? new Date().toISOString(),
  };

  if (r.totalRD <= 0) { await ref.set(base); return base; }

  if (!sus.browserInfo) {
    const c: CargoMes = { ...base, estado: "pendiente", error: "Falta la información del dispositivo de la tarjeta para cobrar el adicional." };
    await ref.set(c); return c;
  }

  const descripcion = [
    r.comprobantes.excedentes > 0 ? `${r.comprobantes.excedentes} comprobantes adicionales` : "",
    r.usuarios.extra > 0 ? `${r.usuarios.extra} usuarios adicionales` : "",
  ].filter(Boolean).join(" y ");

  try {
    const res = await cobrarConToken({
      payment_token: sus.paymentToken,
      browserInfo: sus.browserInfo,
      transaction: {
        merchantTransactionId: `adic-${tenantId}-${mes}`, currencyId: "USD",
        transactionDetails: [{ quantity: "1", description: `Facturacon ${mes}: ${descripcion}`.slice(0, 120), amount: base.totalUSD }],
      },
    });
    const c: CargoMes = { ...base, estado: "cobrado", intentos: base.intentos + 1, autorizacion: res.authorization, cobradoEn: new Date().toISOString() };
    await ref.set(c); return c;
  } catch (e) {
    const c: CargoMes = { ...base, estado: "fallido", intentos: base.intentos + 1, error: e instanceof Error ? e.message.slice(0, 300) : "Error al cobrar" };
    await ref.set(c); return c;
  }
}
