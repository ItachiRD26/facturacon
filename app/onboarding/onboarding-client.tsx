"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Barbell, Basket, Bed, BeerBottle, Briefcase, Car, CheckCircle, Cookie,
  DotsThreeCircle, ForkKnife, Handshake, Pill, Scissors, Stethoscope, Storefront, TShirt, Truck,
  WarningCircle, Wrench, CircleNotch,
} from "@phosphor-icons/react/dist/ssr";
import { TIPOS_NEGOCIO } from "@/lib/onboarding/tipos-negocio";
import type { TipoNegocio } from "@/types/tenant";
import MarcoOnboarding from "@/components/onboarding/marco-onboarding";
import { AlertaAuth, BotonAuth, Campo, Encabezado, Entrada } from "@/components/auth/ui-auth";

type Paso = 1 | 2;
interface RncValidado { valid: boolean; name?: string; rnc?: string; activo?: boolean | null; estado?: string | null }

const ICONOS: Record<TipoNegocio, typeof Storefront> = {
  ferreteria: Wrench, farmacia: Pill, colmado_supermercado: Basket, retail: Storefront,
  tienda_ropa: TShirt, restaurante: ForkKnife, bar_colmadon: BeerBottle, panaderia_reposteria: Cookie,
  salon_spa: Scissors, taller_mecanico: Car, clinica_consultorio: Stethoscope, gimnasio: Barbell,
  distribuidora_mayorista: Truck, agencia_consultoria: Briefcase, servicios: Handshake, hotel: Bed,
  otro: DotsThreeCircle,
};

// Formatea un RNC (9) o cédula (11) para que se lea mejor: 1-31-21765-6 / 001-1234567-8.
function formatearRnc(d: string): string {
  const s = d.replace(/\D/g, "");
  if (s.length === 9) return `${s[0]}-${s.slice(1, 3)}-${s.slice(3, 8)}-${s[8]}`;
  if (s.length === 11) return `${s.slice(0, 3)}-${s.slice(3, 10)}-${s[10]}`;
  return s;
}

