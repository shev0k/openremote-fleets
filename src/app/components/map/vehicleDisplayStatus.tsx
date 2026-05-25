import { AlertTriangle, LucideIcon, Navigation, PauseCircle, Power, SquareParking } from "lucide-react";
import { Vehicle } from "../../../domain/models/vehicle";

export type VehicleDisplayStatus = "alerting" | "moving" | "idling" | "parked" | "stationary" | "offline";

export interface VehicleDisplayStatusMeta {
  id: VehicleDisplayStatus;
  label: string;
  colorClassName: string;
  badgeClassName: string;
  icon: LucideIcon;
  priority: number;
}

const VEHICLE_DISPLAY_STATUS_META: Record<VehicleDisplayStatus, VehicleDisplayStatusMeta> = {
  alerting: {
    id: "alerting",
    label: "Alerting",
    colorClassName: "vehicle-status-text vehicle-status-alerting",
    badgeClassName: "vehicle-status-badge vehicle-status-alerting",
    icon: AlertTriangle,
    priority: 4,
  },
  moving: {
    id: "moving",
    label: "Moving",
    colorClassName: "vehicle-status-text vehicle-status-moving",
    badgeClassName: "vehicle-status-badge vehicle-status-moving",
    icon: Navigation,
    priority: 3,
  },
  idling: {
    id: "idling",
    label: "Idling",
    colorClassName: "vehicle-status-text vehicle-status-idling",
    badgeClassName: "vehicle-status-badge vehicle-status-idling",
    icon: PauseCircle,
    priority: 2,
  },
  parked: {
    id: "parked",
    label: "Parked",
    colorClassName: "vehicle-status-text vehicle-status-parked",
    badgeClassName: "vehicle-status-badge vehicle-status-parked",
    icon: SquareParking,
    priority: 2,
  },
  stationary: {
    id: "stationary",
    label: "Stationary",
    colorClassName: "vehicle-status-text vehicle-status-stationary",
    badgeClassName: "vehicle-status-badge vehicle-status-stationary",
    icon: PauseCircle,
    priority: 2,
  },
  offline: {
    id: "offline",
    label: "Offline",
    colorClassName: "vehicle-status-text vehicle-status-offline",
    badgeClassName: "vehicle-status-badge vehicle-status-offline",
    icon: Power,
    priority: 1,
  },
};

export function resolveVehicleDisplayStatus(vehicle: Pick<Vehicle, "status" | "speedKph" | "activeAlertCount">): VehicleDisplayStatus {
  if (vehicle.status === "alerting" || vehicle.activeAlertCount > 0) {
    return "alerting";
  }

  if (vehicle.status === "offline") {
    return "offline";
  }

  if (vehicle.status === "idling" || vehicle.status === "parked" || vehicle.status === "stationary") {
    return vehicle.status;
  }

  return "moving";
}

export function getVehicleDisplayStatusMeta(vehicle: Pick<Vehicle, "status" | "speedKph" | "activeAlertCount">): VehicleDisplayStatusMeta {
  return VEHICLE_DISPLAY_STATUS_META[resolveVehicleDisplayStatus(vehicle)];
}

export function getVehicleDisplayStatusCatalogue(): VehicleDisplayStatusMeta[] {
  return Object.values(VEHICLE_DISPLAY_STATUS_META);
}
