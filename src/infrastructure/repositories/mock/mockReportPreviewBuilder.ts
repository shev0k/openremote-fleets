import {
  FleetReportSnapshot,
  GeneratedReportPreview,
  ReportGenerationRequest,
  ReportPreviewRow,
} from "../../../domain/models/reports";
import {
  filterVehiclesByRequiredReportCapabilities,
  resolveReportVehicleSelection,
} from "../../../domain/services/reportCapabilities";
import { cloneFixture } from "./fixtures/cloneFixture";
import { MOCK_FLEET_FIXTURES } from "./fixtures/fleetFixtures";
import {
  MOCK_REPORT_DEFINITIONS,
  MOCK_REPORT_PARAMETERS,
  MOCK_REPORT_PREVIEW_ROWS,
} from "./fixtures/reportsFixtures";
import { resolveReportSnapshotKey } from "./mockReportRanges";
import {
  createReportPreviewSections,
  createReportSummaryItems,
} from "./mockReportPreviewSections";
import { formatReportNumber } from "./mockReportPreviewUtils";

interface CreateMockReportPreviewInput {
  request: ReportGenerationRequest;
  snapshots: Record<string, FleetReportSnapshot>;
  generatedAtIso?: string;
}

export function createMockReportPreview({
  request,
  snapshots,
  generatedAtIso = "2026-03-29T10:00:00Z",
}: CreateMockReportPreviewInput): GeneratedReportPreview {
  const parameterIds = new Set(request.parameterIds);
  const requestedColumnIds = request.columnIds?.length ? new Set(request.columnIds) : parameterIds;
  const definition = MOCK_REPORT_DEFINITIONS.find((reportDefinition) => reportDefinition.id === request.definitionId);
  const selectedVehicles = resolveReportVehicleSelection(request.vehicleSelection, MOCK_FLEET_FIXTURES);
  const requiredCapabilities = definition?.requiredCapabilities ?? [];
  const compatibleVehicles = filterVehiclesByRequiredReportCapabilities(selectedVehicles, requiredCapabilities);
  const excludedVehicleCount = selectedVehicles.length - compatibleVehicles.length;
  const compatibleVehicleIds = new Set(compatibleVehicles.map((vehicle) => vehicle.id));
  const columns = MOCK_REPORT_PARAMETERS.filter((parameter) => parameterIds.has(parameter.id) && requestedColumnIds.has(parameter.id));
  const columnIds = new Set(columns.map((column) => column.id));
  const staticRowsByVehicleId = new Map(MOCK_REPORT_PREVIEW_ROWS.map((row) => [row.vehicleId, row]));
  const rows = MOCK_REPORT_PREVIEW_ROWS
    .filter((row) => compatibleVehicleIds.has(row.vehicleId))
    .map((row) => ({
      ...row,
      values: Object.fromEntries(Object.entries(row.values).filter(([parameterId]) => columnIds.has(parameterId))),
    }));
  const missingStaticRows = selectedVehicles
    .filter((vehicle) => compatibleVehicleIds.has(vehicle.id) && !staticRowsByVehicleId.has(vehicle.id))
    .map<ReportPreviewRow>((vehicle) => ({
      vehicleId: vehicle.id,
      timestampIso: vehicle.lastUpdatedIso,
      values: Object.fromEntries(
        columns.map((column) => {
          const sample = vehicle.latestTelemetrySamples?.find((entry) => entry.signalId === column.id);
          return [column.id, sample?.value ?? null];
        }),
      ),
    }));
  const previewRows = [...rows, ...missingStaticRows];
  const snapshot = cloneFixture(snapshots[resolveReportSnapshotKey(request)] ?? snapshots.today);
  const summaryItems = createReportSummaryItems(snapshot, previewRows, request, excludedVehicleCount) ?? [];
  const activeVehiclesItem = summaryItems.find((item) => item.label === "Active vehicles")?.value ?? "0";
  const alarmCountItem = summaryItems.find((item) => item.label === "Alarms")?.value ?? "0";
  const totalTrips = snapshot.dailyTrips.reduce((sum, point) => sum + point.trips, 0);

  return {
    request: cloneFixture(request),
    generatedAtIso,
    columns: cloneFixture(columns),
    rows: cloneFixture(previewRows),
    summary: {
      vehicleCount: previewRows.length,
      totalDistance: `${formatReportNumber(snapshot.metrics.totalDistanceKm)} km`,
      totalTrips,
      activeVehicles: activeVehiclesItem,
      alarmCount: alarmCountItem,
      parameterCount: columns.length,
      excludedVehicles: excludedVehicleCount,
    },
    metadata: {
      title: definition?.name ?? request.definitionId,
      selectedVehiclesLabel:
        request.vehicleSelection.mode === "all"
          ? "All vehicles"
          : `${selectedVehicles.length} selected vehicles`,
      periodLabel: request.period.preset ?? "Custom period",
      filters: [
        request.vehicleSelection.mode,
        request.period.preset ?? request.period.type,
        request.timeWindow?.preset ?? "fullDay",
      ],
      warnings: excludedVehicleCount
        ? [`${definition?.name ?? request.definitionId} excludes ${excludedVehicleCount} incompatible ${excludedVehicleCount === 1 ? "vehicle" : "vehicles"}.`]
        : [],
    },
    sections: createReportPreviewSections(definition, request, snapshot, previewRows, columns, excludedVehicleCount),
  };
}
