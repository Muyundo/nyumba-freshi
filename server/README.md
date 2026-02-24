# Nyumba Freshi — Backend

This is a minimal Express backend for the Nyumba Freshi project.

Quick start:

```powershell
cd server
npm install
npm run dev    # starts server on http://localhost:4000
```

- Local MySQL (recommended):

1. Start MySQL + Adminer via Docker Compose from repo root:

```powershell
docker compose up -d
```

2. Copy `.env.example` to `.env` in `server/` and adjust if needed.

3. Run the server:

```powershell
cd server
npm run dev
```

Test endpoints:
- `GET /api/health` — basic health check
- `GET /api/hello` — example endpoint
- `GET /api/dbtime` — queries MySQL `SELECT NOW()` and returns result
- `POST /api/login` — demo login, supply `{ "username": "bob" }` and get a JWT
- `GET /api/protected` — protected route, send `Authorization: Bearer <token>`

Notes on JWT:
- Copy `.env.example` to `.env` and set `JWT_SECRET` to a strong secret for production.
- The demo `POST /api/login` does not check passwords; replace with real auth logic.
