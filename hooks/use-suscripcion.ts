"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Suscripcion } from "@/types/pagos";

// Solo lectura — a diferencia de useMetodosPago, esto nunca escribe desde el
// cliente: activar/cancelar el cobro recurrente pasa por /api/payments/
// tokenizacion/* porque tocan payment_token/subscription_code (ver
// firestore.rules, facturacion/{doc} allow write: if false).
export function useSuscripcion(tenantId: string) {
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const ref = doc(db, "tenants", tenantId, "facturacion", "suscripcion");
    const unsub = onSnapshot(ref,
      (snap) => { setSuscripcion(snap.exists() ? (snap.data() as Suscripcion) : null); setLoading(false); },
      (err) => { console.error("[useSuscripcion]", err); setLoading(false); },
    );
    return () => unsub();
  }, [tenantId]);

  return { suscripcion, loading };
}
