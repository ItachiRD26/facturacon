"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { TipoECF } from "@/types";
import type { EmpresaConfig } from "@/types/tenant";
import type { FilaSetPrueba, ItemAC, FacturaPrueba } from "@/lib/certificacion/tipos";
import { planSimulacion, marcaSimulacion, type ItemSimulacion } from "@/lib/certificacion/plan-simulacion";
import VideoPlaceholder from "@/components/marketing/video-placeholder";
import RepresentacionesImpresas from "@/components/certificacion/representaciones-impresas";
import SecuenciasClient from "@/components/panel/secuencias-client";
import { CATEGORIAS_RI } from "@/lib/certificacion/categorias-ri";
import InfoTooltip from "@/components/panel/info-tooltip";
import JornadaProgreso from "@/components/panel/jornada-progreso";

const sans  = "var(--font-sans)";
const serif = "var(--font-serif)";
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Paso = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

interface EstadoReceptor {
  autenticaciones: number;
  recepcion:    { total: number; ultima: string | null };
  aprobaciones: { total: number; ultima: string | null };
}

// "dgii" muestra al cliente a qué pasos OFICIALES del portal de la DGII (son
// 13) corresponde cada paso nuestro. Del 1 al 4 coinciden uno a uno; después
// agrupamos los que son del mismo tema (docs/GUIA-CERTIFICACION-ECF-DGII.md).
const PASOS: { n: Paso; t: string; dgii: string }[] = [
  { n: 0, t: "Antes de empezar", dgii: "previo" },
  { n: 1, t: "Autenticación", dgii: "paso 1" },
  { n: 2, t: "Set de pruebas", dgii: "paso 2" },
  { n: 3, t: "Aprobaciones comerciales", dgii: "paso 3" },
  { n: 4, t: "Simulación", dgii: "paso 4" },
  { n: 5, t: "Representación impresa", dgii: "pasos 5-6" },
  { n: 6, t: "Pruebas de recepción", dgii: "pasos 7-11" },
  { n: 7, t: "URLs de producción", dgii: "paso 12" },
  { n: 8, t: "Declaración jurada", dgii: "paso 13" },
  { n: 9, t: "Numeración (e-NCF)", dgii: "OFV, al terminar" },
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

// Título de cada Paso + insignia con a cuáles de los 13 pasos oficiales de
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
  { rango: "1", que: "Autenticación: semilla firmada con tu certificado", quien: "Facturacon (automático, con tu .p12); tú subes el archivo firmado al portal" },
  { rango: "2", que: "Set de 25 comprobantes de prueba", quien: "Tú subes el Excel, Facturacon firma y envía" },
  { rango: "3", que: "Aprobaciones comerciales", quien: "Tú subes el Excel, Facturacon firma y envía" },
  { rango: "4", que: "Simulación de otros tipos de comprobante", quien: "Tú completas el formulario, Facturacon firma y envía" },
  { rango: "5-6", que: "Representación impresa (un PDF por tipo) y validación de la DGII", quien: "Tú subes los PDF al portal; la DGII valida" },
  { rango: "7-11", que: "Registrar tus URLs y que la DGII pruebe recepción y aprobaciones", quien: "Tú pulsas los botones en el portal; los servicios que responden son de Facturacon" },
  { rango: "12", que: "URLs de producción (las mismas de pruebas)", quien: "Tú las pegas en el portal; las direcciones son de Facturacon" },
  { rango: "13", que: "Declaración jurada", quien: "Tú en el portal; Facturacon firma la declaración" },
  { rango: "OFV", que: "Solicitar tu numeración (e-NCF) para poder facturar", quien: "Tú la pides en la OFV y registras aquí lo que la DGII te autorizó" },
];

