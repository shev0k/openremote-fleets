import { AlertTriangle, CheckCircle2, Search } from "lucide-react";
import type { ReportCategory, ReportDefinition } from "../../../../domain/models/reports";
import type { AppDataMode } from "../../../../domain/services/appServices";
import type { Vehicle } from "../../../../domain/models/vehicle";
import { PanelCard } from "../../../components/shared/cards/PanelCard";
import { SelectionDropdown } from "../../../components/shared/controls/SelectionDropdown";
import { classNames } from "../../../components/shared/utils/classNames";
import {
  type VehicleReportCapabilityProfile,
  summarizeReportCompatibility,
} from "../reportCapabilities";
import {
  formatReportCategory,
  getAvailableReportOutputModes,
  labelFor,
} from "../reportPageModel";
import type { ReportCategoryFilter } from "../useReportBuilderController";

interface ReportLibraryPanelProps {
  capabilityProfiles: Record<string, VehicleReportCapabilityProfile>;
  categoryFilter: ReportCategoryFilter;
  categoryOptions: Array<{ id: ReportCategoryFilter; label: string }>;
  dataMode: AppDataMode;
  filteredDefinitions: ReportDefinition[];
  searchTerm: string;
  selectedDefinitionId: string;
  selectedVehicles: Vehicle[];
  vehicles: Vehicle[];
  onCategoryFilterChange: (categoryFilter: ReportCategoryFilter) => void;
  onDefinitionSelect: (definitionId: string) => void;
  onSearchTermChange: (searchTerm: string) => void;
}

export function ReportLibraryPanel({
  capabilityProfiles,
  categoryFilter,
  categoryOptions,
  dataMode,
  filteredDefinitions,
  searchTerm,
  selectedDefinitionId,
  selectedVehicles,
  vehicles,
  onCategoryFilterChange,
  onDefinitionSelect,
  onSearchTermChange,
}: ReportLibraryPanelProps) {
  return (
    <PanelCard data-testid="reports-catalog-panel" className="flex min-h-0 flex-col overflow-hidden p-0">
      <div className="shrink-0 border-b border-border-subtle p-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-brand" />
          <h2 className="text-[15px] font-semibold text-content-primary">Report Library</h2>
        </div>
        <input
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Search reports"
          className="mt-3 w-full rounded-xl border border-border-subtle bg-panel-muted px-3 py-2 text-[13px] text-content-primary outline-none focus:border-brand/50"
        />
        <SelectionDropdown
          value={labelFor(categoryOptions, categoryFilter)}
          options={categoryOptions}
          activeOptionId={categoryFilter}
          onChange={(id) => onCategoryFilterChange(id as ReportCategoryFilter)}
          triggerClassName="mt-3 w-full justify-between !bg-toolbar-surface !border-border-subtle"
          menuClassName="w-64"
        />
      </div>

      <div data-testid="report-library-list" className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 pb-5 custom-scrollbar">
        {filteredDefinitions.map((definition) => {
          const compatibility = summarizeReportCompatibility(
            definition,
            selectedVehicles.length ? selectedVehicles : vehicles,
            capabilityProfiles,
          );
          const isSelected = definition.id === selectedDefinitionId;
          const isUnavailable = !compatibility.isAvailable;

          return (
            <button
              key={definition.id}
              type="button"
              data-testid={`report-definition-${definition.id}`}
              onClick={() => {
                if (!isUnavailable) {
                  onDefinitionSelect(definition.id);
                }
              }}
              disabled={isUnavailable}
              className={classNames(
                "w-full rounded-[14px] border p-3 text-left transition-colors",
                isSelected
                  ? "border-brand/40 bg-brand/10"
                  : isUnavailable
                    ? "cursor-not-allowed border-border-subtle bg-panel-muted/45 opacity-70"
                    : "border-border-subtle bg-panel-muted hover:border-border-strong hover:bg-surface-elevated",
              )}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-content-primary">{definition.name}</span>
                  <span className="mt-0.5 block text-[10px] uppercase tracking-[0.16em] text-content-muted">
                    {formatReportCategory(definition.category)}
                  </span>
                </span>
                {isUnavailable ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />
                )}
              </span>
              <span className="mt-2 block text-[11px] leading-5 text-content-muted">{definition.description}</span>
              <span className="mt-2 flex flex-wrap gap-1.5">
                {getAvailableReportOutputModes(definition, dataMode).map((mode) => (
                  <span
                    key={mode}
                    data-testid={`report-capability-${definition.id}-${mode}`}
                    className="rounded-full border border-border-subtle bg-panel px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-content-muted"
                  >
                    {mode}
                  </span>
                ))}
              </span>
              {isUnavailable ? (
                <span className="mt-2 block text-[11px] text-warning">{compatibility.message}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </PanelCard>
  );
}
