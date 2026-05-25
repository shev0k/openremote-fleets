import { TelemetrySignalDefinition, TelemetrySignalValue } from "./telemetry";

export interface FleetReportMetrics {
  maxSpeedKph: number;
  maxSpeedDeltaPercent: number;
  averageTripDurationLabel: string;
  overspeedEvents: number;
  overspeedDeltaPercent: number;
  totalDistanceKm: number;
}

export interface DailyTripDistancePoint {
  dayLabel: string;
  trips: number;
  distanceKm: number;
}

export interface DailySpeedPoint {
  dayLabel: string;
  averageSpeedKph: number;
  maxSpeedKph: number;
}

export interface SpeedDistributionPoint {
  bucketLabel: string;
  percentage: number;
}

export interface MostActiveVehicle {
  vehicleId: string;
  distanceLabel: string;
  tripCount: number;
  score: number;
}

export interface FleetReportSnapshot {
  metrics: FleetReportMetrics;
  dailyTrips: DailyTripDistancePoint[];
  dailySpeed: DailySpeedPoint[];
  speedDistribution: SpeedDistributionPoint[];
  mostActiveVehicles: MostActiveVehicle[];
}

export type ReportCategory =
  | "operations"
  | "alarms"
  | "fuel"
  | "trips"
  | "assets"
  | "driver"
  | "safety"
  | "diagnostics"
  | "places"
  | "maintenance";

export type ReportOutputMode = "preview" | "print" | "export" | "email" | "schedule";

export type ReportExportFormat = "pdf" | "xlsx" | "csv" | "json";

export type ReportPeriodPreset =
  | "today"
  | "yesterday"
  | "last7Days"
  | "last30Days"
  | "thisMonth"
  | "previousMonth"
  | "custom";

export type ReportTimeWindowPreset = "fullDay" | "businessHours" | "custom";

export type ReportGroupingOption = "none" | "vehicle" | "day" | "driver" | "severity" | "signal";

export type ReportAggregationOption = "none" | "sum" | "average" | "min" | "max" | "count";

export type ReportCapabilityId =
  | "location"
  | "speed"
  | "movement"
  | "ignition"
  | "odometer"
  | "fuelLevel"
  | "fuelConsumed"
  | "batteryVoltage"
  | "externalVoltage"
  | "rpm"
  | "gnssStatus"
  | "gnssHdop"
  | "gsmSignal"
  | "driverIdentification"
  | "alarms"
  | "digitalInputs"
  | "analogInputs"
  | "canBus"
  | "temperature"
  | "doorState"
  | "geofenceEvents"
  | "tripHistory";

export interface ReportPeriod {
  type: "preset" | "custom";
  preset?: ReportPeriodPreset;
  startDateIso?: string;
  endDateIso?: string;
}

export interface ReportTimeWindow {
  preset: ReportTimeWindowPreset;
  startTime?: string;
  endTime?: string;
}

export interface ReportVehicleSelection {
  mode: "all" | "selected" | "status" | "groups";
  vehicleIds?: string[];
  statusIds?: string[];
  groupIds?: string[];
}

export interface ReportSchedule {
  enabled: boolean;
  frequency?: "daily" | "weekly" | "monthly";
  recipientEmails?: string[];
  startDateIso?: string;
  time?: string;
}

export interface ReportDeliveryOptions {
  recipientEmails?: string[];
  emailSubject?: string;
  message?: string;
}

export interface ReportDefinition {
  id: string;
  name: string;
  category: ReportCategory;
  description: string;
  supportedOutputModes: ReportOutputMode[];
  supportedExportFormats?: ReportExportFormat[];
  defaultOutputMode: ReportOutputMode;
  parameterIds: string[];
  defaultParameterIds?: string[];
  requiredCapabilities?: ReportCapabilityId[];
  optionalCapabilities?: ReportCapabilityId[];
  requiredFilters?: string[];
  optionalFilters?: string[];
  groupingOptions?: ReportGroupingOption[];
  defaultGrouping?: ReportGroupingOption;
  aggregationOptions?: ReportAggregationOption[];
  defaultAggregation?: ReportAggregationOption;
  availableColumns?: string[];
  defaultColumnIds?: string[];
  availableCharts?: string[];
  defaultChartIds?: string[];
  previewSections?: string[];
  validationRules?: string[];
  integrationMapping?: string;
  vehicleSelection: ReportVehicleSelection;
  period: ReportPeriod;
  timeWindow?: ReportTimeWindow;
  schedule?: ReportSchedule;
}

export interface ReportParameterDefinition extends TelemetrySignalDefinition {
  reportCategoryIds: ReportCategory[];
}

export interface ReportGenerationRequest {
  definitionId: string;
  period: ReportPeriod;
  timeWindow?: ReportTimeWindow;
  vehicleSelection: ReportVehicleSelection;
  parameterIds: string[];
  columnIds?: string[];
  chartIds?: string[];
  grouping?: ReportGroupingOption;
  aggregation?: ReportAggregationOption;
  includeSummary?: boolean;
  includeCharts?: boolean;
  includeMap?: boolean;
  includeRawData?: boolean;
  outputMode: ReportOutputMode;
  exportFormats?: ReportExportFormat[];
  formatting?: ReportFormattingOptions;
  schedule?: ReportSchedule;
  delivery?: ReportDeliveryOptions;
}

export interface ReportPreviewRow {
  vehicleId: string;
  timestampIso?: string;
  values: Record<string, TelemetrySignalValue | null>;
}

export interface ReportPreviewSectionItem {
  label: string;
  value: string;
  detail?: string;
}

export interface ReportPreviewChartPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  unit?: string;
  tone?: "normal" | "warning" | "critical";
}

export interface ReportPreviewChart {
  type: "bar" | "line" | "distribution";
  unit?: string;
  points: ReportPreviewChartPoint[];
}

export interface ReportPreviewSection {
  id: string;
  title: string;
  kind: "summary" | "chart" | "table" | "timeline" | "map" | "raw";
  description?: string;
  items?: ReportPreviewSectionItem[];
  chart?: ReportPreviewChart;
}

export interface GeneratedReportPreview {
  request: ReportGenerationRequest;
  generatedAtIso: string;
  columns: ReportParameterDefinition[];
  rows: ReportPreviewRow[];
  summary: Record<string, string | number>;
  metadata?: {
    title?: string;
    selectedVehiclesLabel?: string;
    periodLabel?: string;
    filters?: string[];
    warnings?: string[];
  };
  sections?: ReportPreviewSection[];
}

export interface ReportFormattingOptions {
  includeSummary: boolean;
  includeCharts: boolean;
  includeMap: boolean;
  includeRawData: boolean;
  includeMetadata: boolean;
  groupBy: ReportGroupingOption;
  unitSystem: "metric" | "imperial";
  dateTimeFormat: "local" | "utc" | "iso";
  pageOrientation: "portrait" | "landscape";
  fileName: string;
}

export interface ReportExportOptions extends ReportFormattingOptions {
  formats: ReportExportFormat[];
}

export interface ReportExportFile {
  format: ReportExportFormat;
  fileName: string;
  mimeType: string;
  text?: string;
  bytes: Uint8Array;
}
