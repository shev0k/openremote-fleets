const table = document.querySelector("#tracker-table");
const events = document.querySelector("#events");
const form = document.querySelector("#tracker-form");
const nameInput = form.querySelector('input[name="name"]');
const imeiInput = form.querySelector('input[name="imei"]');
const submitButton = form.querySelector('button[type="submit"]');
const deployPresetsButton = document.querySelector("#deploy-presets");
const imeiValidation = document.querySelector("#imei-validation");
const routePresetSelect = form.querySelector('select[name="route_preset"]');
const scenarioSelect = form.querySelector('select[name="scenario"]');
const fixedLocationFields = document.querySelector("#fixed-location-fields");
const manualSpeedField = document.querySelector("#manual-speed-field");
const routePresetHint = document.querySelector("#route-preset-hint");
const scenarioHint = document.querySelector("#scenario-hint");
const customAttributeRoot = form.querySelector("[data-custom-attribute-root]");
const customAttributeTrigger = form.querySelector("#custom-attributes-trigger");
const customAttributeMenu = form.querySelector("#custom-attributes-menu");
const customAttributeSummary = form.querySelector("[data-custom-summary]");
const customAttributeFields = form.querySelector("#custom-attribute-fields");
const customAttributeToggles = form.querySelectorAll("[data-custom-toggle]");
const trackerCount = document.querySelector("#tracker-count");
const runningCount = document.querySelector("#running-count");
const lastSync = document.querySelector("#last-sync");
const systemStatus = document.querySelector("#system-status");
const headerActiveCount = document.querySelector("#header-active-count");
const activeMeter = document.querySelector("#active-meter");
const activeRatio = document.querySelector("#active-ratio");
const primaryTransport = document.querySelector("#primary-transport");
const transportDetail = document.querySelector("#transport-detail");
const eventCount = document.querySelector("#event-count");
const maxVisibleEvents = 200;
let eventTotal = 0;
let eventEntries = [];
let deployedImeis = new Set();

const presetDefaults = {
  atlas_eindhoven: { name: "Atlas 12", imei: "352093086403655", scenario: "moving" },
  harbor_eindhoven: { name: "Harbor 07", imei: "352094085231592", scenario: "moving" },
  delta_eindhoven: { name: "Delta 24", imei: "352094085231600", scenario: "moving" },
  nimbus_eindhoven: { name: "Nimbus 03", imei: "352094085231618", scenario: "moving" },
  courier_eindhoven: { name: "Courier 19", imei: "352094085231626", scenario: "moving" },
};

const customAttributeSuggestions = {
  atlas_eindhoven: { driver_name: "Mila Janssen", plate: "BR-482-K", asset_class: "truck" },
  harbor_eindhoven: { driver_name: "Sven Vermeer", plate: "VT-903-P", asset_class: "van" },
  delta_eindhoven: { driver_name: "Noah de Wit", plate: "NS-118-X", asset_class: "truck" },
  nimbus_eindhoven: { driver_name: "Lotte Bakker", plate: "PX-557-D", asset_class: "van" },
  courier_eindhoven: { driver_name: "Iris Smeets", plate: "KF-220-M", asset_class: "car" },
};

const customAttributeControls = {
  driver_name: {
    toggle: form.querySelector('[data-custom-toggle="driver_name"]'),
    field: form.querySelector('[data-custom-field="driver_name"]'),
    input: form.querySelector('[name="custom_driver_name"]'),
    label: "Driver name",
    payloadName: "driver_name",
  },
  plate: {
    toggle: form.querySelector('[data-custom-toggle="plate"]'),
    field: form.querySelector('[data-custom-field="plate"]'),
    input: form.querySelector('[name="custom_plate"]'),
    label: "Plate",
    payloadName: "plate",
  },
  asset_class: {
    toggle: form.querySelector('[data-custom-toggle="asset_class"]'),
    field: form.querySelector('[data-custom-field="asset_class"]'),
    input: form.querySelector('[name="custom_asset_class"]'),
    label: "Asset class",
    payloadName: "asset_class",
  },
};

const routePresetHints = {
  atlas_eindhoven: "Full road route with dynamic speed, a short stop, an idle period, and engine-off telemetry.",
  harbor_eindhoven: "Urban route without trip telemetry, forcing Fleets fallback segmentation through a break and a short stop.",
  delta_eindhoven: "Faster route with a moving degraded-signal window and a short operational stop.",
  nimbus_eindhoven: "Intermittent tracker route with an early offline gap and later engine-off telemetry.",
  courier_eindhoven: "Delivery-style route without trip telemetry, including idle, driver break, and a late offline gap.",
};

