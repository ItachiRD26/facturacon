import { redirect } from "next/navigation";

// Antes "Métodos de pago". Ahora es "Plan y facturación" — se conserva la ruta
// para no romper enlaces antiguos (p. ej. el mensaje de error de emisión).
export default async function MetodosPagoRedirect({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  redirect(`/panel/${tenantId}/plan`);
}
