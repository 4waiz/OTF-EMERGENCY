# OTF Emergency Control (Demo Prototype)

A zero-backend, single-page prototype for the **OTF/AAU Emergency assistant** concept.

## What this demo shows

- Mock role-based login: **Admin**, **Operator**, **Viewer**
- End-to-end emergency workflow: alert -> dispatch -> live monitoring -> AI recommendations -> logs/reporting
- Moving drone + incident map with **Leaflet + OpenStreetMap** (no API key)
- Incident detail controls by type (traffic, medical, fire, delivery, environmental)
- Security posture view (HTTPS/SSL simulation, RBAC, audit logs, anomaly detection)
- Reports/KPI page with printable output
- Local persistence with `localStorage` (session + mock data + append-only logs)

## Files

- `index.html` - SPA entry and CDN includes
- `styles.css` - responsive dashboard styling
- `app.js` - routing, mock data, simulation engine, UI updates
- `README.md` - run/demo instructions

## Run locally

1. Open `index.html` in a browser.
2. Login with any role:
   - Admin: full access
   - Operator: dispatch + monitoring
   - Viewer: read-only

No install, no npm, no API keys.

## Demo walkthrough (what to click)

1. Login as **Admin**.
2. On `#/dashboard`:
   - Review top status strip (health, encryption ON, backup countdown, network, connected drones).
   - Use **Demo Controls**:
     - Select type + severity, click **Trigger New Incident**.
     - Click **Auto-run Scenario** to see alert -> dispatch -> arrival -> resolution.
     - Toggle **Face recognized**, **Motion detected**, **High heat**, **Network degraded** and watch map/widgets/logs update.
3. Open any incident card -> `#/incident?id=...`:
   - Use **Snapshot**.
   - Try context-specific actions:
     - Traffic: **Generate violation receipt** (printable modal)
     - Medical: **Send doctor instructions**
     - Fire: **Pump Low/Medium/High**
     - Event/Delivery: **Magnetic payload/Grabber** toggle + item list
4. Open `#/security`:
   - Review threat model controls, API gateway last request times, anomaly alerts.
5. Open `#/reports`:
   - Review KPIs and chart.
   - Click **Print report** (simulated export via browser print).

## Notes

- The map depends on internet for OpenStreetMap tiles only.
- All other behavior is simulated offline in-browser.
- To reset demo data, clear browser localStorage for this page and reload.
