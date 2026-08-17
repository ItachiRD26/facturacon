import { redirect } from "next/navigation";
import { getSessionUid } from "@/lib/auth/session";
import { listMembershipsForUser } from "@/lib/tenant/get-memberships";
import { adminDb } from "@/lib/firebase-admin";
import type { UserPerfil } from "@/types/tenant";
import OnboardingClient from "./onboarding-client";

// Una cuenta "individual" está ligada a una sola empresa de forma permanente
// — a diferencia de un "gestor", que puede volver a este wizard tantas veces
// como quiera para agregar clientes. Este chequeo es la aplicación real del
// límite (no solo ocultar el botón "Agregar empresa" en /panel, que un
// individual nunca ve de todas formas): si alguien llega aquí por URL
// directa o el botón "atrás" del navegador, lo mandamos de vuelta a su única
// empresa en vez de dejarlo crear una segunda.
export default async function OnboardingPage() {
  const uid = await getSessionUid();
  if (!uid) redirect("/login?redirect=/onboarding");

  const [perfilSnap, memberships] = await Promise.all([
    adminDb.collection("users").doc(uid).get(),
    listMembershipsForUser(uid),
  ]);
  const tipoCuenta = (perfilSnap.data() as UserPerfil | undefined)?.tipoCuenta;

  if (tipoCuenta === "individual" && memberships.length > 0) {
    redirect(`/panel/${memberships[0].tenantId}`);
  }

  return <OnboardingClient />;
}
