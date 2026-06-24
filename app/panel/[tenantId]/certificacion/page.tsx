"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { TipoECF } from "@/types";
import type { EmpresaConfig } from "@/types/tenant";
import type { FilaSetPrueba, ItemAC, FacturaPrueba } from "@/lib/certificacion/tipos";

const sans  = "var(--font-sans)";
const serif = "var(--font-serif)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Paso = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const PASOS: { n: Paso; t: string }[] = [
  { n: 0, t: "Datos de empresa" },
  { n: 1, t: "Token DGII" },
  { n: 2, t: "Set de pruebas" },
  { n: 3, t: "Aprobaciones comerciales" },
  { n: 4, t: "Pruebas interactivas" },
  { n: 5, t: "XMLs para el portal" },
  { n: 6, t: "Cerrar certificación" },
];

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid var(--c-border)", borderRadius: 10, padding: 20, background: "var(--c-surface)", marginBottom: 20 }}>
      {children}
    </div>
  );
}

function Boton({ onClick, disabled, children, variante = "primario" }: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode; variante?: "primario" | "secundario";
}) {
  return (
    <button onClick={onClick} disabled={disabled} type="button" style={{
      padding: "9px 16px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
      background: disabled ? "#9ca3af" : variante === "primario" ? "var(--c-brand)" : "var(--c-surface)",
      color: variante === "primario" ? "#fff" : "var(--c-text)",
      border: variante === "primario" ? "none" : "1px solid var(--c-border)",
    }}>
      {children}
    </button>
  );
}

const ESTADO_COLOR: Record<string, string> = {
  pendiente: "var(--c-text-3)", enviando: "#92400e", enviado: "#1d4ed8",
  aceptado: "#166534", rechazado: "#991b1b", error: "#991b1b",
};

function Estado({ estado }: { estado?: string }) {
  return <span style={{ fontSize: 11, fontWeight: 700, color: ESTADO_COLOR[estado ?? "pendiente"] }}>{estado ?? "pendiente"}</span>;
}

