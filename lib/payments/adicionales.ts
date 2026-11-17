// Adicionales sobre el plan: comprobantes que pasan el tope del mes y usuarios por
// encima de los incluidos. Se calculan mes por mes y se SUMAN al siguiente cobro del
// plan (mensual: el cobro del mes siguiente; anual: el pago del año siguiente); la
// cobranza vive en lib/payments/cobros.ts.
import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { obtenerSuscripcion } from "./suscripcion";
import { buscarPlan, TARIFAS_ADICIONALES, type Plan } from "./planes";
import { cupoUsuarios } from "@/lib/tenant/limite-usuarios";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function mesActual(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santo_Domingo", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
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

export interface DetalleMesAdicional {
  mes: string; emitidos: number; excedentes: number; costoComprobantesRD: number; usuariosExtra: number; costoUsuariosRD: number; totalRD: number;
}

// Adicionales de varios meses ya cerrados (o del mes en curso al cancelar), para sumarlos al próximo cobro.
// Los comprobantes se cuentan mes por mes; los usuarios extra, con el equipo que hay al calcular.
export async function adicionalesDeMeses(tenantId: string, plan: Plan, meses: string[]): Promise<{ totalRD: number; detalle: DetalleMesAdicional[] }> {
  if (!meses.length) return { totalRD: 0, detalle: [] };
  const [cupo, conteos] = await Promise.all([
    cupoUsuarios(tenantId),
    Promise.all(meses.map((m) => comprobantesDelMes(tenantId, m))),
  ]);
  const detalle = meses.map((mes, i) => {
    const r = calcularAdicionales(plan, conteos[i], cupo.usados, mes);
    return { mes, emitidos: conteos[i], excedentes: r.comprobantes.excedentes, costoComprobantesRD: r.comprobantes.costoRD, usuariosExtra: r.usuarios.extra, costoUsuariosRD: r.usuarios.costoRD, totalRD: r.totalRD };
  });
  return { totalRD: r2(detalle.reduce((a, d) => a + d.totalRD, 0)), detalle };
}
