import { type ReactNode } from "react";
import { classNames } from "../../../components/shared/utils/classNames";

export function formatPercent(value: number | null): string {
  return value === null ? "--" : `${value}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString();
}

export function formatKilometers(value: number | null): string {
  return value === null ? "--" : `${formatNumber(value)} km`;
}

export function formatChartValue(value: number, unit?: string): string {
  return `${Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1)}${unit ? ` ${unit}` : ""}`;
}

export function progressWidth(value: number | null, max = 100): string {
  if (value === null) return "0%";
  return `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
}

export function toneClass(tone: "normal" | "warning" | "critical") {
  if (tone === "critical") return "text-danger";
  if (tone === "warning") return "text-warning";
  return "text-content-primary";
}

export function MiniBar({
  value,
  tone = "brand",
  max = 100,
  compact = false,
}: {
  value: number | null;
  tone?: "brand" | "info" | "warning" | "danger";
  max?: number;
  compact?: boolean;
}) {
  const colorClass = {
    brand: "bg-brand",
    info: "bg-info",
    warning: "bg-warning",
    danger: "bg-danger",
  }[tone];

  return (
    <div className={classNames("overflow-hidden rounded-full bg-surface-sunken", compact ? "h-1" : "h-1.5")}>
      <div className={classNames("h-full rounded-full", colorClass)} style={{ width: progressWidth(value, max) }} />
    </div>
  );
}

export function sparklinePoints(values: number[], min: number, max: number): string {
  const range = max - min || 1;
  const lastIndex = Math.max(1, values.length - 1);

  return values
    .map((value, index) => {
      const x = (index / lastIndex) * 100;
      const y = 44 - ((value - min) / range) * 36;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function CompactSpeedSparkline({ data }: { data: Array<{ average: number; max: number }> }) {
  const values = data.flatMap((point) => [point.average, point.max]);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <svg viewBox="0 0 100 48" preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden="true">
      {[8, 24, 40].map((y) => (
        <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="var(--border-subtle)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      ))}
      <polyline
        points={sparklinePoints(data.map((point) => point.max), min, max)}
        fill="none"
        stroke="var(--danger)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        points={sparklinePoints(data.map((point) => point.average), min, max)}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function SummaryChip({
  icon,
  label,
  value,
  compact = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={classNames("rounded-[14px] border border-border-subtle bg-panel-muted", compact ? "p-2.5" : "p-3")}>
      <div className={classNames("flex items-center gap-2 font-semibold uppercase text-content-muted", compact ? "text-[10px] tracking-[0.08em]" : "text-[11px] tracking-[0.12em]")}>
        <span className="text-brand">{icon}</span>
        {label}
      </div>
      <div className={classNames("mt-2 font-semibold text-content-primary", compact ? "text-[18px]" : "text-[22px]")}>{value}</div>
    </div>
  );
}

export function EmptyWidgetState({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[140px] items-center justify-center rounded-[14px] border border-border-subtle bg-panel-muted p-4 text-center text-[12px] text-content-muted">
      {label}
    </div>
  );
}
