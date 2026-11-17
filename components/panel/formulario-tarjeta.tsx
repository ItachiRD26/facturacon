"use client";

import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { Lock, CreditCard, Warning } from "@phosphor-icons/react/dist/ssr";
import {
  detectarMarca, formatearNumero, formatearTelefono, formatearVencimiento, longitudCvv, longitudNumero, marcaRechazada, NOMBRE_MARCA,
  filtrarTitular, LIMITES_PAGADITO, numeroValido, TEXTO_MARCAS_ACEPTADAS, parseVencimiento, PROVINCIAS_RD, separarNombre, soloDigitos, telefonoValido, type MarcaTarjeta,
} from "@/lib/payments/tarjeta";

// Formulario de la tarjeta del asistente de pago: vista previa de la tarjeta en vivo, formato mientras se escribe
// (número en grupos, vencimiento MM/AA), salto automático al siguiente campo al completar cada dato y
// validación clara (Luhn, vencimiento vigente, teléfono). El número se guarda solo con dígitos.
export interface FormTarjeta {
  numero: string; venc: string; cvv: string; nombreTitular: string;
  nombre: string; apellido: string; email: string; telefono: string; direccion: string; ciudad: string; provincia: string;
}
export const FORM_TARJETA_VACIO: FormTarjeta = {
  numero: "", venc: "", cvv: "", nombreTitular: "", nombre: "", apellido: "", email: "", telefono: "", direccion: "", ciudad: "", provincia: "",
};

/** Errores de cada campo (vacío = bien). Se muestran solo después de que la persona toca el campo. */
export function erroresTarjeta(f: FormTarjeta): Partial<Record<keyof FormTarjeta, string>> {
  const marca = detectarMarca(f.numero);
  const e: Partial<Record<keyof FormTarjeta, string>> = {};
  if (!numeroValido(f.numero)) {
    e.numero = marcaRechazada(f.numero) ? `${TEXTO_MARCAS_ACEPTADAS}. Usa otra tarjeta.`
      : soloDigitos(f.numero).length < longitudNumero(marca) ? "Escribe el número completo de la tarjeta" : "Revisa el número: no parece válido";
  }
  if (!parseVencimiento(f.venc)) e.venc = soloDigitos(f.venc).length < 4 ? "Escribe MM/AA" : "Fecha inválida o tarjeta vencida";
  if (soloDigitos(f.cvv).length !== longitudCvv(marca)) e.cvv = `${longitudCvv(marca)} dígitos`;
  if (f.nombreTitular.trim().length < 3) e.nombreTitular = "Escribe el nombre como sale en la tarjeta";
  if (!f.nombre.trim()) e.nombre = "Requerido";
  if (!f.apellido.trim()) e.apellido = "Requerido";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "Escribe un correo válido";
  if (!telefonoValido(f.telefono)) e.telefono = "10 dígitos, ej. 809 555 5555";
  if (!f.direccion.trim()) e.direccion = "Requerido";
  if (!f.ciudad.trim()) e.ciudad = "Requerido";
  if (!f.provincia) e.provincia = "Elige una provincia";
  return e;
}

const NAVY = "linear-gradient(135deg, #0F1A30 0%, #1B2A52 55%, #2540D9 130%)";

function MarcaLogo({ marca }: { marca: MarcaTarjeta }) {
  if (marca === "mastercard") {
    return (
      <span aria-label="Mastercard" style={{ display: "inline-flex" }}>
        <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#EB001B", opacity: 0.95 }} />
        <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#F79E1B", marginLeft: -10, opacity: 0.95, mixBlendMode: "screen" }} />
      </span>
    );
  }
  const texto = marca === "visa" ? "VISA" : marca === "amex" ? "AMEX" : marca === "discover" ? "DISCOVER" : "";
  return <span style={{ fontSize: marca === "visa" ? 20 : 13, fontWeight: 800, fontStyle: marca === "visa" ? "italic" : "normal", letterSpacing: marca === "visa" ? 0.5 : 1.2 }}>{texto}</span>;
}

