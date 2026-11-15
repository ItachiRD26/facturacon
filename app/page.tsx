import Link from "next/link";
import SiteHeader from "@/components/marketing/site-header";
import SiteFooter from "@/components/marketing/site-footer";
import Seccion from "@/components/marketing/seccion";
import VideoTutorial from "@/components/marketing/video-tutorial";
import NegociosSection from "@/components/marketing/negocios-section";
import PagaditoBadge from "@/components/marketing/pagadito-badge";
import BeneficiosStrip from "@/components/marketing/beneficios-strip";
import TrustStrip from "@/components/marketing/trust-strip";
import VistasProducto from "@/components/marketing/vistas-producto";
import FaqAccordion from "@/components/marketing/faq-accordion";
import PlanesGrid from "@/components/marketing/planes-grid";
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
    q: "¿Y si mi empresa emite muchísimos comprobantes?",
    a: "Si emites 10,000 comprobantes o más al mes, o tienes varias sucursales, armamos un plan adaptado a tu operación y lo acordamos contigo. Escríbenos desde la página de empresas y alguien de nuestro equipo te contacta.",
  },
  {
    q: "¿Sirve para mi tipo de negocio?",
    a: "El sistema base funciona para ferreterías, farmacias, colmados, restaurantes, salones, talleres, clínicas, consultoras y la mayoría de negocios que venden productos o servicios. Si tu negocio tiene necesidades muy particulares (ej. hoteles con gestión de reservas) contáctanos para evaluar una solución a medida.",
  },
];

const hayVideo = !!process.env.NEXT_PUBLIC_YOUTUBE_TUTORIAL_URL;

// Orden y tono (un solo tono claro; tinta y cobalto con propósito):
//   hero (tinta) → qué incluye (papel) → así se ve (tinta) → cómo funciona
//   (papel) → precios (cobalto) → preguntas (papel) → cierre (tinta) → footer.
export default function LandingPage() {
  // Con el registro cerrado, todos los botones llevan a la lista de espera.
  const cta = registroAbierto() ? "Crear mi cuenta" : "Unirme a la lista de espera";
  return (
    <>
      <SiteHeader />
      <main style={{ fontFamily: "var(--font-sans)" }}>
        {/* Hero: ocupa la pantalla. Titular a la izquierda y, a la derecha, el
            comprobante que dice lo que cuesta empezar, en papel blanco sobre tinta. */}
        <section className="sec sec-ink hero">
          <div className="sec-inner">
            <div className="hero-grid">
              <div>
                <h1 style={{
                  fontWeight: 800, fontSize: "clamp(2.5rem, 5.4vw, 4.4rem)", lineHeight: 1.02,
                  letterSpacing: "-0.04em", marginBottom: 26, maxWidth: 660, color: "#fff",
                }}>
                  Certifícate gratis ante la DGII y empieza a facturar
                </h1>
                <p style={{ fontSize: 19, lineHeight: 1.6, color: "rgba(255,255,255,0.76)", maxWidth: 520, marginBottom: 24 }}>
                  Te llevamos de la mano por los 13 pasos del portal, nos encargamos de lo técnico y te
                  entregamos un sistema de facturación listo para usar.
                </p>
                <p className="destacado">La mensualidad empieza cuando ya estés certificado.</p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <Link href="/registro" className="btn-l btn-white">{cta}</Link>
                  <a href="#como-funciona" className="btn-l btn-ghost-d">Ver cómo funciona</a>
                </div>
              </div>
              <TicketHero />
            </div>
          </div>
        </section>

        <Seccion id="incluye" tono="paper" titulo="Todo lo necesario para facturar sin complicarte"
          lede="La certificación guiada y un sistema completo, en un solo lugar.">
          <BeneficiosStrip />
          <div style={{ marginTop: 80 }}>
            <NegociosSection />
          </div>
        </Seccion>

        {/* Vistas del sistema con datos de ejemplo (scripts/landing-imagenes) y las
            garantías de seguridad. Cuando haya capturas reales, reemplazan los PNG. */}
        <Seccion id="producto" tono="ink" titulo="Así se ve por dentro">
          <VistasProducto />
          <div style={{ marginTop: 72, paddingTop: 48, borderTop: "1px solid rgba(255,255,255,0.14)" }}>
            <TrustStrip />
          </div>
        </Seccion>

        {/* Cómo funciona: este SÍ es un proceso, por eso va numerado. Las cinco
            etapas salen de lib/tenant/jornada.ts, la misma fuente que usa el panel. */}
        <Seccion id="como-funciona" tono="paper" titulo="De crear tu cuenta a tu primera factura real"
          lede="Pagas solo al final, cuando la DGII ya te autorizó.">
          <ol className="cols-5" style={{ listStyle: "none" }}>
            {ETAPAS.map((e, i) => (
              <li key={e.id} style={{
                borderTop: "4px solid " + (e.id === "certificacion" ? "var(--c-stamp)" : "var(--c-text-1)"), paddingTop: 20,
              }}>
                <div style={{ fontWeight: 800, fontSize: 44, lineHeight: 1, letterSpacing: "-0.04em", color: e.id === "certificacion" ? "var(--c-stamp)" : "var(--c-text-1)", marginBottom: 16 }}>{i + 1}</div>
                <div style={{ fontWeight: 700, fontSize: 19, marginBottom: 6, letterSpacing: "-0.01em" }}>{e.titulo}</div>
                <div style={{ fontSize: 15.5, color: "var(--c-text-2)", lineHeight: 1.55 }}>{e.detalle}</div>
              </li>
            ))}
          </ol>
          {hayVideo && <div style={{ marginTop: 64 }}><VideoTutorial /></div>}
        </Seccion>

        {/* Precios: el único momento en cobalto. Todos los planes a la vista (sin
            slider) y sin botón por plan: el plan se elige después de certificarse. */}
        <Seccion id="precios" tono="brand" titulo={<>Desde RD$ {PLANES[0].montoRD.toLocaleString("es-DO")} al mes</>}
          lede="La certificación como emisor electrónico es gratis. Pagas una sola suscripción mensual según cuántos comprobantes emitas, y eliges tu plan cuando ya estés certificado.">
          <p className="destacado">La mensualidad empieza cuando ya estés certificado.</p>
          <PlanesGrid />
          <div style={{ marginTop: 36, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20 }}>
            <Link href="/registro" className="btn-l btn-ticket">{cta}</Link>
            <PagaditoBadge />
          </div>
          <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.72)", marginTop: 24, lineHeight: 1.55, maxWidth: 640 }}>
            Cifras de referencia mientras confirmamos los montos finales; no son precios cerrados
            todavía. Te avisaremos antes de que se active cualquier cobro.
          </p>
        </Seccion>

        <Seccion id="faq" tono="paper">
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

        <Seccion tono="ink">
          <div style={{ textAlign: "center", paddingBlock: "clamp(8px, 3vw, 32px)" }}>
            <h2 className="sec-h2" style={{ maxWidth: 680, marginInline: "auto", marginBottom: 32 }}>
              ¿Listo para certificarte como emisor electrónico?
            </h2>
            <Link href="/registro" className="btn-l btn-ticket">{cta}</Link>
          </div>
        </Seccion>
      </main>
      <SiteFooter />
    </>
  );
}
