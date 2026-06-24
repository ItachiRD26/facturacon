import MetodosPagoClient from "@/components/panel/metodos-pago-client";

export default async function MetodosPagoPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return <MetodosPagoClient tenantId={tenantId} />;
}
