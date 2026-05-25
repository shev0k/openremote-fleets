import {
  Activity,
  BarChart2,
  Fuel,
  Gauge,
  RadioTower,
  Route,
  Settings2,
  ShieldAlert,
  Signal,
  TrendingUp,
  Truck,
  User,
} from "lucide-react";
import { type GraphWidgetId } from "../graphsDashboardModel";
import { type GraphWidgetRegistration } from "./graphWidgetTypes";
import {
  DailyActivityWidget,
  FleetKpisWidget,
  SpeedDistributionWidget,
  SpeedTrendWidget,
  VehicleActivityWidget,
} from "./widgets/reportSnapshotWidgets";
import {
  AlertsByVehicleWidget,
  DriverCoverageWidget,
  EngineLoadWidget,
  FleetStatusWidget,
  FuelBatteryWidget,
  OdometerDistanceWidget,
  TelemetryCoverageWidget,
  TrackerHealthWidget,
} from "./widgets/summaryWidgets";

export const graphWidgetRegistry = {
  "fleet-kpis": {
    id: "fleet-kpis",
    icon: <Activity className="h-4 w-4" />,
    component: FleetKpisWidget,
  },
  "daily-activity": {
    id: "daily-activity",
    icon: <BarChart2 className="h-4 w-4" />,
    component: DailyActivityWidget,
  },
  "speed-trend": {
    id: "speed-trend",
    icon: <TrendingUp className="h-4 w-4" />,
    component: SpeedTrendWidget,
  },
  "speed-distribution": {
    id: "speed-distribution",
    icon: <Gauge className="h-4 w-4" />,
    component: SpeedDistributionWidget,
  },
  "vehicle-activity": {
    id: "vehicle-activity",
    icon: <Truck className="h-4 w-4" />,
    component: VehicleActivityWidget,
  },
  "fleet-status": {
    id: "fleet-status",
    icon: <Signal className="h-4 w-4" />,
    component: FleetStatusWidget,
  },
  "alerts-by-vehicle": {
    id: "alerts-by-vehicle",
    icon: <ShieldAlert className="h-4 w-4" />,
    component: AlertsByVehicleWidget,
  },
  "fuel-battery": {
    id: "fuel-battery",
    icon: <Fuel className="h-4 w-4" />,
    component: FuelBatteryWidget,
  },
  "tracker-health": {
    id: "tracker-health",
    icon: <RadioTower className="h-4 w-4" />,
    component: TrackerHealthWidget,
  },
  "telemetry-coverage": {
    id: "telemetry-coverage",
    icon: <Settings2 className="h-4 w-4" />,
    component: TelemetryCoverageWidget,
  },
  "driver-coverage": {
    id: "driver-coverage",
    icon: <User className="h-4 w-4" />,
    component: DriverCoverageWidget,
  },
  "engine-load": {
    id: "engine-load",
    icon: <Gauge className="h-4 w-4" />,
    component: EngineLoadWidget,
  },
  "odometer-distance": {
    id: "odometer-distance",
    icon: <Route className="h-4 w-4" />,
    component: OdometerDistanceWidget,
  },
} satisfies Record<GraphWidgetId, GraphWidgetRegistration>;

export function getGraphWidgetRegistration(widgetId: GraphWidgetId): GraphWidgetRegistration {
  return graphWidgetRegistry[widgetId];
}
