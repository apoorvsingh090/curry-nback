"use client";

import { useEffect, useRef, useState } from "react";

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

const TICK_FONT = 20;
const LABEL_FONT = 20;
const AXIS_COLOR = "#5B4632";
const GRID_COLOR = "#E3D5C4";
const BRAND = "#9A3412";

/**
 * Hand-rolled SVG line chart: no chart library, so it stays small, fully
 * accessible and renders identically offline.
 *
 * The SVG is drawn 1:1 with its container (the viewBox width tracks the
 * measured pixel width), so the label text never shrinks below the 20px
 * body-text minimum on a phone.
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width ?? 0;
      if (measured > 0) setWidth(Math.round(measured));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const height = 300;
  const padLeft = 60;
  const padRight = 20;
  const padTop = 24;
  const padBottom = 48;

  const plotW = Math.max(40, width - padLeft - padRight);
  const plotH = height - padTop - padBottom;

  const range = Math.max(1, max - min);
  const xFor = (i: number) =>
    points.length === 1
      ? padLeft + plotW / 2
      : padLeft + (i / (points.length - 1)) * plotW;
  const yFor = (v: number) => padTop + plotH - ((v - min) / range) * plotH;

  const ticks = [min, min + range / 4, min + range / 2, min + (3 * range) / 4, max];

  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(p.value).toFixed(1)}`
    )
    .join(" ");

  // X-axis labels: every n-th point, plus the last one when it does not
  // collide with the previous label. The stride is widened further on narrow
  // screens so the 20px labels never overlap.
  const longestLabel = points.reduce((max, p) => Math.max(max, p.label.length), 0);
  const estimatedLabelWidth = longestLabel * LABEL_FONT * 0.58 + 16;
  const maxLabels = Math.max(1, Math.floor(plotW / estimatedLabelWidth));
  const stride = Math.max(labelEvery, Math.ceil(points.length / maxLabels));

  const labelIndices = new Set<number>();
  for (let i = 0; i < points.length; i += stride) labelIndices.add(i);
  const lastIndex = points.length - 1;
  const lastGridIndex = Math.floor(lastIndex / stride) * stride;
  if (lastIndex - lastGridIndex >= stride) labelIndices.add(lastIndex);

  return (
    <div ref={containerRef} className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="block"
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
              stroke={GRID_COLOR}
              strokeWidth={2}
            />
            <text
              x={padLeft - 10}
              y={yFor(t) + 7}
              textAnchor="end"
              fontSize={TICK_FONT}
              fill={AXIS_COLOR}
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
            stroke={BRAND}
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
            stroke={GRID_COLOR}
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
              stroke={BRAND}
              strokeWidth={4}
            />
            {labelIndices.has(i) ? (
              <text
                x={xFor(i)}
                y={height - 14}
                textAnchor="middle"
                fontSize={LABEL_FONT}
                fill={AXIS_COLOR}
              >
                {p.label}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}
