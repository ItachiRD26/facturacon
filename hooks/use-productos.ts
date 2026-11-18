"use client";

import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Producto } from "@/types";
import { verificarLimite } from "@/lib/sandbox/verificar-limite";
import { useColeccionCompartida } from "./use-coleccion-compartida";

function cleanData(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) if (value !== undefined) result[key] = value;
  return result;
}

export function useProductos(tenantId: string) {
  // Una sola escucha compartida por colección (ver use-coleccion-compartida.ts): no se relee al cambiar de pantalla.
  const { datos: productos, loading, error } = useColeccionCompartida<Producto>({ tenantId, coleccion: "productos", orden: ["nombre", "asc"], mensajeError: "Error cargando inventario" });

  const agregar = async (data: Omit<Producto, "id">) => {
    await verificarLimite(tenantId, "productos");
    await addDoc(collection(db, "tenants", tenantId, "productos"), cleanData({ ...data, creadoEn: serverTimestamp() }));
  };
  const actualizar = async (id: string, data: Partial<Producto>) => {
    await updateDoc(doc(db, "tenants", tenantId, "productos", id), cleanData({ ...data, actualizadoEn: serverTimestamp() }));
  };
  const eliminar = async (id: string) => {
    await deleteDoc(doc(db, "tenants", tenantId, "productos", id));
  };

  return { productos, loading, error, agregar, actualizar, eliminar };
}
