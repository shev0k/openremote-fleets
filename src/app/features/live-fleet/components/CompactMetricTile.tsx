import type { ReactNode } from "react";
import { classNames } from "../../../components/shared/utils/classNames";

interface CompactMetricTileProps {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  valueClassName?: string;
  className?: string;
  labelClassName?: string;
  valueSize?: "sm" | "md";
}

export function CompactMetricTile({
  icon,
  label,
  value,
  valueClassName,
  className,
  labelClassName,
  valueSize = "sm",
}: CompactMetricTileProps) {
  return (
    <div className={classNames("min-w-0 rounded-[14px] border border-border-subtle bg-panel px-2 py-1.5", className)}>
      <div
        className={classNames(
          "mb-0.5 flex min-w-0 items-center gap-1 text-[8.5px] font-semibold uppercase tracking-[0.1em] text-content-muted",
          labelClassName,
        )}
      >
        {icon ? <span className="shrink-0">{icon}</span> : null}
        <span className="truncate">{label}</span>
      </div>
      <p
        className={classNames(
          "truncate font-mono font-semibold",
          valueSize === "md" ? "text-[14px]" : "text-[11px]",
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  );
}
