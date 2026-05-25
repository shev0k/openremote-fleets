from __future__ import annotations

from app.models import TrackerConfig
from app.route_presets import get_route_preset, get_route_preset_profile, list_route_presets
from app.simulator import TrackerSimulator, calculate_bearing, distance_meters


def _route_length(route_name: str) -> float:
    route = get_route_preset(route_name)
    return sum(distance_meters(route[index], route[index + 1]) for index in range(len(route) - 1))


def _advance_until_phase(
    simulator: TrackerSimulator,
    phase_kind: str,
    *,
    timestamp_ms: int = 1_000,
) -> tuple[object, float]:
    for elapsed in range(1, 20_000):
        active_phase = simulator._active_route_phase()
        if active_phase is not None and active_phase.kind == phase_kind:
            return simulator.current_state(timestamp_ms=timestamp_ms + elapsed * 1000), float(elapsed)
        simulator.advance(1)
    raise AssertionError(f"route phase {phase_kind} did not start")


def test_route_simulation_moves_tracker_and_updates_heading() -> None:
    tracker = TrackerConfig(
        imei="352093086403655",
        name="Atlas",
        speed=36,
        update_interval=10,
        route=[
            [51.441642, 5.469722],
            [51.442000, 5.471000],
            [51.443000, 5.472000],
        ],
    )
    simulator = TrackerSimulator(tracker)

    first = simulator.current_state(timestamp_ms=1_000)
    simulator.advance(10)
    second = simulator.current_state(timestamp_ms=11_000)

    assert (second.latitude, second.longitude) != (first.latitude, first.longitude)
    assert second.movement is True
    assert second.ignition is True
    assert 0 <= second.heading <= 359


def test_parked_scenario_stops_motion_and_turns_movement_off() -> None:
    tracker = TrackerConfig(
        imei="352094085231592",
        name="Harbor",
        speed=30,
        scenario="parked",
        latitude=51.445,
        longitude=5.47,
    )
    simulator = TrackerSimulator(tracker)
    before = simulator.current_state(timestamp_ms=1_000)
    simulator.advance(60)
    after = simulator.current_state(timestamp_ms=61_000)

    assert after.latitude == before.latitude
    assert after.longitude == before.longitude
    assert after.speed == 0
    assert after.movement is False
    assert after.trip is False


def test_calculate_bearing_returns_compass_degrees() -> None:
    assert 40 <= calculate_bearing(51.441642, 5.469722, 51.442000, 5.471000) <= 80


def test_builtin_eindhoven_route_presets_are_road_like() -> None:
    presets = list_route_presets()
    route = get_route_preset("atlas_eindhoven")

    assert "atlas_eindhoven" in presets
    assert len(route) > 75
    assert all(51.35 <= latitude <= 51.55 and 5.35 <= longitude <= 5.65 for latitude, longitude in route)
    for preset_name in presets:
        preset_route = get_route_preset(preset_name)
        assert len(preset_route) > 75
        assert all(
            51.35 <= latitude <= 51.55 and 5.35 <= longitude <= 5.65
            for latitude, longitude in preset_route
        )


def test_builtin_eindhoven_route_presets_do_not_contain_large_teleport_jumps() -> None:
    for preset_name in list_route_presets():
        route = get_route_preset(preset_name)
        largest_jump = max(
            distance_meters(route[index], route[index + 1])
            for index in range(len(route) - 1)
        )

        max_jump = 1_250 if preset_name == "courier_eindhoven" else 350
        assert largest_jump < max_jump, preset_name


def test_route_preset_profiles_keep_full_routes_and_use_varied_phase_progress() -> None:
    profiles = [get_route_preset_profile(name) for name in list_route_presets()]
    expected_phase_kinds = {
        "atlas_eindhoven": ["stop", "idle", "engine_off"],
        "harbor_eindhoven": ["break", "stop"],
        "delta_eindhoven": ["signal", "stop"],
        "nimbus_eindhoven": ["offline", "engine_off"],
        "courier_eindhoven": ["idle", "break", "offline"],
    }
    expected_trip_emission = {
        "atlas_eindhoven": True,
        "harbor_eindhoven": False,
        "delta_eindhoven": True,
        "nimbus_eindhoven": True,
        "courier_eindhoven": False,
    }

    phase_signatures = [
        tuple((phase.kind, phase.start_progress, phase.duration_seconds) for phase in profile.phases)
        for profile in profiles
    ]

    assert len(set(phase_signatures)) == len(phase_signatures)
    for profile in profiles:
        assert not hasattr(profile, "terminal_after_seconds")
        assert all(0.05 <= phase.start_progress <= 0.98 for phase in profile.phases)
        assert [phase.kind for phase in profile.phases] == expected_phase_kinds[profile.name]
        assert profile.emits_trip_attribute is expected_trip_emission[profile.name]


def test_route_preset_phase_starts_are_spread_across_the_fleet() -> None:
    profiles = [get_route_preset_profile(name) for name in list_route_presets()]
    first_phase_progresses = [profile.phases[0].start_progress for profile in profiles]

    assert max(first_phase_progresses) - min(first_phase_progresses) >= 0.40
    assert len(set(first_phase_progresses)) == len(first_phase_progresses)


