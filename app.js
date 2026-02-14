
(() => {
  "use strict";

  const STORAGE = {
    data: "otf_demo_data_v1",
    session: "otf_demo_session_v1",
    theme: "otf_demo_theme_v1"
  };

  const BASE = { lat: 8.9806, lng: 38.7578 };
  const BACKUP_MS = 12 * 60 * 60 * 1000;
  const TICK_MS = 1000;

  const USERS = [
    { id: "U001", name: "Awaiz Ahmed", role: "Admin" },
    { id: "U002", name: "Omar", role: "Operator" },
    { id: "U003", name: "Anas", role: "Viewer" }
  ];

  const TYPES = [
    "Traffic Accident",
    "Medical Emergency",
    "Fire/Rescue",
    "Event/Delivery",
    "Environmental/Disaster Monitoring"
  ];

  const SEVERITIES = ["Low", "Medium", "High", "Critical"];
  const SCORE = { Low: 1, Medium: 2, High: 3, Critical: 4 };

  const LOC = {
    "Traffic Accident": ["Ring Road Junction", "East Gate Overpass", "Commerce Roundabout"],
    "Medical Emergency": ["AAU Main Library", "Science Block C", "Student Dorm 2"],
    "Fire/Rescue": ["Lab Complex 4", "North Market Annex", "Warehouse Zone B"],
    "Event/Delivery": ["Stadium Entry Gate", "Community Hall", "Relief Tent Alpha"],
    "Environmental/Disaster Monitoring": ["Riverside Sector", "Landslide Watchpoint", "Air Quality Zone 5"]
  };

  const PEOPLE = [
    { name: "Martha Alemu", id: "AAU-1902" },
    { name: "Tomas Hailu", id: "AAU-3481" },
    { name: "Nahom Girma", id: "AAU-2219" },
    { name: "Saron Mulu", id: "AAU-1773" }
  ];

  const FEED = [
    "Command: Visual lock acquired; forwarding stream to operator.",
    "Field responder: Traffic redirected, lane cleared for ambulance.",
    "Drone: Thermal sweep complete, no secondary hotspot detected.",
    "Command: Microphone channel stable; capturing witness statement.",
    "AI: Elevated crowd density detected on south perimeter.",
    "Operator: Confirming ETA to nearest responder team now.",
    "Command: Environmental readings stable after wind shift."
  ];

  const PLAYBOOK = {
    "Traffic Accident": {
      tone: "Fast recommendation according to situation: stabilize the scene and clear responder access lanes first.",
      responders: ["Traffic Police", "Ambulance"],
      checklist: ["Activate aerial hazard lights and scene beacon.", "Capture plate evidence and lane obstruction footprint.", "Guide bystanders 20m away from impact zone."],
      next: ["Dispatch nearest traffic unit to coordinate diversion.", "Share vehicle position snapshots with command tablet.", "Prepare digital violation receipt if rule breach confirmed."]
    },
    "Medical Emergency": {
      tone: "Fast recommendation according to situation: prioritize patient airway and route medical responders immediately.",
      responders: ["Ambulance", "Campus Clinic"],
      checklist: ["Open medical telemetry packet for heart-rate sync.", "Push first-aid guidance to bystander audio channel.", "Reserve nearest safe landing corridor for med drone."],
      next: ["Broadcast location pin to ambulance lead.", "Enable live microphone for doctor instruction relay.", "Prepare first-aid kit release if requested by medic."]
    },
    "Fire/Rescue": {
      tone: "Fast recommendation according to situation: isolate heat source and coordinate fire unit entry path now.",
      responders: ["Fire Brigade", "Police"],
      checklist: ["Switch thermal camera to hotspot tracking mode.", "Engage pump pressure readiness and nozzle orientation.", "Mark safe evacuation corridor on command map."],
      next: ["Notify fire unit with live heat map overlay.", "Escalate to high-pressure pump if heat index climbs.", "Maintain crowd exclusion boundary until handover."]
    },
    "Event/Delivery": {
      tone: "Fast recommendation according to situation: secure drop zone and verify payload handoff identity.",
      responders: ["Event Security", "Rapid Logistics Team"],
      checklist: ["Confirm magnetic payload lock before descent.", "Validate recipient identity using badge scan.", "Record handoff confirmation and item checklist."],
      next: ["Enable payload arm with operator confirmation.", "Share drop ETA with onsite event coordinator.", "Log delivery proof snapshot and witness name."]
    },
    "Environmental/Disaster Monitoring": {
      tone: "Fast recommendation according to situation: monitor hazard trend and secure vulnerable perimeter sectors.",
      responders: ["Disaster Unit", "Municipal Safety Team"],
      checklist: ["Activate environmental sensor fusion packet.", "Track wind, heat, and movement anomalies continuously.", "Issue precaution alert to nearby public zone."],
      next: ["Dispatch reconnaissance drone for secondary sweep.", "Share live readings with disaster management desk.", "Prepare evacuation advisory if threshold rises."]
    }
  };

  const state = loadState();
  const ui = {
    filter: "All",
    selected: state.incidents[0] ? state.incidents[0].id : null,
    auto: false
  };

  let map = { obj: null, drones: {}, incidents: {}, geofence: null };
  let ticker = null;
  let timers = [];

  init();

  function init() {
    setTheme(localStorage.getItem(STORAGE.theme) || "light");
    window.addEventListener("hashchange", renderRoute);
    document.addEventListener("click", onClick);
    document.addEventListener("change", onChange);
    if (!location.hash) location.hash = state.session ? "#/dashboard" : "#/login";
    startTicker();
    renderRoute();
  }

  function loadState() {
    const now = Date.now();
    const ago = (m) => now - m * 60000;
    const fallback = {
      users: USERS,
      drones: [
        { id: "DR-101", status: "Idle", battery: 92, lat: 8.9812, lng: 38.7567, target: null, sensors: { temp: 34, motion: false, mic: "ON", pumpPressure: 0 } },
        { id: "DR-204", status: "On Scene", battery: 78, lat: 8.9895, lng: 38.7477, target: { lat: 8.9895, lng: 38.7477, incidentId: "INC124" }, sensors: { temp: 42, motion: true, mic: "ON", pumpPressure: 20 } },
        { id: "DR-330", status: "En Route", battery: 65, lat: 8.9738, lng: 38.7690, target: { lat: 8.9713, lng: 38.7729, incidentId: "INC123" }, sensors: { temp: 37, motion: true, mic: "ON", pumpPressure: 0 } }
      ],
      incidents: [
        {
          id: "INC123", type: "Traffic Accident", severity: "High", lat: 8.9713, lng: 38.7729, locationName: "Ring Road Junction", createdAt: ago(11), status: "Dispatched", assignedDroneId: "DR-330",
          peopleRecognized: [{ name: "Nahom Girma", id: "AAU-2219", confidence: 91.8, time: ago(9) }],
          transcript: [{ time: ago(11), text: "Command: Traffic collision report received at Ring Road Junction." }, { time: ago(10), text: "Operator: Drone DR-330 dispatched, responders notified." }],
          timeline: [{ time: ago(11), status: "Alerted", note: "Emergency call validated by operator." }, { time: ago(10), status: "Dispatched", note: "DR-330 assigned and en route." }],
          snapshots: [], payloadMagnetOn: false, falsePositive: false, heatLevel: 36
        },
        {
          id: "INC124", type: "Environmental/Disaster Monitoring", severity: "Medium", lat: 8.9895, lng: 38.7477, locationName: "Riverside Sector", createdAt: ago(33), status: "On Scene", assignedDroneId: "DR-204",
          peopleRecognized: [], transcript: [{ time: ago(33), text: "Command: Rising river level trigger activated." }, { time: ago(30), text: "Drone: Sensor package reporting humidity spike and bank erosion." }],
          timeline: [{ time: ago(33), status: "Alerted", note: "Environmental threshold crossed." }, { time: ago(31), status: "Dispatched", note: "DR-204 launched for monitoring." }, { time: ago(28), status: "On Scene", note: "Live environmental feed active." }],
          snapshots: [], payloadMagnetOn: false, falsePositive: false, heatLevel: 44
        }
      ],
      logs: [
        { id: "LOG-1", time: ago(12), category: "system", incidentId: null, actor: "System", message: "Secure control platform initialized in demo mode." },
        { id: "LOG-2", time: ago(11), category: "api", incidentId: "INC123", actor: "API Gateway", message: "POST /incidents/create -> 201" },
        { id: "LOG-3", time: ago(10), category: "dispatch", incidentId: "INC123", actor: "System", message: "Drone DR-330 assigned to incident INC123." }
      ],
      apiGateway: {
        "/auth/login": { endpoint: "/auth/login", method: "POST", lastRequest: null, status: 200 },
        "/incidents/list": { endpoint: "/incidents/list", method: "GET", lastRequest: now, status: 200 },
        "/dispatch/start": { endpoint: "/dispatch/start", method: "POST", lastRequest: ago(10), status: 202 },
        "/telemetry/live": { endpoint: "/telemetry/live", method: "GET", lastRequest: ago(1), status: 200 },
        "/vision/face-match": { endpoint: "/vision/face-match", method: "POST", lastRequest: ago(9), status: 200 },
        "/security/anomaly": { endpoint: "/security/anomaly", method: "POST", lastRequest: null, status: 202 },
        "/backup/run": { endpoint: "/backup/run", method: "POST", lastRequest: ago(240), status: 200 },
        "/reports/export": { endpoint: "/reports/export", method: "GET", lastRequest: null, status: 200 }
      },
      anomalies: [{ id: "ANOM-1", key: "sensor-spoof", time: ago(18), type: "Sensor spoof attempt", severity: "Medium", status: "Resolved", description: "Unexpected IMU pattern detected and quarantined.", response: "Fallback sensor profile applied and operator notified.", resolvedAt: ago(16) }],
      backupStart: now - 4 * 60 * 60 * 1000,
      flags: { faceRecognized: false, motionDetected: false, highHeat: false, networkDegraded: false },
      session: null
    };

    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE.data) || "{}") || {};
    } catch (_e) {
      saved = {};
    }
    let session = null;
    try {
      session = JSON.parse(localStorage.getItem(STORAGE.session) || "null");
    } catch (_e) {
      session = null;
    }

    const s = {
      ...fallback,
      ...saved,
      users: USERS,
      drones: Array.isArray(saved.drones) ? saved.drones : fallback.drones,
      incidents: Array.isArray(saved.incidents) ? saved.incidents : fallback.incidents,
      logs: Array.isArray(saved.logs) ? saved.logs : fallback.logs,
      anomalies: Array.isArray(saved.anomalies) ? saved.anomalies : fallback.anomalies,
      apiGateway: { ...fallback.apiGateway, ...(saved.apiGateway || {}) },
      flags: { ...fallback.flags, ...(saved.flags || {}) },
      session
    };
    return s;
  }

  function persist() {
    localStorage.setItem(
      STORAGE.data,
      JSON.stringify({
        users: USERS,
        drones: state.drones,
        incidents: state.incidents,
        logs: state.logs,
        apiGateway: state.apiGateway,
        anomalies: state.anomalies,
        backupStart: state.backupStart,
        flags: state.flags
      })
    );
  }

  function setSession(v) {
    state.session = v;
    if (v) localStorage.setItem(STORAGE.session, JSON.stringify(v));
    else localStorage.removeItem(STORAGE.session);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE.theme, theme);
  }

  function route() {
    const raw = location.hash.replace(/^#/, "") || "/login";
    const [path, q = ""] = raw.split("?");
    return { path, params: new URLSearchParams(q) };
  }

  function renderRoute() {
    const r = route();
    const app = document.getElementById("app");
    if (!state.session && r.path !== "/login") {
      location.hash = "#/login";
      return;
    }
    if (state.session && r.path === "/login") {
      location.hash = "#/dashboard";
      return;
    }

    if (r.path === "/login") {
      destroyMap();
      app.innerHTML = loginHTML();
      bindLogin();
      return;
    }

    app.innerHTML = shellHTML(r.path);
    const page = document.getElementById("page");
    if (r.path === "/dashboard") return renderDashboard(page);
    if (r.path === "/incident") return renderIncident(page, r.params.get("id"));
    if (r.path === "/security") {
      destroyMap();
      return renderSecurity(page);
    }
    if (r.path === "/reports") {
      destroyMap();
      return renderReports(page);
    }
    location.hash = "#/dashboard";
  }

  function loginHTML() {
    return `
      <section class="login-wrap">
        <form class="card login-card" id="login-form" autocomplete="off">
          <h2>OTF Emergency Control</h2>
          <p class="helper">AI-powered emergency response prototype (mock auth, no external keys).</p>
          <label class="login-row" for="login-role">
            <span>Role</span>
            <select id="login-role" name="role" required>
              <option value="Admin">Admin (full access)</option>
              <option value="Operator">Operator (dispatch + monitoring)</option>
              <option value="Viewer">Viewer (read-only)</option>
            </select>
          </label>
          <label class="login-row" for="login-name">
            <span>Display Name</span>
            <input id="login-name" name="name" value="Amina Desta" required />
          </label>
          <p class="helper">Focus areas: Cybersecurity & Critical Infrastructure Protection, Environmental Monitoring & Disaster Management.</p>
          <div class="login-actions"><button type="submit">Login</button></div>
        </form>
      </section>
    `;
  }

  function bindLogin() {
    const role = document.getElementById("login-role");
    const name = document.getElementById("login-name");
    const form = document.getElementById("login-form");
    if (!role || !name || !form) return;
    role.addEventListener("change", () => {
      const u = USERS.find((x) => x.role === role.value);
      name.value = u ? u.name : "";
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const u = USERS.find((x) => x.role === role.value) || USERS[0];
      const session = { userId: u.id, role: role.value, name: name.value.trim() || u.name, loggedInAt: Date.now() };
      setSession(session);
      log("auth", `${session.name} logged in as ${session.role}.`, null, session.name);
      api("/auth/login", "POST", 200);
      location.hash = "#/dashboard";
    });
  }

  function shellHTML(path) {
    const u = currentUser();
    const btn = document.documentElement.getAttribute("data-theme") === "dark" ? "Light Mode" : "Dark Mode";
    const nav = (href, label, active) => `<a class="nav-link ${active ? "active" : ""}" href="${href}">${label}</a>`;
    return `
      <div class="app-shell">
        <header class="top-nav">
          <div class="brand">
            <h1>OTF Emergency Control</h1>
            <p>Cybersecurity & Critical Infrastructure Protection | Environmental Monitoring & Disaster Management</p>
          </div>
          <nav class="nav-links" aria-label="Primary">
            ${nav("#/dashboard", "Dashboard", path === "/dashboard")}
            ${nav("#/security", "Security", path === "/security")}
            ${nav("#/reports", "Reports", path === "/reports")}
          </nav>
          <div class="nav-meta">
            <span class="user-pill">${esc(u.name)} · ${esc(u.role)}</span>
            <button type="button" class="ghost-btn" data-action="theme-toggle">${btn}</button>
            <button type="button" class="ghost-btn" data-action="logout">Logout</button>
          </div>
        </header>
        <main id="page" class="page"></main>
      </div>
      <div id="modal-root"></div>
    `;
  }
  function renderDashboard(page) {
    const ro = isViewer();
    page.innerHTML = `
      <section id="status-strip" class="status-strip"></section>
      <section class="dashboard-grid">
        <aside class="card incident-panel">
          <h2 class="panel-title">Incident Queue</h2>
          <div class="filter-wrap">
            <label class="sr-only" for="incident-filter">Filter incidents by type</label>
            <select id="incident-filter">
              <option value="All">All types</option>
              ${TYPES.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}
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
        <article class="card"><h3 class="panel-title">Drone Telemetry</h3><div id="telemetry-widget" class="telemetry-grid"></div></article>
        <article class="card"><h3 class="panel-title">Computer Vision</h3><div id="vision-widget"></div></article>
        <article class="card"><h3 class="panel-title">Audio/Transcript</h3><div id="transcript-widget"></div></article>
      </section>

      <details class="demo-panel" open>
        <summary>Demo Controls</summary>
        <div class="demo-grid">
          <label>Incident Type<select id="demo-type" ${ro ? "disabled" : ""}>${TYPES.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}</select></label>
          <label>Severity<select id="demo-severity" ${ro ? "disabled" : ""}>${SEVERITIES.map((s) => `<option value="${s}">${s}</option>`).join("")}</select></label>
          <button type="button" data-action="trigger-incident" ${ro ? "disabled" : ""}>Trigger New Incident</button>
          <button type="button" data-action="auto-run" ${ro ? "disabled" : ""}>Auto-run Scenario</button>
          <label class="toggle"><input type="checkbox" data-demo-toggle="faceRecognized" ${state.flags.faceRecognized ? "checked" : ""} ${ro ? "disabled" : ""} />Face recognized</label>
          <label class="toggle"><input type="checkbox" data-demo-toggle="motionDetected" ${state.flags.motionDetected ? "checked" : ""} ${ro ? "disabled" : ""} />Motion detected</label>
          <label class="toggle"><input type="checkbox" data-demo-toggle="highHeat" ${state.flags.highHeat ? "checked" : ""} ${ro ? "disabled" : ""} />High heat</label>
          <label class="toggle"><input type="checkbox" data-demo-toggle="networkDegraded" ${state.flags.networkDegraded ? "checked" : ""} ${ro ? "disabled" : ""} />Network degraded</label>
        </div>
        ${ro ? '<p class="helper">Viewer role is read-only. Switch to Admin or Operator to run scenarios.</p>' : ""}
      </details>
    `;

    const f = document.getElementById("incident-filter");
    if (f) {
      f.value = ui.filter;
      f.addEventListener("change", () => {
        ui.filter = f.value;
        renderQueue();
      });
    }

    renderStatus();
    renderQueue();
    renderAI();
    renderTelemetry();
    renderVision();
    renderTranscript();
    initMap();
  }

  function renderStatus() {
    const el = document.getElementById("status-strip");
    if (!el) return;
    const open = state.anomalies.filter((a) => a.status === "Open").length;
    const health = open > 0 ? "Monitor" : "Nominal";
    const net = state.flags.networkDegraded ? "Degraded" : "Stable";
    const conn = state.drones.filter((d) => d.status !== "Disconnected").length;
    const t = tile;
    el.innerHTML =
      t("System health", health, open ? "status-warn" : "status-ok") +
      t("Encryption", "ON", "status-ok") +
      t("Backup countdown", fmtDuration(backupLeft()), "") +
      t("Network", net, state.flags.networkDegraded ? "status-warn" : "status-ok") +
      t("Connected drones", `${conn}/${state.drones.length}`, conn < state.drones.length ? "status-warn" : "status-ok");
  }

  function tile(label, val, klass) {
    return `<div class="status-item"><div class="status-label">${label}</div><div class="status-value ${klass}">${esc(val)}</div></div>`;
  }

  function renderQueue() {
    const el = document.getElementById("incident-list");
    if (!el) return;
    const list = state.incidents
      .filter((i) => (ui.filter === "All" ? true : i.type === ui.filter))
      .sort((a, b) => (SCORE[b.severity] - SCORE[a.severity]) || (b.createdAt - a.createdAt));
    if (!list.length) {
      el.innerHTML = `<div class="empty-state">No incidents in queue for the selected type.</div>`;
      return;
    }

    el.innerHTML = list.map((i) => {
      const canDispatch = canOperate() && !i.assignedDroneId && i.status !== "Resolved";
      return `
        <article class="incident-card">
          <header><span class="incident-type">${esc(i.type)}</span><span class="badge ${sevClass(i.severity)}">${esc(i.severity)}</span></header>
          <div class="incident-meta">
            <span>Location: ${esc(i.locationName)}</span>
            <span>Time: ${fmtDate(i.createdAt)}</span>
            <span>Assigned drone: ${esc(i.assignedDroneId || "Unassigned")}</span>
            <span>Status: ${esc(i.status)}</span>
          </div>
          <div class="action-row">
            <button type="button" class="link-btn" data-action="focus-incident" data-id="${i.id}">Focus AI</button>
            <a class="nav-link" href="#/incident?id=${i.id}">Open</a>
            <button type="button" class="ghost-btn" data-action="dispatch-incident" data-id="${i.id}" ${canDispatch ? "" : "disabled"}>Dispatch</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderAI() {
    const el = document.getElementById("ai-panel-content");
    if (!el) return;
    const i = activeIncident();
    if (!i) {
      el.innerHTML = `<div class="empty-state">No incidents. Trigger a new incident to generate recommendations.</div>`;
      return;
    }
    const pb = PLAYBOOK[i.type] || PLAYBOOK["Medical Emergency"];
    const list = pb.checklist.slice();
    if (state.flags.networkDegraded) list.push("Switch command link to fallback mesh and confirm encryption handshake.");
    if (state.flags.highHeat && i.type === "Fire/Rescue") list.push("Heat threshold exceeded; prep high-pressure suppression and perimeter expansion.");
    if (i.peopleRecognized.length) list.push("Confirm recognized identity with responder unit before field action.");
    const d = i.assignedDroneId ? state.drones.find((x) => x.id === i.assignedDroneId) : null;
    const eta = d ? `${Math.max(1, hav(d.lat, d.lng, i.lat, i.lng) / 0.65).toFixed(1)} min` : "Awaiting drone assignment";

    el.innerHTML = `
      <p class="tone">${esc(pb.tone)}</p>
      <ul class="ai-list">${list.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <div class="plan-box">
        <strong>Dispatch plan</strong>
        <div class="kv"><span>Route ETA</span><span>${eta}</span></div>
        <div class="kv"><span>Suggested responders</span><span>${esc(pb.responders.join(", "))}</span></div>
        <p class="helper">Next 3 actions</p>
        <ol class="actions-list">${pb.next.slice(0, 3).map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
      </div>
      <div class="action-row"><a class="nav-link" href="#/incident?id=${i.id}">Open ${i.id}</a></div>
    `;
  }

  function renderTelemetry() {
    const el = document.getElementById("telemetry-widget");
    if (!el) return;
    if (!state.drones.length) {
      el.innerHTML = `<div class="empty-state">No drones connected.</div>`;
      return;
    }
    el.innerHTML = state.drones.map((d) => `
      <div class="telemetry-item">
        <strong>${esc(d.id)} · ${esc(d.status)}</strong>
        <div class="kv"><span>Battery</span><span>${d.battery.toFixed(0)}%</span></div>
        <div class="kv"><span>Temperature</span><span>${d.sensors.temp.toFixed(1)} C</span></div>
        <div class="kv"><span>Motion</span><span>${d.sensors.motion ? "Detected" : "Clear"}</span></div>
        <div class="kv"><span>Pump pressure</span><span>${d.sensors.pumpPressure.toFixed(0)} psi</span></div>
        <div class="kv"><span>Mic</span><span>${esc(d.sensors.mic)}</span></div>
      </div>
    `).join("");
  }

  function renderVision() {
    const el = document.getElementById("vision-widget");
    if (!el) return;
    const i = activeIncident();
    const hits = i ? i.peopleRecognized.slice(-4).reverse() : [];
    const motion = state.flags.motionDetected || state.drones.some((d) => d.sensors.motion);
    el.innerHTML = `
      <div class="log-line"><strong>Motion detection alert:</strong> ${motion ? "ACTIVE" : "No movement anomaly"}</div>
      <div class="scroll-list">
        ${hits.length ? hits.map((h) => `<div class="log-line"><div><strong>${esc(h.name)}</strong> (${esc(h.id)})</div><div class="log-time">Confidence ${Number(h.confidence).toFixed(1)}% · ${fmtTime(h.time)}</div></div>`).join("") : '<div class="empty-state">No face recognition hits for the active incident.</div>'}
      </div>
    `;
  }

  function renderTranscript() {
    const el = document.getElementById("transcript-widget");
    if (!el) return;
    const i = activeIncident();
    if (!i || !i.transcript.length) {
      el.innerHTML = `<div class="empty-state">No incoming transcript lines.</div>`;
      return;
    }
    el.innerHTML = `<div class="scroll-list">${i.transcript.slice(-8).reverse().map((l) => `<div class="log-line"><div class="log-time">${fmtTime(l.time)}</div><div>${esc(l.text)}</div></div>`).join("")}</div>`;
  }

  function initMap() {
    const el = document.getElementById("map");
    if (!el) return;
    if (!window.L) {
      el.innerHTML = '<div class="empty-state">Map failed to initialize (Leaflet unavailable).</div>';
      return;
    }
    destroyMap();
    map.obj = window.L.map(el).setView([BASE.lat, BASE.lng], 14);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map.obj);
    map.geofence = window.L.circle([BASE.lat, BASE.lng], { radius: 2500, color: "#0e8f78", fillColor: "#0e8f78", fillOpacity: 0.08 }).addTo(map.obj);
    map.geofence.bindPopup("Campus/Public Safety Geofence");
    updateMap();
    setTimeout(() => map.obj && map.obj.invalidateSize(), 120);
  }

  function destroyMap() {
    if (!map.obj) return;
    map.obj.remove();
    map = { obj: null, drones: {}, incidents: {}, geofence: null };
  }

  function updateMap() {
    if (!map.obj || !window.L) return;

    const dset = new Set();
    state.drones.forEach((d) => {
      dset.add(d.id);
      const c = d.status === "Disconnected" ? "#c93f3f" : "#0e8f78";
      if (!map.drones[d.id]) {
        map.drones[d.id] = window.L.circleMarker([d.lat, d.lng], { radius: 8, color: c, fillColor: c, fillOpacity: 0.8 }).addTo(map.obj);
      }
      map.drones[d.id].setLatLng([d.lat, d.lng]);
      map.drones[d.id].setStyle({ color: c, fillColor: c });
      map.drones[d.id].bindPopup(`<strong>${esc(d.id)}</strong><br/>Status: ${esc(d.status)}<br/>Battery: ${d.battery.toFixed(0)}%<br/>Temp: ${d.sensors.temp.toFixed(1)} C`);
    });
    Object.keys(map.drones).forEach((id) => {
      if (!dset.has(id)) {
        map.obj.removeLayer(map.drones[id]);
        delete map.drones[id];
      }
    });

    const iset = new Set();
    state.incidents.forEach((i) => {
      iset.add(i.id);
      const c = i.status === "Resolved" ? "#6f7f88" : i.status === "On Scene" ? "#208450" : (i.status === "Dispatched" || i.status === "En Route") ? "#d18924" : "#c93f3f";
      const boost =
        (i.id === ui.selected ? 1 : 0) +
        (state.flags.motionDetected ? 1 : 0) +
        (state.flags.highHeat ? 2 : 0) +
        (i.peopleRecognized.length ? 1 : 0);
      const radius = Math.min(14, 8 + boost);
      if (!map.incidents[i.id]) {
        map.incidents[i.id] = window.L.circleMarker([i.lat, i.lng], { radius, color: c, fillColor: c, fillOpacity: 0.55 }).addTo(map.obj);
      }
      map.incidents[i.id].setLatLng([i.lat, i.lng]);
      map.incidents[i.id].setStyle({ color: c, fillColor: c, radius });
      map.incidents[i.id].bindPopup(`<strong>${esc(i.id)}</strong><br/>${esc(i.type)} (${esc(i.severity)})<br/>Status: ${esc(i.status)}<br/><a href="#/incident?id=${i.id}">Open details</a>`);
    });
    Object.keys(map.incidents).forEach((id) => {
      if (!iset.has(id)) {
        map.obj.removeLayer(map.incidents[id]);
        delete map.incidents[id];
      }
    });
  }
  function renderIncident(page, id) {
    const i = state.incidents.find((x) => x.id === id);
    if (!i) {
      page.innerHTML = `<section class="card"><h2>Incident Not Found</h2><p class="helper">The requested incident does not exist in local mock data.</p><a class="nav-link" href="#/dashboard">Back to dashboard</a></section>`;
      return;
    }

    ui.selected = i.id;
    const ro = isViewer();
    page.innerHTML = `
      <section class="card">
        <div class="incident-header">
          <div>
            <h2>Incident ${esc(i.id)} · ${esc(i.type)}</h2>
            <p class="helper">Location: ${esc(i.locationName)} · Created ${fmtDate(i.createdAt)}</p>
          </div>
          <a class="nav-link" href="#/dashboard">Back</a>
        </div>
        <div class="action-row">
          <span class="badge ${sevClass(i.severity)}">${esc(i.severity)}</span>
          <span>Status: <strong id="incident-status-text">${esc(i.status)}</strong></span>
          <span>Assigned drone: ${esc(i.assignedDroneId || "Unassigned")}</span>
        </div>
        <ul id="incident-timeline" class="timeline"></ul>
      </section>

      <section class="incident-layout">
        <article class="card">
          <h3 class="panel-title">Live Monitor</h3>
          <div class="video-feed"><div class="scan-line"></div><div><strong>Simulated live drone feed</strong><p class="helper">No external video required. Animated placeholder active.</p></div></div>
          <div class="action-row" style="margin-top: 0.7rem;"><button type="button" data-action="capture-snapshot" data-id="${i.id}" ${ro ? "disabled" : ""}>Snapshot</button></div>
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
      ${ro ? '<p class="helper">Viewer role is read-only. Interactive controls are disabled.</p>' : ""}
    `;

    renderIncidentTimeline(i);
    renderSnapshots(i);
    renderIncidentActions(i);
    renderIncidentLogs(i);
  }

  function renderIncidentTimeline(i) {
    const el = document.getElementById("incident-timeline");
    if (!el) return;
    el.innerHTML = i.timeline.slice().sort((a, b) => a.time - b.time).map((x) => `<li><div><strong>${esc(x.status)}</strong></div><div>${esc(x.note || "Status updated")}</div><div class="log-time">${fmtDate(x.time)}</div></li>`).join("");
  }

  function renderSnapshots(i) {
    const el = document.getElementById("snapshot-grid");
    if (!el) return;
    if (!i.snapshots.length) {
      el.innerHTML = `<div class="empty-state">No snapshots captured yet.</div>`;
      return;
    }
    el.innerHTML = i.snapshots.slice().reverse().map((s) => `<article class="snapshot-card"><strong>${esc(s.label)}</strong><div class="log-time">${fmtDate(s.time)}</div><div>Drone frame hash: ${esc(s.hash)}</div></article>`).join("");
  }

  function renderIncidentActions(i) {
    const el = document.getElementById("incident-actions");
    if (!el) return;
    const ro = isViewer();

    if (i.type === "Traffic Accident") {
      el.innerHTML = `<p class="helper">Traffic operation controls</p><div class="action-row"><button type="button" data-action="receipt" data-id="${i.id}" ${ro ? "disabled" : ""}>Generate violation receipt</button></div>`;
      return;
    }
    if (i.type === "Medical Emergency") {
      el.innerHTML = `<p class="helper">Medical support controls</p><div class="action-row"><button type="button" data-action="doctor-instructions" data-id="${i.id}" ${ro ? "disabled" : ""}>Send doctor instructions</button></div>`;
      return;
    }
    if (i.type === "Fire/Rescue") {
      el.innerHTML = `
        <p class="helper">Fire suppression controls</p>
        <div class="action-row">
          <button type="button" data-action="pump" data-level="30" data-id="${i.id}" ${ro ? "disabled" : ""}>Pump Low</button>
          <button type="button" data-action="pump" data-level="60" data-id="${i.id}" ${ro ? "disabled" : ""}>Pump Medium</button>
          <button type="button" data-action="pump" data-level="90" data-id="${i.id}" ${ro ? "disabled" : ""}>Pump High</button>
        </div>
        <p class="helper">Heat indicator: ${i.heatLevel.toFixed(0)} C</p>
        <div class="heat-meter"><div class="heat-fill" style="width:${Math.max(0, Math.min(100, 100 - i.heatLevel))}%;"></div></div>
      `;
      return;
    }
    if (i.type === "Event/Delivery") {
      el.innerHTML = `
        <p class="helper">Delivery payload controls</p>
        <div class="action-row"><button type="button" data-action="toggle-magnet" data-id="${i.id}" ${ro ? "disabled" : ""}>Magnetic payload/Grabber: ${i.payloadMagnetOn ? "ON" : "OFF"}</button></div>
        <p class="helper">Payload item list</p>
        <ul class="ai-list"><li>First-aid kit</li><li>Essential meds</li><li>Painkiller tools</li></ul>
      `;
      return;
    }
    el.innerHTML = `<p class="helper">Environmental response controls</p><div class="action-row"><button type="button" data-action="env-instructions" data-id="${i.id}" ${ro ? "disabled" : ""}>Push hazard advisory</button></div>`;
  }

  function renderIncidentLogs(i) {
    const el = document.getElementById("incident-log-list");
    if (!el) return;
    const rows = state.logs
      .filter((l) => l.incidentId === i.id || (!l.incidentId && ["api", "sensor"].includes(l.category)))
      .slice()
      .sort((a, b) => b.time - a.time);
    if (!rows.length) {
      el.innerHTML = `<div class="empty-state">No logs available for this incident.</div>`;
      return;
    }
    el.innerHTML = rows.map((l) => `<div class="log-line"><div>${esc(l.message)}</div><div class="log-time">${fmtDate(l.time)} · ${esc(l.actor || "System")}</div></div>`).join("");
  }

  function renderSecurity(page) {
    page.innerHTML = `
      <section class="card">
        <h2 class="panel-title">Cybersecurity Threat Model</h2>
        <div class="kpi-grid">
          ${secCard("Encrypted transport", "HTTPS/SSL simulated", "status-ok")}
          ${secCard("Encrypted at rest", "AES datastore simulation", "status-ok")}
          ${secCard("Role-based access", "Admin / Operator / Viewer", "")}
          ${secCard("Audit logs", "Append-only local log chain", "")}
          ${secCard("Backup cycle", "Every 12 hours", "")}
        </div>
      </section>

      <section class="incident-layout">
        <article class="card">
          <h3 class="panel-title">API Gateway (Mock)</h3>
          <table class="list-table">
            <thead><tr><th>Endpoint</th><th>Method</th><th>Last request</th><th>Status</th></tr></thead>
            <tbody id="api-gateway-body"></tbody>
          </table>
        </article>

        <article class="card">
          <h3 class="panel-title">Anomaly Alerts</h3>
          <div id="anomaly-list" class="scroll-list"></div>
        </article>
      </section>
    `;
    renderAPIGateway();
    renderAnomalies();
  }

  function secCard(label, val, k) {
    return `<article class="kpi-item"><div class="status-label">${label}</div><div class="status-value ${k}">${esc(val)}</div></article>`;
  }

  function renderAPIGateway() {
    const el = document.getElementById("api-gateway-body");
    if (!el) return;
    const rows = Object.values(state.apiGateway).sort((a, b) => a.endpoint.localeCompare(b.endpoint)).map((e) => `<tr><td>${esc(e.endpoint)}</td><td>${esc(e.method || "GET")}</td><td>${e.lastRequest ? fmtDate(e.lastRequest) : "No requests yet"}</td><td>${e.status || 200}</td></tr>`).join("");
    el.innerHTML = rows || `<tr><td colspan="4">No API gateway activity.</td></tr>`;
  }

  function renderAnomalies() {
    const el = document.getElementById("anomaly-list");
    if (!el) return;
    if (!state.anomalies.length) {
      el.innerHTML = `<div class="empty-state">No anomaly alerts.</div>`;
      return;
    }
    el.innerHTML = state.anomalies.slice().sort((a, b) => b.time - a.time).slice(0, 12).map((a) => `
      <div class="log-line anomaly-item">
        <div><strong>${esc(a.type)}</strong> · ${esc(a.severity)}</div>
        <div>${esc(a.description)}</div>
        <div class="log-time">${fmtDate(a.time)} · ${esc(a.status)}</div>
        ${a.status === "Open" && canOperate() ? `<button type="button" class="ghost-btn" data-action="ack-anomaly" data-id="${a.id}">Acknowledge</button>` : ""}
      </div>
    `).join("");
  }

  function renderReports(page) {
    page.innerHTML = `
      <section class="card">
        <h2 class="panel-title">Operational Impact Reports</h2>
        <div id="kpi-grid" class="kpi-grid"></div>
        <div class="action-row" style="margin-top: 0.7rem;"><button type="button" data-action="print-report">Print report</button></div>
      </section>

      <section class="card chart-wrap">
        <h3 class="panel-title">Incidents by Type</h3>
        <div id="report-chart"></div>
      </section>

      <section class="card">
        <h3 class="panel-title">Recent Incident Summary</h3>
        <table class="list-table">
          <thead><tr><th>ID</th><th>Type</th><th>Status</th><th>Response</th></tr></thead>
          <tbody id="report-table-body"></tbody>
        </table>
      </section>
    `;
    renderReportStats();
  }

  function renderReportStats() {
    const m = kpis();
    const k = document.getElementById("kpi-grid");
    if (k) {
      k.innerHTML =
        kpi("Average response time", `${m.avg.toFixed(1)} min`, m.avg < 4 ? "status-ok" : "status-warn") +
        kpi("Incidents handled", String(m.handled), "") +
        kpi("Drone uptime", `${m.uptime.toFixed(1)}%`, m.uptime >= 95 ? "status-ok" : "status-warn") +
        kpi("False positives", String(m.falsePositives), m.falsePositives === 0 ? "status-ok" : "status-warn");
    }

    const c = document.getElementById("report-chart");
    if (c) {
      const counts = TYPES.map((t) => ({ label: t, value: state.incidents.filter((i) => i.type === t).length }));
      const max = Math.max(1, ...counts.map((x) => x.value));
      c.innerHTML = counts.map((x) => `<div class="chart-row"><div>${esc(x.label)}</div><div class="chart-bar"><div class="chart-fill" style="width:${(x.value / max) * 100}%;"></div></div><div>${x.value}</div></div>`).join("");
    }

    const t = document.getElementById("report-table-body");
    if (t) {
      const rows = state.incidents.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 10).map((i) => {
        const rt = responseMins(i);
        return `<tr><td>${esc(i.id)}</td><td>${esc(i.type)}</td><td>${esc(i.status)}</td><td>${rt == null ? "In progress" : `${rt.toFixed(1)} min`}</td></tr>`;
      }).join("");
      t.innerHTML = rows || `<tr><td colspan="4">No incidents available.</td></tr>`;
    }
  }

  function kpi(label, val, cls) {
    return `<article class="kpi-item"><div class="status-label">${esc(label)}</div><div class="kpi-value ${cls}">${esc(val)}</div></article>`;
  }
  function onClick(ev) {
    const btn = ev.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");

    if (action === "logout") {
      setSession(null);
      ui.auto = false;
      timers.forEach(clearTimeout);
      timers = [];
      log("auth", "User logged out.", null, "System");
      location.hash = "#/login";
      return;
    }

    if (action === "theme-toggle") {
      setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
      if (route().path !== "/login") renderRoute();
      return;
    }

    if (action === "focus-incident") {
      ui.selected = id;
      renderAI();
      renderVision();
      renderTranscript();
      return;
    }

    if (action === "dispatch-incident") return dispatchIncident(id);

    if (action === "trigger-incident") {
      if (!canOperate()) return;
      const type = (document.getElementById("demo-type") || {}).value || TYPES[0];
      const sev = (document.getElementById("demo-severity") || {}).value || "Medium";
      createIncident(type, sev);
      return refresh();
    }

    if (action === "auto-run") return runScenario();
    if (action === "capture-snapshot") return capture(id);

    if (action === "receipt") {
      if (isViewer()) return;
      const i = findIncident(id);
      if (i) showReceipt(i);
      return;
    }

    if (action === "close-modal") {
      const m = document.getElementById("modal-root");
      if (m) m.innerHTML = "";
      return;
    }

    if (action === "print-receipt") {
      api("/reports/export", "GET", 200);
      return window.print();
    }

    if (action === "doctor-instructions") {
      if (!canOperate()) return;
      transcript(id, "Doctor instructions: maintain airway, monitor breathing, apply pressure to active bleeding points.", "Medical Desk");
      log("operator", `Doctor instructions sent for ${id}.`, id);
      api("/incidents/list", "POST", 200);
      return refresh();
    }

    if (action === "pump") {
      if (!canOperate()) return;
      return setPump(id, Number(btn.getAttribute("data-level") || 0));
    }

    if (action === "toggle-magnet") {
      if (!canOperate()) return;
      const i = findIncident(id);
      if (!i) return;
      i.payloadMagnetOn = !i.payloadMagnetOn;
      log("operator", `Magnetic payload/Grabber turned ${i.payloadMagnetOn ? "ON" : "OFF"} for ${i.id}.`, i.id);
      transcript(i.id, `Payload channel update: magnetic grabber ${i.payloadMagnetOn ? "engaged" : "released"}.`, "Payload Control", false);
      persist();
      return refresh();
    }

    if (action === "env-instructions") {
      if (!canOperate()) return;
      transcript(id, "Hazard advisory sent: avoid low ground sectors until clearance notice.", "Command");
      log("operator", `Environmental advisory pushed for ${id}.`, id);
      return refresh();
    }

    if (action === "ack-anomaly") {
      if (!canOperate()) return;
      const a = state.anomalies.find((x) => x.id === id);
      if (!a || a.status !== "Open") return;
      a.status = "Resolved";
      a.resolvedAt = Date.now();
      log("security", `Anomaly acknowledged: ${a.type}.`, null, currentUser().name);
      persist();
      renderAnomalies();
      renderStatus();
      return;
    }

    if (action === "print-report") {
      api("/reports/export", "GET", 200);
      log("reports", "Report print action triggered.", null, currentUser().name);
      return window.print();
    }
  }

  function onChange(ev) {
    const t = ev.target.closest("[data-demo-toggle]");
    if (!t) return;
    if (!canOperate()) {
      t.checked = false;
      return;
    }
    const key = t.getAttribute("data-demo-toggle");
    const val = !!t.checked;
    state.flags[key] = val;
    const i = activeIncident();

    if (key === "faceRecognized" && val) {
      faceHit();
      if (i) i.timeline.push({ time: Date.now(), status: i.status, note: "Face recognition toggle enabled for active watch." });
    }

    if (key === "motionDetected") {
      state.drones.forEach((d) => (d.sensors.motion = val));
      log("sensor", `Motion detection ${val ? "enabled" : "cleared"}.`);
      if (i) {
        i.timeline.push({ time: Date.now(), status: i.status, note: `Motion detection ${val ? "enabled" : "cleared"} by operator.` });
        transcript(i.id, `Motion detection ${val ? "ACTIVE" : "cleared"} on drone sensor channel.`, "Sensor Bus", false);
      }
    }

    if (key === "highHeat") {
      state.incidents.forEach((i) => {
        if (i.type === "Fire/Rescue" || i.type === "Environmental/Disaster Monitoring") i.heatLevel = val ? Math.max(i.heatLevel, 90) : Math.min(i.heatLevel, 58);
      });
      state.drones.forEach((d) => (d.sensors.temp = val ? Math.max(d.sensors.temp, 79) : Math.min(d.sensors.temp, 42)));
      log("sensor", `Heat profile ${val ? "elevated" : "normalized"}.`);
      if (i) {
        i.timeline.push({ time: Date.now(), status: i.status, note: `Heat profile ${val ? "elevated" : "normalized"} by demo control.` });
        transcript(i.id, `Thermal channel ${val ? "spike detected" : "returned to nominal range"}.`, "Thermal", false);
      }
    }

    if (key === "networkDegraded") {
      if (val) anomaly("network-degraded", "Network degraded", "High", "Packet loss threshold exceeded. Fallback route monitoring active.", "Switch active operations to resilient mesh path.");
      else {
        resolveAnomaly("network-degraded");
        log("security", "Network status recovered to stable.");
      }
      if (i) {
        i.timeline.push({ time: Date.now(), status: i.status, note: `Network ${val ? "degraded" : "stabilized"}; secure channel ${val ? "fallback active" : "restored"}.` });
        transcript(i.id, `Network status ${val ? "DEGRADED" : "stable"} for command uplink.`, "Network", false);
      }
    }

    persist();
    refresh();
  }

  function createIncident(type, severity) {
    const id = genIncidentId();
    const lat = BASE.lat + (Math.random() - 0.5) * 0.045;
    const lng = BASE.lng + (Math.random() - 0.5) * 0.045;
    const i = {
      id,
      type,
      severity,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      locationName: pick(LOC[type] || ["Urban Sector"]),
      createdAt: Date.now(),
      status: "Alerted",
      assignedDroneId: null,
      peopleRecognized: [],
      transcript: [{ time: Date.now(), text: `${type} alert entered queue.` }],
      timeline: [{ time: Date.now(), status: "Alerted", note: "Alert captured by emergency intake." }],
      snapshots: [],
      payloadMagnetOn: false,
      falsePositive: false,
      heatLevel: type === "Fire/Rescue" ? 78 : 36
    };
    state.incidents.unshift(i);
    ui.selected = i.id;
    log("incident", `New incident ${i.id} created (${i.type}, ${i.severity}).`, i.id);
    api("/incidents/list", "POST", 201);
    persist();
    return i;
  }

  function dispatchIncident(id) {
    if (!canOperate()) return;
    const i = findIncident(id);
    if (!i) return;
    if (i.assignedDroneId) {
      log("dispatch", `Dispatch skipped: ${i.id} already assigned to ${i.assignedDroneId}.`, i.id);
      return;
    }

    const d = state.drones
      .filter((x) => x.status !== "Disconnected")
      .sort((a, b) => b.battery - a.battery)
      .find((x) => ["Idle", "Returning", "On Patrol"].includes(x.status));

    if (!d) {
      anomaly("no-drone", "Drone availability warning", "High", `No available drone for incident ${i.id}.`, "Escalate to human responder dispatch only.");
      log("dispatch", `No available drone for ${i.id}.`, i.id);
      return refresh();
    }

    d.status = "En Route";
    d.target = { lat: i.lat, lng: i.lng, incidentId: i.id };
    i.assignedDroneId = d.id;
    status(i, "Dispatched", `Drone ${d.id} dispatched.`);
    transcript(i.id, `Command: ${d.id} launched toward ${i.locationName}.`, "Command", false);
    log("dispatch", `Drone ${d.id} assigned to ${i.id}.`, i.id);
    api("/dispatch/start", "POST", 202);
    persist();
    refresh();
  }

  function runScenario() {
    if (!canOperate() || ui.auto) return;
    const i = activeIncident() || createIncident("Medical Emergency", "High");
    ui.selected = i.id;
    ui.auto = true;
    timers.forEach(clearTimeout);
    timers = [];

    log("operator", `Auto-run scenario started for ${i.id}.`, i.id, currentUser().name);
    const steps = [
      { at: 0, fn: () => { transcript(i.id, "Command: alert acknowledged; validating route and responder availability.", "Command", false); status(i, "Alerted", "Incident accepted into dispatch flow."); } },
      { at: 2500, fn: () => dispatchIncident(i.id) },
      { at: 6000, fn: () => { status(i, "En Route", "Drone transit confirmed; responders notified."); transcript(i.id, "Drone: en route telemetry stable, ETA recalculating every 5 seconds.", "Drone", false); } },
      { at: 9500, fn: () => { status(i, "On Scene", "Drone reached location and started active monitoring."); transcript(i.id, "Command: drone on scene, live feed and telemetry now active.", "Command", false); if (state.flags.faceRecognized) faceHit(); } },
      { at: 13500, fn: () => { status(i, "Resolved", "Scene stabilized and handed over to local responders."); transcript(i.id, "Operator: incident resolved, evidence archived, drone returning to base.", "Operator", false); log("operator", `Auto-run scenario completed for ${i.id}.`, i.id, currentUser().name); ui.auto = false; persist(); } }
    ];

    steps.forEach((s) => timers.push(setTimeout(() => { s.fn(); refresh(); }, s.at)));
    timers.push(setTimeout(() => { ui.auto = false; persist(); refresh(); }, 14200));
    refresh();
  }

  function capture(id) {
    if (!canOperate()) return;
    const i = findIncident(id);
    if (!i) return;
    i.snapshots.push({ id: `SNAP-${Date.now()}`, label: "Snapshot capture", time: Date.now(), hash: Math.random().toString(16).slice(2, 10).toUpperCase() });
    log("evidence", `Snapshot captured for ${i.id}.`, i.id, currentUser().name);
    api("/incidents/list", "POST", 200);
    persist();
    refresh();
  }

  function showReceipt(i) {
    const root = document.getElementById("modal-root");
    if (!root) return;
    const hit = i.peopleRecognized.length ? i.peopleRecognized[i.peopleRecognized.length - 1] : null;
    root.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-label="Violation receipt">
        <section class="card modal-card">
          <h3>Violation Receipt (Simulated Drone Print)</h3>
          <p class="helper">Incident ${esc(i.id)} · ${esc(i.locationName)}</p>
          <table class="list-table">
            <tr><th>Type</th><td>${esc(i.type)}</td></tr>
            <tr><th>Severity</th><td>${esc(i.severity)}</td></tr>
            <tr><th>Timestamp</th><td>${fmtDate(Date.now())}</td></tr>
            <tr><th>Assigned drone</th><td>${esc(i.assignedDroneId || "Unassigned")}</td></tr>
            <tr><th>Recognition match</th><td>${hit ? `${esc(hit.name)} (${esc(hit.id)})` : "No match"}</td></tr>
          </table>
          <div class="action-row" style="margin-top: 0.8rem; justify-content: flex-end;"><button type="button" data-action="print-receipt">Print</button><button type="button" class="ghost-btn" data-action="close-modal">Close</button></div>
        </section>
      </div>
    `;
    log("evidence", `Violation receipt generated for ${i.id}.`, i.id, currentUser().name);
  }

  function setPump(id, psi) {
    const i = findIncident(id);
    if (!i) return;
    const d = state.drones.find((x) => x.id === i.assignedDroneId);
    if (d) {
      d.sensors.pumpPressure = psi;
      d.sensors.temp = Math.max(30, d.sensors.temp - psi / 35);
    }
    i.heatLevel = Math.max(25, i.heatLevel - psi / 9);
    log("operator", `Pump pressure set to ${psi} psi for ${i.id}.`, i.id, currentUser().name);
    transcript(i.id, `Pump control: pressure set to ${psi} psi.`, "Suppression Control", false);
    persist();
    refresh();
  }
  function faceHit() {
    const i = activeIncident();
    if (!i) return;
    const p = pick(PEOPLE);
    const hit = { name: p.name, id: p.id, confidence: Number((88 + Math.random() * 11).toFixed(1)), time: Date.now() };
    i.peopleRecognized.push(hit);
    transcript(i.id, `Vision engine: match found for ${hit.name} (${hit.confidence}% confidence).`, "Vision", false);
    log("ai", `Face recognition hit: ${hit.name} (${hit.id}) ${hit.confidence}%.`, i.id);
    api("/vision/face-match", "POST", 200);
    persist();
  }

  function status(i, next, note) {
    if (!i || i.status === next) return;
    i.status = next;
    i.timeline.push({ time: Date.now(), status: next, note: note || "Status update" });
    if (next === "Resolved") {
      const d = state.drones.find((x) => x.id === i.assignedDroneId);
      if (d) {
        d.status = "Returning";
        d.target = { lat: BASE.lat, lng: BASE.lng, incidentId: null };
      }
    }
    log("incident", `${i.id} status changed to ${next}. ${note || ""}`.trim(), i.id);
    persist();
  }

  function anomaly(key, type, severity, description, response) {
    const ex = state.anomalies.find((a) => a.key === key && a.status === "Open");
    if (ex) {
      ex.time = Date.now();
      ex.description = description;
      ex.response = response;
      persist();
      return;
    }
    state.anomalies.unshift({ id: `ANOM-${Date.now()}-${Math.floor(Math.random() * 1000)}`, key, time: Date.now(), type, severity, status: "Open", description, response, resolvedAt: null });
    log("security", `Anomaly detected: ${type}. ${description}`);
    api("/security/anomaly", "POST", 202);
    persist();
  }

  function resolveAnomaly(key) {
    const a = state.anomalies.find((x) => x.key === key && x.status === "Open");
    if (!a) return;
    a.status = "Resolved";
    a.resolvedAt = Date.now();
    persist();
  }

  function transcript(id, text, actor = "Comms", withLog = true) {
    const i = findIncident(id);
    if (!i) return;
    i.transcript.push({ time: Date.now(), text });
    if (withLog) log("audio", `${actor}: ${text}`, id, actor);
    persist();
  }

  function log(category, message, incidentId = null, actor) {
    state.logs.push({ id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`, time: Date.now(), category, incidentId, actor: actor || (state.session ? state.session.name : "System"), message });
    persist();
  }

  function api(endpoint, method = "GET", statusCode = 200) {
    const e = state.apiGateway[endpoint] || { endpoint, method, lastRequest: null, status: statusCode };
    e.endpoint = endpoint;
    e.method = method || e.method || "GET";
    e.lastRequest = Date.now();
    e.status = statusCode || 200;
    state.apiGateway[endpoint] = e;
    log("api", `${e.method} ${endpoint} -> ${e.status}`, null, "API Gateway");
  }

  function startTicker() {
    if (ticker) clearInterval(ticker);
    ticker = setInterval(() => {
      backupTick();
      droneTick();
      feedTick();
      liveRefresh();
    }, TICK_MS);
  }

  function backupTick() {
    if (Date.now() - state.backupStart < BACKUP_MS) return;
    state.backupStart = Date.now();
    log("system", "Scheduled encrypted backup completed and archived.");
    api("/backup/run", "POST", 200);
  }

  function droneTick() {
    state.drones.forEach((d) => {
      if (d.status === "Disconnected") return;

      if (d.target) {
        const dx = d.target.lat - d.lat;
        const dy = d.target.lng - d.lng;
        d.lat += dx * 0.07;
        d.lng += dy * 0.07;
        if (Math.abs(dx) < 0.0002 && Math.abs(dy) < 0.0002) {
          if (d.target.incidentId) {
            const i = findIncident(d.target.incidentId);
            if (i && i.status !== "Resolved") {
              d.status = "On Scene";
              status(i, "On Scene", `Drone ${d.id} arrived at incident location.`);
            }
          } else {
            d.status = "Idle";
            d.target = null;
          }
        }
      } else if (d.status === "Idle") {
        d.lat += (Math.random() - 0.5) * 0.00015;
        d.lng += (Math.random() - 0.5) * 0.00015;
      }

      d.battery = ["On Scene", "En Route", "Returning"].includes(d.status) ? Math.max(5, d.battery - 0.07) : Math.min(100, d.battery + 0.03);
      if (state.flags.motionDetected) d.sensors.motion = true;
      if (state.flags.highHeat) d.sensors.temp = Math.max(d.sensors.temp, 78);
      else d.sensors.temp += (34 - d.sensors.temp) * 0.04;

      if (d.battery <= 15) anomaly(`battery-${d.id}`, "Drone low battery", "Medium", `${d.id} battery below 15%.`, "Recall drone and assign nearest backup unit.");
      if (d.battery <= 5.5) {
        d.status = "Disconnected";
        anomaly(`disconnect-${d.id}`, "Drone disconnect", "High", `${d.id} disconnected due to critically low battery.`, "Switch to alternate drone and investigate power subsystem.");
      }
    });
    persist();
  }

  function feedTick() {
    if (Math.random() > 0.14) return;
    const i = activeIncident();
    if (!i || i.status === "Resolved") return;
    transcript(i.id, pick(FEED), "Comms", false);
  }

  function liveRefresh() {
    const r = route();
    if (r.path === "/dashboard") {
      renderStatus();
      renderQueue();
      renderAI();
      renderTelemetry();
      renderVision();
      renderTranscript();
      updateMap();
      const b = document.querySelector('[data-action="auto-run"]');
      if (b) b.textContent = ui.auto ? "Auto-running..." : "Auto-run Scenario";
    }
    if (r.path === "/incident") {
      const i = findIncident(r.params.get("id"));
      if (i) {
        const s = document.getElementById("incident-status-text");
        if (s) s.textContent = i.status;
        renderIncidentTimeline(i);
        renderSnapshots(i);
        renderIncidentActions(i);
        renderIncidentLogs(i);
      }
    }
    if (r.path === "/security") {
      renderAPIGateway();
      renderAnomalies();
    }
    if (r.path === "/reports") renderReportStats();
  }

  function refresh() {
    const r = route();
    if (r.path === "/dashboard") {
      renderStatus();
      renderQueue();
      renderAI();
      renderTelemetry();
      renderVision();
      renderTranscript();
      updateMap();
      return;
    }
    if (r.path === "/incident") {
      const i = findIncident(r.params.get("id"));
      if (!i) return;
      renderIncidentTimeline(i);
      renderSnapshots(i);
      renderIncidentActions(i);
      renderIncidentLogs(i);
      return;
    }
    if (r.path === "/security") {
      renderAPIGateway();
      renderAnomalies();
      return;
    }
    if (r.path === "/reports") renderReportStats();
  }

  function activeIncident() {
    const sel = state.incidents.find((i) => i.id === ui.selected);
    if (sel) return sel;
    return state.incidents.slice().sort((a, b) => {
      if (a.status === "Resolved" && b.status !== "Resolved") return 1;
      if (a.status !== "Resolved" && b.status === "Resolved") return -1;
      return (SCORE[b.severity] - SCORE[a.severity]) || (b.createdAt - a.createdAt);
    })[0] || null;
  }

  function kpis() {
    const values = state.incidents.map(responseMins).filter((x) => x != null);
    const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const handled = state.incidents.filter((i) => i.status === "Resolved" || i.status === "Closed").length;
    const disconnectOpen = state.anomalies.filter((a) => a.status === "Open" && (a.type === "Drone disconnect" || String(a.key).startsWith("disconnect-"))).length;
    const uptime = Math.max(88, 99.2 - disconnectOpen * 1.4 - (state.flags.networkDegraded ? 1.6 : 0));
    const falsePositives = state.incidents.filter((i) => i.falsePositive).length;
    return { avg, handled, uptime, falsePositives };
  }

  function responseMins(i) {
    const a = (i.timeline || []).find((x) => x.status === "Alerted");
    const b = (i.timeline || []).find((x) => x.status === "On Scene");
    if (!a || !b || b.time < a.time) return null;
    return (b.time - a.time) / 60000;
  }

  function backupLeft() {
    const elapsed = Date.now() - state.backupStart;
    return BACKUP_MS - (elapsed % BACKUP_MS);
  }

  function fmtDuration(ms) {
    const sec = Math.max(0, Math.floor(ms / 1000));
    const h = String(Math.floor(sec / 3600)).padStart(2, "0");
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function hav(a1, o1, a2, o2) {
    const r = (x) => (x * Math.PI) / 180;
    const R = 6371;
    const d1 = r(a2 - a1);
    const d2 = r(o2 - o1);
    const q = Math.sin(d1 / 2) ** 2 + Math.cos(r(a1)) * Math.cos(r(a2)) * Math.sin(d2 / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
  }

  function findIncident(id) {
    return state.incidents.find((i) => i.id === id);
  }

  function currentUser() {
    return state.session || { name: "Unknown", role: "Viewer" };
  }

  function canOperate() {
    return ["Admin", "Operator"].includes(currentUser().role);
  }

  function isViewer() {
    return currentUser().role === "Viewer";
  }

  function sevClass(s) {
    if (s === "Critical") return "badge-critical";
    if (s === "High") return "badge-high";
    if (s === "Medium") return "badge-medium";
    return "badge-low";
  }

  function genIncidentId() {
    let id;
    do id = `INC${Math.floor(100 + Math.random() * 900)}`;
    while (state.incidents.some((i) => i.id === id));
    return id;
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function esc(v) {
    return String(v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