export default function CertificacionPage() {
  const params = useParams();
  const tenantId = String(params.tenantId ?? "");

  const [paso, setPaso] = useState<Paso>(0);
  const [cargando, setCargando] = useState(true);

  // Paso 0
  const [empresa, setEmpresa] = useState<EmpresaConfig | null>(null);
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [actividad, setActividad] = useState("");
  const [guardandoEmpresa, setGuardandoEmpresa] = useState(false);

  // Paso 1
  const [tokenValido, setTokenValido] = useState<boolean | null>(null);
  const [tokenExpira, setTokenExpira] = useState<string | null>(null);
  const [obteniendoToken, setObteniendoToken] = useState(false);

  // Paso 2
  const [filas, setFilas] = useState<Record<string, FilaSetPrueba>>({});
  const [subiendoSet, setSubiendoSet] = useState(false);
  const [enviandoTodos, setEnviandoTodos] = useState(false);
  const [logEnvio, setLogEnvio] = useState<string[]>([]);

  // Paso 3
  const [acItems, setAcItems] = useState<Record<string, ItemAC>>({});
  const [subiendoAC, setSubiendoAC] = useState(false);
  const [enviandoAC, setEnviandoAC] = useState(false);
  const [edicionesAC, setEdicionesAC] = useState<Record<string, { estado: 1 | 2; motivo: string }>>({});

  // Paso 4
  const [pruebas, setPruebas] = useState<Record<string, FacturaPrueba>>({});
  const [tipoPrueba, setTipoPrueba] = useState<TipoECF>("E43");
  const [formPrueba, setFormPrueba] = useState<Record<string, string>>({});
  const [creandoPrueba, setCreandoPrueba] = useState(false);
  const [errorPrueba, setErrorPrueba] = useState("");

  // Paso 6
  const [confirmoPortal, setConfirmoPortal] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  const cancelado = useRef(false);
  useEffect(() => () => { cancelado.current = true; }, []);

  async function cargarTodo() {
    if (!tenantId) return;
    const [eR, tR, sR, acR, pR] = await Promise.all([
      fetch(`/api/certificacion/empresa?t=${tenantId}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/certificacion/token?t=${tenantId}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/certificacion/upload-set?t=${tenantId}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/certificacion/upload-ac?t=${tenantId}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/certificacion/crear-prueba?t=${tenantId}`).then((r) => r.json()).catch(() => null),
    ]);
    if (eR?.empresa) {
      setEmpresa(eR.empresa);
      setDireccion(eR.empresa.direccion); setTelefono(eR.empresa.telefono); setActividad(eR.empresa.actividadEconomica);
    }
    if (tR) { setTokenValido(tR.valido ?? null); setTokenExpira(tR.expira ?? null); }
    if (sR?.filas) setFilas(sR.filas);
    if (acR?.items) setAcItems(acR.items);
    if (pR?.items) setPruebas(pR.items);
    setCargando(false);
  }

  useEffect(() => { cargarTodo(); }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Paso 0 ──────────────────────────────────────────────────────
  async function guardarEmpresa() {
    setGuardandoEmpresa(true);
    try {
      const res = await fetch("/api/certificacion/empresa", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, direccion, telefono, actividadEconomica: actividad }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetch("/api/certificacion/iniciar", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId }),
      });
      setEmpresa(data.empresa);
      setPaso(1);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error guardando datos de empresa");
    } finally {
      setGuardandoEmpresa(false);
    }
  }

  // ── Paso 1 ──────────────────────────────────────────────────────
  async function obtenerToken() {
    setObteniendoToken(true);
    try {
      const res = await fetch("/api/certificacion/token", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTokenValido(true); setTokenExpira(data.expira);
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo obtener el token");
    } finally {
      setObteniendoToken(false);
    }
  }

  // ── Paso 2 ──────────────────────────────────────────────────────
  async function subirSet(file: File) {
    setSubiendoSet(true);
    try {
      const form = new FormData();
      form.set("tenantId", tenantId); form.set("excel", file);
      const res = await fetch("/api/certificacion/upload-set", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const mapa: Record<string, FilaSetPrueba> = {};
      for (const f of data.filas as FilaSetPrueba[]) mapa[f.encf] = f;
      setFilas(mapa);
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo subir el Excel");
    } finally {
      setSubiendoSet(false);
    }
  }

  async function enviarUnoPaso2(encf: string): Promise<string> {
    const res = await fetch("/api/certificacion/enviar", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId, encf }),
    });
    const data = await res.json();
    setLogEnvio((l) => [...l, res.ok ? `✅ ${encf} enviado (trackId ${data.trackId})` : `❌ ${encf}: ${data.error}`]);
    setFilas((f) => ({ ...f, [encf]: { ...f[encf], estadoEnvio: res.ok ? "enviado" : "error", trackId: data.trackId, error: data.error } }));
    return res.ok ? data.trackId : "";
  }

  async function esperarAceptado(encf: string, maxSeg: number): Promise<boolean> {
    const ini = Date.now();
    while (Date.now() - ini < maxSeg * 1000 && !cancelado.current) {
      await sleep(4000);
      try {
        const res = await fetch(`/api/certificacion/consultar?t=${tenantId}&encf=${encf}`);
        const data = await res.json();
        const est = String(data.estado ?? "").toLowerCase();
        setLogEnvio((l) => [...l, `… ${encf}: ${data.estado ?? "esperando"}`]);
        if (est.includes("aceptad")) return true;
        if (est.includes("rechazad")) return false;
      } catch { /* reintentar */ }
    }
    setLogEnvio((l) => [...l, `⚠ ${encf}: tiempo de espera agotado`]);
    return false;
  }

  async function enviarTodosPaso2() {
    setEnviandoTodos(true);
    setLogEnvio([]);
    const todas = Object.values(filas);

    // Compuerta: cualquier fila con eCFRef apuntando a otra fila del mismo
    // set debe esperar a que esa fila esté Aceptada antes de enviarse —
    // generaliza el caso E33/E34 que la DGII exige en el set de pruebas.
    const porENCF = new Map(todas.map((f) => [f.encf, f]));
    const dependientes: FilaSetPrueba[] = [];
    const independientes: FilaSetPrueba[] = [];
    const compuertas = new Set<string>();
    for (const f of todas) {
      if (f.eCFRef && porENCF.has(f.eCFRef)) {
        dependientes.push(f);
        compuertas.add(f.eCFRef);
      } else {
        independientes.push(f);
      }
    }

    for (const f of independientes) {
      if (cancelado.current) break;
      if (f.estadoEnvio === "enviado" || f.estadoEnvio === "aceptado") continue;
      await enviarUnoPaso2(f.encf);
      await sleep(1200);
    }

    if (dependientes.length > 0) {
      for (const compuertaEncf of compuertas) {
        setLogEnvio((l) => [...l, `Esperando aceptación de ${compuertaEncf}…`]);
        await esperarAceptado(compuertaEncf, 90);
      }
      for (const f of dependientes) {
        if (cancelado.current) break;
        if (f.estadoEnvio === "enviado" || f.estadoEnvio === "aceptado") continue;
        await enviarUnoPaso2(f.encf);
        await sleep(1200);
      }
    }

    setEnviandoTodos(false);
  }

  // ── Paso 3 ──────────────────────────────────────────────────────
  async function subirAC(file: File) {
    setSubiendoAC(true);
    try {
      const form = new FormData();
      form.set("tenantId", tenantId); form.set("excel", file);
      const res = await fetch("/api/certificacion/upload-ac", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const mapa: Record<string, ItemAC> = {};
      for (const it of data.items as ItemAC[]) mapa[it.encf] = it;
      setAcItems(mapa);
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo subir el Excel de AC");
    } finally {
      setSubiendoAC(false);
    }
  }

  async function enviarUnaAC(encf: string) {
    const edicion = edicionesAC[encf];
    const res = await fetch("/api/certificacion/ac-enviar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, encf, estado: edicion?.estado, motivoRechazo: edicion?.motivo }),
    });
    const data = await res.json();
    setAcItems((it) => ({ ...it, [encf]: { ...it[encf], enviado: res.ok, error: res.ok ? undefined : data.error, resultado: data.resultado?.mensaje } }));
  }

  async function enviarTodasAC() {
    setEnviandoAC(true);
    for (const item of Object.values(acItems)) {
      if (cancelado.current) break;
      if (item.enviado) continue;
      await enviarUnaAC(item.encf);
      await sleep(1200);
    }
    setEnviandoAC(false);
  }

  // ── Paso 4 ──────────────────────────────────────────────────────
  async function crearPrueba() {
    setErrorPrueba(""); setCreandoPrueba(true);
    try {
      const res = await fetch("/api/certificacion/crear-prueba", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, tipoECF: tipoPrueba, ...formPrueba }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPruebas((p) => ({ ...p, [data.eCF]: { id: data.eCF, tipoECF: tipoPrueba, eCF: data.eCF, fecha: "", descripcion: formPrueba.descripcion ?? "", montoTotal: Number(formPrueba.monto ?? 0), estadoEnvio: "enviado", trackId: data.trackId, creadoEn: new Date().toISOString() } }));
      setFormPrueba({});
    } catch (e) {
      setErrorPrueba(e instanceof Error ? e.message : "Error creando la prueba");
    } finally {
      setCreandoPrueba(false);
    }
  }

  // ── Paso 6 ──────────────────────────────────────────────────────
  async function finalizar() {
    setFinalizando(true);
    try {
      const res = await fetch("/api/certificacion/finalizar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, confirmoPasosPortal: confirmoPortal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = `/panel/${tenantId}`;
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo finalizar la certificación");
    } finally {
      setFinalizando(false);
    }
  }

  if (cargando) {
    return <main style={{ padding: 60, textAlign: "center", fontFamily: sans, color: "var(--c-text-3)" }}>Cargando asistente…</main>;
  }

  const totalPaso2 = Object.keys(filas).length;
  const enviadosPaso2 = Object.values(filas).filter((f) => f.estadoEnvio === "enviado" || f.estadoEnvio === "aceptado").length;
  const candidatosRFCE = Object.values(filas).filter((f) => f.tipoECF === "E32" && f.montoTotal < 250000 && (f.estadoEnvio === "enviado" || f.estadoEnvio === "aceptado"));
  const pruebasRFCE = Object.values(pruebas).filter((p) => p.tipoECF === "E32" && p.montoTotal < 250000 && p.estadoEnvio === "enviado");

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "32px 24px 80px", fontFamily: sans }}>
      <a href={`/panel/${tenantId}`} style={{ fontSize: 13, color: "var(--c-text-3)", display: "inline-block", marginBottom: 16 }}>
        ← Volver a mi cuenta
      </a>
      <h1 style={{ fontFamily: serif, fontSize: "1.7rem", marginBottom: 6 }}>Asistente de certificación DGII</h1>
      <p style={{ fontSize: 13, color: "var(--c-text-3)", marginBottom: 24 }}>
        Estos son los pasos técnicos que la DGII exige para certificarte como emisor de e-CF en su
        ambiente de pruebas (certecf). Puedes avanzar a tu ritmo — el progreso se guarda solo.
      </p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
        {PASOS.map((p) => (
          <button key={p.n} onClick={() => setPaso(p.n)} type="button" style={{
            padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: paso === p.n ? "var(--c-brand)" : "var(--c-bg)",
            color: paso === p.n ? "#fff" : "var(--c-text-3)",
            border: "1px solid var(--c-border)",
          }}>
            {p.n}. {p.t}
          </button>
        ))}
      </div>

      {paso === 0 && (
        <Card>
          <h2 style={{ fontFamily: serif, fontSize: "1.1rem", marginBottom: 4 }}>Paso 0 — Datos de tu empresa</h2>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 16 }}>
            El XSD del e-CF exige estos datos del emisor — no se pidieron antes en tu registro.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ fontSize: 12 }}>
              Dirección fiscal
              <input value={direccion} onChange={(e) => setDireccion(e.target.value)} style={{ display: "block", width: "100%", marginTop: 4, padding: "9px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
            </label>
            <label style={{ fontSize: 12 }}>
              Teléfono
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} style={{ display: "block", width: "100%", marginTop: 4, padding: "9px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
            </label>
            <label style={{ fontSize: 12 }}>
              Actividad económica
              <input value={actividad} onChange={(e) => setActividad(e.target.value)} placeholder="Ej. Venta al por menor de ferretería" style={{ display: "block", width: "100%", marginTop: 4, padding: "9px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
            </label>
          </div>
          <div style={{ marginTop: 16 }}>
            <Boton onClick={guardarEmpresa} disabled={guardandoEmpresa || !direccion.trim() || !actividad.trim()}>
              {guardandoEmpresa ? "Guardando…" : "Guardar y continuar →"}
            </Boton>
          </div>
        </Card>
      )}

      {paso === 1 && (
        <Card>
          <h2 style={{ fontFamily: serif, fontSize: "1.1rem", marginBottom: 4 }}>Paso 1 — Token de autenticación DGII</h2>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 16 }}>
            Firmamos automáticamente con tu certificado .p12 — no necesitas firmar nada a mano. El
            token dura aproximadamente 1 hora; lo renovamos solos cuando haga falta.
          </p>
          {tokenValido && tokenExpira && (
            <p style={{ fontSize: 12, color: "#166534", marginBottom: 12 }}>✓ Token vigente hasta {new Date(tokenExpira).toLocaleString("es-DO")}</p>
          )}
          <Boton onClick={obtenerToken} disabled={obteniendoToken || !empresa}>
            {obteniendoToken ? "Obteniendo…" : tokenValido ? "Renovar token" : "Obtener token"}
          </Boton>
          {!empresa && <p style={{ fontSize: 12, color: "#991b1b", marginTop: 8 }}>Completa primero el Paso 0.</p>}
        </Card>
      )}

      {paso === 2 && (
        <Card>
          <h2 style={{ fontFamily: serif, fontSize: "1.1rem", marginBottom: 4 }}>Paso 2 — Set de pruebas (25 comprobantes)</h2>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 16 }}>
            Sube el Excel que la DGII te asignó para certificarte. Lo leemos, firmamos cada
            comprobante con tu certificado y los enviamos en el orden correcto (algunos dependen de
            que otro se haya Aceptado primero — eso lo manejamos solos).
          </p>
          <input type="file" accept=".xlsx,.xls" onChange={(e) => e.target.files?.[0] && subirSet(e.target.files[0])} disabled={subiendoSet} />
          {totalPaso2 > 0 && (
            <>
              <div style={{ margin: "16px 0", fontSize: 13 }}>
                {enviadosPaso2} / {totalPaso2} enviados
              </div>
              <Boton onClick={enviarTodosPaso2} disabled={enviandoTodos || enviadosPaso2 === totalPaso2}>
                {enviandoTodos ? "Enviando…" : "▶ Enviar los 25"}
              </Boton>
              <div style={{ marginTop: 16, maxHeight: 320, overflowY: "auto", border: "1px solid var(--c-border)", borderRadius: 6 }}>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <thead><tr style={{ background: "var(--c-bg)" }}>
                    <th style={{ textAlign: "left", padding: 8 }}>eNCF</th><th style={{ textAlign: "left", padding: 8 }}>Tipo</th>
                    <th style={{ textAlign: "left", padding: 8 }}>Estado</th><th style={{ textAlign: "left", padding: 8 }}>DGII</th>
                  </tr></thead>
                  <tbody>
                    {Object.values(filas).map((f) => (
                      <tr key={f.encf} style={{ borderTop: "1px solid var(--c-border)" }}>
                        <td style={{ padding: 8 }}>{f.encf}</td><td style={{ padding: 8 }}>{f.tipoECF}</td>
                        <td style={{ padding: 8 }}><Estado estado={f.estadoEnvio} /></td>
                        <td style={{ padding: 8, color: "var(--c-text-3)" }}>{f.estadoDGII ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {logEnvio.length > 0 && (
                <pre style={{ marginTop: 12, fontSize: 11, background: "var(--c-bg)", padding: 10, borderRadius: 6, maxHeight: 160, overflowY: "auto" }}>
                  {logEnvio.join("\n")}
                </pre>
              )}
            </>
          )}
        </Card>
      )}

      {paso === 3 && (
        <Card>
          <h2 style={{ fontFamily: serif, fontSize: "1.1rem", marginBottom: 4 }}>Paso 3 — Aprobaciones comerciales</h2>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 16 }}>
            Descarga el Excel de Aprobación Comercial desde el portal de la DGII (después de que
            acepten tu set de pruebas) y súbelo aquí. Solo E31, E33, E34, E44 y E45 necesitan esto.
          </p>
          <input type="file" accept=".xlsx,.xls" onChange={(e) => e.target.files?.[0] && subirAC(e.target.files[0])} disabled={subiendoAC} />
          {Object.keys(acItems).length > 0 && (
            <>
              <div style={{ margin: "16px 0" }}>
                <Boton onClick={enviarTodasAC} disabled={enviandoAC}>
                  {enviandoAC ? "Enviando…" : `▶ Enviar todas (${Object.keys(acItems).length})`}
                </Boton>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.values(acItems).map((it) => (
                  <div key={it.encf} style={{ border: "1px solid var(--c-border)", borderRadius: 6, padding: 10, fontSize: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <strong>{it.encf}</strong>
                      <Estado estado={it.enviado ? "aceptado" : it.error ? "error" : "pendiente"} />
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <select
                        value={edicionesAC[it.encf]?.estado ?? it.estado}
                        onChange={(e) => setEdicionesAC((ed) => ({ ...ed, [it.encf]: { estado: Number(e.target.value) as 1 | 2, motivo: ed[it.encf]?.motivo ?? "" } }))}
                        style={{ fontSize: 12, padding: 4 }}
                      >
                        <option value={1}>Aceptado</option>
                        <option value={2}>Rechazado</option>
                      </select>
                      {(edicionesAC[it.encf]?.estado ?? it.estado) === 2 && (
                        <input placeholder="Motivo de rechazo" value={edicionesAC[it.encf]?.motivo ?? it.motivoRechazo ?? ""} onChange={(e) => setEdicionesAC((ed) => ({ ...ed, [it.encf]: { estado: 2, motivo: e.target.value } }))} style={{ fontSize: 12, padding: 4, flex: 1 }} />
                      )}
                    </div>
                    {it.resultado && <div style={{ marginTop: 6, color: "var(--c-text-3)" }}>{it.resultado}</div>}
                    {it.error && <div style={{ marginTop: 6, color: "#991b1b" }}>{it.error}</div>}
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {paso === 4 && (
        <Card>
          <h2 style={{ fontFamily: serif, fontSize: "1.1rem", marginBottom: 4 }}>Paso 4 — Pruebas interactivas</h2>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 16 }}>
            La DGII también pide crear comprobantes "a mano" (no del Excel) para simular operación
            real. Crea los que tu certificación requiera — la DGII te dirá cuántos de cada tipo.
          </p>
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <select value={tipoPrueba} onChange={(e) => { setTipoPrueba(e.target.value as TipoECF); setFormPrueba({}); }} style={{ fontSize: 13, padding: 8 }}>
              {(["E32", "E33", "E34", "E41", "E43", "E44", "E45", "E46", "E47"] as TipoECF[]).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 420 }}>
            <input placeholder="Descripción" value={formPrueba.descripcion ?? ""} onChange={(e) => setFormPrueba((f) => ({ ...f, descripcion: e.target.value }))} style={{ padding: 8, fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4 }} />
            <input placeholder="Monto (sin ITBIS)" type="number" value={formPrueba.monto ?? ""} onChange={(e) => setFormPrueba((f) => ({ ...f, monto: e.target.value }))} style={{ padding: 8, fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4 }} />

            {["E32", "E41", "E44", "E45"].includes(tipoPrueba) && (
              <select value={formPrueba.itbis ?? "0.18"} onChange={(e) => setFormPrueba((f) => ({ ...f, itbis: e.target.value }))} style={{ padding: 8, fontSize: 13 }}>
                <option value="0.18">ITBIS 18%</option><option value="0.16">ITBIS 16%</option><option value="0">Exento</option>
              </select>
            )}

            {tipoPrueba === "E41" && (
              <>
                <input placeholder="RNC del proveedor" value={formPrueba.rncProveedor ?? ""} onChange={(e) => setFormPrueba((f) => ({ ...f, rncProveedor: e.target.value }))} style={{ padding: 8, fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4 }} />
                <input placeholder="Nombre del proveedor" value={formPrueba.nombreProveedor ?? ""} onChange={(e) => setFormPrueba((f) => ({ ...f, nombreProveedor: e.target.value }))} style={{ padding: 8, fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4 }} />
              </>
            )}

            {["E32", "E44", "E45", "E46"].includes(tipoPrueba) && (
              <>
                <input placeholder="RNC comprador (opcional)" value={formPrueba.rncComprador ?? ""} onChange={(e) => setFormPrueba((f) => ({ ...f, rncComprador: e.target.value }))} style={{ padding: 8, fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4 }} />
                <input placeholder="Nombre comprador (opcional)" value={formPrueba.nombreComprador ?? ""} onChange={(e) => setFormPrueba((f) => ({ ...f, nombreComprador: e.target.value }))} style={{ padding: 8, fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4 }} />
              </>
            )}

            {(tipoPrueba === "E46" || tipoPrueba === "E47") && (
              <>
                {tipoPrueba === "E46" && (
                  <label style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="checkbox" checked={formPrueba.esExtranjero === "true"} onChange={(e) => setFormPrueba((f) => ({ ...f, esExtranjero: e.target.checked ? "true" : "" }))} />
                    Comprador extranjero
                  </label>
                )}
                {(tipoPrueba === "E47" || formPrueba.esExtranjero === "true") && (
                  <>
                    <input placeholder="ID extranjero" value={formPrueba.idExtranjero ?? ""} onChange={(e) => setFormPrueba((f) => ({ ...f, idExtranjero: e.target.value }))} style={{ padding: 8, fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4 }} />
                    <input placeholder="Nombre extranjero" value={formPrueba.nombreExtranjero ?? ""} onChange={(e) => setFormPrueba((f) => ({ ...f, nombreExtranjero: e.target.value }))} style={{ padding: 8, fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4 }} />
                  </>
                )}
              </>
            )}

            {["E33", "E34"].includes(tipoPrueba) && (
              <>
                <select value={formPrueba.eCFRef ?? ""} onChange={(e) => setFormPrueba((f) => ({ ...f, eCFRef: e.target.value }))} style={{ padding: 8, fontSize: 13 }}>
                  <option value="">eNCF que modifica…</option>
                  {Object.keys(filas).map((encf) => <option key={encf} value={encf}>{encf}</option>)}
                </select>
                <input placeholder="Motivo" value={formPrueba.motivoNota ?? ""} onChange={(e) => setFormPrueba((f) => ({ ...f, motivoNota: e.target.value }))} style={{ padding: 8, fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4 }} />
              </>
            )}

            {errorPrueba && <div style={{ fontSize: 12, color: "#991b1b" }}>{errorPrueba}</div>}
            <Boton onClick={crearPrueba} disabled={creandoPrueba}>
              {creandoPrueba ? "Creando…" : `Crear y enviar ${tipoPrueba}`}
            </Boton>
          </div>

          {Object.keys(pruebas).length > 0 && (
            <div style={{ marginTop: 20 }}>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "var(--c-bg)" }}>
                  <th style={{ textAlign: "left", padding: 8 }}>eNCF</th><th style={{ textAlign: "left", padding: 8 }}>Tipo</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Descripción</th><th style={{ textAlign: "left", padding: 8 }}>Estado</th>
                </tr></thead>
                <tbody>
                  {Object.values(pruebas).map((p) => (
                    <tr key={p.id} style={{ borderTop: "1px solid var(--c-border)" }}>
                      <td style={{ padding: 8 }}>{p.eCF}</td><td style={{ padding: 8 }}>{p.tipoECF}</td>
                      <td style={{ padding: 8 }}>{p.descripcion}</td><td style={{ padding: 8 }}><Estado estado={p.estadoEnvio} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {paso === 5 && (
        <Card>
          <h2 style={{ fontFamily: serif, fontSize: "1.1rem", marginBottom: 4 }}>Paso 5 — XMLs para subir al portal</h2>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 16 }}>
            Los e-CF de consumo menores a RD$250,000 (E32) se envían como resumen (RFCE) — la DGII
            además te pide subir el XML completo firmado a mano en su portal. Descárgalos aquí.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...candidatosRFCE.map((f) => f.encf), ...pruebasRFCE.map((p) => p.eCF)].map((encf) => (
              <a key={encf} href={`/api/certificacion/descargar-xml?t=${tenantId}&encf=${encf}`} style={{ fontSize: 13, color: "var(--c-brand)", fontWeight: 600 }}>
                ⬇ {encf}.xml
              </a>
            ))}
            {candidatosRFCE.length === 0 && pruebasRFCE.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--c-text-3)" }}>Todavía no hay e-CF RFCE enviados.</p>
            )}
          </div>
        </Card>
      )}

      {paso === 6 && (
        <Card>
          <h2 style={{ fontFamily: serif, fontSize: "1.1rem", marginBottom: 4 }}>Paso 6 — Cerrar la certificación</h2>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 16 }}>
            Los últimos pasos (subir las representaciones impresas y la validación final) se hacen
            directamente en el portal de la DGII — Facturacon no puede automatizarlos. Cuando los
            hayas completado ahí, confirma aquí para activar tu cuenta.
          </p>
          <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 16 }}>
            <input type="checkbox" checked={confirmoPortal} onChange={(e) => setConfirmoPortal(e.target.checked)} style={{ marginTop: 2 }} />
            Confirmo que subí las representaciones impresas y completé la validación final en el
            portal de la DGII.
          </label>
          <Boton onClick={finalizar} disabled={!confirmoPortal || finalizando}>
            {finalizando ? "Activando…" : "Finalizar certificación →"}
          </Boton>
        </Card>
      )}
    </main>
  );
}
