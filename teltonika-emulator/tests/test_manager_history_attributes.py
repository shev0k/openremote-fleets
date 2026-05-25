from __future__ import annotations

from app.models import DEFAULT_STORE_DATAPOINT_ATTRIBUTES, TrackerState
from app.service import TrackerRuntime


def test_default_manager_history_attributes_cover_fleets_timeline_signals() -> None:
    required_attributes = {
        "gpsLocation",
        "location",
        "speed",
        "ignition",
        "movement",
        "trip",
        "fuelLevel",
        "batteryLevel",
        "externalVoltage",
        "engineRpm",
        "gnssHdop",
        "gsmSignal",
        "batteryVoltage",
        "batteryCurrent",
        "gnssStatus",
        "totalOdometer",
        "tripOdometer",
        "fuelUsedGps",
        "fuelRateGps",
        "direction",
        "satellites",
        "iButton",
    }

    assert required_attributes <= set(DEFAULT_STORE_DATAPOINT_ATTRIBUTES)


def test_manager_attribute_values_write_both_location_shapes() -> None:
    state = TrackerState(
        imei="352093086403655",
        timestamp_ms=1778783600000,
        latitude=51.441642,
        longitude=5.469722,
    )

    values = TrackerRuntime._manager_attribute_values(state)

    assert values["location"] == {"type": "Point", "coordinates": [5.469722, 51.441642]}
    assert values["gpsLocation"] == values["location"]
    assert values["trip"] is False


def test_manager_attribute_values_omit_missing_trip_signal() -> None:
    state = TrackerState(
        imei="352093086403655",
        timestamp_ms=1778783600000,
        latitude=51.441642,
        longitude=5.469722,
        trip=None,
    )

    values = TrackerRuntime._manager_attribute_values(state)

    assert "trip" not in values
