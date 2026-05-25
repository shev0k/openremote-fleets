import type { Vehicle } from "../../../../domain/models/vehicle";

const PLACEHOLDER_VALUES = new Set(["", "--", "Unassigned"]);

export function hasVehicleDisplayText(value: string | undefined | null): value is string {
  return Boolean(value && !PLACEHOLDER_VALUES.has(value.trim()));
}

export function formatDriverIdentifier(value: string | undefined | null): string | null {
  return hasVehicleDisplayText(value) ? `Driver ID ${value}` : null;
}

export function formatVehicleIdentitySummary(
  vehicle: Pick<Vehicle, "plate" | "driverName" | "driverIdentifier">,
  { includeDriverIdentifier = true, fallback = "" }: { includeDriverIdentifier?: boolean; fallback?: string } = {},
): string {
  const parts: string[] = [];
  if (hasVehicleDisplayText(vehicle.plate)) {
    parts.push(vehicle.plate);
  }
  if (hasVehicleDisplayText(vehicle.driverName)) {
    parts.push(vehicle.driverName);
  } else if (includeDriverIdentifier) {
    const driverIdentifier = formatDriverIdentifier(vehicle.driverIdentifier);
    if (driverIdentifier) {
      parts.push(driverIdentifier);
    }
  }

  return parts.join(" • ") || fallback;
}

export function formatVehicleDriverDisplay(
  vehicle: Pick<Vehicle, "driverName" | "driverIdentifier">,
  fallback = "Unassigned",
): string {
  if (hasVehicleDisplayText(vehicle.driverName)) {
    return vehicle.driverName;
  }

  return formatDriverIdentifier(vehicle.driverIdentifier) ?? fallback;
}

export function formatVehiclePlateDisplay(vehicle: Pick<Vehicle, "plate">, fallback = ""): string {
  return hasVehicleDisplayText(vehicle.plate) ? vehicle.plate : fallback;
}
