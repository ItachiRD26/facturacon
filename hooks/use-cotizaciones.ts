"use client";

import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, arrayUnion,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Cotizacion, EstadoCotizacion } from "@/types";
import { excluirMuestra } from "@/lib/tenant/excluir-muestra";

// Quién hace la acción — se guarda en el historial de la cotización. No
// hay sentinel de servidor (serverTimestamp) dentro de un arrayUnion, así
// que la fecha va con el reloj del cliente (suficiente para una bitácora,
// a diferencia de las fechas fiscales de un e-CF que sí exigen precisión).
export interface Autor { uid: string; nombre: string }

function cleanData(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) if (value !== undefined) result[key] = value;
  return result;
}

export function useCotizaciones(tenantId: string) {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    const q = query(collection(db, "tenants", tenantId, "cotizaciones"), orderBy("fecha", "desc"));
    const unsub = onSnapshot(q,
      (snap) => { setCotizaciones(excluirMuestra(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cotizacion)))); setLoading(false); },
      (err) => { console.error("[useCotizaciones]", err); setError("Error cargando cotizaciones"); setLoading(false); }
    );
    return () => unsub();
  }, [tenantId]);

  const agregar = async (data: Omit<Cotizacion, "id">) => {
    const ref = await addDoc(collection(db, "tenants", tenantId, "cotizaciones"), cleanData({ ...data, creadoEn: serverTimestamp() }));
    return ref.id;
  };
  const actualizar = async (id: string, data: Partial<Cotizacion>, autor?: Autor) => {
    const cambios: Record<string, unknown> = { ...data, actualizadoEn: serverTimestamp() };
    if (autor) {
      cambios.historial = arrayUnion({
        uid: autor.uid, nombre: autor.nombre, accion: "Editó la cotización", fecha: new Date().toISOString(),
      });
    }
    await updateDoc(doc(db, "tenants", tenantId, "cotizaciones", id), cleanData(cambios));
  };
  const cambiarEstado = async (id: string, estado: EstadoCotizacion, autor?: Autor) => {
    const cambios: Record<string, unknown> = { estado, actualizadoEn: serverTimestamp() };
    if (autor) {
      const accion = estado === "anulada" ? "Anuló la cotización" : `Cambió el estado a "${estado}"`;
      cambios.historial = arrayUnion({ uid: autor.uid, nombre: autor.nombre, accion, fecha: new Date().toISOString() });
    }
    await updateDoc(doc(db, "tenants", tenantId, "cotizaciones", id), cambios);
  };
  const eliminar = async (id: string) => {
    await deleteDoc(doc(db, "tenants", tenantId, "cotizaciones", id));
  };

  return { cotizaciones, loading, error, agregar, actualizar, cambiarEstado, eliminar };
}
