import { describe, expect, it, vi } from "vitest";
import type { OpenRemoteRuntime } from "../runtime/openRemoteRuntime";
import { OpenRemoteAlertsService, type OpenRemoteAlarmStatus } from "./OpenRemoteAlertsService";

const OPEN_ALARM_STATUS = "OPEN" as OpenRemoteAlarmStatus;
const ACKNOWLEDGED_ALARM_STATUS = "ACKNOWLEDGED" as OpenRemoteAlarmStatus;
const RESOLVED_ALARM_STATUS = "RESOLVED" as OpenRemoteAlarmStatus;

function createRuntimeMock({
  ready = true,
  alarm = { id: 44, status: "OPEN" },
}: { ready?: boolean; alarm?: { id: number; status: string } | null } = {}) {
  const getAlarm = vi.fn().mockResolvedValue({ data: alarm });
  const updateAlarm = vi.fn().mockResolvedValue({ data: alarm });
  const getAlarms = vi.fn().mockResolvedValue({ data: [] });
  const runtime = {
    ensureReady: vi.fn().mockResolvedValue(ready),
    getApi: vi.fn(() => ({
      AlarmResource: {
        getAlarms,
        getAlarm,
        updateAlarm,
      },
    })),
  } as unknown as OpenRemoteRuntime;

  return { runtime, getAlarm, getAlarms, updateAlarm };
}

describe("OpenRemoteAlertsService", () => {
  it("keeps the real Fleets alert service limited to operational reads and state updates", () => {
    expect(Object.getOwnPropertyNames(OpenRemoteAlertsService.prototype).sort()).toEqual([
      "constructor",
      "listAlarms",
      "updateAlarmStatus",
    ]);
  });

  it.each([
    [OPEN_ALARM_STATUS],
    [ACKNOWLEDGED_ALARM_STATUS],
    [RESOLVED_ALARM_STATUS],
  ] as const)("writes raw OpenRemote %s alarm status without app-state translation", async (openRemoteStatus) => {
    const { runtime, getAlarm, updateAlarm } = createRuntimeMock();
    const service = new OpenRemoteAlertsService(runtime);

    await service.updateAlarmStatus("44", openRemoteStatus);

    expect(getAlarm).toHaveBeenCalledWith(44);
    expect(runtime.ensureReady).toHaveBeenCalledWith({ refreshSession: false });
    expect(updateAlarm).toHaveBeenCalledWith(44, expect.objectContaining({ status: openRemoteStatus }));
  });

  it("lists alarms without refreshing the session snapshot", async () => {
    const { runtime, getAlarms } = createRuntimeMock();
    const service = new OpenRemoteAlertsService(runtime);

    await expect(service.listAlarms()).resolves.toEqual([]);

    expect(runtime.ensureReady).toHaveBeenCalledWith({ refreshSession: false });
    expect(getAlarms).toHaveBeenCalledTimes(1);
  });

  it("returns without manager writes for non-numeric alert ids or missing alarms", async () => {
    const nonNumeric = createRuntimeMock();
    const nonNumericService = new OpenRemoteAlertsService(nonNumeric.runtime);

    await nonNumericService.updateAlarmStatus("mock-alert", RESOLVED_ALARM_STATUS);

    expect(nonNumeric.getAlarm).not.toHaveBeenCalled();
    expect(nonNumeric.updateAlarm).not.toHaveBeenCalled();

    const missing = createRuntimeMock({ alarm: null });
    const missingService = new OpenRemoteAlertsService(missing.runtime);

    await missingService.updateAlarmStatus("44", RESOLVED_ALARM_STATUS);

    expect(missing.getAlarm).toHaveBeenCalledWith(44);
    expect(missing.updateAlarm).not.toHaveBeenCalled();
  });
});
