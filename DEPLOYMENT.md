# Deployment Guide - Nyumba Freshi

This guide will help you deploy the Nyumba Freshi application to production using free hosting services with automatic GitHub deployments.

## Overview

- **Frontend**: Vercel (Free)
- **Backend**: Railway (Free $5/month credit)
- **Database**: SQLite (included with backend)

## Prerequisites

Before starting, ensure you have:
- A GitHub account
- Your code pushed to GitHub repository
- Email account for signing up to hosting services

---

## Step 1: Deploy Backend to Railway

### 1.1 Sign Up for Railway
1. Go to [railway.app](https://railway.app)
2. Click "Login" and sign in with your GitHub account
3. Authorize Railway to access your GitHub repositories

### 1.2 Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository: `Muyundo/nyumba-freshi`
4. Railway will detect it's a Node.js project

### 1.3 Configure Backend Service
1. In the deployment settings, set the **Root Directory** to: `server`
2. Railway will auto-detect your `package.json`

### 1.4 Set Environment Variables
In the Railway dashboard:
1. Go to your project → Variables tab
2. Add these variables:
   ```
   PORT=4000
   HOST=0.0.0.0
   JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
   JWT_EXPIRES_IN=1h
   ```
   
   **Important**: Generate a strong JWT secret. You can use this command:
   ```bash
   openssl rand -hex 32
   ```
   Or generate one online at: https://randomkeygen.com/

### 1.5 Deploy
1. Railway will automatically build and deploy your backend
2. After deployment, you'll get a URL like: `https://your-app.railway.app`
3. **Copy this URL** - you'll need it for the frontend

### 1.6 Enable Persistent Storage (for Database)
1. In Railway project, go to Settings
2. Click "Add Volume"
3. Mount path: `/app/server` (to persist the SQLite database)
4. This ensures your database survives redeployments

### 1.7 Test Backend
Visit: `https://your-app.railway.app/api/health`
You should see: `{"status":"ok","time":"..."}`

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Sign Up for Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up" and sign in with your GitHub account
3. Authorize Vercel to access your repositories

### 2.2 Import Project
1. Click "Add New..." → "Project"
2. Import your repository: `Muyundo/nyumba-freshi`
3. Vercel will detect it's a Vite project

### 2.3 Configure Build Settings
1. **Framework Preset**: Vite
2. **Root Directory**: `frontend`
3. **Build Command**: `npm run build` (auto-detected)
4. **Output Directory**: `dist` (auto-detected)

### 2.4 Set Environment Variables
Before deploying, add this environment variable:
1. Click "Environment Variables"
2. Add:
   ```
   Name: VITE_API_BASE
   Value: https://your-app.railway.app
   ```
   (Use the Railway URL from Step 1.5)

### 2.5 Deploy
1. Click "Deploy"
2. Vercel will build and deploy your frontend
3. You'll get a URL like: `https://nyumba-freshi.vercel.app`

### 2.6 Test Frontend
1. Visit your Vercel URL
2. Try logging in with test credentials
3. Check that the API calls work (they should connect to Railway backend)

---

## Step 3: Update CORS Settings (Backend)

Your backend needs to allow requests from your Vercel domain.

### 3.1 Update CORS Configuration
1. Go to your Railway project
2. Add environment variable:
   ```
   ALLOWED_ORIGINS=https://nyumba-freshi.vercel.app,https://nyumba-freshi-*.vercel.app
   ```

### 3.2 Update Backend Code (Optional)
If needed, you can update `server/src/index.js` to use the ALLOWED_ORIGINS env variable:

```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : '*'
}))
```

After making this change, commit and push to GitHub - Railway will auto-deploy!

---

## Step 4: Enable Automatic Deployments

Both platforms are already configured for automatic deployments:

### Railway (Backend)
- ✅ Every push to `main` branch automatically deploys
- View deployment logs in Railway dashboard
- Deployment typically takes 2-3 minutes

### Vercel (Frontend)
- ✅ Every push to `main` branch automatically deploys
- Vercel also creates preview deployments for pull requests
- Deployment typically takes 1-2 minutes

### How to Deploy Changes
1. Make changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your change description"
   git push origin main
   ```
3. Both services will automatically detect the push and redeploy
4. Check deployment status in dashboards

---

## Environment Variables Summary

### Frontend (.env)
```bash
VITE_API_BASE=https://your-backend.railway.app
```

### Backend (.env)
```bash
PORT=4000
HOST=0.0.0.0
JWT_SECRET=your_strong_random_secret_here
JWT_EXPIRES_IN=1h
```

**Note**: Never commit `.env` files to GitHub! Only commit `.env.example` files.

---

## Monitoring & Troubleshooting

### Check Deployment Status
- **Railway**: Dashboard → Deployments
- **Vercel**: Dashboard → Deployments

### View Logs
- **Railway**: Click on deployment → View Logs
- **Vercel**: Click on deployment → Function Logs

### Common Issues

#### 1. Frontend can't connect to backend
- ✅ Check VITE_API_BASE is set correctly in Vercel
- ✅ Check CORS is configured in backend
- ✅ Verify backend is running: visit `/api/health`

#### 2. JWT errors
- ✅ Ensure JWT_SECRET is set and matches between deployments
- ✅ Use openssl to generate a strong secret

#### 3. Database not persisting
- ✅ Verify Railway volume is mounted at `/app/server`
- ✅ Check database file path in `server/src/db.js`

#### 4. Build failures
- ✅ Check build logs in platform dashboard
- ✅ Ensure `package.json` has all dependencies
- ✅ Test build locally: `npm run build`

---

## Custom Domain (Optional)

### For Frontend (Vercel)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### For Backend (Railway)
1. Go to Project Settings → Domains
2. Add custom domain
3. Update frontend VITE_API_BASE to use new domain

---

## Cost Breakdown

### Free Tier Limits

**Vercel (Frontend)**
- ✅ Free forever for personal projects
- 100GB bandwidth/month
- Unlimited deployments
- Automatic HTTPS

**Railway (Backend)**
- 💰 $5 free credits/month
- Estimated usage for small app: ~$5-10/month
- First $5 covered by free credits
- Usage-based pricing after credits

**Total Monthly Cost**: $0-5 for small traffic

---

## Next Steps

1. ✅ Monitor first deployments
2. ✅ Test all features in production
3. ✅ Set up custom domain (optional)
4. ✅ Share your live app!

## Support Resources

- **Railway Docs**: https://docs.railway.app/
- **Vercel Docs**: https://vercel.com/docs
- **GitHub Actions**: For advanced CI/CD

---

**Your Live URLs:**
- Frontend: `https://nyumba-freshi.vercel.app` (update with actual URL)
- Backend: `https://your-app.railway.app` (update with actual URL)

Congratulations! Your app is now live! 🎉
