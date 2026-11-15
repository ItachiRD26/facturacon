import Link from "next/link";
import Image from "next/image";
import SiteHeader from "@/components/marketing/site-header";
import SiteFooter from "@/components/marketing/site-footer";
import Seccion from "@/components/marketing/seccion";
import VideoTutorial from "@/components/marketing/video-tutorial";
import NegociosSection from "@/components/marketing/negocios-section";
import PagaditoBadge from "@/components/marketing/pagadito-badge";
import BeneficiosStrip from "@/components/marketing/beneficios-strip";
import TrustStrip from "@/components/marketing/trust-strip";
import FaqAccordion from "@/components/marketing/faq-accordion";
import PricingCalculator from "@/components/marketing/pricing-calculator";
import TicketHero from "@/components/marketing/ticket-hero";
import { PLANES } from "@/lib/payments/planes";
import { ETAPAS } from "@/lib/tenant/jornada";
import { registroAbierto } from "@/lib/registro";

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

const vistas = [
  { titulo: "Tu negocio de un vistazo", descripcion: "Lo facturado, lo que te deben y cuántos comprobantes llevas del plan, sin armar reportes.", src: "/landing/dashboard.png", alt: "Dashboard de Facturacon con facturado del mes, por cobrar, comprobantes emitidos, gráfico diario y últimos comprobantes aceptados por la DGII" },
  { titulo: "Factura con código QR", descripcion: "Comprobante fiscal electrónico firmado, listo para imprimir en hoja A4 o en ticket térmico.", src: "/landing/factura.png", alt: "Factura de crédito fiscal electrónica en formato A4 y en ticket térmico, con código QR y código de seguridad" },
  { titulo: "Inventario con códigos de barra", descripcion: "Productos con control de stock, etiquetas para imprimir y escaneo directo en la factura.", src: "/landing/inventario.png", alt: "Lista de inventario con códigos de barra, stock y etiqueta imprimible del producto seleccionado" },
];

const boton = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  padding: "14px 26px", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: 15, textDecoration: "none",
} as const;

