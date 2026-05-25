from __future__ import annotations

import pytest

from app.manager_api import OpenRemoteManagerApiError, OpenRemoteManagerClient
from app.models import ManagerApiConfig, TrackerCustomAttributes


class FakeOpenRemoteTransport:
    def __init__(self, assets: list[dict]):
        self.assets = assets
        self.requests: list[dict] = []
        self.updated_asset: dict | None = None

    def __call__(
        self,
        method: str,
        url: str,
        *,
        headers: dict[str, str] | None = None,
        json_body: object | None = None,
        form_body: dict[str, str] | None = None,
    ) -> object:
        request = {
            "method": method,
            "url": url,
            "headers": headers or {},
            "json_body": json_body,
            "form_body": form_body,
        }
        self.requests.append(request)

        if url.endswith("/auth/realms/master/protocol/openid-connect/token"):
            assert method == "POST"
            assert form_body == {
                "client_id": "openremote",
                "grant_type": "password",
                "username": "admin",
                "password": "secret",
            }
            return {"access_token": "fake-token"}

        if url.endswith("/api/master/asset/query"):
            assert method == "POST"
            assert request["headers"]["Authorization"] == "Bearer fake-token"
            return self.assets

        if url.endswith("/api/master/asset/teltonika-asset-1"):
            assert method == "PUT"
            assert request["headers"]["Authorization"] == "Bearer fake-token"
            assert isinstance(json_body, dict)
            self.updated_asset = json_body
            return json_body

        if url.endswith("/api/master/asset/attributes/timestamp"):
            assert method == "PUT"
            assert request["headers"]["Authorization"] == "Bearer fake-token"
            assert isinstance(json_body, list)
            return [
                {
                    "ref": event["ref"],
                }
                for event in json_body
            ]

        raise AssertionError(f"unexpected request: {method} {url}")


def test_configure_tracker_history_sets_store_datapoints_meta() -> None:
    asset = {
        "id": "teltonika-asset-1",
        "type": "TeltonikaTrackerAsset",
        "attributes": {
            "imei": {"value": "352093086403655"},
            "location": {
                "type": "GEO_JSON_POINT",
                "value": {"type": "Point", "coordinates": [5.469722, 51.441642]},
            },
            "speed": {"value": 31, "meta": {"readOnly": True}},
            "batteryLevel": {"value": 93},
            "notes": {"value": ""},
        },
    }
    transport = FakeOpenRemoteTransport([asset])
    client = OpenRemoteManagerClient(
        ManagerApiConfig(
            base_url="https://localhost/",
            store_datapoint_attributes=["location", "speed", "batteryLevel"],
            data_points_max_age_days=14,
        ),
        request=transport,
    )

    result = client.configure_tracker_history_sync("352093086403655")

    assert result.asset_id == "teltonika-asset-1"
    assert result.configured_attributes == ["location", "speed", "batteryLevel"]
    assert result.changed is True
    assert transport.updated_asset is not None
    attributes = transport.updated_asset["attributes"]
    assert attributes["location"]["meta"]["storeDataPoints"] is True
    assert attributes["location"]["meta"]["dataPointsMaxAgeDays"] == 14
    assert attributes["speed"]["meta"]["storeDataPoints"] is True
    assert attributes["speed"]["meta"]["readOnly"] is True
    assert attributes["batteryLevel"]["meta"]["storeDataPoints"] is True
    assert "storeDataPoints" not in attributes["notes"].get("meta", {})


