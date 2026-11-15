"use client";

import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/modals/modal";
import Tabs from "@/components/ui/tabs";
import { Avatar, Button, Card, CardTitle, EmptyBlock, PageHeader, Pill, ProgressBar, td, th, tablaWrap } from "@/components/ui/kit";
import { Campo, Input, Select } from "@/components/sandbox/ui";
import { MODULOS_POR_ROL, ROL_LABEL, ROLES_INVITABLES, type Modulo } from "@/lib/tenant/roles";
import type { Empleado, RolMembership } from "@/types/tenant";

interface Cupo { incluidos: number | null; usados: number; lleno: boolean; extra: number; costoExtraRD: number }
interface Admin { uid: string; rol: RolMembership; nombre: string; email: string }
type Pestana = "personal" | "admins" | "permisos";

const DESCRIPCION_ROL: Record<RolMembership, string> = {
  owner: "Control total de la empresa, el plan y el equipo. Ve todas las facturas y cotiza; factura solo si activa «Yo también facturo».",
  admin: "Supervisa todo el sistema y administra el equipo. No factura salvo que el dueño lo active. No cambia el plan de pago.",
  vendedor: "Solo factura, cotiza y atiende clientes. No ve cuánto factura el negocio.",
  almacen: "Maneja el inventario y las compras: productos, precios, entradas y ajustes de stock. No vende ni ve cuánto factura el negocio.",
  contador: "Consulta facturas, cuentas por cobrar y recibidas; descarga la contabilidad. No emite.",
  viewer: "Solo mira el resumen. Útil para un socio o un supervisor.",
};

const MODULO_LABEL: Record<Modulo, string> = {
  dashboard: "Resumen del negocio", facturas: "Facturas", cotizaciones: "Cotizaciones",
  "cuentas-por-cobrar": "Cuentas por cobrar", clientes: "Clientes", inventario: "Inventario",
  recibidas: "Facturas recibidas", personalizacion: "Personalización",
};

function Interruptor({ id, titulo, detalle, activo, deshabilitado, onCambio }: {
  id: string; titulo: string; detalle: string; activo: boolean; deshabilitado?: boolean; onCambio: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderTop: "1px solid var(--c-border)", cursor: deshabilitado ? "not-allowed" : "pointer", opacity: deshabilitado ? 0.7 : 1 }}>
      <input id={id} type="checkbox" role="switch" checked={activo} disabled={deshabilitado} onChange={(e) => onCambio(e.target.checked)}
        style={{ width: 20, height: 20, marginTop: 2, accentColor: "var(--c-brand)", flexShrink: 0 }} />
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{titulo}</span>
        <span style={{ fontSize: 12.5, color: "var(--c-text-3)", lineHeight: 1.5 }}>{detalle}</span>
      </span>
    </label>
  );
}

type Confirmacion = { titulo: string; texto: string; boton: string; peligro?: boolean; accion: () => Promise<void> } | null;

async function post(url: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> | null }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  // Plan lleno: ya no se bloquea, se pide confirmar el costo del usuario adicional y se reenvía.
  if (res.status === 409 && data?.requiereConfirmacion && window.confirm(String(data.error))) {
    return post(url, { ...(body as object), confirmoExtra: true });
  }
  return { ok: res.ok, data };
}

function urlDeLink(slug: string, token: string): string {
  const { hostname, port, protocol } = window.location;
  const esLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost");
  const host = esLocal ? `${slug}.localhost${port ? `:${port}` : ""}` : `${slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;
  return `${esLocal ? "http" : protocol.replace(":", "")}://${host}/empleado/${token}`;
}

