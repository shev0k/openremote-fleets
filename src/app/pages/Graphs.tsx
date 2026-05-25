import { useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  default as ReactGridLayout,
  noCompactor,
  useContainerWidth,
  verticalCompactor,
} from "react-grid-layout";
import { AlertTriangle, BarChart2, Calendar, Download, Printer } from "lucide-react";
import { PanelCard } from "../components/shared/cards/PanelCard";
import { SelectionDropdown } from "../components/shared/controls/SelectionDropdown";
import { DatePickerPopover } from "../components/shared/datePicker/DatePickerPopover";
import { formatDateButtonLabel } from "../components/shared/datePicker/datePickerModel";
import { PageHeaderPanel } from "../components/shared/layout/PageHeaderPanel";
import { classNames } from "../components/shared/utils/classNames";
import { GraphDashboardWidget, WidgetLibrary } from "../features/graphs/components/GraphDashboardWidgets";
import { GraphExportDialog } from "../features/graphs/components/GraphExportDialog";
import { GraphPrintPreview } from "../features/graphs/components/GraphPrintPreview";
import {
  graphGridContainerPadding,
  graphGridMargin,
  graphGridResizeHandles,
  graphGridRowHeight,
  toReactGridLayout,
} from "../features/graphs/graphDashboardGridLayout";
import {
  GRAPH_DASHBOARD_COLUMN_COUNT,
} from "../features/graphs/graphsDashboardModel";
import {
  graphDateRangeOptions,
  labelFor,
  useGraphsDashboardController,
  type GraphDatePreset,
} from "../features/graphs/useGraphsDashboardController";