def test_route_preset_moves_tracker_on_builtin_eindhoven_roads() -> None:
    tracker = TrackerConfig(
        imei="352093086403655",
        name="Atlas",
        route_preset="atlas_eindhoven",
        route_progress=0,
        speed=36,
    )
    simulator = TrackerSimulator(tracker)

    first = simulator.current_state(timestamp_ms=1_000)
    simulator.advance(60)
    second = simulator.current_state(timestamp_ms=61_000)

    assert (second.latitude, second.longitude) != (first.latitude, first.longitude)
    assert second.total_odometer > first.total_odometer
    assert second.trip_odometer > first.trip_odometer
    assert second.fuel_used_gps > first.fuel_used_gps
    assert second.engine_rpm != first.engine_rpm
    assert second.movement is True


def test_route_preset_uses_profile_speed_instead_of_manual_speed() -> None:
    tracker = TrackerConfig(
        imei="352093086403655",
        name="Atlas",
        route_preset="atlas_eindhoven",
        route_progress=0,
        speed=3,
    )
    simulator = TrackerSimulator(tracker)

    state = simulator.current_state(timestamp_ms=1_000)

    assert state.speed >= get_route_preset_profile("atlas_eindhoven").base_speed_kph * 0.6


def test_fixed_location_uses_manual_speed() -> None:
    tracker = TrackerConfig(
        imei="352093086403655",
        name="Fixed",
        latitude=51.441642,
        longitude=5.469722,
        speed=17,
    )
    simulator = TrackerSimulator(tracker)

    state = simulator.current_state(timestamp_ms=1_000)

    assert state.speed == 17
    assert state.latitude == 51.441642
    assert state.longitude == 5.469722


def test_route_preset_validation_profile_emits_stop_idle_and_engine_off_states() -> None:
    tracker = TrackerConfig(
        imei="352093086403655",
        name="Atlas",
        route_preset="atlas_eindhoven",
        route_progress=0,
        speed=28,
        update_interval=5,
    )
    simulator = TrackerSimulator(tracker)

    moving = simulator.current_state(timestamp_ms=1_000)
    stopped, _ = _advance_until_phase(simulator, "stop", timestamp_ms=10_000)
    stop_phase = next(phase for phase in get_route_preset_profile("atlas_eindhoven").phases if phase.kind == "stop")
    simulator.advance(stop_phase.duration_seconds + 1)
    idle_state, _ = _advance_until_phase(simulator, "idle", timestamp_ms=20_000)
    idle_phase = next(phase for phase in get_route_preset_profile("atlas_eindhoven").phases if phase.kind == "idle")
    simulator.advance(idle_phase.duration_seconds + 1)
    engine_off, _ = _advance_until_phase(simulator, "engine_off", timestamp_ms=30_000)
    engine_off_phase = next(
        phase for phase in get_route_preset_profile("atlas_eindhoven").phases if phase.kind == "engine_off"
    )
    simulator.advance(engine_off_phase.duration_seconds + 1)
    resumed = simulator.current_state(timestamp_ms=50_000)

    assert moving.speed > 0
    assert moving.movement is True
    assert moving.trip is True
    assert stopped.speed == 0
    assert stopped.movement is False
    assert stopped.ignition is True
    assert stopped.trip is True
    assert idle_state.speed == 0
    assert idle_state.movement is False
    assert idle_state.ignition is True
    assert idle_state.trip is True
    assert engine_off.speed == 0
    assert engine_off.ignition is False
    assert engine_off.trip is False
    assert engine_off.data_mode == 1
    assert resumed.data_mode == 1
    assert resumed.speed > 0
    assert resumed.trip is True
    assert simulator.route_completed is False


def test_no_trip_route_profiles_return_missing_trip_state() -> None:
    for route_preset in ["harbor_eindhoven", "courier_eindhoven"]:
        simulator = TrackerSimulator(
            TrackerConfig(
                imei="352093086403655",
                name=route_preset,
                route_preset=route_preset,
                route_progress=0,
                speed=28,
            )
        )

        state = simulator.current_state(timestamp_ms=1_000)

        assert state.trip is None


def test_signal_phase_keeps_route_moving_with_degraded_signal() -> None:
    simulator = TrackerSimulator(
        TrackerConfig(
            imei="352093086403655",
            name="Delta",
            route_preset="delta_eindhoven",
            route_progress=0,
            update_interval=5,
        )
    )

    signal_state, _ = _advance_until_phase(simulator, "signal", timestamp_ms=10_000)
    first_position = (signal_state.latitude, signal_state.longitude)
    simulator.advance(30)
    later_signal_state = simulator.current_state(timestamp_ms=40_000)

    assert signal_state.speed > 0
    assert signal_state.movement is True
    assert signal_state.trip is True
    assert signal_state.gsm_signal <= 2
    assert signal_state.satellites < 4
    assert signal_state.gnss_hdop >= 3
    assert later_signal_state.movement is True
    assert (later_signal_state.latitude, later_signal_state.longitude) != first_position


