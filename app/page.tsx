import Link from "next/link";
import Image from "next/image";
import SiteHeader from "@/components/marketing/site-header";
import SiteFooter from "@/components/marketing/site-footer";
import VideoTutorial from "@/components/marketing/video-tutorial";
import NegociosSection from "@/components/marketing/negocios-section";
import PagaditoBadge from "@/components/marketing/pagadito-badge";
import BeneficiosStrip from "@/components/marketing/beneficios-strip";
import TrustStrip from "@/components/marketing/trust-strip";
import FaqAccordion from "@/components/marketing/faq-accordion";
import PricingCalculator from "@/components/marketing/pricing-calculator";
import { PLANES } from "@/lib/payments/planes";
import { ETAPAS } from "@/lib/tenant/jornada";
import { registroAbierto } from "@/lib/registro";
import TicketHero from "@/components/marketing/ticket-hero";

const faqs = [
  {
    q: "¿Qué es exactamente Facturacon?",
    a: "Una plataforma que te certifica como emisor electrónico ante la DGII y te da un sistema de facturación funcional desde el primer día, sin que tengas que contratar un desarrollador ni montar infraestructura propia.",
  },
  {
    q: "¿Necesito saber de tecnología para certificarme?",
    a: "No. Te vamos guiando paso a paso por todo lo que la DGII exige (firma digital, Oficina Virtual, cédula del representante activa) con instrucciones, enlaces y capturas. Lo técnico — construir y firmar los XML, hablar con los servidores de la DGII — lo hacemos nosotros.",
  },
  {
    q: "¿Qué necesito tener antes de empezar?",
    a: "Tu empresa registrada en la Oficina Virtual de la DGII, y tu certificado de firma digital (.p12) emitido por una entidad autorizada (ej. DigiFirma). Si no los tienes todavía, te explicamos cómo conseguirlos.",
  },
  {
    q: "¿Puedo probar el sistema antes de pagar nada?",
    a: "Sí. Antes de pagar o certificarte, entras a un entorno de prueba con el sistema completo: clientes, inventario, cotizaciones, facturas, facturas recibidas e impresión en formato A4 y térmica, todo con datos de ejemplo y comprobantes simulados — para que veas exactamente cómo se vería tu negocio facturando.",
  },
  {
    q: "¿Cuánto cuesta?",
    a: "La certificación como emisor electrónico es completamente gratis. Solo pagas una suscripción mensual, según cuántos comprobantes electrónicos emitas, y únicamente a partir de que ya estés certificado y facturando de verdad — no antes. Ve la sección de Precios arriba.",
  },
  {
    q: "¿Sirve para mi tipo de negocio?",
    a: "El sistema base funciona para ferreterías, farmacias, colmados, restaurantes, salones, talleres, clínicas, consultoras y la mayoría de negocios que venden productos o servicios. Si tu negocio tiene necesidades muy particulares (ej. hoteles con gestión de reservas) contáctanos para evaluar una solución a medida.",
  },
];

const resolvemos = [
  { t: "Sin desarrollar nada", d: "No necesitas construir ni mantener tu propio software de facturación electrónica." },
  { t: "Sin perder semanas", d: "El proceso de certificación de la DGII tiene 13 pasos técnicos. Te los manejamos nosotros." },
  { t: "Pruébalo antes de pagar", d: "Usa el sistema completo con datos de ejemplo antes de comprometerte con nada." },
  { t: "Listo en un día", d: "Una vez certificado, tu sistema queda funcionando de inmediato en tu propio dominio." },
];

const boton = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  padding: "14px 26px", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: 15, textDecoration: "none",
} as const;

