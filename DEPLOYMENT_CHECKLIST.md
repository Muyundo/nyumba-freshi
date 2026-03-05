# Pre-Deployment Checklist

## ✅ Local Testing (Complete These First)

- [ ] Backend runs without errors: `npm run dev` in `server/`
- [ ] Frontend runs without errors: `npm run dev` in `frontend/`
- [ ] Can register new homeowner
- [ ] Can register new worker
- [ ] Can view workers list
- [ ] Can create booking
- [ ] Backend (/api/health) returns: `{"status":"ok","time":"..."}`

## ✅ Code Preparation

- [ ] All changes committed to GitHub
- [ ] No uncommitted changes in working directory
- [ ] Latest code is on `main` branch
- [ ] `.env` file is NOT in git (use `.env.example` instead)

```bash
# Run this to check:
git status
```

- [ ] `.env.example` exists for reference
- [ ] No hardcoded URLs or credentials in code

## ✅ Railway Backend Setup

- [ ] Railway account created
- [ ] GitHub repository connected
- [ ] Backend service root directory set to `server`
- [ ] PostgreSQL database added to project
- [ ] DATABASE_URL environment variable exists (auto-added)
- [ ] Backend deployed successfully
- [ ] Backend `/api/health` endpoint responds

Test URL: `https://your-railway-backend-url/api/health`

## ✅ Vercel Frontend Setup

- [ ] Vercel account created
- [ ] GitHub repository connected
- [ ] Root directory set to `frontend`
- [ ] Build command is `npm run build`
- [ ] `VITE_API_BASE` environment variable set to Railway backend URL
- [ ] Frontend deployed successfully
- [ ] Frontend loads in browser

## ✅ Integration Testing

After both are deployed:

- [ ] Frontend connects to backend (check Network tab in browser)
- [ ] Worker list loads from database
- [ ] Registration works
- [ ] Bookings load correctly
- [ ] API calls succeed

## ⚠️ Common Mistakes to Avoid

- ❌ NOT including `server/` root directory in Railway
- ❌ NOT including `frontend/` root directory in Vercel  
- ❌ Forgetting to set `VITE_API_BASE` environment variable
- ❌ Using `http://` instead of `https://` in URLs
- ❌ Forgetting to add PostgreSQL database to Railway project
- ❌ Committing `.env` file with credentials to Git

## 🆘 If Something Goes Wrong

1. Check backend logs in Railway (Service → Logs tab)
2. Check frontend build logs in Vercel (Deployments tab)
3. Verify environment variables are set correctly
4. Verify GitHub is up to date with your code
5. Restart services on Railway if needed

## ✨ Deployment Order

1. ✅ Test everything locally
2. ✅ Commit all code to GitHub (`git push`)
3. ✅ Deploy backend to Railway
4. ✅ Add PostgreSQL to Railway
5. ✅ Get Railway backend URL
6. ✅ Deploy frontend to Vercel
7. ✅ Set `VITE_API_BASE` on Vercel
8. ✅ Test live application

Ready to deploy? 🚀
