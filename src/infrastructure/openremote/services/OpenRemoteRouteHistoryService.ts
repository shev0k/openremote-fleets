import type { AssetDatapointAllQuery } from "@openremote/model";
import { OPENREMOTE_PLAYBACK_ATTRIBUTE_NAMES } from "../../../domain/models/teltonikaCatalog";
import type { OpenRemoteDatapointHistory } from "../models/openRemoteDatapoints";
import type { OpenRemoteRuntime } from "../runtime/openRemoteRuntime";
import { recordOpenRemoteAdapterIssue } from "../repositories/openRemoteAdapterStatus";

const DEFAULT_HISTORY_ATTRIBUTES = OPENREMOTE_PLAYBACK_ATTRIBUTE_NAMES;
type HistoryEntry = readonly [string, OpenRemoteDatapointHistory[string]];
export interface OpenRemoteDatapointHistoryWindow {
  fromTimestamp: number;
  toTimestamp: number;
}

export class OpenRemoteRouteHistoryService {
  constructor(private readonly runtime: OpenRemoteRuntime) {}

  async getVehicleRouteHistoryForWindow(
    assetId: string,
    window: OpenRemoteDatapointHistoryWindow,
    attributeNames: string[] = DEFAULT_HISTORY_ATTRIBUTES,
  ): Promise<OpenRemoteDatapointHistory | null> {
    const ready = await this.runtime.ensureReady({ refreshSession: false });
    if (!ready) {
      return null;
    }

    const uniqueAttributeNames = [...new Set(attributeNames)];
    const useLocationFallback = uniqueAttributeNames.includes("location") && uniqueAttributeNames.includes("gpsLocation");
    const directAttributeNames = useLocationFallback
      ? uniqueAttributeNames.filter((attributeName) => attributeName !== "location" && attributeName !== "gpsLocation")
      : uniqueAttributeNames;
    const requests: Array<{ attributeName: string; request: Promise<HistoryEntry> }> = [
      ...(useLocationFallback
        ? [{ attributeName: "location", request: this.getLocationHistoryWithFallback(assetId, window) }]
        : []),
      ...directAttributeNames.map((attributeName) => ({
        attributeName,
        request: this.fetchAttributeHistory(assetId, attributeName, window),
      })),
    ];

    const settledEntries = await Promise.allSettled(requests.map((entry) => entry.request));
    settledEntries.forEach((entry, index) => {
      if (entry.status === "rejected") {
        const attributeName = requests[index]?.attributeName ?? "unknown";
        recordOpenRemoteAdapterIssue({
          source: "OpenRemoteRouteHistoryService",
          operation: `getVehicleRouteHistory(${attributeName})`,
          reason: "operation-failed",
          message: `Datapoint history for ${attributeName} failed; dropping that attribute history.`,
          error: entry.reason,
        });
      }
    });
    const entries = settledEntries
      .filter((entry): entry is PromiseFulfilledResult<HistoryEntry> => entry.status === "fulfilled")
      .map((entry) => entry.value);

    if (!entries.length) {
      return null;
    }

    return Object.fromEntries(entries);
  }

  private async getLocationHistoryWithFallback(
    assetId: string,
    window: OpenRemoteDatapointHistoryWindow,
  ): Promise<HistoryEntry> {
    try {
      const locationHistory = await this.fetchAttributeHistory(assetId, "location", window);
      if (locationHistory[1].length > 0) {
        return locationHistory;
      }
    } catch {
      // Older Teltonika assets may keep raw gpsLocation without Manager base location history.
    }
    return this.fetchAttributeHistory(assetId, "gpsLocation", window);
  }

  private async fetchAttributeHistory(
    assetId: string,
    attributeName: string,
    window: OpenRemoteDatapointHistoryWindow,
  ): Promise<HistoryEntry> {
    const query: AssetDatapointAllQuery = {
      type: "all",
      fromTimestamp: window.fromTimestamp,
      toTimestamp: window.toTimestamp,
    };
    const response = await this.runtime.getApi().AssetDatapointResource.getDatapoints(assetId, attributeName, query);
    return [
      attributeName,
      (response.data ?? []).map((datapoint) => ({
        ...datapoint,
        assetId,
        attributeName,
      })),
    ] as const;
  }
}
