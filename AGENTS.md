# PulseSync Agent Guide

## Repository Shape

PulseSync is a three-part telemetry system:

- `backend/`: Express + TypeScript API, SQLite persistence, JWT auth, and WebSocket broadcasts.
- `web/`: React + Vite admin dashboard using TanStack Query/Table/Virtual and Recharts.
- `mobile/`: Expo / React Native Android client with a ten-button event screen.
- `docker-compose.yml`: containerized backend and web stack.

Read [README.md](README.md) for product rationale, endpoint details, local setup, deployment, and Docker usage.

## Working Rules

- Keep changes within the owning package unless a cross-package contract requires otherwise.
- Preserve TypeScript and the existing package scripts; do not introduce a second framework or data-access layer.
- Treat `backend/src/db.ts` as the SQLite access boundary. Keep route handlers focused on HTTP validation and authorization.
- Keep authentication behavior aligned across clients and backend: the API key is exchanged for a short-lived JWT, which is sent for normal requests.
- Admin-only reads, metrics, and WebSocket access are enforced in the backend; event ingestion is handled separately.
- Keep web live updates through `web/src/hooks/useEventsStream.ts` and the existing query-cache invalidation flow.
- Mobile device IDs are persistent per installation and session IDs are per app launch; preserve that distinction when changing event payloads.
- Do not commit generated output, local environment files, SQLite databases, or secrets. Use `.env.example` files as the configuration reference.

## Validation Commands

Run commands from the package directory:

```text
backend: npm test; npm run build; npm run lint
web:     npm test; npm run build; npm run lint
mobile:  npm test
```

For a focused change, run that package's narrowest relevant test first, then its build or lint command. Backend tests use a throwaway SQLite database and configure environment variables before importing the app.

The mobile package has no lint script. Android builds require Expo/EAS and an Android-capable environment; use `npm run build:apk` only when that environment is available.

## Key Entry Points

- Backend wiring: [backend/src/index.ts](backend/src/index.ts)
- Persistence and metrics: [backend/src/db.ts](backend/src/db.ts)
- Auth and roles: [backend/src/auth.ts](backend/src/auth.ts)
- Event API: [backend/src/routes/events.ts](backend/src/routes/events.ts)
- Metrics API: [backend/src/routes/metrics.ts](backend/src/routes/metrics.ts)
- WebSocket feed: [backend/src/ws.ts](backend/src/ws.ts)
- Dashboard composition: [web/src/App.tsx](web/src/App.tsx)
- Web API boundary: [web/src/api/client.ts](web/src/api/client.ts)
- Web live stream: [web/src/hooks/useEventsStream.ts](web/src/hooks/useEventsStream.ts)
- Mobile event screen: [mobile/src/screens/HomeScreen.tsx](mobile/src/screens/HomeScreen.tsx)
- Mobile API and cached identity: [mobile/src/api/client.ts](mobile/src/api/client.ts)

## Configuration Notes

- Backend settings come from [backend/.env.example](backend/.env.example); the default database is `backend/data/pulsesync.db`.
- Web API configuration comes from [web/.env.example](web/.env.example) and is injected as `VITE_API_URL` at build time.
- Android emulators reach a local backend at `http://10.0.2.2:4000`; physical devices need a reachable host and matching mobile configuration.
- Check both `mobile/app.json` and `mobile/eas.json` when changing mobile API configuration; their keys and build-time overrides must agree with what [mobile/src/api/client.ts](mobile/src/api/client.ts) reads.
