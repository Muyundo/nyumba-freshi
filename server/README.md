# Nyumba Freshi — Backend

Express + PostgreSQL backend for authentication, worker discovery, and booking workflow.

## Quick Start (Windows PowerShell)

```powershell
cd server
npm install
npm run dev
```

Server runs at `http://localhost:4000`.

## Database

This backend uses **PostgreSQL**.

For local development, start Postgres via Docker:

```powershell
cd server
docker-compose up -d
```

Default local DB connection:

`postgresql://postgres:postgres123@localhost:5432/nyumba_freshi`

## Available Scripts

- `npm run dev` - Start with nodemon
- `npm start` - Start server with node
- `npm run migrate` - Run migration script

## Core API Endpoints

### Auth and Registration

- `POST /api/register` - Register homeowner or worker
- `POST /api/login` - Login and return JWT
- `POST /api/change-password` - Change password (auth required)

### Worker Password Recovery

- `POST /api/workers/forgot-password/verify-id` - Verify worker by ID number + phone
- `POST /api/workers/forgot-password/reset` - Reset password with reset token

### Workers

- `GET /api/workers` - List workers with status metadata
- `GET /api/workers/:id` - Get worker details
- `GET /api/workers/:workerId/availability?date=YYYY-MM-DD` - Get unavailable times for date (auth required)
- `GET /api/workers/:workerId/bookings` - Get worker bookings (auth required)

### Homeowners

- `GET /api/homeowners/:homeownerId/bookings` - Get homeowner bookings (auth required)

### Bookings

- `POST /api/bookings` - Create booking (auth required)
- `PATCH /api/bookings/:bookingId` - Update booking status (auth required)

Worker allowed status updates:

- `accepted`
- `declined`
- `in-progress`
- `completed`

Homeowner allowed status updates:

- `cancelled` (pending bookings only)

## Booking Rules Enforced

- Only whole-hour booking times are allowed (`HH:00`)
- Past date/time bookings are rejected
- One-hour overlap conflicts are blocked
- Worker cannot start a second job while another is `in-progress`
- Homeowners can only cancel their own pending bookings

## Environment Variables

Set in `server/.env`:

```env
JWT_SECRET=your_secret
JWT_EXPIRES_IN=1h
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/nyumba_freshi
PORT=4000
HOST=0.0.0.0
```
