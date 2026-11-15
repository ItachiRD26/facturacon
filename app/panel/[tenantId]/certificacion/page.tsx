"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { TipoECF } from "@/types";
import type { EmpresaConfig } from "@/types/tenant";
import type { FilaSetPrueba, ItemAC, FacturaPrueba } from "@/lib/certificacion/tipos";
import ScreenshotPlaceholder from "@/components/marketing/screenshot-placeholder";
import VideoPlaceholder from "@/components/marketing/video-placeholder";
import InfoTooltip from "@/components/panel/info-tooltip";

const sans  = "var(--font-sans)";
const serif = "var(--font-serif)";
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Paso = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// "dgii" muestra al cliente qué pasos OFICIALES de la DGII cubre cada Paso
// nuestro — la DGII numera el proceso completo en 15 pasos, pero varios son
// trámites de un clic (firmar la semilla) o pasos que hacemos automáticos
// por dentro, así que aquí quedan agrupados.
const PASOS: { n: Paso; t: string; dgii: string }[] = [
  { n: 0, t: "Antes de empezar", dgii: "previo" },
  { n: 1, t: "Token DGII", dgii: "pasos 1-3" },
  { n: 2, t: "Set de pruebas", dgii: "paso 4" },
  { n: 3, t: "Aprobaciones comerciales", dgii: "pasos 5-7" },
  { n: 4, t: "Pruebas interactivas", dgii: "pasos 8-10" },
  { n: 5, t: "XMLs para el portal", dgii: "paso 11" },
  { n: 6, t: "Cerrar certificación", dgii: "pasos 12-15" },
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

// Botón de subida de archivo con ícono visible — un <input type="file">
// pelado se confunde con texto normal, esto deja claro que ahí se hace clic.
// También acepta arrastrar y soltar el archivo encima. `grande` cambia a una
// zona más grande y notoria (usada en la postulación, donde subir el XML es
// obligatorio antes de poder seguir) en vez del botón compacto de siempre
// (usado en los Excel de los Pasos 2/3, donde es uno más entre varios campos).
function SubidaArchivo({ onFile, cargando, etiqueta, nombreArchivo, accept = ".xlsx,.xls", grande = false }: {
  onFile: (f: File) => void; cargando: boolean; etiqueta: string; nombreArchivo?: string; accept?: string; grande?: boolean;
}) {
  const [arrastrando, setArrastrando] = useState(false);

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); if (!cargando) setArrastrando(true); }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => {
        e.preventDefault(); setArrastrando(false);
        const file = e.dataTransfer.files?.[0];
        if (file && !cargando) onFile(file);
      }}
      style={{
        display: "flex", flexDirection: grande ? "column" : "row", alignItems: "center", justifyContent: "center",
        gap: grande ? 4 : 10, padding: grande ? "28px 16px" : "10px 16px", textAlign: "center",
        border: `${grande ? 2 : 1.5}px dashed var(--c-brand)`, borderRadius: 8,
        cursor: cargando ? "not-allowed" : "pointer",
        background: arrastrando ? "var(--c-brand)" : "var(--c-brand-bg)",
        color: arrastrando ? "#fff" : "var(--c-brand)",
        fontSize: 13, fontWeight: 600, transition: "background 0.12s, color 0.12s",
        width: grande ? "100%" : "fit-content",
      }}
    >
      <span style={{ fontSize: grande ? 28 : 18 }}>📄</span>
      <span>
        {cargando ? "Subiendo…" : nombreArchivo ? `✓ ${nombreArchivo} — cambiar archivo` : arrastrando ? "Suelta el archivo aquí" : etiqueta}
      </span>
      {grande && !nombreArchivo && !cargando && !arrastrando && (
        <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>o arrastra y suelta el archivo aquí</span>
      )}
      <input type="file" accept={accept} disabled={cargando} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} style={{ display: "none" }} />
    </label>
  );
}

