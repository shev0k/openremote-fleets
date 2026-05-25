from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app


def test_root_page_renders_web_ui(tmp_path: Path) -> None:
    client = TestClient(create_app(config_path=tmp_path / "config.yaml", autostart=False))

    response = client.get("/")

    assert response.status_code == 200
    assert "Teltonika FMC003 Emulator" in response.text
    assert "CONTROL_INTERFACE_EMULATOR" in response.text
    assert "SYSTEM STATUS" in response.text
    assert "ACTIVE TRACKERS" in response.text
    assert "ENCRYPTION" not in response.text
    assert "GLOBAL TRACKER METRICS" in response.text
    assert "CONFIGURED TRACKERS" in response.text
    assert "RUNTIME TELEMETRY LOG" in response.text
    assert "Activity Log" in response.text
    assert 'id="event-count"' in response.text
    assert 'MANAGER TARGET: <strong class="status-box idle">YAML CONFIG</strong>' in response.text
    assert 'MODE: <strong class="status-box idle">LOCAL WEB UI</strong>' in response.text
    assert 'CONFIG: <strong class="status-box idle">YAML</strong>' in response.text
    assert "DEPLOY TRACKER" in response.text
    assert "Route preset" in response.text
    assert 'id="route-preset-hint"' in response.text
    assert 'id="scenario-hint"' in response.text
    assert 'class="info-tooltip"' in response.text
    assert 'aria-label="Scenario information"' in response.text
    assert 'aria-label="Route preset information"' in response.text
    assert 'id="manual-speed-field"' in response.text
    assert "Optional Fleets attributes" in response.text
    assert 'id="custom-attributes-hint"' in response.text
    assert 'id="custom-attributes-trigger"' in response.text
    assert 'id="custom-attributes-menu"' in response.text
    assert 'data-custom-summary' in response.text
    assert 'id="custom-attribute-fields"' in response.text
    assert 'class="attribute-marker"' in response.text
    assert "Manager metadata" not in response.text
    assert 'name="custom_driver_name_enabled"' in response.text
    assert 'name="custom_plate_enabled"' in response.text
    assert 'name="custom_asset_class_enabled"' in response.text
    assert 'name="custom_driver_name"' in response.text
    assert 'name="custom_plate"' in response.text
    assert 'name="custom_asset_class"' in response.text
    assert 'id="deploy-presets"' in response.text
    assert "DEPLOY ALL PRESETS" in response.text
    assert 'id="imei-validation"' in response.text
    assert "atlas_eindhoven" in response.text
    assert 'id="fixed-location-fields"' in response.text
    assert 'hidden' in response.text
    assert "Live operations" in response.text
    assert '<link rel="icon" type="image/png" href="/static/favicon.png" />' in response.text
    assert 'id="tracker-count"' in response.text


def test_favicon_is_served_from_static_assets(tmp_path: Path) -> None:
    client = TestClient(create_app(config_path=tmp_path / "config.yaml", autostart=False))

    response = client.get("/static/favicon.png")

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.content.startswith(b"\x89PNG\r\n\x1a\n")


def test_static_css_uses_neutral_action_treatment(tmp_path: Path) -> None:
    client = TestClient(create_app(config_path=tmp_path / "config.yaml", autostart=False))

    response = client.get("/static/styles.css")

    assert response.status_code == 200
    assert "#ff7a1a" not in response.text.lower()
    assert "--orange" not in response.text.lower()
    assert "width: min(1180px" not in response.text
    assert "button.action" in response.text
    assert "background: var(--white)" in response.text
    assert ".sync-stamp span" in response.text
    assert "height: 28px" in response.text
    assert "width: 28px" in response.text
    assert ".console-surface" in response.text
    assert ".console-toolbar" in response.text
    assert ".label-with-info" in response.text
    assert ".info-tooltip::after" in response.text
    assert "content: attr(data-tooltip)" in response.text
    assert ".field-error" in response.text
    assert ".is-invalid" in response.text
    assert "html,\r\nbody" in response.text or "html,\nbody" in response.text
    assert "height: 100%" in response.text
    assert "overflow: hidden" in response.text
    assert ".optional-attributes" in response.text
    assert ".custom-attribute-trigger" in response.text
    assert ".custom-attribute-menu" in response.text
    assert ".custom-attribute-option" in response.text
    assert ".attribute-marker" in response.text
    assert '.custom-attribute-option input[type="checkbox"]' in response.text
    assert "align-items: stretch" in response.text
    assert "height: 100dvh" in response.text
    assert "align-self: stretch" in response.text
    assert "grid-template-rows: auto minmax(0, 1fr)" in response.text
    assert "overflow-y: auto" in response.text
    assert "[hidden]" in response.text
    assert "display: none !important" in response.text
    assert "button.danger" in response.text
    assert ".button-icon" in response.text
    assert "@media (min-width: 821px)" in response.text
    assert "width: 42px" in response.text
    assert "row-gap: 3px" in response.text
    assert "grid-column: 2" in response.text
    assert "grid-row: 1 / span 2" in response.text
    assert ".form-panel .panel-heading" in response.text
    assert "justify-content: space-between" in response.text