const scenarioHints = {
  moving: "Follows the selected route preset with dynamic speed and scheduled validation phases.",
  parked: "Sends stationary ignition-on telemetry at the selected location or route start.",
  offline: "Sends one terminal snapshot so Manager creates the asset, then remains offline.",
  low_battery: "Follows the route preset while lowering battery, voltage, and speed values.",
  weak_gnss: "Follows the route preset while reducing satellites, GSM signal, and GNSS quality.",
  overspeed: "Follows the route preset but raises moving-phase speed and priority values.",
};

function nextAvailableImei(preferredImei = "352094085231700") {
  let candidate = Number(preferredImei);
  while (deployedImeis.has(String(candidate))) {
    candidate += 1;
  }
  return String(candidate);
}

function validateImei() {
  const imei = imeiInput.value.trim();
  const duplicate = imei.length === 15 && deployedImeis.has(imei);
  imeiInput.classList.toggle("is-invalid", duplicate);
  imeiInput.setAttribute("aria-invalid", duplicate ? "true" : "false");
  imeiValidation.hidden = !duplicate;
  submitButton.disabled = duplicate;
  return !duplicate;
}

function applyPresetDefaults({ resetImei = false } = {}) {
  const defaults = presetDefaults[routePresetSelect.value];
  if (defaults) {
    nameInput.value = defaults.name;
    scenarioSelect.value = defaults.scenario;
    if (resetImei || !imeiInput.value.trim() || deployedImeis.has(imeiInput.value.trim())) {
      imeiInput.value = nextAvailableImei(defaults.imei);
    }
  } else {
    nameInput.value = "Local FMC003";
    if (resetImei || !imeiInput.value.trim() || deployedImeis.has(imeiInput.value.trim())) {
      imeiInput.value = nextAvailableImei();
    }
  }
  updateScenarioHint();
  syncCustomAttributeFields({ applySuggestions: true });
  validateImei();
}

function updateFixedLocationVisibility() {
  const isFixedLocation = !routePresetSelect.value;
  fixedLocationFields.hidden = !isFixedLocation;
  fixedLocationFields.querySelectorAll("input").forEach((input) => {
    input.disabled = !isFixedLocation;
  });
  manualSpeedField.hidden = !isFixedLocation;
  manualSpeedField.querySelectorAll("input").forEach((input) => {
    input.disabled = !isFixedLocation;
  });
  const hint = isFixedLocation
    ? "Fixed mode uses manual latitude, longitude, and speed."
    : routePresetHints[routePresetSelect.value] || "Preset routes use their own dynamic road-speed profile.";
  routePresetHint.dataset.tooltip = hint;
}

function updateScenarioHint() {
  scenarioHint.dataset.tooltip = scenarioHints[scenarioSelect.value] || "";
}

function syncCustomAttributeFields({ applySuggestions = false } = {}) {
  const suggestions = customAttributeSuggestions[routePresetSelect.value] || {};
  const enabledLabels = [];
  Object.entries(customAttributeControls).forEach(([key, control]) => {
    const enabled = Boolean(control.toggle?.checked);
    if (enabled) {
      enabledLabels.push(control.label);
    }
    control.toggle?.closest(".custom-attribute-option")?.setAttribute("aria-selected", enabled ? "true" : "false");
    if (control.field) {
      control.field.hidden = !enabled;
    }
    if (control.input) {
      control.input.disabled = !enabled;
      const suggestion = suggestions[key];
      if (typeof suggestion === "string") {
        control.input.placeholder = suggestion;
        if (applySuggestions && enabled && !control.input.value.trim()) {
          control.input.value = suggestion;
        }
      }
    }
  });
  if (customAttributeFields) {
    customAttributeFields.hidden = enabledLabels.length === 0;
  }
  if (customAttributeSummary) {
    customAttributeSummary.textContent = enabledLabels.length === 0 ? "None" : enabledLabels.join(", ");
  }
}

function setCustomAttributeMenuOpen(open) {
  if (!customAttributeMenu || !customAttributeTrigger) {
    return;
  }
  customAttributeMenu.hidden = !open;
  customAttributeTrigger.setAttribute("aria-expanded", open ? "true" : "false");
}

function buildCustomAttributesPayload() {
  return Object.values(customAttributeControls).reduce((payload, control) => {
    if (!control.toggle?.checked || !control.input) {
      return payload;
    }

    const value = control.input.value.trim();
    if (value) {
      payload[control.payloadName] = value;
    }
    return payload;
  }, {});
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[character]));
}

function getUserLocaleSettings() {
  const locales = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language || "en-US"];
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  return { locales, timeZone };
}

