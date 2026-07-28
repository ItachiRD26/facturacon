"use client";

import { useState } from "react";
import { buscarRespuesta } from "@/lib/soporte/faq";

interface Mensaje {
  id:               string;
  de:               "bot" | "usuario";
  texto:            string;
  mostrarContacto?: boolean;
}

const CONTACTO_EMAIL = "contacto@facturacon.com.do";
const SALUDO: Mensaje = {
  id: "saludo", de: "bot",
  texto: "Hola, soy el asistente de Facturacon. Puedo responder preguntas frecuentes sobre el sandbox, la certificación, costos y métodos de pago. ¿En qué te ayudo?",
};
const SIN_RESPUESTA = "No encontré una respuesta clara para eso. Escríbenos y te ayudamos directamente:";

export default function SoporteChat() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([SALUDO]);
  const [texto, setTexto] = useState("");

  const enviar = () => {
    const pregunta = texto.trim();
    if (!pregunta) return;
    const userMsg: Mensaje = { id: `u-${Date.now()}`, de: "usuario", texto: pregunta };

    const encontrada = buscarRespuesta(pregunta);
    const botMsg: Mensaje = encontrada
      ? { id: `b-${Date.now()}`, de: "bot", texto: encontrada.respuesta }
      : { id: `b-${Date.now()}`, de: "bot", texto: SIN_RESPUESTA, mostrarContacto: true };

    setMensajes((prev) => [...prev, userMsg, botMsg]);
    setTexto("");
  };

  return (
    <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, background: "var(--c-surface)", display: "flex", flexDirection: "column", height: 420 }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--c-border)", fontSize: 13, fontWeight: 700 }}>
        Asistente de soporte
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {mensajes.map((m) => (
          <div key={m.id} style={{ display: "flex", justifyContent: m.de === "usuario" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "80%", padding: "9px 12px", borderRadius: 10, fontSize: 13, lineHeight: 1.45,
              background: m.de === "usuario" ? "var(--c-brand)" : "var(--c-bg)",
              color: m.de === "usuario" ? "#fff" : "var(--c-text-1)",
            }}>
              {m.texto}
              {m.mostrarContacto && (
                <div style={{ marginTop: 8 }}>
                  <a href={`mailto:${CONTACTO_EMAIL}`} style={{
                    display: "inline-block", fontSize: 12, fontWeight: 700, color: "var(--c-brand)",
                  }}>
                    ✉ {CONTACTO_EMAIL}
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--c-border)" }}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") enviar(); }}
          placeholder="Escribe tu pregunta..."
          style={{
            flex: 1, padding: "9px 12px", border: "1px solid var(--c-border)", borderRadius: 6,
            fontSize: 13, fontFamily: "var(--font-sans)", background: "var(--c-bg)", color: "var(--c-text-1)",
          }}
        />
        <button onClick={enviar} style={{
          padding: "9px 16px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer",
          border: "none", background: "var(--c-brand)", color: "#fff",
        }}>
          Enviar
        </button>
      </div>
    </div>
  );
}
