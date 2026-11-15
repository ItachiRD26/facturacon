import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import type { TipoNegocio } from "@/types/tenant";

// Datos de ejemplo del entorno de prueba. La empresa de prueba nacía vacía: sin
// productos el botón "Nueva factura" quedaba desactivado, y un cajero (que no
// puede crear productos) no tenía nada que facturar. Con un catálogo según el
// tipo de negocio y unos clientes, se puede facturar desde el primer minuto.
// Todo es ficticio y se marca con "(ejemplo)" donde podría confundirse con real.

interface ProductoEjemplo { codigo: string; nombre: string; precio: number; itbis: 0 | 0.18; stock?: number }

const ITBIS = 0.18 as const;

const CATALOGOS: Partial<Record<TipoNegocio, ProductoEjemplo[]>> = {
  ferreteria: [
    { codigo: "FER-001", nombre: "Martillo de carpintero", precio: 650, itbis: ITBIS, stock: 25 },
    { codigo: "FER-002", nombre: "Cemento gris 42.5 kg", precio: 480, itbis: ITBIS, stock: 120 },
    { codigo: "FER-003", nombre: "Pintura blanca, galón", precio: 1350, itbis: ITBIS, stock: 40 },
    { codigo: "FER-004", nombre: "Tubo PVC 1/2 pulgada", precio: 95, itbis: ITBIS, stock: 200 },
    { codigo: "FER-005", nombre: "Instalación de puerta", precio: 2500, itbis: ITBIS },
  ],
  farmacia: [
    { codigo: "FAR-001", nombre: "Acetaminofén 500 mg, caja", precio: 85, itbis: 0, stock: 150 },
    { codigo: "FAR-002", nombre: "Alcohol isopropílico 70 %", precio: 120, itbis: ITBIS, stock: 60 },
    { codigo: "FAR-003", nombre: "Vitamina C 1 g, tubo", precio: 260, itbis: ITBIS, stock: 45 },
    { codigo: "FAR-004", nombre: "Mascarillas, caja de 50", precio: 350, itbis: ITBIS, stock: 30 },
    { codigo: "FAR-005", nombre: "Toma de presión", precio: 100, itbis: ITBIS },
  ],
  colmado_supermercado: [
    { codigo: "COL-001", nombre: "Arroz selecto, libra", precio: 38, itbis: 0, stock: 300 },
    { codigo: "COL-002", nombre: "Aceite vegetal 1 L", precio: 210, itbis: ITBIS, stock: 80 },
    { codigo: "COL-003", nombre: "Refresco 2 L", precio: 90, itbis: ITBIS, stock: 120 },
    { codigo: "COL-004", nombre: "Pan de agua, unidad", precio: 12, itbis: 0, stock: 200 },
    { codigo: "COL-005", nombre: "Detergente en polvo 1 kg", precio: 180, itbis: ITBIS, stock: 50 },
  ],
  retail: [
    { codigo: "TIE-001", nombre: "Mochila escolar", precio: 1100, itbis: ITBIS, stock: 20 },
    { codigo: "TIE-002", nombre: "Audífonos inalámbricos", precio: 1800, itbis: ITBIS, stock: 15 },
    { codigo: "TIE-003", nombre: "Cargador USB-C", precio: 650, itbis: ITBIS, stock: 40 },
    { codigo: "TIE-004", nombre: "Termo 750 ml", precio: 900, itbis: ITBIS, stock: 30 },
    { codigo: "TIE-005", nombre: "Empaque de regalo", precio: 150, itbis: ITBIS },
  ],
  tienda_ropa: [
    { codigo: "ROP-001", nombre: "Camisa casual", precio: 1250, itbis: ITBIS, stock: 40 },
    { codigo: "ROP-002", nombre: "Pantalón de vestir", precio: 1900, itbis: ITBIS, stock: 25 },
    { codigo: "ROP-003", nombre: "Tenis deportivos", precio: 3200, itbis: ITBIS, stock: 18 },
    { codigo: "ROP-004", nombre: "Gorra", precio: 450, itbis: ITBIS, stock: 50 },
    { codigo: "ROP-005", nombre: "Arreglo de ruedo", precio: 250, itbis: ITBIS },
  ],
  restaurante: [
    { codigo: "RES-001", nombre: "Pollo guisado con arroz", precio: 380, itbis: ITBIS },
    { codigo: "RES-002", nombre: "Mofongo con chicharrón", precio: 450, itbis: ITBIS },
    { codigo: "RES-003", nombre: "Jugo natural", precio: 120, itbis: ITBIS },
    { codigo: "RES-004", nombre: "Ensalada de la casa", precio: 220, itbis: ITBIS },
    { codigo: "RES-005", nombre: "Flan de coco", precio: 150, itbis: ITBIS },
  ],
  bar_colmadon: [
    { codigo: "BAR-001", nombre: "Cerveza nacional", precio: 150, itbis: ITBIS, stock: 200 },
    { codigo: "BAR-002", nombre: "Ron, botella", precio: 1400, itbis: ITBIS, stock: 40 },
    { codigo: "BAR-003", nombre: "Picapollo", precio: 350, itbis: ITBIS },
    { codigo: "BAR-004", nombre: "Agua 500 ml", precio: 40, itbis: ITBIS, stock: 150 },
  ],
  panaderia_reposteria: [
    { codigo: "PAN-001", nombre: "Pan sobao, unidad", precio: 20, itbis: 0, stock: 150 },
    { codigo: "PAN-002", nombre: "Bizcocho de vainilla, libra", precio: 450, itbis: ITBIS, stock: 12 },
    { codigo: "PAN-003", nombre: "Pastelito de pollo", precio: 60, itbis: ITBIS, stock: 80 },
    { codigo: "PAN-004", nombre: "Cake de cumpleaños (pedido)", precio: 2800, itbis: ITBIS },
  ],
  salon_spa: [
    { codigo: "SAL-001", nombre: "Corte de cabello", precio: 500, itbis: ITBIS },
    { codigo: "SAL-002", nombre: "Manicura y pedicura", precio: 1200, itbis: ITBIS },
    { codigo: "SAL-003", nombre: "Tinte completo", precio: 2800, itbis: ITBIS },
    { codigo: "SAL-004", nombre: "Masaje relajante 60 min", precio: 2200, itbis: ITBIS },
    { codigo: "SAL-005", nombre: "Shampoo profesional", precio: 950, itbis: ITBIS, stock: 20 },
  ],
  taller_mecanico: [
    { codigo: "TAL-001", nombre: "Cambio de aceite y filtro", precio: 2200, itbis: ITBIS },
    { codigo: "TAL-002", nombre: "Alineación y balanceo", precio: 1800, itbis: ITBIS },
    { codigo: "TAL-003", nombre: "Pastillas de freno, juego", precio: 2600, itbis: ITBIS, stock: 14 },
    { codigo: "TAL-004", nombre: "Diagnóstico por computadora", precio: 1500, itbis: ITBIS },
    { codigo: "TAL-005", nombre: "Batería 12 V", precio: 5800, itbis: ITBIS, stock: 8 },
  ],
  clinica_consultorio: [
    { codigo: "CLI-001", nombre: "Consulta general", precio: 1500, itbis: 0 },
    { codigo: "CLI-002", nombre: "Consulta de especialista", precio: 2500, itbis: 0 },
    { codigo: "CLI-003", nombre: "Electrocardiograma", precio: 1800, itbis: 0 },
    { codigo: "CLI-004", nombre: "Limpieza dental", precio: 2000, itbis: 0 },
  ],
  gimnasio: [
    { codigo: "GIM-001", nombre: "Mensualidad", precio: 1800, itbis: ITBIS },
    { codigo: "GIM-002", nombre: "Pase diario", precio: 300, itbis: ITBIS },
    { codigo: "GIM-003", nombre: "Entrenador personal, sesión", precio: 1200, itbis: ITBIS },
    { codigo: "GIM-004", nombre: "Proteína, bote", precio: 3900, itbis: ITBIS, stock: 12 },
  ],
  distribuidora_mayorista: [
    { codigo: "DIS-001", nombre: "Caja de refrescos, 24 u.", precio: 1450, itbis: ITBIS, stock: 90 },
    { codigo: "DIS-002", nombre: "Saco de arroz 100 lb", precio: 3200, itbis: 0, stock: 60 },
    { codigo: "DIS-003", nombre: "Caja de aceite, 12 u.", precio: 2300, itbis: ITBIS, stock: 40 },
    { codigo: "DIS-004", nombre: "Flete a domicilio", precio: 1500, itbis: ITBIS },
  ],
  agencia_consultoria: [
    { codigo: "AGE-001", nombre: "Consultoría, hora", precio: 3500, itbis: ITBIS },
    { codigo: "AGE-002", nombre: "Diseño de logo", precio: 12000, itbis: ITBIS },
    { codigo: "AGE-003", nombre: "Manejo de redes, mensual", precio: 15000, itbis: ITBIS },
    { codigo: "AGE-004", nombre: "Auditoría básica", precio: 25000, itbis: ITBIS },
  ],
  servicios: [
    { codigo: "SER-001", nombre: "Servicio profesional, hora", precio: 2500, itbis: ITBIS },
    { codigo: "SER-002", nombre: "Visita técnica", precio: 1500, itbis: ITBIS },
    { codigo: "SER-003", nombre: "Informe o reporte", precio: 4000, itbis: ITBIS },
    { codigo: "SER-004", nombre: "Mantenimiento mensual", precio: 8000, itbis: ITBIS },
  ],
};

