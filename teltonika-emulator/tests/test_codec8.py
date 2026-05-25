from __future__ import annotations

from app.models import TrackerState
from app.teltonika.codec8 import _io_elements, build_tcp_avl_packet, crc16_ibm


def test_crc16_ibm_matches_known_teltonika_frame() -> None:
    packet = bytes.fromhex(
        "000000000000003608010000016B40D8EA300100000000000000000000000000000001"
        "05021503010101425E0F01F10000601A014E0000000000000000010000C7CF"
    )
    data_length = int.from_bytes(packet[4:8], "big")
    payload = packet[8 : 8 + data_length]

    assert crc16_ibm(payload) == 0xC7CF


def test_build_tcp_avl_packet_wraps_single_codec8_record() -> None:
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
        event_id=239,
        priority=1,
    )

    packet = build_tcp_avl_packet(state)

    assert packet[:4] == b"\x00\x00\x00\x00"
    data_length = int.from_bytes(packet[4:8], "big")
    payload = packet[8:-4]
    assert data_length == len(payload)
    assert payload[0] == 0x08
    assert payload[1] == 0x01
    assert payload[-1] == 0x01
    assert int.from_bytes(packet[-4:], "big") == crc16_ibm(payload)
    assert state.timestamp_ms.to_bytes(8, "big") in packet
    assert (5.469722 * 10_000_000).__round__().to_bytes(4, "big", signed=True) in packet
    assert (51.441642 * 10_000_000).__round__().to_bytes(4, "big", signed=True) in packet
    assert b"\xfa\x01" in packet


def test_i_button_is_encoded_as_teltonika_hex_long() -> None:
    state = TrackerState(
        imei="352093086403655",
        timestamp_ms=1_782_290_930_000,
        latitude=51.441642,
        longitude=5.469722,
        i_button="0007104552",
    )

    packet = build_tcp_avl_packet(state)

    assert int("0007104552", 16).to_bytes(8, "big") in packet
    assert int("0007104552", 10).to_bytes(8, "big") not in packet


def test_trip_io_element_is_omitted_when_profile_has_no_trip_signal() -> None:
    state = TrackerState(
        imei="352093086403655",
        timestamp_ms=1_782_290_930_000,
        latitude=51.441642,
        longitude=5.469722,
        trip=None,
    )

    assert 250 not in [identifier for identifier, _value, _size in _io_elements(state)]
