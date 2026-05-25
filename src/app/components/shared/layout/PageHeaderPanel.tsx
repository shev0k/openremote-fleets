import { ReactNode } from "react";
import { PanelCard } from "../cards/PanelCard";
import { classNames } from "../utils/classNames";

interface PageHeaderPanelProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeaderPanel({ title, description, icon, actions, className }: PageHeaderPanelProps) {
  return (
    <PanelCard className={classNames("p-6 flex items-center justify-between shrink-0", className)}>
      <div>
        <h1 className="flex items-center gap-2 text-[22px] font-semibold text-content-primary">
          {icon}
          {title}
        </h1>
        <p className="mt-1 text-[13px] font-medium text-content-muted">{description}</p>
      </div>
      {actions}
    </PanelCard>
  );
}