export function Graphs() {
  const {
    actionMessage,
    activeCustomDateValue,
    customDatePickerMonth,
    customEndDateIso,
    customStartDateIso,
    datePreset,
    dateRangeLabel,
    handleDashboardLayoutChange,
    handlePackDashboardLayout,
    handlePrint,
    handleResizeWidget,
    isGridInteracting,
    isLoadingSnapshot,
    isLoadingVehicles,
    layoutMode,
    openDatePicker,
    resetWidgets,
    selectCustomDate,
    selectedWidgetIds,
    selectedWidgets,
    setDatePreset,
    setIsGridInteracting,
    setLayoutMode,
    setOpenDatePicker,
    setShowDownloadModal,
    setShowPrintPreview,
    showDownloadModal,
    showPrintPreview,
    snapshot,
    summary,
    toggleWidget,
    vehicles,
    widgetLayout,
  } = useGraphsDashboardController();
  const { width: dashboardGridWidth, containerRef: dashboardGridRef, mounted: isDashboardGridMounted } = useContainerWidth({
    initialWidth: 1180,
  });
  const customStartDateButtonRef = useRef<HTMLButtonElement | null>(null);
  const customEndDateButtonRef = useRef<HTMLButtonElement | null>(null);
  const isCompactDashboardViewport = dashboardGridWidth < 720;
  const dashboardColumnCount = isCompactDashboardViewport ? 4 : GRAPH_DASHBOARD_COLUMN_COUNT;
  const gridLayout = useMemo(() => toReactGridLayout(widgetLayout, dashboardColumnCount), [dashboardColumnCount, widgetLayout]);

  return (
    <>
      <DatePickerPopover
        isOpen={Boolean(openDatePicker)}
        anchorRef={openDatePicker === "start" ? customStartDateButtonRef : customEndDateButtonRef}
        title={`Select ${openDatePicker === "start" ? "Start" : "End"} Date`}
        month={customDatePickerMonth}
        activeDateValue={activeCustomDateValue}
        onSelectDate={selectCustomDate}
        onClose={() => setOpenDatePicker(null)}
      />
      <div className="flex h-full flex-col gap-5 font-sans tracking-tight text-content-primary">
        <PageHeaderPanel
          title="Graphs"
          description="Configurable fleet analytics from OpenRemote and Teltonika tracker data."
          icon={<BarChart2 className="h-6 w-6 text-brand" />}
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <SelectionDropdown
                align="right"
                value={labelFor(graphDateRangeOptions, datePreset)}
                activeOptionId={datePreset}
                leadingIcon={<Calendar className="h-4 w-4 text-content-muted" />}
                options={graphDateRangeOptions.map((range) => ({
                  id: range.id,
                  label: range.label,
                }))}
                onChange={(nextDatePreset) => {
                  setOpenDatePicker(null);
                  setDatePreset(nextDatePreset as GraphDatePreset);
                }}
                buttonAriaLabel="Date range"
                triggerClassName="px-5 py-2.5"
                menuClassName="w-48 py-2"
                optionClassName="w-full text-left px-4 py-2 text-[13px]"
              />

              <button
                type="button"
                onClick={() => setShowDownloadModal(true)}
                aria-label="Download graph report"
                className="app-control flex h-10 w-10 items-center justify-center rounded-full"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handlePrint}
                aria-label="Print graphs"
                className="app-control flex h-10 w-10 items-center justify-center rounded-full"
              >
                <Printer className="h-4 w-4" />
              </button>
            </div>
          }
        />

        {datePreset === "custom" ? (
          <PanelCard className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="text-[13px] font-semibold text-content-primary">Custom graph range</div>
              <p className="text-[12px] text-content-muted">The dashboard uses the custom range snapshot while exports keep the exact selected dates.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                ref={customStartDateButtonRef}
                aria-label="Custom start date"
                type="button"
                onClick={() => setOpenDatePicker((current) => (current === "start" ? null : "start"))}
                className="app-control flex min-w-36 items-center justify-between rounded-xl px-3 py-2 text-left text-[12px]"
              >
                <span>{formatDateButtonLabel(customStartDateIso, "Select start")}</span>
                <Calendar className="h-3.5 w-3.5 text-content-muted" />
              </button>
              <button
                ref={customEndDateButtonRef}
                aria-label="Custom end date"
                type="button"
                onClick={() => setOpenDatePicker((current) => (current === "end" ? null : "end"))}
                className="app-control flex min-w-36 items-center justify-between rounded-xl px-3 py-2 text-left text-[12px]"
              >
                <span>{formatDateButtonLabel(customEndDateIso, "Select end")}</span>
                <Calendar className="h-3.5 w-3.5 text-content-muted" />
              </button>
            </div>
          </PanelCard>
        ) : null}

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[310px_minmax(0,1fr)]">
            <WidgetLibrary
            selectedWidgetIds={selectedWidgetIds}
            onToggleWidget={toggleWidget}
            onReset={resetWidgets}
          />

          <div className="min-h-0 overflow-y-auto pr-1 custom-scrollbar">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-border-subtle bg-panel-muted px-4 py-3 text-[12px] text-content-muted">
              <div className="flex flex-wrap items-center gap-3">
                <span>{dateRangeLabel}</span>
                <span>{isLoadingSnapshot ? "Loading graph snapshot..." : `${snapshot.dailyTrips.length} activity buckets`}</span>
                <span>{isLoadingVehicles ? "Loading vehicles..." : `${vehicles.length} vehicles`}</span>
                <span>{layoutMode === "packed" ? "Packed layout" : "Free placement"}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {actionMessage ? <span className="text-brand">{actionMessage}</span> : null}
                <div className="flex shrink-0 rounded-full border border-border-subtle bg-panel p-1">
                  <button
                    type="button"
                    aria-label="Use packed dashboard layout"
                    aria-pressed={layoutMode === "packed"}
                    onClick={() => setLayoutMode("packed")}
                    className={classNames(
                      "h-7 rounded-full px-3 text-[11px] font-semibold transition-colors",
                      layoutMode === "packed"
                        ? "bg-brand text-brand-foreground"
                        : "text-content-muted hover:bg-surface-elevated hover:text-content-primary",
                    )}
                  >
                    Packed
                  </button>
                  <button
                    type="button"
                    aria-label="Use free dashboard placement"
                    aria-pressed={layoutMode === "free"}
                    onClick={() => setLayoutMode("free")}
                    className={classNames(
                      "h-7 rounded-full px-3 text-[11px] font-semibold transition-colors",
                      layoutMode === "free"
                        ? "bg-brand text-brand-foreground"
                        : "text-content-muted hover:bg-surface-elevated hover:text-content-primary",
                    )}
                  >
                    Free
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handlePackDashboardLayout}
                  aria-label="Compact graph dashboard gaps"
                  className="app-control h-9 rounded-full px-3 text-[11px] font-semibold"
                >
                  Pack gaps
                </button>
              </div>
            </div>

            {selectedWidgets.length ? (
              <div
                ref={dashboardGridRef}
                data-testid="graph-dashboard-grid"
                data-layout-mode={layoutMode}
                data-grid-interacting={isGridInteracting ? "true" : "false"}
                data-grid-columns={dashboardColumnCount}
                className="min-h-[420px] pr-4 pb-3"
              >
                {isDashboardGridMounted ? (
                  <ReactGridLayout
                    layout={gridLayout}
                    width={dashboardGridWidth}
                    gridConfig={{
                      cols: dashboardColumnCount,
                      rowHeight: graphGridRowHeight,
                      margin: graphGridMargin,
                      containerPadding: graphGridContainerPadding,
                    }}
                    dragConfig={{
                      enabled: !isCompactDashboardViewport,
                      bounded: true,
                      cancel: ".graph-widget-action, button, a, input, select, textarea, [role='button']",
                      threshold: 4,
                    }}
                    resizeConfig={{
                      enabled: !isCompactDashboardViewport,
                      handles: graphGridResizeHandles,
                    }}
                    compactor={layoutMode === "packed" ? verticalCompactor : noCompactor}
                    className="graph-dashboard-layout"
                    onDragStart={() => setIsGridInteracting(true)}
                    onDragStop={(nextLayout) => {
                      setIsGridInteracting(false);
                      handleDashboardLayoutChange(nextLayout, dashboardColumnCount);
                    }}
                    onResizeStart={() => setIsGridInteracting(true)}
                    onResizeStop={(nextLayout) => {
                      setIsGridInteracting(false);
                      handleDashboardLayoutChange(nextLayout, dashboardColumnCount);
                    }}
                  >
                    {selectedWidgets.map((selectedWidget) => (
                      <div
                        key={selectedWidget.widget.id}
                        data-testid={`graph-grid-item-${selectedWidget.widget.id}`}
                        data-graph-grid-width={selectedWidget.layoutItem.w}
                        data-graph-grid-height={selectedWidget.layoutItem.h}
                        className="min-h-0"
                      >
                        <GraphDashboardWidget
                          widget={selectedWidget.widget}
                          layoutItem={selectedWidget.layoutItem}
                          snapshot={snapshot}
                          summary={summary}
                          dateRangeLabel={dateRangeLabel}
                          onResize={handleResizeWidget}
                        />
                      </div>
                    ))}
                  </ReactGridLayout>
                ) : null}
              </div>
            ) : (
              <PanelCard className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
                <AlertTriangle className="h-8 w-8 text-warning" />
                <h2 className="mt-3 text-[18px] font-semibold text-content-primary">No widgets selected</h2>
                <p className="mt-1 max-w-md text-[13px] leading-6 text-content-muted">
                  Use the widget library to add fleet analytics back to the dashboard.
                </p>
              </PanelCard>
            )}
          </div>
        </div>
      </div>

      <GraphExportDialog
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        dateRangeLabel={dateRangeLabel}
        snapshot={snapshot}
        vehicles={vehicles}
        selectedWidgetIds={selectedWidgetIds}
      />

      {showPrintPreview && typeof document !== "undefined"
        ? createPortal(
            <div aria-hidden="true" className="report-print-root" data-testid="graph-print-root">
              <GraphPrintPreview
                dateRangeLabel={dateRangeLabel}
                snapshot={snapshot}
                vehicles={vehicles}
                selectedWidgetIds={selectedWidgetIds}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
