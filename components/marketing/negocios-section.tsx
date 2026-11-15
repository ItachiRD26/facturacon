const negocios = [
  "Ferreterías", "Farmacias", "Colmados y supermercados", "Restaurantes",
  "Salones y spas", "Talleres mecánicos", "Clínicas y consultorios", "Servicios profesionales",
];

// Tipos de negocio para los que sirve el sistema base. Sin envoltorio de sección.
export default function NegociosSection() {
  return (
    <ul style={{ listStyle: "none", display: "flex", flexWrap: "wrap", gap: 10 }}>
      {negocios.map((n) => (
        <li key={n} style={{
          padding: "9px 16px", background: "var(--c-bg)", border: "1px solid var(--c-border)",
          borderRadius: 999, fontSize: 14.5, fontWeight: 600, color: "var(--c-text-1)",
        }}>
          {n}
        </li>
      ))}
    </ul>
  );
}
