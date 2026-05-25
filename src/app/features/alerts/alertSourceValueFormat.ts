import type { FleetAlert } from "../../../domain/models/alerts";

export function formatAlertSourceValue(value: FleetAlert["sourceValue"]): string | null {
  if (value === undefined) {
    return null;
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}
