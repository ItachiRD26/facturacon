// Espacio reservado, honesto, para el logo oficial de Pagadito: no se fabrica ni
// se hotlinkea una imagen de su marca sin permiso. Reemplazar el ícono de candado
// por el <img> del logo oficial cuando Pagadito entregue su kit de marca.
import { LockKey } from "@phosphor-icons/react/dist/ssr";

export default function PagaditoBadge() {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 18px",
      border: "1px dashed rgba(255,255,255,0.45)", borderRadius: 999, background: "rgba(255,255,255,0.08)",
    }}>
      <LockKey size={18} weight="duotone" color="#fff" aria-hidden="true" />
      <span style={{ fontSize: 13.5, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
        Pagos procesados de forma segura por <strong style={{ color: "#fff" }}>Pagadito</strong>
      </span>
    </div>
  );
}
