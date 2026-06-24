import type { TipoECF } from "@/types";

// `config/secuencias` está bloqueado a escritura de cliente en
// firestore.rules (ver app/api/sandbox/secuencia/route.ts) — esta función
// llama a esa ruta en vez de escribir directo a Firestore.
export async function nextSecuencia(tenantId: string, tipo: TipoECF | "COT"): Promise<number> {
  const res = await fetch("/api/sandbox/secuencia", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId, tipo }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "No se pudo generar el número de secuencia");
  return data.secuencia as number;
}
