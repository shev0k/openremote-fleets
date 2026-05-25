import type { LazyRouteFunction, RouteObject } from "react-router";
import {
  AlertTriangle,
  BarChart3,
  FileText,
  type LucideIcon,
  MapPinned,
  MonitorSmartphone,
  Route as RouteIcon,
  Server,
  Settings,
} from "lucide-react";

export interface AppRouteDefinition {
  path: string;
  label: string;
  icon: LucideIcon;
  lazy: LazyRouteFunction<RouteObject>;
  placement: "layout" | "standalone";
  showInNavigation: boolean;
  index?: boolean;
}

export interface AppNavItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

export const appRoutes: AppRouteDefinition[] = [
  {
    path: "/wall-display",
    label: "Wall Display",
    icon: MonitorSmartphone,
    placement: "standalone",
    showInNavigation: false,
    lazy: async () => ({ Component: (await import("./pages/WallDisplay")).WallDisplay }),
  },
  {
    path: "/",
    label: "Live Fleet",
    icon: MapPinned,
    placement: "layout",
    showInNavigation: true,
    index: true,
    lazy: async () => ({ Component: (await import("./pages/LiveFleet")).LiveFleet }),
  },
  {
    path: "/playback",
    label: "Route Playback",
    icon: RouteIcon,
    placement: "layout",
    showInNavigation: true,
    lazy: async () => ({ Component: (await import("./pages/RoutePlayback")).RoutePlayback }),
  },
  {
    path: "/alerts",
    label: "Alerts",
    icon: AlertTriangle,
    placement: "layout",
    showInNavigation: true,
    lazy: async () => ({ Component: (await import("./pages/Alerts")).Alerts }),
  },
  {
    path: "/graphs",
    label: "Graphs",
    icon: BarChart3,
    placement: "layout",
    showInNavigation: true,
    lazy: async () => ({ Component: (await import("./pages/Graphs")).Graphs }),
  },
  {
    path: "/reports",
    label: "Reports",
    icon: FileText,
    placement: "layout",
    showInNavigation: true,
    lazy: async () => ({ Component: (await import("./pages/Reports")).Reports }),
  },
  {
    path: "/admin",
    label: "Assets",
    icon: Server,
    placement: "layout",
    showInNavigation: true,
    lazy: async () => ({ Component: (await import("./pages/AssetsAdmin")).AssetsAdmin }),
  },
  {
    path: "/preferences",
    label: "Preferences",
    icon: Settings,
    placement: "layout",
    showInNavigation: false,
    lazy: async () => ({ Component: (await import("./pages/Preferences")).Preferences }),
  },
];

export const APP_NAV_ITEMS: AppNavItem[] = appRoutes
  .filter((route) => route.showInNavigation)
  .map(({ label, path, icon }) => ({
    name: label,
    path,
    icon,
  }));
