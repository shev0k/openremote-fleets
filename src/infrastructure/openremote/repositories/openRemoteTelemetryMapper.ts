import type { TelemetrySignalSample, TelemetryTimeline } from "../../../domain/models/telemetry";
import { TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS } from "../../../domain/models/teltonikaCatalog";
import type { OpenRemoteDatapointHistory } from "../models/openRemoteDatapoints";
import { toOpenRemoteIso, toOpenRemoteTelemetryValue } from "./openRemoteAssetAttributes";
import {
  getOpenRemoteDatapointTimestamp,
  getOpenRemoteDatapointValue,
  getSortedOpenRemoteDatapoints,
} from "./openRemoteDatapointMapper";

export function createOpenRemoteTimelineSamples(history: OpenRemoteDatapointHistory, signalIds?: string[]): TelemetrySignalSample[] {
  const requestedSignals = signalIds?.length ? new Set(signalIds) : null;
  return TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS
    .filter((definition) => definition.id !== "alarm" && (!requestedSignals || requestedSignals.has(definition.id)))
    .flatMap((definition) =>
      getSortedOpenRemoteDatapoints(history, definition.attributeName).flatMap<TelemetrySignalSample>((datapoint) => {
        const timestamp = getOpenRemoteDatapointTimestamp(datapoint);
        const value = toOpenRemoteTelemetryValue(getOpenRemoteDatapointValue(datapoint));
        if (timestamp === null || value === null) return [];
        return [{
          signalId: definition.id,
          timestampIso: toOpenRemoteIso(timestamp),
          value,
          sourceAttribute: definition.attributeName,
        }];
      }),
    );
}

export function mapOpenRemoteDatapointsToTelemetryTimeline(
  vehicleId: string,
  history: OpenRemoteDatapointHistory | null | undefined,
  signalIds: string[] = [],
): TelemetryTimeline | null {
  if (!history) return null;
  const samples = createOpenRemoteTimelineSamples(history, signalIds);
  if (!samples.length) return null;
  const sampleTimes = samples.map((sample) => new Date(sample.timestampIso).valueOf());
  const signals = TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS.filter((definition) =>
    samples.some((sample) => sample.signalId === definition.id),
  );
  return {
    vehicleId,
    rangeStartIso: toOpenRemoteIso(Math.min(...sampleTimes)),
    rangeEndIso: toOpenRemoteIso(Math.max(...sampleTimes)),
    signals,
    samples,
  };
}
