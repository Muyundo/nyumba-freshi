# Nyumba Freshi — Frontend

React + Vite frontend for homeowners and workers.

## Quick Start (Windows PowerShell)

```powershell
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`.

## Build

```powershell
cd frontend
npm run build
```

## Frontend Highlights

- Role-based flows for homeowners and workers
- Worker discovery by service, location, and estate
- Booking flow with hour-only slot selection (`HH:00`)
- Availability checks before booking (with conflict feedback)
- Worker dashboard actions: accept, decline, start job, finish job
- Homeowner dashboard actions: view and cancel pending bookings
- Worker status visibility on listing pages (Available / Currently Working)
- Auto-refresh for worker list and worker dashboard to keep status current

## API Configuration

Set API base URL in `frontend/.env`:

```env
VITE_API_BASE=https://your-backend-url
```

For local development with proxy, `VITE_API_BASE` can be left empty.
