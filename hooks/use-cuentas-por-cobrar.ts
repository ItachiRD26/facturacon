"use client";

import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc,
  doc, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Abono, CuentaPorCobrar } from "@/types";
import { calcPendiente } from "@/types";
import { excluirMuestra } from "@/lib/tenant/excluir-muestra";

function cleanData(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) if (value !== undefined) result[key] = value;
  return result;
}

export function useCuentasPorCobrar(tenantId: string) {
  const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    const q = query(collection(db, "tenants", tenantId, "cuentas_por_cobrar"), orderBy("fecha", "desc"));
    const unsub = onSnapshot(q,
      (snap) => { setCuentas(excluirMuestra(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CuentaPorCobrar)))); setLoading(false); },
      (err) => { console.error("[useCuentasPorCobrar]", err); setError("Error cargando cuentas por cobrar"); setLoading(false); }
    );
    return () => unsub();
  }, [tenantId]);

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
