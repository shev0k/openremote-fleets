from __future__ import annotations

from app.models import EmulatorConfig, TrackerConfig


PRESET_TRACKER_BLUEPRINTS = [
    {
        "name": "Atlas 12",
        "imei": "352093086403655",
        "route_preset": "atlas_eindhoven",
        "scenario": "moving",
        "route_progress": 0.18,
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
        "total_odometer": 182_431_000,
        "trip_odometer": 84_200,
        "fuel_used_gps": 31.4,
        "fuel_rate_gps": 28.4,
        "fuel_level": 68,
        "sleep_mode": 0,
        "data_mode": 1,
        "engine_rpm": 1240,
        "i_button": "0007104552",
        "priority": 0,
    },
    {
        "name": "Harbor 07",
        "imei": "352094085231592",
        "route_preset": "harbor_eindhoven",
        "scenario": "moving",
        "route_progress": 0.42,
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
        "total_odometer": 96_482_000,
        "trip_odometer": 38_400,
        "fuel_used_gps": 3.9,
        "fuel_rate_gps": 10.1,
        "fuel_level": 41,
        "sleep_mode": 0,
        "data_mode": 0,
        "engine_rpm": 0,
        "i_button": "0007104553",
        "priority": 0,
    },
    {
        "name": "Delta 24",
        "imei": "352094085231600",
        "route_preset": "delta_eindhoven",
        "scenario": "moving",
        "route_progress": 0.3,
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
        "total_odometer": 208_903_000,
        "trip_odometer": 51_300,
        "fuel_used_gps": 12.7,
        "fuel_rate_gps": 24.8,
        "fuel_level": 23,
        "sleep_mode": 0,
        "data_mode": 1,
        "engine_rpm": 1580,
        "i_button": "0007104554",
        "priority": 1,
    },
    {
        "name": "Nimbus 03",
        "imei": "352094085231618",
        "route_preset": "nimbus_eindhoven",
        "scenario": "moving",
        "route_progress": 0.24,
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
        "total_odometer": 136_557_000,
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
    {
        "name": "Courier 19",
        "imei": "352094085231626",
        "route_preset": "courier_eindhoven",
        "scenario": "moving",
        "route_progress": 0.12,
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
        "total_odometer": 61_241_000,
        "trip_odometer": 92_700,
        "fuel_used_gps": 6.9,
        "fuel_rate_gps": 7.4,
        "fuel_level": 57,
        "sleep_mode": 0,
        "data_mode": 1,
        "engine_rpm": 1360,
        "i_button": "0007104556",
        "priority": 0,
    },
]


FRESH_IMEI_PREFIX = "352094"


def _next_free_imei(preferred_imei: str, reserved_imeis: set[str]) -> str:
    candidate = int(preferred_imei)
    while str(candidate) in reserved_imeis:
        candidate += 1
    imei = str(candidate)
    reserved_imeis.add(imei)
    return imei


def _fresh_imei(seed: int, index: int) -> str:
    suffix = (seed + index) % 1_000_000_000
    return f"{FRESH_IMEI_PREFIX}{suffix:09d}"


def _tracker_from_blueprint(blueprint: dict[str, object], imei: str | None = None) -> TrackerConfig:
    return TrackerConfig(
        imei=imei or str(blueprint["imei"]),
        name=str(blueprint["name"]),
        route_preset=str(blueprint["route_preset"]),
        route_progress=float(blueprint["route_progress"]),
        seed_state_from_config=True,
        scenario=str(blueprint["scenario"]),
        latitude=float(blueprint["latitude"]),
        longitude=float(blueprint["longitude"]),
        altitude=int(blueprint["altitude"]),
        heading=int(blueprint["heading"]),
        satellites=int(blueprint["satellites"]),
        speed=int(blueprint["speed"]),
        event_id=int(blueprint["event_id"]),
        ignition=bool(blueprint["ignition"]),
        movement=bool(blueprint["movement"]),
        gsm_signal=int(blueprint["gsm_signal"]),
        external_voltage=float(blueprint["external_voltage"]),
        battery_voltage=float(blueprint["battery_voltage"]),
        battery_current=float(blueprint["battery_current"]),
        battery_level=int(blueprint["battery_level"]),
        gnss_status=bool(blueprint["gnss_status"]),
        gnss_hdop=float(blueprint["gnss_hdop"]),
        total_odometer=int(blueprint["total_odometer"]),
        trip_odometer=int(blueprint["trip_odometer"]),
        fuel_used_gps=float(blueprint["fuel_used_gps"]),
        fuel_rate_gps=float(blueprint["fuel_rate_gps"]),
        fuel_level=int(blueprint["fuel_level"]),
        sleep_mode=int(blueprint["sleep_mode"]),
        data_mode=int(blueprint["data_mode"]),
        engine_rpm=int(blueprint["engine_rpm"]),
        i_button=str(blueprint["i_button"]),
        priority=int(blueprint["priority"]),
    )


def create_preset_tracker_configs(
    existing_trackers: list[TrackerConfig] | None = None,
    *,
    imei_seed: int | None = None,
) -> list[TrackerConfig]:
    existing_trackers = existing_trackers or []
    existing_route_presets = {tracker.route_preset for tracker in existing_trackers if tracker.route_preset}
    reserved_imeis = {tracker.imei for tracker in existing_trackers}
    trackers: list[TrackerConfig] = []
    for index, blueprint in enumerate(PRESET_TRACKER_BLUEPRINTS):
        route_preset = str(blueprint["route_preset"])
        if route_preset in existing_route_presets:
            continue
        preferred_imei = str(blueprint["imei"])
        if imei_seed is not None and preferred_imei in reserved_imeis:
            preferred_imei = _fresh_imei(imei_seed, index)
        trackers.append(_tracker_from_blueprint(blueprint, _next_free_imei(preferred_imei, reserved_imeis)))
    return trackers


def create_default_config() -> EmulatorConfig:
    return EmulatorConfig(trackers=[_tracker_from_blueprint(blueprint) for blueprint in PRESET_TRACKER_BLUEPRINTS])
