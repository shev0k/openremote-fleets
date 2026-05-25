import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import type { Layout } from "react-grid-layout";
import type { FleetReportSnapshot } from "../../../domain/models/reports";
import type { Vehicle } from "../../../domain/models/vehicle";
import { createCalendarMonth, formatDateButtonLabel } from "../../components/shared/datePicker/datePickerModel";
import { useRepositoryQuery } from "../../hooks/useRepositoryQuery";
import { useAppServices } from "../../providers/AppServicesProvider";
import { formatDateInputValue } from "../playback/playbackDateUtils";
import { areGraphWidgetLayoutsEqual } from "./graphDashboardGridLayout";
import {
  defaultGraphWidgetLayout,
  readStoredGraphDashboardLayoutMode,
  readStoredGraphWidgetLayout,
  writeStoredGraphDashboardLayoutMode,
  writeStoredGraphWidgetLayout,
} from "./graphDashboardLayoutStorage";
import {
  GRAPH_DASHBOARD_COLUMN_COUNT,
  GRAPH_WIDGET_CATALOG,
  createGraphDashboardSummary,
  packGraphWidgetLayout,
  resizeGraphWidget,
  toggleGraphWidget,
  updateGraphWidgetGridLayout,
  type GraphDashboardLayoutMode,
  type GraphWidgetDefinition,
  type GraphWidgetId,
  type GraphWidgetLayoutItem,
  type GraphWidgetLayoutSize,
} from "./graphsDashboardModel";

export type GraphDatePreset = "today" | "yesterday" | "last7Days" | "thisMonth" | "custom";
export type GraphDatePickerTarget = "start" | "end";

export const graphDateRangeOptions: Array<{ id: GraphDatePreset; label: string; repositoryLabel: string }> = [
  { id: "today", label: "Today", repositoryLabel: "Today" },
  { id: "yesterday", label: "Yesterday", repositoryLabel: "Yesterday" },
  { id: "last7Days", label: "Last 7 Days", repositoryLabel: "Last 7 Days" },
  { id: "thisMonth", label: "This Month", repositoryLabel: "This Month" },
  { id: "custom", label: "Custom Range", repositoryLabel: "Custom Range" },
];

interface SelectedGraphWidget {
  layoutItem: GraphWidgetLayoutItem;
  widget: GraphWidgetDefinition;
}

export interface GraphsDashboardController {
  actionMessage: string | null;
  activeCustomDateValue: string;
  customDatePickerMonth: ReturnType<typeof createCalendarMonth>;
  customEndDateIso: string;
  customStartDateIso: string;
  datePreset: GraphDatePreset;
  dateRangeLabel: string;
  handleDashboardLayoutChange: (nextLayout: Layout, dashboardColumnCount: number) => void;
  handlePackDashboardLayout: () => void;
  handlePrint: () => void;
  handleResizeWidget: (widgetId: GraphWidgetId, size: GraphWidgetLayoutSize) => void;
  isGridInteracting: boolean;
  isLoadingSnapshot: boolean;
  isLoadingVehicles: boolean;
  layoutMode: GraphDashboardLayoutMode;
  openDatePicker: GraphDatePickerTarget | null;
  repositoryDateRange: string;
  resetWidgets: () => void;
  selectCustomDate: (dateValue: string) => void;
  selectedWidgetIds: GraphWidgetId[];
  selectedWidgets: SelectedGraphWidget[];
  setDatePreset: Dispatch<SetStateAction<GraphDatePreset>>;
  setIsGridInteracting: Dispatch<SetStateAction<boolean>>;
  setLayoutMode: Dispatch<SetStateAction<GraphDashboardLayoutMode>>;
  setOpenDatePicker: Dispatch<SetStateAction<GraphDatePickerTarget | null>>;
  setShowDownloadModal: Dispatch<SetStateAction<boolean>>;
  setShowPrintPreview: Dispatch<SetStateAction<boolean>>;
  showDownloadModal: boolean;
  showPrintPreview: boolean;
  snapshot: FleetReportSnapshot;
  summary: ReturnType<typeof createGraphDashboardSummary>;
  toggleWidget: (widgetId: GraphWidgetId) => void;
  vehicles: Vehicle[];
  widgetLayout: GraphWidgetLayoutItem[];
}

function emptyReportSnapshot(): FleetReportSnapshot {
  return {
    metrics: {
      maxSpeedKph: 0,
      maxSpeedDeltaPercent: 0,
      averageTripDurationLabel: "--",
      overspeedEvents: 0,
      overspeedDeltaPercent: 0,
      totalDistanceKm: 0,
    },
    dailyTrips: [],
    dailySpeed: [],
    speedDistribution: [],
    mostActiveVehicles: [],
  };
}

export function labelFor<T extends string>(options: ReadonlyArray<{ id: T; label: string }>, value: T): string {
  return options.find((option) => option.id === value)?.label ?? value;
}

function getDateRangeDisplayLabel(datePreset: GraphDatePreset, startDateIso: string, endDateIso: string): string {
  if (datePreset !== "custom") return labelFor(graphDateRangeOptions, datePreset);
  const start = formatDateButtonLabel(startDateIso, "Start");
  const end = formatDateButtonLabel(endDateIso, "End");
  return `Custom Range: ${start} to ${end}`;
}

