import { CalendarDays, CarFront, Filter, ListFilter, Search } from "lucide-react";
import { SelectionDropdown } from "../../components/shared/controls/SelectionDropdown";
import { ToolbarSearchField } from "../../components/shared/inputs/ToolbarSearchField";
import { FilterBar } from "../../components/shared/layout/FilterBar";
import { AlertDateRangeFilter, AlertFilters, AlertFilterOptions, AlertSeverityFilter, AlertStateFilter } from "./alertFilters";

interface AlertFilterBarProps {
  filters: AlertFilters;
  options: AlertFilterOptions;
  onFiltersChange: (filters: AlertFilters) => void;
}

const severityOptions: Array<{ id: AlertSeverityFilter; label: string }> = [
  { id: "all", label: "All severities" },
  { id: "high", label: "High severity" },
  { id: "medium", label: "Medium severity" },
  { id: "low", label: "Low severity" },
];

const stateOptions: Array<{ id: AlertStateFilter; label: string }> = [
  { id: "all", label: "All states" },
  { id: "Active", label: "Active" },
  { id: "Acknowledged", label: "Acknowledged" },
  { id: "Resolved", label: "Resolved" },
];

const dateOptions: Array<{ id: AlertDateRangeFilter; label: string }> = [
  { id: "all", label: "Any time" },
  { id: "today", label: "Today" },
  { id: "last24Hours", label: "Last 24 hours" },
  { id: "last7Days", label: "Last 7 days" },
];

function labelFor(options: Array<{ id: string; label: string }>, value: string): string {
  return options.find((option) => option.id === value)?.label ?? value;
}

export function AlertFilterBar({ filters, options, onFiltersChange }: AlertFilterBarProps) {
  const updateFilter = <Key extends keyof AlertFilters>(key: Key, value: AlertFilters[Key]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <FilterBar
      left={
        <ToolbarSearchField
          value={filters.searchQuery}
          onChange={(value) => updateFilter("searchQuery", value)}
          placeholder="Search alerts, rules, attributes..."
          className="w-full min-w-[220px] sm:w-auto"
          inputClassName="sm:w-72"
        />
      }
      right={
        <div className="flex flex-wrap items-center justify-end gap-2">
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
            value={labelFor(severityOptions, filters.severity)}
            leadingIcon={<Filter />}
            menuTitle="Severity"
            options={severityOptions}
            activeOptionId={filters.severity}
            onChange={(value) => updateFilter("severity", value as AlertSeverityFilter)}
            triggerClassName="!bg-toolbar-surface !border-border-subtle !text-content-muted hover:!bg-surface-elevated hover:!text-content-primary"
          />
          <SelectionDropdown
            value={labelFor(stateOptions, filters.state)}
            leadingIcon={<ListFilter />}
            menuTitle="State"
            options={stateOptions}
            activeOptionId={filters.state}
            onChange={(value) => updateFilter("state", value as AlertStateFilter)}
            triggerClassName="!bg-toolbar-surface !border-border-subtle !text-content-muted hover:!bg-surface-elevated hover:!text-content-primary"
          />
          <SelectionDropdown
            value={labelFor(options.types, filters.type)}
            leadingIcon={<Search />}
            menuTitle="Alert type"
            options={options.types}
            activeOptionId={filters.type}
            onChange={(value) => updateFilter("type", value)}
            triggerClassName="!bg-toolbar-surface !border-border-subtle !text-content-muted hover:!bg-surface-elevated hover:!text-content-primary"
          />
          <SelectionDropdown
            value={labelFor(dateOptions, filters.dateRange)}
            leadingIcon={<CalendarDays />}
            menuTitle="Date"
            options={dateOptions}
            activeOptionId={filters.dateRange}
            onChange={(value) => updateFilter("dateRange", value as AlertDateRangeFilter)}
            triggerClassName="!bg-toolbar-surface !border-border-subtle !text-content-muted hover:!bg-surface-elevated hover:!text-content-primary"
          />
        </div>
      }
    />
  );
}