def test_static_css_constrains_tracker_table_without_hiding_lower_cards(tmp_path: Path) -> None:
    client = TestClient(create_app(config_path=tmp_path / "config.yaml", autostart=False))

    response = client.get("/static/styles.css")

    assert response.status_code == 200
    assert "grid-template-rows: auto auto auto minmax(260px, 1fr)" in response.text
    assert "max-height: clamp(150px, 42dvh, 360px)" in response.text
    assert "grid-template-rows: auto auto minmax(160px, 1fr) minmax(260px, 0.82fr)" not in response.text
    assert "height: 100vh" in response.text
    assert "height: 100dvh" in response.text
    assert "min-height: 760px" in response.text
    assert "min-block-size: min(760px, 100dvh)" not in response.text
    assert "overflow: hidden" in response.text
    assert "overflow-x: hidden" in response.text
    assert "overflow-y: auto" in response.text
    assert "overscroll-behavior: contain" in response.text
    assert "@media (max-height: 720px) and (min-width: 821px)" not in response.text
    assert "@media (max-width: 820px)" in response.text
    assert "max-height: none" in response.text
    assert "body {" in response.text


def test_static_js_renders_mobile_friendly_tracker_cells(tmp_path: Path) -> None:
    client = TestClient(create_app(config_path=tmp_path / "config.yaml", autostart=False))

    response = client.get("/static/app.js")

    assert response.status_code == 200
    assert 'data-label="Name"' in response.text
    assert 'data-label="Last data"' in response.text
    assert "row-action-group" in response.text
    assert 'const toggleAction = tracker.running ? "stop" : "start"' in response.text
    assert 'const toggleIcon = tracker.running ? "icon-stop" : "icon-start"' in response.text
    assert "button-icon icon-remove" in response.text
    assert 'data-action="delete"' in response.text
    assert 'class="ghost danger" data-action="delete"' in response.text
    assert "Remove tracker" in response.text
    assert "updateFixedLocationVisibility" in response.text
    assert "fixedLocationFields.hidden = !isFixedLocation" in response.text
    assert "manualSpeedField.hidden = !isFixedLocation" in response.text
    assert 'if ("speed" in values)' in response.text
    assert "delete values.speed" in response.text
    assert "scenarioHints" in response.text
    assert "routePresetHints" in response.text
    assert "routePresetHint.dataset.tooltip" in response.text
    assert "scenarioHint.dataset.tooltip" in response.text
    assert "presetDefaults" in response.text
    assert "customAttributeSuggestions" in response.text
    assert "custom_attributes" in response.text
    assert "syncCustomAttributeFields" in response.text
    assert "customAttributeSummary.textContent" in response.text
    assert "setCustomAttributeMenuOpen" in response.text
    assert "customAttributeTrigger?.addEventListener" in response.text
    assert "validateImei" in response.text
    assert "nextAvailableImei" in response.text
    assert "deploy-presets" in response.text
    assert "deployPresetsButton.addEventListener" in response.text
    assert "Full road route with dynamic speed" in response.text
    assert 'routePresetSelect.addEventListener("change"' in response.text


def test_static_js_drives_header_status_from_tracker_state(tmp_path: Path) -> None:
    client = TestClient(create_app(config_path=tmp_path / "config.yaml", autostart=False))

    response = client.get("/static/app.js")

    assert response.status_code == 200
    assert "systemStatus.textContent" in response.text
    assert "headerActiveCount.textContent" in response.text
    assert "activeMeter.style.width" in response.text
    assert "primaryTransport.textContent" in response.text
    assert "transportDetail.textContent" in response.text
    assert "eventCount.textContent" in response.text
    assert "`> [${formatUserLocaleTimestamp(entry.timestampIso)}]" in response.text
    assert "maxVisibleEvents" in response.text
    assert "CONNECTED" in response.text
    assert "RUNNING" in response.text
    assert "OFFLINE" in response.text
    assert "READY" in response.text
    assert "isSendingTracker" in response.text


def test_static_js_formats_operator_times_with_browser_locale(tmp_path: Path) -> None:
    client = TestClient(create_app(config_path=tmp_path / "config.yaml", autostart=False))

    response = client.get("/static/app.js")

    assert response.status_code == 200
    assert "getUserLocaleSettings" in response.text
    assert "navigator.languages" in response.text
    assert "Intl.DateTimeFormat" in response.text
    assert "resolvedOptions().timeZone" in response.text
    assert 'timeZoneName: "short"' in response.text
    assert "formatUserLocaleTimestamp" in response.text
    assert "lastSync.textContent = formatUserLocaleTimestamp" in response.text
    assert "renderEvents();" in response.text
    assert "`> [${formatUserLocaleTimestamp(entry.timestampIso)}]" in response.text
    assert "eventEntries" in response.text
    assert "timestampIso: new Date().toISOString()" in response.text
    assert "formatUtcTimestamp" not in response.text
    assert "toLocaleTimeString" not in response.text


