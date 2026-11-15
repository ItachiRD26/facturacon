import Link from "next/link";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { PLANES, VOLUMEN_EMPRESA } from "@/lib/payments/planes";

// Todos los planes a la vista, uno por tarjeta, para compararlos de un golpe.
// Reemplaza al slider: un slider arranca en un valor y quien no lo mueve se
// queda "con un plan" que no eligió, además de esconder los demás. Aquí no hay
// botón por plan a propósito: el plan se elige DESPUÉS de certificarse, dentro
// del panel (Plan y facturación); hoy solo se crea la cuenta.
const incluye = ["Certificación DGII gratis", "Sistema de facturación completo"];

export default function PlanesGrid() {
  const maxPlan = PLANES[PLANES.length - 1].facturas;
  return (
    <div>
      <ul className="planes-grid" style={{ listStyle: "none" }}>
        {PLANES.map((p) => (
          <li key={p.id} className="plan-card">
            <div style={{ fontSize: 14, color: "var(--c-text-3)", fontWeight: 600 }}>Hasta</div>
            <div className="num" style={{ fontWeight: 800, fontSize: "2.4rem", lineHeight: 1, letterSpacing: "-0.04em" }}>
              {p.facturas.toLocaleString("es-DO")}
            </div>
            <div style={{ fontSize: 14.5, color: "var(--c-text-2)", marginBottom: 18 }}>comprobantes al mes</div>
            <div className="num" style={{ fontWeight: 800, fontSize: "1.6rem", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              RD$ {p.montoRD.toLocaleString("es-DO")}
              <span style={{ fontSize: "0.95rem", fontWeight: 500, color: "var(--c-text-3)" }}> /mes</span>
            </div>
            <ul style={{ listStyle: "none", marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--c-border-lt)", display: "flex", flexDirection: "column", gap: 9 }}>
              {[`${p.usuarios} usuarios incluidos`, ...incluye].map((t) => (
                <li key={t} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14.5, color: "var(--c-text-2)", lineHeight: 1.4 }}>
                  <Check size={16} weight="bold" color="var(--c-green)" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </li>
        ))}

        <li className="plan-card plan-empresa">
          <div style={{ fontWeight: 800, fontSize: "1.55rem", lineHeight: 1.12, letterSpacing: "-0.03em", marginBottom: 10 }}>
            Más de {maxPlan.toLocaleString("es-DO")} comprobantes al mes
          </div>
          <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "rgba(255,255,255,0.78)", marginBottom: 22 }}>
            Si emites {VOLUMEN_EMPRESA.toLocaleString("es-DO")} o más, tienes varias sucursales o necesidades propias,
            armamos un plan a tu medida y lo acordamos contigo.
          </p>
          <Link href="/empresas" className="btn-l btn-ticket" style={{ alignSelf: "flex-start" }}>Hablar con ventas</Link>
        </li>
      </ul>
    </div>
  );
}
