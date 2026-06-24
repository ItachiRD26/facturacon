// Espacio reservado, honesto, para una captura real del sistema — mismo
// patrón que el placeholder de VideoTutorial ("próximamente"). No se
// fabrica una imagen falsa; queda listo para reemplazar por una captura
// real del sandbox o del producto certificado cuando esté disponible.
export default function ScreenshotPlaceholder({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <div style={{
      borderRadius: 14, overflow: "hidden", border: "1px solid var(--c-border)",
      position: "relative", aspectRatio: "16 / 10", width: "100%",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14,
      background: "linear-gradient(135deg, #1e293b, #0f172a)", color: "#fff", padding: 28, textAlign: "center",
      boxShadow: "0 20px 50px rgba(17,20,57,0.14)",
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{titulo}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", maxWidth: 320 }}>{descripcion}</div>
    </div>
  );
}
