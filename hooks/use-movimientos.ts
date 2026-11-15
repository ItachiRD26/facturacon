"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface MovimientoInventario {
  id: string; productoId: string; codigo: string; nombre: string;
  tipo: "venta" | "entrada" | "merma" | "ajuste";
  cantidad: number; stockAntes?: number; stockResultante?: number;
  motivo?: string; referencia?: string; costo?: number; uid?: string; fecha: string;
}

// Historial de un producto. Se pide solo por productoId (sin orderBy) para no depender de un
// índice compuesto, y se ordena aquí del más reciente al más antiguo.
export function useMovimientos(tenantId: string, productoId: string | null) {
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId || !productoId) return;
    const q = query(collection(db, "tenants", tenantId, "movimientos_inventario"), where("productoId", "==", productoId));
    const unsub = onSnapshot(q,
      (snap) => {
        setMovimientos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MovimientoInventario)).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 100));
        setLoading(false); setError(null);
      },
      (err) => { console.error("[useMovimientos]", err); setError("No se pudo cargar el historial."); setLoading(false); },
    );
    return () => unsub();
  }, [tenantId, productoId]);

  return { movimientos, loading, error };
}
