import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { obtenerSuscripcion } from "@/lib/payments/suscripcion";
import { buscarPlan, TARIFAS_ADICIONALES } from "@/lib/payments/planes";
import { cuentaComoUsuario } from "@/lib/tenant/roles";

export interface CupoUsuarios {
  // null = sin tope (todavía no hay plan: sandbox o certificándose).
  incluidos: number | null;
  usados: number;
  // Ya se usaron todos los incluidos: el siguiente usuario es ADICIONAL (se cobra aparte).
  lleno: boolean;
  extra: number;
  costoExtraRD: number;
  // Plan Emprendedor (una sola caja): no se pueden agregar más cajas, ni pagando.
  soloUnUsuario: boolean;
}

// Cada plan incluye un número de USUARIOS DE CAJA (cajeros y personal de almacén con código de acceso). El dueño y los
// administradores no cuentan (ver ROLES_QUE_CUENTAN_COMO_USUARIO). El tope solo aplica cuando hay un plan activo: antes
// de eso el equipo se puede armar libremente desde el sandbox.
export async function cupoUsuarios(tenantId: string): Promise<CupoUsuarios> {
  const [suscripcion, miembros, empleados] = await Promise.all([
    obtenerSuscripcion(tenantId),
    adminDb.collection("memberships").where("tenantId", "==", tenantId).select("rol").get(),
    adminDb.collection("tenants").doc(tenantId).collection("empleados").select("rol", "activo").get(),
  ]);
  const cajas = miembros.docs.filter((d) => cuentaComoUsuario(String(d.data().rol))).length;
  // Un cajero revocado conserva su membership (solo se desactiva su código), pero ya no es una persona con acceso:
  // no debe ocupar un cupo del plan.
  const revocados = empleados.docs.filter((d) => d.data().activo === false && cuentaComoUsuario(String(d.data().rol))).length;
  const usados = Math.max(0, cajas - revocados);
  const plan = suscripcion?.estado === "activa" && !suscripcion.ilimitado ? buscarPlan(suscripcion.planId) : undefined;
  const incluidos = plan?.usuarios ?? null;
  return {
    incluidos, usados, lleno: incluidos !== null && usados >= incluidos,
    extra: incluidos !== null ? Math.max(0, usados - incluidos) : 0, costoExtraRD: TARIFAS_ADICIONALES.usuarioRD,
    soloUnUsuario: !!plan?.soloUnUsuario,
  };
}

// Con el plan lleno se puede seguir agregando gente: cada usuario extra se cobra aparte al cierre del mes.
export function mensajeUsuarioAdicional(c: CupoUsuarios): string {
  return `Tu plan incluye ${c.incluidos} ${c.incluidos === 1 ? "usuario de caja" : "usuarios de caja"} y ya los usaste todos. Esta caja será adicional (ITBIS incluido): RD$ ${c.costoExtraRD.toLocaleString("es-DO")} al mes, que se suman a tu cobro del mes siguiente. ¿Agregarlo?`;
}

export const MENSAJE_SOLO_UN_USUARIO =
  "El plan Emprendedor incluye 1 usuario de caja. Para tener más cajas, cambia a un plan con más usuarios.";
