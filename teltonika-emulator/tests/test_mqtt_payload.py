from __future__ import annotations

from app.models import TrackerState
from app.teltonika.mqtt_payload import build_mqtt_payload


def test_mqtt_payload_uses_openremote_teltonika_topic_and_raw_scaled_values() -> None:
    state = TrackerState(
        imei="352093086403655",
        timestamp_ms=1_782_290_930_000,
        latitude=51.441642,
        longitude=5.469722,
        altitude=18,
        heading=84,
        satellites=12,
        speed=28,
        ignition=True,
        movement=True,
        gsm_signal=5,
        external_voltage=12.184,
        battery_voltage=3.812,
        battery_current=0.064,
        battery_level=93,
        gnss_status=True,
        gnss_hdop=0.8,
        total_odometer=154_820,
        trip_odometer=12_400,
        fuel_level=68,
        engine_rpm=1240,
        trip=True,
    )

    topic, payload = build_mqtt_payload("master", "fleet-emulator", state)
    reported = payload["state"]["reported"]

    assert topic == "master/fleet-emulator/teltonika/352093086403655/data"
    assert reported["ts"] == 1_782_290_930_000
    assert reported["latlng"] == "51.441642,5.469722"
    assert reported["sp"] == "28"
    assert reported["24"] == 28
    assert reported["239"] == 1
    assert reported["240"] == 1
    assert reported["250"] == 1
    assert reported["66"] == 12184
    assert reported["67"] == 3812
    assert reported["68"] == 64
    assert reported["113"] == 93
    assert reported["182"] == 8


def test_mqtt_payload_omits_trip_attribute_when_profile_has_no_trip_signal() -> None:
    state = TrackerState(
        imei="352093086403655",
        timestamp_ms=1_782_290_930_000,
        latitude=51.441642,
        longitude=5.469722,
        trip=None,
    )

    _, payload = build_mqtt_payload("master", "fleet-emulator", state)
    reported = payload["state"]["reported"]

    assert "250" not in reported
