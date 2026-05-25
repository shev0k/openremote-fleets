import { NavLink } from "react-router";
import { APP_NAV_ITEMS, AppNavItem } from "./navItems";

interface CompactNavigationBarProps {
  activeAlertsCount: number;
}

function CompactNavIcon({ item }: { item: AppNavItem }) {
  const Icon = item.icon;
  return <Icon className="h-5 w-5" />;
}

export function CompactNavigationBar({ activeAlertsCount }: CompactNavigationBarProps) {
  return (
    <nav aria-label="Compact navigation" className="fixed bottom-0 left-0 right-0 z-[4000] flex h-16 items-center justify-around border-t border-border-subtle bg-panel px-2 pb-safe xl:hidden">
      {APP_NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `relative flex h-full w-full flex-col items-center justify-center gap-1 ${
              isActive ? "text-brand" : "text-content-muted hover:text-content-secondary"
            }`
          }
        >
          <div className="relative">
            <CompactNavIcon item={item} />
            {item.name === "Alerts" && activeAlertsCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full border-2 border-panel bg-danger px-1 text-[9px] font-bold text-danger-foreground">
                {activeAlertsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium truncate w-full text-center px-1">{item.name}</span>
        </NavLink>
      ))}
    </nav>
  );
}
