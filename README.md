# OTF Emergency Control (Neon Purple Demo)

Single-page prototype for the OTF/AAU Emergency assistant concept.

## Run

1. Open `index.html` in a browser.
2. Login with one of these usernames (case-insensitive) and password `123`:
   - `awaiz` -> **Awaiz Ahmed** (Admin)
   - `omar` -> **Omar** (Operator)
   - `anas` -> **Anas** (Viewer)

No npm, no backend, no API keys.

## Quick Navigation

- `#/login` - credential-locked login
- `#/dashboard` - command center (queue, map, AI, telemetry, transcript, demo controls)
- `#/incident?id=INC###` - incident detail controls and logs
- `#/security` - threat model, API gateway mock, anomaly alerts
- `#/reports` - KPIs, chart, print report

## What To Click In Demo

1. Login as `awaiz` for full controls.
2. On Dashboard:
   - Use **Trigger New Incident**.
   - Use **Auto-run Scenario**.
   - Toggle **Face recognized**, **Motion detected**, **High heat**, **Network degraded**.
3. Open an incident card:
   - Use **Snapshot**.
   - Try incident-specific actions (receipt, doctor instructions, pump levels, payload toggle).
4. Open Security and Reports from top nav.

## Notes

- Map uses Leaflet + OpenStreetMap tiles (internet needed for tiles only).
- Everything else is local mock data with `localStorage` persistence.
- All person identities in the app are restricted to: **Awaiz Ahmed**, **Omar**, **Anas**.
