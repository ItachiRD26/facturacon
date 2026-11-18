"use client";

import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Abono, CuentaPorCobrar } from "@/types";
import { calcPendiente } from "@/types";
import { useColeccionCompartida } from "./use-coleccion-compartida";

function cleanData(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) if (value !== undefined) result[key] = value;
  return result;
}

export function useCuentasPorCobrar(tenantId: string) {
  // Una sola escucha compartida por colección (ver use-coleccion-compartida.ts): no se relee al cambiar de pantalla.
  const { datos: cuentas, loading, error } = useColeccionCompartida<CuentaPorCobrar>({ tenantId, coleccion: "cuentas_por_cobrar", orden: ["fecha", "desc"], mensajeError: "Error cargando cuentas por cobrar" });

  const agregar = async (data: Omit<CuentaPorCobrar, "id">) => {
    const ref = await addDoc(collection(db, "tenants", tenantId, "cuentas_por_cobrar"), cleanData({ ...data, creadoEn: serverTimestamp() }));
    return ref.id;
  };

  const registrarAbono = async (cuenta: CuentaPorCobrar, abono: Omit<Abono, "id" | "registradoEn">) => {
    const nuevoAbono: Abono = { ...abono, id: crypto.randomUUID(), registradoEn: new Date().toISOString() };
    const abonos = [...cuenta.abonos, nuevoAbono];
    const pagado = cuenta.pagado + abono.monto;
    const pendiente = calcPendiente({ ...cuenta, pagado });
    await updateDoc(doc(db, "tenants", tenantId, "cuentas_por_cobrar", cuenta.id), cleanData({
      abonos, pagado, estado: pendiente <= 0 ? "pagada" : cuenta.estado, actualizadoEn: serverTimestamp(),
    }));
  };

  return { cuentas, loading, error, agregar, registrarAbono };
}
