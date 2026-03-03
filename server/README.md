# Nyumba Freshi — Backend

This is a minimal Express backend for the Nyumba Freshi project.

## Quick Start

```powershell
cd server
npm install
cp .env.example .env   # Copy environment variables
npm run dev            # starts server on http://localhost:4000
```

The backend uses **SQLite** for the database - no additional setup required! The database file (`nyumba_freshi.db`) will be created automatically in the `server/` directory.

## Available Scripts

- `npm start` — Start the server
- `npm run dev` — Start with nodemon (auto-restart on changes)

## API Endpoints

### Public Routes
- `GET /api/health` — Health check endpoint
- `GET /api/hello` — Test endpoint
- `GET /api/dbtime` — Returns current database time
- `POST /api/login` — Demo login (supply `{ "username": "bob" }`)
- `POST /api/register` — Register new user or worker

### Protected Routes
- `GET /api/protected` — Demo protected route (requires Bearer token)

## Registration API

**Endpoint:** `POST /api/register`

**Homeowner Registration:**
```json
{
  "role": "Homeowner",
  "fullName": "John Doe",
  "phone": "0712345678",
  "location": "Nairobi",
  "estate": "Kilimani",
  "password": "securepassword"
}
```

**Worker Registration:**
```json
{
  "role": "Worker",
  "fullName": "Jane Smith",
  "phone": "0723456789",
  "location": "Nairobi",
  "estate": "Westlands",
  "password": "securepassword",
  "idNumber": "12345678",
  "servicesOffered": ["cleaning", "laundry"],
  "availability": "both"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Environment Variables

Copy `.env.example` to `.env` and set:
- `JWT_SECRET` — Secret key for JWT tokens (use a strong secret in production)
- `JWT_EXPIRES_IN` — Token expiration time (default: 1h)

## Database

The application uses **SQLite** with the following tables:
- `users` — All users (homeowners and workers)
- `worker_profiles` — Additional worker information
- `worker_services` — Services offered by workers

Tables are created automatically on first run.
