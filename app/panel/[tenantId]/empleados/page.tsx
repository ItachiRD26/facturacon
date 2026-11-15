"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ROL_LABEL, ROLES_INVITABLES } from "@/lib/tenant/roles";
import type { Empleado, RolMembership } from "@/types/tenant";
import Icon from "@/components/ui/icon";

const sans  = "var(--font-sans)";
const serif = "var(--font-serif)";
const mono  = "var(--font-mono)";

function Boton({ children, onClick, disabled, variant = "primary", type = "button" }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  variant?: "primary" | "secondary" | "danger"; type?: "button" | "submit";
}) {
  const estilos = {
    primary:   { background: "var(--c-brand)", color: "#fff", border: "none" },
    secondary: { background: "#fff", color: "var(--c-text-1)", border: "1px solid var(--c-border)" },
    danger:    { background: "#fff", color: "#991b1b", border: "1px solid #fecaca" },
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      padding: "8px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, fontFamily: sans,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, ...estilos,
    }}>
      {children}
    </button>
  );
}

// Muestra el código recién generado UNA vez — no queda guardado en ningún
// lado en texto plano, así que si se cierra este aviso sin copiarlo hay que
// regenerarlo.
function AvisoCodigo({ codigo, nombre, onClose }: { codigo: string; nombre: string; onClose: () => void }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(17,20,57,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20,
    }}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 28, maxWidth: 420, width: "100%" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Código para {nombre}</div>
        <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 16, lineHeight: 1.5 }}>
          Entrégaselo ahora — no se puede volver a ver. Si se pierde, tendrás que generar uno nuevo
          desde la lista de empleados.
        </p>
        <div style={{
          padding: "16px", background: "var(--c-bg)", border: "1px dashed var(--c-border)", borderRadius: 8,
          fontSize: 22, fontWeight: 700, textAlign: "center", letterSpacing: "0.06em", fontFamily: mono,
          marginBottom: 16,
        }}>
          {codigo}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Boton variant="secondary" onClick={() => { navigator.clipboard.writeText(codigo); setCopiado(true); }}>
            {copiado ? "✓ Copiado" : "Copiar código"}
          </Boton>
          <Boton onClick={onClose}>Listo, lo entregué</Boton>
        </div>
      </div>
    </div>
  );
}

