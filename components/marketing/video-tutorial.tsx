function extraerIdYoutube(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  return match ? match[1] : null;
}

export default function VideoTutorial() {
  const url = process.env.NEXT_PUBLIC_YOUTUBE_TUTORIAL_URL;
  const videoId = url ? extraerIdYoutube(url) : null;

  return (
    <section style={{ padding: "0 24px 56px", maxWidth: 880, margin: "0 auto" }}>
      <div style={{
        borderRadius: 12, overflow: "hidden", border: "1px solid var(--c-border)",
        background: "var(--c-navy)", position: "relative", aspectRatio: "16 / 9",
      }}>
        {videoId ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title="Cómo funciona Facturacon"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        ) : (
          <a
            href={url || "#"}
            target={url ? "_blank" : undefined}
            rel="noreferrer"
            style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 12, color: "#fff",
              textDecoration: "none", cursor: url ? "pointer" : "default",
              background: "var(--gradient-hero)",
            }}
          >
            <div style={{
              width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            }}>
              ▶
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Video tutorial — próximamente</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
              Aquí irá un recorrido en video por todo el proceso de certificación
            </div>
          </a>
        )}
      </div>
    </section>
  );
}
