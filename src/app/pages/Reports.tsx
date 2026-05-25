import { FileText } from "lucide-react";
import { createPortal } from "react-dom";
import { PanelCard } from "../components/shared/cards/PanelCard";
import { DatePickerPopover } from "../components/shared/datePicker/DatePickerPopover";
import { PageHeaderPanel } from "../components/shared/layout/PageHeaderPanel";
import { ReportDatePeriodPanel } from "../features/reports/components/ReportDatePeriodPanel";
import { ReportDefinitionSummaryPanel } from "../features/reports/components/ReportDefinitionSummaryPanel";
import { ReportLibraryPanel } from "../features/reports/components/ReportLibraryPanel";
import { ReportOptionsPanel } from "../features/reports/components/ReportOptionsPanel";
import { ReportOutputPanel } from "../features/reports/components/ReportOutputPanel";
import { ReportParameterPanel } from "../features/reports/components/ReportParameterPanel";
import { ReportPreviewPanel } from "../features/reports/components/ReportPreviewPanel";
import { ReportTimeWindowPanel } from "../features/reports/components/ReportTimeWindowPanel";
import { ReportVehicleScopePanel } from "../features/reports/components/ReportVehicleScopePanel";
import { ReportPreview } from "../features/reports/ReportPreview";
import { useReportBuilderController } from "../features/reports/useReportBuilderController";

export function Reports() {
  const controller = useReportBuilderController();
  const {
    actionMessage,
    activeCustomDateValue,
    availableOutputModes,
    capabilityProfiles,
    categoryFilter,
    categoryOptions,
    customDatePickerMonth,
    customEndDateButtonRef,
    customStartDateButtonRef,
    dataMode,
    definitions,
    draft,
    filteredDefinitions,
    handleRunReport,
    isLoadingInputs,
    isPreviewLoading,
    openDatePicker,
    parameters,
    preview,
    searchTerm,
    selectCustomDate,
    selectDefinition,
    selectedCompatibility,
    selectedDefinition,
    selectedDefinitionCapabilities,
    selectedParameterIds,
    selectedVehicles,
    setCategoryFilter,
    setDraft,
    setOpenDatePicker,
    setSearchTerm,
    supportedFormats,
    validation,
    vehicleGroups,
    vehicles,
    visibleParameters,
  } = controller;

  if (!draft || !selectedDefinition) {
    return (
      <div className="flex h-full flex-col gap-6 font-sans tracking-tight text-content-primary">
        <PageHeaderPanel
          title="Reports"
          description="Build operational reports from available fleet telemetry."
          icon={<FileText className="h-6 w-6 text-brand" />}
        />
        <PanelCard className="flex flex-1 items-center justify-center p-8 text-[13px] text-content-muted">
          {isLoadingInputs ? "Loading report inputs..." : "No report definitions are available."}
        </PanelCard>
      </div>
    );
  }

  const printPreviewPortal =
    draft.outputMode === "print" && preview && typeof document !== "undefined"
      ? createPortal(
          <div aria-hidden="true" className="report-print-root" data-testid="report-print-root">
            <ReportPreview preview={preview} isLoading={false} />
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="flex h-full flex-col gap-5 font-sans tracking-tight text-content-primary">
        <DatePickerPopover
          isOpen={Boolean(openDatePicker)}
          anchorRef={openDatePicker === "start" ? customStartDateButtonRef : customEndDateButtonRef}
          title={`Select ${openDatePicker === "start" ? "Start" : "End"} Date`}
          month={customDatePickerMonth}
          activeDateValue={activeCustomDateValue}
          onSelectDate={selectCustomDate}
          onClose={() => setOpenDatePicker(null)}
        />
        <PageHeaderPanel
          title="Reports"
          description="Capability-aware report generation for fleet managers and dispatchers."
          icon={<FileText className="h-6 w-6 text-brand" />}
          actions={
            <div className="hidden items-center gap-2 text-[12px] text-content-muted xl:flex">
              <span>{definitions.length} report types</span>
              <span>•</span>
              <span>{vehicles.length} vehicles</span>
              <span>•</span>
              <span>{parameters.length} parameters</span>
            </div>
          }
        />

        <div
          data-testid="reports-workspace"
          className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)_410px]"
        >
          <ReportLibraryPanel
            capabilityProfiles={capabilityProfiles}
            categoryFilter={categoryFilter}
            categoryOptions={categoryOptions}
            dataMode={dataMode}
            filteredDefinitions={filteredDefinitions}
            searchTerm={searchTerm}
            selectedDefinitionId={draft.definitionId}
            selectedVehicles={selectedVehicles}
            vehicles={vehicles}
            onCategoryFilterChange={setCategoryFilter}
            onDefinitionSelect={selectDefinition}
            onSearchTermChange={setSearchTerm}
          />

          <div data-testid="reports-builder-panel" className="min-h-0 space-y-5 overflow-y-auto pr-1 custom-scrollbar">
            <ReportDefinitionSummaryPanel
              capabilities={selectedDefinitionCapabilities}
              compatibility={selectedCompatibility}
              definition={selectedDefinition}
            />

            <div className="grid gap-5 lg:grid-cols-2">
              <ReportDatePeriodPanel
                customEndDateButtonRef={customEndDateButtonRef}
                customStartDateButtonRef={customStartDateButtonRef}
                draft={draft}
                onDraftChange={setDraft}
                onOpenDatePickerChange={(target) => {
                  setOpenDatePicker((current) => (current === target ? null : target));
                }}
              />
              <ReportTimeWindowPanel draft={draft} onDraftChange={setDraft} />
            </div>

            <ReportVehicleScopePanel
              draft={draft}
              selectedVehicleCount={selectedVehicles.length}
              vehicleGroups={vehicleGroups}
              vehicles={vehicles}
              onDraftChange={setDraft}
            />

            <ReportParameterPanel
              draft={draft}
              visibleParameters={visibleParameters}
              onDraftChange={setDraft}
            />

            <ReportOptionsPanel
              definition={selectedDefinition}
              draft={draft}
              onDraftChange={setDraft}
            />

            <ReportPreviewPanel preview={preview} isLoading={isPreviewLoading} />
          </div>

          <ReportOutputPanel
            actionMessage={actionMessage}
            availableOutputModes={availableOutputModes}
            draft={draft}
            isPreviewLoading={isPreviewLoading}
            selectedParameterCount={selectedParameterIds.size}
            supportedFormats={supportedFormats}
            validation={validation}
            onDraftChange={setDraft}
            onRunReport={handleRunReport}
          />
        </div>
      </div>
      {printPreviewPortal}
    </>
  );
}
