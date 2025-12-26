# Deploy to Railway - Web Dashboard Only (No CLI, No Teams!)

## ✅ Step-by-Step: Deploy Using Only Web Browser

### Step 1: Create Railway Account & Project

1. Go to **[railway.app](https://railway.app)**
2. Click **"Start a New Project"** or **"Login"**
3. Sign in with **GitHub** (use the same account as your repo: Tredoux555)
4. After login, you'll be in your **personal workspace** (this is your "team")
5. Click **"New Project"** button (top right, purple button)

### Step 2: Connect GitHub Repository

1. In the "New Project" dialog, select **"Deploy from GitHub repo"**
2. You should see a list of your repositories
3. **If you see "No repositories found":**
   - Click **"Configure GitHub App"** or **"Authorize"** button
   - Make sure Railway has access to your repositories
   - Grant access to **all repositories** or at least `riddick-chess-v2`
   - Refresh the page
4. Search for or select: **`riddick-chess-v2`**
5. Click on it to select

### Step 3: Railway Auto-Deploys

1. Railway will automatically:
   - Detect it's a Node.js project
   - Start building
   - Create a service

2. **Wait for the build to complete** (you'll see logs)

### Step 4: Configure Service Settings

1. Click on the **service** that was created (usually named after your repo)
2. Go to **Settings** tab
3. Set **Root Directory** to: `server`
4. Railway will automatically redeploy

### Step 5: Add PostgreSQL Database

1. In your Railway project, click **"+ New"** button (top right)
2. Select **"Database"** → **"Add PostgreSQL"**
3. Wait ~30 seconds for it to provision
4. **Important**: `DATABASE_URL` is automatically set - you don't need to do anything!

### Step 6: Set Environment Variables

1. Click on your **service** (not the database)
2. Go to **Variables** tab
3. Click **"+ New Variable"** and add these:

```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=production
CLIENT_URL=https://your-app-name.railway.app
```

**Note**: `DATABASE_URL` should already be there (automatically added by PostgreSQL service)

### Step 7: Run Database Migration

1. Click on your **service**
2. Go to **Shell** tab (or **Deployments** → click latest deployment → **View Logs**)
3. In the shell, run:
   ```bash
   node utils/migrate.js
   ```
4. Wait for it to complete (you'll see "✅ Migration complete!")

### Step 8: Get Your App URL

1. Click on your **service**
2. Go to **Settings** tab
3. Scroll to **"Networking"** section
4. Click **"Generate Domain"** button
5. Your app will be available at: `https://your-app-name.railway.app`

### Step 9: (Optional) Seed Puzzles

In the **Shell** tab, run:
```bash
node utils/seedPuzzles.js
```

## ✅ Done!

Your app is now live! Visit your Railway domain to see it.

## Troubleshooting "Team not found"

**If you still see "Team not found":**

1. **Make sure you're using the web dashboard** (not CLI)
2. **Check you're logged in**: Look at top-right corner - should show your profile
3. **Create project from dashboard**: Don't use `railway init` command
4. **You're already in a "team"**: Your personal workspace IS your team - you don't need to create one

## If GitHub Repo Still Not Showing

1. **Check GitHub authorization:**
   - Railway Dashboard → Click your profile (top right)
   - Go to **Settings** → **Connected Accounts**
   - Make sure **GitHub** is connected
   - Click **"Configure"** or **"Reconnect"** if needed
   - Make sure **"Access to private repositories"** is enabled (if your repo is private)

2. **Refresh repository list:**
   - When selecting "Deploy from GitHub repo"
   - Look for a **"Refresh"** or **"Reload"** button
   - Or close and reopen the repository selection

3. **Check repository exists:**
   - Verify: https://github.com/Tredoux555/riddick-chess-v2
   - Make sure you're logged into Railway with the same GitHub account

## Still Having Issues?

- **Railway Status**: [status.railway.app](https://status.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **Railway Docs**: [docs.railway.app](https://docs.railway.app)

**Remember**: Use the **web dashboard only** - don't use Railway CLI to avoid team errors!

