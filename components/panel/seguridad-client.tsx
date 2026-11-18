"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  EmailAuthProvider, GoogleAuthProvider, TotpMultiFactorGenerator, TotpSecret, multiFactor,
  reauthenticateWithCredential, reauthenticateWithPopup,
} from "firebase/auth";
import { QRCodeSVG } from "qrcode.react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button, Card, CardTitle, Pill } from "@/components/ui/kit";

const sans = "var(--font-sans)";
const campo: React.CSSProperties = {
  width: "100%", height: 44, padding: "0 14px", border: "1px solid var(--c-border)", borderRadius: 10, fontSize: 15, fontFamily: sans,
  background: "var(--c-surface)", color: "var(--c-text-1)",
};

const avisoServidor = () => fetch("/api/auth/mfa-evento", { method: "POST" }).catch(() => {});

type Paso = "inicio" | "verificar-correo" | "reautenticar" | "escanear" | "codigos";

export default function SeguridadClient({ activa: activaInicial, correo, correoVerificado, recomendada, codigosRestantes }: {
  activa: boolean; correo: string; correoVerificado: boolean; recomendada: boolean; codigosRestantes: number;
}) {
  const router = useRouter();
  const [activa, setActiva] = useState(activaInicial);
  const [paso, setPaso] = useState<Paso>("inicio");
  const [pendienteDesactivar, setPendienteDesactivar] = useState(false);
  const [pendienteRegenerar, setPendienteRegenerar] = useState(false);
  // Códigos de recuperación recién generados (se muestran una sola vez) y cuántos quedan guardados en el servidor.
  const [codigosNuevos, setCodigosNuevos] = useState<string[]>([]);
  const [restantes, setRestantes] = useState(codigosRestantes);
  const [guardados, setGuardados] = useState(false);
  const [secreto, setSecreto] = useState<TotpSecret | null>(null);
  const [codigo, setCodigo] = useState("");
  const [clave, setClave] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  // Firebase restaura al usuario del navegador de forma asíncrona: para pintar se usa el contexto, y cada acción
  // espera a que termine de cargar antes de leer el usuario actual.
  const { firebaseUser } = useAuth();
  const conGoogle = !!firebaseUser?.providerData.some((p) => p.providerId === "google.com");
  const usuarioActual = async () => { await auth.authStateReady(); return auth.currentUser; };

  const traducir = (e: unknown): string => {
    const m = e instanceof Error ? e.message : "";
    if (m.includes("requires-recent-login")) return "RECIENTE";
    if (m.includes("invalid-verification-code")) return "Ese código no es correcto. Revisa que sea el más reciente de tu aplicación e intenta de nuevo.";
    if (m.includes("wrong-password") || m.includes("invalid-credential")) return "La contraseña no es correcta.";
    if (m.includes("unverified-email")) return "Primero debes verificar tu correo.";
    if (m.includes("operation-not-allowed") || m.includes("admin-restricted-operation")) return "La verificación en dos pasos todavía no está habilitada en el servidor. Avísanos por soporte.";
    if (m.includes("too-many-requests")) return "Demasiados intentos. Espera unos minutos.";
    return m || "No se pudo completar. Intenta de nuevo.";
  };

  const comenzar = async () => {
    setError(""); setAviso("");
    const usuario = await usuarioActual();
    if (!usuario) { setError("Tu sesión del navegador expiró. Cierra sesión y vuelve a entrar para configurarla."); return; }
    await usuario.reload().catch(() => {});
    if (!usuario.emailVerified) { setPaso("verificar-correo"); return; }
    await prepararSecreto();
  };

  const prepararSecreto = async () => {
    const usuario = await usuarioActual();
    if (!usuario) return;
    setTrabajando(true); setError("");
    try {
      const sesion = await multiFactor(usuario).getSession();
      const s = await TotpMultiFactorGenerator.generateSecret(sesion);
      setSecreto(s); setCodigo(""); setPaso("escanear");
    } catch (e) {
      const t = traducir(e);
      if (t === "RECIENTE") setPaso("reautenticar"); else setError(t);
    } finally { setTrabajando(false); }
  };

  const enviarVerificacion = async () => {
    const usuario = await usuarioActual();
    if (!usuario) return;
    setTrabajando(true); setError("");
    try {
      const res = await fetch("/api/auth/verificar-correo", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (res.status === 429) setError("Ya pediste varios correos. Espera unos minutos.");
      else if (!res.ok) setError(d.error ?? "No pudimos enviar el correo. Intenta de nuevo.");
      else setAviso(d.yaVerificado ? "Tu correo ya está verificado: pulsa «Ya lo verifiqué»." : `Te enviamos un enlace a ${correo}. Ábrelo y vuelve aquí.`);
    } catch { setError("No pudimos conectar. Intenta de nuevo."); }
    finally { setTrabajando(false); }
  };

  const reautenticar = async () => {
    const usuario = await usuarioActual();
    if (!usuario) return;
    setTrabajando(true); setError("");
    try {
      if (conGoogle) await reauthenticateWithPopup(usuario, new GoogleAuthProvider());
      else await reauthenticateWithCredential(usuario, EmailAuthProvider.credential(correo, clave));
      setClave("");
      if (pendienteDesactivar) { setPendienteDesactivar(false); setPaso("inicio"); await desactivar(); }
      else if (pendienteRegenerar) { setPendienteRegenerar(false); setPaso("inicio"); await pedirCodigos("regeneracion"); }
      else await prepararSecreto();
    } catch (e) { setError(traducir(e)); }
    finally { setTrabajando(false); }
  };

  const confirmar = async () => {
    const usuario = await usuarioActual();
    if (!usuario || !secreto) return;
    setTrabajando(true); setError("");
    try {
      const asercion = TotpMultiFactorGenerator.assertionForEnrollment(secreto, codigo.trim());
      await multiFactor(usuario).enroll(asercion, "Aplicación autenticadora");
      setActiva(true); setSecreto(null);
      await pedirCodigos("activacion");
      router.refresh();
    } catch (e) { setError(traducir(e)); }
    finally { setTrabajando(false); }
  };

  // El servidor genera los códigos, deja solo su hash, anota el evento y avisa por correo. Si pasaron más de 10
  // minutos desde que se confirmó la identidad, se pide confirmarla otra vez.
  const pedirCodigos = async (motivo: "activacion" | "regeneracion") => {
    const usuario = await usuarioActual();
    if (!usuario) return;
    setTrabajando(true); setError("");
    try {
      const idToken = await usuario.getIdToken();
      const res = await fetch("/api/auth/mfa-codigos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken, motivo }) });
      const d = await res.json().catch(() => ({}));
      if (res.status === 403 && d.codigo === "reciente") { setPendienteRegenerar(true); setPaso("reautenticar"); return; }
      if (!res.ok) { setError(d.error ?? "No pudimos generar los códigos. Intenta de nuevo."); setPaso("inicio"); return; }
      setCodigosNuevos(d.codigos); setRestantes(d.codigos.length); setGuardados(false); setPaso("codigos");
    } catch { setError("No pudimos conectar. Intenta de nuevo."); setPaso("inicio"); }
    finally { setTrabajando(false); }
  };

  const copiarCodigos = () => navigator.clipboard?.writeText(codigosNuevos.join("\n")).then(() => setAviso("Códigos copiados.")).catch(() => {});
  const descargarCodigos = () => {
    const txt = `Códigos de recuperación de Facturacon (${correo})\nCada código sirve una sola vez.\n\n${codigosNuevos.join("\n")}\n`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([txt], { type: "text/plain" })); a.download = "facturacon-codigos-recuperacion.txt"; a.click();
    URL.revokeObjectURL(a.href);
  };

  const desactivar = async () => {
    const usuario = await usuarioActual();
    if (!usuario) return;
    setTrabajando(true); setError("");
    try {
      const factor = multiFactor(usuario).enrolledFactors[0];
      if (factor) await multiFactor(usuario).unenroll(factor);
      await avisoServidor();
      setActiva(false); setRestantes(0); setPaso("inicio"); setAviso("Verificación en dos pasos desactivada.");
      router.refresh();
    } catch (e) {
      const t = traducir(e);
      if (t === "RECIENTE") { setPendienteDesactivar(true); setPaso("reautenticar"); } else setError(t);
    } finally { setTrabajando(false); }
  };

  const alertas = (<>
    {error && error !== "RECIENTE" && <div role="alert" style={{ padding: "10px 13px", background: "var(--c-red-bg)", border: "1px solid var(--c-red-border)", borderRadius: 10, fontSize: 13.5, color: "var(--c-red)", marginTop: 14 }}>{error}</div>}
    {aviso && <div role="status" style={{ padding: "10px 13px", background: "var(--c-green-bg)", border: "1px solid var(--c-green-border)", borderRadius: 10, fontSize: 13.5, color: "var(--c-green)", marginTop: 14 }}>{aviso}</div>}
  </>);

  return (
    <Card>
      <CardTitle extra={activa ? <Pill tono="success">Activada</Pill> : <Pill tono={recomendada ? "warning" : "neutral"}>Desactivada</Pill>}>Verificación en dos pasos</CardTitle>

      {paso === "inicio" && (
        <div>
          <p style={{ fontSize: 13.5, color: "var(--c-text-2)", lineHeight: 1.6, margin: "0 0 14px" }}>
            {activa
              ? "Al iniciar sesión, además de tu contraseña se te pedirá el código de 6 dígitos de tu aplicación autenticadora. Si alguien consigue tu contraseña, no podrá entrar sin tu teléfono."
              : recomendada
                ? "Tu cuenta puede ver el certificado digital, los cobros y el equipo de tu empresa. Te recomendamos activarla: toma un par de minutos y funciona con Google Authenticator, Microsoft Authenticator, Authy o 1Password."
                : "Añade una capa extra: se pide un código de 6 dígitos de tu teléfono al iniciar sesión. Funciona con Google Authenticator, Microsoft Authenticator, Authy o 1Password."}
          </p>
          {activa ? (
            <Button variante="danger" onClick={desactivar} disabled={trabajando}>Desactivar</Button>
          ) : (
            <Button onClick={comenzar} disabled={trabajando}>{trabajando ? "Preparando…" : "Activar verificación en dos pasos"}</Button>
          )}
          {activa && (
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--c-border-lt)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                <b style={{ fontSize: 13.5 }}>Códigos de recuperación</b>
                <Pill tono={restantes > 3 ? "success" : restantes > 0 ? "warning" : "danger"}>{restantes} disponibles</Pill>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--c-text-3)", lineHeight: 1.55, margin: "0 0 10px" }}>
                Si pierdes o cambias de teléfono, entras con tu contraseña y uno de estos códigos (en la pantalla de inicio de sesión, «No tengo mi teléfono»). Cada uno sirve una vez.
                {restantes <= 3 && " Te quedan pocos: genera códigos nuevos."}
              </p>
              <Button variante="secondary" tamano="sm" onClick={() => pedirCodigos("regeneracion")} disabled={trabajando}>Generar códigos nuevos</Button>
              <p style={{ fontSize: 12, color: "var(--c-text-4)", lineHeight: 1.5, marginTop: 10 }}>
                ¿Sin teléfono y sin códigos? Escríbenos a contacto@facturacon.com.do: verificamos tu identidad y restablecemos el segundo paso.
              </p>
            </div>
          )}
          {alertas}
        </div>
      )}

      {paso === "verificar-correo" && (
        <div>
          <p style={{ fontSize: 13.5, color: "var(--c-text-2)", lineHeight: 1.6, margin: "0 0 14px" }}>
            Para activarla primero hay que confirmar que <b>{correo}</b> es tuyo. Te enviamos un enlace; ábrelo y luego pulsa «Ya lo verifiqué».
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button variante="secondary" onClick={enviarVerificacion} disabled={trabajando}>Enviar enlace a mi correo</Button>
            <Button onClick={comenzar} disabled={trabajando}>Ya lo verifiqué</Button>
          </div>
          {!correoVerificado && <p style={{ fontSize: 12.5, color: "var(--c-text-3)", marginTop: 12 }}>Si no lo ves, revisa la carpeta de spam.</p>}
          {alertas}
        </div>
      )}

      {paso === "reautenticar" && (
        <div>
          <p style={{ fontSize: 13.5, color: "var(--c-text-2)", lineHeight: 1.6, margin: "0 0 14px" }}>
            Por seguridad, confirma que eres tú antes de {pendienteDesactivar ? "desactivarla" : pendienteRegenerar ? "generar códigos nuevos" : "activarla"}.
          </p>
          {!conGoogle && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }} htmlFor="clave-mfa">Tu contraseña</label>
              <input id="clave-mfa" type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} style={campo} />
            </div>
          )}
          <Button onClick={reautenticar} disabled={trabajando || (!conGoogle && !clave)}>{conGoogle ? "Confirmar con Google" : "Confirmar"}</Button>
          {alertas}
        </div>
      )}

      {paso === "escanear" && secreto && (
        <div>
          <ol style={{ fontSize: 13.5, color: "var(--c-text-2)", lineHeight: 1.7, margin: "0 0 16px", paddingLeft: 20 }}>
            <li>Abre tu aplicación autenticadora y elige «agregar cuenta».</li>
            <li>Escanea este código QR (o escribe la clave de abajo).</li>
            <li>Escribe aquí el código de 6 dígitos que aparece en la aplicación.</li>
          </ol>
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ background: "#fff", padding: 12, borderRadius: 12, border: "1px solid var(--c-border)" }}>
              <QRCodeSVG value={secreto.generateQrCodeUrl(correo, "Facturacon")} size={168} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 4 }}>¿No puedes escanear? Clave manual:</div>
              <code style={{ fontFamily: "var(--font-mono)", fontSize: 13, wordBreak: "break-all", background: "var(--c-bg)", padding: "6px 9px", borderRadius: 8, display: "inline-block", maxWidth: 280 }}>{secreto.secretKey}</code>
            </div>
          </div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }} htmlFor="codigo-mfa">Código de 6 dígitos</label>
          <input id="codigo-mfa" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))} placeholder="123456"
            style={{ ...campo, maxWidth: 200, letterSpacing: "0.3em", fontFamily: "var(--font-mono)", fontSize: 18, textAlign: "center" }} />
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <Button onClick={confirmar} disabled={trabajando || codigo.length !== 6}>{trabajando ? "Verificando…" : "Confirmar y activar"}</Button>
            <Button variante="ghost" onClick={() => { setPaso("inicio"); setSecreto(null); setError(""); }}>Cancelar</Button>
          </div>
          {alertas}
        </div>
      )}

      {paso === "codigos" && (
        <div>
          <p style={{ fontSize: 14, color: "var(--c-text-2)", lineHeight: 1.6, margin: "0 0 12px" }}>
            La verificación en dos pasos está <b>activada</b>. Guarda estos <b>códigos de recuperación</b>: son la única forma de entrar si pierdes tu teléfono. <b>No se vuelven a mostrar.</b>
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8, padding: 14, background: "var(--c-bg)", border: "1px solid var(--c-border)", borderRadius: 12, marginBottom: 12 }}>
            {codigosNuevos.map((c) => <code key={c} style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, letterSpacing: "0.04em" }}>{c}</code>)}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <Button variante="secondary" tamano="sm" onClick={copiarCodigos}>Copiar</Button>
            <Button variante="secondary" tamano="sm" onClick={descargarCodigos}>Descargar (.txt)</Button>
          </div>
          <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13.5, color: "var(--c-text-2)", marginBottom: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={guardados} onChange={(e) => setGuardados(e.target.checked)} style={{ width: 18, height: 18, marginTop: 1, accentColor: "var(--c-brand)" }} />
            Ya guardé mis códigos en un lugar seguro (gestor de contraseñas o impresos).
          </label>
          <Button onClick={() => { setPaso("inicio"); setCodigosNuevos([]); setAviso(""); }} disabled={!guardados}>Listo</Button>
          {alertas}
        </div>
      )}
    </Card>
  );
}