def test_sync_tracker_asset_renames_and_creates_enabled_custom_attributes() -> None:
    asset = {
        "id": "teltonika-asset-1",
        "name": "Teltonika Device 352093086403655",
        "type": "TeltonikaTrackerAsset",
        "attributes": {
            "imei": {"value": "352093086403655"},
            "location": {"value": {"type": "Point", "coordinates": [5.469722, 51.441642]}, "meta": {}},
            "speed": {"value": 31, "meta": {}},
        },
    }
    transport = FakeOpenRemoteTransport([asset])
    client = OpenRemoteManagerClient(
        ManagerApiConfig(
            base_url="https://localhost/",
            store_datapoint_attributes=["location", "speed"],
            data_points_max_age_days=14,
        ),
        request=transport,
    )

    result = client.sync_tracker_asset_sync(
        imei="352093086403655",
        tracker_name="Atlas 12",
        custom_attributes=TrackerCustomAttributes(
            driver_name="Mila Janssen",
            plate="BR-482-K",
            asset_class="truck",
        ),
        timestamp_ms=1778783600000,
    )

    assert result.asset_id == "teltonika-asset-1"
    assert result.changed is True
    assert result.configured_attributes == ["location", "speed", "driverName", "plate", "assetClass"]
    assert transport.updated_asset is not None
    assert transport.updated_asset["name"] == "Atlas 12"
    attributes = transport.updated_asset["attributes"]
    assert attributes["location"]["meta"]["storeDataPoints"] is True
    assert attributes["driverName"] == {
        "name": "driverName",
        "type": "text",
        "value": "Mila Janssen",
        "meta": {"storeDataPoints": True, "dataPointsMaxAgeDays": 14},
    }
    assert "timestamp" not in attributes["driverName"]
    assert attributes["plate"]["value"] == "BR-482-K"
    assert attributes["assetClass"]["value"] == "truck"


def test_sync_tracker_asset_does_not_rewrite_custom_metadata_for_new_tracker_timestamp() -> None:
    asset = {
        "id": "teltonika-asset-1",
        "name": "Atlas 12",
        "type": "TeltonikaTrackerAsset",
        "attributes": {
            "imei": {"value": "352093086403655"},
            "location": {
                "value": {"type": "Point", "coordinates": [5.469722, 51.441642]},
                "meta": {"storeDataPoints": True, "dataPointsMaxAgeDays": 14},
            },
            "speed": {"value": 31, "meta": {"storeDataPoints": True, "dataPointsMaxAgeDays": 14}},
            "driverName": {
                "name": "driverName",
                "type": "text",
                "value": "Mila Janssen",
                "meta": {"storeDataPoints": True, "dataPointsMaxAgeDays": 14},
            },
        },
    }
    transport = FakeOpenRemoteTransport([asset])
    client = OpenRemoteManagerClient(
        ManagerApiConfig(
            base_url="https://localhost/",
            store_datapoint_attributes=["location", "speed"],
            data_points_max_age_days=14,
        ),
        request=transport,
    )

    result = client.sync_tracker_asset_sync(
        imei="352093086403655",
        tracker_name="Atlas 12",
        custom_attributes=TrackerCustomAttributes(driver_name="Mila Janssen"),
        timestamp_ms=1778783605000,
    )

    assert result.changed is False
    assert transport.updated_asset is None
    assert [request["url"] for request in transport.requests].count("https://localhost/api/master/asset/teltonika-asset-1") == 0


def test_sync_tracker_asset_leaves_disabled_custom_attributes_absent() -> None:
    asset = {
        "id": "teltonika-asset-1",
        "name": "Atlas 12",
        "type": "TeltonikaTrackerAsset",
        "attributes": {
            "imei": {"value": "352093086403655"},
            "location": {"value": {"type": "Point", "coordinates": [5.469722, 51.441642]}, "meta": {}},
        },
    }
    transport = FakeOpenRemoteTransport([asset])
    client = OpenRemoteManagerClient(
        ManagerApiConfig(base_url="https://localhost/", store_datapoint_attributes=["location"]),
        request=transport,
    )

    result = client.sync_tracker_asset_sync(
        imei="352093086403655",
        tracker_name="Atlas 12",
        custom_attributes=TrackerCustomAttributes(),
    )

    assert result.configured_attributes == ["location"]
    assert transport.updated_asset is not None
    attributes = transport.updated_asset["attributes"]
    assert "driverName" not in attributes
    assert "plate" not in attributes
    assert "assetClass" not in attributes


