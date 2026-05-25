from __future__ import annotations

import asyncio
import json
import ssl
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Callable

from app.models import ManagerApiConfig, TrackerCustomAttributes


RequestFn = Callable[..., object]


class OpenRemoteManagerApiError(RuntimeError):
    pass


@dataclass(frozen=True)
class ManagerHistorySetupResult:
    asset_id: str
    configured_attributes: list[str]
    changed: bool
    written_attributes: list[str] = field(default_factory=list)


class OpenRemoteManagerClient:
    def __init__(self, config: ManagerApiConfig, request: RequestFn | None = None):
        self.config = config
        self._request = request or self._request

    async def configure_tracker_history(self, imei: str) -> ManagerHistorySetupResult:
        return await asyncio.to_thread(self.configure_tracker_history_sync, imei)

    async def sync_tracker_asset(
        self,
        *,
        imei: str,
        tracker_name: str | None,
        custom_attributes: TrackerCustomAttributes | None = None,
        timestamp_ms: int | None = None,
    ) -> ManagerHistorySetupResult:
        return await asyncio.to_thread(
            self.sync_tracker_asset_sync,
            imei=imei,
            tracker_name=tracker_name,
            custom_attributes=custom_attributes,
            timestamp_ms=timestamp_ms,
        )

    async def sync_tracker_datapoints(
        self,
        imei: str,
        values: dict[str, object],
        timestamp_ms: int,
    ) -> ManagerHistorySetupResult:
        return await asyncio.to_thread(self.sync_tracker_datapoints_sync, imei, values, timestamp_ms)

    def configure_tracker_history_sync(self, imei: str) -> ManagerHistorySetupResult:
        return self.sync_tracker_asset_sync(
            imei=imei,
            tracker_name=None,
            custom_attributes=TrackerCustomAttributes(),
            timestamp_ms=None,
        )

    def sync_tracker_asset_sync(
        self,
        *,
        imei: str,
        tracker_name: str | None,
        custom_attributes: TrackerCustomAttributes | None = None,
        timestamp_ms: int | None = None,
    ) -> ManagerHistorySetupResult:
        token = self._authenticate()
        asset = self._find_teltonika_asset(token, imei)
        asset_id = asset.get("id")
        if not isinstance(asset_id, str) or not asset_id:
            raise OpenRemoteManagerApiError(f"Teltonika tracker asset for IMEI {imei} has no id")

        configured_attributes, changed = self._set_store_datapoints_meta(asset)
        name_changed = self._set_tracker_asset_name(asset, tracker_name)
        custom_configured, custom_changed = self._apply_custom_attributes(
            asset,
            custom_attributes or TrackerCustomAttributes(),
        )
        changed = changed or name_changed or custom_changed
        if changed:
            self._put_json(
                self._api_url(f"asset/{urllib.parse.quote(asset_id, safe='')}"),
                token=token,
                body=asset,
            )

        return ManagerHistorySetupResult(
            asset_id=asset_id,
            configured_attributes=[*configured_attributes, *custom_configured],
            changed=changed,
        )

    def sync_tracker_datapoints_sync(
        self,
        imei: str,
        values: dict[str, object],
        timestamp_ms: int,
    ) -> ManagerHistorySetupResult:
        token = self._authenticate()
        asset = self._find_teltonika_asset(token, imei)
        asset_id = asset.get("id")
        if not isinstance(asset_id, str) or not asset_id:
            raise OpenRemoteManagerApiError(f"Teltonika tracker asset for IMEI {imei} has no id")

        configured_attributes, changed = self._set_store_datapoints_meta(asset)
        if changed:
            self._put_json(
                self._api_url(f"asset/{urllib.parse.quote(asset_id, safe='')}"),
                token=token,
                body=asset,
            )

        written_attributes = self._write_timestamped_attribute_events(
            token=token,
            asset_id=asset_id,
            asset=asset,
            values=values,
            timestamp_ms=timestamp_ms,
        )

        return ManagerHistorySetupResult(
            asset_id=asset_id,
            configured_attributes=configured_attributes,
            changed=changed,
            written_attributes=written_attributes,
        )

    def _authenticate(self) -> str:
        response = self._post_form(
            self._token_url(),
            {
                "client_id": self.config.client_id,
                "grant_type": "password",
                "username": self.config.username,
                "password": self.config.password,
            },
        )
        if not isinstance(response, dict) or not isinstance(response.get("access_token"), str):
            raise OpenRemoteManagerApiError("Manager authentication did not return an access token")
        return response["access_token"]

    def _find_teltonika_asset(self, token: str, imei: str) -> dict[str, Any]:
        query = {"types": ["TeltonikaTrackerAsset"], "limit": 1000}
        response = self._post_json(self._api_url("asset/query"), token=token, body=query)
        if not isinstance(response, list):
            raise OpenRemoteManagerApiError("Manager asset query did not return an asset list")

        for item in response:
            if not isinstance(item, dict):
                continue
            if item.get("type") != "TeltonikaTrackerAsset":
                continue
            attributes = item.get("attributes")
            if not isinstance(attributes, dict):
                continue
            imei_attribute = attributes.get("imei")
            if isinstance(imei_attribute, dict) and imei_attribute.get("value") == imei:
                return item

        raise OpenRemoteManagerApiError(f"No Teltonika tracker asset found for IMEI {imei}")

    def _set_store_datapoints_meta(self, asset: dict[str, Any]) -> tuple[list[str], bool]:
        attributes = asset.get("attributes")
        if not isinstance(attributes, dict):
            raise OpenRemoteManagerApiError("Teltonika tracker asset has no attributes")

        configured: list[str] = []
        changed_any = False
        for attribute_name in self.config.store_datapoint_attributes:
            attribute = attributes.get(attribute_name)
            if not isinstance(attribute, dict):
                continue
            meta = attribute.setdefault("meta", {})
            if not isinstance(meta, dict):
                meta = {}
                attribute["meta"] = meta
            changed = meta.get("storeDataPoints") is not True
            meta["storeDataPoints"] = True
            if self.config.data_points_max_age_days is not None:
                changed = changed or meta.get("dataPointsMaxAgeDays") != self.config.data_points_max_age_days
                meta["dataPointsMaxAgeDays"] = self.config.data_points_max_age_days
            configured.append(attribute_name)
            changed_any = changed_any or changed

        return configured, changed_any

    @staticmethod
    def _set_tracker_asset_name(asset: dict[str, Any], tracker_name: str | None) -> bool:
        if not tracker_name:
            return False
        if asset.get("name") == tracker_name:
            return False
        asset["name"] = tracker_name
        return True

    def _apply_custom_attributes(
        self,
        asset: dict[str, Any],
        custom_attributes: TrackerCustomAttributes,
    ) -> tuple[list[str], bool]:
        attributes = asset.get("attributes")
        if not isinstance(attributes, dict):
            raise OpenRemoteManagerApiError("Teltonika tracker asset has no attributes")

        configured: list[str] = []
        changed_any = False
        for attribute_name, value in custom_attributes.enabled_manager_values().items():
            attribute = attributes.get(attribute_name)
            if not isinstance(attribute, dict):
                attribute = {}
                attributes[attribute_name] = attribute
                changed_any = True

            changed_any = self._set_attribute_field(attribute, "name", attribute_name) or changed_any
            changed_any = self._set_attribute_field(attribute, "type", "text") or changed_any
            changed_any = self._set_attribute_field(attribute, "value", value) or changed_any

            meta = attribute.setdefault("meta", {})
            if not isinstance(meta, dict):
                meta = {}
                attribute["meta"] = meta
                changed_any = True
            changed = meta.get("storeDataPoints") is not True
            meta["storeDataPoints"] = True
            if self.config.data_points_max_age_days is not None:
                changed = changed or meta.get("dataPointsMaxAgeDays") != self.config.data_points_max_age_days
                meta["dataPointsMaxAgeDays"] = self.config.data_points_max_age_days
            configured.append(attribute_name)
            changed_any = changed_any or changed

        return configured, changed_any

    @staticmethod
    def _set_attribute_field(attribute: dict[str, Any], field_name: str, value: object) -> bool:
        if attribute.get(field_name) == value:
            return False
        attribute[field_name] = value
        return True

    def _write_timestamped_attribute_events(
        self,
        *,
        token: str,
        asset_id: str,
        asset: dict[str, Any],
        values: dict[str, object],
        timestamp_ms: int,
    ) -> list[str]:
        attributes = asset.get("attributes")
        if not isinstance(attributes, dict):
            raise OpenRemoteManagerApiError("Teltonika tracker asset has no attributes")

        events: list[dict[str, object]] = []
        written_attributes: list[str] = []
        for attribute_name in self.config.store_datapoint_attributes:
            if attribute_name not in values or attribute_name not in attributes:
                continue
            events.append(
                {
                    "eventType": "attribute",
                    "ref": {"id": asset_id, "name": attribute_name},
                    "value": values[attribute_name],
                    "timestamp": timestamp_ms,
                }
            )
            written_attributes.append(attribute_name)

        if events:
            response = self._put_json(self._api_url("asset/attributes/timestamp"), token=token, body=events)
            self._validate_attribute_write_results(response, written_attributes)

        return written_attributes

    @staticmethod
    def _validate_attribute_write_results(response: object, requested_attributes: list[str]) -> None:
        if not isinstance(response, list):
            raise OpenRemoteManagerApiError("Manager timestamped attribute write did not return a result list")
        if len(response) != len(requested_attributes):
            raise OpenRemoteManagerApiError(
                "Manager timestamped attribute write returned "
                f"{len(response)} results for {len(requested_attributes)} attributes"
            )

        failures: list[str] = []
        for index, result in enumerate(response):
            attribute_name = requested_attributes[index]
            failure = "UNKNOWN"
            if isinstance(result, dict):
                ref = result.get("ref")
                if isinstance(ref, dict) and isinstance(ref.get("name"), str):
                    attribute_name = ref["name"]
                if result.get("success") is False:
                    failure = str(result.get("failure") or "UNKNOWN")
                elif result.get("failure"):
                    failure = str(result["failure"])
                else:
                    continue
            failures.append(f"{attribute_name}: {failure}")

        if failures:
            raise OpenRemoteManagerApiError(
                "Manager timestamped attribute write failed for " + ", ".join(failures)
            )

    def _token_url(self) -> str:
        realm = urllib.parse.quote(self.config.realm.strip("/"), safe="")
        return f"{self._base_url()}/auth/realms/{realm}/protocol/openid-connect/token"

    def _api_url(self, path: str) -> str:
        realm = urllib.parse.quote(self.config.realm.strip("/"), safe="")
        return f"{self._base_url()}/api/{realm}/{path.lstrip('/')}"

    def _base_url(self) -> str:
        return self.config.base_url.rstrip("/")

    def _post_form(self, url: str, form_body: dict[str, str]) -> object:
        return self._request("POST", url, form_body=form_body)

    def _post_json(self, url: str, *, token: str, body: object) -> object:
        return self._request("POST", url, headers=self._auth_headers(token), json_body=body)

    def _put_json(self, url: str, *, token: str, body: object) -> object:
        return self._request("PUT", url, headers=self._auth_headers(token), json_body=body)

    @staticmethod
    def _auth_headers(token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    def _request(
        self,
        method: str,
        url: str,
        *,
        headers: dict[str, str] | None = None,
        json_body: object | None = None,
        form_body: dict[str, str] | None = None,
    ) -> object:
        request_headers = dict(headers or {})
        data: bytes | None = None
        if json_body is not None:
            data = json.dumps(json_body).encode("utf-8")
            request_headers["Content-Type"] = "application/json"
        elif form_body is not None:
            data = urllib.parse.urlencode(form_body).encode("utf-8")
            request_headers["Content-Type"] = "application/x-www-form-urlencoded"

        request = urllib.request.Request(url, data=data, headers=request_headers, method=method)
        context = None if self.config.verify_tls else ssl._create_unverified_context()
        try:
            with urllib.request.urlopen(request, timeout=10, context=context) as response:
                response_body = response.read()
        except urllib.error.HTTPError as exc:
            message = exc.read().decode("utf-8", errors="replace")
            raise OpenRemoteManagerApiError(f"Manager API returned HTTP {exc.code}: {message}") from exc
        except urllib.error.URLError as exc:
            raise OpenRemoteManagerApiError(f"Manager API request failed: {exc.reason}") from exc

        if not response_body:
            return None
        try:
            return json.loads(response_body.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise OpenRemoteManagerApiError("Manager API returned invalid JSON") from exc