def test_route_preset_scaled_advance_surfaces_validation_phase_before_consuming_it() -> None:
    tracker = TrackerConfig(
        imei="352093086403655",
        name="Atlas",
        route_preset="atlas_eindhoven",
        route_progress=0,
    )
    simulator = TrackerSimulator(tracker)

    simulator.advance(20_000, stop_at_phase_start=True)
    state = simulator.current_state(timestamp_ms=1_000)

    active_phase = simulator._active_route_phase()

    assert active_phase is not None
    assert active_phase.kind == "stop"
    assert state.speed == 0
    assert state.movement is False
    assert simulator.route_completed is False


def test_route_preset_does_not_end_at_the_old_short_validation_cutoff() -> None:
    tracker = TrackerConfig(
        imei="352093086403655",
        name="Atlas",
        route_preset="atlas_eindhoven",
        route_progress=0,
        speed=28,
        update_interval=5,
    )
    simulator = TrackerSimulator(tracker)

    simulator.advance(150)

    assert simulator.route_completed is False
    assert simulator.distance_offset_m < _route_length("atlas_eindhoven")


def test_scenarios_modify_route_preset_phases_without_bypassing_them() -> None:
    overspeed = TrackerSimulator(
        TrackerConfig(
            imei="352093086403655",
            name="Fast",
            route_preset="atlas_eindhoven",
            route_progress=0,
            scenario="overspeed",
            speed=5,
        )
    )

    moving = overspeed.current_state(timestamp_ms=1_000)
    stopped, _ = _advance_until_phase(overspeed, "stop", timestamp_ms=6_000)

    assert moving.speed >= 90
    assert moving.priority == 1
    assert stopped.speed == 0
    assert stopped.movement is False


def test_route_preset_defaults_to_the_real_route_start() -> None:
    route = get_route_preset("atlas_eindhoven")
    tracker = TrackerConfig(
        imei="352093086403655",
        name="Atlas",
        route_preset="atlas_eindhoven",
        speed=36,
    )
    simulator = TrackerSimulator(tracker)

    state = simulator.current_state(timestamp_ms=1_000)

    assert state.latitude == round(route[0][0], 6)
    assert state.longitude == round(route[0][1], 6)


def test_route_completion_stays_at_route_end_and_turns_tracker_off() -> None:
    tracker = TrackerConfig(
        imei="352093086403655",
        name="Short route",
        route=[
            [51.441642, 5.469722],
            [51.441650, 5.469730],
        ],
        speed=120,
        update_interval=10,
    )
    simulator = TrackerSimulator(tracker)

    simulator.advance(10)
    completed = simulator.current_state(timestamp_ms=11_000)
    simulator.advance(60)
    later = simulator.current_state(timestamp_ms=71_000)

    assert completed.latitude == 51.44165
    assert completed.longitude == 5.46973
    assert completed.speed == 0
    assert completed.movement is False
    assert completed.ignition is False
    assert completed.trip is False
    route_length = distance_meters(tuple(tracker.route[0]), tuple(tracker.route[1]))
    assert completed.trip_odometer == round(tracker.trip_odometer + route_length)
    assert later.latitude == completed.latitude
    assert later.longitude == completed.longitude


def test_yaml_route_override_wins_over_builtin_preset() -> None:
    tracker = TrackerConfig(
        imei="352093086403655",
        name="Custom route",
        route_preset="atlas_eindhoven",
        route_progress=0,
        route=[
            [51.400000, 5.400000],
            [51.400500, 5.401000],
        ],
    )
    simulator = TrackerSimulator(tracker)

    state = simulator.current_state(timestamp_ms=1_000)

    assert state.latitude == 51.4
    assert state.longitude == 5.4


def test_scenarios_drive_realistic_dynamic_state() -> None:
    overspeed = TrackerSimulator(
        TrackerConfig(
            imei="352093086403655",
            name="Fast",
            route_preset="atlas_eindhoven",
            route_progress=0,
            scenario="overspeed",
            speed=55,
        )
    ).current_state(timestamp_ms=1_000)
    weak_gnss = TrackerSimulator(
        TrackerConfig(
            imei="352093086403656",
            name="Weak",
            route_preset="atlas_eindhoven",
            route_progress=0,
            scenario="weak_gnss",
        )
    ).current_state(timestamp_ms=1_000)
    low_battery = TrackerSimulator(
        TrackerConfig(
            imei="352093086403657",
            name="Low",
            route_preset="atlas_eindhoven",
            route_progress=0,
            scenario="low_battery",
        )
    ).current_state(timestamp_ms=1_000)

    assert overspeed.speed >= 90
    assert overspeed.priority == 1
    assert weak_gnss.satellites <= 4
    assert weak_gnss.gnss_hdop >= 3.2
    assert low_battery.battery_level <= 18
    assert low_battery.battery_voltage <= 3.35
