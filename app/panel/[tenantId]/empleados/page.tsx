import { redirect } from "next/navigation";

// Esta pantalla ahora vive en "Equipo y accesos" (pestaña Cajeros y personal).
// Se conserva la ruta para no romper enlaces o favoritos antiguos.
export default async function EmpleadosRedirect({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  redirect(`/panel/${tenantId}/equipo`);
}
