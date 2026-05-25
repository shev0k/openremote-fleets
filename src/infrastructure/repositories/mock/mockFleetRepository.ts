import { PlaybackQuery } from "../../../domain/models/playback";
import { TelemetrySignalDefinition, TelemetryTimeline } from "../../../domain/models/telemetry";
import { Vehicle, VehicleDetail } from "../../../domain/models/vehicle";
import { FleetRepository } from "../../../domain/repositories/fleetRepository";
import { cloneFixture } from "./fixtures/cloneFixture";
import { MOCK_FLEET_FIXTURES } from "./fixtures/fleetFixtures";
import { createMockTelemetryTimelines } from "./fixtures/timelineTelemetryFixtures";
import { MOCK_VEHICLE_DETAIL_FIXTURES } from "./fixtures/vehicleDetailsFixtures";
import { addMockCalendarDays, getCurrentMockDateKey, rebaseIsoTimestampDate } from "./mockDateRebase";

function getCustomDateIso(query: PlaybackQuery): string | null {
  return query.preset === "customDate" && query.customDateIso ? query.customDateIso.slice(0, 10) : null;
}

function getQueryTargetDateIso(query: PlaybackQuery): string | null {
  const customDateIso = getCustomDateIso(query);
  if (customDateIso) {
    return customDateIso;
  }

  const todayIso = getCurrentMockDateKey();

  if (query.preset === "today" || query.preset === "last24Hours") {
    return todayIso;
  }

  if (query.preset === "yesterday") {
    return addMockCalendarDays(todayIso, -1);
  }

  return null;
}

function replaceTimestampDate(timestampIso: string, dateIso: string): string {
  const timePart = timestampIso.includes("T") ? timestampIso.slice(timestampIso.indexOf("T")) : "T00:00:00.000Z";
  return `${dateIso}${timePart}`;
}

function rebaseTimestampDate(timestampIso: string, targetDateIso: string): string {
  const sourceDateIso = timestampIso.slice(0, 10);
  return sourceDateIso === targetDateIso ? timestampIso : rebaseIsoTimestampDate(timestampIso, targetDateIso);
}

export function rebaseVehicleToDate(vehicle: Vehicle, targetDateIso: string): Vehicle {
  const lastUpdatedIso = rebaseTimestampDate(vehicle.lastUpdatedIso, targetDateIso);

  return {
    ...vehicle,
    lastUpdatedIso,
    latestTelemetrySamples: vehicle.latestTelemetrySamples?.map((sample) => ({
      ...sample,
      timestampIso: rebaseTimestampDate(sample.timestampIso, targetDateIso),
    })),
    teltonika: vehicle.teltonika
      ? {
          ...vehicle.teltonika,
          timestampIso: rebaseTimestampDate(vehicle.teltonika.timestampIso, targetDateIso),
          attributes: Object.fromEntries(
            Object.entries(vehicle.teltonika.attributes).map(([attributeName, attribute]) => [
              attributeName,
              {
                ...attribute,
                timestampIso: rebaseTimestampDate(attribute.timestampIso, targetDateIso),
              },
            ]),
          ),
        }
      : undefined,
  };
}

export function rebaseVehicleCollectionToDate(vehicles: Vehicle[], targetDateIso: string): Vehicle[] {
  return vehicles.map((vehicle) => rebaseVehicleToDate(vehicle, targetDateIso));
}

export function rebaseVehicleDetailToDate(detail: VehicleDetail, targetDateIso: string): VehicleDetail {
  return {
    ...detail,
    ...rebaseVehicleToDate(detail, targetDateIso),
    lastCommunicationIso: rebaseTimestampDate(detail.lastCommunicationIso, targetDateIso),
  };
}

function rebaseTimelineToDate(timeline: TelemetryTimeline, dateIso: string): TelemetryTimeline {
  const samples = timeline.samples.map((sample) => ({
    ...sample,
    timestampIso: replaceTimestampDate(sample.timestampIso, dateIso),
  }));

  return {
    ...timeline,
    rangeStartIso: samples[0]?.timestampIso ?? `${dateIso}T00:00:00.000Z`,
    rangeEndIso: samples.at(-1)?.timestampIso ?? `${dateIso}T23:59:59.999Z`,
    samples,
  };
}

export class MockFleetRepository implements FleetRepository {
  private readonly vehicles: Vehicle[];
  private readonly vehicleDetails: Record<string, VehicleDetail>;
  private readonly telemetryTimelines: Record<string, TelemetryTimeline>;

  constructor(
    seedVehicles: Vehicle[] = MOCK_FLEET_FIXTURES,
    seedVehicleDetails: Record<string, VehicleDetail> = MOCK_VEHICLE_DETAIL_FIXTURES,
  ) {
    this.vehicles = cloneFixture(seedVehicles);
    this.vehicleDetails = cloneFixture(seedVehicleDetails);
    this.telemetryTimelines = createMockTelemetryTimelines(this.vehicles);
  }

  async listVehicles(): Promise<Vehicle[]> {
    const todayIso = getCurrentMockDateKey();
    return cloneFixture(rebaseVehicleCollectionToDate(this.vehicles, todayIso));
  }

  async getVehicleDetail(vehicleId: string): Promise<VehicleDetail | null> {
    const detail = this.vehicleDetails[vehicleId];
    const todayIso = getCurrentMockDateKey();
    return detail ? cloneFixture(rebaseVehicleDetailToDate(detail, todayIso)) : null;
  }

  async listAvailableTelemetrySignals(vehicleId?: string): Promise<TelemetrySignalDefinition[]> {
    const timeline = vehicleId ? this.telemetryTimelines[vehicleId] : this.telemetryTimelines[this.vehicles[0]?.id ?? ""];
    return cloneFixture(timeline?.signals ?? []);
  }

  async getVehicleTelemetryTimeline(vehicleId: string, query: PlaybackQuery): Promise<TelemetryTimeline | null> {
    const timeline = this.telemetryTimelines[vehicleId];
    if (!timeline) {
      return null;
    }

    const clonedTimeline = cloneFixture(timeline);
    const targetDateIso = getQueryTargetDateIso(query);
    return targetDateIso ? rebaseTimelineToDate(clonedTimeline, targetDateIso) : clonedTimeline;
  }
}
