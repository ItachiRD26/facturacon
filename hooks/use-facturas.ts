"use client";

import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Factura, EstadoFactura } from "@/types";
import { useColeccionCompartida } from "./use-coleccion-compartida";

function cleanData(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) if (value !== undefined) result[key] = value;
  return result;
}

// `creadoPorUid`: pásalo cuando quien consulta es un cajero (rol vendedor) —
// firestore.rules solo le permite leer sus propias facturas, y Firestore
// rechaza un list() completo si el query no trae el mismo where() que exige
// la regla (no filtra "en silencio", falla con permission-denied).
// `undefined` = sin filtro (dueño/admin/contador). `null` = el filtro aplica
// pero el uid todavía no está listo (auth cargando) — no consultar todavía,
// para no disparar un list() sin where() que Firestore rechazaría igual.
export function useFacturas(tenantId: string, creadoPorUid?: string | null) {
  // Una sola escucha compartida por colección (ver use-coleccion-compartida.ts): no se relee al cambiar de pantalla.
  const { datos: facturas, loading, error } = useColeccionCompartida<Factura>({ tenantId, coleccion: "facturas", orden: ["fecha", "desc"], mensajeError: "Error cargando facturas", donde: creadoPorUid ? ["creadoPor", creadoPorUid] : undefined, activo: creadoPorUid !== null });

  const agregar = async (data: Omit<Factura, "id">) => {
    const ref = await addDoc(collection(db, "tenants", tenantId, "facturas"), cleanData({ ...data, creadoEn: serverTimestamp() }));
    return ref.id;
  };
  const actualizar = async (id: string, data: Partial<Factura>) => {
    await updateDoc(doc(db, "tenants", tenantId, "facturas", id), cleanData({ ...data, actualizadoEn: serverTimestamp() }));
  };
  const cambiarEstado = async (id: string, estado: EstadoFactura) => {
    await updateDoc(doc(db, "tenants", tenantId, "facturas", id), { estado, actualizadoEn: serverTimestamp() });
  };

  return { facturas, loading, error, agregar, actualizar, cambiarEstado };
}
