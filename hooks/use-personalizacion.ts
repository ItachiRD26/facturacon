"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Personalizacion } from "@/types/tenant";

// Solo lectura — el logo se sube y procesa vía /api/personalizacion/logo,
// nunca se escribe directo a Firestore desde el cliente (ver firestore.rules).
export function usePersonalizacion(tenantId: string) {
  const [personalizacion, setPersonalizacion] = useState<Personalizacion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const ref = doc(db, "tenants", tenantId, "config", "personalizacion");
    const unsub = onSnapshot(ref,
      (snap) => { setPersonalizacion(snap.exists() ? (snap.data() as Personalizacion) : null); setLoading(false); },
      (err) => { console.error("[usePersonalizacion]", err); setLoading(false); },
    );
    return () => unsub();
  }, [tenantId]);

  return { personalizacion, loading };
}