function VistaTarjeta({ f, marca }: { f: FormTarjeta; marca: MarcaTarjeta }) {
  const largo = longitudNumero(marca);
  const digitos = soloDigitos(f.numero).padEnd(largo, "•");
  const grupos = marca === "amex" ? [digitos.slice(0, 4), digitos.slice(4, 10), digitos.slice(10, 15)] : digitos.match(/.{1,4}/g) ?? [];
  return (
    <div aria-hidden="true" style={{
      position: "relative", overflow: "hidden", width: "100%", maxWidth: 340, aspectRatio: "1.586", borderRadius: 16, padding: "18px 20px",
      background: NAVY, color: "#fff", boxShadow: "0 10px 24px rgba(15,26,48,.28)", display: "flex", flexDirection: "column", justifyContent: "space-between",
    }}>
      <span style={{ position: "absolute", right: -50, top: -60, width: 190, height: 190, borderRadius: "50%", background: "rgba(255,255,255,.07)" }} />
      <span style={{ position: "absolute", right: 30, bottom: -90, width: 190, height: 190, borderRadius: "50%", background: "rgba(245,198,52,.10)" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
        <span style={{ width: 38, height: 28, borderRadius: 6, background: "linear-gradient(135deg, #F5D77A, #C99A2E)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.18)" }} />
        <span style={{ minHeight: 26, display: "inline-flex", alignItems: "center" }}><MarcaLogo marca={marca} /></span>
      </div>
      <div className="num-sans" style={{ position: "relative", fontFamily: "Consolas, 'Courier New', monospace", fontSize: 19, letterSpacing: 2, textShadow: "0 1px 2px rgba(0,0,0,.35)", display: "flex", gap: 10 }}>
        {grupos.map((g, i) => <span key={i}>{g}</span>)}
      </div>
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 8.5, opacity: 0.7, letterSpacing: 1 }}>TITULAR</div>
          <div style={{ fontWeight: 600, letterSpacing: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 190 }}>{f.nombreTitular.trim() || "NOMBRE APELLIDO"}</div>
        </div>
        <div>
          <div style={{ fontSize: 8.5, opacity: 0.7, letterSpacing: 1 }}>VENCE</div>
          <div className="num-sans" style={{ fontWeight: 600, letterSpacing: 0.6 }}>{f.venc || "MM/AA"}</div>
        </div>
      </div>
    </div>
  );
}

function Campo({ id, label, error, ayuda, children }: { id: string; label: string; error?: string; ayuda?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--c-text-2)", marginBottom: 5 }}>{label}</label>
      {children}
      {error
        ? <div id={`${id}-err`} role="alert" style={{ fontSize: 11.5, color: "var(--c-red)", marginTop: 4 }}>{error}</div>
        : ayuda ? <div style={{ fontSize: 11.5, color: "var(--c-text-3)", marginTop: 4 }}>{ayuda}</div> : null}
    </div>
  );
}

const base = (malo: boolean): React.CSSProperties => ({
  width: "100%", padding: "11px 12px", fontSize: 14.5, borderRadius: 9, background: "#fff", color: "var(--c-text-1)", fontFamily: "var(--font-sans)",
  border: `1.5px solid ${malo ? "var(--c-red)" : "var(--c-border)"}`, outline: "none",
});

function ChipMarca({ children }: { children: ReactNode }) {
  return <span style={{ display: "inline-flex", alignItems: "center", height: 26, padding: "0 9px", border: "1px solid var(--c-border)", borderRadius: 6, background: "#fff" }}>{children}</span>;
}

/** Franja de confianza: quién procesa el pago y qué tarjetas se aceptan. */
function FranjaPagadito() {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 14px", borderRadius: 12, background: "#fff", border: "1px solid var(--c-border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Lock size={16} weight="bold" color="var(--c-green)" aria-hidden="true" />
        <div style={{ lineHeight: 1.25 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text-3)", letterSpacing: 0.3 }}>PAGO SEGURO PROCESADO POR</div>
          <Image src="/marca/pagadito/pagadito-logo.png" alt="Pagadito" width={92} height={18} priority />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11.5, color: "var(--c-text-3)" }}>Aceptamos</span>
        <ChipMarca><span style={{ fontSize: 14, fontWeight: 800, fontStyle: "italic", color: "#1A1F71", letterSpacing: 0.3 }}>VISA</span></ChipMarca>
        <ChipMarca>
          <span aria-label="Mastercard" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-flex" }}>
              <span style={{ width: 15, height: 15, borderRadius: "50%", background: "#EB001B" }} />
              <span style={{ width: 15, height: 15, borderRadius: "50%", background: "#F79E1B", marginLeft: -6, mixBlendMode: "multiply" }} />
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text-2)" }}>Mastercard</span>
          </span>
        </ChipMarca>
      </div>
    </div>
  );
}

