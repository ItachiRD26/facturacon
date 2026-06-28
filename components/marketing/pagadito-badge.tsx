// Espacio reservado, honesto, para el logo oficial de Pagadito — mismo
// criterio que ScreenshotPlaceholder/VideoPlaceholder: no se fabrica ni se
// hotlinkea una imagen de su marca sin permiso. Reemplazar el ícono de
// candado por el <img> del logo oficial cuando Pagadito lo entregue (suelen
// dar un kit de marca al activar la cuenta de comercio).
export default function PagaditoBadge() {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 18px",
      border: "1px dashed var(--c-border)", borderRadius: 999, background: "var(--c-surface)",
    }}>
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--c-text-3)" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--c-text-3)" }}>
        Pagos procesados de forma segura por <strong style={{ color: "var(--c-text-2)" }}>Pagadito</strong>
      </span>
    </div>
  );
}
