"use client";

import Link from "next/link";
import { Lock } from "@phosphor-icons/react/dist/ssr";
import { useSandbox } from "@/contexts/SandboxContext";
import { MODULO_ETIQUETA, ROL_PRUEBA_TITULO, moduloInicial } from "@/lib/sandbox/roles-prueba";
import type { Modulo } from "@/lib/tenant/roles";

// Lo que se ve al abrir (por el menú o escribiendo la dirección) una pantalla que el
// rol que se está probando no puede ver. Antes la pantalla se abría igual, como si el
// rol no importara; ahora se explica y se ofrece verla como dueño.
export default function ModuloNoDisponible({ modulo }: { modulo: Modulo }) {
  const { rol, setRol, tenantId } = useSandbox();
  const quien = ROL_PRUEBA_TITULO[rol] ?? "Este rol";
  const inicio = moduloInicial(rol);

  return (
    <div className="fade-in" style={{ maxWidth: 520, margin: "40px auto", textAlign: "center", fontFamily: "var(--font-sans)" }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--c-bg)", border: "1px solid var(--c-border)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Lock size={26} weight="duotone" color="var(--c-text-3)" aria-hidden="true" />
      </div>
      <h1 style={{ fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8 }}>
        {quien} no ve «{MODULO_ETIQUETA[modulo]}»
      </h1>
      <p style={{ fontSize: 14.5, color: "var(--c-text-3)", lineHeight: 1.55, marginBottom: 22 }}>
        Así funciona el sistema real: cada persona solo ve lo que necesita para su trabajo. Esta pantalla la ve el dueño.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={() => setRol("owner")} className="auth-boton" style={{ width: "auto", padding: "0 22px", cursor: "pointer" }}>
          Verla como Dueño
        </button>
        <Link href={`/onboarding/sandbox/${inicio}?t=${tenantId}`} className="auth-google" style={{ width: "auto", padding: "0 20px", textDecoration: "none" }}>
          Volver a {MODULO_ETIQUETA[inicio]}
        </Link>
      </div>
    </div>
  );
}