// Botón para saltar al siguiente Paso una vez el actual quedó completo — el
// cliente no tiene que adivinar que debe volver a la barra de arriba.
function SiguientePaso({ n, onClick }: { n: Paso; onClick: () => void }) {
  const info = PASOS.find((p) => p.n === n);
  return (
    <div style={{ marginTop: 20 }}>
      <Boton onClick={onClick}>Siguiente: {info?.t} →</Boton>
    </div>
  );
}

const ESTADO_COLOR: Record<string, string> = {
  pendiente: "var(--c-text-3)", enviando: "#92400e", enviado: "#1d4ed8",
  aceptado: "#166534", rechazado: "#991b1b", error: "#991b1b",
};

function Estado({ estado }: { estado?: string }) {
  return <span style={{ fontSize: 11, fontWeight: 700, color: ESTADO_COLOR[estado ?? "pendiente"] }}>{estado ?? "pendiente"}</span>;
}

// Título de cada Paso + insignia con a cuáles de los 15 pasos oficiales de
// la DGII corresponde — para que el cliente nunca se quede preguntando "¿y
// esto qué tiene que ver con lo que dice el portal de la DGII?". `ayuda`
// opcional agrega el botón "?" junto al título, para el término técnico más
// relevante de ese paso (ej. "¿qué es un token?").
function PasoTitulo({ n, children, ayuda }: { n: Paso; children: React.ReactNode; ayuda?: string }) {
  const info = PASOS.find((p) => p.n === n);
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
      <h2 style={{ fontFamily: serif, fontSize: "1.1rem", margin: 0 }}>{children}</h2>
      {ayuda && <InfoTooltip texto={ayuda} />}
      {info && (
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--c-text-3)", background: "var(--c-bg)", padding: "2px 8px", borderRadius: 999, border: "1px solid var(--c-border)" }}>
          DGII: {info.dgii}
        </span>
      )}
    </div>
  );
}

// Etiqueta de campo/término con su propio "?" al lado — para explicar una
// palabra puntual (ej. "e-NCF") sin tener que meter un párrafo entero en el
// texto general del paso.
function Etiqueta({ children, ayuda }: { children: React.ReactNode; ayuda: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      {children}
      <InfoTooltip texto={ayuda} />
    </span>
  );
}

// Caja "Tú haces / Nosotros hacemos" — clave para que el cliente sepa de un
// vistazo qué de un paso le toca a él (descargar/subir algo en el portal de
// la DGII) y qué hace Facturacon solo por dentro (firmar, armar XML, enviar).
function TuYNosotros({ tu, nosotros }: { tu: string; nosotros: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
      <div style={{ padding: "10px 12px", background: "var(--c-yellow-bg)", border: "1px solid var(--c-yellow-border)", borderRadius: 8, fontSize: 12 }}>
        <strong>Tú haces:</strong> {tu}
      </div>
      <div style={{ padding: "10px 12px", background: "var(--c-brand-bg)", border: "1px solid var(--c-brand-border)", borderRadius: 8, fontSize: 12 }}>
        <strong>Facturacon hace:</strong> {nosotros}
      </div>
    </div>
  );
}

const EQUIVALENCIA = [
  { rango: "1-3", que: "Descargar la semilla, firmarla, subirla y obtener el token", quien: "Facturacon (automático, con tu .p12)" },
  { rango: "4", que: "Enviar los 25 comprobantes de prueba", quien: "Facturacon" },
  { rango: "5-7", que: "Descargar/subir el Excel de Aprobación Comercial y enviarlas", quien: "Tú descargas, Facturacon envía" },
  { rango: "8-10", que: "Crear comprobantes de prueba adicionales (simulación)", quien: "Tú completas el formulario, Facturacon firma y envía" },
  { rango: "11", que: "Subir al portal los XML de los comprobantes de consumo menores", quien: "Facturacon genera el XML, tú lo subes al portal" },
  { rango: "12-15", que: "Subir representaciones impresas y validación final", quien: "100% manual en el portal de la DGII" },
];

