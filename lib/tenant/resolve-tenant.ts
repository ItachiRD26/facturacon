import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import type { Tenant } from "@/types/tenant";

interface CacheEntry { tenant: Tenant; expira: number }
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60 * 1000;

export async function resolveTenantBySlug(slug: string): Promise<Tenant | null> {
  const hit = cache.get(slug);
  if (hit && hit.expira > Date.now()) return hit.tenant;

  const snap = await adminDb.collection("tenants").where("slug", "==", slug).limit(1).get();
  if (snap.empty) return null;

  const doc = snap.docs[0];
  const tenant = { id: doc.id, ...(doc.data() as Omit<Tenant, "id">) };
  cache.set(slug, { tenant, expira: Date.now() + TTL_MS });
  return tenant;
}

export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const snap = await adminDb.collection("tenants").doc(tenantId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<Tenant, "id">) };
}
