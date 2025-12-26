# Railway Deployment Guide

## Quick Deploy to Railway

Railway makes it easy to deploy your Riddick Chess app with automatic PostgreSQL setup!

## Step 1: Create Railway Account & Project

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. **Important**: After signing up, you'll be in your personal team
4. Click **"New Project"** (top right)
5. Select **"Deploy from GitHub repo"** (recommended) or **"Empty Project"**
6. If using GitHub: Select your `riddick-chess-v2` repository

**Note**: If you see "Team not found" error, make sure you:
- Are logged into Railway dashboard
- Have created a project (not just an account)
- Are in the correct team (check top-left dropdown)

## Step 2: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically create a PostgreSQL database
4. The `DATABASE_URL` environment variable will be automatically set

## Step 3: Deploy Your Code

### Option A: Deploy from GitHub (Recommended)

1. Connect your GitHub repository to Railway
2. Railway will auto-detect it's a Node.js project
3. Set the **Root Directory** to `server` (if deploying just the server)
4. Or deploy both server and client (see below)

### Option B: Deploy via Railway CLI (Optional)

**Note**: If you get "Team not found" error, use the web dashboard instead (Option A).

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to existing project (if you created one in dashboard)
railway link

# Or create new project
railway init

# Deploy
railway up
```

**Troubleshooting CLI**: If you get "Team not found":
1. Create project in dashboard first: [railway.app](https://railway.app)
2. Then use `railway link` to connect CLI to that project
3. Or just use the dashboard - it's easier!

## Step 4: Set Environment Variables

In Railway dashboard, go to your service → **Variables** and add:

```
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this
GOOGLE_CLIENT_ID=your-google-oauth-client-id (optional)
CLIENT_URL=https://your-app.railway.app (or your frontend URL)
```

**Note:** `DATABASE_URL` is automatically set by Railway when you add PostgreSQL!

## Step 5: Run Database Migration

After deployment, run the migration:

### Option A: Via Railway CLI (Recommended)

```bash
railway run node utils/migrate.js
```

### Option B: Via Railway Dashboard

1. Go to your service
2. Click **"Shell"** tab
3. Run: `node utils/migrate.js`

### Option C: Add to package.json (Auto-run on deploy)

Add this to `server/package.json`:

```json
"scripts": {
  "postdeploy": "node utils/migrate.js"
}
```

⚠️ **Note:** Railway doesn't have a `postdeploy` hook by default. Better to run manually or use a build script.

## Step 6: (Optional) Seed Puzzles

```bash
railway run node utils/seedPuzzles.js
```

## Step 7: Deploy Frontend

### Option A: Deploy Client Separately

1. Create a new service in Railway
2. Set **Root Directory** to `client`
3. Set build command: `npm run build`
4. Set start command: `npx serve -s build -l 3000`
5. Or use a static hosting service (Vercel, Netlify)

### Option B: Serve from Server (Current Setup)

The server already serves the React build from `client/build` in production mode.

1. Build the client: `cd client && npm run build`
2. Commit the `client/build` folder
3. The server will serve it automatically

## Step 8: Configure Custom Domain (Optional)

1. In Railway, go to your service → **Settings**
2. Click **"Generate Domain"** or add your custom domain
3. Update `CLIENT_URL` environment variable to match

## Troubleshooting

### Database Connection Issues

- Make sure PostgreSQL service is added and running
- Check that `DATABASE_URL` is set automatically
- Verify the migration ran successfully

### Port Issues

- Railway automatically sets `PORT` environment variable
- Your server should use `process.env.PORT || 5000`

### Build Failures

- Check build logs in Railway dashboard
- Make sure all dependencies are in `package.json`
- Verify Node.js version (Railway uses latest LTS)

## Environment Variables Reference

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ | PostgreSQL connection (auto-set by Railway) | - |
| `JWT_SECRET` | ✅ | Secret for JWT tokens | - |
| `NODE_ENV` | ✅ | Environment mode | `production` |
| `PORT` | ✅ | Server port (auto-set by Railway) | `5000` |
| `CLIENT_URL` | ⚠️ | Frontend URL for CORS | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` | ❌ | Google OAuth client ID | - |

## Monitoring

- View logs: Railway dashboard → Service → **"Deployments"** → **"View Logs"**
- Metrics: Railway provides CPU, Memory, and Network metrics
- Alerts: Set up alerts in Railway dashboard

## Cost

- Railway offers a free tier with $5 credit/month
- PostgreSQL: ~$5/month for starter plan
- Check [railway.app/pricing](https://railway.app/pricing) for current rates

## Next Steps

1. Set up custom domain
2. Configure Google OAuth (if using)
3. Set up monitoring and alerts
4. Configure backups for PostgreSQL
5. Set up CI/CD pipeline

Happy deploying! 🚀

