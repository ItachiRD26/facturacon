"use client";

import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Cliente } from "@/types";
import { verificarLimite } from "@/lib/sandbox/verificar-limite";
import { useColeccionCompartida } from "./use-coleccion-compartida";

function cleanData(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) if (value !== undefined) result[key] = value;
  return result;
}

export function useClientes(tenantId: string) {
  // Una sola escucha compartida por colección (ver use-coleccion-compartida.ts): no se relee al cambiar de pantalla.
  const { datos: clientes, loading, error } = useColeccionCompartida<Cliente>({ tenantId, coleccion: "clientes", orden: ["nombre", "asc"], mensajeError: "Error cargando clientes" });

  const agregar = async (data: Omit<Cliente, "id">) => {
    await verificarLimite(tenantId, "clientes");
    await addDoc(collection(db, "tenants", tenantId, "clientes"), cleanData({ ...data, creadoEn: serverTimestamp() }));
  };
  const actualizar = async (id: string, data: Partial<Cliente>) => {
    await updateDoc(doc(db, "tenants", tenantId, "clientes", id), cleanData({ ...data, actualizadoEn: serverTimestamp() }));
  };
  const eliminar = async (id: string) => {
    await deleteDoc(doc(db, "tenants", tenantId, "clientes", id));
  };

  return { clientes, loading, error, agregar, actualizar, eliminar };
}
