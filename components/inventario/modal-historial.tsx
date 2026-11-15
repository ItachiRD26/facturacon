"use client";

import type { Producto } from "@/types";
import Modal from "@/components/modals/modal";
import { useMovimientos } from "@/hooks/use-movimientos";

const ETIQUETA: Record<string, string> = { venta: "Venta", entrada: "Entrada", merma: "Merma", ajuste: "Ajuste" };

// Historial de movimientos de un producto: ventas (automáticas), entradas, mermas y conteos.
export default function ModalHistorial({
  open, onClose, tenantId, producto,
}: { open: boolean; onClose: () => void; tenantId: string; producto: Producto | null }) {
  const { movimientos, loading, error } = useMovimientos(tenantId, open && producto ? producto.id : null);
  if (!producto) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Historial de ${producto.nombre}`} maxWidth={640}>
      {loading ? <p style={{ color: "var(--c-text-3)" }}>Cargando…</p>
        : error ? <p role="alert" style={{ color: "var(--c-red)" }}>{error}</p>
        : movimientos.length === 0 ? (
          <p style={{ color: "var(--c-text-3)", fontSize: 14, lineHeight: 1.55 }}>
            Todavía no hay movimientos. Cada venta, entrada, merma o conteo de este producto queda anotado aquí.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "var(--font-sans)" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--c-text-3)", fontSize: 12 }}>
                  <th style={{ padding: "6px 8px" }}>Fecha</th><th style={{ padding: "6px 8px" }}>Movimiento</th>
                  <th style={{ padding: "6px 8px", textAlign: "right" }}>Cantidad</th><th style={{ padding: "6px 8px", textAlign: "right" }}>Queda</th>
                  <th style={{ padding: "6px 8px" }}>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => (
                  <tr key={m.id} style={{ borderTop: "1px solid var(--c-border)" }}>
                    <td style={{ padding: "8px", whiteSpace: "nowrap" }}>{new Date(m.fecha).toLocaleString("es-DO", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                    <td style={{ padding: "8px", fontWeight: 600 }}>{ETIQUETA[m.tipo] ?? m.tipo}</td>
                    <td style={{ padding: "8px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, color: m.cantidad < 0 ? "var(--c-red)" : "var(--c-green)" }}>{m.cantidad > 0 ? "+" : ""}{m.cantidad}</td>
                    <td style={{ padding: "8px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{m.stockResultante ?? "—"}</td>
                    <td style={{ padding: "8px", color: "var(--c-text-3)" }}>{m.motivo ?? m.referencia ?? ""}{m.costo !== undefined ? ` · costo ${m.costo}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </Modal>
  );
}
