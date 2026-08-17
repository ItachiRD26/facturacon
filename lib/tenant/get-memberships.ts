import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import type { Membership, RolMembership } from "@/types/tenant";

export async function getMembership(uid: string, tenantId: string): Promise<Membership | null> {
  const snap = await adminDb.collection("memberships").doc(`${uid}_${tenantId}`).get();
  if (!snap.exists) return null;
  return snap.data() as Membership;
}

export async function listMembershipsForUser(uid: string): Promise<Membership[]> {
  const snap = await adminDb.collection("memberships").where("uid", "==", uid).get();
  return snap.docs.map((d) => d.data() as Membership);
}

export async function createMembership(
  uid: string, tenantId: string, rol: RolMembership
): Promise<void> {
  await adminDb.collection("memberships").doc(`${uid}_${tenantId}`).set({
    uid, tenantId, rol, creadoEn: new Date().toISOString(),
  });
}

// Para la pantalla de administración de usuarios — no expuesto vía
// firestore.rules (un miembro solo puede leer su propia membership), así
// que esto solo se usa server-side con el Admin SDK.
export async function listMembershipsForTenant(tenantId: string): Promise<Membership[]> {
  const snap = await adminDb.collection("memberships").where("tenantId", "==", tenantId).get();
  return snap.docs.map((d) => d.data() as Membership);
}

export async function updateMembershipRol(uid: string, tenantId: string, rol: RolMembership): Promise<void> {
  await adminDb.collection("memberships").doc(`${uid}_${tenantId}`).update({ rol });
}

export async function deleteMembership(uid: string, tenantId: string): Promise<void> {
  await adminDb.collection("memberships").doc(`${uid}_${tenantId}`).delete();
}