export default function LandingPage() {
  // Con el registro cerrado, todos los botones llevan a la lista de espera.
  const cta = registroAbierto() ? "Crear mi cuenta" : "Unirme a la lista de espera";
  return (
    <>
      <SiteHeader />
      <main style={{ fontFamily: "var(--font-sans)", color: "var(--c-text-1)" }}>
        {/* Hero: titular a la izquierda, y a la derecha el comprobante que dice lo
            que cuesta empezar. Sin degradés ni efectos: el ticket es el momento. */}
        <section style={{ padding: "72px 24px 88px", maxWidth: 1120, margin: "0 auto" }}>
          <div className="hero-grid">
            <div>
              <h1 style={{
                fontWeight: 800, fontSize: "clamp(2.4rem, 5.2vw, 4.1rem)", lineHeight: 1.03,
                letterSpacing: "-0.035em", marginBottom: 24, maxWidth: 640,
              }}>
                Certifícate gratis ante la DGII y empieza a facturar
              </h1>
              <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--c-text-2)", maxWidth: 520, marginBottom: 36 }}>
                Te llevamos de la mano por los 13 pasos del portal, nos encargamos de lo técnico y te
                entregamos un sistema de facturación listo para usar. La mensualidad empieza cuando
                ya estés certificado.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <Link href="/registro" style={{ ...boton, background: "var(--c-brand)", color: "#fff" }}>
                  {cta}
                </Link>
                <a href="#como-funciona" style={{ ...boton, color: "var(--c-text-1)", border: "1px solid var(--c-border)", background: "var(--c-surface)", fontWeight: 600 }}>
                  Ver cómo funciona
                </a>
              </div>
            </div>
            <TicketHero />
          </div>
        </section>

        <BeneficiosStrip />

        <VideoTutorial />

        {/* Qué resolvemos: afirmación a la izquierda, cuatro razones a la derecha
            separadas por filetes. No son un proceso, así que no van numeradas. */}
        <section style={{ padding: "24px 24px 80px", maxWidth: 1040, margin: "0 auto" }}>
          <div className="resolvemos-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)", gap: 56, alignItems: "start" }}>
            <h2 style={{ fontWeight: 800, fontSize: "clamp(1.7rem, 3.4vw, 2.5rem)", lineHeight: 1.1 }}>
              La certificación de emisor electrónico no es trivial. Nosotros nos encargamos.
            </h2>
            <div>
              {resolvemos.map((r, i) => (
                <div key={r.t} style={{ padding: "20px 0", borderTop: i === 0 ? "2px solid var(--c-text-1)" : "1px solid var(--c-border)" }}>
                  <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{r.t}</div>
                  <div style={{ fontSize: 14.5, color: "var(--c-text-3)", lineHeight: 1.6 }}>{r.d}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Así se ve por dentro: vistas del sistema con datos de ejemplo, generadas
            desde scripts/landing-imagenes (se regeneran con render.sh). Cuando haya
            capturas del sistema real con datos reales, reemplazan estos PNG. */}
        <section style={{ padding: "16px 24px 72px", maxWidth: 1120, margin: "0 auto" }}>
          <h2 style={{ fontWeight: 800, fontSize: "clamp(1.8rem, 3.6vw, 2.5rem)", marginBottom: 10 }}>
            Así se ve por dentro
          </h2>
          <p style={{ color: "var(--c-text-3)", fontSize: 15, maxWidth: 520, marginBottom: 48, lineHeight: 1.6 }}>
            Vistas del sistema con datos de ejemplo.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 64 }}>
            {[
              { titulo: "Tu negocio de un vistazo", descripcion: "Lo facturado, lo que te deben y cuántos comprobantes llevas del plan, sin armar reportes.", src: "/landing/dashboard.png", alt: "Dashboard de Facturacon con facturado del mes, por cobrar, comprobantes emitidos, gráfico diario y últimos comprobantes aceptados por la DGII" },
              { titulo: "Factura con código QR", descripcion: "Comprobante fiscal electrónico firmado, listo para imprimir en hoja A4 o en ticket térmico.", src: "/landing/factura.png", alt: "Factura de crédito fiscal electrónica en formato A4 y en ticket térmico, con código QR y código de seguridad" },
              { titulo: "Inventario con códigos de barra", descripcion: "Productos con control de stock, etiquetas para imprimir y escaneo directo en la factura.", src: "/landing/inventario.png", alt: "Lista de inventario con códigos de barra, stock y etiqueta imprimible del producto seleccionado" },
            ].map((x) => (
              <figure key={x.titulo} style={{ margin: 0 }}>
                <figcaption style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: "1.35rem", letterSpacing: "-0.02em", marginBottom: 6 }}>{x.titulo}</div>
                  <div style={{ fontSize: 15, color: "var(--c-text-3)", lineHeight: 1.6, maxWidth: 560 }}>{x.descripcion}</div>
                </figcaption>
                <Image src={x.src} alt={x.alt} width={2400} height={1520} sizes="(max-width: 1120px) 100vw, 1072px"
                  style={{ width: "100%", height: "auto", display: "block", marginInline: -2 }} />
              </figure>
            ))}
          </div>
        </section>

        <TrustStrip />

        <NegociosSection />

        {/* Cómo funciona: este SÍ es un proceso, por eso va numerado. Las cinco
            etapas salen de lib/tenant/jornada.ts, la misma fuente que usa el panel,
            para que la landing y el producto cuenten el mismo camino. */}
        <section id="como-funciona" style={{ padding: "80px 24px", background: "var(--c-navy)" }}>
          <div style={{ maxWidth: 1040, margin: "0 auto" }}>
            <h2 style={{ fontWeight: 800, fontSize: "clamp(1.8rem, 3.6vw, 2.6rem)", color: "#fff", maxWidth: 560, lineHeight: 1.1, marginBottom: 12 }}>
              De crear tu cuenta a tu primera factura real
            </h2>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 15, maxWidth: 520, marginBottom: 48, lineHeight: 1.6 }}>
              Pagas solo al final, cuando la DGII ya te autorizó.
            </p>
            <ol style={{ listStyle: "none", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 0 }}>
              {ETAPAS.map((e, i) => (
                <li key={e.id} style={{ padding: "0 22px 0 0", borderTop: "3px solid " + (e.id === "certificacion" ? "var(--c-stamp)" : "rgba(255,255,255,0.22)"), paddingTop: 18, marginRight: 22 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--c-ticket)", marginBottom: 10 }}>{String(i + 1).padStart(2, "0")}</div>
                  <div style={{ fontWeight: 700, fontSize: 17, color: "#fff", marginBottom: 6 }}>{e.titulo}</div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.68)", lineHeight: 1.55 }}>{e.detalle}</div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Precios — calculadora en vez de una fila de tarjetas: ancla el
            precio más bajo arriba y deja que el usuario vea exactamente su
            plan según su propio volumen. */}
        <section id="precios" style={{ padding: "72px 24px", maxWidth: 1040, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontWeight: 800, fontSize: "clamp(1.8rem, 3.6vw, 2.5rem)", marginBottom: 12 }}>
            Desde RD$ {PLANES[0].montoRD.toLocaleString("es-DO")} al mes
          </h2>
          <p style={{ color: "var(--c-text-2)", fontSize: 16, lineHeight: 1.6, maxWidth: 560, margin: "0 auto 40px" }}>
            La certificación como emisor electrónico es gratis. Pagas una sola suscripción
            mensual según cuántos comprobantes emitas, y solo empieza a cobrarse una vez que
            estés certificado y facturando de verdad.
          </p>

          <PricingCalculator />

          <div style={{ marginTop: 28 }}>
            <PagaditoBadge />
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" style={{ padding: "72px 24px", background: "var(--c-surface)", borderTop: "1px solid var(--c-border)" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <h2 style={{ fontWeight: 800, fontSize: "1.9rem", textAlign: "center", marginBottom: 32 }}>
              Preguntas frecuentes
            </h2>
            <FaqAccordion faqs={faqs} />
          </div>
        </section>

        {/* CTA final */}
        <section style={{ padding: "72px 24px", maxWidth: 960, margin: "0 auto" }}>
          <div style={{
            background: "var(--c-navy)", borderRadius: 16, padding: "56px 28px", textAlign: "center",
          }}>
            <h2 style={{ fontWeight: 800, fontSize: "clamp(1.6rem, 3vw, 2.1rem)", marginBottom: 24, color: "#fff", maxWidth: 520, marginInline: "auto", lineHeight: 1.15 }}>
              ¿Listo para certificarte como emisor electrónico?
            </h2>
            <Link href="/registro" style={{ ...boton, background: "#fff", color: "var(--c-navy)" }}>
              {cta}
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
