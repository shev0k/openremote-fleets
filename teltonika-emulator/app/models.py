from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.route_presets import route_preset_exists


Transport = Literal["tcp", "mqtt"]
Scenario = Literal["moving", "parked", "offline", "low_battery", "weak_gnss", "overspeed"]
DEFAULT_STORE_DATAPOINT_ATTRIBUTES = [
    "gpsLocation",
    "location",
    "altitude",
    "direction",
    "satellites",
    "speed",
    "priority",
    "ignition",
    "movement",
    "trip",
    "gsmSignal",
    "externalVoltage",
    "batteryVoltage",
    "batteryCurrent",
    "batteryLevel",
    "gnssStatus",
    "gnssHdop",
    "totalOdometer",
    "tripOdometer",
    "fuelUsedGps",
    "fuelRateGps",
    "fuelLevel",
    "engineRpm",
    "iButton",
    "sleepMode",
    "dataMode",
    "eventTriggered",
]


class TcpConnectionConfig(BaseModel):
    host: str = "127.0.0.1"
    port: int = Field(default=5027, ge=1, le=65535)
    tls: bool = False


class MqttConnectionConfig(BaseModel):
    host: str = "127.0.0.1"
    port: int = Field(default=1883, ge=1, le=65535)
    tls: bool = False
    realm: str = "master"
    client_id: str = "fleet-emulator"
    username: str | None = None
    password: str | None = None


class ManagerApiConfig(BaseModel):
    enabled: bool = True
    base_url: str = "https://localhost"
    realm: str = "master"
    client_id: str = "openremote"
    username: str = "admin"
    password: str = "secret"
    verify_tls: bool = False
    auto_store_datapoints: bool = True
    store_datapoint_attributes: list[str] = Field(default_factory=lambda: list(DEFAULT_STORE_DATAPOINT_ATTRIBUTES))
    data_points_max_age_days: int | None = Field(default=None, ge=1)


class ManagerConfig(BaseModel):
    tcp: TcpConnectionConfig = Field(default_factory=TcpConnectionConfig)
    mqtt: MqttConnectionConfig = Field(default_factory=MqttConnectionConfig)
    api: ManagerApiConfig = Field(default_factory=ManagerApiConfig)


class TrackerCustomAttributes(BaseModel):
    driver_name: str | None = None
    plate: str | None = None
    asset_class: str | None = None

    @field_validator("driver_name", "plate", "asset_class")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    def enabled_manager_values(self) -> dict[str, str]:
        values: dict[str, str] = {}
        if self.driver_name:
            values["driverName"] = self.driver_name
        if self.plate:
            values["plate"] = self.plate
        if self.asset_class:
            values["assetClass"] = self.asset_class
        return values


class TrackerConfig(BaseModel):
    imei: str
    name: str
    enabled: bool = False
    transport: Transport = "tcp"
    host: str | None = None
    port: int | None = Field(default=None, ge=1, le=65535)
    tls: bool | None = None
    mqtt_realm: str | None = None
    mqtt_client_id: str | None = None
    mqtt_username: str | None = None
    mqtt_password: str | None = None
    scenario: Scenario = "moving"
    latitude: float = Field(default=51.441642, ge=-90, le=90)
    longitude: float = Field(default=5.469722, ge=-180, le=180)
    route_preset: str | None = None
    seed_state_from_config: bool = False
    route_progress: float | None = Field(default=None, ge=0, le=1)
    route: list[list[float]] = Field(default_factory=list)
    speed: int = Field(default=28, ge=0, le=240)
    heading: int = Field(default=84, ge=0, le=359)
    altitude: int = Field(default=18, ge=-500, le=9000)
    satellites: int = Field(default=12, ge=0, le=64)
    ignition: bool = True
    movement: bool = True
    gsm_signal: int = Field(default=5, ge=0, le=5)
    external_voltage: float = Field(default=12.184, ge=0, le=32)
    battery_voltage: float = Field(default=3.812, ge=0, le=6)
    battery_current: float = Field(default=0.064, ge=-10, le=10)
    battery_level: int = Field(default=93, ge=0, le=100)
    gnss_status: bool = True
    gnss_hdop: float = Field(default=0.8, ge=0, le=99.9)
    total_odometer: int = Field(default=154_820, ge=0)
    trip_odometer: int = Field(default=12_400, ge=0)
    fuel_used_gps: float = Field(default=31.4, ge=0)
    fuel_rate_gps: float = Field(default=28.4, ge=0)
    fuel_level: int = Field(default=68, ge=0, le=100)
    sleep_mode: int = Field(default=0, ge=0, le=255)
    data_mode: int = Field(default=1, ge=0, le=255)
    engine_rpm: int = Field(default=1240, ge=0, le=10_000)
    i_button: str | None = "0007104552"
    custom_attributes: TrackerCustomAttributes = Field(default_factory=TrackerCustomAttributes)
    update_interval: float = Field(default=5.0, ge=0.2, le=3600)
    event_id: int = Field(default=239, ge=0, le=255)
    priority: int = Field(default=0, ge=0, le=3)

    @field_validator("imei")
    @classmethod
    def validate_imei(cls, value: str) -> str:
        if not value.isdigit() or len(value) != 15:
            raise ValueError("IMEI must be a 15-digit string")
        return value

    @field_validator("route")
    @classmethod
    def validate_route(cls, value: list[list[float]]) -> list[list[float]]:
        for coordinate in value:
            if len(coordinate) != 2:
                raise ValueError("route coordinates must be [latitude, longitude]")
            latitude, longitude = coordinate
            if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
                raise ValueError("route coordinate is outside valid latitude/longitude bounds")
        return value

    @field_validator("route_preset")
    @classmethod
    def validate_route_preset(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        if not route_preset_exists(value):
            raise ValueError(f"unknown route preset: {value}")
        return value


class EmulatorConfig(BaseModel):
    manager: ManagerConfig = Field(default_factory=ManagerConfig)
    trackers: list[TrackerConfig] = Field(default_factory=list)


class TrackerState(BaseModel):
    imei: str
    timestamp_ms: int = Field(default_factory=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))
    latitude: float
    longitude: float
    altitude: int = 0
    heading: int = 0
    satellites: int = 0
    speed: int = 0
    ignition: bool = False
    movement: bool = False
    trip: bool | None = False
    gsm_signal: int = 0
    external_voltage: float = 0
    battery_voltage: float = 0
    battery_current: float = 0
    battery_level: int = 0
    gnss_status: bool = False
    gnss_hdop: float = 0
    total_odometer: int = 0
    trip_odometer: int = 0
    fuel_used_gps: float = 0
    fuel_rate_gps: float = 0
    fuel_level: int = 0
    sleep_mode: int = 0
    data_mode: int = 0
    engine_rpm: int = 0
    i_button: str | None = None
    event_id: int = 0
    priority: int = 0


class TrackerRuntimeStatus(BaseModel):
    imei: str
    name: str
    transport: Transport
    running: bool = False
    connected: bool = False
    last_message_at: str | None = None
    last_ack_count: int | None = None
    last_error: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    speed: int | None = None
    heading: int | None = None
    scenario: Scenario
    manager_history_configured: bool = False
    manager_history_error: str | None = None
