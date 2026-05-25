import type { SentAlarm } from "@openremote/model";
import type { AlertSeverity, AlertState, FleetAlert } from "../../../domain/models/alerts";
import {
  getOpenRemoteAttributeValue,
  getOpenRemoteNumber,
  toOpenRemoteIso,
  toOpenRemoteTelemetryValue,
} from "./openRemoteAssetAttributes";

function normalizeAlertSeverity(severity: unknown): AlertSeverity {
  if (severity === "HIGH" || severity === "high") return "high";
  if (severity === "LOW" || severity === "low") return "low";
  return "medium";
}

function normalizeAlertState(status: unknown): AlertState {
  if (status === "ACKNOWLEDGED") return "Acknowledged";
  if (status === "RESOLVED" || status === "CLOSED") return "Resolved";
  return "Active";
}

export function mapOpenRemoteAlarmToFleetAlert(alarm: SentAlarm): FleetAlert {
  const linkedAsset = alarm.asset?.[0];
  const sourceAttribute = typeof alarm.sourceId === "string" ? alarm.sourceId : undefined;
  const sourceValue = linkedAsset && sourceAttribute ? toOpenRemoteTelemetryValue(getOpenRemoteAttributeValue(linkedAsset, sourceAttribute)) : null;
  const speedKph = sourceAttribute === "speed" && typeof sourceValue === "number"
    ? sourceValue
    : linkedAsset
      ? getOpenRemoteNumber(linkedAsset, "speed")
      : undefined;

  const alert: FleetAlert = {
    id: String(alarm.id ?? ""),
    severity: normalizeAlertSeverity(alarm.severity),
    vehicleId: linkedAsset?.id,
    vehicleName: linkedAsset?.name ?? "Unassigned vehicle",
    type: alarm.title ?? "OpenRemote alarm",
    rule: alarm.content ?? alarm.source ?? "OpenRemote alarm",
    timeIso: toOpenRemoteIso(alarm.createdOn),
    state: normalizeAlertState(alarm.status),
    sourceAttribute,
    sourceValue: typeof sourceValue === "string" || typeof sourceValue === "number" || typeof sourceValue === "boolean" ? sourceValue : undefined,
  };

  if (speedKph !== undefined) {
    alert.speedKph = speedKph;
  }

  return alert;
}
