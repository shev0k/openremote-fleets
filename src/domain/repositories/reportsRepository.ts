import {
  FleetReportSnapshot,
  GeneratedReportPreview,
  ReportDefinition,
  ReportGenerationRequest,
  ReportParameterDefinition,
} from "../models/reports";

export interface ReportsRepository {
  getFleetReports(dateRange: string): Promise<FleetReportSnapshot>;
  listReportDefinitions(): Promise<ReportDefinition[]>;
  listReportParameters(): Promise<ReportParameterDefinition[]>;
  previewReport(request: ReportGenerationRequest): Promise<GeneratedReportPreview>;
}
