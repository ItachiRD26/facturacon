import { redirect } from "next/navigation";

// Esta pantalla ahora vive en "Equipo y accesos" (pestaña Administradores).
export default async function UsuariosRedirect({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  redirect(`/panel/${tenantId}/equipo?tab=admins`);
}
