"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Tenant } from "@/types/tenant";

const sans = "var(--font-sans)";
const serif = "var(--font-serif)";

function RequisitosShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("t") ?? "";

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!tenantId) { setCargando(false); return; }
    getDoc(doc(db, "tenants", tenantId)).then((snap) => {
      if (snap.exists()) setTenant({ id: snap.id, ...snap.data() } as Tenant);
      setCargando(false);
    });
  }, [tenantId]);

  if (cargando) {
    return <main style={{ padding: 60, textAlign: "center", fontFamily: sans, color: "var(--c-text-3)" }}>Cargando...</main>;
  }

  if (!tenantId || !tenant) {
    return (
      <main style={{ maxWidth: 480, margin: "80px auto", padding: "0 24px", fontFamily: sans, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--c-text-3)" }}>No encontramos tu empresa. Vuelve a empezar el registro.</p>
        <a href="/onboarding" style={{ color: "var(--c-brand)", fontWeight: 600, fontSize: 13 }}>← Volver al onboarding</a>
      </main>
    );
  }

  if (tenant.estado !== "demo") {
    return (
      <main style={{ maxWidth: 480, margin: "80px auto", padding: "0 24px", fontFamily: sans, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--c-text-3)" }}>
          Ya completaste este paso para {tenant.nombreNegocio}.
        </p>
        <a href={`/panel/${tenantId}`} style={{ color: "var(--c-brand)", fontWeight: 600, fontSize: 13 }}>← Volver a mi cuenta</a>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 560, margin: "48px auto", padding: "0 24px", fontFamily: sans }}>
      <a href={`/panel/${tenantId}`} style={{ fontSize: 13, color: "var(--c-text-3)", display: "inline-block", marginBottom: 20 }}>
        ← Volver a mi cuenta
      </a>

      <h1 style={{ fontFamily: serif, fontSize: "1.6rem", marginBottom: 8 }}>
        Antes de certificarte, necesitamos esto
      </h1>
      <p style={{ color: "var(--c-text-3)", fontSize: 13, marginBottom: 28 }}>
        Para {tenant.nombreNegocio} (RNC {tenant.rnc}). Verificamos estos datos una sola vez —
        después continúa el proceso técnico ante la DGII.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
        {[
          {
            t: "Certificado de firma digital (.p12)",
            d: `Emitido por una entidad autorizada (ej. DigiFirma), correspondiente al RNC ${tenant.rnc}. Si no lo tienes, debes solicitarlo antes de continuar.`,
          },
          {
            t: "Contraseña del certificado",
            d: "La que te entregaron junto con el archivo .p12.",
          },
          {
            t: "Cédula del representante legal",
            d: "Debe figurar como \"Activa\" en el padrón de la DGII.",
          },
        ].map((r) => (
          <div key={r.t} style={{ border: "1px solid var(--c-border)", borderRadius: 8, padding: "14px 16px", background: "var(--c-surface)" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{r.t}</div>
            <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>{r.d}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "12px 14px", background: "var(--c-brand-bg)", border: "1px solid var(--c-brand-border)", borderRadius: 8, fontSize: 12, marginBottom: 24 }}>
        Tu certificado y su contraseña se cifran con Google Cloud KMS antes de guardarse — nunca se
        almacenan en texto plano.
      </div>

      <button onClick={() => router.push(`/onboarding/credenciales?t=${tenantId}`)} style={{
        padding: "12px 24px", background: "var(--c-brand)", color: "#fff", border: "none",
        borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: "pointer",
      }}>
        Ya tengo todo esto →
      </button>
    </main>
  );
}

export default function RequisitosPage() {
  return (
    <Suspense fallback={<main style={{ padding: 60, textAlign: "center" }}>Cargando...</main>}>
      <RequisitosShell />
    </Suspense>
  );
}
