import { TeltonikaAttributeSample, TeltonikaAttributeValue } from "../../../domain/models/teltonika";
import { Vehicle } from "../../../domain/models/vehicle";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rounded(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getNumericAttribute(vehicle: Vehicle, attributeName: string): number | null {
  const value = vehicle.teltonika?.attributes[attributeName]?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function withAttributeValue(attribute: TeltonikaAttributeSample | undefined, attributeName: string, value: TeltonikaAttributeValue, timestampIso: string) {
  if (!attribute) {
    return undefined;
  }

  return {
    ...attribute,
    attributeName,
    value,
    timestampIso,
  };
}

export function applyWallDisplayDemoTelemetry(vehicles: Vehicle[], now: Date): Vehicle[] {
  const tick = Math.floor(now.valueOf() / 5000);
  const timestampIso = now.toISOString();

  return vehicles.map((vehicle, index) => {
    if (vehicle.status === "offline") {
      return {
        ...vehicle,
        teltonika: vehicle.teltonika
          ? {
              ...vehicle.teltonika,
              attributes: { ...vehicle.teltonika.attributes },
            }
          : undefined,
      };
    }

    const phase = tick * 0.54 + index * 1.17;
    const slowWave = Math.sin(phase);
    const fastWave = Math.sin(phase * 1.8 + index);
    const baseSpeed = vehicle.speedKph;
    const speedKph = Math.round(clamp(baseSpeed + slowWave * 4 + fastWave * 1.5, vehicle.ignitionOn ? 0 : 0, 92));
    const fuelLevelPercent = vehicle.fuelLevelPercent ?? getNumericAttribute(vehicle, "fuelLevel");
    const batteryLevelPercent = vehicle.batteryLevelPercent ?? getNumericAttribute(vehicle, "batteryLevel");
    const tripOdometer = getNumericAttribute(vehicle, "tripOdometer");
    const totalOdometer = getNumericAttribute(vehicle, "totalOdometer");
    const engineRpm = getNumericAttribute(vehicle, "engineRpm");
    const externalVoltage = getNumericAttribute(vehicle, "externalVoltage");
    const gsmSignal = getNumericAttribute(vehicle, "gsmSignal");
    const gnssHdop = getNumericAttribute(vehicle, "gnssHdop");
    const satellites = getNumericAttribute(vehicle, "satellites");
    const distanceDriftMeters = Math.max(0, speedKph) * 1.39;
    const nextAttributes = vehicle.teltonika?.attributes ? { ...vehicle.teltonika.attributes } : undefined;

    if (nextAttributes) {
      const updates: Record<string, number | null> = {
        speed: speedKph,
        fuelLevel: fuelLevelPercent === null ? null : rounded(clamp(fuelLevelPercent - ((tick + index) % 5) * 0.08 + slowWave * 0.3, 0, 100)),
        batteryLevel: batteryLevelPercent === null ? null : rounded(clamp(batteryLevelPercent + fastWave * 0.35, 0, 100)),
        externalVoltage: externalVoltage === null ? null : rounded(clamp(externalVoltage + slowWave * 0.12, 10.5, 14.4), 2),
        engineRpm: engineRpm === null ? null : Math.round(clamp(engineRpm + speedKph * 8 + fastWave * 90, 0, 3600)),
        gsmSignal: gsmSignal === null ? null : rounded(clamp(gsmSignal + slowWave * 0.25, 0, 5), 1),
        gnssHdop: gnssHdop === null ? null : rounded(clamp(gnssHdop + fastWave * 0.08, 0.5, 2.8), 1),
        satellites: satellites === null ? null : Math.round(clamp(satellites + slowWave * 1.2, 4, 16)),
        tripOdometer: tripOdometer === null ? null : Math.round(tripOdometer + distanceDriftMeters),
        totalOdometer: totalOdometer === null ? null : Math.round(totalOdometer + distanceDriftMeters),
      };

      Object.entries(updates).forEach(([attributeName, value]) => {
        if (value !== null && nextAttributes[attributeName]) {
          nextAttributes[attributeName] = withAttributeValue(nextAttributes[attributeName], attributeName, value, timestampIso) ?? nextAttributes[attributeName];
        }
      });
    }

    const nextFuelLevelPercent = nextAttributes?.fuelLevel?.value;
    const nextBatteryLevelPercent = nextAttributes?.batteryLevel?.value;

    return {
      ...vehicle,
      speedKph,
      fuelLevelPercent: typeof nextFuelLevelPercent === "number" ? nextFuelLevelPercent : vehicle.fuelLevelPercent,
      batteryLevelPercent: typeof nextBatteryLevelPercent === "number" ? nextBatteryLevelPercent : vehicle.batteryLevelPercent,
      lastUpdatedIso: timestampIso,
      teltonika: vehicle.teltonika
        ? {
            ...vehicle.teltonika,
            timestampIso,
            attributes: nextAttributes ?? vehicle.teltonika.attributes,
          }
        : undefined,
    };
  });
}
