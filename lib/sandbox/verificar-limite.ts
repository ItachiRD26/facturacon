import type { ColeccionLimitada } from "@/lib/sandbox/limites";

export async function verificarLimite(tenantId: string, coleccion: ColeccionLimitada): Promise<void> {
  const res = await fetch("/api/sandbox/verificar-limite", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId, coleccion }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error ?? "No se pudo agregar el registro.");
  }
}
