from __future__ import annotations

from typing import Any

from app.models import TrackerState


def build_mqtt_payload(realm: str, client_id: str, state: TrackerState) -> tuple[str, dict[str, Any]]:
    topic = f"{realm}/{client_id}/teltonika/{state.imei}/data"
    reported: dict[str, Any] = {
        "ts": state.timestamp_ms,
        "latlng": f"{state.latitude:.6f},{state.longitude:.6f}",
        "pr": str(state.priority),
        "evt": str(state.event_id),
        "alt": str(state.altitude),
        "ang": str(state.heading),
        "sat": str(state.satellites),
        "sp": str(state.speed),
        "24": state.speed,
        "239": int(state.ignition),
        "240": int(state.movement),
        "21": state.gsm_signal,
        "66": round(state.external_voltage * 1000),
        "67": round(state.battery_voltage * 1000),
        "68": round(state.battery_current * 1000),
        "113": state.battery_level,
        "69": int(state.gnss_status),
        "182": round(state.gnss_hdop * 10),
        "16": state.total_odometer,
        "199": state.trip_odometer,
        "12": round(state.fuel_used_gps * 1000),
        "13": round(state.fuel_rate_gps * 100),
        "48": state.fuel_level,
        "200": state.sleep_mode,
        "80": state.data_mode,
        "36": state.engine_rpm,
    }
    if state.trip is not None:
        reported["250"] = int(state.trip)
    if state.i_button:
        reported["78"] = state.i_button
    return topic, {"state": {"reported": reported}}
