# PulseSync — Real-Time Telemetry & Action Log

A three-part system: a React Native (Expo) app with ten number buttons, a Node/Express API that
ingests and stores each press as a time-series event, and a React admin dashboard that shows those
events live, with search, sort, and virtualized rendering.

```
pulsesync/
├── backend/     Express + TypeScript + SQLite API, JWT auth, WebSocket push
├── web/         React + Vite admin dashboard (TanStack Table/Virtual, Recharts)
├── mobile/      Expo / React Native app — 10-button screen
└── docker-compose.yml
```

## Why this shape (product/architecture notes)

**What gets recorded per button press, and why.** The brief deliberately leaves this open, so I
recorded enough to make the data useful for both engineering and product analysis without
over-fitting to a UI I don't have real requirements for:

| Field | Purpose |
|---|---|
| `buttonValue` (0–9) | The actual event |
| `deviceId` | Stable per-install identifier, generated once and cached on-device. Lets the dashboard distinguish devices without requiring user accounts. |
| `sessionId` | Regenerated per app launch. Lets you tell "10 presses in one sitting" apart from "10 presses across a week." |
| `serverTimestamp` | Set by the API on receipt — the authoritative value for sorting/ordering, immune to client clock skew. |
| `clientTimestamp` | Set on-device at press time — diffing this against `serverTimestamp` surfaces network latency or clock drift. |
| `platform`, `appVersion` | Cheap now, expensive to backfill later; keeps the schema iOS/web-ready without a migration. |

**Auth model.** Both clients hold a long-lived shared `API_KEY` (think of it as a deploy secret,
not a per-user credential — there's no login flow in a 10-button app). That key is exchanged for a
short-lived, role-scoped JWT (`device` or `admin`) via `POST /auth/token`. Only the JWT is used on
subsequent requests. This means the long-lived secret is never repeatedly sent over the wire, and
revoking access is one env var rotation away. `device` tokens can only write events; only `admin`
tokens can read the aggregate list/metrics or open the live WebSocket feed.

**Real-time.** The dashboard doesn't poll the event list. The backend pushes `event.created`
messages over a WebSocket to connected admin clients, and the dashboard invalidates its React
Query caches on receipt, with a 15s polling fallback on the metrics panel in case a socket drops.

**Rendering performance.** The event table fetches up to 500 rows matching the current
search/filter/sort and virtualizes the rendered rows with `@tanstack/react-virtual` — only the
rows in (or near) the viewport are ever mounted, so scrolling stays smooth regardless of dataset
size. Search is debounced (300ms) before hitting the API.

---

## Backend

**Stack:** Express + TypeScript, SQLite via `better-sqlite3` (zero external services to run this
case study; swap for Postgres trivially since all access goes through `db.ts`), JWT auth, `ws` for
the live feed, `zod` for request validation.

### Run locally

```bash
cd backend
cp .env.example .env      # edit API_KEY / JWT_SECRET for anything beyond local testing
npm install
npm run dev                # http://localhost:4000
```

### Test

```bash
npm test                   # vitest + supertest integration tests against a throwaway sqlite db
```

### Build & run in production mode

```bash
npm run build
npm start
```

### Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | none | Liveness check |
| POST | `/auth/token` | API key in body | Exchange `{ apiKey, deviceId, role }` for a JWT |
| POST | `/api/events` | Bearer JWT | Ingest one button-press event |
| GET | `/api/events` | Bearer JWT, `admin` | Paginated/sortable/searchable event retrieval |
| GET | `/api/metrics/aggregate` | Bearer JWT, `admin` | Rollup counts for the dashboard |
| WS | `/ws?token=` | `admin` JWT as query param | Live push of new events |

### Docker

```bash
cd backend
docker build -t pulsesync-backend .
docker run -p 4000:4000 -e API_KEY=your-key -e JWT_SECRET=your-secret pulsesync-backend
```

---

## Web dashboard

**Stack:** React 18 + Vite + TypeScript, TanStack Query (data fetching/cache), TanStack Table +
TanStack Virtual (sortable, virtualized event table), Recharts (aggregate bar chart).

### Run locally

```bash
cd web
cp .env.example .env      # VITE_API_URL — point at your backend
npm install
npm run dev                 # http://localhost:5173
```

On first load, paste the backend's `API_KEY` into the console's login screen — it's exchanged for
an admin JWT and stored in `localStorage`; the raw key itself is never persisted.

### Test / build

```bash
npm test
npm run build
```

### Docker

```bash
cd web
docker build -t pulsesync-web --build-arg VITE_API_URL=https://your-backend-url .
docker run -p 5173:80 pulsesync-web
```

---

## Mobile app (Android, Expo)

**Stack:** Expo SDK 51 / React Native 0.74 / TypeScript. Single screen, ten buttons, local
AsyncStorage-cached device ID + admin API key exchange identical to the web client's flow.

### Run locally (emulator)

```bash
cd mobile
npm install
npx expo start --android
```

By default `app.json`'s `extra.apiUrl` points at `http://10.0.2.2:4000` — the Android emulator's
alias for your machine's `localhost`, so it talks to a locally-running backend with no extra
config. For a physical device or a deployed backend, edit `extra.apiUrl` (and `extra.apiKey`) in
`app.json`, or override via `eas.json`'s `build.preview.env` for release builds.

### Test

```bash
npm test
```

### Build the Android APK

This requires Expo's build service (EAS) or a local Android SDK — neither is available in the
environment this repo was authored in, so the APK itself isn't included; build it with:

```bash
cd mobile
npm install -g eas-cli
eas login
eas build --platform android --profile preview   # cloud build, produces a downloadable .apk
```

or, with a local Android SDK installed:

```bash
eas build --platform android --profile preview --local
```

The resulting `.apk` installs directly on a device or emulator (`adb install path/to/build.apk`).

---

## Run everything together

```bash
# 1. Backend + web, containerized
API_KEY=your-key JWT_SECRET=your-secret VITE_API_URL=http://localhost:4000 docker compose up --build

# 2. Point the mobile app at the same backend (edit mobile/app.json's extra.apiUrl/apiKey to match),
#    then:
cd mobile && npx expo start --android
```

## Deploying live

- **Backend**: any container host works as-is (Render, Fly.io, Railway). Mount a persistent volume
  at `/app/data` so the SQLite file survives restarts; set `API_KEY`, `JWT_SECRET`, and
  `CORS_ORIGIN` (your deployed web URL) as environment variables.
- **Web**: deploy the `web/` Docker image, or `npm run build` and serve `dist/` as a static site
  (Vercel/Netlify/Render static site all work) with `VITE_API_URL` set to the backend's public URL
  at build time.
- **Mobile**: point `mobile/eas.json`'s `build.preview.env.API_URL` (and `app.json`'s
  `extra.apiKey`) at the deployed backend before running `eas build`.
