"use client";

import { collection, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { FacturaRecibida } from "@/types";
import { verificarLimite } from "@/lib/sandbox/verificar-limite";
import { useColeccionCompartida } from "./use-coleccion-compartida";

function cleanData(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) if (value !== undefined) result[key] = value;
  return result;
}

// En producción, las facturas recibidas las entrega la DGII vía su API de
// receptor electrónico (lectura, no se "crean" desde la UI). En el sandbox
// no hay conexión real a DGII, así que aquí se permite registrarlas a mano
// para que el prospecto vea cómo luce el módulo de recepción.
export function useFacturasRecibidas(tenantId: string) {
  // Una sola escucha compartida por colección (ver use-coleccion-compartida.ts): no se relee al cambiar de pantalla.
  const { datos: recibidas, loading, error } = useColeccionCompartida<FacturaRecibida>({ tenantId, coleccion: "facturas_recibidas", orden: ["fechaEmision", "desc"], mensajeError: "Error cargando facturas recibidas" });

  const agregar = async (data: Omit<FacturaRecibida, "id">) => {
    await verificarLimite(tenantId, "facturas_recibidas");
    await addDoc(collection(db, "tenants", tenantId, "facturas_recibidas"), cleanData({ ...data, recibidoEn: serverTimestamp() }));
  };
  const eliminar = async (id: string) => {
    await deleteDoc(doc(db, "tenants", tenantId, "facturas_recibidas", id));
  };

  return { recibidas, loading, error, agregar, eliminar };
}
