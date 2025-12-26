# Railway Troubleshooting

## "Team not found" Error

This error occurs when Railway CLI can't find your team or project.

### Solution 1: Login and Select Team

```bash
# Login to Railway
railway login

# List your teams
railway teams

# Link to a project (if you have one)
railway link

# Or create a new project
railway init
```

### Solution 2: Use Railway Dashboard (Easier)

Instead of using CLI, use the web dashboard:

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"** or **"Empty Project"**
5. Add services from the dashboard

### Solution 3: Create Team First

If you don't have a team:

1. Go to Railway dashboard
2. Click your profile → **"Teams"**
3. Create a new team (or use your personal team)
4. Then create a project in that team

### Solution 4: Check Railway Status

```bash
# Check if you're logged in
railway whoami

# If not logged in, login
railway login

# Check current project
railway status
```

## Common Railway Setup Steps

1. **Create account**: [railway.app](https://railway.app) → Sign up with GitHub
2. **Create project**: Dashboard → "New Project"
3. **Add PostgreSQL**: Project → "+ New" → "Database" → "PostgreSQL"
4. **Deploy code**: 
   - Option A: Connect GitHub repo
   - Option B: Use Railway CLI: `railway up`
5. **Set environment variables**: Project → Service → "Variables"
6. **Run migration**: Project → Service → "Shell" → `node utils/migrate.js`

## Alternative: Deploy Without CLI

You don't need Railway CLI! You can do everything from the web dashboard:

1. **Connect GitHub**:
   - Railway Dashboard → "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect and deploy

2. **Set Root Directory** (if needed):
   - Service → Settings → "Root Directory" → Set to `server`

3. **Add Environment Variables**:
   - Service → Variables → Add:
     - `JWT_SECRET=your-secret`
     - `NODE_ENV=production`
     - `CLIENT_URL=https://your-app.railway.app`

4. **Add PostgreSQL**:
   - "+ New" → "Database" → "PostgreSQL"
   - `DATABASE_URL` is automatically set!

5. **Run Migration**:
   - Service → "Shell" tab
   - Run: `node utils/migrate.js`

## Still Having Issues?

- Check Railway status: [status.railway.app](https://status.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Railway Docs: [docs.railway.app](https://docs.railway.app)

