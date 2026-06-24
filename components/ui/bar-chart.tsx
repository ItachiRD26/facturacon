interface BarChartProps {
  data:   { label: string; value: number }[];
  height?: number;
  color?:  string;
}

export default function BarChart({ data, height = 140, color = "var(--c-brand)" }: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barAreaHeight = height - 38;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height, fontFamily: "var(--font-sans)" }}>
      {data.map((d) => (
        <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
          <div style={{ fontSize: 11, color: "var(--c-text-3)", fontWeight: 600 }}>{d.value}</div>
          <div style={{
            width: "100%", maxWidth: 30, borderRadius: "3px 3px 0 0",
            background: color, height: Math.max(3, (d.value / max) * barAreaHeight),
            transition: "height 0.2s ease-out",
          }} />
          <div style={{ fontSize: 10, color: "var(--c-text-3)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
            {d.label}
          </div>
        </div>
      ))}
    </div>
  );
}
