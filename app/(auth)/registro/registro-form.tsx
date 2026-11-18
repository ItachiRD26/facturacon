"use client";

import { useState } from "react";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { Storefront, Briefcase, ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { AlertaAuth, BotonAuth, BotonGoogle, Campo, Divisor, Encabezado, Entrada, EntradaClave, TarjetaAuth } from "@/components/auth/ui-auth";
import type { TipoCuenta } from "@/types/tenant";

const sans = "var(--font-sans)";

function Opcion({ activa, onClick, titulo, texto, Icono }: {
  activa: boolean; onClick: () => void; titulo: string; texto: string; Icono: typeof Storefront;
}) {
  return (
    <button type="button" role="radio" aria-checked={activa} onClick={onClick} className="auth-opcion">
      <span className="auth-radio" aria-hidden="true" />
      <span style={{ flex: 1 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15.5, marginBottom: 3 }}>
          <Icono size={22} weight="duotone" color="var(--c-brand)" aria-hidden="true" />{titulo}
        </span>
        <span style={{ display: "block", fontSize: 13.5, color: "var(--c-text-3)", lineHeight: 1.5 }}>{texto}</span>
      </span>
    </button>
  );
}

// Indicador "Paso X de 2": dos barras, la actual rellena.
function Pasos({ actual }: { actual: 1 | 2 }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }} aria-hidden="true">
        {[1, 2].map((n) => <span key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: n <= actual ? "var(--c-brand)" : "var(--c-border)" }} />)}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text-3)" }}>Paso {actual} de 2</div>
    </div>
  );
}

// Tras crear la cuenta: una cuenta individual sigue directo a registrar su
// empresa (RNC y tipo de negocio, en /onboarding); un gestor no declara ninguna
// empresa todavía: su casa es /panel, con el botón para agregar la primera
// cuando quiera (puede administrar varias, a diferencia del individual).
function destinoTrasRegistro(tipoCuenta: TipoCuenta): string {
  return tipoCuenta === "individual" ? "/onboarding" : "/panel";
}

async function crearSesionYRedirigir(
  idToken: string, router: ReturnType<typeof useRouter>, destino: string,
  perfil: { nombre: string; telefono?: string; tipoCuenta: TipoCuenta; aceptaTerminos: boolean },
) {
  const res = await fetch("/api/auth/session", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ idToken, ...perfil }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Error al crear sesión");
  }
  router.push(destino);
  router.refresh();
}

