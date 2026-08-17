"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Logo from "@/components/ui/logo";
import GoogleIcon from "@/components/ui/google-icon";
import type { TipoCuenta } from "@/types/tenant";

const sans  = "var(--font-sans)";
const mono  = "var(--font-mono)";

interface RncValidado { valid: boolean; name?: string; rnc?: string; activo?: boolean | null }

function TipoCuentaCard({ active, onClick, title, desc }: {
  active: boolean; onClick: () => void; title: string; desc: string;
}) {
  return (
    <button onClick={onClick} type="button" style={{
      textAlign: "left", padding: 14, borderRadius: 8, cursor: "pointer",
      border: `2px solid ${active ? "var(--c-brand)" : "var(--c-border)"}`,
      background: active ? "var(--c-brand-bg)" : "#fff", fontFamily: sans,
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>{desc}</div>
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 6,
  fontSize: 13, color: "#111", outline: "none", fontFamily: sans, background: "#fff",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600, color: "#374151",
  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5,
};

// El destino tras crear la cuenta depende de cómo va a usarla: una cuenta
// individual ya trae su único RNC/negocio, así que salta directo al paso de
// tipo de negocio en /onboarding; un gestor no declara ninguna empresa
// todavía — su casa es /panel, con el botón para agregar la primera cuando
// quiera (puede administrar varias, a diferencia del individual).
function destinoTrasRegistro(tipoCuenta: TipoCuenta, rnc: string, nombreNegocio: string): string {
  if (tipoCuenta === "individual") {
    return `/onboarding?rnc=${encodeURIComponent(rnc)}&nombreNegocio=${encodeURIComponent(nombreNegocio)}`;
  }
  return "/panel";
}

async function crearSesionYRedirigir(
  idToken: string, router: ReturnType<typeof useRouter>, destino: string,
  perfil: { nombre: string; telefono?: string; tipoCuenta: TipoCuenta },
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

export default function RegistroPage() {
  const router = useRouter();
  const [paso, setPaso] = useState<1 | 2>(1);
  const [tipoCuenta, setTipoCuenta] = useState<TipoCuenta | null>(null);

  const [nombre,   setNombre]   = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email,   setEmail]   = useState("");
  const [pass,    setPass]    = useState("");

  const [rnc, setRnc] = useState("");
  const [nombreNegocio, setNombreNegocio] = useState("");
  const [validandoRnc, setValidandoRnc] = useState(false);
  const [rncValidado, setRncValidado] = useState<RncValidado | null>(null);
  const [rncError, setRncError] = useState("");

  const [error,   setError]   = useState("");
  // Cuando el correo ya tiene cuenta, en vez de solo mostrar un error
  // mostramos un botón directo a /login con el correo precargado — antes el
  // usuario se quedaba "atascado" viendo el mensaje sin un camino claro.
  const [yaExiste, setYaExiste] = useState(false);
  const [loading, setLoading] = useState(false);

  const esIndividual = tipoCuenta === "individual";
  const rncListo = !esIndividual || (!!rncValidado?.valid && !!nombreNegocio.trim());

  const validarRnc = async () => {
    setValidandoRnc(true); setRncError(""); setRncValidado(null);
    try {
      const res = await fetch(`/api/validate-rnc?number=${encodeURIComponent(rnc)}`);
      const data = await res.json();
      if (!data.valid) setRncError("No encontramos ese RNC en el padrón de la DGII. Verifica el número.");
      else {
        setRncValidado(data);
        if (!nombreNegocio) setNombreNegocio(data.name);
      }
    } catch {
      setRncError("No se pudo validar el RNC ahora. Intenta de nuevo.");
    } finally { setValidandoRnc(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoCuenta || !rncListo) return;
    setError(""); setYaExiste(false); setLoading(true);
    try {
      const nombreCompleto = `${nombre.trim()} ${apellido.trim()}`.trim();
      const credential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(credential.user, { displayName: nombreCompleto });
      const idToken = await credential.user.getIdToken();
      const destino = destinoTrasRegistro(tipoCuenta, rncValidado?.rnc ?? rnc, nombreNegocio);
      await crearSesionYRedirigir(idToken, router, destino, {
        nombre: nombreCompleto, telefono: telefono.trim() || undefined, tipoCuenta,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("email-already-in-use")) {
        setError("Ya existe una cuenta con ese correo.");
        setYaExiste(true);
      } else if (msg.includes("weak-password")) {
        setError("La contraseña debe tener al menos 6 caracteres.");
      } else if (msg.includes("invalid-email")) {
        setError("Correo inválido.");
      } else {
        setError(msg || "Error al registrarte. Intenta de nuevo.");
      }
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    if (!tipoCuenta || !rncListo) return;
    setError(""); setYaExiste(false); setLoading(true);
    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await credential.user.getIdToken();
      const nombreGoogle = credential.user.displayName ?? credential.user.email ?? "";
      const destino = destinoTrasRegistro(tipoCuenta, rncValidado?.rnc ?? rnc, nombreNegocio);
      await crearSesionYRedirigir(idToken, router, destino, { nombre: nombreGoogle, tipoCuenta });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al registrarte con Google.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      background: "#fff", border: "1px solid var(--c-border)", borderRadius: 10,
      padding: "40px 36px", width: "100%", maxWidth: paso === 2 && esIndividual ? 440 : 380,
      boxShadow: "0 4px 24px rgba(0,0,0,0.05)", fontFamily: sans,
    }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Logo size={30} />
        </div>
        <div style={{ fontSize: 11, color: "var(--c-text-4)", marginTop: 8, fontFamily: mono }}>
          Crea tu cuenta
        </div>
      </div>

      {paso === 1 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>¿Cómo vas a usar Facturacon?</div>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 16, lineHeight: 1.5 }}>
            Cada empresa hace su propio proceso de certificación, con su propio subdominio — esta
            elección solo cambia si vas a poder administrar varias.
          </p>
          <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
            <TipoCuentaCard active={tipoCuenta === "individual"} onClick={() => setTipoCuenta("individual")}
              title="Solo mi empresa" desc="Esta cuenta va a estar ligada a un único negocio, de forma permanente." />
            <TipoCuentaCard active={tipoCuenta === "gestor"} onClick={() => setTipoCuenta("gestor")}
              title="Soy gestor o contable" desc="Quiero poder administrar la facturación de varias empresas desde esta misma cuenta." />
          </div>
          <button onClick={() => setPaso(2)} disabled={!tipoCuenta} type="button" style={{
            width: "100%", padding: "11px", background: !tipoCuenta ? "#9ca3af" : "var(--c-brand)",
            color: "#fff", border: "none", borderRadius: 6, cursor: !tipoCuenta ? "not-allowed" : "pointer",
            fontSize: 13, fontWeight: 600, fontFamily: sans,
          }}>
            Continuar
          </button>
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#6b7280" }}>
            ¿Ya tienes cuenta? <a href="/login" style={{ color: "var(--c-brand)", fontWeight: 600 }}>Inicia sesión</a>
          </div>
        </div>
      )}

      {paso === 2 && (
        <div>
          <button onClick={() => setPaso(1)} type="button" style={{
            background: "none", border: "none", padding: 0, marginBottom: 16, cursor: "pointer",
            fontSize: 12, color: "var(--c-text-3)", fontFamily: sans,
          }}>
            ← {esIndividual ? "Solo mi empresa" : "Gestor o contable"}
          </button>

          <button onClick={handleGoogle} disabled={loading || !rncListo} type="button" style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            width: "100%", padding: "10px", marginBottom: 16, background: "#fff",
            border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, fontWeight: 600,
            color: "#111", cursor: (loading || !rncListo) ? "not-allowed" : "pointer", fontFamily: sans,
          }}>
            <GoogleIcon />
            Continuar con Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0", fontSize: 11, color: "#9ca3af" }}>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
            o con correo
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {esIndividual && (
              <div style={{ padding: 14, background: "var(--c-bg)", border: "1px solid var(--c-border)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={labelStyle}>RNC de tu empresa</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={rnc} onChange={(e) => { setRnc(e.target.value); setRncValidado(null); }}
                      placeholder="131217656" style={{ ...inputStyle, flex: 1 }} />
                    <button type="button" onClick={validarRnc} disabled={!rnc.trim() || validandoRnc} style={{
                      padding: "10px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600,
                      cursor: (!rnc.trim() || validandoRnc) ? "not-allowed" : "pointer",
                      background: "#fff", border: "1px solid var(--c-border)", whiteSpace: "nowrap",
                    }}>
                      {validandoRnc ? "Validando..." : "Validar"}
                    </button>
                  </div>
                  {rncError && <div style={{ marginTop: 6, fontSize: 12, color: "#991b1b" }}>{rncError}</div>}
                  {rncValidado?.valid && (
                    <div style={{ marginTop: 6, fontSize: 12, color: "#166534" }}>
                      ✓ {rncValidado.name} — estado: {rncValidado.activo ? "Activo" : "no activo"}
                    </div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Nombre del negocio</label>
                  <input value={nombreNegocio} onChange={(e) => setNombreNegocio(e.target.value)}
                    placeholder="Mi Negocio SRL" style={inputStyle} />
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>Nombre</label>
                <input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Juan" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Apellido</label>
                <input required value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Pérez" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Correo electrónico</label>
              <input type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setYaExiste(false); }}
                placeholder="usuario@ejemplo.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Contraseña</label>
              <input type="password" required minLength={6} value={pass} onChange={(e) => setPass(e.target.value)}
                placeholder="Mínimo 6 caracteres" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>
                Teléfono <span style={{ textTransform: "none", fontWeight: 400, color: "#9ca3af" }}>(opcional)</span>
              </label>
              <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)}
                placeholder="809 555 0100" style={inputStyle} />
            </div>

            {error && (
              <div style={{ padding: "9px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12, color: "#991b1b" }}>
                <div style={{ marginBottom: yaExiste ? 8 : 0 }}>{error}</div>
                {yaExiste && (
                  <a href={`/login?email=${encodeURIComponent(email)}`} style={{
                    display: "inline-block", fontSize: 12, fontWeight: 700, color: "#fff",
                    background: "var(--c-brand)", padding: "6px 12px", borderRadius: 6, textDecoration: "none",
                  }}>
                    Iniciar sesión →
                  </a>
                )}
              </div>
            )}

            <button type="submit" disabled={loading || !rncListo}
              style={{ padding: "11px", background: (loading || !rncListo) ? "#9ca3af" : "var(--c-brand)", color: "#fff", border: "none", borderRadius: 6, cursor: (loading || !rncListo) ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, fontFamily: sans }}>
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
