"use client";

export interface ChartPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  points: ChartPoint[];
  title: string;
  description: string;
  max?: number;
  min?: number;
  unit?: string;
  /** Show every n-th x-axis label (keeps long histories readable). */
  labelEvery?: number;
}

/**
 * Hand-rolled SVG line chart: no chart library, so it stays small, fully
 * accessible and renders identically offline.
 */
export default function LineChart({
  points,
  title,
  description,
  max = 100,
  min = 0,
  unit = "",
  labelEvery = 1,
}: LineChartProps) {
  const width = 640;
  const height = 280;
  const padLeft = 56;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 44;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const range = Math.max(1, max - min);
  const xFor = (i: number) =>
    points.length === 1
      ? padLeft + plotW / 2
      : padLeft + (i / (points.length - 1)) * plotW;
  const yFor = (v: number) => padTop + plotH - ((v - min) / range) * plotH;

  const ticks = [min, min + range / 4, min + range / 2, min + (3 * range) / 4, max];

  // X-axis labels: every n-th point, plus the last one when it does not
  // collide with the previous label.
  const labelIndices = new Set<number>();
  for (let i = 0; i < points.length; i += labelEvery) labelIndices.add(i);
  const lastIndex = points.length - 1;
  const lastGridIndex = Math.floor(lastIndex / labelEvery) * labelEvery;
  if (lastIndex - lastGridIndex >= labelEvery) labelIndices.add(lastIndex);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(p.value).toFixed(1)}`)
    .join(" ");

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={description}
      >
        <title>{title}</title>
        <desc>{description}</desc>

        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke="#E3D5C4"
              strokeWidth={2}
            />
            <text
              x={padLeft - 10}
              y={yFor(t) + 7}
              textAnchor="end"
              fontSize={18}
              fill="#5B4632"
            >
              {Math.round(t)}
              {unit}
            </text>
          </g>
        ))}

        {points.length > 1 ? (
          <path
            d={path}
            fill="none"
            stroke="#9A3412"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {points.length === 1 ? (
          <line
            x1={padLeft}
            x2={width - padRight}
            y1={yFor(points[0].value)}
            y2={yFor(points[0].value)}
            stroke="#E3D5C4"
            strokeWidth={3}
            strokeDasharray="8 8"
          />
        ) : null}

        {points.map((p, i) => (
          <g key={`${p.label}-${i}`}>
            <circle
              cx={xFor(i)}
              cy={yFor(p.value)}
              r={9}
              fill="#FFFFFF"
              stroke="#9A3412"
              strokeWidth={4}
            />
            {labelIndices.has(i) ? (
              <text
                x={xFor(i)}
                y={height - 14}
                textAnchor="middle"
                fontSize={17}
                fill="#5B4632"
              >
                {p.label}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </figure>
  );
}
