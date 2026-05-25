from __future__ import annotations

import math

from app.models import TrackerConfig, TrackerState
from app.route_presets import RoutePresetPhase, RoutePresetProfile, get_route_preset, get_route_preset_profile

EARTH_RADIUS_METERS = 6_371_000


def distance_meters(start: tuple[float, float], end: tuple[float, float]) -> float:
    lat1, lon1 = map(math.radians, start)
    lat2, lon2 = map(math.radians, end)
    delta_lat = lat2 - lat1
    delta_lon = lon2 - lon1
    a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
    return EARTH_RADIUS_METERS * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def calculate_bearing(start_lat: float, start_lon: float, end_lat: float, end_lon: float) -> int:
    lat1 = math.radians(start_lat)
    lat2 = math.radians(end_lat)
    delta_lon = math.radians(end_lon - start_lon)
    y = math.sin(delta_lon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(delta_lon)
    return round((math.degrees(math.atan2(y, x)) + 360) % 360)


def _interpolate(start: tuple[float, float], end: tuple[float, float], ratio: float) -> tuple[float, float]:
    start_lat, start_lon = start
    end_lat, end_lon = end
    return (start_lat + (end_lat - start_lat) * ratio, start_lon + (end_lon - start_lon) * ratio)


class TrackerSimulator:
    def __init__(self, config: TrackerConfig):
        self.config = config
        self.distance_offset_m = 0.0
        self.cumulative_distance_m = 0.0
        self.elapsed_seconds = 0.0
        self._route_profile = self._resolve_route_profile()
        self._route = self._resolve_route()
        self._segment_lengths = [
            distance_meters(self._route[index], self._route[index + 1])
            for index in range(max(0, len(self._route) - 1))
        ]
        self._route_length_m = sum(self._segment_lengths)
        self.route_completed = False
        self._completed_phase_indexes: set[int] = set()
        self._active_phase_index: int | None = None
        self._active_phase_remaining_seconds = 0.0
        if self._route_length_m:
            self.distance_offset_m = self._initial_route_offset()
            self._completed_phase_indexes = self._initial_completed_phase_indexes()
            self.route_completed = self.distance_offset_m >= self._route_length_m

    def advance(self, seconds: float, *, stop_at_phase_start: bool = False) -> None:
        remaining_seconds = max(0.0, seconds)
        while remaining_seconds > 0 and not self.route_completed:
            if self._start_due_route_phase():
                if stop_at_phase_start:
                    break
                continue
            if self._active_phase_index is not None:
                step_seconds = min(remaining_seconds, self._active_phase_remaining_seconds)
                if self._is_moving():
                    self._advance_distance(step_seconds)
                self._active_phase_remaining_seconds -= step_seconds
                self.elapsed_seconds += step_seconds
                remaining_seconds -= step_seconds
                if self._active_phase_remaining_seconds <= 0:
                    self._completed_phase_indexes.add(self._active_phase_index)
                    self._active_phase_index = None
                    self._active_phase_remaining_seconds = 0.0
                continue

            step_seconds = min(remaining_seconds, self._seconds_until_next_route_boundary(remaining_seconds))
            if self._is_moving():
                self._advance_distance(step_seconds)
            self.elapsed_seconds += step_seconds
            remaining_seconds -= step_seconds

    def _advance_distance(self, seconds: float) -> None:
        distance_delta = (self._effective_speed() / 3.6) * seconds
        if self._route_length_m:
            remaining_distance = max(0.0, self._route_length_m - self.distance_offset_m)
            distance_delta = min(distance_delta, remaining_distance)
            self.distance_offset_m += distance_delta
            if self.distance_offset_m >= self._route_length_m:
                self.distance_offset_m = self._route_length_m
                self.route_completed = True
        else:
            self.distance_offset_m += distance_delta
        self.cumulative_distance_m += distance_delta

    def _seconds_until_next_route_boundary(self, fallback_seconds: float) -> float:
        if not self._route_length_m:
            return fallback_seconds

        speed_mps = self._effective_speed() / 3.6
        if speed_mps <= 0:
            return fallback_seconds

        next_distances = [max(0.0, self._route_length_m - self.distance_offset_m)]
        next_phase_distance = self._next_route_phase_distance()
        if next_phase_distance is not None:
            next_distances.append(max(0.0, next_phase_distance - self.distance_offset_m))

        seconds_until_boundary = min(next_distances) / speed_mps
        return max(0.001, min(fallback_seconds, seconds_until_boundary))

    def current_state(self, timestamp_ms: int) -> TrackerState:
        if self._should_emit_seed_state():
            return self._seed_state(timestamp_ms)

        latitude, longitude, heading = self._current_position()
        scenario = self.config.scenario
        active_phase = self._active_route_phase()
        engine_off_phase = active_phase is not None and active_phase.kind == "engine_off"
        offline_phase = active_phase is not None and active_phase.kind == "offline"
        signal_phase = active_phase is not None and active_phase.kind == "signal"
        terminal = scenario == "offline" or self.route_completed
        disconnected = terminal or offline_phase
        speed = self._effective_speed()
        moving = self._is_moving()
        trip = self._trip_attribute_value(self._trip_active(moving, active_phase, disconnected, engine_off_phase))
        distance_km = self.cumulative_distance_m / 1000
        phase = self._phase(timestamp_ms)
        battery_level = self._battery_level(distance_km, phase)
        battery_voltage = self._battery_voltage(battery_level, phase)
        external_voltage = self._external_voltage(moving, phase)
        satellites = self._satellites(phase)
        gnss_hdop = self._gnss_hdop(phase)
        gsm_signal = self._gsm_signal(phase)
        gnss_status = self.config.gnss_status and not disconnected
        fuel_rate_gps = self._fuel_rate(speed, moving, phase)
        fuel_used_gps = round(self.config.fuel_used_gps + distance_km * fuel_rate_gps / 100, 3)
        fuel_level = self._fuel_level(distance_km)
        engine_rpm = self._engine_rpm(speed, moving, phase)
        event_id = self._event_id()
        priority = self._priority()

        if signal_phase:
            satellites = min(satellites, 3)
            gnss_hdop = max(gnss_hdop, 3.2)
            gsm_signal = min(gsm_signal, 2)
            gnss_status = False

        if scenario == "low_battery":
            battery_level = min(battery_level, 18)
            battery_voltage = min(battery_voltage, 3.35)
            external_voltage = min(external_voltage, 11.9)
        elif scenario == "weak_gnss":
            satellites = min(satellites, 3)
            gnss_hdop = max(gnss_hdop, 3.2)
            gsm_signal = min(gsm_signal, 2)
            gnss_status = False

        return TrackerState(
            imei=self.config.imei,
            timestamp_ms=timestamp_ms,
            latitude=round(latitude, 6),
            longitude=round(longitude, 6),
            altitude=self.config.altitude,
            heading=heading,
            satellites=satellites,
            speed=speed,
            ignition=self.config.ignition and not disconnected and not engine_off_phase,
            movement=moving,
            trip=trip,
            gsm_signal=gsm_signal,
            external_voltage=external_voltage,
            battery_voltage=battery_voltage,
            battery_current=self._battery_current(moving, phase),
            battery_level=battery_level,
            gnss_status=gnss_status,
            gnss_hdop=gnss_hdop,
            total_odometer=round(self.config.total_odometer + self.cumulative_distance_m),
            trip_odometer=round(self.config.trip_odometer + self.cumulative_distance_m),
            fuel_used_gps=fuel_used_gps,
            fuel_rate_gps=fuel_rate_gps,
            fuel_level=fuel_level,
            sleep_mode=2 if disconnected else self.config.sleep_mode,
            data_mode=4 if disconnected else self.config.data_mode,
            engine_rpm=engine_rpm,
            i_button=self.config.i_button,
            event_id=event_id,
            priority=priority,
        )

    def _should_emit_seed_state(self) -> bool:
        return (
            self.config.seed_state_from_config
            and self.elapsed_seconds == 0
            and self.cumulative_distance_m == 0
        )

    def _seed_state(self, timestamp_ms: int) -> TrackerState:
        return TrackerState(
            imei=self.config.imei,
            timestamp_ms=timestamp_ms,
            latitude=round(self.config.latitude, 6),
            longitude=round(self.config.longitude, 6),
            altitude=self.config.altitude,
            heading=self.config.heading,
            satellites=self.config.satellites,
            speed=self.config.speed,
            ignition=self.config.ignition,
            movement=self.config.movement,
            trip=self._trip_attribute_value(self._seed_trip_active()),
            gsm_signal=self.config.gsm_signal,
            external_voltage=self.config.external_voltage,
            battery_voltage=self.config.battery_voltage,
            battery_current=self.config.battery_current,
            battery_level=self.config.battery_level,
            gnss_status=self.config.gnss_status,
            gnss_hdop=self.config.gnss_hdop,
            total_odometer=self.config.total_odometer,
            trip_odometer=self.config.trip_odometer,
            fuel_used_gps=self.config.fuel_used_gps,
            fuel_rate_gps=self.config.fuel_rate_gps,
            fuel_level=self.config.fuel_level,
            sleep_mode=self.config.sleep_mode,
            data_mode=self.config.data_mode,
            engine_rpm=self.config.engine_rpm,
            i_button=self.config.i_button,
            event_id=self.config.event_id,
            priority=self.config.priority,
        )

    def _trip_active(
        self,
        moving: bool,
        active_phase: RoutePresetPhase | None,
        disconnected: bool,
        engine_off_phase: bool,
    ) -> bool:
        if disconnected or engine_off_phase or self.route_completed or self.config.scenario in {"parked", "offline"}:
            return False
        if active_phase is not None:
            return active_phase.kind in {"stop", "idle", "signal"}
        return moving

    def _trip_attribute_value(self, trip: bool) -> bool | None:
        return trip if self._emits_trip_attribute() else None

    def _emits_trip_attribute(self) -> bool:
        return self._route_profile.emits_trip_attribute if self._route_profile else True

    def _seed_trip_active(self) -> bool:
        return (
            self.config.scenario not in {"parked", "offline"}
            and self.config.ignition
            and self.config.movement
            and self.config.speed > 0
        )

    def _resolve_route(self) -> list[tuple[float, float]]:
        if self.config.route:
            return [(point[0], point[1]) for point in self.config.route]
        if self.config.route_preset:
            return get_route_preset(self.config.route_preset)
        return []

    def _resolve_route_profile(self) -> RoutePresetProfile | None:
        if self.config.route or not self.config.route_preset:
            return None
        return get_route_preset_profile(self.config.route_preset)

    def _initial_route_offset(self) -> float:
        if self.config.route_progress is not None:
            return self.config.route_progress * self._route_length_m
        return 0

    def _initial_completed_phase_indexes(self) -> set[int]:
        if not self._route_profile:
            return set()
        progress = self.distance_offset_m / self._route_length_m if self._route_length_m else 0
        return {
            index
            for index, phase in enumerate(self._route_profile.phases)
            if phase.start_progress < progress
        }

    def _effective_speed(self) -> int:
        active_phase = self._active_route_phase()
        if active_phase is not None and self._phase_pauses_route(active_phase):
            return 0
        if self.route_completed or self.config.scenario in {"parked", "offline"}:
            return 0
        multiplier = self._speed_multiplier()
        base_speed = self._route_profile.base_speed_kph if self._route_profile else self.config.speed
        if self.config.scenario == "low_battery":
            base_speed = max(12, round(base_speed * 0.85))
        if self.config.scenario == "overspeed":
            base_speed = max(90, base_speed)
            multiplier = max(1.0, multiplier)
        return max(0, min(180, round(base_speed * multiplier)))

    def _is_moving(self) -> bool:
        return (
            self.config.movement
            and not self.route_completed
            and self._effective_speed() > 0
            and self.config.scenario != "offline"
        )

    def _active_route_phase(self) -> RoutePresetPhase | None:
        if (
            not self._route_profile
            or self.config.scenario in {"parked", "offline"}
            or self._active_phase_index is None
        ):
            return None
        return self._route_profile.phases[self._active_phase_index]

    @staticmethod
    def _phase_pauses_route(phase: RoutePresetPhase) -> bool:
        return phase.kind in {"stop", "idle", "break", "engine_off", "offline"}

    def _start_due_route_phase(self) -> bool:
        if (
            not self._route_profile
            or not self._route_length_m
            or self.route_completed
            or self.config.scenario in {"parked", "offline"}
            or self._active_phase_index is not None
        ):
            return False
        progress = self.distance_offset_m / self._route_length_m
        for index, phase in enumerate(self._route_profile.phases):
            if index in self._completed_phase_indexes:
                continue
            if progress + 0.000001 >= phase.start_progress:
                self._active_phase_index = index
                self._active_phase_remaining_seconds = phase.duration_seconds
                return True
            break
        return False

    def _next_route_phase_distance(self) -> float | None:
        if not self._route_profile or self.config.scenario in {"parked", "offline"}:
            return None
        for index, phase in enumerate(self._route_profile.phases):
            if index in self._completed_phase_indexes:
                continue
            phase_distance = phase.start_progress * self._route_length_m
            if phase_distance > self.distance_offset_m:
                return phase_distance
        return None

    def _speed_multiplier(self) -> float:
        if not self._route_length_m:
            return 1.0
        progress = min(1.0, self.distance_offset_m / self._route_length_m)
        route_wave = 0.92 + 0.13 * math.sin(progress * math.pi * 2) + 0.08 * math.sin(progress * math.pi * 11)
        return max(0.62, min(1.18, route_wave))

    def _phase(self, timestamp_ms: int) -> float:
        progress = self.distance_offset_m / self._route_length_m if self._route_length_m else 0
        return progress * math.pi * 2 + timestamp_ms / 60_000

    def _battery_level(self, distance_km: float, phase: float) -> int:
        drift = distance_km * 0.02 + max(0, math.sin(phase * 0.17)) * 0.2
        return max(0, min(100, round(self.config.battery_level - drift)))

    def _battery_voltage(self, battery_level: int, phase: float) -> float:
        nominal = 3.35 + (battery_level / 100) * 0.62
        return round(max(3.0, min(4.2, nominal + 0.025 * math.sin(phase * 1.7))), 3)

    def _external_voltage(self, moving: bool, phase: float) -> float:
        if self.config.scenario == "offline":
            return round(min(self.config.external_voltage, 11.9), 3)
        if not moving:
            return round(max(11.5, self.config.external_voltage - 0.12 + 0.025 * math.sin(phase)), 3)
        return round(max(11.7, self.config.external_voltage + 0.16 * math.sin(phase * 1.3)), 3)

    def _battery_current(self, moving: bool, phase: float) -> float:
        base = self.config.battery_current + (0.045 if moving else 0)
        return round(max(-10, min(10, base + 0.012 * math.sin(phase * 2.1))), 3)

    def _satellites(self, phase: float) -> int:
        value = self.config.satellites + round(2 * math.sin(phase * 0.9))
        return max(5, min(22, value))

    def _gnss_hdop(self, phase: float) -> float:
        return round(max(0.5, min(3.0, self.config.gnss_hdop + 0.18 * math.sin(phase * 1.1))), 1)

    def _gsm_signal(self, phase: float) -> int:
        return max(1, min(5, self.config.gsm_signal + round(math.sin(phase * 0.7))))

    def _fuel_rate(self, speed: int, moving: bool, phase: float) -> float:
        if not moving:
            return round(max(0, self.config.fuel_rate_gps * 0.28), 1)
        load = 0.7 + speed / 90
        return round(max(3.0, self.config.fuel_rate_gps * load + 0.8 * math.sin(phase)), 1)

    def _fuel_level(self, distance_km: float) -> int:
        return max(0, min(100, round(self.config.fuel_level - distance_km * 0.18)))

    def _engine_rpm(self, speed: int, moving: bool, phase: float) -> int:
        if not moving:
            return 0
        rpm = 760 + speed * 24 + 85 * math.sin(phase * 2.6)
        return max(700, min(4500, round(rpm)))

    def _event_id(self) -> int:
        active_phase = self._active_route_phase()
        if active_phase is not None:
            if active_phase.kind == "signal":
                return 69
            if active_phase.kind == "engine_off":
                return 239
            if active_phase.kind == "offline":
                return 80
            return 240
        if self.config.scenario == "overspeed":
            return 24
        if self.config.scenario == "low_battery":
            return 113
        if self.config.scenario == "weak_gnss":
            return 69
        if self.config.scenario in {"parked", "offline"}:
            return 239
        return self.config.event_id if self.config.event_id != 239 else 24

    def _priority(self) -> int:
        if self.config.scenario in {"overspeed", "low_battery"}:
            return max(1, self.config.priority)
        return self.config.priority

    def _current_position(self) -> tuple[float, float, int]:
        if len(self._route) < 2 or not self._route_length_m:
            return self.config.latitude, self.config.longitude, self.config.heading

        remaining = self.distance_offset_m
        for index, segment_length in enumerate(self._segment_lengths):
            if remaining <= segment_length:
                start = self._route[index]
                end = self._route[index + 1]
                ratio = 0 if segment_length == 0 else remaining / segment_length
                latitude, longitude = _interpolate(start, end, ratio)
                heading = calculate_bearing(start[0], start[1], end[0], end[1])
                return latitude, longitude, heading
            remaining -= segment_length

        latitude, longitude = self._route[-1]
        previous_latitude, previous_longitude = self._route[-2]
        return latitude, longitude, calculate_bearing(previous_latitude, previous_longitude, latitude, longitude)