// El tipo de cuenta (individual/gestor) ya se elige en /registro, antes de
// crear el usuario — esta página solo se encarga de la EMPRESA. Si llega con
// ?rnc=&nombreNegocio= (cuenta individual recién creada, ya con su único
// negocio declarado en el registro) se salta directo al tipo de negocio; si
// no (gestor agregando una empresa nueva desde /panel, o individual que
// todavía no declaró la suya), pide RNC primero.
// El bloqueo de "individual con empresa ya creada" pasa ANTES de esto, en el
// server component de page.tsx — este componente asume que ya se puede estar
// aquí.
function OnboardingShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rncPrefill = searchParams.get("rnc") ?? "";
  const nombreNegocioPrefill = searchParams.get("nombreNegocio") ?? "";
  const vieneDeRegistro = !!(rncPrefill && nombreNegocioPrefill);

  const [paso, setPaso] = useState<Paso>(vieneDeRegistro ? 2 : 1);

  const [nombreNegocio, setNombreNegocio] = useState(nombreNegocioPrefill);
  // Si la persona ya escribió el nombre a mano, una nueva validación no lo pisa; si no, sigue al RNC validado.
  const [nombreTocado, setNombreTocado] = useState(false);
  const [rnc, setRnc] = useState(rncPrefill);
  const [validando, setValidando] = useState(false);
  const [rncValidado, setRncValidado] = useState<RncValidado | null>(
    vieneDeRegistro ? { valid: true, rnc: rncPrefill, name: nombreNegocioPrefill } : null
  );
  const [rncError, setRncError] = useState("");

  const [tipoNegocio, setTipoNegocio] = useState<TipoNegocio | null>(null);
  const [creando, setCreando] = useState(false);
  const [errorFinal, setErrorFinal] = useState("");

  const digitos = rnc.replace(/\D/g, "");
  const longitudOk = digitos.length === 9 || digitos.length === 11;

  const validarRnc = async () => {
    setValidando(true); setRncError(""); setRncValidado(null);
    try {
      const res = await fetch(`/api/validate-rnc?number=${encodeURIComponent(digitos)}`);
      const data = await res.json();
      if (!data.valid) {
        setRncError(data.mensajeDgii || data.error || "No encontramos ese RNC en el padrón de la DGII. Verifica el número.");
      } else {
        setRncValidado(data);
        if (!nombreTocado || !nombreNegocio.trim()) { setNombreNegocio(data.name ?? ""); setNombreTocado(false); }
      }
    } catch {
      setRncError("No se pudo validar el RNC ahora. Intenta de nuevo.");
    } finally { setValidando(false); }
  };

  const tipoInfo = TIPOS_NEGOCIO.find((t) => t.codigo === tipoNegocio);

  const entrarAlSandbox = async () => {
    setCreando(true); setErrorFinal("");
    try {
      const res = await fetch("/api/onboarding/crear-tenant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombreNegocio, rnc: rncValidado?.rnc ?? rnc, tipoNegocio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear tu empresa");
      router.push(`/onboarding/sandbox?t=${data.tenantId}`);
    } catch (err) {
      setErrorFinal(err instanceof Error ? err.message : "Error inesperado");
    } finally { setCreando(false); }
  };

  // Enter en el campo del RNC valida; con el RNC ya validado, continúa.
  const enviarPaso1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rncValidado?.valid) { if (longitudOk && !validando) void validarRnc(); return; }
    if (nombreNegocio.trim()) setPaso(2);
  };

  return (
    <MarcoOnboarding etapa="empresa">
      {paso === 1 && (
        <form onSubmit={enviarPaso1} noValidate>
          <Encabezado titulo="Cuéntanos de tu empresa" texto="Confirmamos tu RNC en el padrón público de la DGII, así tus comprobantes salen con los datos correctos." />

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Campo etiqueta="RNC o cédula" ayuda="9 dígitos si es empresa, 11 si es persona física. Sin guiones.">
              <span style={{ display: "flex", gap: 8 }}>
                <Entrada
                  value={rnc} inputMode="numeric" autoComplete="off" maxLength={13}
                  onChange={(e) => { setRnc(e.target.value.replace(/[^\d-]/g, "")); setRncValidado(null); setRncError(""); if (!nombreTocado) setNombreNegocio(""); }}
                  placeholder="131217656" aria-invalid={!!rncError}
                />
                <button type="submit" className="onb-validar" disabled={!longitudOk || validando || !!rncValidado?.valid}>
                  {validando ? <CircleNotch size={18} weight="bold" className="giro" aria-hidden="true" /> : null}
                  {validando ? "Validando" : rncValidado?.valid ? "Validado" : "Validar"}
                </button>
              </span>
            </Campo>

            {rncError && <AlertaAuth>{rncError}</AlertaAuth>}

            {rncValidado?.valid && (
              <div role="status" style={{
                display: "flex", gap: 12, padding: "14px 16px", borderRadius: 12,
                background: rncValidado.activo === false ? "var(--c-yellow-bg)" : "var(--c-green-bg)",
                border: `1px solid ${rncValidado.activo === false ? "var(--c-yellow-border)" : "var(--c-green-border)"}`,
              }}>
                {rncValidado.activo === false
                  ? <WarningCircle size={24} weight="fill" color="var(--c-yellow)" style={{ flexShrink: 0 }} aria-hidden="true" />
                  : <CheckCircle size={24} weight="fill" color="var(--c-green)" style={{ flexShrink: 0 }} aria-hidden="true" />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--c-text-1)", lineHeight: 1.3 }}>{rncValidado.name}</div>
                  <div style={{ fontSize: 13.5, color: "var(--c-text-2)", marginTop: 3, lineHeight: 1.45 }}>
                    {formatearRnc(rncValidado.rnc ?? digitos)} · {rncValidado.estado ? `Estado: ${rncValidado.estado}` : "Encontrado en la DGII"}
                  </div>
                  {rncValidado.activo === false && (
                    <div style={{ fontSize: 13, color: "var(--c-text-2)", marginTop: 6 }}>
                      La DGII no lo muestra como activo. Puedes seguir y probar el sistema, pero para certificarte el RNC debe estar activo.
                    </div>
                  )}
                </div>
              </div>
            )}

            <Campo etiqueta="Nombre del negocio" ayuda="Es el que verán tus clientes en la factura. Puedes cambiarlo después.">
              <Entrada value={nombreNegocio} onChange={(e) => { setNombreNegocio(e.target.value); setNombreTocado(true); }} placeholder="Mi Negocio SRL" autoComplete="organization" />
            </Campo>
          </div>

          <div style={{ marginTop: 26 }}>
            <BotonAuth type="button" disabled={!rncValidado?.valid || !nombreNegocio.trim()} onClick={() => setPaso(2)}>
              Continuar <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </BotonAuth>
          </div>
        </form>
      )}

      {paso === 2 && (
        <div>
          <Encabezado titulo="¿Qué tipo de negocio tienes?" texto="Así dejamos el sistema listo para ti. Después podrás probarlo completo con datos de prueba, antes de certificarte." />

          <div role="radiogroup" aria-label="Tipo de negocio" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 142px), 1fr))", gap: 10 }}>
            {TIPOS_NEGOCIO.map((t) => {
              const Icono = ICONOS[t.codigo] ?? DotsThreeCircle;
              return (
                <button key={t.codigo} type="button" role="radio" aria-checked={tipoNegocio === t.codigo}
                  onClick={() => setTipoNegocio(t.codigo)} className="onb-tipo">
                  <Icono size={26} weight="duotone" color={t.disponible ? "var(--c-brand)" : "var(--c-text-4)"} aria-hidden="true" />
                  <span>{t.label}{!t.disponible && <small style={{ display: "block", marginTop: 2 }}>Próximamente</small>}</span>
                </button>
              );
            })}
          </div>

          {tipoInfo && !tipoInfo.disponible && (
            <div style={{ padding: 14, background: "var(--c-yellow-bg)", border: "1px solid var(--c-yellow-border)", borderRadius: 12, fontSize: 14, lineHeight: 1.5, marginTop: 16 }}>
              El módulo para <strong>{tipoInfo.label}</strong> todavía no está disponible (necesita gestión de
              reservas y no aplica al sistema genérico).{" "}
              <a href="mailto:contacto@facturacon.com.do" style={{ color: "var(--c-brand)", fontWeight: 700 }}>
                Contáctanos para una solución personalizada
              </a>.
            </div>
          )}

          {errorFinal && <div style={{ marginTop: 16 }}><AlertaAuth>{errorFinal}</AlertaAuth></div>}

          <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
            {!vieneDeRegistro && (
              <button type="button" onClick={() => setPaso(1)} className="auth-google" style={{ width: "auto", padding: "0 18px", height: 48, cursor: "pointer" }}>
                <ArrowLeft size={18} weight="bold" aria-hidden="true" /> Atrás
              </button>
            )}
            <div style={{ flex: 1, minWidth: 220 }}>
              <BotonAuth type="button" cargando={creando} disabled={!tipoNegocio || !tipoInfo?.disponible} onClick={entrarAlSandbox}>
                {creando ? "Preparando tu entorno de prueba…" : <>Probar el sistema completo <ArrowRight size={18} weight="bold" aria-hidden="true" /></>}
              </BotonAuth>
            </div>
          </div>
        </div>
      )}
    </MarcoOnboarding>
  );
}

export default function OnboardingClient() {
  return (
    <Suspense fallback={<main style={{ padding: 60, textAlign: "center", fontFamily: "var(--font-sans)" }}>Cargando…</main>}>
      <OnboardingShell />
    </Suspense>
  );
}
