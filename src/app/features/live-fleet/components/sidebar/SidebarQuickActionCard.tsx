/* ======== IMPORTS ======== */

import { ReactNode } from "react";

/* ======== TYPES ======== */

interface SidebarQuickActionCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  isActive?: boolean;
  onClick: () => void;
}

/* ======== COMPONENT ======== */

export function SidebarQuickActionCard({
  title,
  description,
  icon,
  isActive = false,
  onClick,
}: SidebarQuickActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pointer-events-auto app-panel w-full rounded-[24px] p-4 text-left transition-colors ${
        isActive ? "border-brand/25 bg-brand/10" : "hover:border-border-inverse"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold text-content-primary">{title}</p>
          <p className="mt-1 text-[12px] text-content-muted">{description}</p>
        </div>
        {icon}
      </div>
    </button>
  );
}
