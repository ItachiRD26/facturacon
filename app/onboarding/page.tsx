"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TIPOS_NEGOCIO } from "@/lib/onboarding/tipos-negocio";
import { resolverECFConfig, calcLinea, calcTotales, fmt, type LineaServicio } from "@/types";
import type { TipoCuenta, TipoNegocio } from "@/types/tenant";

const sans = "var(--font-sans)";
const serif = "var(--font-serif)";

type Paso = 1 | 2 | 3 | 4;

interface RncValidado { valid: boolean; name?: string; rnc?: string; activo?: boolean | null }

function Card({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button onClick={onClick} type="button" style={{
      textAlign: "left", padding: 16, borderRadius: 8, cursor: "pointer",
      border: `2px solid ${active ? "var(--c-brand)" : "var(--c-border)"}`,
      background: active ? "var(--c-brand-bg)" : "var(--c-surface)",
      fontFamily: sans,
    }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>{desc}</div>
    </button>
  );
}

function Boton({ children, onClick, disabled, variant = "primary" }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; variant?: "primary" | "secondary";
}) {
  return (
    <button onClick={onClick} disabled={disabled} type="button" style={{
      padding: "11px 22px", borderRadius: 6, fontSize: 13, fontWeight: 600, fontFamily: sans,
      cursor: disabled ? "not-allowed" : "pointer",
      background: disabled ? "#9ca3af" : variant === "primary" ? "var(--c-brand)" : "var(--c-surface)",
      color: variant === "primary" ? "#fff" : "var(--c-text-1)",
      border: variant === "secondary" ? "1px solid var(--c-border)" : "none",
    }}>
      {children}
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>(1);

  const [tipoCuenta, setTipoCuenta] = useState<TipoCuenta | null>(null);

  const [nombreNegocio, setNombreNegocio] = useState("");
  const [rnc, setRnc] = useState("");
  const [validando, setValidando] = useState(false);
  const [rncValidado, setRncValidado] = useState<RncValidado | null>(null);
  const [rncError, setRncError] = useState("");

  const [tipoNegocio, setTipoNegocio] = useState<TipoNegocio | null>(null);

  const [demoCliente, setDemoCliente] = useState<"con_rnc" | "sin_rnc" | "consumidor">("consumidor");
  const [demoItems, setDemoItems] = useState<LineaServicio[]>([]);
  const [nombreItem, setNombreItem] = useState("");
  const [precioItem, setPrecioItem] = useState("");

  const [creando, setCreando] = useState(false);
  const [errorFinal, setErrorFinal] = useState("");

  const validarRnc = async () => {
    setValidando(true); setRncError(""); setRncValidado(null);
    try {
      const res = await fetch(`/api/validate-rnc?number=${encodeURIComponent(rnc)}`);
      const data = await res.json();
      if (!data.valid) {
        setRncError("No encontramos ese RNC en el padrón de la DGII. Verifica el número.");
      } else {
        setRncValidado(data);
        if (!nombreNegocio) setNombreNegocio(data.name);
      }
    } catch {
      setRncError("No se pudo validar el RNC ahora. Intenta de nuevo.");
    } finally { setValidando(false); }
  };

  const agregarItem = () => {
    const precio = parseFloat(precioItem);
    if (!nombreItem.trim() || isNaN(precio) || precio <= 0) return;
    setDemoItems((prev) => [...prev, {
      codigo: `DEMO${prev.length + 1}`, descripcion: nombreItem.trim(),
      modo: "por_persona", cant: 1, pax: 1, precio, descuentoMonto: 0, itbis: 0.18,
    }]);
    setNombreItem(""); setPrecioItem("");
  };

  const totales = useMemo(() => calcTotales(demoItems), [demoItems]);

  const ecfConfig = useMemo(() => {
    if (demoCliente === "consumidor") return resolverECFConfig(undefined, true, false);
    if (demoCliente === "sin_rnc") return resolverECFConfig({ tipo: "fisica", rnc: "" }, false, false);
    return resolverECFConfig({ tipo: "juridica", subtipo: "regular", rnc: "131880681" }, false, false);
  }, [demoCliente]);

  const tipoInfo = TIPOS_NEGOCIO.find((t) => t.codigo === tipoNegocio);

  const finalizar = async () => {
    setCreando(true); setErrorFinal("");
    try {
      const res = await fetch("/api/onboarding/crear-tenant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoCuenta, nombreNegocio, rnc: rncValidado?.rnc ?? rnc, tipoNegocio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear tu empresa");
      router.push("/panel");
      router.refresh();
    } catch (err) {
      setErrorFinal(err instanceof Error ? err.message : "Error inesperado");
    } finally { setCreando(false); }
  };

  return (
    <main style={{ maxWidth: 720, margin: "48px auto", padding: "0 24px", fontFamily: sans }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
        {[1, 2, 3, 4].map((n) => (
          <div key={n} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: n <= paso ? "var(--c-brand)" : "var(--c-border)",
          }} />
        ))}
      </div>

      {paso === 1 && (
        <section>
          <h1 style={{ fontFamily: serif, fontSize: "1.5rem", marginBottom: 8 }}>¿Cómo vas a usar Facturacon?</h1>
          <p style={{ color: "var(--c-text-3)", fontSize: 13, marginBottom: 20 }}>
            Cada empresa que gestiones hace su propio proceso de certificación, con su propio
            subdominio — esta elección solo cambia si puedes administrar varias.
          </p>
          <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
            <Card active={tipoCuenta === "individual"} onClick={() => setTipoCuenta("individual")}
              title="Solo mi empresa" desc="Esta cuenta va a estar ligada a un único negocio, de forma permanente." />
            <Card active={tipoCuenta === "gestor"} onClick={() => setTipoCuenta("gestor")}
              title="Soy gestor o contable" desc="Quiero poder administrar la facturación de varias empresas desde esta misma cuenta." />
          </div>
          <Boton onClick={() => setPaso(2)} disabled={!tipoCuenta}>Continuar</Boton>
        </section>
      )}

      {paso === 2 && (
        <section>
          <h1 style={{ fontFamily: serif, fontSize: "1.5rem", marginBottom: 8 }}>Datos de tu empresa</h1>
          <p style={{ color: "var(--c-text-3)", fontSize: 13, marginBottom: 20 }}>
            Verificamos el RNC contra el padrón público de la DGII.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", marginBottom: 5 }}>RNC</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={rnc} onChange={(e) => { setRnc(e.target.value); setRncValidado(null); }}
                  placeholder="131217656" style={{ flex: 1, padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
                <Boton variant="secondary" onClick={validarRnc} disabled={!rnc.trim() || validando}>
                  {validando ? "Validando..." : "Validar"}
                </Boton>
              </div>
              {rncError && <div style={{ marginTop: 6, fontSize: 12, color: "#991b1b" }}>{rncError}</div>}
              {rncValidado?.valid && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#166534" }}>
                  ✓ {rncValidado.name} — estado: {rncValidado.activo ? "Activo" : "no activo"}
                </div>
              )}
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", marginBottom: 5 }}>Nombre del negocio</label>
              <input value={nombreNegocio} onChange={(e) => setNombreNegocio(e.target.value)}
                placeholder="Mi Negocio SRL" style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Boton variant="secondary" onClick={() => setPaso(1)}>Atrás</Boton>
            <Boton onClick={() => setPaso(3)} disabled={!rncValidado?.valid || !nombreNegocio.trim()}>Continuar</Boton>
          </div>
        </section>
      )}

      {paso === 3 && (
        <section>
          <h1 style={{ fontFamily: serif, fontSize: "1.5rem", marginBottom: 8 }}>¿Qué tipo de negocio tienes?</h1>
          <p style={{ color: "var(--c-text-3)", fontSize: 13, marginBottom: 20 }}>
            Esto nos ayuda a mostrarte el sistema configurado de forma relevante para ti.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 20 }}>
            {TIPOS_NEGOCIO.map((t) => (
              <Card key={t.codigo} active={tipoNegocio === t.codigo} onClick={() => setTipoNegocio(t.codigo)}
                title={t.label} desc={t.disponible ? "Disponible" : "Próximamente"} />
            ))}
          </div>
          {tipoInfo && !tipoInfo.disponible && (
            <div style={{ padding: 14, background: "var(--c-yellow-bg)", border: "1px solid var(--c-yellow-border)", borderRadius: 6, fontSize: 13, marginBottom: 20 }}>
              El módulo para <strong>{tipoInfo.label}</strong> todavía no está disponible (necesita gestión de
              reservas y no aplica al sistema genérico). {" "}
              <a href="mailto:contacto@facturacon.cfd" style={{ color: "var(--c-brand)", fontWeight: 600 }}>
                Contáctanos para una solución personalizada
              </a>.
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <Boton variant="secondary" onClick={() => setPaso(2)}>Atrás</Boton>
            <Boton onClick={() => setPaso(4)} disabled={!tipoNegocio || !tipoInfo?.disponible}>Continuar</Boton>
          </div>
        </section>
      )}

      {paso === 4 && (
        <section>
          <h1 style={{ fontFamily: serif, fontSize: "1.5rem", marginBottom: 8 }}>Pruébalo antes de seguir</h1>
          <p style={{ color: "var(--c-text-3)", fontSize: 13, marginBottom: 20 }}>
            Esto es solo una demo en tu navegador — nada de esto se guarda. Agrega un producto o
            servicio de ejemplo y mira cómo el sistema decide qué tipo de comprobante fiscal aplica
            según el cliente.
          </p>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", marginBottom: 8 }}>Tipo de cliente (demo)</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {([
                ["consumidor", "Consumidor final"],
                ["sin_rnc", "Persona sin RNC"],
                ["con_rnc", "Empresa con RNC"],
              ] as const).map(([v, label]) => (
                <button key={v} type="button" onClick={() => setDemoCliente(v)} style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${demoCliente === v ? "var(--c-brand)" : "var(--c-border)"}`,
                  background: demoCliente === v ? "var(--c-brand-bg)" : "var(--c-surface)",
                }}>{label}</button>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--c-text-3)" }}>
              → Se emitiría un <strong>{ecfConfig.tipoDefault}</strong> ({ecfConfig.motivo})
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", marginBottom: 8 }}>
              Agregar producto/servicio de ejemplo
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={nombreItem} onChange={(e) => setNombreItem(e.target.value)} placeholder="Ej. Consultoría, tornillos, etc."
                style={{ flex: 2, padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
              <input value={precioItem} onChange={(e) => setPrecioItem(e.target.value)} placeholder="Precio RD$" type="number"
                style={{ flex: 1, padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }} />
              <Boton variant="secondary" onClick={agregarItem}>Agregar</Boton>
            </div>
          </div>

          {demoItems.length > 0 && (
            <div style={{ border: "1px solid var(--c-border)", borderRadius: 6, overflow: "hidden", marginBottom: 20 }}>
              {demoItems.map((item, i) => {
                const c = calcLinea(item);
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--c-border-lt)", fontSize: 13 }}>
                    <span>{item.descripcion}</span>
                    <span>RD$ {fmt(c.total)}</span>
                  </div>
                );
              })}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "var(--c-bg)", fontSize: 13, fontWeight: 700 }}>
                <span>Total estimado</span>
                <span>RD$ {fmt(totales.total)}</span>
              </div>
            </div>
          )}

          {errorFinal && (
            <div style={{ padding: "9px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 4, fontSize: 12, color: "#991b1b", marginBottom: 12 }}>
              {errorFinal}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <Boton variant="secondary" onClick={() => setPaso(3)}>Atrás</Boton>
            <Boton onClick={finalizar} disabled={creando}>
              {creando ? "Creando tu empresa..." : "Me gusta, continuar"}
            </Boton>
          </div>
        </section>
      )}
    </main>
  );
}