export default function RegistroForm() {
  const router = useRouter();
  const [paso, setPaso] = useState<1 | 2>(1);
  const [tipoCuenta, setTipoCuenta] = useState<TipoCuenta | null>(null);

  const [nombre,   setNombre]   = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email,   setEmail]   = useState("");
  const [pass,    setPass]    = useState("");

  const [error,   setError]   = useState("");
  // Cuando el correo ya tiene cuenta, en vez de solo mostrar un error
  // mostramos un botón directo a /login con el correo precargado.
  const [yaExiste, setYaExiste] = useState(false);
  const [loading, setLoading] = useState(false);
  // Consentimiento expreso (Ley 172-13): sin marcarla no se crea la cuenta, ni con correo ni con Google.
  const [acepta, setAcepta] = useState(false);

  const esIndividual = tipoCuenta === "individual";
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoCuenta) return;
    if (!acepta) { setError("Marca la casilla para aceptar los términos y la política de privacidad."); return; }
    setError(""); setYaExiste(false); setLoading(true);
    try {
      const nombreCompleto = `${nombre.trim()} ${apellido.trim()}`.trim();
      const credential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(credential.user, { displayName: nombreCompleto });
      const idToken = await credential.user.getIdToken();
      await crearSesionYRedirigir(idToken, router, destinoTrasRegistro(tipoCuenta), {
        nombre: nombreCompleto, telefono: telefono.trim() || undefined, tipoCuenta, aceptaTerminos: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("email-already-in-use")) {
        setError("Ya existe una cuenta con ese correo.");
        setYaExiste(true);
      } else if (msg.includes("weak-password")) {
        setError("La contraseña es muy débil. Usa al menos 8 caracteres.");
      } else if (msg.includes("invalid-email")) {
        setError("Ese correo no es válido. Revísalo.");
      } else {
        setError(msg || "No pudimos crear tu cuenta. Intenta de nuevo.");
      }
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    if (!tipoCuenta) return;
    if (!acepta) { setError("Marca la casilla para aceptar los términos y la política de privacidad."); return; }
    setError(""); setYaExiste(false); setLoading(true);
    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await credential.user.getIdToken();
      const nombreGoogle = credential.user.displayName ?? credential.user.email ?? "";
      await crearSesionYRedirigir(idToken, router, destinoTrasRegistro(tipoCuenta), { nombre: nombreGoogle, tipoCuenta, aceptaTerminos: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("popup-closed-by-user")) setError(msg || "No pudimos registrarte con Google.");
    } finally { setLoading(false); }
  };

  return (
    <TarjetaAuth>
      <Pasos actual={paso} />

      {paso === 1 && (
        <div>
          <Encabezado titulo="¿Cómo vas a usar Facturacon?" texto="Cada empresa hace su propia certificación, con su propio subdominio. Esta elección solo cambia si vas a poder administrar varias." />
          <div role="radiogroup" aria-label="Tipo de cuenta" style={{ display: "grid", gap: 12, marginBottom: 22 }}>
            <Opcion activa={tipoCuenta === "individual"} onClick={() => setTipoCuenta("individual")} Icono={Storefront}
              titulo="Solo mi empresa" texto="La cuenta queda ligada a un único negocio, de forma permanente." />
            <Opcion activa={tipoCuenta === "gestor"} onClick={() => setTipoCuenta("gestor")} Icono={Briefcase}
              titulo="Soy gestor o contable" texto="Quiero administrar la facturación de varias empresas desde esta misma cuenta." />
          </div>
          <BotonAuth type="button" disabled={!tipoCuenta} onClick={() => setPaso(2)}>Continuar</BotonAuth>
          <p style={{ textAlign: "center", marginTop: 18, fontSize: 14, color: "var(--c-text-3)" }}>
            ¿Ya tienes cuenta? <Link href="/login" style={{ color: "var(--c-brand)", fontWeight: 700 }}>Inicia sesión</Link>
          </p>
        </div>
      )}

      {paso === 2 && (
        <div>
          <button onClick={() => setPaso(1)} type="button" style={{
            display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0, marginBottom: 14, cursor: "pointer",
            fontSize: 13.5, fontWeight: 600, color: "var(--c-text-3)", fontFamily: sans,
          }}>
            <ArrowLeft size={16} weight="bold" aria-hidden="true" />{esIndividual ? "Solo mi empresa" : "Gestor o contable"}
          </button>
          <Encabezado titulo="Crea tu cuenta" texto="Gratis, sin tarjeta. Solo necesitas un correo." />

          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16, fontSize: 13.5, color: "var(--c-text-2)", lineHeight: 1.5, cursor: "pointer" }}>
            <input type="checkbox" checked={acepta} onChange={(e) => { setAcepta(e.target.checked); setError(""); }}
              style={{ width: 18, height: 18, marginTop: 1, accentColor: "var(--c-brand)", flexShrink: 0, cursor: "pointer" }} />
            <span>
              Acepto los <Link href="/terminos" target="_blank" style={{ color: "var(--c-brand)", fontWeight: 600 }}>términos de uso</Link> y la{" "}
              <Link href="/privacidad" target="_blank" style={{ color: "var(--c-brand)", fontWeight: 600 }}>política de privacidad</Link>, incluido el tratamiento de mis datos personales y de los de mi empresa.
            </span>
          </label>

          <BotonGoogle onClick={handleGoogle} disabled={loading} texto="Registrarme con Google" />
          <Divisor texto="o con tu correo" />

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Campo etiqueta="Nombre"><Entrada required autoComplete="given-name" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Juan" /></Campo>
              <Campo etiqueta="Apellido"><Entrada required autoComplete="family-name" value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Pérez" /></Campo>
            </div>
            <Campo etiqueta="Correo electrónico">
              <Entrada type="email" required autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setYaExiste(false); }} placeholder="tucorreo@empresa.com" />
            </Campo>
            <Campo etiqueta="Contraseña" ayuda="Al menos 8 caracteres.">
              <EntradaClave required minLength={8} autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Crea una contraseña" />
            </Campo>
            <Campo etiqueta="Teléfono (opcional)">
              <Entrada type="tel" autoComplete="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="809 555 0100" />
            </Campo>

            {error && (
              <AlertaAuth accion={yaExiste ? (
                <Link href={`/login?email=${encodeURIComponent(email)}`} style={{ display: "inline-block", fontSize: 13, fontWeight: 700, color: "#fff", background: "var(--c-brand)", padding: "7px 14px", borderRadius: 8, textDecoration: "none" }}>
                  Iniciar sesión
                </Link>
              ) : undefined}>{error}</AlertaAuth>
            )}

            <BotonAuth cargando={loading}>{loading ? "Creando tu cuenta…" : "Crear mi cuenta"}</BotonAuth>
          </form>
        </div>
      )}
    </TarjetaAuth>
  );
}
