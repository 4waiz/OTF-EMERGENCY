
(() => {
  "use strict";

  const STORAGE_KEYS = {
    data: "otf_neon_demo_data_v2",
    session: "otf_neon_demo_session_v2"
  };

  const BACKUP_INTERVAL_MS = 12 * 60 * 60 * 1000;
  const TICK_INTERVAL_MS = 1000;
  const BASE_COORDS = { lat: 8.9806, lng: 38.7578 };
  const MOBILE_BREAKPOINT_PX = 760;

  const PASSWORD = "123";
  const IDENTITY = {
    awaiz: { id: "U001", username: "awaiz", name: "Awaiz Ahmed", role: "Admin" },
    omar: { id: "U002", username: "omar", name: "Omar", role: "Operator" },
    anas: { id: "U003", username: "anas", name: "Anas", role: "Viewer" }
  };

  const USERS = Object.values(IDENTITY);
  const PEOPLE_NAMES = USERS.map((user) => user.name);

  const INCIDENT_TYPES = [
    "Traffic Accident",
    "Medical Emergency",
    "Fire/Rescue",
    "Event/Delivery",
    "Environmental/Disaster Monitoring"
  ];

  const SEVERITIES = ["Low", "Medium", "High", "Critical"];
  const SEVERITY_SCORE = { Low: 1, Medium: 2, High: 3, Critical: 4 };

  const TYPE_LOCATIONS = {
    "Traffic Accident": ["Ring Road Junction", "East Gate Overpass", "Commerce Roundabout"],
    "Medical Emergency": ["AAU Main Library", "Science Block C", "Student Dorm 2"],
    "Fire/Rescue": ["Lab Complex 4", "North Market Annex", "Warehouse Zone B"],
    "Event/Delivery": ["Stadium Entry Gate", "Community Hall", "Relief Tent Alpha"],
    "Environmental/Disaster Monitoring": ["Riverside Sector", "Landslide Watchpoint", "Air Quality Zone 5"]
  };

  const TRANSCRIPT_SNIPPETS = [
    "System: Visual lock acquired; forwarding stream to operator.",
    "AI: Thermal sweep complete, no secondary hotspot detected.",
    "Omar: Traffic lane redirected for responder access.",
    "Awaiz Ahmed: Confirming route ETA to responder team.",
    "System: Microphone channel stable; witness statement captured.",
    "AI: Elevated crowd density detected near south perimeter.",
    "Anas: Copy update received on viewer console."
  ];

  const AI_PLAYBOOK = {
    "Traffic Accident": {
      tone: "Fast recommendation according to situation: stabilize the scene and clear responder access lanes first.",
      responders: ["Traffic Police", "Ambulance"],
      checklist: [
        "Activate aerial hazard lights and scene beacon.",
        "Capture plate evidence and lane obstruction footprint.",
        "Guide bystanders 20m away from impact zone."
      ],
      nextActions: [
        "Dispatch nearest traffic unit to coordinate diversion.",
        "Share vehicle position snapshots with command tablet.",
        "Prepare digital violation receipt if rule breach is confirmed."
      ]
    },
    "Medical Emergency": {
      tone: "Fast recommendation according to situation: prioritize patient airway and route medical responders immediately.",
      responders: ["Ambulance", "Campus Clinic"],
      checklist: [
        "Open medical telemetry packet for heart-rate sync.",
        "Push first-aid guidance to bystander audio channel.",
        "Reserve nearest safe landing corridor for med drone."
      ],
      nextActions: [
        "Broadcast location pin to ambulance lead.",
        "Enable live microphone for doctor instruction relay.",
        "Prepare first-aid kit release if requested by medic."
      ]
    },
    "Fire/Rescue": {
      tone: "Fast recommendation according to situation: isolate heat source and coordinate fire unit entry path now.",
      responders: ["Fire Brigade", "Police"],
      checklist: [
        "Switch thermal camera to hotspot tracking mode.",
        "Engage pump pressure readiness and nozzle orientation.",
        "Mark safe evacuation corridor on command map."
      ],
      nextActions: [
        "Notify fire unit with live heat map overlay.",
        "Escalate to high-pressure pump if heat index climbs.",
        "Maintain crowd exclusion boundary until responder handover."
      ]
    },
    "Event/Delivery": {
      tone: "Fast recommendation according to situation: secure drop zone and verify payload handoff identity.",
      responders: ["Event Security", "Rapid Logistics Team"],
      checklist: [
        "Confirm magnetic payload lock before descent.",
        "Validate recipient identity using approved badge scan.",
        "Record handoff confirmation and item checklist."
      ],
      nextActions: [
        "Enable payload arm with operator confirmation.",
        "Share drop ETA with onsite event coordinator.",
        "Log delivery proof snapshot and witness name."
      ]
    },
    "Environmental/Disaster Monitoring": {
      tone: "Fast recommendation according to situation: monitor hazard trend and secure vulnerable perimeter sectors.",
      responders: ["Disaster Unit", "Municipal Safety Team"],
      checklist: [
        "Activate environmental sensor fusion packet.",
        "Track wind, heat, and movement anomalies continuously.",
        "Issue precaution alert to nearby public zone."
      ],
      nextActions: [
        "Dispatch reconnaissance drone for secondary sweep.",
        "Share live readings with disaster management desk.",
        "Prepare evacuation advisory if risk threshold rises."
      ]
    }
  };

  let state = loadState();
  let ui = {
    incidentFilter: "All",
    selectedIncidentId: state.incidents[0] ? state.incidents[0].id : null,
    autoScenarioRunning: false,
    aiPlanExpanded: false,
    tutorialOpen: false,
    tutorialStep: 0
  };

  let mapState = {
    map: null,
    droneMarkers: {},
    incidentMarkers: {},
    geofence: null
  };

  let scenarioTimers = [];
  let ticker = null;

  init();

  function init() {
    clearClientPersistence();
    window.addEventListener("hashchange", renderRoute);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("click", onGlobalClick);
    document.addEventListener("change", onGlobalChange);
    document.addEventListener("toggle", onGlobalToggle, true);

    if (!location.hash) {
      location.hash = state.session ? "#/dashboard" : "#/login";
    }

    startTicker();
    renderRoute();
  }

  function clearClientPersistence() {
    try {
      localStorage.removeItem(STORAGE_KEYS.data);
      localStorage.removeItem(STORAGE_KEYS.session);
    } catch (_error) {
      // Ignore storage access failures in restricted browsing modes.
    }

    try {
      sessionStorage.clear();
    } catch (_error) {
      // Ignore storage access failures in restricted browsing modes.
    }

    clearCookies();
  }

  function clearCookies() {
    if (typeof document === "undefined") return;
    const cookies = document.cookie ? document.cookie.split(";") : [];
    cookies.forEach((entry) => {
      const key = entry.split("=")[0].trim();
      if (!key) return;
      document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
    });
  }

  function onPageHide() {
    saveSession(null);
  }

  function onPageShow(event) {
    if (event && event.persisted) {
      location.reload();
    }
  }

  function defaultState() {
    const now = Date.now();
    const ago = (minutes) => now - minutes * 60 * 1000;

    return {
      users: USERS,
      drones: [
        {
          id: "DR-101",
          status: "Idle",
          battery: 93,
          lat: 8.9812,
          lng: 38.7567,
          target: null,
          sensors: { temp: 34, motion: false, mic: "ON", pumpPressure: 0 }
        },
        {
          id: "DR-204",
          status: "On Scene",
          battery: 79,
          lat: 8.9895,
          lng: 38.7477,
          target: { lat: 8.9895, lng: 38.7477, incidentId: "INC401" },
          sensors: { temp: 42, motion: true, mic: "ON", pumpPressure: 24 }
        },
        {
          id: "DR-330",
          status: "En Route",
          battery: 66,
          lat: 8.9738,
          lng: 38.769,
          target: { lat: 8.9713, lng: 38.7729, incidentId: "INC400" },
          sensors: { temp: 36, motion: true, mic: "ON", pumpPressure: 0 }
        }
      ],
      incidents: [
        {
          id: "INC400",
          type: "Traffic Accident",
          severity: "High",
          lat: 8.9713,
          lng: 38.7729,
          locationName: "Ring Road Junction",
          createdAt: ago(12),
          status: "Dispatched",
          assignedDroneId: "DR-330",
          peopleRecognized: [{ name: "Anas", id: "VIEW-003", confidence: 92.2, time: ago(10) }],
          transcript: [
            { time: ago(12), text: "System: Traffic collision report received at Ring Road Junction." },
            { time: ago(11), text: "Omar: Drone DR-330 dispatched and responder channel opened." }
          ],
          timeline: [
            { time: ago(12), status: "Alerted", note: "Emergency call validated by System." },
            { time: ago(11), status: "Dispatched", note: "DR-330 assigned and en route." }
          ],
          snapshots: [],
          payloadMagnetOn: false,
          falsePositive: false,
          heatLevel: 37
        },
        {
          id: "INC401",
          type: "Environmental/Disaster Monitoring",
          severity: "Medium",
          lat: 8.9895,
          lng: 38.7477,
          locationName: "Riverside Sector",
          createdAt: ago(31),
          status: "On Scene",
          assignedDroneId: "DR-204",
          peopleRecognized: [{ name: "Omar", id: "OPS-002", confidence: 90.4, time: ago(27) }],
          transcript: [
            { time: ago(31), text: "System: Rising river level trigger activated." },
            { time: ago(29), text: "AI: Sensor package reports humidity spike and bank erosion." }
          ],
          timeline: [
            { time: ago(31), status: "Alerted", note: "Environmental threshold crossed." },
            { time: ago(29), status: "Dispatched", note: "DR-204 launched for monitoring." },
            { time: ago(26), status: "On Scene", note: "Live environmental feed active." }
          ],
          snapshots: [],
          payloadMagnetOn: false,
          falsePositive: false,
          heatLevel: 46
        }
      ],
      logs: [
        { id: "LOG-1", time: ago(14), category: "system", incidentId: null, actor: "System", message: "Secure control platform initialized in demo mode." },
        { id: "LOG-2", time: ago(12), category: "api", incidentId: "INC400", actor: "API Gateway", message: "POST /incidents/create -> 201" },
        { id: "LOG-3", time: ago(11), category: "dispatch", incidentId: "INC400", actor: "Omar", message: "Drone DR-330 assigned to incident INC400." }
      ],
      apiGateway: {
        "/auth/login": { endpoint: "/auth/login", method: "POST", lastRequest: null, status: 200 },
        "/incidents/list": { endpoint: "/incidents/list", method: "GET", lastRequest: now, status: 200 },
        "/dispatch/start": { endpoint: "/dispatch/start", method: "POST", lastRequest: ago(11), status: 202 },
        "/telemetry/live": { endpoint: "/telemetry/live", method: "GET", lastRequest: ago(1), status: 200 },
        "/vision/face-match": { endpoint: "/vision/face-match", method: "POST", lastRequest: ago(10), status: 200 },
        "/security/anomaly": { endpoint: "/security/anomaly", method: "POST", lastRequest: null, status: 202 },
        "/backup/run": { endpoint: "/backup/run", method: "POST", lastRequest: ago(250), status: 200 },
        "/reports/export": { endpoint: "/reports/export", method: "GET", lastRequest: null, status: 200 }
      },
      anomalies: [
        {
          id: "ANOM-1",
          key: "sensor-spoof",
          time: ago(18),
          type: "Sensor spoof attempt",
          severity: "Medium",
          status: "Resolved",
          description: "Unexpected IMU pattern detected and isolated.",
          response: "Fallback sensor profile applied and operator notified.",
          resolvedAt: ago(16)
        }
      ],
      backupCycleStart: now - 4 * 60 * 60 * 1000,
      demoFlags: {
        faceRecognized: false,
        motionDetected: false,
        highHeat: false,
        networkDegraded: false
      },
      session: null
    };
  }

  function loadState() {
    return defaultState();
  }

  function persistState() {
    // Intentionally disabled: app runs stateless for privacy.
  }

  function saveSession(session) {
    state.session = session;
  }

  function parseRoute() {
    const cleaned = location.hash.replace(/^#/, "") || "/login";
    const [path, query = ""] = cleaned.split("?");
    return { path, params: new URLSearchParams(query) };
  }

  function renderRoute() {
    const route = parseRoute();
    const app = document.getElementById("app");

    if (!state.session && route.path !== "/login") {
      location.hash = "#/login";
      return;
    }

    if (state.session && route.path === "/login") {
      location.hash = "#/dashboard";
      return;
    }

    if (route.path === "/login") {
      destroyMap();
      ui.tutorialOpen = false;
      ui.tutorialStep = 0;
      app.innerHTML = renderLoginView();
      bindLoginHandlers();
      return;
    }

    app.innerHTML = renderShell(route.path);
    const page = document.getElementById("page");
    if (!page) return;
    page.className = `page route-${(route.path || "/dashboard").replace("/", "") || "dashboard"}`;

    if (route.path === "/dashboard") {
      renderDashboard(page);
      renderTutorialOverlay();
      return;
    }

    if (route.path === "/incident") {
      renderIncidentDetail(page, route.params.get("id"));
      renderTutorialOverlay();
      return;
    }

    if (route.path === "/security") {
      destroyMap();
      renderSecurity(page);
      renderTutorialOverlay();
      return;
    }

    if (route.path === "/reports") {
      destroyMap();
      renderReports(page);
      renderTutorialOverlay();
      return;
    }

    location.hash = "#/dashboard";
  }

  function renderLoginView() {
    return `
      <section class="login-wrap">
        <form class="card login-card" id="login-form" autocomplete="off">
          <h2>OTF Emergency Control</h2>

          <label class="login-row" for="login-username">
            <span>Username</span>
            <input id="login-username" name="username" required />
          </label>

          <label class="login-row" for="login-password">
            <span>Password</span>
            <input id="login-password" name="password" type="password" required />
          </label>

          <p id="login-error" class="error-msg hidden" aria-live="polite"></p>

          <div class="login-actions">
            <button type="submit">Login</button>
          </div>
        </form>
      </section>
    `;
  }

  function bindLoginHandlers() {
    const form = document.getElementById("login-form");
    const usernameInput = document.getElementById("login-username");
    const passwordInput = document.getElementById("login-password");
    const errorNode = document.getElementById("login-error");

    if (!form || !usernameInput || !passwordInput || !errorNode) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const username = usernameInput.value.trim().toLowerCase();
      const password = passwordInput.value;
      const identity = IDENTITY[username];

      if (!identity || password !== PASSWORD) {
        errorNode.textContent = "Invalid credentials. Use awaiz, omar, or anas with password 123.";
        errorNode.classList.remove("hidden");
        return;
      }

      errorNode.textContent = "";
      errorNode.classList.add("hidden");

      const session = {
        userId: identity.id,
        username: identity.username,
        name: identity.name,
        role: identity.role,
        loggedInAt: Date.now()
      };

      saveSession(session);
      appendLog("auth", `${session.name} logged in as ${session.role}.`, null, session.name);
      recordApi("/auth/login", "POST", 200);
      location.hash = "#/dashboard";
    });
  }

  function renderShell(activePath) {
    const user = currentUser();

    return `
      <div class="app-shell">
        <header class="top-nav">
          <div class="brand">
            <h1>OTF Emergency Control</h1>
            <p>Cybersecurity & Critical Infrastructure Protection | Environmental Monitoring & Disaster Management</p>
          </div>

          <nav class="nav-links" aria-label="Primary">
            ${renderNavLink("#/dashboard", "Dashboard", activePath === "/dashboard")}
            ${renderNavLink("#/security", "Security", activePath === "/security")}
            ${renderNavLink("#/reports", "Reports", activePath === "/reports")}
          </nav>

          <div class="nav-meta">
            <span class="user-pill">${escapeHtml(user.name)} · ${escapeHtml(user.role)}</span>
            <button type="button" class="tutorial-launch" data-action="open-tutorial">Tutorial</button>
            <button type="button" class="ghost-btn" data-action="logout">Logout</button>
          </div>
        </header>

        <main id="page" class="page"></main>
      </div>

      <div id="tutorial-root"></div>
      <div id="modal-root"></div>
    `;
  }

  function renderNavLink(href, label, active) {
    return `<a class="nav-link ${active ? "active" : ""}" href="${href}">${label}</a>`;
  }

  function renderDashboard(container) {
    const readOnly = isViewer();

    container.innerHTML = `
      <section id="status-strip" class="status-strip"></section>

      <section class="dashboard-grid">
        <aside class="card incident-panel">
          <h2 class="panel-title">Incident Queue</h2>

          <div class="filter-wrap">
            <label class="sr-only" for="incident-filter">Filter incidents by type</label>
            <select id="incident-filter">
              <option value="All">All types</option>
              ${INCIDENT_TYPES.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("")}
            </select>
          </div>

          <div id="incident-list" class="incident-list"></div>
        </aside>

        <section class="card map-panel">
          <h2 class="panel-title">Live Drone and Incident Map</h2>
          <div id="map"></div>
        </section>

        <aside class="card ai-panel">
          <h2 class="panel-title">AI Recommendations</h2>
          <div id="ai-panel-content"></div>
        </aside>
      </section>

      <section class="bottom-grid">
        <article class="card">
          <h3 class="panel-title">Drone Telemetry</h3>
          <div id="telemetry-widget" class="telemetry-grid"></div>
        </article>

        <article class="card">
          <h3 class="panel-title">Computer Vision</h3>
          <div id="vision-widget"></div>
        </article>

        <article class="card">
          <h3 class="panel-title">Audio/Transcript</h3>
          <div id="transcript-widget"></div>
        </article>
      </section>

      <details class="demo-panel">
        <summary>Demo Controls</summary>
        <div class="demo-grid">
          <label>
            Incident Type
            <select id="demo-type" ${readOnly ? "disabled" : ""}>
              ${INCIDENT_TYPES.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("")}
            </select>
          </label>

          <label>
            Severity
            <select id="demo-severity" ${readOnly ? "disabled" : ""}>
              ${SEVERITIES.map((severity) => `<option value="${severity}">${severity}</option>`).join("")}
            </select>
          </label>

          <button type="button" data-action="trigger-incident" ${readOnly ? "disabled" : ""}>Trigger New Incident</button>
          <button type="button" data-action="auto-run" ${readOnly ? "disabled" : ""}>Auto-run Scenario</button>

          <label class="toggle">
            <input type="checkbox" data-demo-toggle="faceRecognized" ${state.demoFlags.faceRecognized ? "checked" : ""} ${readOnly ? "disabled" : ""} />
            Face recognized
          </label>

          <label class="toggle">
            <input type="checkbox" data-demo-toggle="motionDetected" ${state.demoFlags.motionDetected ? "checked" : ""} ${readOnly ? "disabled" : ""} />
            Motion detected
          </label>

          <label class="toggle">
            <input type="checkbox" data-demo-toggle="highHeat" ${state.demoFlags.highHeat ? "checked" : ""} ${readOnly ? "disabled" : ""} />
            High heat
          </label>

          <label class="toggle">
            <input type="checkbox" data-demo-toggle="networkDegraded" ${state.demoFlags.networkDegraded ? "checked" : ""} ${readOnly ? "disabled" : ""} />
            Network degraded
          </label>
        </div>

        ${readOnly ? '<p class="helper">Viewer role is read-only. Switch to awaiz or omar for interactive controls.</p>' : ""}
      </details>
    `;

    const filterSelect = document.getElementById("incident-filter");
    if (filterSelect) {
      filterSelect.value = ui.incidentFilter;
      filterSelect.addEventListener("change", () => {
        ui.incidentFilter = filterSelect.value;
        renderIncidentQueue();
      });
    }

    renderStatusStrip();
    renderIncidentQueue();
    renderAiPanel();
    renderTelemetry();
    renderVision();
    renderTranscript();
    initMap();
  }

  function renderStatusStrip() {
    const container = document.getElementById("status-strip");
    if (!container) return;

    const openAnomalies = state.anomalies.filter((item) => item.status === "Open").length;
    const networkStable = !state.demoFlags.networkDegraded;
    const connected = state.drones.filter((drone) => drone.status !== "Disconnected").length;
    const items = [
      { label: "System health", value: openAnomalies > 0 ? "Monitor" : "Nominal", level: openAnomalies > 0 ? "warn" : "ok" },
      { label: "Encryption", value: "ON", level: "ok" },
      { label: "Backup countdown", value: formatDuration(getBackupCountdownMs()), level: "ok" },
      { label: "Network", value: networkStable ? "Stable" : "Degraded", level: networkStable ? "ok" : "warn" },
      { label: "Connected drones", value: `${connected}/${state.drones.length}`, level: connected < state.drones.length ? "bad" : "ok" }
    ];
    const visibleItems = isCompactMobile()
      ? items.filter((item) => ["System health", "Network", "Connected drones"].includes(item.label))
      : items;

    container.innerHTML = visibleItems
      .map((item) => statusTile(item.label, item.value, item.level))
      .join("");
  }

  function statusTile(label, value, level) {
    const dotClass = level === "ok" ? "dot-ok" : level === "warn" ? "dot-warn" : "dot-bad";
    return `
      <div class="status-item">
        <div class="status-label">${label}</div>
        <div class="status-value"><span class="dot ${dotClass}"></span>${escapeHtml(value)}</div>
      </div>
    `;
  }

  function renderIncidentQueue() {
    const container = document.getElementById("incident-list");
    if (!container) return;

    const list = state.incidents
      .filter((incident) => (ui.incidentFilter === "All" ? true : incident.type === ui.incidentFilter))
      .sort((a, b) => (SEVERITY_SCORE[b.severity] - SEVERITY_SCORE[a.severity]) || (b.createdAt - a.createdAt));
    const compact = isCompactMobile();
    const visibleList = compact ? list.slice(0, 2) : list;

    if (!visibleList.length) {
      container.innerHTML = `<div class="empty-state">No incidents in queue for the selected type.</div>`;
      return;
    }

    container.innerHTML = visibleList
      .map((incident) => {
        const dispatchEnabled = canOperate() && !incident.assignedDroneId && incident.status !== "Resolved";
        const createdAt = escapeHtml(formatDateTime(incident.createdAt));
        const locationName = escapeHtml(incident.locationName);
        const assignedDrone = escapeHtml(incident.assignedDroneId || "No drone assigned");
        const status = escapeHtml(incident.status);
        return `
          <article class="incident-card incident-sev-${severityKey(incident.severity)}">
            <header>
              <div class="incident-headline">
                <span class="incident-type">${escapeHtml(incident.type)}</span>
                <span class="incident-id">${escapeHtml(incident.id)}</span>
              </div>
              <span class="badge badge-${severityKey(incident.severity)}">${escapeHtml(incident.severity)}</span>
            </header>

            <div class="incident-meta incident-meta-compact">
              <span>${locationName} · ${createdAt}</span>
              <span>${assignedDrone} · ${status}</span>
            </div>

            <div class="action-row">
              <button type="button" class="link-btn" data-action="focus-incident" data-id="${incident.id}">Focus AI</button>
              <a class="nav-link" href="#/incident?id=${incident.id}">Open</a>
              <button type="button" class="ghost-btn" data-action="dispatch-incident" data-id="${incident.id}" ${dispatchEnabled ? "" : "disabled"}>Dispatch</button>
            </div>
          </article>
        `;
      })
      .join("")
      + (compact && list.length > visibleList.length ? `<p class="helper compact-note">Showing top ${visibleList.length} incidents by priority.</p>` : "");
  }

  function renderAiPanel() {
    const container = document.getElementById("ai-panel-content");
    if (!container) return;

    const incident = getPrimaryIncident();
    if (!incident) {
      container.innerHTML = `<div class="empty-state">No incidents. Trigger a new incident to generate recommendations.</div>`;
      return;
    }

    const playbook = AI_PLAYBOOK[incident.type] || AI_PLAYBOOK["Medical Emergency"];
    const checklist = [...playbook.checklist];
    const tone = playbook.tone.replace(/^Fast recommendation according to situation:\s*/i, "");

    if (state.demoFlags.networkDegraded) {
      checklist.push("Switch command link to fallback mesh and confirm encryption handshake.");
    }
    if (state.demoFlags.highHeat && incident.type === "Fire/Rescue") {
      checklist.push("Heat threshold exceeded; prep high-pressure suppression and perimeter expansion.");
    }
    if (incident.peopleRecognized.length > 0) {
      checklist.push("Confirm recognized identity with responder unit before field action.");
    }

    const assignedDrone = incident.assignedDroneId ? state.drones.find((drone) => drone.id === incident.assignedDroneId) : null;
    const eta = estimateEtaMinutes(assignedDrone, incident);

    container.innerHTML = `
      <p class="tone"><strong>Priority:</strong> ${escapeHtml(tone)}</p>

      <div class="ai-summary-grid">
        <div class="summary-pill">
          <span>Route ETA</span>
          <strong>${eta}</strong>
        </div>
        <div class="summary-pill">
          <span>Responders</span>
          <strong>${escapeHtml(playbook.responders.join(", "))}</strong>
        </div>
      </div>

      <p class="helper">Immediate actions</p>
      <ul class="ai-list ai-list-compact">
        ${checklist.slice(0, 2).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>

      <details class="ai-more" ${ui.aiPlanExpanded ? "open" : ""}>
        <summary>Show full response plan</summary>
        <div class="plan-box">
          <p class="helper">Checklist</p>
          <ul class="ai-list">
            ${checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>

          <p class="helper">Next 3 actions</p>
          <ol class="actions-list">
            ${playbook.nextActions.slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ol>
        </div>
      </details>

      <div class="action-row">
        <a class="nav-link" href="#/incident?id=${incident.id}">Open ${incident.id}</a>
      </div>
    `;
  }
  function renderTelemetry() {
    const container = document.getElementById("telemetry-widget");
    if (!container) return;

    if (!state.drones.length) {
      container.innerHTML = `<div class="empty-state">No drones connected.</div>`;
      return;
    }

    const compact = isCompactMobile();
    const drones = compact ? state.drones.slice(0, 1) : state.drones;

    container.innerHTML = drones
      .map((drone) => {
        return `
          <div class="telemetry-item">
            <strong>${escapeHtml(drone.id)} · ${escapeHtml(drone.status)}</strong>
            ${renderMeter("Battery", drone.battery, 100, "%", "fill-cyan")}
            ${renderMeter("Temperature", drone.sensors.temp, 100, "C", "fill-purple")}
            ${renderMeter("Pump pressure", drone.sensors.pumpPressure, 100, "psi", "fill-red")}
            <div class="kv"><span>Motion</span><span>${drone.sensors.motion ? "Detected" : "Clear"}</span></div>
            <div class="kv"><span>Mic</span><span>${escapeHtml(drone.sensors.mic)}</span></div>
          </div>
        `;
      })
      .join("")
      + (compact && state.drones.length > drones.length ? '<p class="helper compact-note">Showing primary drone. Open incident for full fleet telemetry.</p>' : "");
  }

  function renderMeter(label, value, max, unit, fillClass) {
    const safe = Math.max(0, Math.min(100, (value / max) * 100));
    return `
      <div class="meter">
        <div class="meter-head"><span>${escapeHtml(label)}</span><span>${Number(value).toFixed(0)} ${escapeHtml(unit)}</span></div>
        <div class="meter-track"><div class="meter-fill ${fillClass}" style="width:${safe}%;"></div></div>
      </div>
    `;
  }

  function renderVision() {
    const container = document.getElementById("vision-widget");
    if (!container) return;

    const incident = getPrimaryIncident();
    const hits = incident ? incident.peopleRecognized.slice(-(isCompactMobile() ? 2 : 4)).reverse() : [];
    const motion = state.demoFlags.motionDetected || state.drones.some((drone) => drone.sensors.motion);

    container.innerHTML = `
      <div class="log-line">
        <strong>Motion detection alert:</strong> ${motion ? "ACTIVE" : "No movement anomaly"}
      </div>

      <div class="scroll-list">
        ${
          hits.length
            ? hits
                .map(
                  (hit) => `
                  <div class="log-line">
                    <div><strong>${escapeHtml(hit.name)}</strong> (${escapeHtml(hit.id)})</div>
                    <div class="log-time">Confidence ${Number(hit.confidence).toFixed(1)}% · ${formatTime(hit.time)}</div>
                  </div>
                `
                )
                .join("")
            : '<div class="empty-state">No face recognition hits for the active incident.</div>'
        }
      </div>
    `;
  }

  function renderTranscript() {
    const container = document.getElementById("transcript-widget");
    if (!container) return;

    const incident = getPrimaryIncident();
    if (!incident || !incident.transcript.length) {
      container.innerHTML = `<div class="empty-state">No incoming transcript lines.</div>`;
      return;
    }

    const maxLines = isCompactMobile() ? 3 : 5;
    container.innerHTML = `
      <div class="scroll-list">
        ${incident.transcript
          .slice(-maxLines)
          .reverse()
          .map(
            (line) => `
              <div class="log-line">
                <div class="log-time">${formatTime(line.time)}</div>
                <div>${escapeHtml(line.text)}</div>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  }

  function initMap() {
    const mapElement = document.getElementById("map");
    if (!mapElement) return;

    if (!window.L) {
      mapElement.innerHTML = '<div class="empty-state">Map failed to initialize (Leaflet unavailable).</div>';
      return;
    }

    destroyMap();

    mapState.map = window.L.map(mapElement).setView([BASE_COORDS.lat, BASE_COORDS.lng], 14);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(mapState.map);

    mapState.geofence = window.L.circle([BASE_COORDS.lat, BASE_COORDS.lng], {
      radius: 2500,
      color: "#b26bff",
      fillColor: "#b26bff",
      fillOpacity: 0.08
    }).addTo(mapState.map);
    mapState.geofence.bindPopup("Campus/Public Safety Geofence");

    updateMapMarkers();
    setTimeout(() => {
      if (mapState.map) mapState.map.invalidateSize();
    }, 120);
  }

  function destroyMap() {
    if (!mapState.map) return;
    mapState.map.remove();
    mapState = { map: null, droneMarkers: {}, incidentMarkers: {}, geofence: null };
  }

  function updateMapMarkers() {
    if (!mapState.map || !window.L) return;

    const droneSet = new Set();
    state.drones.forEach((drone) => {
      droneSet.add(drone.id);
      const disconnected = drone.status === "Disconnected";
      const color = disconnected ? "#ff6464" : "#3ae8ff";

      if (!mapState.droneMarkers[drone.id]) {
        mapState.droneMarkers[drone.id] = window.L.circleMarker([drone.lat, drone.lng], {
          radius: 8,
          color,
          fillColor: color,
          fillOpacity: 0.85,
          className: "marker-drone"
        }).addTo(mapState.map);
      }

      mapState.droneMarkers[drone.id].setLatLng([drone.lat, drone.lng]);
      mapState.droneMarkers[drone.id].setStyle({ color, fillColor: color });
      mapState.droneMarkers[drone.id].bindPopup(
        `<strong>${escapeHtml(drone.id)}</strong><br/>Status: ${escapeHtml(drone.status)}<br/>Battery: ${drone.battery.toFixed(0)}%<br/>Temp: ${drone.sensors.temp.toFixed(1)} C`
      );
    });

    Object.keys(mapState.droneMarkers).forEach((id) => {
      if (!droneSet.has(id)) {
        mapState.map.removeLayer(mapState.droneMarkers[id]);
        delete mapState.droneMarkers[id];
      }
    });

    const incidentSet = new Set();
    state.incidents.forEach((incident) => {
      incidentSet.add(incident.id);
      const severityClass = `marker-sev-${severityKey(incident.severity)}`;
      const color = incidentColor(incident);
      const boost =
        (incident.id === ui.selectedIncidentId ? 1 : 0) +
        (state.demoFlags.highHeat ? 1 : 0) +
        (state.demoFlags.motionDetected ? 1 : 0);
      const radius = Math.min(14, 9 + boost);

      if (!mapState.incidentMarkers[incident.id]) {
        mapState.incidentMarkers[incident.id] = window.L.circleMarker([incident.lat, incident.lng], {
          radius,
          color,
          fillColor: color,
          fillOpacity: 0.62,
          className: `marker-incident ${severityClass}`
        }).addTo(mapState.map);
      }

      mapState.incidentMarkers[incident.id].setLatLng([incident.lat, incident.lng]);
      mapState.incidentMarkers[incident.id].setStyle({
        color,
        fillColor: color,
        radius,
        className: `marker-incident ${severityClass}`
      });
      mapState.incidentMarkers[incident.id].bindPopup(
        `<strong>${escapeHtml(incident.id)}</strong><br/>${escapeHtml(incident.type)} (${escapeHtml(incident.severity)})<br/>Status: ${escapeHtml(incident.status)}<br/><a href="#/incident?id=${incident.id}">Open details</a>`
      );
    });

    Object.keys(mapState.incidentMarkers).forEach((id) => {
      if (!incidentSet.has(id)) {
        mapState.map.removeLayer(mapState.incidentMarkers[id]);
        delete mapState.incidentMarkers[id];
      }
    });
  }

  function renderIncidentDetail(container, incidentId) {
    const incident = state.incidents.find((item) => item.id === incidentId);
    if (!incident) {
      container.innerHTML = `
        <section class="card">
          <h2>Incident Not Found</h2>
          <p class="helper">The requested incident does not exist in local mock data.</p>
          <a class="nav-link" href="#/dashboard">Back to dashboard</a>
        </section>
      `;
      return;
    }

    ui.selectedIncidentId = incident.id;
    const readOnly = isViewer();

    container.innerHTML = `
      <section class="card">
        <div class="incident-header">
          <div>
            <h2>Incident ${escapeHtml(incident.id)} · ${escapeHtml(incident.type)}</h2>
            <p class="helper">Location: ${escapeHtml(incident.locationName)} · Created ${formatDateTime(incident.createdAt)}</p>
          </div>
          <a class="nav-link" href="#/dashboard">Back</a>
        </div>

        <div class="action-row">
          <span class="badge badge-${severityKey(incident.severity)}">${escapeHtml(incident.severity)}</span>
          <span>Status: <strong id="incident-status-text">${escapeHtml(incident.status)}</strong></span>
          <span>Assigned drone: ${escapeHtml(incident.assignedDroneId || "Unassigned")}</span>
        </div>

        <ul id="incident-timeline" class="timeline"></ul>
      </section>

      <section class="incident-layout">
        <article class="card">
          <h3 class="panel-title">Live Monitor</h3>
          <div class="video-feed">
            <div class="scan-line"></div>
            <div>
              <strong>Simulated live drone feed</strong>
              <p class="helper">Animated placeholder stream active</p>
            </div>
          </div>

          <div class="action-row" style="margin-top: 0.7rem;">
            <button type="button" data-action="capture-snapshot" data-id="${incident.id}" ${readOnly ? "disabled" : ""}>Snapshot</button>
          </div>

          <div id="snapshot-grid" class="snapshot-grid" style="margin-top: 0.7rem;"></div>
        </article>

        <article class="card">
          <h3 class="panel-title">Evidence & Actions</h3>
          <div id="incident-actions"></div>
        </article>
      </section>

      <section class="card">
        <h3 class="panel-title">Incident Logs</h3>
        <div id="incident-log-list" class="scroll-list"></div>
      </section>

      ${readOnly ? '<p class="helper">Viewer role is read-only. Interactive controls are disabled.</p>' : ""}
    `;

    renderIncidentTimeline(incident);
    renderSnapshots(incident);
    renderIncidentActions(incident);
    renderIncidentLogs(incident);
  }

  function renderIncidentTimeline(incident) {
    const container = document.getElementById("incident-timeline");
    if (!container) return;

    container.innerHTML = incident.timeline
      .slice()
      .sort((a, b) => a.time - b.time)
      .map(
        (entry) => `
          <li>
            <div><strong>${escapeHtml(entry.status)}</strong></div>
            <div>${escapeHtml(entry.note || "Status update")}</div>
            <div class="log-time">${formatDateTime(entry.time)}</div>
          </li>
        `
      )
      .join("");
  }

  function renderSnapshots(incident) {
    const container = document.getElementById("snapshot-grid");
    if (!container) return;

    if (!incident.snapshots.length) {
      container.innerHTML = `<div class="empty-state">No snapshots captured yet.</div>`;
      return;
    }

    container.innerHTML = incident.snapshots
      .slice()
      .reverse()
      .map(
        (snapshot) => `
          <article class="snapshot-card">
            <strong>${escapeHtml(snapshot.label)}</strong>
            <div class="log-time">${formatDateTime(snapshot.time)}</div>
            <div>Drone frame hash: ${escapeHtml(snapshot.hash)}</div>
          </article>
        `
      )
      .join("");
  }

  function renderIncidentActions(incident) {
    const container = document.getElementById("incident-actions");
    if (!container) return;

    const readOnly = isViewer();

    if (incident.type === "Traffic Accident") {
      container.innerHTML = `
        <p class="helper">Traffic operation controls</p>
        <div class="action-row">
          <button type="button" data-action="receipt" data-id="${incident.id}" ${readOnly ? "disabled" : ""}>Generate violation receipt</button>
        </div>
      `;
      return;
    }

    if (incident.type === "Medical Emergency") {
      container.innerHTML = `
        <p class="helper">Medical support controls</p>
        <div class="action-row">
          <button type="button" data-action="doctor-instructions" data-id="${incident.id}" ${readOnly ? "disabled" : ""}>Send doctor instructions</button>
        </div>
      `;
      return;
    }

    if (incident.type === "Fire/Rescue") {
      container.innerHTML = `
        <p class="helper">Fire suppression controls</p>
        <div class="action-row">
          <button type="button" data-action="pump" data-level="30" data-id="${incident.id}" ${readOnly ? "disabled" : ""}>Pump Low</button>
          <button type="button" data-action="pump" data-level="60" data-id="${incident.id}" ${readOnly ? "disabled" : ""}>Pump Medium</button>
          <button type="button" data-action="pump" data-level="90" data-id="${incident.id}" ${readOnly ? "disabled" : ""}>Pump High</button>
        </div>

        <p class="helper">Heat indicator: ${incident.heatLevel.toFixed(0)} C</p>
        <div class="heat-meter"><div class="heat-fill" style="width:${Math.max(0, Math.min(100, 100 - incident.heatLevel))}%;"></div></div>
      `;
      return;
    }

    if (incident.type === "Event/Delivery") {
      container.innerHTML = `
        <p class="helper">Delivery payload controls</p>
        <div class="action-row">
          <button type="button" data-action="toggle-magnet" data-id="${incident.id}" ${readOnly ? "disabled" : ""}>Magnetic payload/Grabber: ${incident.payloadMagnetOn ? "ON" : "OFF"}</button>
        </div>

        <p class="helper">Payload item list</p>
        <ul class="ai-list">
          <li>First-aid kit</li>
          <li>Essential meds</li>
          <li>Painkiller tools</li>
        </ul>
      `;
      return;
    }

    container.innerHTML = `
      <p class="helper">Environmental response controls</p>
      <div class="action-row">
        <button type="button" data-action="env-instructions" data-id="${incident.id}" ${readOnly ? "disabled" : ""}>Push hazard advisory</button>
      </div>
    `;
  }

  function renderIncidentLogs(incident) {
    const container = document.getElementById("incident-log-list");
    if (!container) return;

    const rows = state.logs
      .filter((log) => log.incidentId === incident.id || (!log.incidentId && ["api", "sensor", "security"].includes(log.category)))
      .slice()
      .sort((a, b) => b.time - a.time);

    if (!rows.length) {
      container.innerHTML = `<div class="empty-state">No logs available for this incident.</div>`;
      return;
    }

    container.innerHTML = rows
      .map(
        (log) => `
          <div class="log-line">
            <div>${escapeHtml(log.message)}</div>
            <div class="log-time">${formatDateTime(log.time)} · ${escapeHtml(log.actor || "System")}</div>
          </div>
        `
      )
      .join("");
  }

  function renderSecurity(container) {
    container.innerHTML = `
      <section class="card">
        <h2 class="panel-title">Cybersecurity Threat Model</h2>
        <div class="kpi-grid">
          ${securityCard("Encrypted transport", "HTTPS/SSL simulated", "")}
          ${securityCard("Encrypted at rest", "AES datastore simulation", "")}
          ${securityCard("Role-based access", "Admin / Operator / Viewer", "")}
          ${securityCard("Audit logs", "Append-only local log chain", "")}
          ${securityCard("Backup cycle", "Every 12 hours", "")}
        </div>
      </section>

      <section class="incident-layout">
        <article class="card">
          <h3 class="panel-title">API Gateway (Mock)</h3>
          <table class="list-table">
            <thead>
              <tr>
                <th>Endpoint</th>
                <th>Method</th>
                <th>Last request</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="api-gateway-body"></tbody>
          </table>
        </article>

        <article class="card">
          <h3 class="panel-title">Anomaly Alerts</h3>
          <div id="anomaly-list" class="scroll-list"></div>
        </article>
      </section>
    `;

    renderApiGateway();
    renderAnomalies();
  }

  function securityCard(label, value, klass) {
    return `<article class="kpi-item"><div class="status-label">${label}</div><div class="status-value ${klass}">${escapeHtml(value)}</div></article>`;
  }

  function renderApiGateway() {
    const container = document.getElementById("api-gateway-body");
    if (!container) return;

    const rows = Object.values(state.apiGateway)
      .sort((a, b) => a.endpoint.localeCompare(b.endpoint))
      .map(
        (entry) => `
          <tr>
            <td>${escapeHtml(entry.endpoint)}</td>
            <td>${escapeHtml(entry.method || "GET")}</td>
            <td>${entry.lastRequest ? formatDateTime(entry.lastRequest) : "No requests yet"}</td>
            <td>${entry.status || 200}</td>
          </tr>
        `
      )
      .join("");

    container.innerHTML = rows || `<tr><td colspan="4">No API gateway activity.</td></tr>`;
  }

  function renderAnomalies() {
    const container = document.getElementById("anomaly-list");
    if (!container) return;

    if (!state.anomalies.length) {
      container.innerHTML = `<div class="empty-state">No anomaly alerts.</div>`;
      return;
    }

    container.innerHTML = state.anomalies
      .slice()
      .sort((a, b) => b.time - a.time)
      .slice(0, 12)
      .map(
        (item) => `
          <div class="log-line anomaly-item">
            <div><strong>${escapeHtml(item.type)}</strong> · ${escapeHtml(item.severity)}</div>
            <div>${escapeHtml(item.description)}</div>
            <div class="log-time">${formatDateTime(item.time)} · ${escapeHtml(item.status)}</div>
            ${item.status === "Open" && canOperate() ? `<button type="button" class="ghost-btn" data-action="ack-anomaly" data-id="${item.id}">Acknowledge</button>` : ""}
          </div>
        `
      )
      .join("");
  }

  function renderReports(container) {
    container.innerHTML = `
      <section class="card">
        <h2 class="panel-title">Operational Impact Reports</h2>
        <div id="kpi-grid" class="kpi-grid"></div>

        <div class="action-row" style="margin-top: 0.72rem;">
          <button type="button" data-action="print-report">Print report</button>
        </div>
      </section>

      <section class="card chart-wrap">
        <h3 class="panel-title">Incidents by Type</h3>
        <div id="report-chart"></div>
      </section>

      <section class="card">
        <h3 class="panel-title">Recent Incident Summary</h3>
        <table class="list-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Status</th>
              <th>Response</th>
            </tr>
          </thead>
          <tbody id="report-table-body"></tbody>
        </table>
      </section>
    `;

    renderReportStats();
  }

  function renderReportStats() {
    const metrics = computeKpis();

    const kpiContainer = document.getElementById("kpi-grid");
    if (kpiContainer) {
      kpiContainer.innerHTML = `
        ${kpiTile("Average response time", `${metrics.avgResponse.toFixed(1)} min`, "")}
        ${kpiTile("Incidents handled", String(metrics.handled), "")}
        ${kpiTile("Drone uptime", `${metrics.uptime.toFixed(1)}%`, "")}
        ${kpiTile("False positives", String(metrics.falsePositives), "")}
      `;
    }

    const chartContainer = document.getElementById("report-chart");
    if (chartContainer) {
      const counts = INCIDENT_TYPES.map((type) => ({
        label: type,
        value: state.incidents.filter((incident) => incident.type === type).length
      }));
      const max = Math.max(1, ...counts.map((item) => item.value));
      chartContainer.innerHTML = counts
        .map(
          (item) => `
            <div class="chart-row">
              <div>${escapeHtml(item.label)}</div>
              <div class="chart-bar"><div class="chart-fill" style="width:${(item.value / max) * 100}%;"></div></div>
              <div>${item.value}</div>
            </div>
          `
        )
        .join("");
    }

    const tableBody = document.getElementById("report-table-body");
    if (tableBody) {
      const rows = state.incidents
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10)
        .map((incident) => {
          const response = responseTimeForIncident(incident);
          return `
            <tr>
              <td>${escapeHtml(incident.id)}</td>
              <td>${escapeHtml(incident.type)}</td>
              <td>${escapeHtml(incident.status)}</td>
              <td>${response == null ? "In progress" : `${response.toFixed(1)} min`}</td>
            </tr>
          `;
        })
        .join("");

      tableBody.innerHTML = rows || `<tr><td colspan="4">No incidents available.</td></tr>`;
    }
  }

  function kpiTile(label, value, klass) {
    return `<article class="kpi-item"><div class="status-label">${escapeHtml(label)}</div><div class="kpi-value ${klass}">${escapeHtml(value)}</div></article>`;
  }
  function onGlobalClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    const action = target.getAttribute("data-action");
    const incidentId = target.getAttribute("data-id");

    if (action === "open-tutorial") {
      openTutorial();
      return;
    }

    if (action === "close-tutorial" || action === "tutorial-skip") {
      closeTutorial();
      return;
    }

    if (action === "tutorial-next") {
      const steps = getTutorialSteps();
      if (ui.tutorialStep >= steps.length - 1) {
        closeTutorial();
      } else {
        setTutorialStep(ui.tutorialStep + 1);
      }
      return;
    }

    if (action === "tutorial-prev") {
      setTutorialStep(ui.tutorialStep - 1);
      return;
    }

    if (action === "tutorial-jump") {
      const step = Number(target.getAttribute("data-step"));
      setTutorialStep(step);
      return;
    }

    if (action === "tutorial-route") {
      const route = target.getAttribute("data-route");
      if (route) location.hash = route;
      return;
    }

    if (action === "logout") {
      closeTutorial();
      saveSession(null);
      ui.autoScenarioRunning = false;
      scenarioTimers.forEach((timer) => clearTimeout(timer));
      scenarioTimers = [];
      appendLog("auth", "System logout completed.", null, "System");
      location.hash = "#/login";
      return;
    }

    if (action === "focus-incident") {
      ui.selectedIncidentId = incidentId;
      renderAiPanel();
      renderVision();
      renderTranscript();
      return;
    }

    if (action === "dispatch-incident") {
      dispatchIncident(incidentId);
      return;
    }

    if (action === "trigger-incident") {
      if (!canOperate()) return;
      const type = getInputValue("demo-type", INCIDENT_TYPES[0]);
      const severity = getInputValue("demo-severity", "Medium");
      createIncident(type, severity);
      refreshCurrentRoute();
      return;
    }

    if (action === "auto-run") {
      runAutoScenario();
      return;
    }

    if (action === "capture-snapshot") {
      captureSnapshot(incidentId);
      return;
    }

    if (action === "receipt") {
      if (!canOperate()) return;
      const incident = findIncident(incidentId);
      if (incident) openReceiptModal(incident);
      return;
    }

    if (action === "close-modal") {
      closeModal();
      return;
    }

    if (action === "print-receipt") {
      recordApi("/reports/export", "GET", 200);
      window.print();
      return;
    }

    if (action === "doctor-instructions") {
      if (!canOperate()) return;
      appendTranscript(
        incidentId,
        "System: Doctor instructions sent - maintain airway, monitor breathing, and apply pressure to active bleeding.",
        "System"
      );
      appendLog("operator", `Doctor instructions sent for ${incidentId}.`, incidentId, currentUser().name);
      recordApi("/incidents/list", "POST", 200);
      refreshCurrentRoute();
      return;
    }

    if (action === "pump") {
      if (!canOperate()) return;
      const pressure = Number(target.getAttribute("data-level") || 0);
      setPumpPressure(incidentId, pressure);
      return;
    }

    if (action === "toggle-magnet") {
      if (!canOperate()) return;
      const incident = findIncident(incidentId);
      if (!incident) return;
      incident.payloadMagnetOn = !incident.payloadMagnetOn;
      appendLog("operator", `Magnetic payload/Grabber set ${incident.payloadMagnetOn ? "ON" : "OFF"} for ${incident.id}.`, incident.id, currentUser().name);
      appendTranscript(incident.id, `System: Magnetic payload channel ${incident.payloadMagnetOn ? "engaged" : "released"}.`, "System", false);
      persistState();
      refreshCurrentRoute();
      return;
    }

    if (action === "env-instructions") {
      if (!canOperate()) return;
      appendTranscript(incidentId, "System: Hazard advisory pushed to nearby public zone.", "System");
      appendLog("operator", `Environmental advisory pushed for ${incidentId}.`, incidentId, currentUser().name);
      refreshCurrentRoute();
      return;
    }

    if (action === "ack-anomaly") {
      if (!canOperate()) return;
      const anomaly = state.anomalies.find((item) => item.id === incidentId);
      if (anomaly && anomaly.status === "Open") {
        anomaly.status = "Resolved";
        anomaly.resolvedAt = Date.now();
        appendLog("security", `Anomaly acknowledged: ${anomaly.type}.`, null, currentUser().name);
        persistState();
        renderAnomalies();
        renderStatusStrip();
      }
      return;
    }

    if (action === "print-report") {
      recordApi("/reports/export", "GET", 200);
      appendLog("reports", "Report print action triggered.", null, currentUser().name);
      window.print();
    }
  }

  function onGlobalChange(event) {
    const toggle = event.target.closest("[data-demo-toggle]");
    if (!toggle) return;

    if (!canOperate()) {
      toggle.checked = false;
      return;
    }

    const flag = toggle.getAttribute("data-demo-toggle");
    const value = Boolean(toggle.checked);
    const incident = getPrimaryIncident();

    state.demoFlags[flag] = value;

    if (flag === "faceRecognized" && value) {
      applyFaceRecognition();
      if (incident) {
        incident.timeline.push({ time: Date.now(), status: incident.status, note: "Face recognition mode enabled for active watch." });
      }
    }

    if (flag === "motionDetected") {
      state.drones.forEach((drone) => {
        drone.sensors.motion = value;
      });
      appendLog("sensor", `Motion detection ${value ? "enabled" : "cleared"}.`, null, "System");
      if (incident) {
        incident.timeline.push({ time: Date.now(), status: incident.status, note: `Motion detection ${value ? "enabled" : "cleared"} by operator.` });
        appendTranscript(incident.id, `System: Motion detection ${value ? "ACTIVE" : "cleared"} on sensor channel.`, "System", false);
      }
    }

    if (flag === "highHeat") {
      state.incidents.forEach((item) => {
        if (item.type === "Fire/Rescue" || item.type === "Environmental/Disaster Monitoring") {
          item.heatLevel = value ? Math.max(item.heatLevel, 90) : Math.min(item.heatLevel, 58);
        }
      });
      state.drones.forEach((drone) => {
        drone.sensors.temp = value ? Math.max(drone.sensors.temp, 80) : Math.min(drone.sensors.temp, 42);
      });
      appendLog("sensor", `Heat profile ${value ? "elevated" : "normalized"}.`, null, "System");
      if (incident) {
        incident.timeline.push({ time: Date.now(), status: incident.status, note: `Heat profile ${value ? "elevated" : "normalized"} by demo control.` });
        appendTranscript(incident.id, `AI: Thermal channel ${value ? "spike detected" : "returned to nominal range"}.`, "AI", false);
      }
    }

    if (flag === "networkDegraded") {
      if (value) {
        addAnomaly(
          "network-degraded",
          "Network degraded",
          "High",
          "Packet loss threshold exceeded. Fallback route monitoring active.",
          "Switch active operations to resilient mesh path."
        );
      } else {
        markAnomalyResolved("network-degraded");
        appendLog("security", "Network status recovered to stable.", null, "System");
      }
      if (incident) {
        incident.timeline.push({ time: Date.now(), status: incident.status, note: `Network ${value ? "degraded" : "stabilized"}; secure uplink ${value ? "fallback" : "restored"}.` });
        appendTranscript(incident.id, `System: Network status ${value ? "DEGRADED" : "stable"} for command uplink.`, "System", false);
      }
    }

    persistState();
    refreshCurrentRoute();
  }

  function onGlobalToggle(event) {
    const details = event.target;
    if (!(details instanceof HTMLElement) || !details.matches("details.ai-more")) return;
    ui.aiPlanExpanded = details.open;
  }

  function createIncident(type, severity) {
    const id = generateIncidentId();
    const lat = BASE_COORDS.lat + (Math.random() - 0.5) * 0.045;
    const lng = BASE_COORDS.lng + (Math.random() - 0.5) * 0.045;

    const incident = {
      id,
      type,
      severity,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      locationName: randomItem(TYPE_LOCATIONS[type] || ["Urban Sector"]),
      createdAt: Date.now(),
      status: "Alerted",
      assignedDroneId: null,
      peopleRecognized: [],
      transcript: [{ time: Date.now(), text: `System: ${type} alert entered queue.` }],
      timeline: [{ time: Date.now(), status: "Alerted", note: "Alert captured by intake workflow." }],
      snapshots: [],
      payloadMagnetOn: false,
      falsePositive: false,
      heatLevel: type === "Fire/Rescue" ? 78 : 36
    };

    state.incidents.unshift(incident);
    ui.selectedIncidentId = incident.id;

    appendLog("incident", `New incident ${incident.id} created (${incident.type}, ${incident.severity}).`, incident.id, "System");
    recordApi("/incidents/list", "POST", 201);
    persistState();

    return incident;
  }

  function dispatchIncident(incidentId) {
    if (!canOperate()) return;
    const incident = findIncident(incidentId);
    if (!incident) return;

    if (incident.assignedDroneId) {
      appendLog("dispatch", `Dispatch skipped: ${incident.id} already assigned to ${incident.assignedDroneId}.`, incident.id, "System");
      return;
    }

    const drone = state.drones
      .filter((item) => item.status !== "Disconnected")
      .sort((a, b) => b.battery - a.battery)
      .find((item) => ["Idle", "Returning", "On Patrol"].includes(item.status));

    if (!drone) {
      addAnomaly(
        "no-drone-available",
        "Drone availability warning",
        "High",
        `No available drone for incident ${incident.id}.`,
        "Escalate to responder dispatch only."
      );
      appendLog("dispatch", `No available drone for ${incident.id}.`, incident.id, "System");
      refreshCurrentRoute();
      return;
    }

    drone.status = "En Route";
    drone.target = { lat: incident.lat, lng: incident.lng, incidentId: incident.id };
    incident.assignedDroneId = drone.id;

    updateIncidentStatus(incident, "Dispatched", `Drone ${drone.id} dispatched.`);
    appendTranscript(incident.id, `System: ${drone.id} launched toward ${incident.locationName}.`, "System", false);
    appendLog("dispatch", `Drone ${drone.id} assigned to ${incident.id}.`, incident.id, currentUser().name);
    recordApi("/dispatch/start", "POST", 202);

    persistState();
    refreshCurrentRoute();
  }

  function runAutoScenario() {
    if (!canOperate() || ui.autoScenarioRunning) return;

    const incident = getPrimaryIncident() || createIncident("Medical Emergency", "High");
    ui.selectedIncidentId = incident.id;
    ui.autoScenarioRunning = true;

    scenarioTimers.forEach((timer) => clearTimeout(timer));
    scenarioTimers = [];

    appendLog("operator", `Auto-run scenario started for ${incident.id}.`, incident.id, currentUser().name);

    const steps = [
      {
        at: 0,
        run: () => {
          appendTranscript(incident.id, "System: Alert acknowledged; validating route and responder availability.", "System", false);
          updateIncidentStatus(incident, "Alerted", "Incident accepted into dispatch flow.");
        }
      },
      {
        at: 2500,
        run: () => dispatchIncident(incident.id)
      },
      {
        at: 6000,
        run: () => {
          updateIncidentStatus(incident, "En Route", "Drone transit confirmed; responder team notified.");
          appendTranscript(incident.id, "AI: En-route telemetry stable; ETA recalculating every 5 seconds.", "AI", false);
        }
      },
      {
        at: 9500,
        run: () => {
          updateIncidentStatus(incident, "On Scene", "Drone reached incident location and activated monitoring.");
          appendTranscript(incident.id, "System: Drone on scene, live feed and telemetry now active.", "System", false);
          if (state.demoFlags.faceRecognized) applyFaceRecognition();
        }
      },
      {
        at: 13500,
        run: () => {
          updateIncidentStatus(incident, "Resolved", "Scene stabilized and handed over to responders.");
          appendTranscript(incident.id, `${currentUser().name}: Incident resolved, evidence archived, drone returning to base.`, currentUser().name, false);
          appendLog("operator", `Auto-run scenario completed for ${incident.id}.`, incident.id, currentUser().name);
          ui.autoScenarioRunning = false;
          persistState();
        }
      }
    ];

    steps.forEach((step) => {
      const timer = setTimeout(() => {
        step.run();
        refreshCurrentRoute();
      }, step.at);
      scenarioTimers.push(timer);
    });

    const endTimer = setTimeout(() => {
      ui.autoScenarioRunning = false;
      persistState();
      refreshCurrentRoute();
    }, 14200);

    scenarioTimers.push(endTimer);
    refreshCurrentRoute();
  }

  function captureSnapshot(incidentId) {
    if (!canOperate()) return;
    const incident = findIncident(incidentId);
    if (!incident) return;

    incident.snapshots.push({
      id: `SNAP-${Date.now()}`,
      label: "Snapshot capture",
      time: Date.now(),
      hash: Math.random().toString(16).slice(2, 10).toUpperCase()
    });

    appendLog("evidence", `Snapshot captured for ${incident.id}.`, incident.id, currentUser().name);
    recordApi("/incidents/list", "POST", 200);
    persistState();
    refreshCurrentRoute();
  }

  function openReceiptModal(incident) {
    const root = document.getElementById("modal-root");
    if (!root) return;

    const hit = incident.peopleRecognized.length ? incident.peopleRecognized[incident.peopleRecognized.length - 1] : null;

    root.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-label="Violation receipt">
        <section class="card modal-card">
          <h3>Violation Receipt (Simulated Drone Print)</h3>
          <p class="helper">Incident ${escapeHtml(incident.id)} · ${escapeHtml(incident.locationName)}</p>

          <table class="list-table">
            <tr><th>Type</th><td>${escapeHtml(incident.type)}</td></tr>
            <tr><th>Severity</th><td>${escapeHtml(incident.severity)}</td></tr>
            <tr><th>Timestamp</th><td>${formatDateTime(Date.now())}</td></tr>
            <tr><th>Assigned drone</th><td>${escapeHtml(incident.assignedDroneId || "Unassigned")}</td></tr>
            <tr><th>Recognition match</th><td>${hit ? `${escapeHtml(hit.name)} (${escapeHtml(hit.id)})` : "No match"}</td></tr>
          </table>

          <div class="action-row" style="margin-top: 0.8rem; justify-content: flex-end;">
            <button type="button" data-action="print-receipt">Print</button>
            <button type="button" class="ghost-btn" data-action="close-modal">Close</button>
          </div>
        </section>
      </div>
    `;

    appendLog("evidence", `Violation receipt generated for ${incident.id}.`, incident.id, currentUser().name);
  }

  function closeModal() {
    const root = document.getElementById("modal-root");
    if (root) root.innerHTML = "";
  }

  function openTutorial(step = 0) {
    ui.tutorialOpen = true;
    setTutorialStep(step);
  }

  function closeTutorial() {
    ui.tutorialOpen = false;
    const root = document.getElementById("tutorial-root");
    if (root) root.innerHTML = "";
  }

  function setTutorialStep(step) {
    const steps = getTutorialSteps();
    if (!steps.length) {
      closeTutorial();
      return;
    }

    const safeStep = Math.max(0, Math.min(steps.length - 1, Number(step)));
    ui.tutorialOpen = true;
    ui.tutorialStep = Number.isFinite(safeStep) ? safeStep : 0;
    renderTutorialOverlay();
  }

  function getTutorialSteps() {
    const intro = {
      title: "Login and Roles",
      body: "Use awaiz, omar, or anas with password 123. Admin and Operator can dispatch and run demo actions.",
      chips: ["awaiz: Admin", "omar: Operator", "anas: Viewer"],
      hint: "Viewer is read-only. Switch to Admin/Operator for full controls.",
      path: "/dashboard",
      route: "#/dashboard"
    };

    const outro = {
      title: "Fast Workflow",
      body: "Typical flow: Dashboard triage -> open incident detail -> Security checks -> Reports export.",
      chips: ["Dashboard", "Incident", "Security", "Reports"],
      hint: "Use this Tutorial button anytime from the top bar.",
      path: "/dashboard",
      route: "#/dashboard"
    };

    const desktopSteps = [
      {
        title: "Desktop Layout",
        body: "Use the three-panel command zone: Incident Queue on the left, live map center, AI recommendations right.",
        chips: ["Queue", "Map", "AI Panel", "Top Status"],
        hint: "Click Focus AI on an incident card to update recommendations instantly.",
        path: "/dashboard",
        route: "#/dashboard"
      },
      {
        title: "Dispatch and Monitor",
        body: "Trigger incident, dispatch drone, then watch telemetry, computer vision, and transcript in the bottom panels.",
        chips: ["Trigger Incident", "Dispatch", "Telemetry", "Transcript"],
        hint: "Use Auto-run Scenario for a full simulated response timeline.",
        path: "/dashboard",
        route: "#/dashboard"
      },
      {
        title: "Security and Reports",
        body: "Open Security to inspect API and anomaly signals, then Reports for KPIs, chart, and printable summary.",
        chips: ["Anomalies", "API Gateway", "KPI Stats", "Print Report"],
        hint: "These screens are best reviewed on wider laptop viewports.",
        path: "/security",
        route: "#/security"
      }
    ];

    const mobileSteps = [
      {
        title: "Mobile Flow",
        body: "Scroll vertically through map, queue, AI, and live feeds. The layout is stacked for one-hand monitoring.",
        chips: ["Map", "Queue", "AI", "Live Feeds"],
        hint: "Map is prioritized near the top so you can orient first.",
        path: "/dashboard",
        route: "#/dashboard"
      },
      {
        title: "Touch Controls",
        body: "Pinch/drag map to navigate, tap Focus AI on incidents, and use Show full response plan for expanded guidance.",
        chips: ["Pinch Zoom", "Tap Focus AI", "Expand Plan", "Open Incident"],
        hint: "Transcript and telemetry are intentionally compact on phone to reduce clutter.",
        path: "/dashboard",
        route: "#/dashboard"
      },
      {
        title: "Mobile Review Loop",
        body: "Use top tabs for Security and Reports, then return to Dashboard to continue dispatch operations.",
        chips: ["Security Tab", "Reports Tab", "Back to Dashboard"],
        hint: "Each tab keeps a scroll-friendly single-column structure on mobile.",
        path: "/reports",
        route: "#/reports"
      }
    ];

    return [intro, ...(isCompactMobile() ? mobileSteps : desktopSteps), outro];
  }

  function routeLabel(path) {
    if (path === "/dashboard") return "Dashboard";
    if (path === "/security") return "Security";
    if (path === "/reports") return "Reports";
    if (path === "/incident") return "Incident";
    return "Dashboard";
  }

  function renderTutorialOverlay() {
    const root = document.getElementById("tutorial-root");
    if (!root) return;

    if (!ui.tutorialOpen) {
      root.innerHTML = "";
      return;
    }

    const steps = getTutorialSteps();
    if (!steps.length) {
      root.innerHTML = "";
      return;
    }

    const stepIndex = Math.max(0, Math.min(steps.length - 1, ui.tutorialStep));
    ui.tutorialStep = stepIndex;
    const step = steps[stepIndex];
    const currentPath = parseRoute().path;
    const onStepRoute = !step.path || currentPath === step.path;
    const deviceLabel = isCompactMobile() ? "Mobile Guided Tutorial" : "Laptop Guided Tutorial";

    root.innerHTML = `
      <div class="tutorial-overlay" role="dialog" aria-modal="true" aria-label="How to use tutorial">
        <section class="card tutorial-card">
          <div class="tutorial-head">
            <div>
              <p class="tutorial-kicker">${escapeHtml(deviceLabel)}</p>
              <h3 class="tutorial-title">Step ${stepIndex + 1} of ${steps.length}: ${escapeHtml(step.title)}</h3>
            </div>
            <button type="button" class="ghost-btn" data-action="close-tutorial">Close</button>
          </div>

          <p class="tutorial-body">${escapeHtml(step.body)}</p>

          <div class="tutorial-visual">
            ${step.chips.map((chip) => `<span class="tutorial-chip">${escapeHtml(chip)}</span>`).join("")}
          </div>

          ${step.hint ? `<p class="helper tutorial-hint">${escapeHtml(step.hint)}</p>` : ""}

          <div class="tutorial-route">
            ${step.route && !onStepRoute
              ? `<button type="button" class="link-btn" data-action="tutorial-route" data-route="${escapeHtml(step.route)}">Open ${escapeHtml(routeLabel(step.path))}</button>`
              : `<span class="helper">Current view: ${escapeHtml(routeLabel(currentPath))}</span>`}
          </div>

          <div class="tutorial-progress">
            ${steps
              .map(
                (item, index) => `
                  <button
                    type="button"
                    class="tutorial-dot ${index === stepIndex ? "active" : ""}"
                    data-action="tutorial-jump"
                    data-step="${index}"
                    aria-label="Go to step ${index + 1}: ${escapeHtml(item.title)}"
                  ></button>
                `
              )
              .join("")}
          </div>

          <div class="tutorial-actions">
            <button type="button" class="ghost-btn" data-action="tutorial-prev" ${stepIndex === 0 ? "disabled" : ""}>Back</button>
            <div class="tutorial-actions-right">
              <button type="button" class="ghost-btn" data-action="tutorial-skip">Skip</button>
              <button type="button" data-action="tutorial-next">${stepIndex === steps.length - 1 ? "Finish" : "Next"}</button>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  function setPumpPressure(incidentId, pressure) {
    const incident = findIncident(incidentId);
    if (!incident) return;

    const drone = state.drones.find((item) => item.id === incident.assignedDroneId);
    if (drone) {
      drone.sensors.pumpPressure = pressure;
      drone.sensors.temp = Math.max(30, drone.sensors.temp - pressure / 35);
    }

    incident.heatLevel = Math.max(25, incident.heatLevel - pressure / 9);

    appendLog("operator", `Pump pressure set to ${pressure} psi for ${incident.id}.`, incident.id, currentUser().name);
    appendTranscript(incident.id, `System: Pump pressure set to ${pressure} psi.`, "System", false);

    persistState();
    refreshCurrentRoute();
  }

  function applyFaceRecognition() {
    const incident = getPrimaryIncident();
    if (!incident) return;

    const personName = randomItem(PEOPLE_NAMES);
    const personId = personName === "Awaiz Ahmed" ? "ADMIN-001" : personName === "Omar" ? "OPS-002" : "VIEW-003";

    const hit = {
      name: personName,
      id: personId,
      confidence: Number((88 + Math.random() * 11).toFixed(1)),
      time: Date.now()
    };

    incident.peopleRecognized.push(hit);
    appendTranscript(incident.id, `AI: Match found for ${hit.name} (${hit.confidence}% confidence).`, "AI", false);
    appendLog("ai", `Face recognition hit: ${hit.name} (${hit.id}) ${hit.confidence}%.`, incident.id, "AI");
    recordApi("/vision/face-match", "POST", 200);

    persistState();
  }

  function updateIncidentStatus(incident, status, note) {
    if (!incident || incident.status === status) return;

    incident.status = status;
    incident.timeline.push({ time: Date.now(), status, note: note || "Status update" });

    if (status === "Resolved") {
      const drone = state.drones.find((item) => item.id === incident.assignedDroneId);
      if (drone) {
        drone.status = "Returning";
        drone.target = { lat: BASE_COORDS.lat, lng: BASE_COORDS.lng, incidentId: null };
      }
    }

    appendLog("incident", `${incident.id} status changed to ${status}. ${note || ""}`.trim(), incident.id, "System");
    persistState();
  }

  function addAnomaly(key, type, severity, description, response) {
    const existing = state.anomalies.find((item) => item.key === key && item.status === "Open");
    if (existing) {
      existing.time = Date.now();
      existing.description = description;
      existing.response = response;
      persistState();
      return;
    }

    state.anomalies.unshift({
      id: `ANOM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      key,
      time: Date.now(),
      type,
      severity,
      status: "Open",
      description,
      response,
      resolvedAt: null
    });

    appendLog("security", `Anomaly detected: ${type}. ${description}`, null, "System");
    recordApi("/security/anomaly", "POST", 202);
    persistState();
  }

  function markAnomalyResolved(key) {
    const anomaly = state.anomalies.find((item) => item.key === key && item.status === "Open");
    if (!anomaly) return;
    anomaly.status = "Resolved";
    anomaly.resolvedAt = Date.now();
    persistState();
  }

  function appendTranscript(incidentId, text, actor, writeLog = true) {
    const incident = findIncident(incidentId);
    if (!incident) return;

    incident.transcript.push({ time: Date.now(), text });

    if (writeLog) {
      appendLog("audio", `${actor || "System"}: ${text}`, incidentId, actor || "System");
    }

    persistState();
  }

  function appendLog(category, message, incidentId = null, actor) {
    state.logs.push({
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      time: Date.now(),
      category,
      incidentId,
      actor: actor || (state.session ? state.session.name : "System"),
      message
    });

    persistState();
  }

  function recordApi(endpoint, method = "GET", status = 200) {
    const entry = state.apiGateway[endpoint] || { endpoint, method, lastRequest: null, status };
    entry.endpoint = endpoint;
    entry.method = method;
    entry.lastRequest = Date.now();
    entry.status = status;
    state.apiGateway[endpoint] = entry;

    appendLog("api", `${entry.method} ${endpoint} -> ${entry.status}`, null, "API Gateway");
  }

  function startTicker() {
    if (ticker) clearInterval(ticker);
    ticker = setInterval(() => {
      processBackupCycle();
      simulateDroneMovement();
      simulateTranscriptFeed();
      refreshLiveSections();
    }, TICK_INTERVAL_MS);
  }

  function processBackupCycle() {
    const elapsed = Date.now() - state.backupCycleStart;
    if (elapsed < BACKUP_INTERVAL_MS) return;

    state.backupCycleStart = Date.now();
    appendLog("system", "Scheduled encrypted backup completed and archived.", null, "System");
    recordApi("/backup/run", "POST", 200);
  }

  function simulateDroneMovement() {
    state.drones.forEach((drone) => {
      if (drone.status === "Disconnected") return;

      if (drone.target) {
        const latDelta = drone.target.lat - drone.lat;
        const lngDelta = drone.target.lng - drone.lng;

        drone.lat += latDelta * 0.07;
        drone.lng += lngDelta * 0.07;

        if (Math.abs(latDelta) < 0.0002 && Math.abs(lngDelta) < 0.0002) {
          if (drone.target.incidentId) {
            const incident = findIncident(drone.target.incidentId);
            if (incident && incident.status !== "Resolved") {
              drone.status = "On Scene";
              updateIncidentStatus(incident, "On Scene", `Drone ${drone.id} arrived at incident location.`);
            }
          } else {
            drone.status = "Idle";
            drone.target = null;
          }
        }
      } else if (drone.status === "Idle") {
        drone.lat += (Math.random() - 0.5) * 0.00015;
        drone.lng += (Math.random() - 0.5) * 0.00015;
      }

      if (["On Scene", "En Route", "Returning"].includes(drone.status)) {
        drone.battery = Math.max(5, drone.battery - 0.07);
      } else {
        drone.battery = Math.min(100, drone.battery + 0.03);
      }

      if (state.demoFlags.motionDetected) drone.sensors.motion = true;
      if (state.demoFlags.highHeat) {
        drone.sensors.temp = Math.max(drone.sensors.temp, 80);
      } else {
        drone.sensors.temp += (34 - drone.sensors.temp) * 0.04;
      }

      if (drone.battery <= 15) {
        addAnomaly(`battery-${drone.id}`, "Drone low battery", "Medium", `${drone.id} battery below 15%.`, "Recall drone and assign nearest backup unit.");
      }

      if (drone.battery <= 5.5) {
        drone.status = "Disconnected";
        addAnomaly(`disconnect-${drone.id}`, "Drone disconnect", "High", `${drone.id} disconnected due to critically low battery.`, "Switch to alternate drone and investigate power subsystem.");
      }
    });

    persistState();
  }

  function simulateTranscriptFeed() {
    if (Math.random() > 0.14) return;

    const incident = getPrimaryIncident();
    if (!incident || incident.status === "Resolved") return;

    appendTranscript(incident.id, randomItem(TRANSCRIPT_SNIPPETS), "System", false);
  }

  function refreshLiveSections() {
    const route = parseRoute();

    if (route.path === "/dashboard") {
      renderStatusStrip();
      renderIncidentQueue();
      renderAiPanel();
      renderTelemetry();
      renderVision();
      renderTranscript();
      updateMapMarkers();
      const autoButton = document.querySelector('[data-action="auto-run"]');
      if (autoButton) {
        autoButton.textContent = ui.autoScenarioRunning ? "Auto-running..." : "Auto-run Scenario";
      }
      return;
    }

    if (route.path === "/incident") {
      const incident = findIncident(route.params.get("id"));
      if (!incident) return;
      const statusNode = document.getElementById("incident-status-text");
      if (statusNode) statusNode.textContent = incident.status;
      renderIncidentTimeline(incident);
      renderSnapshots(incident);
      renderIncidentActions(incident);
      renderIncidentLogs(incident);
      return;
    }

    if (route.path === "/security") {
      renderApiGateway();
      renderAnomalies();
      return;
    }

    if (route.path === "/reports") {
      renderReportStats();
    }
  }

  function refreshCurrentRoute() {
    const route = parseRoute();

    if (route.path === "/dashboard") {
      renderStatusStrip();
      renderIncidentQueue();
      renderAiPanel();
      renderTelemetry();
      renderVision();
      renderTranscript();
      updateMapMarkers();
      return;
    }

    if (route.path === "/incident") {
      const incident = findIncident(route.params.get("id"));
      if (!incident) return;
      renderIncidentTimeline(incident);
      renderSnapshots(incident);
      renderIncidentActions(incident);
      renderIncidentLogs(incident);
      return;
    }

    if (route.path === "/security") {
      renderApiGateway();
      renderAnomalies();
      renderStatusStrip();
      return;
    }

    if (route.path === "/reports") {
      renderReportStats();
    }
  }

  function getPrimaryIncident() {
    const selected = state.incidents.find((incident) => incident.id === ui.selectedIncidentId);
    if (selected) return selected;

    return (
      state.incidents
        .slice()
        .sort((a, b) => {
          if (a.status === "Resolved" && b.status !== "Resolved") return 1;
          if (a.status !== "Resolved" && b.status === "Resolved") return -1;
          return (SEVERITY_SCORE[b.severity] - SEVERITY_SCORE[a.severity]) || (b.createdAt - a.createdAt);
        })[0] || null
    );
  }

  function computeKpis() {
    const responseTimes = state.incidents.map(responseTimeForIncident).filter((value) => value != null);
    const avgResponse = responseTimes.length ? responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length : 0;
    const handled = state.incidents.filter((incident) => incident.status === "Resolved" || incident.status === "Closed").length;

    const openDisconnects = state.anomalies.filter(
      (item) => item.status === "Open" && (item.type === "Drone disconnect" || String(item.key).startsWith("disconnect-"))
    ).length;

    const uptime = Math.max(88, 99.2 - openDisconnects * 1.4 - (state.demoFlags.networkDegraded ? 1.6 : 0));
    const falsePositives = state.incidents.filter((incident) => incident.falsePositive).length;

    return { avgResponse, handled, uptime, falsePositives };
  }

  function responseTimeForIncident(incident) {
    const alerted = (incident.timeline || []).find((entry) => entry.status === "Alerted");
    const onScene = (incident.timeline || []).find((entry) => entry.status === "On Scene");

    if (!alerted || !onScene || onScene.time < alerted.time) return null;
    return (onScene.time - alerted.time) / 60000;
  }

  function estimateEtaMinutes(drone, incident) {
    if (!incident) return "N/A";
    if (!drone) return "Awaiting drone assignment";

    const distanceKm = haversine(drone.lat, drone.lng, incident.lat, incident.lng);
    return `${Math.max(1, distanceKm / 0.65).toFixed(1)} min`;
  }

  function haversine(lat1, lng1, lat2, lng2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const earth = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

    return 2 * earth * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function getBackupCountdownMs() {
    const elapsed = Date.now() - state.backupCycleStart;
    return BACKUP_INTERVAL_MS - (elapsed % BACKUP_INTERVAL_MS);
  }

  function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  function formatDateTime(value) {
    return new Date(value).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function formatTime(value) {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function incidentColor(incident) {
    if (incident.status === "Resolved") return "#8d8fa8";
    const key = severityKey(incident.severity);
    if (key === "low") return "#47e8ad";
    if (key === "medium") return "#ffc36e";
    if (key === "high") return "#ff6464";
    return "#ff6464";
  }

  function severityKey(severity) {
    return String(severity || "low").toLowerCase();
  }

  function findIncident(id) {
    return state.incidents.find((incident) => incident.id === id);
  }

  function currentUser() {
    return state.session || { name: "System", role: "Viewer", username: "anas" };
  }

  function canOperate() {
    const role = currentUser().role;
    return role === "Admin" || role === "Operator";
  }

  function isViewer() {
    return currentUser().role === "Viewer";
  }

  function isCompactMobile() {
    return typeof window !== "undefined"
      && !!window.matchMedia
      && window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches;
  }

  function randomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function generateIncidentId() {
    let id;
    do {
      id = `INC${Math.floor(100 + Math.random() * 900)}`;
    } while (state.incidents.some((incident) => incident.id === id));
    return id;
  }

  function getInputValue(id, fallback) {
    const node = document.getElementById(id);
    return node ? node.value : fallback;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
