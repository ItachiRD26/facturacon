"use client";

import { useTenant } from "@/contexts/TenantContext";

export default function TenantDashboardPage() {
  const tenant = useTenant();

  return (
    <main style={{ maxWidth: 720, margin: "60px auto", padding: "0 24px", fontFamily: "var(--font-sans)" }}>
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", marginBottom: 8 }}>
        {tenant.nombreNegocio}
      </h1>
      <p style={{ color: "var(--c-text-3)", fontSize: 13 }}>
        Tenant {tenant.tenantId} · slug {tenant.slug} · tu rol: {tenant.rol}
      </p>
      <p style={{ marginTop: 24, color: "var(--c-text-3)" }}>
        Fase 1 — placeholder de verificación. El módulo de facturación real llega en la Fase 7.
      </p>

      {tenant.otrasEmpresas.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Otras empresas que administras:</div>
          <ul>
            {tenant.otrasEmpresas.map((t) => (
              <li key={t.tenantId}>
                <a href={`https://${t.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/dashboard`}>
                  {t.nombreNegocio} ({t.rol})
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
