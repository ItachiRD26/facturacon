"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AlertaAuth, BotonAuth, Campo, Encabezado, EntradaClave, TarjetaAuth } from "@/components/auth/ui-auth";

// Destino de los enlaces de los correos de seguridad (restablecer contraseña y confirmar correo). Reemplaza la
// pantalla en inglés de Firebase: la acción la ejecuta el SDK del navegador con el código del enlace.
export default function AccionPage() {
  return <Suspense><Accion /></Suspense>;
}

const enlaceInvalido = "Este enlace ya se usó o venció. Pide uno nuevo y vuelve a intentarlo.";

function Accion() {
  const p = useSearchParams();
  const modo = p.get("modo");
  const codigo = p.get("codigo") ?? "";

  if (!codigo || (modo !== "resetPassword" && modo !== "verifyEmail")) {
    return (
      <TarjetaAuth>
        <Encabezado titulo="Enlace no válido" texto="Revisa que abriste el enlace completo del correo, o pide uno nuevo." />
        <Link href="/login" style={{ color: "var(--c-brand)", fontWeight: 700, fontSize: 14 }}>Ir a iniciar sesión</Link>
      </TarjetaAuth>
    );
  }
  return modo === "resetPassword" ? <NuevaClave codigo={codigo} /> : <ConfirmarCorreo codigo={codigo} />;
}

function NuevaClave({ codigo }: { codigo: string }) {
  const [correo, setCorreo] = useState<string | null>(null);
  const [clave, setClave] = useState("");
  const [clave2, setClave2] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);
  const [invalido, setInvalido] = useState(false);

  useEffect(() => {
    verifyPasswordResetCode(auth, codigo).then(setCorreo).catch(() => setInvalido(true));
  }, [codigo]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (clave.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (clave !== clave2) { setError("Las dos contraseñas no coinciden."); return; }
    setCargando(true);
    try {
      await confirmPasswordReset(auth, codigo, clave);
      setListo(true);
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : "";
      setError(m.includes("weak-password") ? "Esa contraseña es muy débil. Usa al menos 8 caracteres." : m.includes("expired") || m.includes("invalid-action-code") ? enlaceInvalido : "No pudimos guardar la contraseña. Intenta de nuevo.");
    } finally { setCargando(false); }
  };

  if (invalido) {
    return (
      <TarjetaAuth>
        <Encabezado titulo="Enlace vencido" texto={enlaceInvalido} />
        <Link href="/login" style={{ color: "var(--c-brand)", fontWeight: 700, fontSize: 14 }}>Volver a iniciar sesión</Link>
      </TarjetaAuth>
    );
  }
  if (listo) {
    return (
      <TarjetaAuth>
        <Encabezado titulo="Contraseña actualizada" texto="Ya puedes entrar con tu contraseña nueva. Si tu cuenta tiene verificación en dos pasos, se te seguirá pidiendo el código." />
        <Link href={`/login?email=${encodeURIComponent(correo ?? "")}`} style={{ display: "inline-block", background: "var(--c-brand)", color: "#fff", fontWeight: 700, padding: "12px 22px", borderRadius: 10, textDecoration: "none" }}>Iniciar sesión</Link>
      </TarjetaAuth>
    );
  }
  return (
    <TarjetaAuth>
      <Encabezado titulo="Crea tu contraseña nueva" texto={correo ? <>Para la cuenta <b>{correo}</b>.</> : "Un momento…"} />
      <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Campo etiqueta="Contraseña nueva" ayuda="Al menos 8 caracteres.">
          <EntradaClave required minLength={8} autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} disabled={!correo} />
        </Campo>
        <Campo etiqueta="Repite la contraseña">
          <EntradaClave required minLength={8} autoComplete="new-password" value={clave2} onChange={(e) => setClave2(e.target.value)} disabled={!correo} />
        </Campo>
        {error && <AlertaAuth>{error}</AlertaAuth>}
        <BotonAuth cargando={cargando} disabled={!correo}>{cargando ? "Guardando…" : "Guardar contraseña"}</BotonAuth>
      </form>
    </TarjetaAuth>
  );
}

function ConfirmarCorreo({ codigo }: { codigo: string }) {
  const [estado, setEstado] = useState<"trabajando" | "ok" | "mal">("trabajando");
  useEffect(() => {
    applyActionCode(auth, codigo).then(() => setEstado("ok")).catch(() => setEstado("mal"));
  }, [codigo]);
  return (
    <TarjetaAuth>
      {estado === "trabajando" && <Encabezado titulo="Confirmando tu correo…" />}
      {estado === "ok" && <>
        <Encabezado titulo="Correo confirmado" texto="Listo. Vuelve a la pantalla de Seguridad de tu panel y continúa con la activación." />
        <Link href="/panel" style={{ display: "inline-block", background: "var(--c-brand)", color: "#fff", fontWeight: 700, padding: "12px 22px", borderRadius: 10, textDecoration: "none" }}>Ir a mi panel</Link>
      </>}
      {estado === "mal" && <>
        <Encabezado titulo="No se pudo confirmar" texto={enlaceInvalido} />
        <Link href="/panel" style={{ color: "var(--c-brand)", fontWeight: 700, fontSize: 14 }}>Ir a mi panel</Link>
      </>}
    </TarjetaAuth>
  );
}
