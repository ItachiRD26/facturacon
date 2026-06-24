import SiteHeader from "@/components/marketing/site-header";
import SiteFooter from "@/components/marketing/site-footer";

const secciones = [
  {
    t: "1. Qué es Facturacon",
    p: "Facturacon es una plataforma que ayuda a contribuyentes dominicanos a certificarse como emisores electrónicos ante la Dirección General de Impuestos Internos (DGII) y a operar un sistema de facturación electrónica (e-CF) propio.",
  },
  {
    t: "2. Entorno de prueba",
    p: "Antes de certificarte, Facturacon te da acceso a un entorno de prueba con datos ficticios y comprobantes simulados, que no se envían a la DGII ni tienen validez fiscal. Cualquier dato ingresado en el entorno de prueba puede ser eliminado en cualquier momento.",
  },
  {
    t: "3. Certificación y responsabilidad fiscal",
    p: "La certificación como emisor electrónico depende de que el contribuyente cumpla con los requisitos de la DGII (registro en la Oficina Virtual, certificado de firma digital vigente, representante activo). Facturacon facilita y automatiza este proceso, pero la responsabilidad fiscal de los comprobantes emitidos en producción es del contribuyente certificado.",
  },
  {
    t: "4. Pagos y suscripción",
    p: "El acceso al proceso de certificación y al sistema de facturación en producción requiere un pago único de certificación y una suscripción mensual según el volumen de comprobantes emitidos, según las tarifas vigentes al momento del registro.",
  },
  {
    t: "5. Custodia de credenciales",
    p: "Tu certificado de firma digital (.p12) se almacena cifrado y nunca se comparte con otros contribuyentes ni se expone en texto plano.",
  },
  {
    t: "6. Cambios a estos términos",
    p: "Estos términos pueden actualizarse. Te notificaremos los cambios relevantes por correo electrónico o dentro de la plataforma.",
  },
];

export default function TerminosPage() {
  return (
    <>
      <SiteHeader />
      <main style={{ fontFamily: "var(--font-sans)", maxWidth: 720, margin: "0 auto", padding: "48px 24px 72px" }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.8rem", marginBottom: 8 }}>
          Términos de servicio
        </h1>
        <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 28 }}>
          Última actualización: borrador inicial — pendiente de revisión legal.
        </p>

        <div style={{
          padding: 14, background: "var(--c-yellow-bg)", border: "1px solid var(--c-yellow-border)",
          borderRadius: 6, fontSize: 12, marginBottom: 32,
        }}>
          Este texto es una plantilla orientativa y todavía no ha sido revisado por un abogado.
          No debe considerarse asesoría legal ni publicarse en producción sin esa revisión.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {secciones.map((s) => (
            <section key={s.t}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{s.t}</h2>
              <p style={{ fontSize: 13, color: "var(--c-text-2)", lineHeight: 1.6 }}>{s.p}</p>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
