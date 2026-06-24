import Link from "next/link";
import SiteHeader from "@/components/marketing/site-header";
import SiteFooter from "@/components/marketing/site-footer";
import VideoTutorial from "@/components/marketing/video-tutorial";
import NegociosSection from "@/components/marketing/negocios-section";
import ProductMockup from "@/components/marketing/product-mockup";

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
    a: "Hay un pago único por el proceso de certificación, y una suscripción mensual según cuántos comprobantes electrónicos emitas. Escríbenos para los montos actuales.",
  },
  {
    q: "¿Sirve para mi tipo de negocio?",
    a: "El sistema base funciona para ferreterías, farmacias, colmados, restaurantes, salones, talleres, clínicas, consultoras y la mayoría de negocios que venden productos o servicios. Si tu negocio tiene necesidades muy particulares (ej. hoteles con gestión de reservas) contáctanos para evaluar una solución a medida.",
  },
];

const pasos = [
  { n: "1", t: "Regístrate y describe tu negocio", d: "Crea tu cuenta y cuéntanos el RNC y el tipo de negocio que tienes." },
  { n: "2", t: "Prueba el sistema completo", d: "Clientes, inventario, cotizaciones, facturas e impresión — con datos de prueba, antes de pagar nada." },
  { n: "3", t: "Certifícate como emisor electrónico", d: "Te guiamos por los requisitos de la DGII y completamos el proceso de certificación por ti." },
  { n: "4", t: "Empieza a facturar de verdad", d: "Accede a tu propio sistema de facturación electrónica, ya certificado y funcionando." },
];

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main style={{ fontFamily: "var(--font-sans)", color: "var(--c-text-1)" }}>
        {/* Hero — ocupa toda la primera vista (debajo del header sticky) */}
        <section style={{
          minHeight: "calc(100vh - 64px)", padding: "48px 24px", textAlign: "center",
          background: "var(--gradient-hero)", position: "relative", overflow: "hidden",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            position: "absolute", inset: 0, opacity: 0.5, pointerEvents: "none",
            background: "radial-gradient(circle at 18% 22%, rgba(255,255,255,0.12), transparent 38%), radial-gradient(circle at 82% 78%, rgba(255,255,255,0.10), transparent 42%)",
          }} />
          <div style={{ position: "relative" }}>
            <div style={{
              display: "inline-block", marginBottom: 20, padding: "5px 14px",
              background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#fff",
              letterSpacing: "0.03em",
            }}>
              Facturación Electrónica · República Dominicana
            </div>
            <h1 style={{
              fontFamily: "var(--font-serif)", fontSize: "2.6rem", lineHeight: 1.15,
              maxWidth: 740, margin: "0 auto 18px", color: "#fff",
            }}>
              Certifícate ante la DGII y factura electrónicamente desde el primer día
            </h1>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.78)", maxWidth: 560, margin: "0 auto 32px" }}>
              Te guiamos por todo el proceso de certificación de emisor electrónico y te entregamos
              un sistema de facturación listo para usar — sin contratar un desarrollador, sin montar
              servidores propios.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/registro" style={{
                padding: "13px 28px", background: "#fff", color: "var(--c-navy)",
                borderRadius: 6, fontWeight: 700, fontSize: 14, textDecoration: "none",
                boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
              }}>
                Empezar gratis
              </Link>
              <a href="#como-funciona" style={{
                padding: "13px 28px", background: "transparent", color: "#fff",
                border: "1px solid rgba(255,255,255,0.4)", borderRadius: 6, fontWeight: 600, fontSize: 14,
                textDecoration: "none",
              }}>
                Ver cómo funciona
              </a>
            </div>
          </div>
        </section>

        <div style={{ marginTop: -56, position: "relative", zIndex: 1 }}>
          <ProductMockup />
        </div>

        <VideoTutorial />

        {/* Qué resolvemos */}
        <section style={{ padding: "16px 24px 64px", maxWidth: 960, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", textAlign: "center", marginBottom: 32 }}>
            La certificación de emisor electrónico no es trivial — nosotros nos encargamos
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24 }}>
            {[
              { t: "Sin desarrollar nada", d: "No necesitas construir ni mantener tu propio software de facturación electrónica." },
              { t: "Sin perder semanas", d: "El proceso de certificación de la DGII tiene ~15 pasos técnicos. Te los manejamos nosotros." },
              { t: "Pruébalo antes de pagar", d: "Usa el sistema completo con datos de ejemplo — facturas, cotizaciones, impresión y QR de prueba — antes de comprometerte." },
              { t: "Listo en un día", d: "Una vez certificado, tu sistema de facturación queda funcionando de inmediato en tu propio dominio." },
            ].map((b) => (
              <div key={b.t} style={{
                background: "var(--c-surface)", border: "1px solid var(--c-border)",
                borderRadius: 8, padding: 20,
              }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{b.t}</div>
                <div style={{ fontSize: 13, color: "var(--c-text-3)" }}>{b.d}</div>
              </div>
            ))}
          </div>
        </section>

        <NegociosSection />

        {/* Cómo funciona */}
        <section id="como-funciona" style={{ padding: "64px 24px", background: "var(--c-surface)", borderTop: "1px solid var(--c-border)", borderBottom: "1px solid var(--c-border)" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", textAlign: "center", marginBottom: 32 }}>
              Cómo funciona
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
              {pasos.map((p) => (
                <div key={p.n}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", background: "var(--c-brand)",
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 14, marginBottom: 10,
                  }}>
                    {p.n}
                  </div>
                  <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>{p.t}</div>
                  <div style={{ fontSize: 13, color: "var(--c-text-3)" }}>{p.d}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Precios (sin tramos aún — pendiente de decidir) */}
        <section id="precios" style={{ padding: "64px 24px", maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", marginBottom: 12 }}>
            Precios
          </h2>
          <p style={{ color: "var(--c-text-2)", marginBottom: 8 }}>
            Un pago único por el proceso de certificación, y una suscripción mensual según el
            volumen de comprobantes que emitas.
          </p>
          <p style={{ fontSize: 13, color: "var(--c-text-3)" }}>
            Los montos exactos se confirman durante el registro.
          </p>
        </section>

        {/* FAQ */}
        <section id="faq" style={{ padding: "64px 24px", background: "var(--c-surface)", borderTop: "1px solid var(--c-border)" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", textAlign: "center", marginBottom: 32 }}>
              Preguntas frecuentes
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {faqs.map((f) => (
                <div key={f.q} style={{ borderBottom: "1px solid var(--c-border-lt)", paddingBottom: 16 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>{f.q}</div>
                  <div style={{ fontSize: 13, color: "var(--c-text-3)" }}>{f.a}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section style={{ padding: "0 24px 64px", maxWidth: 960, margin: "0 auto" }}>
          <div style={{
            background: "var(--gradient-hero)", borderRadius: 16, padding: "48px 24px",
            textAlign: "center",
          }}>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", marginBottom: 16, color: "#fff" }}>
              ¿Listo para certificarte como emisor electrónico?
            </h2>
            <Link href="/registro" style={{
              padding: "12px 28px", background: "#fff", color: "var(--c-navy)",
              borderRadius: 6, fontWeight: 700, fontSize: 14, textDecoration: "none",
              display: "inline-block",
            }}>
              Crear mi cuenta
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
