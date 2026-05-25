import { Battery, CalendarClock, CarFront, Cpu, RadioTower, Wifi } from "lucide-react";
import { SelectionDropdown } from "../../components/shared/controls/SelectionDropdown";
import { ToolbarSearchField } from "../../components/shared/inputs/ToolbarSearchField";
import { FilterBar } from "../../components/shared/layout/FilterBar";
import {
  AssetBatteryFilter,
  AssetFilters,
  AssetFilterOptions,
  AssetGsmQualityFilter,
  AssetLastSyncFilter,
  AssetStatusFilter,
} from "./assetFilters";

interface AssetFilterBarProps {
  filters: AssetFilters;
  options: AssetFilterOptions;
  onFiltersChange: (filters: AssetFilters) => void;
}

const statusOptions: Array<{ id: AssetStatusFilter; label: string }> = [
  { id: "all", label: "All statuses" },
  { id: "Connected", label: "Connected" },
  { id: "Degraded", label: "Degraded" },
  { id: "Disconnected", label: "Disconnected" },
];

const gsmOptions: Array<{ id: AssetGsmQualityFilter; label: string }> = [
  { id: "all", label: "Any GSM" },
  { id: "good", label: "Good GSM" },
  { id: "weak", label: "Weak GSM" },
  { id: "offline", label: "Offline GSM" },
];

const batteryOptions: Array<{ id: AssetBatteryFilter; label: string }> = [
  { id: "all", label: "Any battery" },
  { id: "healthy", label: "Healthy" },
  { id: "watch", label: "Watch" },
  { id: "low", label: "Low" },
];

const lastSyncOptions: Array<{ id: AssetLastSyncFilter; label: string }> = [
  { id: "all", label: "Any sync" },
  { id: "last24Hours", label: "Last 24 hours" },
  { id: "last7Days", label: "Last 7 days" },
  { id: "stale", label: "Stale" },
];

function labelFor(options: Array<{ id: string; label: string }>, value: string): string {
  return options.find((option) => option.id === value)?.label ?? value;
}

export function AssetFilterBar({ filters, options, onFiltersChange }: AssetFilterBarProps) {
  const updateFilter = <Key extends keyof AssetFilters>(key: Key, value: AssetFilters[Key]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <FilterBar
      className="p-5"
      left={
        <ToolbarSearchField
          value={filters.searchQuery}
          onChange={(value) => updateFilter("searchQuery", value)}
          placeholder="Search asset, vehicle, IMEI..."
          className="w-full min-w-[220px] sm:w-auto"
          inputClassName="sm:w-72"
        />
      }
      right={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <SelectionDropdown
            value={labelFor(statusOptions, filters.status)}
            leadingIcon={<Wifi />}
            menuTitle="Status"
            options={statusOptions}
            activeOptionId={filters.status}
            onChange={(value) => updateFilter("status", value as AssetStatusFilter)}
            triggerClassName="!bg-toolbar-surface !border-border-subtle !text-content-muted hover:!bg-surface-elevated hover:!text-content-primary"
          />
          <SelectionDropdown
            value={labelFor(options.vehicles, filters.vehicleId)}
            leadingIcon={<CarFront />}
            menuTitle="Vehicle"
            options={options.vehicles}
            activeOptionId={filters.vehicleId}
            onChange={(value) => updateFilter("vehicleId", value)}
            triggerClassName="!bg-toolbar-surface !border-border-subtle !text-content-muted hover:!bg-surface-elevated hover:!text-content-primary"
          />
          <SelectionDropdown
            value={labelFor(options.models, filters.model)}
            leadingIcon={<Cpu />}
            menuTitle="Model"
            options={options.models}
            activeOptionId={filters.model}
            onChange={(value) => updateFilter("model", value)}
            triggerClassName="!bg-toolbar-surface !border-border-subtle !text-content-muted hover:!bg-surface-elevated hover:!text-content-primary"
          />
          <SelectionDropdown
            value={labelFor(gsmOptions, filters.gsmQuality)}
            leadingIcon={<RadioTower />}
            menuTitle="GSM"
            options={gsmOptions}
            activeOptionId={filters.gsmQuality}
            onChange={(value) => updateFilter("gsmQuality", value as AssetGsmQualityFilter)}
            triggerClassName="!bg-toolbar-surface !border-border-subtle !text-content-muted hover:!bg-surface-elevated hover:!text-content-primary"
          />
          <SelectionDropdown
            value={labelFor(batteryOptions, filters.battery)}
            leadingIcon={<Battery />}
            menuTitle="Battery"
            options={batteryOptions}
            activeOptionId={filters.battery}
            onChange={(value) => updateFilter("battery", value as AssetBatteryFilter)}
            triggerClassName="!bg-toolbar-surface !border-border-subtle !text-content-muted hover:!bg-surface-elevated hover:!text-content-primary"
          />
          <SelectionDropdown
            value={labelFor(lastSyncOptions, filters.lastSync)}
            leadingIcon={<CalendarClock />}
            menuTitle="Last sync"
            options={lastSyncOptions}
            activeOptionId={filters.lastSync}
            onChange={(value) => updateFilter("lastSync", value as AssetLastSyncFilter)}
            triggerClassName="!bg-toolbar-surface !border-border-subtle !text-content-muted hover:!bg-surface-elevated hover:!text-content-primary"
          />
        </div>
      }
    />
  );
}
