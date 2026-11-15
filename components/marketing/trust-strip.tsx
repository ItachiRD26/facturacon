import Reveal from "./reveal";
import { LockKey, ShieldCheck, Vault } from "@phosphor-icons/react/dist/ssr";

// Garantías verificables sobre seguridad y cumplimiento, en lugar de cifras de
// clientes o testimonios que todavía no existen. Va sobre fondo oscuro.
const items = [
  { t: "Tu certificado, cifrado", d: "El .p12 de tu firma digital se cifra con Google Cloud KMS: nunca queda en texto plano.", Icono: LockKey },
  { t: "Firmado según la normativa", d: "Cada comprobante se firma y se envía siguiendo la normativa vigente de e-CF.", Icono: ShieldCheck },
  { t: "Tus datos, solo tuyos", d: "Cada empresa tiene su propio espacio aislado: nadie más puede ver tus facturas o clientes.", Icono: Vault },
];

export default function TrustStrip() {
  return (
    <Reveal stagger className="cols-3">
      {items.map(({ t, d, Icono }) => (
        <div key={t} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <Icono size={34} weight="duotone" color="var(--c-ticket)" style={{ flexShrink: 0 }} aria-hidden="true" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6, color: "#fff" }}>{t}</div>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,0.72)", lineHeight: 1.6 }}>{d}</div>
          </div>
        </div>
      ))}
    </Reveal>
  );
}
