"use client";

import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Producto } from "@/types";
import { verificarLimite } from "@/lib/sandbox/verificar-limite";

function cleanData(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) if (value !== undefined) result[key] = value;
  return result;
}

export function useProductos(tenantId: string) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    const q = query(collection(db, "tenants", tenantId, "productos"), orderBy("nombre", "asc"));
    const unsub = onSnapshot(q,
      (snap) => { setProductos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Producto))); setLoading(false); },
      (err) => { console.error("[useProductos]", err); setError("Error cargando inventario"); setLoading(false); }
    );
    return () => unsub();
  }, [tenantId]);

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