function EquivalenciaPasos() {
  const [abierto, setAbierto] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      <button onClick={() => setAbierto((a) => !a)} type="button" style={{
        fontSize: 12, fontWeight: 700, color: "var(--c-brand)", background: "none", border: "none", cursor: "pointer", padding: 0,
      }}>
        {abierto ? "▾" : "▸"} ¿Qué hace Facturacon por mí y qué me toca a mí? (el proceso oficial de la DGII)
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
  // Marca personal: ya registré las URLs de producción en el portal (la DGII no nos lo dice).
  const [urlsProdListas, setUrlsProdListas] = useState<boolean>(() => {
    try { return localStorage.getItem(`cert-urls-prod-${tenantId}`) === "1"; } catch { return false; }
  });
  const [declaracionLista, setDeclaracionLista] = useState<boolean>(() => {
    try { return localStorage.getItem(`cert-declaracion-${tenantId}`) === "1"; } catch { return false; }
  });
  function marcarDeclaracion(v: boolean) {
    setDeclaracionLista(v);
    try { localStorage.setItem(`cert-declaracion-${tenantId}`, v ? "1" : "0"); } catch { /* sin almacenamiento */ }
  }
  function marcarUrlsProd(v: boolean) {
    setUrlsProdListas(v);
    try { localStorage.setItem(`cert-urls-prod-${tenantId}`, v ? "1" : "0"); } catch { /* sin almacenamiento */ }
  }
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
  const [enviandoTanda, setEnviandoTanda] = useState<number | null>(null);
  const [errorTanda, setErrorTanda] = useState("");

  // Paso 6 — evidencia de que la DGII llamó a nuestros servicios receptor
  const [receptor, setReceptor] = useState<EstadoReceptor | null>(null);
  const [actualizandoReceptor, setActualizandoReceptor] = useState(false);

  // Paso 7
  const [firmandoDeclaracion, setFirmandoDeclaracion] = useState(false);
  const [nombreArchivoDeclaracion, setNombreArchivoDeclaracion] = useState("");
  const [errorDeclaracion, setErrorDeclaracion] = useState("");
  const [confirmoPortal, setConfirmoPortal] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  // Marca personal de cuáles XML de consumo ya subió al portal (solo ayuda visual, en este navegador).
  const [riCompletas, setRiCompletas] = useState<boolean>(() => {
    try {
      const m = JSON.parse(localStorage.getItem(`cert-ri-subidas-v2-${tenantId}`) ?? "{}") as Record<string, boolean>;
      return CATEGORIAS_RI.every((c) => m[c.id]);
    } catch { return false; }
  });
  const [xmlSubidos, setXmlSubidos] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(`cert-xml-subidos-${tenantId}`) ?? "{}"); } catch { return {}; }
  });
  function marcarXmlSubido(encf: string, v: boolean) {
    setXmlSubidos((prev) => {
      const sig = { ...prev, [encf]: v };
      try { localStorage.setItem(`cert-xml-subidos-${tenantId}`, JSON.stringify(sig)); } catch { /* sin almacenamiento */ }
      return sig;
    });
  }

  const cancelado = useRef(false);
  useEffect(() => () => { cancelado.current = true; }, []);

  async function leerTodo() {
    return Promise.all([
      fetch(`/api/certificacion/empresa?t=${tenantId}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/certificacion/token?t=${tenantId}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/certificacion/upload-set?t=${tenantId}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/certificacion/upload-ac?t=${tenantId}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/certificacion/crear-prueba?t=${tenantId}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/certificacion/iniciar?t=${tenantId}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/certificacion/receptor-estado?t=${tenantId}`).then((r) => r.json()).catch(() => null),
    ]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function aplicarTodo([eR, tR, sR, acR, pR, iR, rR]: any[]) {
    if (rR?.recepcion) setReceptor(rR);
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

  useEffect(() => {
    if (!tenantId) return;
    let vivo = true;
    leerTodo().then((r) => { if (vivo) aplicarTodo(r); });
    return () => { vivo = false; };
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mientras el cliente está en "Pruebas de recepción", refresca solo cada 10 s
  // para que vea llegar las llamadas de la DGII sin tener que recargar la página.
  useEffect(() => {
    if (paso !== 6) return;
    const id = setInterval(() => { actualizarReceptor(); }, 10000);
    return () => clearInterval(id);
  }, [paso, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Firma con el .p12 del cliente un XML que entrega el portal de la DGII y
  // descarga el resultado. Sirve para la postulación (paso previo) y para la
  // declaración jurada (paso 13).
  async function firmarYDescargar(file: File, prefijoSalida: string) {
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
    a.href = url; a.download = `${prefijoSalida}-firmada-${tenantId}.xml`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  async function firmarPostulacion(file: File) {
    setFirmandoPostulacion(true); setErrorPostulacion("");
    try {
      await firmarYDescargar(file, "postulacion");
      setNombreArchivoPostulacion(file.name);
    } catch (e) {
      setErrorPostulacion(e instanceof Error ? e.message : "No se pudo firmar el XML");
    } finally {
      setFirmandoPostulacion(false);
    }
  }

  async function firmarDeclaracion(file: File) {
    setFirmandoDeclaracion(true); setErrorDeclaracion("");
    try {
      await firmarYDescargar(file, "declaracion-jurada");
      setNombreArchivoDeclaracion(file.name);
    } catch (e) {
      setErrorDeclaracion(e instanceof Error ? e.message : "No se pudo firmar el XML");
    } finally {
      setFirmandoDeclaracion(false);
    }
  }

  async function actualizarReceptor() {
    setActualizandoReceptor(true);
    try {
      const r = await fetch(`/api/certificacion/receptor-estado?t=${tenantId}`).then((x) => x.json());
      if (r?.recepcion) setReceptor(r);
    } catch { /* se reintenta al pulsar de nuevo */ } finally {
      setActualizandoReceptor(false);
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
        setLogEnvio((l) => [...l, `… ${encf}: ${data.estado ?? "esperando"}${Array.isArray(data.mensajes) && data.mensajes.length ? " — " + data.mensajes.slice(0, 3).join(" | ") : ""}`]);
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

  // ── Paso 4 · simulación automática por tandas ──────────────────
  const esFinal = (e?: string) => /aceptad|rechazad/i.test(e ?? "");
  const esAceptado = (e?: string) => /aceptad/i.test(e ?? "");

  // El comprobante guardado que corresponde a un lugar del plan (el último, si hubo reintentos).
  function pruebaDe(it: ItemSimulacion): FacturaPrueba | undefined {
    return Object.values(pruebas)
      .filter((p) => p.descripcion.startsWith(marcaSimulacion(it.orden) + " "))
      .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
      .pop();
  }

  async function consultarPrueba(eCF: string) {
    try {
      const res = await fetch(`/api/certificacion/consultar?t=${tenantId}&encf=${eCF}&origen=prueba`);
      const data = await res.json();
      if (!res.ok) return;
      setPruebas((p) => p[eCF] ? { ...p, [eCF]: { ...p[eCF], estadoDGII: data.estado, mensajesDGII: data.mensajes } } : p);
      return data as { estado?: string; mensajes?: string[] };
    } catch { /* se reintenta en el siguiente ciclo */ }
  }

  async function reiniciarSimulacionLocal() {
    try {
      await fetch("/api/certificacion/reiniciar-simulacion", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId }),
      });
    } catch { /* si falla, igual se refleja en pantalla */ }
    setPruebas((p) => Object.fromEntries(Object.entries(p).map(([k, v]) =>
      [k, v.descripcion.startsWith("Simulación #") && !/rechazad|reiniciad/i.test(v.estadoDGII ?? "") ? { ...v, estadoDGII: "Reiniciado" } : v])));
  }

  async function enviarTanda(plan: ItemSimulacion[], tanda: number) {
    setErrorTanda(""); setEnviandoTanda(tanda);
    try {
      const items = plan.filter((i) => i.tanda === tanda);
      const enviados: string[] = [];
      for (const it of items) {
        if (cancelado.current) return;
        const previo = pruebaDe(it);
        // Ya enviado y no rechazado: no se duplica (cada envío gasta una secuencia que no se puede reutilizar).
        if (previo && previo.estadoEnvio === "enviado" && !/rechazad|reiniciad/i.test(previo.estadoDGII ?? "")) { enviados.push(previo.eCF); continue; }
        const res = await fetch("/api/certificacion/crear-prueba", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantId, tipoECF: it.tipoECF, descripcion: `${marcaSimulacion(it.orden)} · ${it.titulo}`, monto: it.monto, ...it.cuerpo }),
        });
        const data = await res.json();
        if (!res.ok) {
          // Rechazo inmediato (los resúmenes RFCE responden al instante): la DGII reinicia el lote.
          if (/rechazad/i.test(String(data.error))) await reiniciarSimulacionLocal();
          throw new Error(`${it.tipoECF} (${it.titulo}): ${data.error}`);
        }
        // Los resúmenes RFCE ya traen su estado final; el resto se consulta por trackId.
        if (!data.estadoDGII) enviados.push(data.eCF);
        setPruebas((p) => ({ ...p, [data.eCF]: { id: data.eCF, tipoECF: it.tipoECF, eCF: data.eCF, fecha: "", descripcion: `${marcaSimulacion(it.orden)} · ${it.titulo}`, montoTotal: it.monto, estadoEnvio: "enviado", trackId: data.trackId, estadoDGII: data.estadoDGII, creadoEn: new Date().toISOString() } }));
        await sleep(1200);
      }
      // Espera la respuesta de la DGII de cada uno (máx. ~2 min).
      const pendientes = new Set(enviados);
      const ini = Date.now();
      while (pendientes.size > 0 && Date.now() - ini < 120_000 && !cancelado.current) {
        await sleep(4000);
        for (const eCF of [...pendientes]) {
          const r = await consultarPrueba(eCF);
          if (r && esFinal(r.estado)) {
            pendientes.delete(eCF);
            if (/rechazad/i.test(r.estado ?? "")) {
              await reiniciarSimulacionLocal();
              throw new Error(`La DGII rechazó ${eCF}: ${(r.mensajes ?? []).slice(0, 4).join(" | ") || "sin detalle"}. La DGII reinicia el lote cuando rechaza uno: los demás comprobantes de simulación quedaron en «Reiniciado» y se regeneran con eNCF nuevos. Pégame este mensaje antes de reintentar.`);
            }
          }
        }
      }
      if (pendientes.size > 0) setErrorTanda("La DGII todavía no responde algunos. Espera un momento y pulsa «Actualizar estado».");
    } catch (e) {
      setErrorTanda(e instanceof Error ? e.message : "No se pudo enviar la tanda");
    } finally {
      setEnviandoTanda(null);
    }
  }

  async function actualizarEstadoSimulacion(plan: ItemSimulacion[]) {
    setErrorTanda("");
    for (const it of plan) {
      const p = pruebaDe(it);
      if (p && p.trackId && !esFinal(p.estadoDGII)) await consultarPrueba(p.eCF);
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
    if (!planSimulacion(Object.values(filas)).every((i) => esAceptado(pruebaDe(i)?.estadoDGII))) {
      return { texto: "Envía las tandas de comprobantes de simulación del Paso 4 y espera que la DGII acepte cada una.", ir: 4 };
    }
    if (!riCompletas) {
      return { texto: "Descarga las 11 representaciones impresas (PDF) del Paso 5 y súbelas al portal. Luego la DGII tarda de 3 a 24 horas en verificarlas.", ir: 5 };
    }
    if (!receptor || receptor.recepcion.total === 0 || receptor.aprobaciones.total === 0) {
      return { texto: "Registra tus URLs en el portal y lanza las pruebas de recepción y de aprobaciones comerciales (Paso 6). Aquí verás llegar las llamadas de la DGII.", ir: 6 };
    }
    if (!confirmoPortal) {
      if (!urlsProdListas) return { texto: "Pega las URLs de producción en el portal (Paso 7) y luego firma la declaración jurada (Paso 8).", ir: 7 };
      if (!declaracionLista) return { texto: "Firma la declaración jurada y envíala en el portal (Paso 8).", ir: 8 };
      return { texto: "La certificación en la DGII está lista. Pide tu numeración en la Oficina Virtual, regístrala y finaliza (Paso 9).", ir: 9 };
    }
    return { texto: "Todo listo — dale clic en \"Finalizar y empezar a facturar\" en el Paso 9.", ir: 9 };
  }
  const siguiente = proximoPaso();

  // Pasos ya terminados (para marcarlos en la barra de pasos), calculados de lo guardado.
  const simulacionCompleta = planSimulacion(Object.values(filas)).every((i) => esAceptado(pruebaDe(i)?.estadoDGII));
  const completado: Record<number, boolean> = {
    0: ofvIniciada && !!empresa,
    1: tokenValido === true || totalPaso2 > 0,
    2: totalPaso2 > 0 && enviadosPaso2 === totalPaso2,
    3: Object.keys(acItems).length > 0 && Object.values(acItems).every((it) => it.enviado),
    4: simulacionCompleta,
    5: riCompletas,
    6: !!receptor && receptor.autenticaciones > 0 && receptor.recepcion.total > 0 && receptor.aprobaciones.total > 0,
    7: urlsProdListas,
    8: declaracionLista,
    9: false,
  };

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "32px 24px 80px", fontFamily: sans }}>
      <div style={{ marginBottom: 24 }}><JornadaProgreso actual="certificacion" compacta /></div>
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
          <button key={p.n} onClick={() => setPaso(p.n)} type="button" aria-label={completado[p.n] ? `${p.t} (completado)` : p.t} style={{
            padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: paso === p.n ? "var(--c-brand)" : completado[p.n] ? "#f0fdf4" : "var(--c-bg)",
            color: paso === p.n ? "#fff" : completado[p.n] ? "#166534" : "var(--c-text-3)",
            border: `1px solid ${paso !== p.n && completado[p.n] ? "#86efac" : "var(--c-border)"}`,
          }}>
            {completado[p.n] ? "✓ " : ""}{p.n}. {p.t}
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
          {/* eslint-disable-next-line @next/next/no-img-element -- captura estática en /public, no requiere optimización de Next/Image */}
          <img
            src="/certificacion/donde-descargar-set-prueba-paso-2.webp" alt="Paso 2 en la OFV: botón verde «Descargar set de prueba», que baja el archivo Set_Pruebas_eCF.xlsx"
            style={{ width: "100%", borderRadius: 10, border: "1px solid var(--c-border)", boxShadow: "0 12px 30px rgba(17,20,57,0.10)" }}
          />
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              <span style={{ background: "var(--c-brand)", color: "#fff", borderRadius: 999, padding: "2px 9px", marginRight: 8 }}>→</span>
              Sube aquí el Excel que descargaste de la DGII
            </div>
            <SubidaArchivo grande onFile={subirSet} cargando={subiendoSet} etiqueta="Haz clic para elegir el Excel del set de pruebas" nombreArchivo={nombreArchivoSet} />
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
              {Object.values(filas).some((f) => f.tipoECF === "E32" && f.montoTotal < 250000) && (() => {
                const consumo = Object.values(filas).filter((f) => f.tipoECF === "E32" && f.montoTotal < 250000);
                const subidos = consumo.filter((f) => xmlSubidos[f.encf]).length;
                return (
                  <div style={{ marginTop: 24, padding: 18, border: "1px solid var(--c-border)", borderRadius: 12, background: "var(--c-bg)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                      Falta un paso tuyo: subir las {consumo.length} facturas de consumo en el portal
                    </div>
                    <p style={{ fontSize: 12, color: "var(--c-text-3)", margin: "0 0 14px" }}>
                      Los resúmenes ya los enviamos nosotros. La DGII ahora pide que cargues tú, a mano, las facturas
                      completas de los consumos menores a RD$250 mil. Ya las firmamos con tu certificado.
                    </p>
                    <ol style={{ margin: "0 0 14px", paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
                      <li>Espera a que en el portal los <strong>{consumo.length} resúmenes de consumo</strong> aparezcan como aceptados.</li>
                      <li>Descarga abajo uno de los XML.</li>
                      <li>En el recuadro <strong>«Facturas de consumo &lt; 250Mil»</strong> del portal pulsa <strong>«Elegir archivo»</strong>, escoge ese XML y pulsa <strong>«Enviar»</strong>.</li>
                      <li>Repite con cada uno. Cuando el contador del portal llegue a <strong>{consumo.length}/{consumo.length}</strong>, este paso está listo.</li>
                    </ol>
                    {/* eslint-disable-next-line @next/next/no-img-element -- captura estática en /public, no requiere optimización de Next/Image */}
                    <img
                      src="/certificacion/subir-facturas-consumo-250mil-paso-2.webp" alt="Portal de la DGII, Paso 2: recuadro «Facturas de consumo menores a 250Mil» con el botón Elegir archivo y Enviar, y a la derecha el contador de comprobantes aceptados"
                      style={{ width: "100%", borderRadius: 10, border: "1px solid var(--c-border)", boxShadow: "0 12px 30px rgba(17,20,57,0.10)", marginBottom: 6 }}
                    />
                    <p style={{ fontSize: 11, color: "var(--c-text-3)", margin: "0 0 14px" }}>
                      Así se ve en el portal. A la derecha puedes seguir cuántos van aceptados.
                    </p>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>Tus XML firmados</span>
                      <span style={{ fontSize: 12, color: "var(--c-text-3)" }}>{subidos} de {consumo.length} marcados como subidos</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {consumo.map((f) => {
                        const listo = f.estadoEnvio === "enviado" || f.estadoEnvio === "aceptado";
                        return (
                          <div key={f.encf} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", background: "var(--c-surface, #fff)", border: "1px solid var(--c-border)", borderRadius: 8 }}>
                            {listo ? (
                              <a href={`/api/certificacion/descargar-xml?t=${tenantId}&encf=${f.encf}`} style={{ fontSize: 13, color: "var(--c-brand)", fontWeight: 600 }}>
                                ⬇ Descargar {f.encf}.xml
                              </a>
                            ) : (
                              <span style={{ fontSize: 13, color: "var(--c-text-3)" }}>{f.encf}.xml — disponible cuando se envíe su resumen</span>
                            )}
                            <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}>
                              <input type="checkbox" checked={!!xmlSubidos[f.encf]} onChange={(e) => marcarXmlSubido(f.encf, e.target.checked)} />
                              Ya lo subí
                            </label>
                          </div>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: 11, color: "var(--c-text-3)", margin: "10px 0 0" }}>
                      Si el navegador lo descarga como «E32… (1).xml» no importa: el contenido es el mismo.
                    </p>
                  </div>
                );
              })()}
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
          {/* eslint-disable-next-line @next/next/no-img-element -- captura estática en /public, no requiere optimización de Next/Image */}
          <img
            src="/certificacion/descargar-aprobaciones-comerciales-paso-3.webp" alt="Paso 3 en la OFV: botón verde «Descargar aprobaciones comerciales», que baja el Excel con las 11 aprobaciones del set de pruebas"
            style={{ width: "100%", borderRadius: 10, border: "1px solid var(--c-border)", boxShadow: "0 12px 30px rgba(17,20,57,0.10)" }}
          />
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              <span style={{ background: "var(--c-brand)", color: "#fff", borderRadius: 999, padding: "2px 9px", marginRight: 8 }}>→</span>
              Sube aquí el Excel de aprobaciones que descargaste de la DGII
            </div>
            <SubidaArchivo grande onFile={subirAC} cargando={subiendoAC} etiqueta="Haz clic para elegir el Excel de Aprobación Comercial" nombreArchivo={nombreArchivoAC} />
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

      {paso === 4 && (() => {
        const plan = planSimulacion(Object.values(filas));
        const tandas = [...new Set(plan.map((i) => i.tanda))];
        const tandaCompleta = (t: number) => plan.filter((i) => i.tanda === t).every((i) => esAceptado(pruebaDe(i)?.estadoDGII));
        const aceptados = plan.filter((i) => esAceptado(pruebaDe(i)?.estadoDGII)).length;
        return (
        <Card>
          <PasoTitulo n={4} ayuda="La DGII quiere ver que tu sistema genera y envía comprobantes de todos los tipos, con datos que parezcan de una operación real. Nosotros los armamos con datos de ejemplo válidos, los firmamos con tu certificado y los enviamos; tú no escribes nada.">
            Paso 4 — Pruebas de simulación
          </PasoTitulo>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 12 }}>
            Ya no tienes que inventar datos: el sistema genera cada comprobante, lo firma y lo envía a la DGII, siguiendo el
            <strong> orden oficial</strong>: primero 31, 32 (≥ 250 mil), 41, 43, 44, 45, 46 y 47; luego las notas 33 y 34; luego los
            resúmenes de consumo. Van en tandas: la siguiente se habilita cuando la DGII acepta todos los de la anterior, así nunca
            se envía encima de un error (un rechazo reinicia el lote y las secuencias gastadas no se reutilizan). Lo único que
            descargas y subes tú son las facturas de consumo menores de 250 mil, al final.
          </p>
          <TuYNosotros tu="Pulsar «Enviar tanda» y esperar que la DGII acepte." nosotros="Generar, firmar y enviar cada comprobante, y consultar su resultado." />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "16px 0 10px" }}>
            <strong style={{ fontSize: 13 }}>{aceptados} de {plan.length} aceptados por la DGII</strong>
            <button onClick={() => actualizarEstadoSimulacion(plan)} disabled={enviandoTanda !== null} style={{ fontSize: 12, padding: "6px 12px", border: "1px solid var(--c-border)", borderRadius: 6, background: "transparent", cursor: "pointer" }}>
              ↻ Actualizar estado
            </button>
          </div>

          {tandas.map((t) => {
            const items = plan.filter((i) => i.tanda === t);
            const desbloqueada = t === 1 || tandaCompleta(t - 1);
            const completa = tandaCompleta(t);
            const sinPaso2 = items.some((i) => i.bloqueo);
            return (
              <div key={t} style={{ marginBottom: 14, border: `1px solid ${completa ? "#86efac" : "var(--c-border)"}`, borderRadius: 10, overflow: "hidden", opacity: desbloqueada ? 1 : 0.6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 14px", background: completa ? "#f0fdf4" : "var(--c-bg)", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    {completa ? "✅" : desbloqueada ? "▶" : "🔒"} Tanda {t} de {tandas.length}
                    <span style={{ fontWeight: 400, color: "var(--c-text-3)" }}> · {items.length} comprobante{items.length === 1 ? "" : "s"}</span>
                  </span>
                  {!completa && (
                    <Boton onClick={() => enviarTanda(plan, t)} disabled={!desbloqueada || sinPaso2 || enviandoTanda !== null}>
                      {enviandoTanda === t ? "Enviando y esperando a la DGII…" : desbloqueada ? `Enviar tanda ${t}` : `Se habilita al aceptarse la tanda ${t - 1}`}
                    </Boton>
                  )}
                </div>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <tbody>
                    {items.map((it) => {
                      const p = pruebaDe(it);
                      const pos = plan.indexOf(it) + 1;
                      return (
                        <tr key={it.orden} style={{ borderTop: "1px solid var(--c-border)" }}>
                          <td style={{ padding: "8px 14px", width: 34, color: "var(--c-text-3)" }}>{pos}</td>
                          <td style={{ padding: 8, fontWeight: 600, width: 54 }}>{it.tipoECF}</td>
                          <td style={{ padding: 8 }}>
                            {it.titulo}
                            {it.bloqueo && <div style={{ color: "#991b1b", fontSize: 11 }}>{it.bloqueo}</div>}
                            {p && /rechazad/i.test(p.estadoDGII ?? "") && p.mensajesDGII && p.mensajesDGII.length > 0 && (
                              <div style={{ color: "#991b1b", fontSize: 11, marginTop: 4, userSelect: "text" }}>{p.mensajesDGII.slice(0, 6).join(" · ")}</div>
                            )}
                          </td>
                          <td style={{ padding: 8, color: "var(--c-text-3)" }}>{p?.eCF ?? "—"}</td>
                          <td style={{ padding: 8 }}>
                            {p ? <Estado estado={p.estadoDGII ?? p.estadoEnvio} /> : <span style={{ color: "var(--c-text-3)" }}>pendiente</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}

          {(() => {
            const consumo = plan.filter((i) => i.tipoECF === "E32" && i.monto < 250000)
              .map((i) => pruebaDe(i)).filter((p): p is FacturaPrueba => !!p && p.estadoEnvio !== "error" && !/rechazad|reiniciad/i.test(p.estadoDGII ?? ""));
            if (consumo.length === 0) return null;
            const subidos = consumo.filter((p) => xmlSubidos[p.eCF]).length;
            return (
              <div style={{ marginTop: 20, padding: 18, border: "1px solid var(--c-border)", borderRadius: 12, background: "var(--c-bg)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Falta un paso tuyo: subir las facturas de consumo en el portal</div>
                <p style={{ fontSize: 12, color: "var(--c-text-3)", margin: "0 0 12px" }}>
                  Cuando en el portal los resúmenes de consumo aparezcan como aceptados, la DGII pide cargar a mano las facturas completas.
                  En el recuadro <strong>«Facturas de consumo &lt; 250Mil»</strong> pulsa «Elegir archivo», escoge el XML y pulsa «Enviar». Repite con cada uno.
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element -- captura estática en /public, no requiere optimización de Next/Image */}
                <img
                  src="/certificacion/subir-facturas-consumo-250mil-paso-2.webp" alt="Portal de la DGII: recuadro «Facturas de consumo menores a 250Mil» con Elegir archivo y Enviar"
                  style={{ width: "100%", borderRadius: 10, border: "1px solid var(--c-border)", marginBottom: 12 }}
                />
                <div style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 8 }}>{subidos} de {consumo.length} marcados como subidos</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {consumo.map((p) => (
                    <div key={p.eCF} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", background: "var(--c-surface, #fff)", border: "1px solid var(--c-border)", borderRadius: 8 }}>
                      <a href={`/api/certificacion/descargar-xml?t=${tenantId}&encf=${p.eCF}`} style={{ fontSize: 13, color: "var(--c-brand)", fontWeight: 600 }}>⬇ Descargar {p.eCF}.xml</a>
                      <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}>
                        <input type="checkbox" checked={!!xmlSubidos[p.eCF]} onChange={(e) => marcarXmlSubido(p.eCF, e.target.checked)} />
                        Ya lo subí
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {errorTanda && <div style={{ fontSize: 12, color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 10, marginTop: 4 }}>{errorTanda}</div>}

          <details style={{ marginTop: 16 }}>
            <summary style={{ fontSize: 12, color: "var(--c-text-3)", cursor: "pointer" }}>Avanzado: crear un comprobante a mano</summary>
            <div style={{ display: "flex", gap: 10, margin: "12px 0", flexWrap: "wrap" }}>
              <select value={tipoPrueba} onChange={(e) => { setTipoPrueba(e.target.value as TipoECF); setFormPrueba({}); }} style={{ fontSize: 13, padding: 8 }}>
                {(["E32", "E33", "E34", "E41", "E43", "E44", "E45", "E46", "E47"] as TipoECF[]).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 420 }}>
              <input placeholder="Descripción" value={formPrueba.descripcion ?? ""} onChange={(e) => setFormPrueba((f) => ({ ...f, descripcion: e.target.value }))} style={{ padding: 8, fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4 }} />
              <input placeholder="Monto (sin ITBIS)" type="number" step="0.01" value={formPrueba.monto ?? ""} onChange={(e) => setFormPrueba((f) => ({ ...f, monto: e.target.value }))} style={{ padding: 8, fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4 }} />
              {errorPrueba && <div style={{ fontSize: 12, color: "#991b1b" }}>{errorPrueba}</div>}
              <Boton onClick={crearPrueba} disabled={creandoPrueba}>
                {creandoPrueba ? "Creando…" : `Crear y enviar ${tipoPrueba}`}
              </Boton>
            </div>
          </details>
          <SiguientePaso n={5} onClick={() => setPaso(5)} />
        </Card>
        );
      })()}

      {paso === 5 && (
        <Card>
          <PasoTitulo n={5} ayuda="La representación impresa es cómo se ve tu factura en papel o PDF. La DGII pide un ejemplo de cada tipo de comprobante para confirmar que coincide, dato por dato, con lo que ya enviaste por sistema, y que su código QR se puede leer.">
            Paso 5 — Representación impresa
          </PasoTitulo>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 12 }}>
            En el portal la DGII te pide <strong>un PDF por cada tipo de comprobante (11 casillas)</strong>, no uno por cada
            comprobante enviado. Ya los armamos por ti a partir de los e-CF que la DGII aceptó en el Paso 4: cada PDF lleva los
            mismos datos que se enviaron, el código de seguridad, la fecha de firma y el código QR. La suma de todos los archivos
            no puede pasar de 10 MB (los tuyos pesan unos pocos KB).
          </p>
          <div style={{ fontSize: 12, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
            <strong>⏱ La verificación toma entre 3 y 24 horas.</strong> Después de subir los PDF, la DGII los revisa (Paso 6 del portal).
            El tiempo depende del horario y de la disponibilidad de verificación de la DGII. No hace falta que te quedes esperando:
            puedes cerrar el asistente y volver más tarde.
          </div>
          <TuYNosotros tu="Descargar los PDF y subir cada uno en su casilla del portal." nosotros="Armar cada representación impresa con el XML firmado que ya se envió, con su QR." />
          {/* eslint-disable-next-line @next/next/no-img-element -- captura estática en /public, no requiere optimización de Next/Image */}
          <img
            src="/certificacion/subir-representaciones-impresas-paso-5.webp" alt="Portal de la DGII, Paso 5: una casilla Elegir archivo por cada tipo de comprobante (31, 32 mayor o igual a 250 mil, 33, 34, 41, 43, 44, 45, 46, 47 y 32 menor a 250 mil)"
            style={{ width: "100%", borderRadius: 10, border: "1px solid var(--c-border)", boxShadow: "0 12px 30px rgba(17,20,57,0.10)", margin: "4px 0 16px" }}
          />
          <ol style={{ margin: "0 0 14px", paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
            <li>Descarga los PDF aquí abajo (uno por uno o todos juntos).</li>
            <li>En el portal, en cada casilla pulsa <strong>«Elegir archivo»</strong> y escoge el PDF del mismo tipo (el nombre dice el tipo: <em>RI-31-…</em>, <em>RI-34-…</em>, <em>RI-32-menor-250mil-…</em>).</li>
            <li>Al terminar las 11, envía. Luego toca esperar la validación de la DGII.</li>
          </ol>
          <RepresentacionesImpresas tenantId={tenantId} onCompleto={setRiCompletas} />
          <SiguientePaso n={6} onClick={() => setPaso(6)} />
        </Card>
      )}

      {paso === 6 && (
        <Card>
          <PasoTitulo n={6} ayuda="En estos pasos la DGII es la que nos llama a nosotros: te envía comprobantes de prueba como si fueras el comprador, y aprobaciones comerciales como si fueras el vendedor. Nuestros servicios receptor responden y firman el acuse con tu certificado. Aquí puedes comprobar que las llamadas realmente llegaron.">
            Paso 6 — Pruebas de recepción
          </PasoTitulo>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 16 }}>
            En el portal vas a registrar las 3 direcciones de tu sistema (están en el Paso 0) y
            pulsar &quot;Inicio prueba recepción e-CF&quot; y &quot;Inicio prueba aprobaciones
            comerciales&quot;. La DGII entonces llama a tus direcciones. No necesitas hacer nada
            más: respondemos automáticamente.
          </p>
          <TuYNosotros tu="Confirmar las URLs en el portal y pulsar los dos botones de inicio de prueba." nosotros="Recibir cada llamada de la DGII, guardarla y responder con el acuse firmado con tu certificado." />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, marginBottom: 14 }}>
            {([
              { t: "Autenticaciones", n: receptor?.autenticaciones ?? 0, u: null as string | null, ok: (receptor?.autenticaciones ?? 0) > 0, d: "La DGII pidió y validó una semilla" },
              { t: "e-CF recibidos", n: receptor?.recepcion.total ?? 0, u: receptor?.recepcion.ultima ?? null, ok: (receptor?.recepcion.total ?? 0) > 0, d: "Comprobantes que la DGII te envió" },
              { t: "Aprobaciones recibidas", n: receptor?.aprobaciones.total ?? 0, u: receptor?.aprobaciones.ultima ?? null, ok: (receptor?.aprobaciones.total ?? 0) > 0, d: "Aprobaciones comerciales entregadas" },
            ]).map((c) => (
              <div key={c.t} style={{ padding: "12px 14px", borderRadius: 8, border: `1px solid ${c.ok ? "#bbf7d0" : "var(--c-border)"}`, background: c.ok ? "#f0fdf4" : "var(--c-bg)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text-3)", textTransform: "uppercase" }}>{c.t}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: c.ok ? "#166534" : "var(--c-text-3)" }}>{c.ok ? "✓ " : ""}{c.n}</div>
                <div style={{ fontSize: 11, color: "var(--c-text-3)" }}>
                  {c.u ? `Última: ${new Date(c.u).toLocaleString("es-DO")}` : c.d}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Boton variante="secundario" onClick={actualizarReceptor} disabled={actualizandoReceptor}>
              {actualizandoReceptor ? "Actualizando…" : "↻ Actualizar"}
            </Boton>
            <span style={{ fontSize: 11, color: "var(--c-text-4)" }}>Se actualiza solo cada 10 segundos mientras estás en este paso.</span>
          </div>
          <p style={{ fontSize: 11, color: "var(--c-text-3)", marginTop: 12 }}>
            Si el portal te dice que la prueba falló pero aquí no ves llegar nada, revisa que las
            URLs del Paso 0 estén copiadas exactamente como aparecen. Si ves llamadas aquí y el
            portal sigue en pendiente, espera unos minutos: la DGII a veces tarda en reflejarlo.
          </p>
          <SiguientePaso n={7} onClick={() => setPaso(7)} />
        </Card>
      )}

      {paso === 7 && (
        <Card>
          <PasoTitulo n={7} ayuda="La DGII guarda en su directorio público las direcciones definitivas (producción) de los tres servicios de tu sistema: autenticación, recepción y aprobación comercial. Son las mismas que usaste en las pruebas. Una vez registradas, cambiarlas implica un trámite nuevo, por eso las nuestras son fijas: no las cambies.">
            Paso 7 — URLs de producción (paso 12 del portal)
          </PasoTitulo>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 14 }}>
            En el portal, el paso 12 te muestra tres campos. Cada uno ya trae el <code>https://</code> al inicio y la ruta
            al final: <strong>solo pega la dirección de tu empresa en el espacio del medio</strong>. Es la misma de las
            pruebas, pegada igual en los tres.
          </p>
          <TuYNosotros tu="Pegar tu dirección en los tres campos del paso 12 del portal y guardar." nosotros="Mantener los tres servicios activos en esa dirección, para siempre." />
          {slug ? (
            <>
              <div style={{ margin: "14px 0 6px", fontSize: 11, fontWeight: 700, color: "var(--c-text-3)", textTransform: "uppercase" }}>
                Pega esto en el espacio del medio (los 3 campos)
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                <input readOnly value={`${slug}.${ROOT_DOMAIN}`} onFocus={(e) => e.target.select()}
                  style={{ flex: 1, padding: "12px 12px", border: "2px solid var(--c-brand)", borderRadius: 6, fontSize: 15, fontWeight: 700, fontFamily: "var(--font-mono)", background: "var(--c-brand-bg)" }} />
                <Boton onClick={() => copiarUrl("dominio-prod", `${slug}.${ROOT_DOMAIN}`)}>
                  {urlCopiada === "dominio-prod" ? "✓ Copiado" : "Copiar"}
                </Boton>
              </div>
              <div style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 6 }}>Así debe quedar cada servicio completo (solo para comparar):</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                {[
                  { label: "Servicio de Autenticación", ruta: "/fe/autenticacion/api/[semilla|ValidacionCertificado]" },
                  { label: "Servicio de Recepción", ruta: "/fe/recepcion/api/ecf" },
                  { label: "Servicio de Aprobación Comercial", ruta: "/fe/aprobacioncomercial/api/ecf" },
                ].map((u) => (
                  <div key={u.label} style={{ fontSize: 12, padding: "8px 10px", background: "var(--c-bg)", border: "1px solid var(--c-border)", borderRadius: 6 }}>
                    <strong>{u.label}:</strong> <span style={{ fontFamily: "var(--font-mono)" }}>https://{slug}.{ROOT_DOMAIN}{u.ruta}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 16 }}>Cargando tu dirección…</p>
          )}
          <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
            <input type="checkbox" checked={urlsProdListas} onChange={(e) => marcarUrlsProd(e.target.checked)} style={{ marginTop: 2 }} />
            Ya pegué y guardé las URLs de producción en el portal de la DGII.
          </label>
          <SiguientePaso n={8} onClick={() => setPaso(8)} />
        </Card>
      )}

      {paso === 8 && (
        <Card>
          <PasoTitulo n={8} ayuda="El último paso del portal es una declaración jurada: un archivo XML que la DGII te entrega para que lo firmes con tu certificado y lo subas de vuelta. Facturacon lo firma por ti.">
            Paso 8 — Cerrar la certificación (declaración jurada)
          </PasoTitulo>
          <div style={{ fontSize: 12, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
            <strong>Antes de empezar:</strong> recuerda que este paso se hace con tu <strong>Oficina Virtual (OFV) de la DGII abierta
            y con tu sesión iniciada</strong>. Vas a ir y volver entre el portal y esta pantalla.
          </div>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 12 }}>
            Último paso del portal (el paso 13, <strong>Declaración Jurada</strong>). Son cuatro pasos, en este orden:
          </p>
          <ol style={{ margin: "0 0 14px", paddingLeft: 18, fontSize: 13, lineHeight: 1.75 }}>
            <li><strong>En el portal de la DGII</strong>, pulsa <strong>«Generar archivo»</strong> (marca 1 en la captura). Se descarga un archivo XML.</li>
            <li><strong>Aquí en Facturacon</strong>, sube ese XML en el espacio de abajo. Nosotros lo firmamos con tu certificado y <strong>se descarga el archivo ya firmado</strong>.</li>
            <li><strong>De vuelta en el portal</strong>, en «Envío de archivo de declaración jurada firmado», pulsa <strong>«Browse»</strong> y elige el archivo firmado que se acaba de descargar (marca 3).</li>
            <li>Pulsa <strong>«Enviar archivo»</strong> (marca 4). Con eso termina el proceso.</li>
          </ol>
          {/* eslint-disable-next-line @next/next/no-img-element -- captura estática en /public, no requiere optimización de Next/Image */}
          <img
            src="/certificacion/declaracion-jurada-paso-13.webp" alt="Portal de la DGII, paso 13 Declaración Jurada: el botón Generar archivo (1), el campo para elegir el archivo firmado con Browse (3) y el botón Enviar archivo (4)"
            style={{ width: "100%", borderRadius: 10, border: "1px solid var(--c-border)", boxShadow: "0 12px 30px rgba(17,20,57,0.10)", marginBottom: 6 }}
          />
          <p style={{ fontSize: 11, color: "var(--c-text-3)", margin: "0 0 14px" }}>
            Los números rojos son los pasos 1, 3 y 4 de la lista. El paso 2 lo haces aquí.
          </p>
          <TuYNosotros tu="Generar el archivo en el portal, subirlo aquí, y volver al portal a subir el firmado y enviarlo." nosotros="Firmar la declaración jurada con tu certificado y activar tu cuenta cuando confirmes." />
          <VideoPlaceholder titulo="Cómo cerrar la certificación en el portal" descripcion="Recorrido por los últimos pasos dentro del portal de la DGII." />

          <div style={{ marginTop: 16, marginBottom: 6, fontSize: 13, fontWeight: 700 }}>Paso 2: firmar la declaración jurada aquí</div>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 10 }}>
            Sube el XML que generaste en el portal. Te devolvemos el archivo firmado para que lo subas de vuelta (pasos 3 y 4).
          </p>
          <SubidaArchivo
            onFile={firmarDeclaracion} cargando={firmandoDeclaracion} accept=".xml" grande
            etiqueta="Subir XML de la declaración jurada para firmar" nombreArchivo={nombreArchivoDeclaracion}
          />
          {errorDeclaracion && <p style={{ fontSize: 12, color: "#991b1b", marginTop: 8 }}>{errorDeclaracion}</p>}
          {nombreArchivoDeclaracion && !firmandoDeclaracion && !errorDeclaracion && (
            <div style={{ marginTop: 10, padding: "10px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, fontSize: 12, color: "#166534" }}>
              ✓ Firmada y descargada — súbela de vuelta al portal de la DGII.
            </div>
          )}

          <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "flex-start", marginTop: 20, marginBottom: 6 }}>
            <input type="checkbox" checked={declaracionLista} onChange={(e) => marcarDeclaracion(e.target.checked)} style={{ marginTop: 2 }} />
            Ya subí el archivo firmado y pulsé «Enviar archivo» en el portal. El portal me mostró «Ha completado de manera exitosa el proceso de certificación».
          </label>
          <SiguientePaso n={9} onClick={() => setPaso(9)} />
        </Card>
      )}

      {paso === 9 && (
        <Card>
          <PasoTitulo n={9} ayuda="Ya estás certificado, pero para emitir comprobantes reales la DGII también tiene que autorizarte la numeración: los números de e-NCF (secuencias) que vas a usar, por tipo de comprobante. Esa solicitud se hace en tu Oficina Virtual. La DGII te responde con un rango de números y una fecha de vencimiento, y esos datos se registran aquí.">
            Paso 9 — Pide tu numeración (e-NCF) y empieza a facturar
          </PasoTitulo>
          <div style={{ fontSize: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 12px", marginBottom: 14, color: "#166534" }}>
            <strong>¡Felicidades!</strong> La DGII ya te certificó como emisor electrónico. Solo falta pedir tus números de comprobante.
          </div>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 12 }}>
            Antes de emitir tu primera factura real tienes que entrar a tu <strong>Oficina Virtual (OFV)</strong> y
            <strong> solicitar la numeración</strong> (secuencias de e-NCF) de los comprobantes que vas a usar. Sin esos números, el sistema no te deja emitir.
          </p>
          <div style={{ fontSize: 13, fontWeight: 700, margin: "4px 0 8px" }}>Cómo pedirla, paso a paso en la OFV</div>
          <ol style={{ margin: "0 0 18px", paddingLeft: 18, fontSize: 13, lineHeight: 1.75, display: "flex", flexDirection: "column", gap: 14 }}>
            <li>
              Entra a tu <a href="https://www.dgii.gov.do/ofv/login.aspx" target="_blank" rel="noopener noreferrer" style={{ color: "var(--c-brand)", fontWeight: 600 }}>Oficina Virtual</a>, abre el menú <strong>Solicitudes</strong> y pulsa <strong>«Comprobantes Fiscales»</strong>.
              {/* eslint-disable-next-line @next/next/no-img-element -- captura estática en /public, no requiere optimización de Next/Image */}
              <img src="/certificacion/ofv-numeracion-1-menu.webp" alt="Menú Solicitudes de la OFV con la opción Comprobantes Fiscales resaltada" style={{ display: "block", width: "100%", maxWidth: 230, marginTop: 8, borderRadius: 8, border: "1px solid var(--c-border)" }} />
            </li>
            <li>
              En <strong>«Tipo Comprobante»</strong> elige el tipo que quieres autorizar. <strong>Ojo: todos tienen que decir «ELECTRÓNICO» o «ELECTRÓNICA»</strong>.
              Los de arriba de la lista que no dicen eso son los de papel y no sirven para facturación electrónica. Empieza con
              <strong> Factura de Crédito Fiscal Electrónico</strong>.
              {/* eslint-disable-next-line @next/next/no-img-element -- captura estática en /public, no requiere optimización de Next/Image */}
              <img src="/certificacion/ofv-numeracion-2-tipos.webp" alt="Lista de tipos de comprobante de la OFV con el bloque de los que dicen electrónico resaltado" style={{ display: "block", width: "100%", maxWidth: 420, marginTop: 8, borderRadius: 8, border: "1px solid var(--c-border)" }} />
            </li>
            <li>En <strong>«Cantidad»</strong> escribe cuántos comprobantes quieres que te autoricen de ese tipo (la cantidad que prefieras, según cuántos vas a emitir).</li>
            <li>En <strong>«Para uso con»</strong> deja marcada la opción <strong>«Electrónica»</strong>.</li>
            <li>
              Pulsa <strong>«Agregar»</strong>.
              {/* eslint-disable-next-line @next/next/no-img-element -- captura estática en /public, no requiere optimización de Next/Image */}
              <img src="/certificacion/ofv-numeracion-3-formulario.webp" alt="Formulario de la OFV con la cantidad (3), la opción Electrónica (4) y el botón Agregar (5) resaltados" style={{ display: "block", width: "100%", maxWidth: 620, marginTop: 8, borderRadius: 8, border: "1px solid var(--c-border)" }} />
            </li>
            <li>
              <strong>Repite</strong> con los demás: <strong>Factura de Consumo Electrónica</strong>, <strong>Nota de Débito Electrónica</strong> y
              <strong> Nota de Crédito Electrónica</strong> (y otros tipos electrónicos solo si los vas a emitir). Se van juntando en una lista debajo del formulario.
            </li>
            <li>
              Cuando estén todos en la lista, pulsa <strong>«Enviar Solicitud»</strong>.
              {/* eslint-disable-next-line @next/next/no-img-element -- captura estática en /public, no requiere optimización de Next/Image */}
              <img src="/certificacion/ofv-numeracion-4-enviar.webp" alt="Lista de comprobantes agregados en la OFV y el botón Enviar Solicitud resaltado" style={{ display: "block", width: "100%", maxWidth: 494, marginTop: 8, borderRadius: 8, border: "1px solid var(--c-border)" }} />
            </li>
            <li>Aquí abajo <strong>solo dices cuántos comprobantes te autorizó la DGII de cada tipo</strong> (míralo en tu OFV: puede ser menos de lo que pediste): pulsa «Registrar» en la fila del tipo y escribe la cantidad. Facturacon calcula la numeración (desde el 1, en orden) y el vencimiento (31 de diciembre del año siguiente), los asigna uno por uno y te avisa cuando se acaben o venzan.</li>
          </ol>
          <TuYNosotros tu="Pedir la numeración en la OFV y decir aquí cuántos comprobantes te autorizó la DGII de cada tipo." nosotros="Asignar cada número en orden al emitir, y avisarte antes de que se agoten o venzan." />

          <SecuenciasClient tenantId={tenantId} embebido />

          <div style={{ height: 1, background: "var(--c-border)", margin: "20px 0 14px" }} />
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 10 }}>
            Puedes finalizar ahora y registrar la numeración después desde <strong>Secuencias fiscales</strong> en tu panel, pero no podrás emitir comprobantes reales hasta registrarla.
          </p>
          <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 14 }}>
            <input type="checkbox" checked={confirmoPortal} onChange={(e) => setConfirmoPortal(e.target.checked)} style={{ marginTop: 2 }} />
            Confirmo que completé la certificación en el portal de la DGII (representaciones impresas, URLs de producción y declaración jurada).
          </label>
          <Boton onClick={finalizar} disabled={!confirmoPortal || finalizando}>
            {finalizando ? "Activando…" : "Finalizar y empezar a facturar →"}
          </Boton>
        </Card>
      )}
    </main>
  );
}
