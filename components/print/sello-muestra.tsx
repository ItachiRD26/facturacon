// Sello visual para documentos generados en el entorno de prueba: hace
// obvio a simple vista (sin necesidad de escanear el QR) que el documento
// no es un comprobante fiscal real, incluso si el e-NCF tiene formato válido.
export default function SelloMuestra({ compacto = false }: { compacto?: boolean }) {
  return (
    <>
      <div style={{
        textAlign: "center", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b",
        fontWeight: 700, letterSpacing: "0.04em", padding: compacto ? "4px 6px" : "6px 10px",
        fontSize: compacto ? 10 : 11, marginBottom: compacto ? 8 : 14, borderRadius: 4,
      }}>
        DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL
      </div>
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: "none", overflow: "hidden", zIndex: 0,
      }}>
        <span style={{
          fontSize: compacto ? 42 : 90, fontWeight: 800, color: "rgba(220,38,38,0.10)",
          transform: "rotate(-28deg)", whiteSpace: "nowrap", letterSpacing: "0.08em",
        }}>
          MUESTRA
        </span>
      </div>
    </>
  );
}
