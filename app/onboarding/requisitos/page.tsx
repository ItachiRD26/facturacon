"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Tenant } from "@/types/tenant";
import ScreenshotPlaceholder from "@/components/marketing/screenshot-placeholder";

const sans = "var(--font-sans)";
const serif = "var(--font-serif)";

const REQUISITOS = [
  {
    t: "Estar registrado como representante en la Oficina Virtual (OFV)",
    d: "La firma digital tiene que pertenecer a alguien que la empresa ya registró como representante en su cuenta de la Oficina Virtual de la DGII. Si esa persona no aparece ahí, la DGII rechaza la certificación — esto hay que resolverlo directamente con la DGII antes de continuar, nosotros no podemos hacerlo por ti.",
  },
  {
    t: "Cédula del representante, Activa ante la DGII",
    d: "La validamos automáticamente en el siguiente paso contra el padrón de la DGII. Si no figura como \"Activa\", no podrás avanzar hasta regularizarla.",
  },
  {
    t: "Certificado de firma digital (.p12) de esa misma persona",
    d: "Emitido por una entidad certificadora autorizada, a nombre del representante registrado en la OFV — no de otra persona — y correspondiente al RNC de tu empresa.",
  },
  {
    t: "Contraseña del certificado",
    d: "La que te entregó la entidad certificadora junto con el archivo .p12. Revísala con cuidado: un espacio de más al copiarla es el error más común.",
  },
];

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
    <main style={{ maxWidth: 640, margin: "48px auto", padding: "0 24px 80px", fontFamily: sans }}>
      <a href={`/panel/${tenantId}`} style={{ fontSize: 13, color: "var(--c-text-3)", display: "inline-block", marginBottom: 20 }}>
        ← Volver a mi cuenta
      </a>

      <h1 style={{ fontFamily: serif, fontSize: "1.6rem", marginBottom: 8 }}>
        Antes de certificarte, necesitamos esto
      </h1>
      <p style={{ color: "var(--c-text-3)", fontSize: 13, marginBottom: 20 }}>
        Para {tenant.nombreNegocio} (RNC {tenant.rnc}). Verificamos estos datos una sola vez —
        después continúa el proceso técnico ante la DGII.
      </p>

      <div style={{
        padding: "14px 16px", background: "#fef2f2", border: "1px solid #fecaca",
        borderRadius: 8, fontSize: 12, color: "#991b1b", marginBottom: 28, lineHeight: 1.6,
      }}>
        <strong>Sigue cada paso al pie de la letra.</strong> Un certificado equivocado, una cédula
        inactiva o un representante no registrado en la DGII pueden retrasar o invalidar tu
        certificación. Facturacon te guía en el proceso, pero no se hace responsable por errores u
        omisiones en la información que cargues aquí — revisa cada dato con cuidado antes de
        continuar.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
        {REQUISITOS.map((r) => (
          <div key={r.t} style={{ border: "1px solid var(--c-border)", borderRadius: 8, padding: "14px 16px", background: "var(--c-surface)" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{r.t}</div>
            <div style={{ fontSize: 12, color: "var(--c-text-3)", lineHeight: 1.5 }}>{r.d}</div>
          </div>
        ))}
      </div>

      {/* Tutorial guiado: cómo solicitar la firma digital */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: serif, fontSize: "1.2rem", marginBottom: 6 }}>
          ¿No tienes tu firma digital todavía? Así se solicita
        </h2>
        <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 18 }}>
          Esto lo haces directamente con la DGII y la entidad certificadora — no dentro de Facturacon.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {[
            {
              n: "1", t: "Verifica que eres representante en la OFV",
              d: "Entra a la Oficina Virtual de la DGII con el usuario de la empresa y confirma que tu nombre aparece en la sección de representantes. Si no apareces, debes agregarte ahí primero — la DGII no certificará a nadie que no figure como representante.",
              shot: { titulo: "Oficina Virtual — Representantes", descripcion: "Ejemplo de dónde ver/agregar representantes en la cuenta de tu empresa." },
            },
            {
              n: "2", t: "Confirma que tu cédula está Activa",
              d: "Lo validamos automáticamente en el siguiente paso, pero puedes revisarlo tú mismo en el padrón de contribuyentes de la DGII antes de continuar.",
            },
            {
              n: "3", t: "Solicita tu certificado de firma digital (.p12)",
              d: "Contacta a una entidad certificadora autorizada por la DGII (por ejemplo, DigiFirma) y solicita un certificado de persona física a tu nombre, como representante de la empresa.",
              shot: { titulo: "Tipo de certificado a solicitar", descripcion: "Ejemplo del tipo de certificado (persona física, representante de empresa) que debes pedir." },
            },
            {
              n: "4", t: "Guarda el archivo .p12 y la contraseña que te entreguen",
              d: "Los vas a necesitar en el siguiente paso. Guárdalos en un lugar seguro — si pierdes la contraseña, tendrás que solicitar el certificado de nuevo.",
            },
          ].map((s) => (
            <div key={s.n} style={{ display: "flex", gap: 14 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", background: "var(--c-brand)", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13,
                flexShrink: 0,
              }}>
                {s.n}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{s.t}</div>
                <div style={{ fontSize: 12, color: "var(--c-text-3)", lineHeight: 1.5, marginBottom: s.shot ? 12 : 0 }}>{s.d}</div>
                {s.shot && <ScreenshotPlaceholder titulo={s.shot.titulo} descripcion={s.shot.descripcion} />}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, padding: "10px 14px", background: "var(--c-bg)", border: "1px dashed var(--c-border)", borderRadius: 8, fontSize: 12, color: "var(--c-text-3)" }}>
          Enlace a la entidad certificadora — próximamente.
        </div>
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
