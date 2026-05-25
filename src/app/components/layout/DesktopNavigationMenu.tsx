import { NavLink } from "react-router";
import { APP_NAV_ITEMS } from "./navItems";
import React from "react";

interface DesktopNavigationMenuProps {
  activeAlertsCount: number;
}

export function DesktopNavigationMenu({ activeAlertsCount }: DesktopNavigationMenuProps) {
  return (
    <nav aria-label="Primary navigation" className="mx-4 hidden h-full items-center overflow-x-auto overflow-y-hidden p-1 custom-scrollbar xl:flex">
      {APP_NAV_ITEMS.map((item, index) => (
        <React.Fragment key={item.path}>
          <NavLink
            to={item.path}
            className={({ isActive }) =>
              `relative flex h-full items-center gap-2 whitespace-nowrap px-4 py-2 text-[14px] font-medium transition-all duration-300 lg:px-5 lg:text-[15px] group ${
                isActive ? "text-brand" : "text-content-muted hover:text-content-primary"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {item.name}
                {item.name === "Alerts" && activeAlertsCount > 0 && (
                  <span
                    className={`flex min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold h-[20px] transition-colors ${
                      isActive
                        ? "bg-brand/20 text-brand brand-glow-badge"
                        : "bg-danger text-danger-foreground group-hover:bg-danger/90 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                    }`}
                  >
                    {activeAlertsCount}
                  </span>
                )}
                
                {/* Active Indicator Line */}
                {isActive && (
                  <div className="brand-glow-nav absolute left-4 right-4 bottom-0 h-[3px] rounded-t-full bg-brand" />
                )}
              </>
            )}
          </NavLink>

          {/* Separator - skip for the last item */}
          {index < APP_NAV_ITEMS.length - 1 && (
            <div className="mx-1 h-3.5 w-px bg-border-strong opacity-40 shrink-0" />
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
