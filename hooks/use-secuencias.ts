import type { TipoECF } from "@/types";

// `config/secuencias` está bloqueado a escritura de cliente en
// firestore.rules (ver app/api/sandbox/secuencia/route.ts) — esta función
// llama a esa ruta en vez de escribir directo a Firestore.
export async function nextSecuencia(tenantId: string, tipo: TipoECF | "COT"): Promise<number> {
  const res = await fetch("/api/sandbox/secuencia", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId, tipo }),
  });
  if (!res.ok) throw new Error("No se pudo generar el número de secuencia");
  const data = await res.json();
  return data.secuencia as number;
}