// Orden y tono de las secciones (alternados para que se distinga cada una):
//   hero (papel) → beneficios (blanco) → qué resolvemos (papel) → así se ve
//   (blanco) → video (papel) → confianza (blanco) → cómo funciona (tinta) →
//   precios (papel) → preguntas (blanco) → cierre (papel) → footer (tinta).
export default function LandingPage() {
  // Con el registro cerrado, todos los botones llevan a la lista de espera.
  const cta = registroAbierto() ? "Crear mi cuenta" : "Unirme a la lista de espera";
  return (
    <>
      <SiteHeader />
      <main style={{ fontFamily: "var(--font-sans)", color: "var(--c-text-1)" }}>
        {/* Hero: ocupa la pantalla. Titular a la izquierda y, a la derecha, el
            comprobante que dice lo que cuesta empezar. */}
        <section className="sec sec-paper hero">
          <div className="sec-inner">
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
          </div>
        </section>

        <Seccion id="incluye" tono="white" titulo="Todo lo que necesitas para empezar a facturar"
          lede="La certificación guiada y un sistema completo, en un solo lugar.">
          <BeneficiosStrip />
        </Seccion>

        <Seccion tono="paper" titulo="La certificación de emisor electrónico no es trivial. Nosotros nos encargamos.">
          <div className="cols-4">
            {resolvemos.map((r) => (
              <div key={r.t} style={{ borderTop: "2px solid var(--c-text-1)", paddingTop: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em", marginBottom: 8 }}>{r.t}</div>
                <div style={{ fontSize: 15, color: "var(--c-text-2)", lineHeight: 1.6 }}>{r.d}</div>
              </div>
            ))}
          </div>
        </Seccion>

        {/* Vistas del sistema con datos de ejemplo, generadas desde
            scripts/landing-imagenes (render.sh). Cuando haya capturas del sistema
            real con datos reales, reemplazan estos PNG. */}
        <Seccion id="producto" tono="white" titulo="Así se ve por dentro" lede="Vistas del sistema con datos de ejemplo.">
          <div style={{ display: "flex", flexDirection: "column", gap: 72 }}>
            {vistas.map((x) => (
              <figure key={x.titulo} style={{ margin: 0 }}>
                <figcaption style={{ marginBottom: 12, maxWidth: 560 }}>
                  <div style={{ fontWeight: 800, fontSize: "1.35rem", letterSpacing: "-0.02em", marginBottom: 6 }}>{x.titulo}</div>
                  <div style={{ fontSize: 16, color: "var(--c-text-2)", lineHeight: 1.6 }}>{x.descripcion}</div>
                </figcaption>
                <Image src={x.src} alt={x.alt} width={2400} height={1520} sizes="(max-width: 1120px) 100vw, 1072px"
                  style={{ width: "100%", height: "auto", display: "block" }} />
              </figure>
            ))}
          </div>
        </Seccion>

        <Seccion tono="paper" titulo="El recorrido completo, en video" lede="Un paseo corto por todo el proceso, desde crear tu cuenta hasta tu primera factura.">
          <VideoTutorial />
        </Seccion>

        <Seccion tono="white" titulo="Hecho para el negocio dominicano de todos los días"
          lede="Funciona para cualquier negocio que venda productos o servicios y necesite facturar electrónicamente ante la DGII.">
          <NegociosSection />
          <div style={{ marginTop: 56 }}><TrustStrip /></div>
        </Seccion>

        {/* Cómo funciona: este SÍ es un proceso, por eso va numerado. Las cinco
            etapas salen de lib/tenant/jornada.ts, la misma fuente que usa el panel,
            para que la landing y el producto cuenten el mismo camino. */}
        <Seccion id="como-funciona" tono="ink" titulo="De crear tu cuenta a tu primera factura real"
          lede="Pagas solo al final, cuando la DGII ya te autorizó.">
          <ol className="cols-5" style={{ listStyle: "none" }}>
            {ETAPAS.map((e, i) => (
              <li key={e.id} style={{ borderTop: "3px solid " + (e.id === "certificacion" ? "var(--c-stamp)" : "rgba(255,255,255,0.22)"), paddingTop: 18 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--c-ticket)", marginBottom: 10 }}>{String(i + 1).padStart(2, "0")}</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: "#fff", marginBottom: 6 }}>{e.titulo}</div>
                <div style={{ fontSize: 15, color: "rgba(255,255,255,0.72)", lineHeight: 1.55 }}>{e.detalle}</div>
              </li>
            ))}
          </ol>
        </Seccion>

        {/* Precios: título a la izquierda y la calculadora a la derecha, para que
            el usuario vea exactamente su plan según su propio volumen. */}
        <Seccion id="precios" tono="paper">
          <div className="split">
            <div>
              <h2 className="sec-h2">Desde RD$ {PLANES[0].montoRD.toLocaleString("es-DO")} al mes</h2>
              <p className="sec-lede">
                La certificación como emisor electrónico es gratis. Pagas una sola suscripción
                mensual según cuántos comprobantes emitas, y solo empieza a cobrarse una vez que
                estés certificado y facturando de verdad.
              </p>
              <div style={{ marginTop: 28 }}><PagaditoBadge /></div>
            </div>
            <PricingCalculator />
          </div>
        </Seccion>

        <Seccion id="faq" tono="white">
          <div className="split">
            <div>
              <h2 className="sec-h2">Preguntas frecuentes</h2>
              <p className="sec-lede">
                ¿No ves la tuya? Escríbenos a{" "}
                <a href="mailto:contacto@facturacon.com.do" style={{ color: "var(--c-brand)", fontWeight: 600 }}>contacto@facturacon.com.do</a>.
              </p>
            </div>
            <FaqAccordion faqs={faqs} />
          </div>
        </Seccion>

        <Seccion tono="paper">
          <div style={{ background: "var(--c-navy)", borderRadius: 16, padding: "clamp(40px, 6vw, 64px) 28px", textAlign: "center" }}>
            <h2 style={{ fontWeight: 800, fontSize: "clamp(1.7rem, 3.2vw, 2.4rem)", marginBottom: 26, color: "#fff", maxWidth: 560, marginInline: "auto", lineHeight: 1.12, letterSpacing: "-0.03em" }}>
              ¿Listo para certificarte como emisor electrónico?
            </h2>
            <Link href="/registro" style={{ ...boton, background: "#fff", color: "var(--c-navy)" }}>
              {cta}
            </Link>
          </div>
        </Seccion>
      </main>
      <SiteFooter />
    </>
  );
}
