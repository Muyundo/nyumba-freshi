# Deployment Guide - Nyumba Freshi (PostgreSQL)

This guide walks through deploying Nyumba Freshi to Railway with automatic data persistence.

## Prerequisites

- GitHub account with your code pushed to `Muyundo/nyumba-freshi`
- Railway account (sign up at https://railway.app)
- Everything is already configured locally ✅

---

## Step 1: Deploy Backend to Railway

### 1.1 Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click **"Create New Project"**
3. Select **"GitHub Repo"**
4. Select your repository: `Muyundo/nyumba-freshi`
5. Railway will auto-detect it's a Node.js project ✅

### 1.2 Configure Backend Service

1. After creating project, Railway shows your services
2. Click on your Node project
3. Go to **"Settings"** tab
4. Under **"Root Directory"**, set to: `server`
5. Railway will auto-detect `package.json` and build command ✅

### 1.3 Add PostgreSQL Database

1. In your Railway project dashboard
2. Click **"+ New"** → **"Service"** → **"PostgreSQL"**
3. Railway will:
   - Create a PostgreSQL database
   - Automatically add `DATABASE_URL` environment variable
   - Connect it to your backend service ✅

**Important**: This happens automatically - no manual configuration needed!

### 1.4 Test Backend

Once deployed, Railway shows your backend URL (like `https://your-app.railway.app`)

Test it:
```
https://your-app.railway.app/api/health
```

You should see:
```json
{"status":"ok","time":"..."}
```

✅ Backend is ready!

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Sign Up for Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"** → **"Continue with GitHub"**
3. Authorize Vercel to access your repositories

### 2.2 Import Project

1. Click **"Add New..."** → **"Project"**
2. Find and select: `Muyundo/nyumba-freshi`
3. Vercel auto-detects Vite configuration ✅

### 2.3 Configure Frontend

1. **Framework Preset**: Vite (auto-detected)
2. **Root Directory**: `frontend`
3. **Build Command**: `npm run build` (auto-detected)
4. **Output Directory**: `dist` (auto-detected)

### 2.4 Set Environment Variable

1. Before deploying, add environment variable:
   - **Name**: `VITE_API_BASE`
   - **Value**: `https://your-railway-url` (from Step 1.4)
   
   Example: `https://nyumba-freshi-prod.railway.app`

### 2.5 Deploy

1. Click **"Deploy"**
2. Vercel builds and deploys automatically ✅

---

## Step 3: Migrate Data to Railway PostgreSQL

Once the Railway backend is deployed and PostgreSQL is running:

### Option A: Using Your Local Server (Safe - Recommended)

1. Ensure local backend is running:
   ```bash
   cd server
   npm run dev
   ```

2. Migration will happen automatically on first startup (tables created)

3. If you have existing SQLite data you want to migrate:
   ```bash
   npm run migrate
   ```
   (This copies data from `nyumba_freshi.db` to your local PostgreSQL, which you'll then push)

### Option B: Manual Database Initialization

Railway's PostgreSQL will automatically create tables on first backend request thanks to this code in `db.js`:

```javascript
async function initializeDatabase() {
  // Creates all tables if they don't exist
  await pool.query(`CREATE TABLE IF NOT EXISTS ...`)
}
```

So tables are created automatically! ✅

---

## Step 4: Testing Live Application

### Test API Endpoint

```bash
# Using your deployed backend URL
https://your-railway-url/api/health

# Should return:
{"status":"ok","time":"..."}
```

### Test Frontend

Open your Vercel frontend URL in browser - it should:
1. Load the app
2. Connect to your backend automatically
3. Display the worker list from your PostgreSQL database ✅

---

## Troubleshooting

### Problem: Backend crashes on Railway

**Check logs:**
1. Go to Railway project
2. Click your backend service
3. View **"Logs"** tab
4. Look for error messages

**Common issues:**
- DATABASE_URL not set → Railway must have added PostgreSQL service
- Tables not created → Check if `db.js` initialization ran
- Connection refused → PostgreSQL might not be ready yet

### Problem: Frontend shows 502 error

1. Verify backend URL in frontend environment variable
2. Check backend is actually running on Railway (check logs)
3. Make sure frontend environment variable has correct URL

### Problem: Data not persisting

PostgreSQL data is persistent by default on Railway! ✅

If you lose data, you might have:
- Accidentally deleted PostgreSQL service
- Pushed code with different database

---

## After Deployment

### Local Development

```bash
# Terminal 1 - Start PostgreSQL
cd server
docker-compose up -d

# Terminal 2 - Start backend
npm run dev

# Terminal 3 - Start frontend
cd frontend
npm run dev
```

### Production Updates

1. Make changes locally
2. Test on `npm run dev`
3. Push to GitHub → Auto-deploy to Railway & Vercel ✅

---

## Database Management

### Backup Your Data

If needed, export PostgreSQL data locally:
```bash
# Connect to your local PostgreSQL:
psql postgresql://postgres:postgres123@localhost:5432/nyumba_freshi

# Then use standard PostgreSQL commands to backup
```

### Railway PostgreSQL is Always Backed Up

Railway automatically:
- ✅ Backs up your database
- ✅ Keeps data even after redeploys
- ✅ Handles recovery if needed

---

## Summary

| Component | Host | Auto-Deploy | Data Persistent |
|-----------|------|-------------|-----------------|
| Backend | Railway | Yes (GitHub) | ✅ Yes (PostgreSQL) |
| Frontend | Vercel | Yes (GitHub) | N/A |
| Database | Railway PostgreSQL | - | ✅ Yes |

Everything is configured to work seamlessly! 🚀

---

## Questions?

If something goes wrong during deployment:
1. Check Railway logs (click service → Logs)
2. Check Vercel logs (click Deployments tab)
3. Verify environment variables are set correctly
4. Make sure GitHub repo is up to date with latest code

Good luck! 🎯
