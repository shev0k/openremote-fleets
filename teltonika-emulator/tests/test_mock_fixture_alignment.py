from __future__ import annotations

import json
import re
from pathlib import Path

from app.defaults import create_default_config
from app.route_presets import decode_polyline6, get_route_preset
from app.simulator import TrackerSimulator


MOCK_TELTONIKA_VALUES = {
    "atlas_eindhoven": {
        "name": "Atlas 12",
        "imei": "352093086403655",
        "latitude": 51.458188,
        "longitude": 5.493210,
        "altitude": 18,
        "heading": 274,
        "satellites": 16,
        "speed": 28,
        "event_id": 24,
        "ignition": True,
        "movement": True,
        "gsm_signal": 5,
        "external_voltage": 12.184,
        "battery_voltage": 3.812,
        "battery_current": 0.08,
        "battery_level": 93,
        "gnss_status": True,
        "gnss_hdop": 0.8,
        "total_odometer": 182431000,
        "trip_odometer": 84200,
        "fuel_used_gps": 31.4,
        "fuel_rate_gps": 28.4,
        "fuel_level": 68,
        "sleep_mode": 0,
        "data_mode": 1,
        "engine_rpm": 1240,
        "i_button": "0007104552",
        "priority": 0,
    },
    "harbor_eindhoven": {
        "name": "Harbor 07",
        "imei": "352094085231592",
        "latitude": 51.447249,
        "longitude": 5.552209,
        "altitude": 21,
        "heading": 159,
        "satellites": 12,
        "speed": 0,
        "event_id": 239,
        "ignition": True,
        "movement": False,
        "gsm_signal": 3,
        "external_voltage": 12.036,
        "battery_voltage": 3.698,
        "battery_current": 0.06,
        "battery_level": 76,
        "gnss_status": True,
        "gnss_hdop": 1.5,
        "total_odometer": 96482000,
        "trip_odometer": 38400,
        "fuel_used_gps": 3.9,
        "fuel_rate_gps": 10.1,
        "fuel_level": 41,
        "sleep_mode": 0,
        "data_mode": 0,
        "engine_rpm": 0,
        "i_button": "0007104553",
        "priority": 0,
    },
    "delta_eindhoven": {
        "name": "Delta 24",
        "imei": "352094085231600",
        "latitude": 51.417232,
        "longitude": 5.492106,
        "altitude": 16,
        "heading": 97,
        "satellites": 9,
        "speed": 41,
        "event_id": 48,
        "ignition": True,
        "movement": True,
        "gsm_signal": 2,
        "external_voltage": 11.921,
        "battery_voltage": 3.466,
        "battery_current": 0.11,
        "battery_level": 54,
        "gnss_status": True,
        "gnss_hdop": 1.8,
        "total_odometer": 208903000,
        "trip_odometer": 51300,
        "fuel_used_gps": 12.7,
        "fuel_rate_gps": 24.8,
        "fuel_level": 23,
        "sleep_mode": 0,
        "data_mode": 1,
        "engine_rpm": 1580,
        "i_button": "0007104554",
        "priority": 1,
    },
    "nimbus_eindhoven": {
        "name": "Nimbus 03",
        "imei": "352094085231618",
        "latitude": 51.466091,
        "longitude": 5.456550,
        "altitude": 23,
        "heading": 145,
        "satellites": 9,
        "speed": 0,
        "event_id": 69,
        "ignition": False,
        "movement": False,
        "gsm_signal": 1,
        "external_voltage": 11.884,
        "battery_voltage": 3.241,
        "battery_current": 0.02,
        "battery_level": 21,
        "gnss_status": True,
        "gnss_hdop": 2.1,
        "total_odometer": 136557000,
        "trip_odometer": 0,
        "fuel_used_gps": 0,
        "fuel_rate_gps": 9.7,
        "fuel_level": 79,
        "sleep_mode": 2,
        "data_mode": 4,
        "engine_rpm": 0,
        "i_button": "0007104555",
        "priority": 0,
    },
    "courier_eindhoven": {
        "name": "Courier 19",
        "imei": "352094085231626",
        "latitude": 51.454078,
        "longitude": 5.486248,
        "altitude": 17,
        "heading": 289,
        "satellites": 18,
        "speed": 28,
        "event_id": 24,
        "ignition": True,
        "movement": True,
        "gsm_signal": 4,
        "external_voltage": 12.442,
        "battery_voltage": 3.905,
        "battery_current": 0.07,
        "battery_level": 88,
        "gnss_status": True,
        "gnss_hdop": 0.7,
        "total_odometer": 61241000,
        "trip_odometer": 92700,
        "fuel_used_gps": 6.9,
        "fuel_rate_gps": 7.4,
        "fuel_level": 57,
        "sleep_mode": 0,
        "data_mode": 1,
        "engine_rpm": 1360,
        "i_button": "0007104556",
        "priority": 0,
    },
}

MOCK_PLAYBACK_FIXTURE = (
    Path(__file__).resolve().parents[2]
    / "src"
    / "infrastructure"
    / "repositories"
    / "mock"
    / "fixtures"
    / "playbackFixtures.ts"
)


def mock_courier_today_geometries() -> list[str]:
    source = MOCK_PLAYBACK_FIXTURE.read_text(encoding="utf-8")
    geometries: list[str] = []

    for key in ("courier1", "courier2", "courier3"):
        match = re.search(rf"{key}:\s*\"((?:\\\\|\\\"|[^\"])*)\"", source)
        assert match is not None
        geometries.append(json.loads(f'"{match.group(1)}"'))

    return geometries


def connect_segments(geometries: list[str]) -> list[tuple[float, float]]:
    route: list[tuple[float, float]] = []

    for geometry in geometries:
        points = decode_polyline6(geometry)
        if route and points and route[-1] == points[0]:
            route.extend(points[1:])
        else:
            route.extend(points)

    deduped_route: list[tuple[float, float]] = []
    for point in route:
        if not deduped_route or deduped_route[-1] != point:
            deduped_route.append(point)
    return deduped_route


def tracker_config_values(route_preset: str) -> dict[str, object]:
    tracker = next(
        tracker
        for tracker in create_default_config().trackers
        if tracker.route_preset == route_preset
    )
    expected_keys = MOCK_TELTONIKA_VALUES[route_preset].keys()
    return {key: getattr(tracker, key) for key in expected_keys}


def tracker_state_values(route_preset: str) -> dict[str, object]:
    tracker = next(
        tracker
        for tracker in create_default_config().trackers
        if tracker.route_preset == route_preset
    )
    state = TrackerSimulator(tracker).current_state(1_700_000_000_000)
    expected_keys = [
        key for key in MOCK_TELTONIKA_VALUES[route_preset].keys() if key != "name"
    ]
    return {key: getattr(state, key) for key in expected_keys}


def test_default_tracker_configs_match_mock_teltonika_fixture_values():
    for route_preset, expected in MOCK_TELTONIKA_VALUES.items():
        assert tracker_config_values(route_preset) == expected


def test_default_tracker_first_emission_matches_mock_teltonika_fixture_values():
    for route_preset, expected in MOCK_TELTONIKA_VALUES.items():
        expected_state = {key: value for key, value in expected.items() if key != "name"}
        assert tracker_state_values(route_preset) == expected_state


def test_courier_road_route_matches_mock_today_playback_route():
    assert get_route_preset("courier_eindhoven") == connect_segments(
        mock_courier_today_geometries()
    )
