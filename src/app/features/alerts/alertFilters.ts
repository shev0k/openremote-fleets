import { AlertSeverity, AlertState, FleetAlert } from "../../../domain/models/alerts";

export type AlertSeverityFilter = AlertSeverity | "all";
export type AlertStateFilter = AlertState | "all";
export type AlertDateRangeFilter = "all" | "today" | "last24Hours" | "last7Days";

export interface AlertFilters {
  searchQuery: string;
  vehicleId: string;
  severity: AlertSeverityFilter;
  state: AlertStateFilter;
  type: string;
  dateRange: AlertDateRangeFilter;
}

export interface AlertFilterOption {
  id: string;
  label: string;
}

export interface AlertFilterOptions {
  vehicles: AlertFilterOption[];
  types: AlertFilterOption[];
}

export const DEFAULT_ALERT_FILTERS: AlertFilters = {
  searchQuery: "",
  vehicleId: "all",
  severity: "all",
  state: "all",
  type: "all",
  dateRange: "all",
};

function normalizeSearchValue(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function isSameLocalDate(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function matchesDateRange(alertTime: Date, dateRange: AlertDateRangeFilter, now: Date): boolean {
  if (dateRange === "all") {
    return true;
  }

  if (dateRange === "today") {
    return isSameLocalDate(alertTime, now);
  }

  const ageMs = now.getTime() - alertTime.getTime();
  if (dateRange === "last24Hours") {
    return ageMs >= 0 && ageMs <= 24 * 60 * 60 * 1000;
  }

  return ageMs >= 0 && ageMs <= 7 * 24 * 60 * 60 * 1000;
}

function matchesSearch(alert: FleetAlert, searchQuery: string): boolean {
  const query = normalizeSearchValue(searchQuery);
  if (!query) {
    return true;
  }

  return [
    alert.vehicleName,
    alert.type,
    alert.rule,
    alert.state,
    alert.severity,
    alert.sourceAttribute,
    alert.sourceValue,
  ].some((value) => normalizeSearchValue(value).includes(query));
}

export function filterAlerts(alerts: FleetAlert[], filters: AlertFilters, now: Date = new Date()): FleetAlert[] {
  return alerts.filter((alert) => {
    if (filters.vehicleId !== "all" && alert.vehicleId !== filters.vehicleId) {
      return false;
    }

    if (filters.severity !== "all" && alert.severity !== filters.severity) {
      return false;
    }

    if (filters.state !== "all" && alert.state !== filters.state) {
      return false;
    }

    if (filters.type !== "all" && alert.type !== filters.type) {
      return false;
    }

    if (!matchesDateRange(new Date(alert.timeIso), filters.dateRange, now)) {
      return false;
    }

    return matchesSearch(alert, filters.searchQuery);
  });
}

export function buildAlertFilterOptions(alerts: FleetAlert[]): AlertFilterOptions {
  const vehicles = new Map<string, string>();
  const types = new Set<string>();

  for (const alert of alerts) {
    if (alert.vehicleId) {
      vehicles.set(alert.vehicleId, alert.vehicleName);
    }
    types.add(alert.type);
  }

  return {
    vehicles: [
      { id: "all", label: "All vehicles" },
      ...Array.from(vehicles.entries())
        .sort((first, second) => first[1].localeCompare(second[1]))
        .map(([id, label]) => ({ id, label })),
    ],
    types: [
      { id: "all", label: "All types" },
      ...Array.from(types)
        .sort((first, second) => first.localeCompare(second))
        .map((type) => ({ id: type, label: type })),
    ],
  };
}