export default function EquipoClient({ tenantId, esOwner, tabInicial }: { tenantId: string; esOwner: boolean; tabInicial: Pestana }) {
  const [tab, setTab] = useState<Pestana>(tabInicial);
  const [cargando, setCargando] = useState(true);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [cupo, setCupo] = useState<Cupo | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<Confirmacion>(null);
  const [codigoNuevo, setCodigoNuevo] = useState<{ codigo: string; nombre: string } | null>(null);
  const [permisos, setPermisos] = useState<{ duenoFactura: boolean; adminFactura: boolean; soloUnUsuario: boolean } | null>(null);
  const [guardandoPerm, setGuardandoPerm] = useState(false);

  useEffect(() => {
    if (tab !== "permisos") return;
    let vivo = true;
    fetch(`/api/tenant/permisos?t=${tenantId}`).then((r) => r.json()).then((d) => {
      if (vivo && typeof d?.duenoFactura === "boolean") setPermisos(d);
    }).catch(() => { /* la tarjeta queda cargando: no es crítico */ });
    return () => { vivo = false; };
  }, [tab, tenantId]);

  const cambiarPermiso = async (campo: "duenoFactura" | "adminFactura", valor: boolean) => {
    setGuardandoPerm(true); setError("");
    try {
      const res = await fetch("/api/tenant/permisos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId, [campo]: valor }) });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error ?? "No se pudo guardar el cambio.");
      setPermisos((p) => (p ? { ...p, [campo]: valor } : p));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el cambio.");
    } finally { setGuardandoPerm(false); }
  };
  const [copiado, setCopiado] = useState<string | null>(null);

  const [modalPersonal, setModalPersonal] = useState(false);
  const [fNombre, setFNombre] = useState("");
  const [fRol, setFRol] = useState<RolMembership>("vendedor");
  const [fHorario, setFHorario] = useState("");
  const [fNotas, setFNotas] = useState("");

  const [modalAdmin, setModalAdmin] = useState(false);
  const [aEmail, setAEmail] = useState("");
  const [aRol, setARol] = useState<RolMembership>("admin");

  // Lectura separada de la aplicación al estado: el efecto aplica el resultado
  // en un callback (no de forma síncrona), y las acciones recargan con cargar().
  const leer = useCallback(async () => {
    const [e, u] = await Promise.all([
      fetch(`/api/tenant/empleados?t=${tenantId}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/tenant/usuarios?t=${tenantId}`).then((r) => r.json()).catch(() => null),
    ]);
    return { e, u };
  }, [tenantId]);

  const aplicar = useCallback(({ e, u }: Awaited<ReturnType<typeof leer>>) => {
    if (e?.empleados) setEmpleados(e.empleados);
    if (e?.slug !== undefined) setSlug(e.slug);
    if (e?.linkToken) setLinkToken(e.linkToken);
    if (u?.equipo) setAdmins(u.equipo);
    setCupo(e?.cupo ?? u?.cupo ?? null);
    setCargando(false);
  }, []);

  const cargar = useCallback(async () => aplicar(await leer()), [leer, aplicar]);

  useEffect(() => {
    let vivo = true;
    leer().then((d) => { if (vivo) aplicar(d); });
    return () => { vivo = false; };
  }, [leer, aplicar]);

  const copiar = async (clave: string, valor: string) => {
    try { await navigator.clipboard.writeText(valor); setCopiado(clave); setTimeout(() => setCopiado((c) => (c === clave ? null : c)), 1600); }
    catch { setError("No se pudo copiar automáticamente. Selecciónalo y cópialo a mano."); }
  };

  const correr = async (clave: string, fn: () => Promise<void>) => {
    setTrabajando(clave); setError("");
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Ocurrió un error inesperado."); }
    finally { setTrabajando(null); }
  };

  const agregarPersonal = () => correr("nuevo-personal", async () => {
    const { ok, data } = await post("/api/tenant/empleados", { tenantId, nombre: fNombre, rol: fRol, horario: fHorario, notas: fNotas });
    if (!ok) throw new Error(String(data?.error ?? "No se pudo crear la cuenta."));
    setCodigoNuevo({ codigo: String(data?.codigo), nombre: fNombre });
    setFNombre(""); setFHorario(""); setFNotas(""); setFRol("vendedor"); setModalPersonal(false);
    await cargar();
  });

  const invitarAdmin = () => correr("invitar", async () => {
    const { ok, data } = await post("/api/tenant/usuarios", { tenantId, email: aEmail.trim(), rol: aRol });
    if (!ok) throw new Error(String(data?.error ?? "No se pudo invitar."));
    setAEmail(""); setARol("admin"); setModalAdmin(false);
    await cargar();
  });

  const nuevoCodigo = (emp: Empleado) => correr(`cod-${emp.uid}`, async () => {
    const { ok, data } = await post("/api/tenant/empleados/regenerar", { tenantId, uid: emp.uid });
    if (!ok) throw new Error(String(data?.error ?? "No se pudo generar el código."));
    setCodigoNuevo({ codigo: String(data?.codigo), nombre: emp.nombre });
    await cargar();
  });

  const pedirRevocar = (emp: Empleado) => setConfirmar({
    titulo: `Revocar el acceso de ${emp.nombre}`,
    texto: "Su código dejará de funcionar de inmediato y no podrá entrar al sistema. Sus facturas anteriores se conservan.",
    boton: "Revocar acceso", peligro: true,
    accion: () => correr(`rev-${emp.uid}`, async () => {
      const { ok, data } = await post("/api/tenant/empleados/revocar", { tenantId, uid: emp.uid });
      if (!ok) throw new Error(String(data?.error ?? "No se pudo revocar."));
      await cargar();
    }),
  });

  const pedirRegenerarLink = () => setConfirmar({
    titulo: "Generar un nuevo link de acceso",
    texto: "El link actual dejará de funcionar al instante. Tendrás que compartir el nuevo con tu equipo.",
    boton: "Generar nuevo link",
    accion: () => correr("link", async () => {
      const { ok, data } = await post("/api/tenant/empleados/link/regenerar", { tenantId });
      if (!ok) throw new Error(String(data?.error ?? "No se pudo regenerar el link."));
      setLinkToken(String(data?.linkToken));
    }),
  });

  const cambiarRol = (a: Admin, rol: RolMembership) => correr(`rol-${a.uid}`, async () => {
    const { ok, data } = await post("/api/tenant/usuarios/rol", { tenantId, uid: a.uid, rol });
    if (!ok) throw new Error(String(data?.error ?? "No se pudo cambiar el rol."));
    await cargar();
  });

  const pedirQuitar = (a: Admin) => setConfirmar({
    titulo: `Quitar a ${a.nombre}`,
    texto: "Perderá el acceso a esta empresa. Su cuenta de Facturacon no se elimina y puedes volver a invitarlo.",
    boton: "Quitar acceso", peligro: true,
    accion: () => correr(`del-${a.uid}`, async () => {
      const { ok, data } = await post("/api/tenant/usuarios/eliminar", { tenantId, uid: a.uid });
      if (!ok) throw new Error(String(data?.error ?? "No se pudo quitar."));
      await cargar();
    }),
  });

  const link = slug && linkToken && typeof window !== "undefined" ? urlDeLink(slug, linkToken) : null;
  const activos = empleados.filter((e) => e.activo);

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", fontFamily: "var(--font-sans)" }}>
      <PageHeader
        titulo="Equipo y accesos"
        descripcion="Quién puede entrar a tu sistema y qué puede hacer. Tus cajeros entran con un código, sin correo ni contraseña; tus administradores y contador, con su propia cuenta."
        acciones={tab === "personal"
          ? <Button onClick={() => setModalPersonal(true)}>+ Agregar cajero o personal</Button>
          : tab === "admins" ? <Button onClick={() => setModalAdmin(true)}>+ Invitar administrador o contador</Button> : undefined}
      />

      {cupo && (
        <Card padding={16} style={{ marginBottom: 20, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 260px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              {cupo.incluidos
                ? <>Usas <span className="num">{cupo.usados}</span> de <span className="num">{cupo.incluidos}</span> usuarios de tu plan</>
                : <><span className="num">{cupo.usados}</span> personas con acceso</>}
            </div>
            {cupo.incluidos ? <ProgressBar valor={cupo.usados} maximo={cupo.incluidos} /> : (
              <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>Sin tope por ahora: el límite lo define el plan que actives después de certificarte.</div>
            )}
          </div>
          {cupo.lleno && <Button variante="secondary" href={`/panel/${tenantId}/plan`}>Ver plan →</Button>}
        </Card>
      )}

      {error && (
        <div role="alert" style={{ padding: "10px 14px", marginBottom: 16, borderRadius: "var(--radius-md)", fontSize: 13, background: "var(--c-red-bg)", border: "1px solid var(--c-red-border)", color: "var(--c-red)" }}>
          {error}
        </div>
      )}

      <Tabs<Pestana> valor={tab} onChange={setTab} items={[
        { id: "personal", etiqueta: "Cajeros y personal", cuenta: activos.length },
        { id: "admins", etiqueta: "Administradores y contador", cuenta: admins.length },
        { id: "permisos", etiqueta: "Qué puede hacer cada rol" },
      ]} />

      {cargando ? <div style={{ fontSize: 13, color: "var(--c-text-3)" }}>Cargando equipo…</div> : (
        <>
          {tab === "personal" && (
            <>
              <Card style={{ marginBottom: 18, background: "var(--c-brand-bg)", borderColor: "var(--c-brand-border)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Link de entrada de tu equipo</div>
                <p style={{ fontSize: 12.5, color: "var(--c-text-2)", lineHeight: 1.55, marginBottom: 12 }}>
                  Es el mismo para todo tu negocio. Pégalo cerca de la caja o compártelo por WhatsApp: cada persona entra con su propio código.
                </p>
                {link ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 280px", padding: "9px 12px", background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: "var(--radius-md)", fontSize: 12, fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {link}
                    </div>
                    <Button variante="secondary" onClick={() => copiar("link", link)}>{copiado === "link" ? "✓ Copiado" : "Copiar"}</Button>
                    <Button variante="ghost" onClick={pedirRegenerarLink} disabled={trabajando === "link"}>Cambiar link</Button>
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: "var(--c-text-3)" }}>
                    Tu link de entrada se activa cuando terminas la certificación. Mientras tanto puedes ir creando las cuentas de tu equipo.
                  </div>
                )}
              </Card>

              {empleados.length === 0 ? (
                <EmptyBlock titulo="Todavía no tienes cajeros ni personal" texto="Crea una cuenta para cada persona que va a facturar. Recibirá un código de 8 caracteres para entrar." accion={<Button onClick={() => setModalPersonal(true)}>+ Agregar el primero</Button>} />
              ) : (
                <div style={tablaWrap}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={th}>Persona</th><th style={th}>Rol</th><th style={th}>Estado</th><th style={th}>Último acceso</th><th style={{ ...th, textAlign: "right" }}>Acciones</th></tr></thead>
                    <tbody>
                      {empleados.map((emp) => (
                        <tr key={emp.uid} style={emp.activo ? undefined : { opacity: 0.6 }}>
                          <td style={td}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <Avatar nombre={emp.nombre} />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600 }}>{emp.nombre}</div>
                                <div style={{ fontSize: 11.5, color: "var(--c-text-3)" }}>{[emp.horario, emp.notas].filter(Boolean).join(" · ") || `Código ····${emp.codigoUltimos4}`}</div>
                              </div>
                            </div>
                          </td>
                          <td style={td}>{ROL_LABEL[emp.rol]}</td>
                          <td style={td}><Pill tono={emp.activo ? "success" : "neutral"}>{emp.activo ? "Activo" : "Revocado"}</Pill></td>
                          <td style={{ ...td, color: "var(--c-text-3)" }}>{emp.ultimoAcceso ? new Date(emp.ultimoAcceso).toLocaleDateString("es-DO") : "Nunca"}</td>
                          <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                            <Button variante="ghost" tamano="sm" onClick={() => nuevoCodigo(emp)} disabled={trabajando === `cod-${emp.uid}`}>Nuevo código</Button>
                            {emp.activo && <Button variante="danger" tamano="sm" onClick={() => pedirRevocar(emp)} disabled={trabajando === `rev-${emp.uid}`} style={{ marginLeft: 6 }}>Revocar</Button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {tab === "admins" && (
            <>
              <p style={{ fontSize: 12.5, color: "var(--c-text-3)", lineHeight: 1.55, marginBottom: 16 }}>
                Para personas de confianza con su propia cuenta: un socio, tu contador, quien administre contigo. La persona debe tener su cuenta de Facturacon creada primero.
              </p>
              {admins.length === 0 ? (
                <EmptyBlock titulo="Aún no hay nadie más con acceso administrativo" accion={<Button onClick={() => setModalAdmin(true)}>+ Invitar a alguien</Button>} />
              ) : (
                <div style={tablaWrap}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={th}>Persona</th><th style={th}>Rol</th><th style={{ ...th, textAlign: "right" }}>Acciones</th></tr></thead>
                    <tbody>
                      {admins.map((a) => (
                        <tr key={a.uid}>
                          <td style={td}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <Avatar nombre={a.nombre} />
                              <div><div style={{ fontWeight: 600 }}>{a.nombre}</div><div style={{ fontSize: 11.5, color: "var(--c-text-3)" }}>{a.email}</div></div>
                            </div>
                          </td>
                          <td style={td}>
                            {a.rol === "owner" ? <Pill tono="brand">Dueño</Pill> : (
                              <Select value={a.rol} onChange={(e) => cambiarRol(a, e.target.value as RolMembership)} disabled={trabajando === `rol-${a.uid}` || (!esOwner && a.rol === "admin")} style={{ width: 190, padding: "6px 8px", fontSize: 12.5 }}>
                                {ROLES_INVITABLES.map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                              </Select>
                            )}
                          </td>
                          <td style={{ ...td, textAlign: "right" }}>
                            {a.rol !== "owner" && <Button variante="danger" tamano="sm" onClick={() => pedirQuitar(a)}>Quitar</Button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {tab === "permisos" && (
            <>
              <Card padding={18} style={{ marginBottom: 20 }}>
                <CardTitle>Quién puede facturar</CardTitle>
                <p style={{ fontSize: 12.5, color: "var(--c-text-3)", lineHeight: 1.55, margin: "4px 0 10px" }}>
                  La factura la hace la caja. El dueño y los administradores ven todas las facturas y pueden cotizar, pero no facturan a menos que lo actives aquí.
                </p>
                {!permisos ? <p style={{ fontSize: 13, color: "var(--c-text-3)" }}>Cargando…</p> : (
                  <>
                    <Interruptor id="sw-dueno" titulo="Yo también facturo (dueño)"
                      detalle={permisos.soloUnUsuario ? "Tu plan es de una sola persona: siempre puedes facturar." : "Actívalo si atiendes ventas tú mismo. Se apaga solo al agregar el primer cajero, si no lo habías decidido."}
                      activo={permisos.duenoFactura} deshabilitado={!esOwner || permisos.soloUnUsuario || guardandoPerm}
                      onCambio={(v) => void cambiarPermiso("duenoFactura", v)} />
                    {!permisos.soloUnUsuario && (
                      <Interruptor id="sw-admin" titulo="Los administradores también facturan"
                        detalle="Por defecto un administrador supervisa y no emite facturas."
                        activo={permisos.adminFactura} deshabilitado={!esOwner || guardandoPerm}
                        onCambio={(v) => void cambiarPermiso("adminFactura", v)} />
                    )}
                    {!esOwner && <p style={{ fontSize: 12, color: "var(--c-text-3)", marginTop: 6 }}>Solo el dueño puede cambiar estos permisos.</p>}
                  </>
                )}
              </Card>
              <p style={{ fontSize: 12.5, color: "var(--c-text-3)", lineHeight: 1.55, marginBottom: 16 }}>
                Cada rol ya trae sus permisos. Elige el más limitado que le sirva a la persona para su trabajo.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 20 }}>
                {(Object.keys(DESCRIPCION_ROL) as RolMembership[]).map((r) => (
                  <Card key={r} padding={14}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{ROL_LABEL[r]}</div>
                    <div style={{ fontSize: 12, color: "var(--c-text-3)", lineHeight: 1.5 }}>{DESCRIPCION_ROL[r]}</div>
                  </Card>
                ))}
              </div>
              <Card padding={0}>
                <div style={{ padding: "16px 20px 6px" }}><CardTitle>Acceso a cada parte del sistema</CardTitle></div>
                <div style={{ ...tablaWrap, border: "none", borderRadius: 0 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={th}>Módulo</th>{(Object.keys(DESCRIPCION_ROL) as RolMembership[]).map((r) => <th key={r} style={{ ...th, textAlign: "center" }}>{ROL_LABEL[r]}</th>)}</tr></thead>
                    <tbody>
                      {(Object.keys(MODULO_LABEL) as Modulo[]).map((m) => (
                        <tr key={m}>
                          <td style={td}>{MODULO_LABEL[m]}</td>
                          {(Object.keys(DESCRIPCION_ROL) as RolMembership[]).map((r) => (
                            <td key={r} style={{ ...td, textAlign: "center", color: MODULOS_POR_ROL[r].includes(m) ? "var(--c-green)" : "var(--c-border)", fontWeight: 700 }}>
                              {MODULOS_POR_ROL[r].includes(m) ? "✓" : "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </>
      )}

      <Modal open={modalPersonal} onClose={() => setModalPersonal(false)} title="Agregar cajero o personal" maxWidth={480}>
        <form onSubmit={(e) => { e.preventDefault(); void agregarPersonal(); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Campo label="Nombre completo"><Input required autoFocus value={fNombre} onChange={(e) => setFNombre(e.target.value)} placeholder="María Pérez" /></Campo>
          <Campo label="Rol">
            <Select value={fRol} onChange={(e) => setFRol(e.target.value as RolMembership)}>
              {ROLES_INVITABLES.filter((r) => r !== "admin").map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
            </Select>
            <div style={{ fontSize: 11.5, color: "var(--c-text-3)", marginTop: 5 }}>{DESCRIPCION_ROL[fRol]}</div>
          </Campo>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Campo label="Horario (opcional)"><Input value={fHorario} onChange={(e) => setFHorario(e.target.value)} placeholder="Lun–Sáb 8am–5pm" /></Campo>
            <Campo label="Nota (opcional)"><Input value={fNotas} onChange={(e) => setFNotas(e.target.value)} placeholder="Caja 2" /></Campo>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button variante="secondary" onClick={() => setModalPersonal(false)}>Cancelar</Button>
            <Button type="submit" disabled={!fNombre.trim() || trabajando === "nuevo-personal"}>{trabajando === "nuevo-personal" ? "Creando…" : "Crear y ver código"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={modalAdmin} onClose={() => setModalAdmin(false)} title="Invitar administrador o contador" maxWidth={480}>
        <form onSubmit={(e) => { e.preventDefault(); void invitarAdmin(); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Campo label="Correo de su cuenta de Facturacon">
            <Input type="email" required autoFocus value={aEmail} onChange={(e) => setAEmail(e.target.value)} placeholder="contador@ejemplo.com" />
          </Campo>
          <Campo label="Rol">
            <Select value={aRol} onChange={(e) => setARol(e.target.value as RolMembership)}>
              {(esOwner ? ROLES_INVITABLES : ROLES_INVITABLES.filter((r) => r !== "admin")).map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
            </Select>
            <div style={{ fontSize: 11.5, color: "var(--c-text-3)", marginTop: 5 }}>{DESCRIPCION_ROL[aRol]}</div>
          </Campo>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button variante="secondary" onClick={() => setModalAdmin(false)}>Cancelar</Button>
            <Button type="submit" disabled={!aEmail.trim() || trabajando === "invitar"}>{trabajando === "invitar" ? "Invitando…" : "Dar acceso"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!codigoNuevo} onClose={() => setCodigoNuevo(null)} title={`Código de ${codigoNuevo?.nombre ?? ""}`} maxWidth={420}>
        <p style={{ fontSize: 13, color: "var(--c-text-3)", lineHeight: 1.55, marginBottom: 16 }}>
          Entrégaselo ahora: <strong>no se puede volver a ver</strong>. Si se pierde, genera uno nuevo desde la lista.
        </p>
        <div className="num" style={{ padding: 18, background: "var(--c-bg)", border: "1px dashed var(--c-border)", borderRadius: "var(--radius-lg)", fontSize: 26, fontWeight: 700, textAlign: "center", letterSpacing: "0.1em", fontFamily: "var(--font-mono)", marginBottom: 16 }}>
          {codigoNuevo?.codigo}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variante="secondary" onClick={() => codigoNuevo && copiar("codigo", codigoNuevo.codigo)}>{copiado === "codigo" ? "✓ Copiado" : "Copiar código"}</Button>
          <Button onClick={() => setCodigoNuevo(null)}>Listo, ya lo entregué</Button>
        </div>
      </Modal>

      <Modal open={!!confirmar} onClose={() => setConfirmar(null)} title={confirmar?.titulo ?? ""} maxWidth={440}>
        <p style={{ fontSize: 13, color: "var(--c-text-2)", lineHeight: 1.6, marginBottom: 18 }}>{confirmar?.texto}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variante="secondary" onClick={() => setConfirmar(null)}>Cancelar</Button>
          <Button variante={confirmar?.peligro ? "danger" : "primary"} onClick={() => { const a = confirmar?.accion; setConfirmar(null); void a?.(); }}>{confirmar?.boton}</Button>
        </div>
      </Modal>
    </div>
  );
}
