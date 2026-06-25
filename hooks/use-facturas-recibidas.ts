"use client";

import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { FacturaRecibida } from "@/types";
import { verificarLimite } from "@/lib/sandbox/verificar-limite";
import { excluirMuestra } from "@/lib/tenant/excluir-muestra";

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
  const [recibidas, setRecibidas] = useState<FacturaRecibida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    const q = query(collection(db, "tenants", tenantId, "facturas_recibidas"), orderBy("fechaEmision", "desc"));
    const unsub = onSnapshot(q,
      (snap) => { setRecibidas(excluirMuestra(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FacturaRecibida)))); setLoading(false); },
      (err) => { console.error("[useFacturasRecibidas]", err); setError("Error cargando facturas recibidas"); setLoading(false); }
    );
    return () => unsub();
  }, [tenantId]);

  const agregar = async (data: Omit<FacturaRecibida, "id">) => {
    await verificarLimite(tenantId, "facturas_recibidas");
    await addDoc(collection(db, "tenants", tenantId, "facturas_recibidas"), cleanData({ ...data, recibidoEn: serverTimestamp() }));
  };
  const eliminar = async (id: string) => {
    await deleteDoc(doc(db, "tenants", tenantId, "facturas_recibidas", id));
  };

  return { recibidas, loading, error, agregar, eliminar };
}