export default function FormularioTarjeta({ valor, onCambio, deshabilitado }: {
  valor: FormTarjeta; onCambio: (f: FormTarjeta) => void; deshabilitado?: boolean;
}) {
  const [tocados, setTocados] = useState<Partial<Record<keyof FormTarjeta, boolean>>>({});
  const refNumero = useRef<HTMLInputElement>(null);
  const refVenc = useRef<HTMLInputElement>(null);
  const refCvv = useRef<HTMLInputElement>(null);
  const refTitular = useRef<HTMLInputElement>(null);
  const marca = detectarMarca(valor.numero);
  const rechazada = marcaRechazada(valor.numero);
  const errores = erroresTarjeta(valor);
  const cambiar = (parche: Partial<FormTarjeta>) => onCambio({ ...valor, ...parche });
  const tocar = (k: keyof FormTarjeta) => setTocados((t) => (t[k] ? t : { ...t, [k]: true }));
  const err = (k: keyof FormTarjeta) => (tocados[k] || (k === "numero" && rechazada) ? errores[k] : undefined);
  const saltar = (r: React.RefObject<HTMLInputElement | null>) => setTimeout(() => r.current?.focus(), 0);

  return (
    <fieldset disabled={deshabilitado} style={{ border: "none", padding: 0, margin: 0, minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
      <FranjaPagadito />
      <div style={{ display: "flex", justifyContent: "center" }}><VistaTarjeta f={valor} marca={marca} /></div>

      <section aria-label="Datos de la tarjeta" style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--c-text-3)" }}>
          <CreditCard size={15} weight="bold" aria-hidden="true" /> Tarjeta
        </div>

        <Campo id="tj-numero" label="Número de tarjeta" error={err("numero")}>
          <div style={{ position: "relative" }}>
            <input
              id="tj-numero" ref={refNumero} inputMode="numeric" autoComplete="cc-number" placeholder="Visa o Mastercard"
              value={formatearNumero(valor.numero)} aria-invalid={!!err("numero")} aria-describedby={err("numero") ? "tj-numero-err" : undefined}
              className="num-sans" style={{ ...base(!!err("numero")), paddingRight: 110, letterSpacing: 1 }}
              onChange={(e) => {
                const d = soloDigitos(e.target.value);
                const m = detectarMarca(d);
                const completo = d.slice(0, longitudNumero(m));
                cambiar({ numero: completo });
                if (completo.length === longitudNumero(m)) { tocar("numero"); if (numeroValido(completo)) saltar(refVenc); }
              }}
              onBlur={() => tocar("numero")}
            />
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: rechazada ? "var(--c-red)" : marca === "desconocida" ? "var(--c-text-4)" : "var(--c-brand)", pointerEvents: "none" }}>
              {rechazada ? "No aceptada" : NOMBRE_MARCA[marca] || "Visa · Mastercard"}
            </span>
          </div>
        </Campo>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Campo id="tj-venc" label="Vencimiento" error={err("venc")}>
            <input
              id="tj-venc" ref={refVenc} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" maxLength={5}
              value={valor.venc} aria-invalid={!!err("venc")} className="num-sans" style={base(!!err("venc"))}
              onKeyDown={(e) => { if (e.key === "Backspace" && e.currentTarget.value === "") refNumero.current?.focus(); }}
              onChange={(e) => {
                const borrando = e.target.value.length < valor.venc.length;
                const f = formatearVencimiento(e.target.value, borrando);
                cambiar({ venc: f });
                if (soloDigitos(f).length === 4) { tocar("venc"); if (parseVencimiento(f)) saltar(refCvv); }
              }}
              onBlur={() => tocar("venc")}
            />
          </Campo>
          <Campo id="tj-cvv" label={marca === "amex" ? "Código (4 dígitos)" : "Código de seguridad (CVV)"} error={err("cvv")}>
            <input
              id="tj-cvv" ref={refCvv} inputMode="numeric" autoComplete="cc-csc" placeholder={marca === "amex" ? "1234" : "123"} type="password"
              value={valor.cvv} aria-invalid={!!err("cvv")} className="num-sans" style={base(!!err("cvv"))}
              onKeyDown={(e) => { if (e.key === "Backspace" && e.currentTarget.value === "") refVenc.current?.focus(); }}
              onChange={(e) => {
                const d = soloDigitos(e.target.value).slice(0, longitudCvv(marca));
                cambiar({ cvv: d });
                if (d.length === longitudCvv(marca)) { tocar("cvv"); saltar(refTitular); }
              }}
              onBlur={() => tocar("cvv")}
            />
          </Campo>
        </div>

        <Campo id="tj-titular" label="Nombre en la tarjeta" error={err("nombreTitular")}>
          <input
            id="tj-titular" ref={refTitular} autoComplete="cc-name" placeholder="NOMBRE APELLIDO"
            value={valor.nombreTitular} aria-invalid={!!err("nombreTitular")} style={{ ...base(!!err("nombreTitular")), textTransform: "uppercase" }}
            onKeyDown={(e) => { if (e.key === "Backspace" && e.currentTarget.value === "") refCvv.current?.focus(); }}
            maxLength={LIMITES_PAGADITO.titular}
            onChange={(e) => cambiar({ nombreTitular: filtrarTitular(e.target.value) })}
            onBlur={() => {
              tocar("nombreTitular");
              // Precarga nombre y apellido de facturación con lo que escribió, si aún están vacíos.
              if (!valor.nombre && !valor.apellido && valor.nombreTitular.trim()) cambiar(separarNombre(valor.nombreTitular));
            }}
          />
        </Campo>
      </section>

      <section aria-label="Datos de facturación" style={{ display: "flex", flexDirection: "column", gap: 13, paddingTop: 16, borderTop: "1px solid var(--c-border-lt)" }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--c-text-3)" }}>Datos de facturación</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Campo id="tj-nombre" label="Nombre" error={err("nombre")}>
            <input id="tj-nombre" maxLength={LIMITES_PAGADITO.nombre} autoComplete="given-name" value={valor.nombre} aria-invalid={!!err("nombre")} style={base(!!err("nombre"))} onChange={(e) => cambiar({ nombre: e.target.value })} onBlur={() => tocar("nombre")} />
          </Campo>
          <Campo id="tj-apellido" label="Apellido" error={err("apellido")}>
            <input id="tj-apellido" maxLength={LIMITES_PAGADITO.apellido} autoComplete="family-name" value={valor.apellido} aria-invalid={!!err("apellido")} style={base(!!err("apellido"))} onChange={(e) => cambiar({ apellido: e.target.value })} onBlur={() => tocar("apellido")} />
          </Campo>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 12 }}>
          <Campo id="tj-email" label="Correo" error={err("email")} ayuda="Aquí llegan tus recibos">
            <input id="tj-email" type="email" maxLength={LIMITES_PAGADITO.email} autoComplete="email" inputMode="email" placeholder="tucorreo@ejemplo.com" value={valor.email} aria-invalid={!!err("email")} style={base(!!err("email"))} onChange={(e) => cambiar({ email: e.target.value })} onBlur={() => tocar("email")} />
          </Campo>
          <Campo id="tj-tel" label="Teléfono" error={err("telefono")}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--c-text-3)", pointerEvents: "none" }}>+1</span>
              <input id="tj-tel" type="tel" autoComplete="tel-national" inputMode="tel" placeholder="809 555 5555" value={valor.telefono} aria-invalid={!!err("telefono")} className="num-sans"
                style={{ ...base(!!err("telefono")), paddingLeft: 34 }} onChange={(e) => cambiar({ telefono: formatearTelefono(e.target.value) })} onBlur={() => tocar("telefono")} />
            </div>
          </Campo>
        </div>
        <Campo id="tj-dir" label="Dirección" error={err("direccion")}>
          <input id="tj-dir" maxLength={LIMITES_PAGADITO.direccion} autoComplete="address-line1" placeholder="Calle, número, sector" value={valor.direccion} aria-invalid={!!err("direccion")} style={base(!!err("direccion"))} onChange={(e) => cambiar({ direccion: e.target.value })} onBlur={() => tocar("direccion")} />
        </Campo>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Campo id="tj-ciudad" label="Ciudad" error={err("ciudad")}>
            <input id="tj-ciudad" maxLength={LIMITES_PAGADITO.ciudad} autoComplete="address-level2" placeholder="Santo Domingo" value={valor.ciudad} aria-invalid={!!err("ciudad")} style={base(!!err("ciudad"))} onChange={(e) => cambiar({ ciudad: e.target.value })} onBlur={() => tocar("ciudad")} />
          </Campo>
          <Campo id="tj-prov" label="Provincia" error={err("provincia")}>
            <select id="tj-prov" autoComplete="address-level1" value={valor.provincia} aria-invalid={!!err("provincia")} style={{ ...base(!!err("provincia")), cursor: "pointer" }} onChange={(e) => { cambiar({ provincia: e.target.value }); tocar("provincia"); }}>
              <option value="">Elige…</option>
              {PROVINCIAS_RD.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Campo>
        </div>
      </section>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 11.5, lineHeight: 1.5, color: "var(--c-text-3)" }}>
        <Lock size={15} weight="bold" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
        <span>Solo se aceptan tarjetas Visa y Mastercard (crédito o débito). Tu tarjeta viaja cifrada hasta Pagadito y Facturacon no la guarda: solo conserva un código seguro y los últimos 4 dígitos.</span>
      </div>
    </fieldset>
  );
}

export function AvisoError({ texto }: { texto: string }) {
  return (
    <div role="alert" style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", borderRadius: 9, fontSize: 12.5, lineHeight: 1.5, background: "var(--c-red-bg)", border: "1px solid var(--c-red-border)", color: "var(--c-red)" }}>
      <Warning size={16} weight="bold" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}