def test_configure_tracker_history_raises_when_teltonika_asset_is_missing() -> None:
    transport = FakeOpenRemoteTransport(
        [
            {
                "id": "other-asset",
                "type": "ThingAsset",
                "attributes": {"imei": {"value": "000000000000000"}},
            }
        ]
    )
    client = OpenRemoteManagerClient(ManagerApiConfig(base_url="https://localhost"), request=transport)

    with pytest.raises(OpenRemoteManagerApiError, match="No Teltonika tracker asset found"):
        client.configure_tracker_history_sync("352093086403655")


def test_sync_tracker_datapoints_reapplies_meta_and_writes_timestamped_events() -> None:
    asset = {
        "id": "teltonika-asset-1",
        "type": "TeltonikaTrackerAsset",
        "attributes": {
            "imei": {"value": "352093086403655"},
            "location": {"value": {"type": "Point", "coordinates": [5.469722, 51.441642]}, "meta": {}},
            "speed": {"value": 31, "meta": {}},
            "direction": {"value": 118, "meta": {}},
        },
    }
    transport = FakeOpenRemoteTransport([asset])
    client = OpenRemoteManagerClient(
        ManagerApiConfig(
            base_url="https://localhost",
            store_datapoint_attributes=["location", "speed", "direction"],
        ),
        request=transport,
    )

    result = client.sync_tracker_datapoints_sync(
        "352093086403655",
        {
            "location": {"type": "Point", "coordinates": [5.5, 51.4]},
            "speed": 28,
            "direction": 121,
            "missingAttribute": 123,
        },
        timestamp_ms=1778783600000,
    )

    assert result.configured_attributes == ["location", "speed", "direction"]
    assert result.written_attributes == ["location", "speed", "direction"]
    timestamp_request = transport.requests[-1]
    assert timestamp_request["url"].endswith("/api/master/asset/attributes/timestamp")
    assert timestamp_request["json_body"] == [
        {
            "eventType": "attribute",
            "ref": {"id": "teltonika-asset-1", "name": "location"},
            "value": {"type": "Point", "coordinates": [5.5, 51.4]},
            "timestamp": 1778783600000,
        },
        {
            "eventType": "attribute",
            "ref": {"id": "teltonika-asset-1", "name": "speed"},
            "value": 28,
            "timestamp": 1778783600000,
        },
        {
            "eventType": "attribute",
            "ref": {"id": "teltonika-asset-1", "name": "direction"},
            "value": 121,
            "timestamp": 1778783600000,
        },
    ]


def test_sync_tracker_datapoints_raises_when_manager_rejects_timestamped_write() -> None:
    asset = {
        "id": "teltonika-asset-1",
        "type": "TeltonikaTrackerAsset",
        "attributes": {
            "imei": {"value": "352093086403655"},
            "location": {"value": {"type": "Point", "coordinates": [5.469722, 51.441642]}, "meta": {}},
            "speed": {"value": 31, "meta": {}},
        },
    }

    class FailingTimestampTransport(FakeOpenRemoteTransport):
        def __call__(self, method: str, url: str, **kwargs) -> object:
            if url.endswith("/api/master/asset/attributes/timestamp"):
                json_body = kwargs.get("json_body")
                assert isinstance(json_body, list)
                return [
                    {"ref": json_body[0]["ref"]},
                    {"ref": json_body[1]["ref"], "failure": "ATTRIBUTE_NOT_FOUND"},
                ]
            return super().__call__(method, url, **kwargs)

    client = OpenRemoteManagerClient(
        ManagerApiConfig(
            base_url="https://localhost",
            store_datapoint_attributes=["location", "speed"],
        ),
        request=FailingTimestampTransport([asset]),
    )

    with pytest.raises(OpenRemoteManagerApiError, match="speed.*ATTRIBUTE_NOT_FOUND"):
        client.sync_tracker_datapoints_sync(
            "352093086403655",
            {
                "location": {"type": "Point", "coordinates": [5.5, 51.4]},
                "speed": 28,
            },
            timestamp_ms=1778783600000,
        )
