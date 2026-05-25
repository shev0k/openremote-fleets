import { ReactNode } from "react";
import { classNames } from "../utils/classNames";

interface MetricTileCardProps {
  icon: ReactNode;
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  className?: string;
}

export function MetricTileCard({
  icon,
  title,
  value,
  subtitle,
  badge,
  className,
}: MetricTileCardProps) {
  return (
    <div
      className={classNames(
        "app-panel relative flex flex-col justify-between overflow-hidden p-6",
        className,
      )}
    >
      <div className="flex justify-between items-start mb-4">
        {icon}
        {badge}
      </div>
      <div className="mb-1 text-[13px] font-medium text-content-muted">{title}</div>
      <div className="flex items-baseline gap-2 text-[32px] font-semibold text-content-primary">{value}</div>
      {subtitle ? <div className="mt-1 text-[12px] text-content-muted">{subtitle}</div> : null}
    </div>
  );
}