function formatUserLocaleTimestamp(value = new Date()) {
  const timestamp = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(timestamp.getTime())) {
    return "--";
  }
  const { locales, timeZone } = getUserLocaleSettings();
  return new Intl.DateTimeFormat(locales, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(timestamp);
}

function renderEvents() {
  events.textContent = eventEntries
    .map((entry) => `> [${formatUserLocaleTimestamp(entry.timestampIso)}] ${entry.message}`)
    .join("\n");
}

function isOfflineTracker(tracker) {
  return tracker.scenario === "offline";
}

function isSendingTracker(tracker) {
  return tracker.running && !isOfflineTracker(tracker);
}

function getTrackerStatus(tracker) {
  if (tracker.last_error) {
    return { className: "off", text: "error" };
  }
  if (tracker.running && isOfflineTracker(tracker)) {
    return { className: "off", text: "offline" };
  }
  if (tracker.connected) {
    return { className: "on", text: "connected" };
  }
  if (tracker.running) {
    return { className: "pending", text: "connecting" };
  }
  return { className: "off", text: "stopped" };
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${body}`);
  }
  return response.status === 204 ? null : response.json();
}

function renderStatus(data) {
  deployedImeis = new Set(data.trackers.map((tracker) => tracker.imei));
  const totalTrackers = data.trackers.length;
  const runningTrackers = data.trackers.filter(isSendingTracker).length;
  const offlineTrackers = data.trackers.filter((tracker) => tracker.running && isOfflineTracker(tracker)).length;
  const connectedTrackers = data.trackers.filter((tracker) => tracker.connected).length;
  const erroredTrackers = data.trackers.filter((tracker) => tracker.last_error).length;
  const tcpTrackers = data.trackers.filter((tracker) => tracker.transport === "tcp").length;
  const mqttTrackers = data.trackers.filter((tracker) => tracker.transport === "mqtt").length;
  const activePercent = totalTrackers === 0 ? 0 : Math.round((runningTrackers / totalTrackers) * 100);

  trackerCount.textContent = String(totalTrackers);
  runningCount.textContent = String(runningTrackers);
  lastSync.textContent = formatUserLocaleTimestamp();
  headerActiveCount.textContent = `${runningTrackers}/${totalTrackers}`;
  headerActiveCount.className = `status-box ${runningTrackers > 0 ? "on" : "idle"}`;
  activeMeter.style.width = `${activePercent}%`;
  activeRatio.textContent = `${activePercent}% active`;
  transportDetail.textContent = `${tcpTrackers} TCP / ${mqttTrackers} MQTT`;

  if (tcpTrackers > 0 && mqttTrackers > 0) {
    primaryTransport.textContent = "MIXED";
  } else if (mqttTrackers > 0) {
    primaryTransport.textContent = "MQTT JSON";
  } else if (tcpTrackers > 0) {
    primaryTransport.textContent = "TCP CODEC 8";
  } else {
    primaryTransport.textContent = "NONE";
  }

  if (erroredTrackers > 0) {
    systemStatus.textContent = "ERROR";
    systemStatus.className = "status-box off";
  } else if (connectedTrackers > 0) {
    systemStatus.textContent = "CONNECTED";
    systemStatus.className = "status-box on";
  } else if (runningTrackers > 0) {
    systemStatus.textContent = "RUNNING";
    systemStatus.className = "status-box on";
  } else if (offlineTrackers > 0) {
    systemStatus.textContent = "OFFLINE";
    systemStatus.className = "status-box off";
  } else {
    systemStatus.textContent = "READY";
    systemStatus.className = "status-box idle";
  }

  table.innerHTML = data.trackers.map((tracker) => {
    const status = getTrackerStatus(tracker);
    const name = escapeHtml(tracker.name);
    const imei = escapeHtml(tracker.imei);
    const transport = escapeHtml(tracker.transport.toUpperCase());
    const scenario = escapeHtml(tracker.scenario.toUpperCase());
    const error = tracker.last_error ? `<br><span class="status-error">${escapeHtml(tracker.last_error)}</span>` : "";
    const position = tracker.latitude === null ? "<span class=\"muted\">No fix yet</span>" : `${tracker.latitude}, ${tracker.longitude}`;
    const speed = tracker.speed === null ? "--" : tracker.speed;
    const speedLabel = tracker.running && isOfflineTracker(tracker) && tracker.last_message_at ? "offline snapshot" : `${speed} km/h`;
    const lastDataMeta = tracker.last_message_at ? `${speedLabel} | ${formatUserLocaleTimestamp(tracker.last_message_at)}` : speedLabel;
    const toggleAction = tracker.running ? "stop" : "start";
    const toggleLabel = tracker.running ? "Stop" : "Start";
    const toggleIcon = tracker.running ? "icon-stop" : "icon-start";
    return `
      <tr>
        <td data-label="Name">${name}</td>
        <td data-label="IMEI" class="mono">${imei}</td>
        <td data-label="Transport" class="mono">${transport}</td>
        <td data-label="Scenario" class="mono">${scenario}</td>
        <td data-label="Status"><span class="status-pill ${status.className}">${status.text}</span>${error}</td>
        <td data-label="Last data" class="last-data">${position}<br><span class="muted">${lastDataMeta}</span></td>
        <td class="row-actions">
          <div class="row-action-group">
            <button type="button" data-action="${toggleAction}" data-imei="${imei}" aria-label="${toggleLabel} ${name}" title="${toggleLabel}">
              <span class="button-icon ${toggleIcon}" aria-hidden="true"></span>
              <span class="button-label">${toggleLabel}</span>
            </button>
            <button type="button" class="ghost danger" data-action="delete" data-imei="${imei}" data-name="${name}" aria-label="Remove ${name}" title="Remove">
              <span class="button-icon icon-remove" aria-hidden="true"></span>
              <span class="button-label">Remove</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
  validateImei();
  renderEvents();
}

