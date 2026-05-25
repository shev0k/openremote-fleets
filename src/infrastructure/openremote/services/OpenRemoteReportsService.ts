import type { Asset } from "@openremote/model";
import { OpenRemoteFleetAssetService } from "./OpenRemoteFleetAssetService";

export interface OpenRemoteReportInputs {
  assets: Asset[];
  dateRange: string;
}

export class OpenRemoteReportsService {
  constructor(private readonly fleetAssetService: OpenRemoteFleetAssetService) {}

  async getFleetReportInputs(dateRange: string): Promise<OpenRemoteReportInputs> {
    return {
      assets: await this.fleetAssetService.listFleetAssets(),
      dateRange,
    };
  }
}
