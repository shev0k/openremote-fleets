import {
  FleetReportSnapshot,
  GeneratedReportPreview,
  ReportDefinition,
  ReportGenerationRequest,
  ReportParameterDefinition,
} from "../../../domain/models/reports";
import { ReportsRepository } from "../../../domain/repositories/reportsRepository";
import { cloneFixture } from "./fixtures/cloneFixture";
import {
  MOCK_REPORT_DEFINITIONS,
  MOCK_REPORT_FIXTURES,
  MOCK_REPORT_PARAMETERS,
} from "./fixtures/reportsFixtures";
import { createMockReportPreview } from "./mockReportPreviewBuilder";
import { normalizeReportRange } from "./mockReportRanges";

export class MockReportsRepository implements ReportsRepository {
  private readonly snapshots: Record<string, FleetReportSnapshot>;

  constructor(seedSnapshots: Record<string, FleetReportSnapshot> = MOCK_REPORT_FIXTURES) {
    this.snapshots = cloneFixture(seedSnapshots);
  }

  async getFleetReports(dateRange: string): Promise<FleetReportSnapshot> {
    return cloneFixture(this.snapshots[normalizeReportRange(dateRange)]);
  }

  async listReportDefinitions(): Promise<ReportDefinition[]> {
    return cloneFixture(MOCK_REPORT_DEFINITIONS);
  }

  async listReportParameters(): Promise<ReportParameterDefinition[]> {
    return cloneFixture(MOCK_REPORT_PARAMETERS);
  }

  async previewReport(request: ReportGenerationRequest): Promise<GeneratedReportPreview> {
    return createMockReportPreview({
      request,
      snapshots: this.snapshots,
    });
  }
}