function getRepositoryDateRange(datePreset: GraphDatePreset, startDateIso: string, endDateIso: string): string {
  if (datePreset === "custom") {
    return `Custom Range: ${startDateIso || "start"} to ${endDateIso || "end"}`;
  }

  return graphDateRangeOptions.find((option) => option.id === datePreset)?.repositoryLabel ?? "Last 7 Days";
}

export function useGraphsDashboardController(): GraphsDashboardController {
  const { fleetRepository, reportsRepository } = useAppServices();
  const todayIso = useMemo(() => formatDateInputValue(new Date()), []);
  const [datePreset, setDatePreset] = useState<GraphDatePreset>("last7Days");
  const [customStartDateIso, setCustomStartDateIso] = useState(todayIso);
  const [customEndDateIso, setCustomEndDateIso] = useState(todayIso);
  const [openDatePicker, setOpenDatePicker] = useState<GraphDatePickerTarget | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [widgetLayout, setWidgetLayout] = useState<GraphWidgetLayoutItem[]>(readStoredGraphWidgetLayout);
  const [layoutMode, setLayoutMode] = useState<GraphDashboardLayoutMode>(readStoredGraphDashboardLayoutMode);
  const [isGridInteracting, setIsGridInteracting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const initialSnapshot = useMemo(() => emptyReportSnapshot(), []);
  const repositoryDateRange = getRepositoryDateRange(datePreset, customStartDateIso, customEndDateIso);
  const dateRangeLabel = getDateRangeDisplayLabel(datePreset, customStartDateIso, customEndDateIso);

  const { data: snapshot, isLoading: isLoadingSnapshot } = useRepositoryQuery<FleetReportSnapshot>({
    initialData: initialSnapshot,
    query: useCallback(() => reportsRepository.getFleetReports(repositoryDateRange), [repositoryDateRange, reportsRepository]),
  });
  const { data: vehicles, isLoading: isLoadingVehicles } = useRepositoryQuery<Vehicle[]>({
    initialData: [],
    query: useCallback(() => fleetRepository.listVehicles(), [fleetRepository]),
  });

  const summary = useMemo(() => createGraphDashboardSummary(snapshot, vehicles), [snapshot, vehicles]);
  const selectedWidgetIds = useMemo(() => widgetLayout.map((item) => item.id), [widgetLayout]);
  const selectedWidgets = useMemo(
    () =>
      widgetLayout
        .map((layoutItem) => ({
          layoutItem,
          widget: GRAPH_WIDGET_CATALOG.find((widget) => widget.id === layoutItem.id),
        }))
        .filter((item): item is SelectedGraphWidget => Boolean(item.widget)),
    [widgetLayout],
  );
  const activeCustomDateValue = openDatePicker === "start" ? customStartDateIso : customEndDateIso;
  const customDatePickerMonth = useMemo(() => createCalendarMonth(activeCustomDateValue), [activeCustomDateValue]);

  useEffect(() => {
    writeStoredGraphWidgetLayout(widgetLayout);
  }, [widgetLayout]);

  useEffect(() => {
    writeStoredGraphDashboardLayoutMode(layoutMode);
  }, [layoutMode]);

  const toggleWidget = useCallback(
    (widgetId: GraphWidgetId) => {
      setWidgetLayout((current) => {
        const nextLayout = toggleGraphWidget(current, widgetId);
        return layoutMode === "packed" ? packGraphWidgetLayout(nextLayout) : nextLayout;
      });
    },
    [layoutMode],
  );

  const handleResizeWidget = useCallback(
    (widgetId: GraphWidgetId, size: GraphWidgetLayoutSize) => {
      setWidgetLayout((current) => {
        const nextLayout = resizeGraphWidget(current, widgetId, size);
        return layoutMode === "packed" ? packGraphWidgetLayout(nextLayout) : nextLayout;
      });
    },
    [layoutMode],
  );

  const handleDashboardLayoutChange = useCallback((nextLayout: Layout, dashboardColumnCount: number) => {
    if (dashboardColumnCount !== GRAPH_DASHBOARD_COLUMN_COUNT) return;

    setWidgetLayout((current) => {
      const nextWidgetLayout = updateGraphWidgetGridLayout(current, nextLayout);
      return areGraphWidgetLayoutsEqual(current, nextWidgetLayout) ? current : nextWidgetLayout;
    });
  }, []);

  const handlePackDashboardLayout = useCallback(() => {
    setLayoutMode("packed");
    setWidgetLayout((current) => packGraphWidgetLayout(current));
    setActionMessage("Dashboard gaps compacted.");
  }, []);

  const resetWidgets = useCallback(() => {
    setLayoutMode("packed");
    setWidgetLayout(defaultGraphWidgetLayout());
  }, []);

  const handlePrint = useCallback(() => {
    setShowPrintPreview(true);
    setActionMessage("Print dialog opened for the graph dashboard.");
    window.setTimeout(() => window.print(), 0);
  }, []);

  const selectCustomDate = useCallback(
    (dateValue: string) => {
      if (openDatePicker === "start") {
        setCustomStartDateIso(dateValue);
      } else {
        setCustomEndDateIso(dateValue);
      }
      setOpenDatePicker(null);
    },
    [openDatePicker],
  );

  return {
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
    repositoryDateRange,
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
  };
}
