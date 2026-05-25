import { VehicleDetail } from "../../../../domain/models/vehicle";
import { MOCK_FLEET_FIXTURES } from "./fleetFixtures";
import { getTeltonikaNumber } from "./teltonikaTelemetryFixtures";

function createVehicleDetail(
  vehicleId: string,
  overrides: Pick<VehicleDetail, "fuelInTankLiters" | "stoppedDurationMinutes"> & Partial<Pick<VehicleDetail, "lastCommunicationIso" | "gpsAccuracyMeters">>,
): VehicleDetail {
  const vehicle = MOCK_FLEET_FIXTURES.find((entry) => entry.id === vehicleId);

  if (!vehicle) {
    throw new Error(`Missing fleet fixture for vehicle detail: ${vehicleId}`);
  }

  if (!vehicle.teltonika) {
    throw new Error(`Missing Teltonika fixture for vehicle detail: ${vehicleId}`);
  }

  return {
    ...vehicle,
    lastCommunicationIso: overrides.lastCommunicationIso ?? vehicle.teltonika.timestampIso,
    gpsAccuracyMeters: overrides.gpsAccuracyMeters ?? Math.max(4, Math.round(getTeltonikaNumber(vehicle.teltonika, "gnssHdop") * 10)),
    todayMileageKm: getTeltonikaNumber(vehicle.teltonika, "tripOdometer") / 1000,
    odometerKm: getTeltonikaNumber(vehicle.teltonika, "totalOdometer") / 1000,
    fuelInTankLiters: overrides.fuelInTankLiters,
    averageFuelConsumptionLitersPer100Km: getTeltonikaNumber(vehicle.teltonika, "fuelRateGps"),
    stoppedDurationMinutes: overrides.stoppedDurationMinutes,
  };
}

export const MOCK_VEHICLE_DETAIL_FIXTURES: Record<string, VehicleDetail> = {
  "veh-atlas-12": createVehicleDetail("veh-atlas-12", {
    fuelInTankLiters: 246,
    stoppedDurationMinutes: 18,
  }),
  "veh-harbor-07": createVehicleDetail("veh-harbor-07", {
    fuelInTankLiters: 31,
    stoppedDurationMinutes: 46,
  }),
  "veh-delta-24": createVehicleDetail("veh-delta-24", {
    fuelInTankLiters: 88,
    stoppedDurationMinutes: 27,
  }),
  "veh-nimbus-03": createVehicleDetail("veh-nimbus-03", {
    gpsAccuracyMeters: 120,
    fuelInTankLiters: 48,
    stoppedDurationMinutes: 221,
  }),
  "veh-courier-19": createVehicleDetail("veh-courier-19", {
    fuelInTankLiters: 27,
    stoppedDurationMinutes: 12,
  }),
};
