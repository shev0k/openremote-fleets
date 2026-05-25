import type {
  FleetReportSnapshot,
  GeneratedReportPreview,
  ReportDefinition,
  ReportGenerationRequest,
  ReportParameterDefinition,
} from "../../../domain/models/reports";
import type { ReportsRepository } from "../../../domain/repositories/reportsRepository";
import type { OpenRemoteRuntime } from "../runtime/openRemoteRuntime";
import { OpenRemoteReportsService } from "../services/OpenRemoteReportsService";
import { OpenRemoteRepositoryBase } from "./OpenRemoteRepositoryBase";
import {
  createOpenRemoteFleetReportSnapshot,
  createOpenRemoteReportDefinitions,
  createOpenRemoteReportParameters,
  previewOpenRemoteReport,
} from "./openRemoteMappers";

const EMPTY_REPORT_SNAPSHOT: FleetReportSnapshot = createOpenRemoteFleetReportSnapshot([]);

export class OpenRemoteReportsRepository extends OpenRemoteRepositoryBase implements ReportsRepository {
  constructor(
    runtime: OpenRemoteRuntime,
    private readonly reportsService: OpenRemoteReportsService,
  ) {
    super(runtime);
  }

  async getFleetReports(dateRange: string): Promise<FleetReportSnapshot> {
    return this.withFallback("getFleetReports", EMPTY_REPORT_SNAPSHOT, async () => {
      const inputs = await this.reportsService.getFleetReportInputs(dateRange);
      return createOpenRemoteFleetReportSnapshot(inputs?.assets ?? []);
    });
  }

  async listReportDefinitions(): Promise<ReportDefinition[]> {
    return this.withFallback("listReportDefinitions", [], async () => createOpenRemoteReportDefinitions());
  }

  async listReportParameters(): Promise<ReportParameterDefinition[]> {
    return this.withFallback("listReportParameters", [], async () => createOpenRemoteReportParameters());
  }

  async previewReport(request: ReportGenerationRequest): Promise<GeneratedReportPreview> {
    return this.withFallback("previewReport", {
      request,
      generatedAtIso: new Date(0).toISOString(),
      columns: [],
      rows: [],
      summary: {},
    }, async () => {
      const inputs = await this.reportsService.getFleetReportInputs(request.period.preset ?? request.period.startDateIso ?? "custom");
      return previewOpenRemoteReport(request, inputs?.assets ?? []);
    });
  }
}