const GENERICO: ProductoEjemplo[] = [
  { codigo: "EJ-001", nombre: "Producto de ejemplo A", precio: 500, itbis: ITBIS, stock: 50 },
  { codigo: "EJ-002", nombre: "Producto de ejemplo B", precio: 1200, itbis: ITBIS, stock: 30 },
  { codigo: "EJ-003", nombre: "Producto exento de ejemplo", precio: 300, itbis: 0, stock: 40 },
  { codigo: "EJ-004", nombre: "Servicio de ejemplo", precio: 2000, itbis: ITBIS },
];

const CLIENTES = [
  { rnc: "00112345678", nombre: "Ana Martínez (ejemplo)", tipo: "fisica", direccion: "Calle Duarte 15", ciudad: "Santo Domingo", contacto: "Ana Martínez", telefono: "809-555-0101", email: "ana@ejemplo.do" },
  { rnc: "130000001", nombre: "Comercial Ejemplo SRL", tipo: "juridica", subtipo: "regular", direccion: "Av. Winston Churchill 100", ciudad: "Santo Domingo", contacto: "Departamento de compras", telefono: "809-555-0102", email: "compras@ejemplo.do" },
  { rnc: "401000001", nombre: "Ministerio de Ejemplo (gobierno)", tipo: "juridica", subtipo: "gobierno", direccion: "Av. México 50", ciudad: "Santo Domingo", contacto: "Tesorería", telefono: "809-555-0103" },
] as const;

/** Carga el catálogo y los clientes de ejemplo SOLO si la empresa está vacía. */
export async function sembrarDatosEjemplo(tenantId: string, tipoNegocio: TipoNegocio): Promise<boolean> {
  const base = adminDb.collection("tenants").doc(tenantId);
  const [p, c] = await Promise.all([base.collection("productos").limit(1).get(), base.collection("clientes").limit(1).get()]);
  if (!p.empty || !c.empty) return false;

  const lote = adminDb.batch();
  for (const it of CATALOGOS[tipoNegocio] ?? GENERICO) {
    lote.set(base.collection("productos").doc(), {
      codigo: it.codigo, nombre: it.nombre, precio: it.precio, itbis: it.itbis,
      controlaStock: it.stock !== undefined, ...(it.stock !== undefined ? { stock: it.stock } : {}),
      activo: true, creadoEn: FieldValue.serverTimestamp(),
    });
  }
  for (const cl of CLIENTES) {
    lote.set(base.collection("clientes").doc(), { ...cl, creadoEn: FieldValue.serverTimestamp() });
  }
  await lote.commit();
  return true;
}
