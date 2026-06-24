"use client";

import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc,
  doc, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Factura, EstadoFactura } from "@/types";

function cleanData(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) if (value !== undefined) result[key] = value;
  return result;
}

export function useFacturas(tenantId: string) {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    const q = query(collection(db, "tenants", tenantId, "facturas"), orderBy("fecha", "desc"));
    const unsub = onSnapshot(q,
      (snap) => { setFacturas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Factura))); setLoading(false); },
      (err) => { console.error("[useFacturas]", err); setError("Error cargando facturas"); setLoading(false); }
    );
    return () => unsub();
  }, [tenantId]);

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