def test_api_exposes_config_and_tracker_crud(tmp_path: Path) -> None:
    config_path = tmp_path / "config.yaml"
    client = TestClient(create_app(config_path=config_path, autostart=False))

    response = client.get("/api/config")
    assert response.status_code == 200
    assert response.json()["manager"]["tcp"]["host"] == "127.0.0.1"

    create_response = client.post(
        "/api/trackers",
        json={
            "imei": "352094085231700",
            "name": "Atlas",
            "speed": 28,
            "route_preset": "atlas_eindhoven",
            "custom_attributes": {
                "driver_name": "Mila Janssen",
                "plate": "BR-482-K",
                "asset_class": "truck",
            },
            "latitude": 51.441642,
            "longitude": 5.469722,
        },
    )

    assert create_response.status_code == 201
    assert create_response.json()["imei"] == "352094085231700"
    assert create_response.json()["route_preset"] == "atlas_eindhoven"
    assert create_response.json()["custom_attributes"] == {
        "driver_name": "Mila Janssen",
        "plate": "BR-482-K",
        "asset_class": "truck",
    }

    status = client.get("/api/status").json()
    assert any(tracker["imei"] == "352094085231700" and tracker["running"] is False for tracker in status["trackers"])
    config = client.get("/api/config").json()
    created_config = next(tracker for tracker in config["trackers"] if tracker["imei"] == "352094085231700")
    assert created_config["custom_attributes"]["driver_name"] == "Mila Janssen"

    delete_response = client.delete("/api/trackers/352094085231700")

    assert delete_response.status_code == 204
    status = client.get("/api/status").json()
    assert all(tracker["imei"] != "352094085231700" for tracker in status["trackers"])


def test_api_rejects_tracker_update_to_existing_imei(tmp_path: Path) -> None:
    config_path = tmp_path / "config.yaml"
    client = TestClient(create_app(config_path=config_path, autostart=False))
    client.put("/api/config", json={"trackers": []})
    first = {
        "imei": "352094085231700",
        "name": "Atlas",
        "route_preset": "atlas_eindhoven",
    }
    second = {
        "imei": "352094085231701",
        "name": "Harbor",
        "route_preset": "harbor_eindhoven",
    }
    client.post("/api/trackers", json=first)
    client.post("/api/trackers", json=second)

    response = client.patch("/api/trackers/352094085231700", json={**first, "imei": second["imei"]})

    assert response.status_code == 409
    config = client.get("/api/config").json()
    assert [tracker["imei"] for tracker in config["trackers"]] == [first["imei"], second["imei"]]


def test_api_deploys_all_route_presets_once_with_unique_names_and_imeis(tmp_path: Path) -> None:
    client = TestClient(create_app(config_path=tmp_path / "config.yaml", autostart=False))
    client.put("/api/config", json={"trackers": []})

    response = client.post("/api/trackers/deploy-presets")

    assert response.status_code == 201
    payload = response.json()
    assert payload["created_count"] == 5
    created = payload["created"]
    assert [tracker["name"] for tracker in created] == ["Atlas 12", "Harbor 07", "Delta 24", "Nimbus 03", "Courier 19"]
    assert [tracker["route_preset"] for tracker in created] == [
        "atlas_eindhoven",
        "harbor_eindhoven",
        "delta_eindhoven",
        "nimbus_eindhoven",
        "courier_eindhoven",
    ]
    assert [tracker["imei"] for tracker in created] == [
        "352093086403655",
        "352094085231592",
        "352094085231600",
        "352094085231618",
        "352094085231626",
    ]
    assert [tracker["scenario"] for tracker in created] == ["moving", "moving", "moving", "moving", "moving"]
    assert [tracker["route_progress"] for tracker in created] == [0.18, 0.42, 0.3, 0.24, 0.12]

    second_response = client.post("/api/trackers/deploy-presets")

    assert second_response.status_code == 201
    assert second_response.json()["created_count"] == 0
    config = client.get("/api/config").json()
    assert len(config["trackers"]) == 5


def test_offline_tracker_status_stays_offline_not_connected(tmp_path: Path) -> None:
    with TestClient(create_app(config_path=tmp_path / "config.yaml", autostart=False)) as client:
        client.post(
            "/api/trackers",
            json={
                "imei": "352094085231701",
                "name": "Offline FMC003",
                "scenario": "offline",
            },
        )

        start_response = client.post("/api/trackers/352094085231701/start")
        status = client.get("/api/status").json()

        assert start_response.status_code == 200
        tracker = next(item for item in status["trackers"] if item["imei"] == "352094085231701")
        assert tracker["running"] is True
        assert tracker["connected"] is False
        assert tracker["scenario"] == "offline"


def test_api_rejects_invalid_imei(tmp_path: Path) -> None:
    client = TestClient(create_app(config_path=tmp_path / "config.yaml", autostart=False))

    response = client.post("/api/trackers", json={"imei": "bad", "name": "Invalid"})

    assert response.status_code == 422
