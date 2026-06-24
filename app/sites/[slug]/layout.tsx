import { redirect } from "next/navigation";
import { getSessionUid } from "@/lib/auth/session";
import { resolveTenantBySlug, getTenantById } from "@/lib/tenant/resolve-tenant";
import { getMembership, listMembershipsForUser } from "@/lib/tenant/get-memberships";
import { TenantProvider, type TenantSummary } from "@/contexts/TenantContext";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

export default async function TenantLayout({
  children, params,
}: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) redirect(`https://${ROOT_DOMAIN}/?error=tenant-no-encontrado`);

  const uid = await getSessionUid();
  if (!uid) redirect(`https://${ROOT_DOMAIN}/login?redirect=${encodeURIComponent(`https://${slug}.${ROOT_DOMAIN}/dashboard`)}`);

  const membership = await getMembership(uid, tenant.id);
  if (!membership) redirect(`https://${ROOT_DOMAIN}/panel?error=sin-acceso`);

  const otrasMemberships = (await listMembershipsForUser(uid)).filter((m) => m.tenantId !== tenant.id);
  const otrasEmpresas: TenantSummary[] = (
    await Promise.all(otrasMemberships.map(async (m) => {
      const t = await getTenantById(m.tenantId);
      return t ? { tenantId: t.id, slug: t.slug, nombreNegocio: t.nombreNegocio, rol: m.rol } : null;
    }))
  ).filter((t): t is TenantSummary => t !== null);

  return (
    <TenantProvider value={{
      tenantId: tenant.id,
      slug: tenant.slug,
      nombreNegocio: tenant.nombreNegocio,
      rol: membership.rol,
      otrasEmpresas,
    }}>
      {children}
    </TenantProvider>
  );
}
