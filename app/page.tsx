import Link from "next/link";
import SiteHeader from "@/components/marketing/site-header";
import SiteFooter from "@/components/marketing/site-footer";
import VideoTutorial from "@/components/marketing/video-tutorial";
import NegociosSection from "@/components/marketing/negocios-section";
import ProductMockup from "@/components/marketing/product-mockup";
import ScreenshotPlaceholder from "@/components/marketing/screenshot-placeholder";
import PagaditoBadge from "@/components/marketing/pagadito-badge";
import BeneficiosStrip from "@/components/marketing/beneficios-strip";
import TrustStrip from "@/components/marketing/trust-strip";
import FaqAccordion from "@/components/marketing/faq-accordion";
import { PLANES } from "@/lib/payments/planes";

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
    a: "Una sola suscripción mensual según cuántos comprobantes electrónicos emitas — sin cargo de activación aparte. El primer pago de tu plan es lo que activa tu proceso de certificación. Ve la sección de Precios arriba.",
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
          <div className="grain-overlay" />
          <div style={{ position: "relative" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24, padding: "5px 14px",
              background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#fff",
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5eead4", flexShrink: 0 }} />
              Facturación Electrónica · República Dominicana
            </div>
            <h1 style={{
              fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "clamp(2.4rem, 5vw, 3.4rem)", lineHeight: 1.1,
              maxWidth: 760, margin: "0 auto 20px", color: "#fff", letterSpacing: "-0.01em",
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

        <BeneficiosStrip />

        <VideoTutorial />

        {/* Qué resolvemos — el primer punto lleva más peso visual a propósito,
            rompe la grilla perfectamente simétrica por una más editorial. */}
        <section style={{ padding: "16px 24px 64px", maxWidth: 1040, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.7rem", textAlign: "center", marginBottom: 40, maxWidth: 640, marginLeft: "auto", marginRight: "auto" }}>
            La certificación de emisor electrónico no es trivial — nosotros nos encargamos
          </h2>
          <div className="resolvemos-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gridTemplateRows: "auto auto", gap: 20 }}>
            <div style={{
              background: "var(--c-navy)", borderRadius: 12, padding: 28,
              gridColumn: "1", gridRow: "1 / 3",
              color: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between",
            }}>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "2.4rem", opacity: 0.5, marginBottom: 12 }}>01</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>Sin desarrollar nada</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.6 }}>
                  No necesitas construir ni mantener tu propio software de facturación electrónica.
                </div>
              </div>
            </div>
            <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, padding: 22, gridColumn: "2", gridRow: "1" }}>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", color: "var(--c-text-4)", marginBottom: 8 }}>02</div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Sin perder semanas</div>
              <div style={{ fontSize: 13, color: "var(--c-text-3)" }}>El proceso de certificación de la DGII tiene ~15 pasos técnicos. Te los manejamos nosotros.</div>
            </div>
            <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, padding: 22, gridColumn: "3", gridRow: "1" }}>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", color: "var(--c-text-4)", marginBottom: 8 }}>03</div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Pruébalo antes de pagar</div>
              <div style={{ fontSize: 13, color: "var(--c-text-3)" }}>Usa el sistema completo con datos de ejemplo antes de comprometerte.</div>
            </div>
            <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, padding: 22, gridColumn: "2 / 4", gridRow: "2" }}>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", color: "var(--c-text-4)", marginBottom: 8 }}>04</div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Listo en un día</div>
              <div style={{ fontSize: 13, color: "var(--c-text-3)" }}>Una vez certificado, tu sistema queda funcionando de inmediato en tu propio dominio.</div>
            </div>
          </div>
        </section>

        {/* Así se ve por dentro — espacios listos para capturas reales, uno a la vez para que cada uno se vea grande y completo */}
        <section style={{ padding: "16px 24px 72px", maxWidth: 1040, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", textAlign: "center", marginBottom: 8 }}>
            Así se ve por dentro
          </h2>
          <p style={{ textAlign: "center", color: "var(--c-text-3)", fontSize: 13, maxWidth: 480, margin: "0 auto 40px" }}>
            Capturas reales del sistema — próximamente.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
            {[
              { titulo: "Dashboard", descripcion: "Vista general de tu negocio: facturado, por cobrar, comprobantes del mes." },
              { titulo: "Factura con QR", descripcion: "Comprobante fiscal electrónico, listo para imprimir en A4 o térmica." },
              { titulo: "Inventario y códigos de barra", descripcion: "Productos con control de stock, etiquetas y escaneo en facturación." },
            ].map((s, i) => (
              <div key={s.titulo} style={{
                display: "flex", flexWrap: "wrap", gap: 28, alignItems: "center",
                flexDirection: i % 2 === 1 ? "row-reverse" : "row",
              }}>
                <div style={{ flex: "1 1 480px", minWidth: 280 }}>
                  <ScreenshotPlaceholder titulo={s.titulo} descripcion={s.descripcion} />
                </div>
                <div style={{ flex: "1 1 260px", minWidth: 220 }}>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.2rem", fontWeight: 700, marginBottom: 8 }}>
                    {s.titulo}
                  </div>
                  <div style={{ fontSize: 14, color: "var(--c-text-3)", lineHeight: 1.6 }}>
                    {s.descripcion}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <TrustStrip />

        <NegociosSection />

        {/* Cómo funciona — fondo navy para romper la alternancia blanco/blanco
            del resto de la página y darle un punto de anclaje visual fuerte. */}
        <section id="como-funciona" style={{ padding: "72px 24px", background: "var(--c-navy)", position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute", inset: 0, opacity: 0.4, pointerEvents: "none",
            background: "radial-gradient(circle at 90% 10%, rgba(94,234,212,0.10), transparent 45%)",
          }} />
          <div style={{ maxWidth: 960, margin: "0 auto", position: "relative" }}>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.7rem", textAlign: "center", marginBottom: 40, color: "#fff" }}>
              Cómo funciona
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 28 }}>
              {pasos.map((p) => (
                <div key={p.n} style={{ borderLeft: "2px solid rgba(255,255,255,0.18)", paddingLeft: 18 }}>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", color: "#5eead4", marginBottom: 10 }}>
                    {p.n}
                  </div>
                  <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14, color: "#fff" }}>{p.t}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>{p.d}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Precios — cifras de referencia, no son aun definitivas (ver nota abajo) */}
        <section id="precios" style={{ padding: "64px 24px", maxWidth: 1040, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", marginBottom: 12 }}>
            Precios
          </h2>
          <p style={{ color: "var(--c-text-2)", marginBottom: 36, maxWidth: 560, margin: "0 auto 36px" }}>
            Una sola suscripción mensual según cuántos comprobantes electrónicos emitas — el primer
            pago de tu plan es justo lo que activa tu proceso de certificación. Sin cargo de
            activación por separado.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16, textAlign: "left" }}>
            {PLANES.map((p) => (
              <div key={p.id} style={{
                display: "flex", flexDirection: "column", gap: 14, padding: "22px 18px",
                background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12,
              }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--c-text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Plan {p.facturas}
                </div>
                <div>
                  <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", fontWeight: 700 }}>
                    RD$ {p.montoRD.toLocaleString("es-DO")}
                  </span>
                  <div style={{ fontSize: 11.5, color: "var(--c-text-4)" }}>al mes</div>
                </div>
                <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>{p.facturas} comprobantes / mes</div>
                <Link href="/registro" style={{
                  marginTop: "auto", padding: "9px 14px", borderRadius: 6, textAlign: "center",
                  background: "var(--c-brand)", color: "#fff", fontWeight: 700, fontSize: 12.5, textDecoration: "none",
                }}>
                  Elegir plan
                </Link>
              </div>
            ))}

            <div style={{
              display: "flex", flexDirection: "column", gap: 14, padding: "22px 18px",
              background: "var(--c-bg)", border: "1px dashed var(--c-border)", borderRadius: 12,
            }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--c-text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                A medida
              </div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.2rem", fontWeight: 700 }}>
                Contáctanos
              </div>
              <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>
                Más de {PLANES[PLANES.length - 1].facturas} comprobantes / mes
              </div>
              <a href="mailto:contacto@facturacon.com.do" style={{
                marginTop: "auto", padding: "9px 14px", borderRadius: 6, textAlign: "center",
                background: "transparent", color: "var(--c-brand)", border: "1px solid var(--c-brand-border)",
                fontWeight: 700, fontSize: 12.5, textDecoration: "none",
              }}>
                Escríbenos
              </a>
            </div>
          </div>

          <p style={{ fontSize: 12, color: "var(--c-text-4)", marginTop: 28, marginBottom: 20 }}>
            Cifras de referencia mientras confirmamos los montos finales — no son precios cerrados
            todavía. Te avisaremos antes de que se active cualquier cobro.
          </p>

          <PagaditoBadge />
        </section>

        {/* FAQ */}
        <section id="faq" style={{ padding: "64px 24px", background: "var(--c-surface)", borderTop: "1px solid var(--c-border)" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", textAlign: "center", marginBottom: 32 }}>
              Preguntas frecuentes
            </h2>
            <FaqAccordion faqs={faqs} />
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
