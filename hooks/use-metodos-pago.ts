"use client";

import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MetodoPago } from "@/types/pagos";

export const LIMITE_METODOS_PAGO = 5;

export function useMetodosPago(tenantId: string) {
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const q = query(collection(db, "tenants", tenantId, "metodos_pago"), orderBy("creadoEn", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setMetodos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MetodoPago)));
      setLoading(false);
    });
    return () => unsub();
  }, [tenantId]);

  const agregar = async (data: Omit<MetodoPago, "id" | "creadoEn">) => {
    if (metodos.length >= LIMITE_METODOS_PAGO) {
      throw new Error(`Ya tienes ${LIMITE_METODOS_PAGO} métodos de pago guardados. Elimina alguno antes de agregar otro.`);
    }
    const ref = collection(db, "tenants", tenantId, "metodos_pago");
    if (data.predeterminado) {
      const batch = writeBatch(db);
      for (const m of metodos) if (m.predeterminado) batch.update(doc(ref, m.id), { predeterminado: false });
      const nuevoRef = doc(ref);
      batch.set(nuevoRef, { ...data, creadoEn: serverTimestamp() });
      await batch.commit();
    } else {
      await addDoc(ref, { ...data, creadoEn: serverTimestamp() });
    }
  };

  const marcarPredeterminado = async (id: string) => {
    const batch = writeBatch(db);
    const ref = collection(db, "tenants", tenantId, "metodos_pago");
    for (const m of metodos) batch.update(doc(ref, m.id), { predeterminado: m.id === id });
    await batch.commit();
  };

  const eliminar = async (id: string) => {
    await deleteDoc(doc(db, "tenants", tenantId, "metodos_pago", id));
  };

  return { metodos, loading, agregar, marcarPredeterminado, eliminar };
}
