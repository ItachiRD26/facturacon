import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { obtenerSuscripcion } from "@/lib/payments/suscripcion";
import { buscarPlan } from "@/lib/payments/planes";

export interface CupoUsuarios {
  // null = sin tope (todavía no hay plan: sandbox o certificándose).
  incluidos: number | null;
  usados: number;
  lleno: boolean;
}

// Cada plan incluye un número de usuarios (dueño + administradores + cajeros).
// El tope solo aplica cuando hay un plan activo: antes de eso el equipo se
// puede armar libremente desde el sandbox.
export async function cupoUsuarios(tenantId: string): Promise<CupoUsuarios> {
  const [suscripcion, miembros, revocados] = await Promise.all([
    obtenerSuscripcion(tenantId),
    adminDb.collection("memberships").where("tenantId", "==", tenantId).count().get(),
    adminDb.collection("tenants").doc(tenantId).collection("empleados").where("activo", "==", false).count().get(),
  ]);
  // Un cajero revocado conserva su membership (solo se desactiva su código), pero ya
  // no es una persona con acceso: no debe ocupar un cupo del plan.
  const usados = Math.max(0, miembros.data().count - revocados.data().count);
  const plan = suscripcion?.estado === "activa" ? buscarPlan(suscripcion.planId) : undefined;
  const incluidos = plan?.usuarios ?? null;
  return { incluidos, usados, lleno: incluidos !== null && usados >= incluidos };
}

export function mensajeCupoLleno(c: CupoUsuarios): string {
  return `Tu plan incluye ${c.incluidos} usuarios y ya los usaste todos. Sube de plan en "Plan y facturación" para agregar más personas.`;
}
