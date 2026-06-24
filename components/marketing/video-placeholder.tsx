// Placeholder de video reutilizable e independiente de VideoTutorial.tsx (que
// es un componente de sección completa, fijo al único video de "Cómo
// funciona Facturacon" en la landing). Este es compacto y admite varios por
// página — útil para el asistente de certificación, donde cada paso puede
// necesitar su propio recorrido en video más adelante.
function extraerIdYoutube(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  return match ? match[1] : null;
}

export default function VideoPlaceholder({ titulo, descripcion, url }: {
  titulo: string; descripcion: string; url?: string;
}) {
  const videoId = url ? extraerIdYoutube(url) : null;

  return (
    <div style={{
      borderRadius: 10, overflow: "hidden", border: "1px solid var(--c-border)",
      background: "#0f172a", position: "relative", aspectRatio: "16 / 9", marginTop: 10,
    }}>
      {videoId ? (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title={titulo}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      ) : (
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 8, color: "#fff", textAlign: "center", padding: 16,
          background: "linear-gradient(135deg, #1e293b, #0f172a)",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          }}>
            ▶
          </div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{titulo} — próximamente</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>{descripcion}</div>
        </div>
      )}
    </div>
  );
}