export default function EmpleadosPage() {
  const params = useParams();
  const tenantId = String(params.tenantId ?? "");

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [slug, setSlug] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [copiadoLink, setCopiadoLink] = useState(false);
  const [regenerandoLink, setRegenerandoLink] = useState(false);

  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<RolMembership>("vendedor");
  const [horario, setHorario] = useState("");
  const [notas, setNotas] = useState("");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");

  const [codigoNuevo, setCodigoNuevo] = useState<{ codigo: string; nombre: string } | null>(null);
  const [accionando, setAccionando] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    const res = await fetch(`/api/tenant/empleados?t=${tenantId}`);
    const data = await res.json().catch(() => null);
    if (data?.empleados) setEmpleados(data.empleados);
    if (data?.slug) setSlug(data.slug);
    if (data?.linkToken) setLinkToken(data.linkToken);
    setCargando(false);
  }

  useEffect(() => { if (tenantId) cargar(); }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Arma la URL a partir de dónde se está viendo el panel ahora mismo, no de
  // NEXT_PUBLIC_ROOT_DOMAIN a secas — esa env var queda fija en
  // facturacon.com.do incluso en local (necesaria para producción), así que
  // usarla directo mandaría a probar el link fuera de localhost.
  const urlLinkEmpleado = () => {
    if (!slug || !linkToken) return null;
    if (typeof window === "undefined") return `https://${slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/empleado/${linkToken}`;
    const { hostname, port, protocol } = window.location;
    const esLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost");
    const host = esLocal ? `${slug}.localhost${port ? `:${port}` : ""}` : `${slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;
    return `${esLocal ? "http" : protocol.replace(":", "")}://${host}/empleado/${linkToken}`;
  };

  const regenerarLink = async () => {
    if (!confirm("¿Generar un nuevo link? El link actual dejará de funcionar de inmediato.")) return;
    setRegenerandoLink(true);
    try {
      const res = await fetch("/api/tenant/empleados/link/regenerar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo regenerar el link");
      setLinkToken(data.linkToken);
      setCopiadoLink(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setRegenerandoLink(false);
    }
  };

  const agregarEmpleado = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setCreando(true);
    try {
      const res = await fetch("/api/tenant/empleados", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, nombre, rol, horario, notas }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear el empleado");
      setCodigoNuevo({ codigo: data.codigo, nombre });
      setNombre(""); setHorario(""); setNotas(""); setRol("vendedor");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setCreando(false);
    }
  };

  const regenerar = async (emp: Empleado) => {
    setAccionando(emp.uid);
    try {
      const res = await fetch("/api/tenant/empleados/regenerar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, uid: emp.uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo generar el código");
      setCodigoNuevo({ codigo: data.codigo, nombre: emp.nombre });
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setAccionando(null);
    }
  };

  const revocar = async (emp: Empleado) => {
    if (!confirm(`¿Revocar el acceso de ${emp.nombre}? Su código dejará de funcionar de inmediato.`)) return;
    setAccionando(emp.uid);
    try {
      const res = await fetch("/api/tenant/empleados/revocar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, uid: emp.uid }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error); }
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setAccionando(null);
    }
  };

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", fontFamily: sans }}>
      <h1 style={{ fontFamily: serif, fontSize: "1.5rem", marginBottom: 4 }}>Empleados</h1>
      <p style={{ fontSize: 13, color: "var(--c-text-3)", marginBottom: 20 }}>
        Cada empleado entra con un código propio, sin correo ni contraseña. Ve qué puede ver cada
        rol en <span style={{ fontFamily: mono }}>Ver como</span> dentro de tu sistema.
      </p>

      <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, padding: 18, marginBottom: 24, background: "var(--c-brand-bg)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Link de acceso de tu empresa</div>
        <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 10, lineHeight: 1.5 }}>
          Es único para tu negocio — compártelo con tu equipo (ej. pégalo cerca de la caja). Ahí
          cada empleado pone su propio código. Si crees que se filtró, regénéralo abajo — el link
          anterior deja de funcionar al instante.
        </p>
        {slug && linkToken ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{
              flex: "1 1 260px", padding: "9px 11px", background: "#fff", border: "1px solid var(--c-border)",
              borderRadius: 6, fontSize: 12, fontFamily: mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {urlLinkEmpleado()}
            </div>
            <Boton variant="secondary" onClick={() => { navigator.clipboard.writeText(urlLinkEmpleado() ?? ""); setCopiadoLink(true); }}>
              {copiadoLink ? "✓ Copiado" : "Copiar"}
            </Boton>
            <Boton variant="secondary" onClick={regenerarLink} disabled={regenerandoLink}>
              {regenerandoLink ? "Generando..." : "Regenerar link"}
            </Boton>
          </div>
        ) : cargando ? (
          <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>Cargando...</div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>
            Todavía no tienes subdominio asignado — completa la verificación de credenciales primero.
          </div>
        )}
      </div>

      <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, padding: 20, marginBottom: 28, background: "var(--c-surface)" }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Agregar empleado</div>
        <form onSubmit={agregarEmpleado} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", marginBottom: 5 }}>Nombre</label>
              <input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo"
                style={{ width: "100%", padding: "9px 11px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", marginBottom: 5 }}>Rol</label>
              <select value={rol} onChange={(e) => setRol(e.target.value as RolMembership)}
                style={{ width: "100%", padding: "9px 11px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, background: "#fff" }}>
                {ROLES_INVITABLES.map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", marginBottom: 5 }}>
                Horario <span style={{ textTransform: "none", fontWeight: 400, color: "#9ca3af" }}>(opcional)</span>
              </label>
              <input value={horario} onChange={(e) => setHorario(e.target.value)} placeholder="Lunes a sábado, 8am–5pm"
                style={{ width: "100%", padding: "9px 11px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", marginBottom: 5 }}>
                Notas <span style={{ textTransform: "none", fontWeight: 400, color: "#9ca3af" }}>(opcional)</span>
              </label>
              <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Caja 2, turno tarde..."
                style={{ width: "100%", padding: "9px 11px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
            </div>
          </div>
          {error && <div style={{ fontSize: 12, color: "#991b1b" }}>{error}</div>}
          <div>
            <Boton type="submit" disabled={creando || !nombre.trim()}>
              {creando ? "Creando..." : "+ Agregar empleado"}
            </Boton>
          </div>
        </form>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Tu equipo</div>
      {cargando ? (
        <div style={{ fontSize: 13, color: "var(--c-text-3)" }}>Cargando...</div>
      ) : empleados.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center", border: "1px dashed var(--c-border)", borderRadius: 8, fontSize: 13, color: "var(--c-text-3)" }}>
          Todavía no has agregado ningún empleado.
        </div>
      ) : (
        <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--c-bg)" }}>
                {["Nombre", "Rol", "Horario", "Código", "Estado", "Último acceso", ""].map((h) => (
                  <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--c-text-3)", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empleados.map((emp) => (
                <tr key={emp.uid} style={{ borderTop: "1px solid var(--c-border-lt)" }}>
                  <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>{emp.nombre}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--c-text-3)" }}>{ROL_LABEL[emp.rol]}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--c-text-3)" }}>{emp.horario ?? "—"}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: mono, color: "var(--c-text-3)" }}>····{emp.codigoUltimos4}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: emp.activo ? "#166534" : "#991b1b" }}>
                      {emp.activo ? "Activo" : "Revocado"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--c-text-3)" }}>
                    {emp.ultimoAcceso ? new Date(emp.ultimoAcceso).toLocaleDateString("es-DO") : "Nunca"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => regenerar(emp)} disabled={accionando === emp.uid} title="Generar nuevo código" style={{
                        padding: "5px 8px", background: "#fff", border: "1px solid var(--c-border)", borderRadius: 4,
                        cursor: accionando === emp.uid ? "not-allowed" : "pointer", color: "var(--c-text-2)",
                      }}>
                        <Icon name="convert" size={12} />
                      </button>
                      {emp.activo && (
                        <button onClick={() => revocar(emp)} disabled={accionando === emp.uid} title="Revocar acceso" style={{
                          padding: "5px 8px", background: "#fff", border: "1px solid #fecaca", borderRadius: 4,
                          cursor: accionando === emp.uid ? "not-allowed" : "pointer", color: "#991b1b",
                        }}>
                          <Icon name="x" size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {codigoNuevo && (
        <AvisoCodigo codigo={codigoNuevo.codigo} nombre={codigoNuevo.nombre} onClose={() => setCodigoNuevo(null)} />
      )}
    </div>
  );
}