function EquivalenciaPasos() {
  const [abierto, setAbierto] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      <button onClick={() => setAbierto((a) => !a)} type="button" style={{
        fontSize: 12, fontWeight: 700, color: "var(--c-brand)", background: "none", border: "none", cursor: "pointer", padding: 0,
      }}>
        {abierto ? "▾" : "▸"} ¿Qué hace Facturacon por mí y qué me toca a mí? (los 15 pasos oficiales de la DGII)
      </button>
      {abierto && (
        <div style={{ marginTop: 10, border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "var(--c-bg)" }}>
              <th style={{ textAlign: "left", padding: 8 }}>Pasos DGII</th>
              <th style={{ textAlign: "left", padding: 8 }}>Qué es</th>
              <th style={{ textAlign: "left", padding: 8 }}>Quién lo hace</th>
            </tr></thead>
            <tbody>
              {EQUIVALENCIA.map((e) => (
                <tr key={e.rango} style={{ borderTop: "1px solid var(--c-border)" }}>
                  <td style={{ padding: 8, fontWeight: 700 }}>{e.rango}</td>
                  <td style={{ padding: 8 }}>{e.que}</td>
                  <td style={{ padding: 8, color: "var(--c-text-3)" }}>{e.quien}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
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
  const [ofvIniciada, setOfvIniciada] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [urlCopiada, setUrlCopiada] = useState<string | null>(null);
  const [firmandoPostulacion, setFirmandoPostulacion] = useState(false);
  const [nombreArchivoPostulacion, setNombreArchivoPostulacion] = useState("");
  const [errorPostulacion, setErrorPostulacion] = useState("");

  // Paso 1
  const [tokenValido, setTokenValido] = useState<boolean | null>(null);
  const [tokenExpira, setTokenExpira] = useState<string | null>(null);
  const [obteniendoToken, setObteniendoToken] = useState(false);

  // Paso 2
  const [filas, setFilas] = useState<Record<string, FilaSetPrueba>>({});
  const [subiendoSet, setSubiendoSet] = useState(false);
  const [nombreArchivoSet, setNombreArchivoSet] = useState("");
  const [enviandoTodos, setEnviandoTodos] = useState(false);
  const [logEnvio, setLogEnvio] = useState<string[]>([]);

  // Paso 3
  const [acItems, setAcItems] = useState<Record<string, ItemAC>>({});
  const [subiendoAC, setSubiendoAC] = useState(false);
  const [nombreArchivoAC, setNombreArchivoAC] = useState("");
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
    const [eR, tR, sR, acR, pR, iR] = await Promise.all([
      fetch(`/api/certificacion/empresa?t=${tenantId}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/certificacion/token?t=${tenantId}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/certificacion/upload-set?t=${tenantId}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/certificacion/upload-ac?t=${tenantId}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/certificacion/crear-prueba?t=${tenantId}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/certificacion/iniciar?t=${tenantId}`).then((r) => r.json()).catch(() => null),
    ]);
    if (eR?.empresa) {
      setEmpresa(eR.empresa);
      setDireccion(eR.empresa.direccion); setTelefono(eR.empresa.telefono); setActividad(eR.empresa.actividadEconomica);
    }
    if (eR?.slug) setSlug(eR.slug);
    if (tR) { setTokenValido(tR.valido ?? null); setTokenExpira(tR.expira ?? null); }
    if (sR?.filas) setFilas(sR.filas);
    if (acR?.items) setAcItems(acR.items);
    if (pR?.items) setPruebas(pR.items);
    if (iR?.ofvIniciada) setOfvIniciada(true);
    setCargando(false);
  }

  useEffect(() => { cargarTodo(); }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Paso 0 ──────────────────────────────────────────────────────
  async function guardarEmpresa() {
    if (!ofvIniciada) return;
    setGuardandoEmpresa(true);
    try {
      const res = await fetch("/api/certificacion/empresa", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, direccion, telefono, actividadEconomica: actividad }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetch("/api/certificacion/iniciar", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId, ofvIniciada: true }),
      });
      setEmpresa(data.empresa);
      setPaso(1);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error guardando datos de empresa");
    } finally {
      setGuardandoEmpresa(false);
    }
  }

  async function copiarUrl(label: string, valor: string) {
    try {
      await navigator.clipboard.writeText(valor);
      setUrlCopiada(label);
      setTimeout(() => setUrlCopiada((actual) => (actual === label ? null : actual)), 1500);
    } catch {
      alert("No se pudo copiar automáticamente — selecciona el texto del campo y cópialo manualmente.");
    }
  }

  async function firmarPostulacion(file: File) {
    setFirmandoPostulacion(true); setErrorPostulacion("");
    try {
      const form = new FormData();
      form.set("tenantId", tenantId); form.set("xml", file);
      const res = await fetch("/api/certificacion/firmar-postulacion", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo firmar el XML");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `postulacion-firmada-${tenantId}.xml`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setNombreArchivoPostulacion(file.name);
    } catch (e) {
      setErrorPostulacion(e instanceof Error ? e.message : "No se pudo firmar el XML");
    } finally {
      setFirmandoPostulacion(false);
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
      setPaso(2);
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
      setNombreArchivoSet(file.name);
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
      setNombreArchivoAC(file.name);
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

  // Una sola frase, calculada del progreso real, para que el usuario nunca
  // tenga que mirar la tabla de pasos y adivinar qué le toca hacer ahora.
  function proximoPaso(): { texto: string; ir: Paso } {
    if (!ofvIniciada || !empresa) {
      return { texto: "Confirma que ya iniciaste tu solicitud en la Oficina Virtual (OFV) de la DGII y completa los datos de tu empresa.", ir: 0 };
    }
    if (!tokenValido) {
      return { texto: "Obtén tu token de autenticación contra la DGII — es un solo clic.", ir: 1 };
    }
    if (totalPaso2 === 0) {
      return { texto: "Sube el Excel con los 25 comprobantes de prueba que te dio la DGII al iniciar tu solicitud.", ir: 2 };
    }
    if (enviadosPaso2 < totalPaso2) {
      return { texto: `Te faltan ${totalPaso2 - enviadosPaso2} de los 25 comprobantes de prueba por enviar — dale clic en "Enviar los 25".`, ir: 2 };
    }
    if (Object.keys(acItems).length > 0 && !Object.values(acItems).every((it) => it.enviado)) {
      return { texto: "Envía las Aprobaciones Comerciales pendientes del Paso 3.", ir: 3 };
    }
    if (Object.keys(acItems).length === 0) {
      return { texto: "Si la DGII ya te habilitó el Excel de Aprobación Comercial en el portal, súbelo en el Paso 3. Si tu certificación no lo requiere, puedes seguir directo al Paso 4.", ir: 3 };
    }
    if (Object.keys(pruebas).length === 0) {
      return { texto: "Crea las pruebas interactivas que la DGII te pida en el Paso 4.", ir: 4 };
    }
    if (candidatosRFCE.length > 0 || pruebasRFCE.length > 0) {
      return { texto: "Descarga los XML pendientes del Paso 5 y súbelos al portal de la DGII.", ir: 5 };
    }
    if (!confirmoPortal) {
      return { texto: "Sube las representaciones impresas y haz la validación final en el portal de la DGII, luego confirma en el Paso 6 para activar tu cuenta.", ir: 6 };
    }
    return { texto: "Todo listo — dale clic en \"Finalizar certificación\" en el Paso 6.", ir: 6 };
  }
  const siguiente = proximoPaso();

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "32px 24px 80px", fontFamily: sans }}>
      <a href={`/panel/${tenantId}`} style={{ fontSize: 13, color: "var(--c-text-3)", display: "inline-block", marginBottom: 16 }}>
        ← Volver a mi cuenta
      </a>
      <h1 style={{ fontFamily: serif, fontSize: "1.7rem", marginBottom: 6 }}>Asistente de certificación DGII</h1>
      <p style={{ fontSize: 13, color: "var(--c-text-3)", marginBottom: 16 }}>
        Estos son los pasos técnicos que la DGII exige para certificarte como emisor de e-CF en su
        ambiente de pruebas (certecf). Puedes avanzar a tu ritmo — el progreso se guarda solo.
      </p>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
        padding: "12px 16px", background: "var(--c-brand-bg)", border: "1px solid var(--c-brand-border)",
        borderRadius: 8, marginBottom: 20,
      }}>
        <div style={{ fontSize: 13 }}>
          <strong>Qué hacer ahora:</strong> {siguiente.texto}
        </div>
        {siguiente.ir !== paso && (
          <Boton onClick={() => setPaso(siguiente.ir)}>Ir ahora →</Boton>
        )}
      </div>

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

      <EquivalenciaPasos />

      {paso === 0 && (
        <Card>
          <PasoTitulo n={0} ayuda="La Oficina Virtual (OFV) es el portal donde la DGII gestiona tu cuenta como contribuyente — ahí es donde formalmente pides convertirte en Emisor Electrónico. Facturacon no puede hacer este trámite por ti, es directo con la DGII.">
            Antes de empezar — inicia la solicitud en la OFV
          </PasoTitulo>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 16 }}>
            Este asistente solo funciona si tu empresa ya inició su solicitud de certificación
            como Emisor Electrónico dentro de la Oficina Virtual (OFV) de la DGII. Si todavía no lo
            has hecho, hazlo primero — si entras directo a los pasos técnicos de aquí sin haberlo
            hecho, la DGII no va a reconocer tu RNC y todo va a fallar.
          </p>
          <TuYNosotros tu="Iniciar la solicitud de certificación dentro de la OFV de tu empresa." nosotros="Todo lo técnico de ahí en adelante: firmar, armar y enviar cada comprobante." />
          {/* eslint-disable-next-line @next/next/no-img-element -- captura estática en /public, no requiere optimización de Next/Image */}
          <img
            src="/certificacion/antes-de-empezar.webp" alt="Dónde iniciar la solicitud en la OFV: Solicitudes → Solicitud para ser Emisor Electrónico"
            style={{ width: "100%", borderRadius: 10, border: "1px solid var(--c-border)", boxShadow: "0 12px 30px rgba(17,20,57,0.10)" }}
          />
          <a
            href="https://www.dgii.gov.do" target="_blank" rel="noopener noreferrer"
            style={{
              marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              padding: "10px 14px", background: "var(--c-bg)", border: "1px solid var(--c-border)",
              borderRadius: 8, fontSize: 12, textDecoration: "none", color: "var(--c-text-2)",
            }}
          >
            <span>Abrir el sitio de la DGII — busca &quot;Oficina Virtual&quot; para iniciar sesión y hacer la solicitud</span>
            <span style={{ color: "var(--c-brand)", fontWeight: 700, flexShrink: 0 }}>Abrir →</span>
          </a>
          <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "flex-start", marginTop: 16, marginBottom: 4 }}>
            <input type="checkbox" checked={ofvIniciada} onChange={(e) => setOfvIniciada(e.target.checked)} style={{ marginTop: 2 }} />
            Confirmo que ya inicié la solicitud de certificación en la OFV de mi empresa.
          </label>

          <div style={{ height: 1, background: "var(--c-border)", margin: "20px 0" }} />

          <h2 style={{ fontFamily: serif, fontSize: "1.05rem", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            Datos de tu empresa
            <InfoTooltip texto="XSD es el formato técnico que define cómo debe verse cada comprobante electrónico — la DGII exige estos datos (dirección, teléfono, actividad económica) dentro de ese formato, y no te los pedimos antes porque no hacían falta para el resto del sistema." />
          </h2>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 16 }}>
            La DGII exige estos datos del emisor en cada comprobante — no se pidieron antes en tu registro.
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
        </Card>
      )}

      {paso === 0 && (
        <Card>
          <h2 style={{ fontFamily: serif, fontSize: "1.05rem", marginBottom: 4, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            Formulario de postulación de la OFV: URLs del software y firma del XML
            <InfoTooltip texto="Al declarar tu software como 'Propio' en la OFV, la DGII te pide registrar dónde viven los servicios de tu sistema (para poder comunicarse con él en el futuro) y un archivo de postulación firmado con tu certificado — para comprobar que de verdad eres tú quien lo está pidiendo." />
          </h2>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 16 }}>
            Dentro de la OFV, al declarar tu software como &quot;Propio&quot;, te van a pedir 3 URLs
            y un archivo de postulación firmado. Esto es lo que va en cada campo.
          </p>

          {slug ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {[
                { label: "URL de recepción", ruta: "/fe/recepcion/api/ecf" },
                { label: "URL de aprobación comercial", ruta: "/fe/aprobacioncomercial/api/ecf" },
                { label: "URL de autenticación", ruta: "/fe/autenticacion/api/[semilla|validacioncertificado]" },
              ].map((u) => {
                const valor = `https://${slug}.${ROOT_DOMAIN}${u.ruta}`;
                return (
                  <div key={u.label}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text-3)", textTransform: "uppercase", marginBottom: 3 }}>{u.label}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input readOnly value={valor} onFocus={(e) => e.target.select()}
                        style={{ flex: 1, padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 12, fontFamily: "var(--font-mono)", background: "var(--c-bg)" }} />
                      <Boton variante="secundario" onClick={() => copiarUrl(u.label, valor)}>
                        {urlCopiada === u.label ? "✓ Copiado" : "Copiar"}
                      </Boton>
                    </div>
                  </div>
                );
              })}
              <p style={{ fontSize: 11, color: "var(--c-text-4)", marginTop: 2 }}>
                Es una URL fija y opaca, propia de tu empresa — no incluye tu RNC ni tu nombre comercial.
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 16 }}>Cargando tu URL…</p>
          )}

          <div style={{ height: 1, background: "var(--c-border)", margin: "16px 0" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Firmar el archivo de postulación</div>
            <span style={{
              fontSize: 10, fontWeight: 700, color: "#991b1b", background: "#fef2f2",
              border: "1px solid #fecaca", padding: "2px 8px", borderRadius: 999, textTransform: "uppercase",
            }}>
              Obligatorio
            </span>
          </div>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 12 }}>
            Sin este paso la DGII no puede procesar tu postulación — son 3 partes:
          </p>
          <ol style={{ fontSize: 12, color: "var(--c-text-3)", margin: "0 0 14px", paddingLeft: 18, lineHeight: 1.7 }}>
            <li><strong style={{ color: "var(--c-text-1)" }}>Descarga</strong> el XML de postulación desde la OFV.</li>
            <li><strong style={{ color: "var(--c-text-1)" }}>Súbelo abajo</strong> — lo firmamos nosotros con tu certificado, automáticamente.</li>
            <li><strong style={{ color: "var(--c-text-1)" }}>Descarga el archivo firmado</strong> (se descarga solo al terminar) y súbelo de vuelta a la OFV para que la DGII lo reciba.</li>
          </ol>
          <SubidaArchivo
            onFile={firmarPostulacion} cargando={firmandoPostulacion} accept=".xml" grande
            etiqueta="Subir XML de postulación para firmar" nombreArchivo={nombreArchivoPostulacion}
          />
          {errorPostulacion && <p style={{ fontSize: 12, color: "#991b1b", marginTop: 8 }}>{errorPostulacion}</p>}
          {nombreArchivoPostulacion && !firmandoPostulacion && !errorPostulacion && (
            <div style={{ marginTop: 10, padding: "10px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, fontSize: 12, color: "#166534" }}>
              ✓ Firmado y descargado a tu computadora — el último paso es subir ese archivo firmado a
              la OFV para que quede enviado a la DGII.
            </div>
          )}

          <div style={{ height: 1, background: "var(--c-border)", margin: "20px 0" }} />

          <Boton onClick={guardarEmpresa} disabled={guardandoEmpresa || !direccion.trim() || !actividad.trim() || !ofvIniciada}>
            {guardandoEmpresa ? "Guardando…" : "Guardar y continuar →"}
          </Boton>
          {!ofvIniciada && <p style={{ fontSize: 12, color: "#991b1b", marginTop: 8 }}>Confirma primero que iniciaste la solicitud en la OFV, arriba.</p>}
          {ofvIniciada && (!direccion.trim() || !actividad.trim()) && (
            <p style={{ fontSize: 12, color: "#991b1b", marginTop: 8 }}>Completa primero los datos de tu empresa, arriba.</p>
          )}
        </Card>
      )}

      {paso === 1 && (
        <Card>
          <PasoTitulo n={1} ayuda="Un token es como una 'llave temporal' que te deja hablar con los sistemas de la DGII durante un rato — sin él, ningún envío funciona. Lo pedimos y renovamos nosotros automáticamente, no tienes que hacer nada manual con esto.">
            Paso 1 — Token de autenticación DGII
          </PasoTitulo>
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
          <PasoTitulo n={2} ayuda="Un e-NCF (o eNCF) es el número único de cada comprobante fiscal electrónico — funciona como el número de factura de siempre, pero validado y registrado por la DGII. Cada uno de los 25 casos del Excel trae el suyo ya asignado.">
            Paso 2 — Set de pruebas (25 comprobantes)
          </PasoTitulo>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 16 }}>
            La DGII te asigna un Excel con 25 casos de prueba cuando inicias la solicitud en la
            OFV. Una vez lo tengas, súbelo aquí — nosotros leemos cada fila, firmamos cada
            comprobante con tu certificado y los enviamos en el orden correcto (algunos dependen de
            que otro se haya <Etiqueta ayuda="DGII recibe el comprobante primero como 'Enviado'; después lo revisa y responde si quedó 'Aceptado' o 'Rechazado'. Solo cuando está Aceptado cuentan los que dependen de él.">Aceptado</Etiqueta> primero — eso lo manejamos solos, no tienes que esperar
            manualmente).
          </p>
          <TuYNosotros tu="Descargar el Excel de 25 casos desde el portal de la DGII y subirlo aquí." nosotros="Firmar y enviar los 25 comprobantes en el orden correcto." />
          <ScreenshotPlaceholder titulo="Dónde descargar el set de pruebas" descripcion="Ejemplo de dónde, dentro del portal de la DGII, se descarga el Excel de los 25 casos de prueba." />
          <div style={{ marginTop: 16 }}>
            <SubidaArchivo onFile={subirSet} cargando={subiendoSet} etiqueta="Subir Excel del set de pruebas" nombreArchivo={nombreArchivoSet} />
          </div>
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
              {enviadosPaso2 === totalPaso2 && <SiguientePaso n={3} onClick={() => setPaso(3)} />}
            </>
          )}
        </Card>
      )}

      {paso === 3 && (
        <Card>
          <PasoTitulo n={3} ayuda="Una Aprobación Comercial es cuando el comprador de una factura confirma o rechaza lo que le llegó (ej. 'sí, recibí esto conforme' o 'no, esto está mal'). Algunos tipos de comprobante exigen simular también ese lado de la conversación como parte de la certificación.">
            Paso 3 — Aprobaciones comerciales
          </PasoTitulo>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 16 }}>
            Después de que la DGII acepte tu set de pruebas del Paso 2, te habilita un segundo
            Excel en el portal — el de Aprobación Comercial. Solo E31, E33, E34, E44 y E45
            necesitan esto; los demás tipos no aplican y no aparecerán aquí.
          </p>
          <TuYNosotros tu="Descargar el Excel de Aprobación Comercial desde el portal y subirlo aquí." nosotros="Firmar y enviar cada aprobación/rechazo a la DGII." />
          <ScreenshotPlaceholder titulo="Dónde descargar el Excel de Aprobación Comercial" descripcion="Aparece en el portal de la DGII una vez tu set de pruebas del Paso 2 fue aceptado." />
          <div style={{ marginTop: 16 }}>
            <SubidaArchivo onFile={subirAC} cargando={subiendoAC} etiqueta="Subir Excel de Aprobación Comercial" nombreArchivo={nombreArchivoAC} />
          </div>
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
              {Object.values(acItems).every((it) => it.enviado) && <SiguientePaso n={4} onClick={() => setPaso(4)} />}
            </>
          )}
        </Card>
      )}

      {paso === 4 && (
        <Card>
          <PasoTitulo n={4} ayuda="A diferencia del Paso 2 (donde subiste un Excel con casos ya armados por la DGII), aquí tú mismo creas comprobantes de prueba llenando un formulario simple, simulando ventas o compras reales — para que la DGII confirme que tu sistema funciona en distintos escenarios, no solo en el set fijo.">
            Paso 4 — Pruebas interactivas
          </PasoTitulo>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 16 }}>
            La DGII también pide crear comprobantes &quot;a mano&quot; (no del Excel) para simular
            operación real. Crea los que tu certificación requiera — la DGII te dirá cuántos de
            cada tipo.
          </p>
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <select value={tipoPrueba} onChange={(e) => { setTipoPrueba(e.target.value as TipoECF); setFormPrueba({}); }} style={{ fontSize: 13, padding: 8 }}>
              {(["E32", "E33", "E34", "E41", "E43", "E44", "E45", "E46", "E47"] as TipoECF[]).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 420 }}>
            <input placeholder="Descripción" value={formPrueba.descripcion ?? ""} onChange={(e) => setFormPrueba((f) => ({ ...f, descripcion: e.target.value }))} style={{ padding: 8, fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4 }} />
            <input placeholder="Monto (sin ITBIS)" type="number" step="0.01" value={formPrueba.monto ?? ""} onChange={(e) => setFormPrueba((f) => ({ ...f, monto: e.target.value }))} style={{ padding: 8, fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4 }} />

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
          <SiguientePaso n={5} onClick={() => setPaso(5)} />
        </Card>
      )}

      {paso === 5 && (
        <Card>
          <PasoTitulo n={5} ayuda="RFCE (Resumen de Factura de Consumo Electrónica) es una versión corta que se envía en vez de la factura completa cuando el monto es menor a RD$250,000 — más rápido para ventas pequeñas del día a día. Aun así, la DGII pide también el XML completo como respaldo, solo para estos casos.">
            Paso 5 — XMLs para subir al portal
          </PasoTitulo>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 16 }}>
            Los e-CF de consumo menores a RD$250,000 (E32) se envían como resumen (RFCE) — la DGII
            además te pide subir el XML completo firmado a mano en su portal. Nosotros ya los
            firmamos; tú solo descargas y subes.
          </p>
          <TuYNosotros tu="Descargar cada XML de aquí y subirlo al portal de la DGII." nosotros="Generar y firmar el XML completo de cada comprobante." />
          <ScreenshotPlaceholder titulo="Dónde subir el XML en el portal" descripcion="Sección del portal de la DGII donde se sube el XML firmado de los comprobantes de consumo menores." />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
            {[...candidatosRFCE.map((f) => f.encf), ...pruebasRFCE.map((p) => p.eCF)].map((encf) => (
              <a key={encf} href={`/api/certificacion/descargar-xml?t=${tenantId}&encf=${encf}`} style={{ fontSize: 13, color: "var(--c-brand)", fontWeight: 600 }}>
                ⬇ {encf}.xml
              </a>
            ))}
            {candidatosRFCE.length === 0 && pruebasRFCE.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--c-text-3)" }}>Todavía no hay e-CF RFCE enviados.</p>
            )}
          </div>
          <SiguientePaso n={6} onClick={() => setPaso(6)} />
        </Card>
      )}

      {paso === 6 && (
        <Card>
          <PasoTitulo n={6} ayuda="La 'representación impresa' es simplemente cómo se ve tu factura impresa en papel o PDF — DGII pide subir un ejemplo de cada tipo de comprobante para confirmar que coincide exactamente con los datos que ya enviaste por sistema.">
            Paso 6 — Cerrar la certificación
          </PasoTitulo>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 16 }}>
            Los últimos 4 pasos del proceso oficial (subir las representaciones impresas y la
            validación final) se hacen directamente en el portal de la DGII — son 100% manuales,
            Facturacon no puede automatizarlos. Cuando los hayas completado ahí, confirma aquí para
            activar tu cuenta.
          </p>
          <TuYNosotros tu="Subir las representaciones impresas y validar en el portal de la DGII." nosotros="Activar tu cuenta en cuanto confirmes que ya lo hiciste." />
          <VideoPlaceholder titulo="Cómo cerrar la certificación en el portal" descripcion="Recorrido por los últimos pasos manuales dentro del portal de la DGII." />
          <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "flex-start", marginTop: 16, marginBottom: 16 }}>
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
