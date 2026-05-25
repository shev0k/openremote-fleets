/* ======== IMPORTS ======== */

import { AlertTriangle, List, Search, X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Vehicle } from "../../../../../../domain/models/vehicle";
import { PanelCard } from "../../../../../components/shared/cards/PanelCard";
import { getVehicleDisplayStatusMeta } from "../../../../../components/map/vehicleDisplayStatus";
import { useAppPreferences } from "../../../../../providers/AppPreferencesProvider";
import { formatVehicleIdentitySummary } from "../../vehicleIdentityDisplay";

/* ======== TYPES ======== */

interface FleetListWidgetProps {
  fleetFilterTabs: readonly string[];
  activeFilter: string;
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  isLoading: boolean;
  alertPreviewByVehicleId?: Record<string, { type: string; rule: string; timeIso: string; total: number } | undefined>;
  onFilterChange: (nextFilter: string) => void;
  onSelectVehicle: (vehicleId: string) => void;
}

/* ======== COMPONENT ======== */

export function FleetListWidget({
  fleetFilterTabs,
  activeFilter,
  vehicles,
  selectedVehicleId,
  isLoading,
  alertPreviewByVehicleId = {},
  onFilterChange,
  onSelectVehicle,
}: FleetListWidgetProps) {
  const { formatTime } = useAppPreferences();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRegionRef = useRef<HTMLDivElement | null>(null);
  const selectedRowRef = useRef<HTMLButtonElement | null>(null);
  const previousSelectedVehicleIdRef = useRef<string | null>(null);
  const scrollTopRef = useRef(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const filteredVehicles = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return vehicles;
    }

    return vehicles.filter((vehicle) =>
      [vehicle.name, vehicle.plate, vehicle.driverName, vehicle.driverIdentifier, vehicle.assetName, vehicle.trackerId]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [searchQuery, vehicles]);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  useLayoutEffect(() => {
    const scrollRegion = scrollRegionRef.current;
    if (!scrollRegion) {
      return;
    }

    scrollRegion.scrollTop = scrollTopRef.current;
    const selectionChanged = selectedVehicleId !== previousSelectedVehicleIdRef.current;
    if (selectionChanged && selectedVehicleId && typeof selectedRowRef.current?.scrollIntoView === "function") {
      selectedRowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    previousSelectedVehicleIdRef.current = selectedVehicleId;
  }, [filteredVehicles, selectedVehicleId]);

  const formatLastUpdated = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) {
      return "Last --";
    }

    return `Last ${formatTime(date)}`;
  };

  return (
    <PanelCard className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-subtle px-3.5 py-3">
        <div>
          <h3 className="text-[15px] font-semibold text-content-primary">Fleet list</h3>
          <p className="mt-0.5 text-[11px] text-content-muted">Dense vehicle queue for map, route, and overlay sync.</p>
        </div>
        <List className="h-4 w-4 text-content-muted" />
      </div>
      <div className="relative border-b border-border-subtle px-3.5 py-2.5">
        <div className="app-panel-muted !rounded-full grid grid-cols-6 items-center gap-1.5 px-1.5 py-1.5">
          <>
            {fleetFilterTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onFilterChange(tab)}
                className={`w-full whitespace-nowrap rounded-full px-2 py-1.5 text-center text-[11px] font-medium transition-colors border ${
                  activeFilter === tab
                    ? "border-brand/20 bg-brand/10 text-brand"
                    : "border-transparent text-content-muted hover:bg-surface-elevated hover:text-content-primary"
                }`}
              >
                {tab}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsSearchOpen((current) => !current)}
              className={`flex h-full w-full items-center justify-center px-1 py-1 text-content-muted transition-colors hover:text-content-primary ${
                isSearchOpen || searchQuery ? "text-brand" : ""
              }`}
              title="Search fleet"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </>
        </div>
        {isSearchOpen ? (
          <div className="app-overlay absolute right-3.5 top-[calc(100%+0.5rem)] z-20 w-[220px] rounded-[18px] p-2.5 shadow-[0_18px_36px_-20px_rgba(0,0,0,0.65)]">
            <div className="app-panel-muted flex items-center gap-2 rounded-[14px] px-2.5 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-content-muted" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search fleet"
                className="w-full bg-transparent text-[11px] text-content-primary outline-none placeholder:text-content-muted"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setIsSearchOpen(false);
                }}
                className="text-content-muted transition-colors hover:text-content-primary"
                title="Close search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <div
        ref={scrollRegionRef}
        data-testid="fleet-list-scroll-region"
        className="scrollbar-none flex-1 min-h-0 divide-y divide-border-subtle overflow-y-auto"
        onScroll={(event) => {
          scrollTopRef.current = event.currentTarget.scrollTop;
        }}
      >
        {filteredVehicles.map((vehicle) => {
          const statusMeta = getVehicleDisplayStatusMeta(vehicle);
          const StatusIcon = statusMeta.icon;
          const isSelected = vehicle.id === selectedVehicleId;
          const alertPreview = alertPreviewByVehicleId[vehicle.id];

          return (
            <button
              type="button"
              key={vehicle.id}
              ref={isSelected ? selectedRowRef : undefined}
              onClick={() => onSelectVehicle(vehicle.id)}
              className={`flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors ${isSelected ? "bg-brand/8" : "hover:bg-surface-elevated"}`}
            >
              <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl ${statusMeta.badgeClassName}`}>
                <StatusIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className={`truncate text-[12px] font-semibold ${isSelected ? "text-brand" : "text-content-primary"}`}>{vehicle.name}</p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {vehicle.activeAlertCount > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-1.5 py-0.5 text-[9px] font-semibold text-danger">
                        <AlertTriangle className="h-3 w-3" />
                        {vehicle.activeAlertCount}
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${statusMeta.badgeClassName}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                </div>
                <p className="mt-0.5 truncate text-[10.5px] text-content-muted">
                  {formatVehicleIdentitySummary(vehicle, { fallback: "No assigned identity" })}
                </p>
                <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-[10.5px]">
                  <span className="truncate text-content-secondary">
                    {vehicle.assetName} • IMEI {vehicle.trackerId}
                  </span>
                  <span className="shrink-0 font-semibold text-content-primary">{vehicle.speedKph} km/h</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[10px]">
                  <span className="truncate text-content-muted">{formatLastUpdated(vehicle.lastUpdatedIso)}</span>
                  {alertPreview ? (
                    <span className="truncate text-right font-medium text-danger">
                      {alertPreview.type}
                      {alertPreview.total > 1 ? ` +${alertPreview.total - 1}` : ""}
                    </span>
                  ) : (
                    <span className="text-content-muted">No active alert</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
        {!filteredVehicles.length ? (
          <div className="px-4 py-8 text-center text-[12px] text-content-muted">
            {isLoading ? "Loading fleet..." : searchQuery ? "No vehicles match the current search." : "No fleet data available."}
          </div>
        ) : null}
      </div>
    </PanelCard>
  );
}
