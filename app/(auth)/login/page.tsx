"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import {
  GoogleAuthProvider, TotpMultiFactorGenerator, getMultiFactorResolver, signInWithEmailAndPassword, signInWithPopup,
  type MultiFactorError, type MultiFactorResolver,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertaAuth, BotonAuth, BotonGoogle, Campo, Divisor, Encabezado, Entrada, EntradaClave, TarjetaAuth } from "@/components/auth/ui-auth";
import { registroAbierto } from "@/lib/registro-cliente";

// Solo se acepta una ruta interna ("/panel/…") o una dirección https de este mismo sitio o de sus subdominios de empresa:
// cualquier otra cosa (https://sitio-malo, //sitio-malo) se ignora. Evita usar el login para mandar a alguien a otro sitio.
function destinoSeguro(valor: string | null): string {
  if (!valor) return "/panel";
  if (valor.startsWith("/") && !valor.startsWith("//") && !valor.includes("\\")) return valor;
  try {
    const u = new URL(valor);
    const raiz = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "").split(":")[0];
    if (u.protocol === "https:" && raiz && (u.hostname === raiz || u.hostname.endsWith(`.${raiz}`))) return valor;
  } catch { /* no era una URL */ }
  return "/panel";
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const emailDesdeQuery = searchParams.get("email") ?? "";
  const [email,   setEmail]   = useState(emailDesdeQuery);
  const [pass,    setPass]    = useState("");
  const [error,   setError]   = useState("");
  const [aviso,   setAviso]   = useState("");
  const [loading, setLoading] = useState(false);
  // Segundo paso: si la cuenta tiene verificación en dos pasos, Firebase corta el inicio de sesión y pide el código.
  const [resolver, setResolver] = useState<MultiFactorResolver | null>(null);
  const [codigo, setCodigo] = useState("");
  const [nombreGoogle, setNombreGoogle] = useState<string | undefined>(undefined);
  // «No tengo mi teléfono»: entrar con contraseña + un código de recuperación para quitar el segundo paso.
  const [recuperando, setRecuperando] = useState(false);
  const [codigoRec, setCodigoRec] = useState("");

  // Si llegamos desde /registro porque el correo ya tenía cuenta, el campo viene
  // precargado (useState arriba): solo falta la contraseña.
  const crearSesionYRedirigir = async (idToken: string, nombre?: string) => {
    const res = await fetch("/api/auth/session", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ idToken, nombre }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Error al crear sesión");
    }
    router.push(destinoSeguro(searchParams.get("redirect")));
    router.refresh();
  };

  // Devuelve true si el error era la petición del segundo paso (y deja listo el resolver).
  const pedirSegundoPaso = (err: unknown, nombre?: string): boolean => {
    if ((err as { code?: string })?.code !== "auth/multi-factor-auth-required") return false;
    const r = getMultiFactorResolver(auth, err as MultiFactorError);
    if (!r.hints.some((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID)) {
      setError("Tu cuenta usa un segundo paso que este formulario no soporta. Escríbenos a soporte.");
      return true;
    }
    setNombreGoogle(nombre); setResolver(r); setCodigo(""); setError("");
    return true;
  };

  const verificarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolver) return;
    setError(""); setLoading(true);
    try {
      const hint = resolver.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID)!;
      const credential = await resolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(hint.uid, codigo.trim()));
      await crearSesionYRedirigir(await credential.user.getIdToken(), nombreGoogle);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("invalid-verification-code")) setError("Ese código no es correcto o ya venció. Escribe el que muestra tu aplicación ahora.");
      else if (msg.includes("too-many-requests")) setError("Demasiados intentos. Espera unos minutos e intenta de nuevo.");
      else if (msg.includes("code-expired") || msg.includes("expired")) { setResolver(null); setError("Pasó mucho tiempo. Inicia sesión de nuevo."); }
      else setError(msg || "No pudimos verificar el código.");
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setAviso(""); setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, pass);
      const idToken    = await credential.user.getIdToken();
      await crearSesionYRedirigir(idToken);
    } catch (err: unknown) {
      if (pedirSegundoPaso(err)) return;
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("invalid-credential") || msg.includes("wrong-password") || msg.includes("INVALID_LOGIN_CREDENTIALS") || msg.includes("user-not-found")) {
        setError("El correo o la contraseña no coinciden. Revísalos e intenta de nuevo.");
      } else if (msg.includes("too-many-requests")) {
        setError("Demasiados intentos. Espera unos minutos o restablece tu contraseña.");
      } else {
        setError(msg || "No pudimos iniciar tu sesión. Intenta de nuevo.");
      }
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError(""); setAviso(""); setLoading(true);
    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken    = await credential.user.getIdToken();
      await crearSesionYRedirigir(idToken, credential.user.displayName ?? credential.user.email ?? undefined);
    } catch (err: unknown) {
      if (pedirSegundoPaso(err, (err as { customData?: { email?: string } })?.customData?.email)) return;
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("popup-closed-by-user")) setError(msg || "No pudimos ingresar con Google.");
    } finally { setLoading(false); }
  };

  // Restablecer contraseña: el servidor manda el correo (en español, con nuestra marca) con el enlace a /accion.
  const olvide = async () => {
    setError(""); setAviso("");
    if (!email.trim()) { setError("Escribe tu correo arriba y vuelve a pulsar \"¿La olvidaste?\"."); return; }
    try {
      const res = await fetch("/api/auth/recuperar-clave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }) });
      if (res.status === 429) { setError("Pediste varios correos seguidos. Espera unos minutos e intenta de nuevo."); return; }
      if (res.status === 400) { setError("Ese correo no parece válido. Revísalo."); return; }
    } catch { /* misma respuesta de abajo */ }
    // Misma respuesta exista o no la cuenta: no se revela qué correos están registrados.
    setAviso(`Si ${email.trim()} tiene una cuenta, le enviamos un correo para crear una contraseña nueva. Revisa también la carpeta de spam.`);
  };

  // Quita el segundo paso usando la contraseña (ya escrita) y un código de recuperación.
  const recuperarSegundoPaso = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/recuperar-segundo-paso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), password: pass, codigo: codigoRec }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "No pudimos verificar esos datos."); return; }
      setResolver(null); setRecuperando(false); setCodigoRec(""); setCodigo("");
      setAviso("Listo: quitamos la verificación en dos pasos. Entra con tu contraseña y actívala de nuevo en tu teléfono nuevo (menú Seguridad).");
    } catch { setError("No pudimos conectar. Intenta de nuevo."); }
    finally { setLoading(false); }
  };

  if (resolver && recuperando) {
    const puede = !!pass && !!email.trim();   // quien entró con Google no tiene contraseña: esa vía es por soporte
    return (
      <TarjetaAuth>
        <Encabezado titulo="No tengo mi teléfono" texto="Usa uno de los 10 códigos de recuperación que guardaste al activar la verificación en dos pasos. Cada código sirve una sola vez." />
        {puede ? (
          <form onSubmit={recuperarSegundoPaso} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Campo etiqueta="Código de recuperación">
              <Entrada required autoFocus autoComplete="off" value={codigoRec} placeholder="ABCDE-FGHJK" maxLength={11}
                onChange={(e) => setCodigoRec(e.target.value.toUpperCase())} style={{ letterSpacing: "0.12em", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 18 }} />
            </Campo>
            {error && <AlertaAuth>{error}</AlertaAuth>}
            <BotonAuth cargando={loading} disabled={codigoRec.replace(/[\s-]/g, "").length !== 10}>{loading ? "Verificando…" : "Quitar el segundo paso"}</BotonAuth>
          </form>
        ) : (
          <AlertaAuth>Para esta vía vuelve atrás e inicia sesión con tu correo y contraseña. Si entras con Google o no tienes tus códigos, escríbenos a contacto@facturacon.com.do: verificamos tu identidad y te ayudamos.</AlertaAuth>
        )}
        <button type="button" onClick={() => { setRecuperando(false); setError(""); }}
          style={{ marginTop: 14, background: "none", border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "var(--c-text-3)", fontFamily: "var(--font-sans)" }}>
          ← Volver al código del teléfono
        </button>
        <p style={{ marginTop: 10, fontSize: 12.5, color: "var(--c-text-4)", lineHeight: 1.5 }}>¿Sin teléfono y sin códigos? Escríbenos a contacto@facturacon.com.do.</p>
      </TarjetaAuth>
    );
  }

  if (resolver) {
    return (
      <TarjetaAuth>
        <Encabezado titulo="Verificación en dos pasos" texto="Abre tu aplicación autenticadora y escribe el código de 6 dígitos de Facturacon." />
        <form onSubmit={verificarCodigo} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Campo etiqueta="Código de 6 dígitos">
            <Entrada inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus value={codigo} placeholder="123456"
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))} style={{ letterSpacing: "0.3em", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 20 }} />
          </Campo>
          {error && <AlertaAuth>{error}</AlertaAuth>}
          <BotonAuth cargando={loading} disabled={codigo.length !== 6}>{loading ? "Verificando…" : "Verificar y entrar"}</BotonAuth>
          <button type="button" onClick={() => { setResolver(null); setCodigo(""); setError(""); setPass(""); }}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "var(--c-text-3)", fontFamily: "var(--font-sans)" }}>
            ← Volver
          </button>
          <button type="button" onClick={() => { setRecuperando(true); setError(""); }}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "var(--c-brand)", fontFamily: "var(--font-sans)" }}>
            No tengo mi teléfono
          </button>
        </form>
      </TarjetaAuth>
    );
  }

  return (
    <TarjetaAuth>
      <Encabezado titulo="Entra a tu cuenta" texto="Continúa donde te quedaste." />

      {emailDesdeQuery && (
        <div style={{ padding: "10px 13px", marginBottom: 16, background: "var(--c-brand-bg)", border: "1px solid var(--c-brand-border)", borderRadius: 10, fontSize: 13.5, color: "var(--c-text-2)" }}>
          Ya tenías una cuenta con este correo: solo inicia sesión.
        </div>
      )}

      <BotonGoogle onClick={handleGoogle} disabled={loading} />
      <Divisor texto="o con tu correo" />

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Campo etiqueta="Correo electrónico">
          <Entrada type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@empresa.com" />
        </Campo>
        <Campo etiqueta="Contraseña" derecha={
          <button type="button" onClick={olvide} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--c-brand)", fontFamily: "var(--font-sans)" }}>¿La olvidaste?</button>
        }>
          <EntradaClave required autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Tu contraseña" autoFocus={!!emailDesdeQuery} />
        </Campo>

        {error && <AlertaAuth>{error}</AlertaAuth>}
        {aviso && (
          <div role="status" style={{ padding: "11px 13px", background: "var(--c-green-bg)", border: "1px solid var(--c-green-border)", borderRadius: 10, fontSize: 13.5, color: "var(--c-green)", lineHeight: 1.45 }}>{aviso}</div>
        )}

        <BotonAuth cargando={loading}>{loading ? "Entrando…" : "Entrar"}</BotonAuth>
      </form>

      <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--c-text-3)" }}>
        {registroAbierto()
          ? <>¿Aún no tienes cuenta? <Link href="/registro" style={{ color: "var(--c-brand)", fontWeight: 700 }}>Créala gratis</Link></>
          : <>¿Aún no tienes cuenta? <Link href="/registro" style={{ color: "var(--c-brand)", fontWeight: 700 }}>Únete a la lista de espera</Link></>}
      </p>
    </TarjetaAuth>
  );
}
