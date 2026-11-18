import "server-only";
import { enviarPlantilla } from "@/lib/email/enviar";
import { fechaLarga } from "./enlaces";

// Avisos por correo de cambios en la seguridad de la cuenta. Nunca lanzan error: un correo que falla no debe
// impedir que la persona active, desactive o recupere su verificación.
type Aviso = "segundo_paso_activado" | "segundo_paso_desactivado" | "codigos_recuperacion_nuevos";

export async function avisarSeguridad(id: Aviso, correo: string | undefined, nombre?: string): Promise<void> {
  if (!correo) return;
  await enviarPlantilla(id, { nombre: nombre?.split(" ")[0], fecha: fechaLarga() }, { para: correo }).catch(() => {});
}

export async function avisarRestablecido(correo: string | undefined, nombre: string | undefined, codigosRestantes: number): Promise<void> {
  if (!correo) return;
  await enviarPlantilla("segundo_paso_restablecido", { nombre: nombre?.split(" ")[0], fecha: fechaLarga(), codigosRestantes }, { para: correo }).catch(() => {});
}
