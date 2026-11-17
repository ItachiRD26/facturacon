"use client";

import { useEffect, useState } from "react";
import { Button, Card, PageHeader, Pill } from "@/components/ui/kit";

interface Estado {
  existe: boolean;
  titular?: string | null; emisor?: string | null; validoDesde?: string | null; venceEn?: string | null;
  fingerprint?: string; subidoEn?: string; estado?: "vigente" | "por_vencer" | "vencido"; dias?: number | null;
  anterior?: { fingerprint: string; venceEn?: string; reemplazadoEn: string } | null;
}

const input: React.CSSProperties = {
  width: "100%", padding: "9px 10px", border: "1px solid var(--c-border)", borderRadius: "var(--radius-md)",
  fontSize: 13, fontFamily: "var(--font-sans)", background: "var(--c-surface)",
};

// ISO → dd-mm-aaaa
const fecha = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}` : "—");
const LINK_RENOVAR = "https://digi.camarasantodomingo.do/solicitud-en-linea/certificado-facturacion-electronica/";

export default function CertificadoClient({ tenantId }: { tenantId: string }) {
  const [datos, setDatos] = useState<Estado | null>(null);
  const [error, setError] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [clave, setClave] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    let vivo = true;
    fetch(`/api/tenant/certificado?t=${tenantId}`)
      .then((r) => r.json())
      .then((d) => { if (vivo) { if (d.error) setError(d.error); else setDatos(d); } })
      .catch(() => { if (vivo) setError("No se pudo cargar el estado del certificado."); });
    return () => { vivo = false; };
  }, [tenantId]);

  async function renovar() {
    if (!archivo || !clave) { setErrorForm("Elige el archivo del certificado nuevo y escribe su contraseña."); return; }
    setEnviando(true); setErrorForm(""); setOk("");
    try {
      const form = new FormData();
      form.set("tenantId", tenantId); form.set("p12", archivo); form.set("password", clave);
      const res = await fetch("/api/tenant/certificado", { method: "POST", body: form });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d) throw new Error(d?.error ?? "No se pudo actualizar el certificado.");
      setDatos(d); setArchivo(null); setClave("");
      setOk(`Listo: tu certificado se actualizó y ahora vence el ${fecha(d.venceEn)}.`);
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : "No se pudo actualizar el certificado.");
    } finally {
      setEnviando(false);
    }
  }

  const estado = datos?.estado;
  const aviso = estado === "vencido"
    ? { tono: "var(--c-red)", bg: "var(--c-red-bg)", texto: "Tu certificado está vencido: no se pueden firmar ni enviar comprobantes a la DGII hasta que subas el renovado." }
    : estado === "por_vencer"
      ? { tono: "var(--c-yellow)", bg: "var(--c-yellow-bg)", texto: `Tu certificado vence en ${datos?.dias} día${datos?.dias === 1 ? "" : "s"}. Pide la renovación con tu proveedor y súbelo aquí cuando lo recibas, antes de que venza.` }
      : null;

  return (
    <div>
      <PageHeader
        titulo="Certificado digital"
        descripcion="Tu firma digital es lo que permite firmar cada comprobante ante la DGII. Aquí ves cuándo vence y, cuando lo renueves, subes el nuevo."
      />

      {error && <p style={{ fontSize: 13, color: "var(--c-red)", marginBottom: 12 }}>{error}</p>}
      {!datos && !error && <p style={{ fontSize: 13, color: "var(--c-text-3)" }}>Cargando…</p>}

      {datos && !datos.existe && (
        <Card style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>
            Todavía no has cargado un certificado digital. Se sube en el paso de requisitos de tu certificación.
          </p>
        </Card>
      )}

      {datos?.existe && (
        <>
          {aviso && (
            <div style={{ background: aviso.bg, color: aviso.tono, border: `1px solid ${aviso.tono}`, borderRadius: "var(--radius-md)", padding: "12px 14px", fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
              {aviso.texto}
            </div>
          )}

          <Card style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: "var(--c-text-3)" }}>Estado</div>
              {estado === "vencido" ? <Pill tono="danger">Vencido</Pill> : estado === "por_vencer" ? <Pill tono="warning">Por vencer</Pill> : <Pill tono="success">Vigente</Pill>}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 2 }}>Vence el {fecha(datos.venceEn)}</div>
            <div style={{ fontSize: 13, color: "var(--c-text-3)", marginBottom: 16 }}>
              {datos.venceEn == null ? "Fecha no disponible" : estado === "vencido" ? "Ya venció" : `Faltan ${datos.dias} día${datos.dias === 1 ? "" : "s"}`}
            </div>
            <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "8px 18px", fontSize: 13, margin: 0 }}>
              <dt style={{ color: "var(--c-text-3)" }}>Titular</dt><dd style={{ margin: 0, fontWeight: 600 }}>{datos.titular ?? "—"}</dd>
              <dt style={{ color: "var(--c-text-3)" }}>Emitido por</dt><dd style={{ margin: 0, fontWeight: 600 }}>{datos.emisor ?? "—"}</dd>
              <dt style={{ color: "var(--c-text-3)" }}>Válido desde</dt><dd style={{ margin: 0 }}>{fecha(datos.validoDesde)}</dd>
              <dt style={{ color: "var(--c-text-3)" }}>Identificador</dt><dd style={{ margin: 0, fontFamily: "var(--font-mono)" }}>{datos.fingerprint}</dd>
              <dt style={{ color: "var(--c-text-3)" }}>Cargado el</dt><dd style={{ margin: 0 }}>{fecha(datos.subidoEn)}</dd>
              {datos.anterior && (<><dt style={{ color: "var(--c-text-3)" }}>Reemplazó a</dt><dd style={{ margin: 0 }}>{datos.anterior.fingerprint} (el {fecha(datos.anterior.reemplazadoEn)})</dd></>)}
            </dl>
          </Card>

          <Card>
            <h2 style={{ fontSize: 16, margin: "0 0 6px" }}>Renovar mi certificado</h2>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--c-text-2, inherit)", margin: "0 0 14px" }}>
              Cuando renuevas, tu proveedor te entrega un archivo <strong>.p12 nuevo</strong>, con la nueva fecha de vencimiento (el anterior sigue con su fecha vieja).
              Súbelo aquí con su contraseña. Antes de reemplazar el actual comprobamos que la contraseña sea correcta, que sea de tu empresa y que
              realmente sea el renovado. Hasta ese momento sigues usando el anterior.
            </p>
            <p style={{ fontSize: 12, margin: "0 0 14px" }}>
              ¿Todavía no lo has renovado? <a href={LINK_RENOVAR} target="_blank" rel="noopener noreferrer" style={{ color: "var(--c-brand)", fontWeight: 600 }}>Renovar con DigiFirma →</a>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 440 }}>
              <label style={{ fontSize: 12 }}>Archivo del certificado nuevo (.p12 o .pfx)
                <input style={input} type="file" accept=".p12,.pfx" onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); setOk(""); setErrorForm(""); }} />
              </label>
              <label style={{ fontSize: 12 }}>Contraseña del certificado nuevo
                <input style={input} type="password" autoComplete="off" value={clave} onChange={(e) => { setClave(e.target.value); setErrorForm(""); }} />
              </label>
              {errorForm && <p style={{ fontSize: 13, color: "var(--c-red)", margin: 0 }}>{errorForm}</p>}
              {ok && <p style={{ fontSize: 13, color: "var(--c-green)", margin: 0, fontWeight: 600 }}>{ok}</p>}
              <div><Button onClick={renovar} disabled={enviando || !archivo || !clave}>{enviando ? "Verificando…" : "Verificar y actualizar"}</Button></div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