async function refresh() {
  renderStatus(await request("/api/status"));
}

table.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  if (button.dataset.action === "delete") {
    const confirmed = confirm(`Remove tracker ${button.dataset.name || button.dataset.imei}?`);
    if (!confirmed) return;
    await request(`/api/trackers/${button.dataset.imei}`, { method: "DELETE" });
  } else {
    await request(`/api/trackers/${button.dataset.imei}/${button.dataset.action}`, { method: "POST" });
  }
  await refresh();
});

document.querySelector("#start-all").addEventListener("click", async () => {
  await request("/api/control/start-all", { method: "POST" });
  await refresh();
});

document.querySelector("#stop-all").addEventListener("click", async () => {
  await request("/api/control/stop-all", { method: "POST" });
  await refresh();
});

deployPresetsButton.addEventListener("click", async () => {
  await request("/api/trackers/deploy-presets", { method: "POST" });
  await refresh();
  applyPresetDefaults({ resetImei: true });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateImei()) {
    return;
  }
  const values = Object.fromEntries(new FormData(form));
  if ("latitude" in values) {
    values.latitude = Number(values.latitude);
  }
  if ("longitude" in values) {
    values.longitude = Number(values.longitude);
  }
  if ("speed" in values) {
    values.speed = Number(values.speed);
  } else {
    delete values.speed;
  }
  values.update_interval = Number(values.update_interval);
  if (!values.route_preset) {
    delete values.route_preset;
  }
  values.custom_attributes = buildCustomAttributesPayload();
  delete values.custom_driver_name_enabled;
  delete values.custom_driver_name;
  delete values.custom_plate_enabled;
  delete values.custom_plate;
  delete values.custom_asset_class_enabled;
  delete values.custom_asset_class;
  await request("/api/trackers", { method: "POST", body: JSON.stringify(values) });
  form.reset();
  updateFixedLocationVisibility();
  syncCustomAttributeFields();
  await refresh();
  applyPresetDefaults({ resetImei: true });
});

imeiInput.addEventListener("input", validateImei);
routePresetSelect.addEventListener("change", () => {
  updateFixedLocationVisibility();
  applyPresetDefaults({ resetImei: true });
});
scenarioSelect.addEventListener("change", updateScenarioHint);
customAttributeTrigger?.addEventListener("click", () => {
  setCustomAttributeMenuOpen(Boolean(customAttributeMenu?.hidden));
});
customAttributeToggles.forEach((toggle) => {
  toggle.addEventListener("change", () => syncCustomAttributeFields({ applySuggestions: true }));
});
document.addEventListener("click", (event) => {
  if (customAttributeRoot && !customAttributeRoot.contains(event.target)) {
    setCustomAttributeMenuOpen(false);
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setCustomAttributeMenuOpen(false);
  }
});

const source = new EventSource("/api/events");
source.onmessage = (event) => {
  eventTotal += 1;
  eventCount.textContent = String(eventTotal);
  eventEntries = [{ timestampIso: new Date().toISOString(), message: event.data }, ...eventEntries].slice(0, maxVisibleEvents);
  renderEvents();
};

setInterval(refresh, 3000);
updateFixedLocationVisibility();
updateScenarioHint();
syncCustomAttributeFields();
applyPresetDefaults({ resetImei: false });
refresh();
